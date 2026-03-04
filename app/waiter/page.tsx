'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import {
    Table2, Bell, CheckCircle2, History, Utensils,
    ArrowRight, UserCheck, Receipt, Wallet, ClipboardList,
    AlertCircle, Clock
} from 'lucide-react'
import { cn, formatCurrency, formatTime } from '@/lib/utils'
import type { User, Restaurant, Table, Order } from '@/types'

export default function WaiterDashboard() {
    const [profile, setProfile] = useState<any>(null)
    const [tables, setTables] = useState<(Table & { hasActiveOrder: boolean; hasReadyOrder: boolean; activeOrders: any[] })[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTable, setSelectedTable] = useState<any>(null)
    const router = useRouter()

    useEffect(() => {
        fetchProfile()

        // Real-time updates disabled, using polling
        const interval = setInterval(() => {
            if (profile?.restaurantId) fetchTables(profile.restaurantId)
        }, 30000)

        return () => clearInterval(interval)
    }, [profile?.restaurantId])

    async function fetchProfile() {
        try {
            const res = await fetch('/api/auth/me')
            const json = await res.json()
            if (json.success) {
                setProfile(json.data)
                fetchTables(json.data.restaurantId)
            } else {
                router.push('/login')
            }
        } catch (e) {
            toast.error('Auth failed')
        }
    }

    async function fetchTables(restaurantId?: string) {
        const rId = restaurantId || profile?.restaurantId
        if (!rId) return

        try {
            const res = await fetch(`/api/waiter/tables?restaurantId=${rId}`)
            const json = await res.json()
            if (json.success) {
                setTables(json.data)
            }
        } catch (error) {
            toast.error('Failed to load tables')
        } finally {
            setLoading(false)
        }
    }

    async function updateOrderStatus(orderId: string, action: 'serve' | 'complete') {
        try {
            const res = await fetch('/api/waiter/tables', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, action })
            })
            const json = await res.json()
            if (json.success) {
                toast.success(action === 'serve' ? 'Order Served!' : 'Order Completed & Paid')
                fetchTables()
                if (selectedTable) {
                    // Update local table data if drawer is open
                    const updatedTable = tables.find(t => t.id === selectedTable.id)
                    setSelectedTable(updatedTable)
                }
            }
        } catch (err) {
            toast.error('Failed to update order')
        }
    }

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar
                role={profile?.role || 'waiter'}
                userName={profile?.name || 'Waiter'}
                restaurantName={profile?.restaurant?.name}
            />

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 flex items-center justify-between px-8 border-b border-gray-800/60 glass z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 brand-gradient rounded-xl flex items-center justify-center glow-orange-sm">
                            <Table2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Table Overview</h2>
                            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                {tables.length} Tables Active
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-6 px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-xl">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Ready for Pickup</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Occupied</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center opacity-40">
                            <ClipboardList className="w-10 h-10 text-orange-500 animate-bounce" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {tables.map(table => (
                                <button
                                    key={table.id}
                                    onClick={() => setSelectedTable(table)}
                                    className={cn(
                                        "glass-card p-6 flex flex-col items-center justify-center relative transition-all duration-300 active:scale-95 group",
                                        table.hasReadyOrder && "ring-2 ring-orange-500 border-orange-500/50 glow-orange-sm",
                                        !table.hasActiveOrder && "opacity-60"
                                    )}
                                >
                                    {table.hasReadyOrder && (
                                        <div className="absolute -top-3 -right-2 px-2 py-1 brand-gradient rounded-lg shadow-lg">
                                            <Bell className="w-3 h-3 text-white animate-bounce" />
                                        </div>
                                    )}

                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                                        table.hasReadyOrder ? "bg-orange-500 text-white" :
                                            table.hasActiveOrder ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-gray-600"
                                    )}>
                                        <Table2 className="w-6 h-6" />
                                    </div>

                                    <span className="text-2xl font-black text-white">#{table.tableNumber}</span>
                                    <span className={cn(
                                        "text-[8px] font-black uppercase tracking-widest mt-1",
                                        table.hasActiveOrder ? "text-blue-400" : "text-gray-600"
                                    )}>
                                        {table.hasActiveOrder ? 'Occupied' : 'Vacant'}
                                    </span>

                                    {table.hasActiveOrder && (
                                        <div className="mt-4 flex flex-col items-center">
                                            <span className="text-[10px] font-bold text-gray-400">
                                                {table.activeOrders?.length} Orders
                                            </span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Table Detail Drawer */}
            {selectedTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTable(null)} />
                    <div className="relative w-full max-w-md h-full bg-gray-900 border-l border-gray-800 shadow-2xl flex flex-col slide-in">
                        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Table #{selectedTable.tableNumber}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Manage orders and payments</p>
                            </div>
                            <button onClick={() => setSelectedTable(null)} className="p-2 bg-gray-800 rounded-full text-gray-400">
                                <Receipt className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {!selectedTable.hasActiveOrder ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center opacity-40">
                                    <History className="w-12 h-12 text-gray-700 mb-4" />
                                    <p className="font-bold text-gray-500">No active orders</p>
                                </div>
                            ) : (
                                selectedTable.activeOrders.map((order: any) => (
                                    <div key={order.id} className="glass-card overflow-hidden border-gray-800/40">
                                        <div className={cn(
                                            "px-4 py-3 flex items-center justify-between border-b",
                                            order.status === 'ready' ? "bg-orange-500/10 border-orange-500/20" : "bg-gray-800/20 border-gray-800"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    order.status === 'ready' ? "bg-orange-500 animate-pulse" : "bg-blue-500"
                                                )} />
                                                <span className="text-xs font-bold text-white uppercase tracking-wider">{order.status}</span>
                                            </div>
                                            <span className="text-xs text-gray-500">{formatTime(order.created_at)}</span>
                                        </div>

                                        <div className="p-4 space-y-3">
                                            <div className="flex justify-between items-center pb-3 border-b border-gray-800/60">
                                                <span className="text-xs text-gray-400">Bill Amount</span>
                                                <span className="text-sm font-bold text-white">{formatCurrency(order.total_amount)}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mt-4">
                                                {order.status === 'ready' && (
                                                    <button
                                                        onClick={() => updateOrderStatus(order.id, 'serve')}
                                                        className="col-span-2 flex items-center justify-center gap-2 py-3 brand-gradient rounded-xl text-white font-bold text-xs glow-orange"
                                                    >
                                                        <UserCheck className="w-4 h-4" /> Mark as Served
                                                    </button>
                                                )}

                                                {(order.status === 'served' || order.status === 'ready') && (
                                                    <button
                                                        onClick={() => updateOrderStatus(order.id, 'complete')}
                                                        className="col-span-2 flex items-center justify-center gap-2 py-3 bg-green-600 rounded-xl text-white font-bold text-xs shadow-lg shadow-green-600/10"
                                                    >
                                                        <Wallet className="w-4 h-4" /> Generate & Pay Bill
                                                    </button>
                                                )}

                                                {order.status !== 'ready' && order.status !== 'served' && (
                                                    <div className="col-span-2 p-3 bg-gray-800/50 rounded-xl border border-gray-800 flex items-center gap-3">
                                                        <Clock className="w-4 h-4 text-orange-500" />
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Kitchen preparing...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 bg-gray-900 border-t border-gray-800">
                            <button
                                onClick={() => setSelectedTable(null)}
                                className="w-full py-4 text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
                            >
                                Close Panel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
