'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import {
    BarChart3, Loader2, TrendingUp, CheckCircle2,
    ShoppingBag, DollarSign, ChefHat
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '@/types'

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount)
}

interface AnalyticsData {
    totalOrders: number
    revenueToday: number
    totalRevenue: number
    peakHours: Array<{ hour: number; count: number }>
    bestSellers: Array<{ name: string; count: number; revenue: number }>
}

export default function AdminAnalyticsPage() {
    const [profile, setProfile] = useState<User | null>(null)
    const [stats, setStats] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const router = useRouter()

    useEffect(() => {
        fetchProfile()
    }, [])

    useEffect(() => {
        if (profile?.restaurantId) {
            fetchAnalytics(profile.restaurantId, selectedDate)
        }
    }, [selectedDate, profile?.restaurantId])

    async function fetchProfile() {
        try {
            const res = await fetch('/api/auth/me')
            const json = await res.json()
            if (json.success && json.data.role === 'admin') {
                setProfile(json.data)
                if (json.data.restaurantId) {
                    fetchAnalytics(json.data.restaurantId, selectedDate)
                } else {
                    setLoading(false)
                }
            } else {
                router.push('/login')
            }
        } catch (e) {
            toast.error('Auth failed')
            setLoading(false)
        }
    }

    const fetchAnalytics = useCallback(async (restaurantId: string, date?: string) => {
        try {
            let url = `/api/manager/analytics?restaurantId=${restaurantId}`
            if (date) url += `&date=${date}`
            const res = await fetch(url)
            const json = await res.json()
            if (json.success) setStats(json.data)
        } finally {
            setLoading(false)
        }
    }, [])

    const cards = [
        { label: 'Today Orders', value: stats?.totalOrders || 0, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Today Revenue', value: formatCurrency(stats?.revenueToday || 0), icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: 'Total Revenue', value: formatCurrency(stats?.totalRevenue || 0), icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        { label: 'Avg Order Value', value: formatCurrency(stats?.totalOrders ? (stats.revenueToday / stats.totalOrders) : 0), icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    ]

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar
                role="admin"
                userName={profile?.name || 'Admin'}
                restaurantName={profile?.restaurant?.name || 'Restaurant Admin'}
            />

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 flex items-center justify-between px-8 border-b border-gray-800/60 glass z-20">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-bold text-white tracking-tight">Restaurant Analytics</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-xs text-gray-400 font-bold mr-2">Date:</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500/50"
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    ) : !profile?.restaurantId ? (
                        <div className="glass-card p-12 text-center max-w-lg mx-auto mt-20">
                            <h3 className="text-xl font-bold text-white mb-2">No Restaurant Linked</h3>
                            <p className="text-gray-500">You need to have an active restaurant to view analytics.</p>
                        </div>
                    ) : (
                        <div className="max-w-6xl mx-auto space-y-8 fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {cards.map(card => (
                                    <div key={card.label} className="glass-card p-6 border-gray-800/60">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={cn("p-2 rounded-xl", card.bg)}>
                                                <card.icon className={cn("w-5 h-5", card.color)} />
                                            </div>
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">+12% vs last week</span>
                                        </div>
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{card.label}</p>
                                        <p className="text-2xl font-black text-white mt-1">{card.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 glass-card p-6 border-gray-800/60">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="font-bold text-white flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-orange-500" />
                                            Peak Hours
                                        </h3>
                                        <button className="text-[10px] font-bold text-gray-500 uppercase hover:text-white transition-colors border border-gray-800 px-3 py-1 rounded-lg">Download CSV</button>
                                    </div>
                                    <div className="h-48 flex items-end gap-2 px-2">
                                        {[...Array(24)].map((_, i) => {
                                            const hourData = stats?.peakHours?.find((h) => h.hour === i)
                                            const count = hourData?.count || 0
                                            const maxCount = Math.max(...(stats?.peakHours?.map((h) => h.count) || [1]))
                                            const height = count ? Math.max((count / maxCount) * 100, 5) : 2
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                                    <div
                                                        className={cn(
                                                            "w-full rounded-t-sm transition-all duration-500 relative",
                                                            count > 0 ? "bg-orange-500/40 group-hover:bg-orange-500" : "bg-gray-800/80"
                                                        )}
                                                        style={{ height: `${height}%` }}
                                                    >
                                                        {count > 0 && (
                                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-[8px] font-bold text-white px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                                {count} orders
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[8px] text-gray-600 font-bold">{i % 12 || 12}{i < 12 ? 'a' : 'p'}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="glass-card p-6 border-gray-800/60">
                                    <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                                        <ChefHat className="w-5 h-5 text-orange-500" />
                                        Best Sellers
                                    </h3>
                                    <div className="space-y-4">
                                        {stats?.bestSellers?.map((item, idx) => (
                                            <div key={item.name} className="flex items-center justify-between p-3 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-orange-500/30 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-black text-gray-700 w-4">{idx + 1}</span>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{item.name}</p>
                                                        <p className="text-[10px] text-gray-500">{item.count} orders</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-black text-orange-500">{formatCurrency(item.revenue)}</p>
                                            </div>
                                        )) || <p className="text-gray-500 text-sm italic py-4">No sales data yet</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
