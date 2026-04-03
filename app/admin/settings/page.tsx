'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import { Settings, Lock, User as UserIcon, Loader2, Save, Shield, BellRing, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '@/types'

export default function AdminSettingsPage() {
    const [profile, setProfile] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    })

    useEffect(() => {
        fetchProfile()
    }, [])

    async function fetchProfile() {
        try {
            const res = await fetch('/api/auth/me')
            const json = await res.json()
            if (json.success && json.data.role === 'admin') {
                setProfile(json.data)
                setForm(prev => ({ ...prev, name: json.data.name || '', email: json.data.email || '' }))
            } else {
                router.push('/login')
            }
        } catch (e) {
            toast.error('Auth failed')
        } finally {
            setLoading(false)
        }
    }

    async function handleSaveSettings(e: React.FormEvent) {
        e.preventDefault()

        if (form.password && form.password !== form.confirmPassword) {
            return toast.error('Passwords do not match')
        }

        setSaving(true)

        try {
            const body: any = {
                name: form.name,
                email: form.email
            }
            if (form.password) body.password = form.password;

            const response = await fetch('/api/auth/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const result = await response.json()
            if (result.success) {
                toast.success('Account settings updated successfully! ✨')
                setForm(prev => ({ ...prev, password: '', confirmPassword: '' }))
                fetchProfile()
            } else {
                throw new Error(result.message || 'Update failed')
            }
        } catch (err: any) {
            toast.error(err.message || 'An error occurred while updating settings')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar
                role="admin"
                userName={profile?.name || 'Admin'}
                restaurantName={profile?.restaurant?.name || 'Restaurant Admin'}
            />

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 flex items-center justify-between pl-16 pr-8 md:px-8 border-b border-gray-800/60 glass z-20">
                    <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-bold text-white tracking-tight">Account Settings</h2>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-8 fade-in">
                            <form onSubmit={handleSaveSettings} className="space-y-6">

                                {/* Personal Information Component */}
                                <div className="glass-card p-8">
                                    <h4 className="font-bold text-white mb-6 flex items-center gap-2 pb-4 border-b border-gray-800/60">
                                        <UserIcon className="w-4 h-4 text-orange-500" />
                                        Personal Profile
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Full Name</label>
                                            <input
                                                required
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Email Address</label>
                                            <input
                                                required
                                                type="email"
                                                value={form.email}
                                                onChange={e => setForm({ ...form, email: e.target.value })}
                                                className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Security Component */}
                                <div className="glass-card p-8">
                                    <h4 className="font-bold text-white mb-6 flex items-center gap-2 pb-4 border-b border-gray-800/60">
                                        <Lock className="w-4 h-4 text-orange-500" />
                                        Security Settings
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">
                                                New Password <span className="text-gray-600 font-normal lowercase">(leave blank to keep current)</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={form.password}
                                                onChange={e => setForm({ ...form, password: e.target.value })}
                                                className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={form.confirmPassword}
                                                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                                className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8 p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl flex items-start gap-4">
                                        <Shield className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h5 className="text-sm font-bold text-white">Two-Factor Authentication</h5>
                                            <p className="text-xs text-gray-500 mt-1">Protect your administrator account with an extra layer of security. Currently disabled for your workspace.</p>
                                        </div>
                                        <button type="button" disabled className="ml-auto px-4 py-2 bg-gray-900 border border-gray-800 text-gray-600 text-[10px] font-black rounded-lg uppercase tracking-wider cursor-not-allowed">Enable 2FA</button>
                                    </div>
                                </div>

                                {/* Preferences Mock Component */}
                                <div className="glass-card p-8 opacity-60 pointer-events-none">
                                    <h4 className="font-bold text-white mb-6 flex items-center gap-2 pb-4 border-b border-gray-800/60">
                                        <BellRing className="w-4 h-4 text-gray-500" />
                                        Notifications (Coming Soon)
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-gray-900/30 border border-gray-800/40 rounded-xl">
                                            <div className="flex items-center gap-4">
                                                <Smartphone className="w-5 h-5 text-gray-600" />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-400">SMS Alerts</p>
                                                    <p className="text-xs text-gray-600">Receive text messages for critical system notifications</p>
                                                </div>
                                            </div>
                                            <div className="w-10 h-5 bg-gray-800 rounded-full" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (profile) setForm(prev => ({ ...prev, name: profile.name, email: profile.email, password: '', confirmPassword: '' }))
                                        }}
                                        className="px-8 py-3 bg-gray-900 border border-gray-800 text-gray-400 font-bold rounded-xl text-sm hover:text-white hover:bg-gray-800 transition-colors"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-10 py-3 brand-gradient text-white font-black rounded-xl text-sm shadow-xl shadow-orange-500/20 flex items-center gap-3 active:scale-95 transition-all"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Settings
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
