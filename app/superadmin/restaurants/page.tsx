'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import {
    ShieldAlert, Building2, Search, Plus,
    MoreVertical, Pencil, XCircle, CheckCircle2,
    Loader2, Trash2, Globe, ShieldCheck
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { Restaurant, User } from '@/types'

export default function SuperAdminRestaurants() {
    const [profile, setProfile] = useState<User | null>(null)
    const [restaurants, setRestaurants] = useState<(Restaurant & { admin: User })[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
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
                fetchRestaurants()
            } else {
                router.push('/login')
            }
        } catch (e) {
            toast.error('Auth failed')
        }
    }

    async function fetchRestaurants() {
        try {
            const res = await fetch('/api/superadmin/restaurants')
            const json = await res.json()
            if (json.success) {
                setRestaurants(json.data)
            } else {
                toast.error(json.message || 'Failed to fetch restaurants')
            }
        } catch (e: any) {
            toast.error('Network error while fetching restaurants')
        } finally {
            setLoading(false)
        }
    }

    const filtered = restaurants.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar
                role="superadmin"
                userName={profile?.name || 'Super Admin'}
            />

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 flex items-center justify-between pl-16 pr-8 md:px-8 border-b border-gray-800/60 glass z-20">
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-bold text-white tracking-tight">Restaurant Management</h2>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-8 fade-in">
                            <div className="glass-card p-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                    <div>
                                        <h3 className="text-xl font-black text-white italic">Direct Directory</h3>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Manage platform tenants</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                            <input
                                                placeholder="Find restaurant..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-orange-500/30 w-64"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-gray-800">
                                                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-4">Restaurant</th>
                                                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-4">Admin</th>
                                                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-4">Status</th>
                                                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-4">Plan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/60">
                                            {filtered.map(res => (
                                                <tr key={res.id} className="group hover:bg-white/[0.01] transition-colors">
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-orange-500 border border-gray-800">
                                                                {res.logoUrl ? (
                                                                    <img src={res.logoUrl} className="w-full h-full object-cover rounded-lg" alt="" />
                                                                ) : (
                                                                    <Building2 className="w-5 h-5" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-white">{res.name}</p>
                                                                <p className="text-[10px] text-gray-500">@{res.subdomain}.scan4serve.com</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <span className="text-xs text-gray-400">{res.admin?.email}</span>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                            res.isActive ? "bg-green-600/10 text-green-500 border border-green-500/20" : "bg-red-600/10 text-red-500 border border-red-500/20"
                                                        )}>
                                                            {res.isActive ? 'Live' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-tighter">{res.plan}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
