'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import {
    ChefHat, Clock, AlertCircle, CheckCircle2,
    ChevronRight, Timer, UtensilsCrossed, Volume2,
    VolumeX, LayoutGrid, Search, Bell, History
} from 'lucide-react'
import { cn, formatCurrency, formatTime, minutesAgo } from '@/lib/utils'
import type { Order, User, Restaurant } from '@/types'

type KitchenTab = 'orders' | 'notifications' | 'history'

export default function KitchenDashboard({ initialTab = 'orders' }: { initialTab?: KitchenTab } = {}) {
        // Fetch profile on mount to avoid infinite loading
        useEffect(() => {
            fetchProfile();
        }, []);
    const [profile, setProfile] = useState<any>(null)
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState<KitchenTab>(initialTab)
    const [ws, setWs] = useState<WebSocket | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (pathname && pathname.endsWith('/notifications')) setActiveTab('notifications')
        if (pathname && pathname.endsWith('/history')) setActiveTab('history')
        if (pathname && (pathname.endsWith('/kitchen') || pathname === '/kitchen')) setActiveTab('orders')
    }, [pathname])

    useEffect(() => {

        // Initialize notification sound
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')

        // --- WebSocket Real-time Updates ---
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("✅ Kitchen WS Connected");
        };

        socket.onclose = () => {
            console.log("❌ Kitchen WS Disconnected");
        };

        socket.onerror = (err) => {
            console.log("⚠️ Kitchen WS Error:", err);
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "ORDER") {
                    console.log("New order detected via WS:", data);
                    handleNewOrder(data as any); 
                    fetchOrders();
                }
            } catch (e) {
                console.error("WS message error", e);
            }
        };

        setWs(socket);

        // Realtime disabled after migration from Supabase
        // Will be replaced with polling or Pusher/Ably if needed
        const interval = setInterval(() => {
            if (profile?.restaurantId) fetchOrders(profile.restaurantId)
        }, 30000)

        return () => {
            socket.close();
            clearInterval(interval);
        }
    }, [profile?.restaurantId])

    async function fetchProfile() {
        try {
            const res = await fetch('/api/auth/me')
            const json = await res.json()
            if (json.success) {
                setProfile(json.data)
                fetchOrders(json.data.restaurantId)
            } else {
                router.push('/login')
            }
        } catch (e) {
            toast.error('Auth failed')
        }
    }

    async function fetchOrders(restaurantId?: string) {
        const rId = restaurantId || profile?.restaurantId
        if (!rId) return

        try {
            const res = await fetch(`/api/kitchen/orders?restaurantId=${rId}`)
            const json = await res.json()
            if (json.success) {
                setOrders(json.data)
            }
        } catch (error) {
            toast.error('Failed to load orders')
        } finally {
            setLoading(false)
        }
    }

    function handleNewOrder(order: Order) {
        if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(e => console.log('Sound blocked'))
        }
        toast('New Order Received!', {
            description: `Table #${order.tableId.slice(-2)} - Total ${formatCurrency(order.totalAmount)}`,
            action: {
                label: 'View',
                onClick: () => console.log('Scroll to order', order.id)
            }
        })
        fetchOrders()
    }

    async function updateStatus(orderId: string, status: string) {
        try {
            const res = await fetch('/api/kitchen/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status })
            })
            const json = await res.json()
            if (json.success) {
                    toast.success(`Order marked as ${status}`)
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        const wsPayload = { 
                            type: "STATUS", 
                            tableId: String(json.data.tableId), 
                            status: status.toUpperCase() 
                        };
                        console.log("🚀 Sending Status Update via WS:", wsPayload);
                        ws.send(JSON.stringify(wsPayload));
                    }
                    fetchOrders()
                }
        } catch (error) {
            toast.error('Update failed')
        }
    }

    const filteredOrders = orders.filter(o =>
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.table?.tableNumber?.toString().includes(searchQuery)
    )

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar
                role={profile?.role || 'kitchen'}
                userName={profile?.name || 'Chef'}
                restaurantName={profile?.restaurant?.name}
            />

            <main className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-gray-800/60 glass z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 brand-gradient rounded-xl flex items-center justify-center glow-orange-sm">
                            <ChefHat className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            {activeTab === 'orders' ? (
                                <>
                                    <h2 className="text-lg font-bold text-white tracking-tight">Kitchen Live Queue</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                                            {orders.length} Active Orders
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-lg font-bold text-white tracking-tight">Kitchen Notifications</h2>
                                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Recent order alerts</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {activeTab === 'orders' && (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Find order or table..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/30 w-64"
                                    />
                                </div>
                                <button
                                    onClick={() => setSoundEnabled(!soundEnabled)}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all border",
                                        soundEnabled
                                            ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                                            : "bg-gray-900 border-gray-800 text-gray-500"
                                    )}
                                >
                                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                                </button>
                            </>
                        )}
                        
                        <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-xl border border-gray-800">
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                                    activeTab === 'orders'
                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                <ChefHat className="w-3.5 h-3.5" />
                                Orders
                            </button>
                            <button
                                onClick={() => setActiveTab('notifications')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                                    activeTab === 'notifications'
                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                <Bell className="w-3.5 h-3.5" />
                                Notifications
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                                    activeTab === 'history'
                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                <History className="w-3.5 h-3.5" />
                                History
                            </button>
                        </div>
                    </div>
                </header>

                {/* Orders Grid / Notifications */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40">
                            <Timer className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                            <p className="font-bold text-gray-400">Heating up the kitchen...</p>
                        </div>
                    ) : activeTab === 'orders' ? (
                        orders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-gray-800" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Queue Clear!</h3>
                                <p className="text-gray-500 max-w-xs">All orders have been prepared. High-five the team!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredOrders.map(order => (
                                    <div key={order.id} className={cn(
                                        "glass-card p-0 flex flex-col h-[450px] relative overflow-hidden group",
                                        order.status === 'placed' && "border-yellow-500/30 ring-1 ring-yellow-500/20 pulse-ring",
                                        order.priority > 0 && "border-red-500/30 ring-1 ring-red-500/20"
                                    )}>
                                        {/* Order Header */}
                                        <div className={cn(
                                            "p-4 flex items-center justify-between border-b",
                                            order.status === 'placed' ? "bg-yellow-500/10 border-yellow-500/20" :
                                                order.status === 'preparing' ? "bg-orange-500/10 border-orange-500/20" :
                                                    "bg-gray-800/20 border-gray-800"
                                        )}>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl font-black text-white">#{order.table?.tableNumber || order.tableId.slice(-2)}</span>
                                                    <div className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                                                        order.status === 'placed' ? "bg-yellow-500 text-black" :
                                                            order.status === 'preparing' ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
                                                    )}>
                                                        {order.status}
                                                    </div>
                                                </div>
                                                <p className="text-gray-500 text-[10px] flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {minutesAgo(order.createdAt)} mins ago • {formatTime(order.createdAt)}
                                                </p>
                                            </div>
                                            {order.priority > 0 && (
                                                <AlertCircle className="w-6 h-6 text-red-500 animate-pulse" />
                                            )}
                                        </div>

                                        {/* Items list */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex gap-3">
                                                    <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
                                                        {item.quantity}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-gray-200">{item.name}</p>
                                                        {item.specialInstructions && (
                                                            <div className="mt-1 px-2 py-1 bg-red-500/5 border border-red-500/10 rounded-md">
                                                                <p className="text-[10px] text-red-400 font-medium italic">
                                                                    " {item.specialInstructions} "
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {order.specialInstructions && (
                                                <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                                    <p className="text-[10px] text-blue-400 font-bold uppercase mb-1 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> Order Note
                                                    </p>
                                                    <p className="text-xs text-gray-400 italic font-medium">{order.specialInstructions}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer Stats */}
                                        <div className="p-4 bg-gray-900/40 border-t border-gray-800/60">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-xs text-gray-500 font-medium">Total Items</span>
                                                <span className="text-sm font-bold text-white">{order.items.reduce((a, b) => a + b.quantity, 0)}</span>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                {order.status === 'placed' && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, 'accepted')}
                                                        className="flex-1 py-2.5 bg-yellow-500 text-black font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-yellow-400 transition-colors"
                                                    >
                                                        Accept Order
                                                    </button>
                                                )}

                                                {(order.status === 'accepted' || order.status === 'placed') && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, 'preparing')}
                                                        className="flex-1 py-2.5 bg-orange-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-orange-400 transition-colors shadow-lg shadow-orange-500/20"
                                                    >
                                                        Start Preparations
                                                    </button>
                                                )}

                                                {order.status === 'preparing' && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, 'ready')}
                                                        className="flex-1 py-2.5 bg-green-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-green-500 transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                                                    >
                                                        Mark as Ready <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : activeTab === 'notifications' ? (
                        <NotificationsTab restaurantId={profile?.restaurantId} />
                    ) : (
                        <HistoryTab restaurantId={profile?.restaurantId} />
                    )}
                </div>
            </main>
        </div>
    )
}

function NotificationsTab({ restaurantId }: { restaurantId?: string }) {
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (restaurantId) {
            fetchNotifications()
            const interval = setInterval(() => fetchNotifications(), 5000)
            return () => clearInterval(interval)
        }
    }, [restaurantId])

    const fetchNotifications = async () => {
        if (!restaurantId) return
        if (notifications.length === 0) setLoading(true)
        try {
            const res = await fetch(`/api/kitchen/notifications?restaurantId=${restaurantId}`)
            const json = await res.json()
            if (json.success) {
                setNotifications(json.data || [])
            }
        } catch (e) {
            toast.error('Failed to load notifications')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Bell className="w-8 h-8 text-orange-500 animate-bounce" />
            </div>
        )
    }

    return (
        <div className="space-y-4 fade-in">
            <div>
                <h3 className="font-bold text-white text-lg mb-4">Order Notifications</h3>
                <p className="text-gray-400 text-sm">Recent order alerts and updates for your kitchen</p>
            </div>

            {notifications.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Bell className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500">No notifications yet</p>
                </div>
            ) : (
                <div className="space-y-3 max-w-2xl">
                    {notifications.map((notif, idx) => (
                        <div key={idx} className="glass-card p-4 border border-gray-800/40 hover:border-orange-500/20 transition-all">
                            <div className="flex items-start gap-4">
                                <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                                <div className="flex-1">
                                    <h4 className="font-bold text-white">{notif.title}</h4>
                                    <p className="text-sm text-gray-400 mt-1">{notif.message}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {notif.timestamp}
                                    </p>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold uppercase px-2 py-1 rounded-lg flex-shrink-0",
                                    notif.type === 'new' ? 'bg-yellow-500/10 text-yellow-400' :
                                        notif.type === 'preparing' ? 'bg-orange-500/10 text-orange-400' :
                                            'bg-gray-500/10 text-gray-400'
                                )}>
                                    {notif.type}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function HistoryTab({ restaurantId }: { restaurantId?: string }) {
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])

    const fetchHistory = useCallback(async () => {
        if (!restaurantId) return
        if (history.length === 0) setLoading(true)
        try {
            const res = await fetch(`/api/kitchen/orders?restaurantId=${restaurantId}&status=history&date=${selectedDate}`)
            const json = await res.json()
            if (json.success) {
                setHistory(json.data || [])
            }
        } catch (e) {
            toast.error('Failed to load history')
        } finally {
            setLoading(false)
        }
    }, [restaurantId, selectedDate, history.length])

    useEffect(() => {
        if (restaurantId) {
            fetchHistory()
            const interval = setInterval(() => fetchHistory(), 5000)
            return () => clearInterval(interval)
        }
    }, [restaurantId, fetchHistory])

    if (loading && history.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <History className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 fade-in">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h3 className="font-bold text-white text-lg mb-2 text-shadow-sm uppercase italic tracking-tight">Order Prep History</h3>
                    <p className="text-gray-400 text-sm">Review recently prepared orders</p>
                </div>
                
                <div className="flex items-center gap-3 bg-gray-900 px-4 py-2 rounded-xl border border-gray-800">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">Select Date:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-white focus:outline-none"
                    />
                </div>
            </div>

            {history.length === 0 ? (
                <div className="glass-card p-12 text-center border-gray-800/40">
                    <History className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm italic">No orders prepared on this date</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {history.map((order, idx) => (
                        <div key={order.id || idx} className="glass-card flex flex-col h-fit group">
                            <div className="p-4 flex items-center justify-between border-b border-gray-800/60 bg-gray-800/10">
                                <div>
                                    <span className="text-xl font-black text-white">#{order.table?.tableNumber || order.tableId.slice(-2)}</span>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter mt-0.5">{order.status}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 font-bold">{formatTime(order.createdAt)}</p>
                                    <p className="text-[9px] text-gray-600 italic">ID: {order.id.slice(0, 8)}</p>
                                </div>
                            </div>
                            <div className="p-4 space-y-2 flex-1">
                                {order.items?.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400"><span className="text-orange-500 font-bold">{item.quantity}x</span> {item.name}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 bg-gray-900/40 border-t border-gray-800/60 flex justify-between items-center px-4">
                                <span className="text-[10px] text-gray-500 font-medium">Prepared & Ready</span>
                                <CheckCircle2 className="w-4 h-4 text-green-500/60 group-hover:text-green-500 transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
