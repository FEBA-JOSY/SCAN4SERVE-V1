'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
    ShoppingBag, Plus, Minus, Search,
    Info, Clock, ChevronRight, X,
    Utensils, CheckCircle2
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import Image from 'next/image'
import type { Restaurant, Category, MenuItem, Order } from '@/types'
import mqtt from 'mqtt'

export default function CustomerMenuPage() {
    const params = useParams()
    const restaurantId = params.restaurantId as string
    const tableId = params.tableId as string

    const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
    const [categories, setCategories] = useState<(Category & { menuItems: MenuItem[] })[]>([])
    const [loading, setLoading] = useState(true)
    const [cart, setCart] = useState<Record<string, { item: MenuItem; quantity: number; notes: string }>>({})
    const [showCart, setShowCart] = useState(false)
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [placingOrder, setPlacingOrder] = useState(false)
    const [activeOrder, setActiveOrder] = useState<Order | null>(null)

    const fetchMenu = useCallback(async () => {
        try {
            const res = await fetch(`/api/customer/menu?restaurantId=${restaurantId}`)
            if (!res.ok) {
                const json = await res.json()
                toast.error(json.message || 'Failed to load menu')
                setLoading(false)
                return
            }
            const json = await res.json()
            if (json.success) {
                setRestaurant(json.data.restaurant)
                setCategories(json.data.categories)
                if (json.data.categories.length > 0) {
                    // We default to 'all' now
                }
            } else {
                toast.error(json.message || 'Failed to load menu')
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            console.error('Menu fetch error:', errorMessage, error);
            toast.error(`Failed to load menu: ${errorMessage}`);
        } finally {
            setLoading(false)
        }
    }, [restaurantId])

    useEffect(() => {
        fetchMenu()
    }, [fetchMenu])

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev[item.id]
            return {
                ...prev,
                [item.id]: {
                    item,
                    quantity: (existing?.quantity || 0) + 1,
                    notes: existing?.notes || ''
                }
            }
        })
        toast.success(`Added ${item.name} to cart`, { duration: 1500 })
    }

    const removeFromCart = (itemId: string) => {
        setCart(prev => {
            const existing = prev[itemId]
            if (!existing) return prev
            if (existing.quantity <= 1) {
                const rest = { ...prev }
                delete rest[itemId]
                return rest
            }
            return {
                ...prev,
                [itemId]: { ...existing, quantity: existing.quantity - 1 },
            }
        })
    }

    const cartItems = Object.values(cart)
    const cartTotal = cartItems.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0)
    const cartCount = cartItems.reduce((sum, { quantity }) => sum + quantity, 0)

    // --- MQTT Logic ---
    const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null)

    useEffect(() => {
        const client = mqtt.connect('wss://y12dbb61.ala.asia-southeast1.emqxsl.com:8084/mqtt', {
            username: 'table_T01',
            password: 'scan4serve',
            clientId: 'customer_' + Math.random().toString(16).substring(2, 10)
        });

        client.on('connect', () => {
            console.log("✅ Menu MQTT Connected");
            client.subscribe('restaurant/snmimt/table/1');
        });

        client.on('error', (err) => {
            console.log("⚠️ Menu MQTT Error:", err);
        });

        client.on('message', (topic, message) => {
            try {
                const data = JSON.parse(message.toString());
                console.log("📩 Received from MQTT:", data);

                if (data.type === "STATUS") {
                    setActiveOrder(prev => {
                        if (prev && String(prev.tableId) === String(data.tableId)) {
                            console.log("🎯 Status Match! New status:", data.status);
                            if (data.status === 'READY') toast.success('Your order is ready! 🍲');
                            return { ...prev, status: data.status.toLowerCase() };
                        }
                        return prev;
                    });
                }
            } catch (e) {
                console.error("❌ MQTT parse error", e);
            }
        });
        
        setMqttClient(client);

        return () => {
            client.end();
        };
    }, []);

    async function handlePlaceOrder() {
        if (cartItems.length === 0) return
        setPlacingOrder(true)

        const orderData = {
            restaurant_id: restaurantId,
            table_id: tableId,
            items: cartItems.map(({ item, quantity, notes }) => ({
                menu_item_id: item.id,
                name: item.name,
                price: item.price,
                quantity,
                special_instructions: notes,
            })),
            special_instructions: '',
        };

        try {
            const res = await fetch('/api/customer/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            })

            const json = await res.json()
            
            if (json.success && json.data) {
                // Send to ESP32 / Kitchen via MQTT
                if (mqttClient && mqttClient.connected) {
                    const wsPayload = {
                        type: "ORDER",
                        restaurantId,
                        tableId,
                        items: cartItems.map(i => ({
                            name: i.item.name,
                            qty: i.quantity,
                            price: i.item.price
                        })),
                        total: cartTotal + 5,
                        status: "PLACED"
                    };
                    mqttClient.publish("restaurant/snmimt/table/1", JSON.stringify(wsPayload));
                }

                setActiveOrder(json.data)
                setCart({})
                setShowCart(false)
                toast.success('Order placed successfully! 🚀')
            } else {
                toast.error(json.message || 'Failed to place order')
            }
        } catch {
            toast.error('Failed to place order')
        } finally {
            setPlacingOrder(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 brand-gradient rounded-full animate-pulse flex items-center justify-center glow-orange">
                    <Utensils className="w-8 h-8 text-white" />
                </div>
                <p className="mt-4 text-orange-500 font-medium animate-pulse">Loading Menu...</p>
            </div>
        )
    }

    if (activeOrder) {
        return (
            <OrderTrackingView order={activeOrder} onBackToMenu={() => setActiveOrder(null)} />
        )
    }

    return (
        <div className="min-h-screen bg-gray-950 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-30 glass shadow-xl">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 brand-gradient rounded-xl flex items-center justify-center glow-orange-sm">
                            {restaurant?.logoUrl ? (
                                <Image src={restaurant.logoUrl} alt={restaurant.name} width={40} height={40} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <Utensils className="w-6 h-6 text-white" />
                            )}
                        </div>
                        <div>
                            <h1 className="font-bold text-white leading-tight">{restaurant?.name || 'Restaurant'}</h1>
                            <p className="text-gray-400 text-xs flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Table {tableId.slice(-2)} • Online
                            </p>
                        </div>
                    </div>
                    <button className="p-2 bg-gray-900 border border-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                        <Info className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search dishes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/50"
                        />
                    </div>
                </div>

                {/* Categories Scroller */}
                <div className="flex items-center gap-2 px-4 pb-4 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={cn(
                            "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                            activeCategory === 'all'
                                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700"
                        )}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={cn(
                                "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                activeCategory === cat.id
                                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                    : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700"
                            )}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </header>

            {/* Menu Content */}
            <main className="p-4 space-y-8">
                {categories
                    .filter(cat => activeCategory === 'all' || cat.id === activeCategory)
                    .map(category => {
                    const filteredItems = category.menuItems?.filter(item =>
                        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
                    )

                    if (filteredItems?.length === 0) return null

                    return (
                        <section key={category.id} id={`cat-${category.id}`}>
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-5 brand-gradient rounded-full" />
                                {category.name}
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {filteredItems.map(item => (
                                    <div key={item.id} className="glass-card p-3 flex gap-4 fade-in group">
                                        <div className="w-24 h-24 bg-gray-900 rounded-xl overflow-hidden shrink-0 relative">
                                            {item.imageUrl ? (
                                                <Image src={item.imageUrl} alt={item.name} width={96} height={96} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-800">
                                                    <Utensils className="w-8 h-8" />
                                                </div>
                                            )}
                                            {!item.available && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-tighter">
                                                    Sold Out
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col justify-between py-0.5">
                                            <div>
                                                <div className="flex items-start justify-between">
                                                    <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors">{item.name}</h3>
                                                    <span className={cn(
                                                        "w-3 h-3 border-2 rounded-sm shrink-0 mt-1",
                                                        item.isVeg ? "border-green-600 bg-green-600/10" : "border-red-600 bg-red-600/10"
                                                    )}>
                                                        <span className={cn(
                                                            "w-1.5 h-1.5 rounded-full m-auto",
                                                            item.isVeg ? "bg-green-600" : "bg-red-600"
                                                        )} />
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                                    {item.description || 'Deliciously prepared with fresh ingredients.'}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between mt-2">
                                                <span className="font-bold text-orange-500">{formatCurrency(item.price)}</span>

                                                {cart[item.id] ? (
                                                    <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-2 py-1">
                                                        <button
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="p-1 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <span className="text-sm font-bold text-white w-4 text-center">{cart[item.id].quantity}</span>
                                                        <button
                                                            disabled={!item.available}
                                                            onClick={() => addToCart(item)}
                                                            className="p-1 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors disabled:opacity-30"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        disabled={!item.available}
                                                        onClick={() => addToCart(item)}
                                                        className="bg-orange-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold 
                                       hover:bg-orange-600 active:scale-95 transition-all duration-200
                                       disabled:bg-gray-800 disabled:text-gray-500 disabled:scale-100"
                                                    >
                                                        Add +
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )
                })}
            </main>

            {/* Sticky Bottom Cart Bar */}
            {cartCount > 0 && !showCart && (
                <div className="fixed bottom-6 left-4 right-4 z-40 float-in">
                    <button
                        onClick={() => setShowCart(true)}
                        className="w-full brand-gradient py-4 px-6 rounded-2xl shadow-2xl shadow-orange-500/30 flex items-center justify-between text-white active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">View Cart</p>
                                <p className="text-sm font-bold">{cartCount} Items Added</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 font-bold">
                            <span>{formatCurrency(cartTotal)}</span>
                            <ChevronRight className="w-5 h-5" />
                        </div>
                    </button>
                </div>
            )}

            {/* Cart Drawer */}
            {showCart && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)} />
                    <div className="relative bg-gray-900 rounded-t-3xl h-[85vh] flex flex-col slide-in shadow-2xl border-t border-gray-800">
                        {/* Drawer Handle */}
                        <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mt-3 mb-1" />

                        <div className="p-6 flex items-center justify-between border-b border-gray-800/60">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <ShoppingBag className="w-6 h-6 text-orange-500" />
                                Review Order
                            </h2>
                            <button onClick={() => setShowCart(false)} className="p-2 bg-gray-800 rounded-full text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {cartItems.map(({ item, quantity, notes }) => (
                                <div key={item.id} className="flex gap-4">
                                    <div className="w-16 h-16 bg-gray-800 rounded-xl overflow-hidden shrink-0">
                                        {item.imageUrl ? (
                                            <Image src={item.imageUrl} alt={item.name} width={64} height={64} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-700">
                                                <Utensils className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{item.name}</h4>
                                                <p className="text-orange-500 text-xs font-bold mt-0.5">{formatCurrency(item.price)}</p>
                                            </div>
                                            <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-xl px-2 py-1">
                                                <button onClick={() => removeFromCart(item.id)} className="text-orange-500"><Minus className="w-4 h-4" /></button>
                                                <span className="text-xs font-bold text-white w-4 text-center">{quantity}</span>
                                                <button onClick={() => addToCart(item)} className="text-orange-500"><Plus className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                        {/* Notes Input */}
                                        <input
                                            type="text"
                                            placeholder="Add instructions (e.g., less spicy)"
                                            value={notes}
                                            onChange={(e) => {
                                                setCart(prev => ({
                                                    ...prev,
                                                    [item.id]: { ...prev[item.id], notes: e.target.value }
                                                }))
                                            }}
                                            className="w-full bg-transparent border-none text-[10px] text-gray-500 focus:outline-none focus:text-orange-400 mt-2 p-0"
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className="pt-6 border-t border-gray-800/60">
                                <div className="flex justify-between text-gray-400 text-sm mb-2">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(cartTotal)}</span>
                                </div>
                                <div className="flex justify-between text-gray-400 text-sm mb-4">
                                    <span>Handling Fee</span>
                                    <span>{formatCurrency(5)}</span>
                                </div>
                                <div className="flex justify-between text-white text-lg font-bold">
                                    <span>Grand Total</span>
                                    <span className="text-orange-400">{formatCurrency(cartTotal + 5)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 pt-0">
                            <button
                                onClick={handlePlaceOrder}
                                disabled={placingOrder}
                                className="w-full brand-gradient py-4 rounded-2xl text-white font-bold text-lg glow-orange flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {placingOrder ? (
                                    <>Processing...</>
                                ) : (
                                    <>Place Order • {formatCurrency(cartTotal + 5)}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function OrderTrackingView({ order, onBackToMenu }: { order: Order; onBackToMenu: () => void }) {
    const [currentStatus, setCurrentStatus] = useState(order.status)
    const [estimatedTime, setEstimatedTime] = useState(order.estimatedTimeMinutes)

    useEffect(() => {
        // Sync with parent prop if it changes via WS
        setCurrentStatus(order.status);
    }, [order.status]);

    useEffect(() => {
        // Polling for status changes
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/customer/orders?orderId=${order.id}`)
                const json = await res.json()
                if (json.success) {
                    const newStatus = json.data.status;
                    if (newStatus !== currentStatus) {
                        if (newStatus.toLowerCase() === 'ready' && currentStatus.toLowerCase() !== 'ready') toast.success('Your order is ready! 🍲')
                        if (newStatus.toLowerCase() === 'served' && currentStatus.toLowerCase() !== 'served') toast.success('Order served. Enjoy your meal! ✨')
                        setCurrentStatus(newStatus);
                    }
                    setEstimatedTime(json.data.estimatedTimeMinutes)
                }
            } catch {
                console.error('Error polling order status');
            }
        }, 5000)

        return () => clearInterval(interval)
    }, [order.id, currentStatus])

    const steps = [
        { key: 'placed', label: 'Order Placed', time: 'Just now' },
        { key: 'accepted', label: 'Accepted', time: 'Kitchen confirmed' },
        { key: 'preparing', label: 'Preparing', time: 'Chef is cooking' },
        { key: 'ready', label: 'Ready', time: 'Fresh & Hot' },
        { key: 'served', label: 'Served', time: 'Enjoy!' },
    ]

    const activeIndex = steps.findIndex(s => s.key === currentStatus.toLowerCase())

    return (
        <div className="min-h-screen bg-gray-950 p-6 flex flex-col fade-in">
            <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
                <div className="w-24 h-24 brand-gradient rounded-3xl flex items-center justify-center glow-orange mb-8 animate-pulse">
                    <Clock className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-white text-center mb-2">Order Tracking</h2>
                <p className="text-gray-500 text-sm text-center mb-8">Order ID: #{order.id.slice(0, 8)}</p>

                {estimatedTime && status !== 'served' && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 w-full mb-8 text-center">
                        <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-1">Estimated Time</p>
                        <p className="text-3xl font-black text-white">{estimatedTime} <span className="text-lg opacity-60">mins</span></p>
                    </div>
                )}

                {/* Live Timeline */}
                <div className="w-full space-y-6 relative">
                    <div className="absolute left-2.75 top-2 bottom-8 w-0.5 bg-gray-800" />
                    {steps.map((step, idx) => {
                        const isDone = idx < activeIndex
                        const isCurrent = idx === activeIndex
                        const isFuture = idx > activeIndex

                        return (
                            <div key={step.key} className={cn(
                                "flex gap-6 items-start transition-opacity duration-500",
                                isFuture && "opacity-30"
                            )}>
                                <div className={cn(
                                    "w-6 h-6 rounded-full border-2 z-10 flex items-center justify-center transition-all duration-300",
                                    isDone ? "bg-green-500 border-green-500" :
                                        isCurrent ? "bg-orange-500 border-orange-500 animate-pulse" :
                                            "bg-gray-950 border-gray-800"
                                )}>
                                    {isDone && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    {isCurrent && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <div>
                                    <h4 className={cn("font-bold text-sm", isCurrent ? "text-orange-400" : "text-white")}>{step.label}</h4>
                                    <p className="text-xs text-gray-500">{idx <= activeIndex ? step.time : 'Upcoming'}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <button
                onClick={onBackToMenu}
                className="w-full py-4 glass-card text-gray-400 font-bold text-sm hover:text-white transition-colors"
            >
                Back to Menu
            </button>
        </div>
    )
}
