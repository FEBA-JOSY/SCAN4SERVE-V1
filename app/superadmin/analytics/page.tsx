'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import {
    BarChart3, TrendingUp, Users, Wallet,
    ArrowUpRight, ArrowDownRight, Activity,
    Loader2, DollarSign
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { User } from '@/types'

export default function SuperAdminAnalytics() {
    const [profile, setProfile] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchProfile()
    }, [])

    async function fetchProfile() {
        try {
            const res = await fetch('/api/auth/me')
            const json = await res.json()
            if (json.success && json.data.role === 'superadmin') {
                setProfile(json.data)
            } else {
                router.push('/login')
            }
        } catch (e) {
            toast.error('Auth failed')
        } finally {
            setLoading(false)
        }
    }

    const stats = [
        { label: 'Monthly Revenue', value: formatCurrency(0), change: '+12.5%', trend: 'up', icon: DollarSign, color: 'text-green-500' },
        { label: 'Active Subscriptions', value: '0', change: '+5', trend: 'up', icon: Wallet, color: 'text-blue-500' },
        { label: 'Platform Users', value: '0', change: '+18', trend: 'up', icon: Users, color: 'text-purple-500' },
        { label: 'System Uptime', value: '99.9%', change: 'Stable', trend: 'up', icon: Activity, color: 'text-orange-500' },
    ]

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar
                role="superadmin"
                userName={profile?.name || 'Super Admin'}
            />

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 flex items-center justify-between pl-16 pr-8 md:px-8 border-b border-gray-800/60 glass z-20">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-bold text-white tracking-tight">Platform Analytics</h2>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-8 fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {stats.map(s => (
                                    <div key={s.label} className="glass-card p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-2 bg-gray-900 rounded-xl border border-gray-800">
                                                <s.icon className={cn("w-5 h-5", s.color)} />
                                            </div>
                                            <div className={cn(
                                                "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                s.trend === 'up' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                            )}>
                                                {s.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                {s.change}
                                            </div>
                                        </div>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{s.label}</p>
                                        <p className="text-2xl font-black text-white mt-1">{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="glass-card p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
                                <div className="p-4 bg-gray-900 rounded-full mb-6">
                                    <TrendingUp className="w-12 h-12 text-orange-500/20" />
                                </div>
                                <h3 className="text-xl font-black text-white italic">Aggregated Growth Data</h3>
                                <p className="text-sm text-gray-500 max-w-sm mt-2">
                                    Platform-level analytics and growth trends will appear here as more restaurants join the network.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}
