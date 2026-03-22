'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import {
    Building2, Users, CreditCard, Settings,
    BarChart3, Plus, ShieldCheck, Mail,
    Phone, Globe, MapPin, Camera, Save,
    Loader2, BadgeCheck, AlertTriangle, Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User, Restaurant } from '@/types'

export default function AdminDashboard() {
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [restaurantForm, setRestaurantForm] = useState<any>({})
    const router = useRouter()

    useEffect(() => {
        fetchProfile()
    }, [])

    async function fetchProfile() {
        try {
            const res = await fetch('/api/auth/me')
            const json = await res.json()
            if (json.success) {
                setProfile(json.data)
                setRestaurantForm(json.data.restaurant || {})
            } else {
                router.push('/login')
            }
        } catch (e) {
            toast.error('Auth failed')
        } finally {
            setLoading(false)
        }
    }

    async function handleUpdateRestaurant(e: React.FormEvent) {
        e.preventDefault()
        if (!profile?.restaurantId) return;

        setSaving(true)

        try {
            const response = await fetch('/api/restaurant', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: profile.restaurantId,
                    ...restaurantForm
                })
            })

            const result = await response.json()

            if (result.success) {
                toast.success('Restaurant profile updated! ✨')
                fetchProfile()
            } else {
                throw new Error(result.message || 'Update failed')
            }
        } catch (err: any) {
            toast.error(err.message || 'Update failed')
        } finally {
            setSaving(false)
        }
    }

    async function toggleRestaurantStatus() {
        if (!profile?.restaurantId) return;
        try {
            const newStatus = !restaurantForm?.isActive;
            const response = await fetch('/api/restaurant', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: profile.restaurantId,
                    isActive: newStatus
                })
            })
            const result = await response.json()
            if (result.success) {
                toast.success(newStatus ? 'Ordering Activated! 🚀' : 'Ordering Deactivated 🛑')
                setRestaurantForm({ ...restaurantForm, isActive: newStatus })
                fetchProfile()
            } else {
                throw new Error(result.message || 'Status update failed')
            }
        } catch (err: any) {
            toast.error(err.message || 'Status update failed')
        }
    }

    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar
                role={profile?.role || 'admin'}
                userName={profile?.name || 'Admin'}
                restaurantName={profile?.restaurant?.name || 'Restaurant Admin'}
            />

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 flex items-center justify-between px-8 border-b border-gray-800/60 glass z-20">
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-bold text-white tracking-tight">Restaurant Settings</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Active Subscription</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-8 fade-in">
                            {/* Profile Overview Card */}
                            <div className="glass-card p-1 relative overflow-hidden">
                                <div className="h-32 brand-gradient opacity-10" />
                                <div className="px-8 pb-8 -mt-12 flex flex-col md:flex-row items-center md:items-end gap-6">
                                    <div className="w-32 h-32 bg-gray-950 border-4 border-gray-900 rounded-3xl overflow-hidden shadow-2xl relative group">
                                        {restaurantForm?.logoUrl || profile?.restaurant?.logoUrl ? (
                                            <img src={restaurantForm?.logoUrl || profile?.restaurant?.logoUrl} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-800 bg-gray-900">
                                                <Camera className="w-10 h-10" />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Plus className="w-8 h-8 text-white" />
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    const reader = new FileReader()
                                                    reader.onloadend = () => {
                                                        setRestaurantForm({ ...restaurantForm, logoUrl: reader.result as string })
                                                    }
                                                    reader.readAsDataURL(file)
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-2xl font-black text-white flex items-center justify-center md:justify-start gap-2">
                                            {profile?.restaurant?.name}
                                            <BadgeCheck className="w-6 h-6 text-blue-500" />
                                        </h3>
                                        <p className="text-gray-500 text-sm font-medium mt-1">Admin Dashboard • Since 2024</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button className="px-5 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-xs font-black text-white hover:bg-gray-800 transition-colors">Manage Staff</button>
                                        <button className="px-5 py-2.5 brand-gradient rounded-xl text-xs font-black text-white shadow-lg shadow-orange-500/20 active:scale-95 transition-all">Upgrade Plan</button>
                                    </div>
                                </div>
                            </div>

                            {/* Settings Form */}
                            <form onSubmit={handleUpdateRestaurant} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="md:col-span-2 space-y-6">
                                    <div className="glass-card p-6">
                                        <h4 className="font-bold text-white mb-6 flex items-center gap-2 pb-4 border-b border-gray-800/60">
                                            <Building2 className="w-4 h-4 text-orange-500" />
                                            Basic Information
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Restaurant Name</label>
                                                <input value={restaurantForm.name || ''} onChange={e => setRestaurantForm({ ...restaurantForm, name: e.target.value })} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Email Address</label>
                                                <input value={profile?.email || ''} disabled className="w-full bg-gray-900/30 border border-gray-800/40 rounded-xl px-4 py-3 text-gray-500 text-sm cursor-not-allowed" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Site URL (Scan4Serve Subdomain)</label>
                                                <div className="flex">
                                                    <span className="bg-gray-900 px-4 py-3 rounded-l-xl border border-r-0 border-gray-800 text-gray-600 text-xs font-bold flex items-center">app.scan4serve.com/</span>
                                                    <input value={restaurantForm.subdomain || ''} disabled className="flex-1 bg-gray-900/30 border border-gray-800/40 rounded-r-xl px-4 py-3 text-gray-500 text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="glass-card p-6">
                                        <h4 className="font-bold text-white mb-6 flex items-center gap-2 pb-4 border-b border-gray-800/60">
                                            <MapPin className="w-4 h-4 text-orange-500" />
                                            Contact & Location
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Phone Number</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                                    <input placeholder="+1 234 567 890" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-orange-500/50" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Currency</label>
                                                <select className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50 appearance-none">
                                                    <option>INR (₹)</option>
                                                    <option>USD ($)</option>
                                                    <option>EUR (€)</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Address</label>
                                                <textarea rows={3} placeholder="123 Street Name, City, Country" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button type="button" className="px-8 py-3 bg-gray-900 text-gray-500 font-bold rounded-xl text-sm hover:text-white transition-colors">Discard Changes</button>
                                        <button disabled={saving} className="px-10 py-3 brand-gradient text-white font-black rounded-xl text-sm shadow-xl shadow-orange-500/20 flex items-center gap-3 active:scale-95 transition-all">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Configuration
                                        </button>
                                    </div>
                                </div>

                                {/* Sidebar Stats/Info */}
                                <div className="space-y-6">
                                    <div className="glass-card p-6 border-blue-500/10">
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="text-xs font-black text-white uppercase tracking-widest">Subscription</h4>
                                            <span className="p-1 px-2 bg-blue-500/10 text-blue-500 text-[8px] font-bold rounded-md">PRO PLAN</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 font-medium">Monthly Orders</span>
                                                <span className="text-white font-black">1,402 / 5,000</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: '28%' }} />
                                            </div>
                                            <p className="text-[10px] text-gray-600 leading-relaxed italic border-t border-gray-800/60 pt-4 mt-4">
                                                Next billing cycle: Oct 12, 2024
                                            </p>
                                        </div>
                                    </div>

                                    <div className="glass-card p-6 bg-orange-500/5 border-orange-500/10">
                                        <h4 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4">Quick Links</h4>
                                        <div className="space-y-2">
                                            <button
                                                type="button"
                                                onClick={() => window.open(`/menu/${profile?.restaurantId}/1`, '_blank')}
                                                className="w-full p-3 rounded-xl bg-gray-900/50 border border-gray-800 text-left text-xs font-bold text-gray-300 hover:border-orange-500/30 transition-all flex items-center justify-between group"
                                            >
                                                View Live Menu <Globe className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const qrUrl = `/api/admin/qr-pack?restaurantId=${profile?.restaurantId}`;
                                                    const link = document.createElement('a');
                                                    link.href = qrUrl;
                                                    link.download = `qr-pack-${profile?.restaurant?.name || 'restaurant'}.zip`;
                                                    link.click();
                                                }}
                                                className="w-full p-3 rounded-xl bg-gray-900/50 border border-gray-800 text-left text-xs font-bold text-gray-300 hover:border-orange-500/30 transition-all flex items-center justify-between group"
                                            >
                                                Download QR Pack <Download className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => window.location.href = 'mailto:support@scan4serve.com?subject=Support Request from ' + (profile?.restaurant?.name || 'Admin')}
                                                className="w-full p-3 rounded-xl bg-gray-900/50 border border-gray-800 text-left text-xs font-bold text-gray-300 hover:border-red-500/30 transition-all flex items-center justify-between group"
                                            >
                                                Contact Support <Mail className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className={cn("p-6 border rounded-2xl", restaurantForm?.isActive ? "bg-red-500/10 border-red-500/20" : "bg-green-500/10 border-green-500/20")}>
                                        <h4 className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-2", restaurantForm?.isActive ? "text-red-500" : "text-green-500")}>
                                            <AlertTriangle className="w-3.5 h-3.5" /> {restaurantForm?.isActive ? "Stop Service" : "Start Service"}
                                        </h4>
                                        <p className={cn("text-[10px] leading-relaxed mb-4", restaurantForm?.isActive ? "text-red-500/60" : "text-green-500/60")}>
                                            {restaurantForm?.isActive
                                                ? "Temporarily disable your online menu. Customers won't be able to place new orders."
                                                : "Enable your online menu. Customers will be able to place new orders."}
                                        </p>
                                        <button type="button" onClick={toggleRestaurantStatus} className={cn("w-full py-2 text-white text-[10px] font-black uppercase rounded-lg transition-colors", restaurantForm?.isActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600")}>
                                            {restaurantForm?.isActive ? "Deactivate Ordering" : "Activate Ordering"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
