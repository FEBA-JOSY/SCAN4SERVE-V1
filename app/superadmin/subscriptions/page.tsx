'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import {
    Wallet, DollarSign, ArrowUpRight, ArrowDownRight,
    Activity, Loader2, Search, CheckCircle2, XCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { User } from '@/types'

export default function SuperAdminSubscriptions() {
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

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar
                role="superadmin"
                userName={profile?.name || 'Super Admin'}
            />

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 flex items-center justify-between pl-16 pr-8 md:px-8 border-b border-gray-800/60 glass z-20">
                    <div className="flex items-center gap-3">
                        <Wallet className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-bold text-white tracking-tight">Subscription Management</h2>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-8 fade-in">
                            <div className="glass-card p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
                                <div className="p-4 bg-gray-900 rounded-full mb-6 text-orange-500/10">
                                    <DollarSign className="w-12 h-12 text-orange-500/20" />
                                </div>
                                <h3 className="text-xl font-black text-white italic">Billing & Invoices</h3>
                                <p className="text-sm text-gray-500 max-w-sm mt-2">
                                    Track SaaS revenue, manage plan pricing, and view invoice history across all platform tenants.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
