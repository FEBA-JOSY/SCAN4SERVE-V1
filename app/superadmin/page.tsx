'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import {
    ShieldAlert, Globe, Activity, Building2,
    Users, DollarSign, TrendingUp, Search,
    Plus, MoreVertical, CheckCircle2, XCircle,
    Loader2, AlertCircle, ArrowUpRight, Camera, Pencil, Trash2
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { Restaurant, User } from '@/types'

export default function SuperAdminDashboard() {
    const [profile, setProfile] = useState<User | null>(null)
    const [restaurants, setRestaurants] = useState<(Restaurant & { admin: User })[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showOnboardModal, setShowOnboardModal] = useState(false)
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [onboarding, setOnboarding] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        subdomain: '',
        email: '',
        logoUrl: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        plan: 'basic'
    })
    const fileInputRef = useRef<HTMLInputElement>(null)
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
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    async function handleOnboard(e: React.FormEvent) {
        e.preventDefault()

        // Validate form data
        if (!formData.name.trim()) {
            toast.error('Restaurant name is required')
            return
        }
        if (!formData.subdomain.trim()) {
            toast.error('Subdomain is required')
            return
        }

        // Admin details only required for NEW onboarding
        if (!editingId && (!formData.adminEmail.trim() || !formData.adminPassword.trim())) {
            toast.error('Admin email and password are required for new restaurants')
            return
        }

        setOnboarding(true)
        try {
            const url = '/api/superadmin/restaurants'
            const method = editingId ? 'PATCH' : 'POST'
            const body = editingId ? {
                id: editingId,
                name: formData.name,
                subdomain: formData.subdomain,
                email: formData.email,
                logoUrl: formData.logoUrl,
                plan: formData.plan,
                adminName: formData.adminName,
                adminEmail: formData.adminEmail,
                adminPassword: formData.adminPassword
            } : formData

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const json = await res.json()
            if (json.success) {
                toast.success(editingId ? 'Restaurant updated!' : 'Restaurant onboarded successfully!')
                setShowOnboardModal(false)
                setEditingId(null)
                fetchRestaurants()
                setFormData({
                    name: '', subdomain: '', email: '', logoUrl: '',
                    adminName: '', adminEmail: '', adminPassword: '',
                    plan: 'basic'
                })
            } else {
                toast.error(json.message || (editingId ? 'Update failed' : 'Onboarding failed'))
            }
        } catch (e: any) {
            toast.error('Network error occurred')
            console.error(e)
        } finally {
            setOnboarding(false)
        }
    }

    function handleEdit(restaurant: any) {
        setEditingId(restaurant.id)
        setFormData({
            name: restaurant.name,
            subdomain: restaurant.subdomain,
            email: restaurant.email || '',
            logoUrl: restaurant.logoUrl || '',
            adminName: restaurant.admin?.name || '',
            adminEmail: restaurant.admin?.email || '',
            adminPassword: '', // Don't show password
            plan: restaurant.plan || 'basic'
        })
        setShowOnboardModal(true)
    }

    function handleNewOnboard() {
        setEditingId(null)
        setFormData({
            name: '', subdomain: '', email: '', logoUrl: '',
            adminName: '', adminEmail: '', adminPassword: '',
            plan: 'basic'
        })
        setShowOnboardModal(true)
    }

    async function toggleStatus(id: string, currentStatus: boolean) {
        try {
            const res = await fetch('/api/superadmin/restaurants', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: !currentStatus })
            })
            const json = await res.json()
            if (json.success) {
                toast.success(currentStatus ? 'Restaurant deactivated' : 'Restaurant activated!')
                fetchRestaurants()
            } else {
                toast.error(json.message || 'Failed to toggle status')
            }
        } catch (e: any) {
            toast.error('Network error while updating status')
            console.error(e)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this restaurant? This action cannot be undone.')) {
            return
        }

        try {
            const res = await fetch(`/api/superadmin/restaurants?id=${id}`, {
                method: 'DELETE',
            })
            const json = await res.json()
            if (json.success) {
                toast.success('Restaurant deleted successfully')
                fetchRestaurants()
            } else {
                toast.error(json.message || 'Failed to delete restaurant')
            }
        } catch (e: any) {
            toast.error('Network error while deleting restaurant')
            console.error(e)
        }
    }

    const filtered = restaurants.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const stats = [
        { label: 'Total SaaS Revenue', value: formatCurrency(0), icon: DollarSign, color: 'text-green-500' },
        { label: 'Platform Restaurants', value: restaurants.length, icon: Building2, color: 'text-blue-500' },
        { label: 'Live Orders Now', value: 0, icon: Activity, color: 'text-orange-500' },
        { label: 'Total SaaS Users', value: 0, icon: Users, color: 'text-purple-500' },
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
                        <ShieldAlert className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-bold text-white tracking-tight">Platform Command</h2>
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
                                            <TrendingUp className="w-4 h-4 text-green-500" />
                                        </div>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{s.label}</p>
                                        <p className="text-2xl font-black text-white mt-1">{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="glass-card p-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                    <div>
                                        <h3 className="text-xl font-black text-white">Restaurant Directory</h3>
                                        <p className="text-xs text-gray-500 font-medium mt-1">Onboard and manage platform tenants</p>
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
                                        <button
                                            onClick={handleNewOnboard}
                                            className="flex items-center gap-2 brand-gradient px-6 py-2.5 rounded-xl text-xs font-black text-white glow-orange-sm active:scale-95 transition-all"
                                        >
                                            <Plus className="w-4 h-4" /> Onboard Restaurant
                                        </button>
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
                                                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/60">
                                            {filtered.map(res => (
                                                <tr key={res.id} className="group hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-4 px-4 font-bold text-white">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-orange-500 border border-gray-800">
                                                                <Building2 className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm">{res.name}</p>
                                                                <p className="text-[10px] text-gray-600 font-medium">@{res.subdomain}.scan4serve.com</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[8px] font-bold text-white uppercase italic">
                                                                {res.admin?.name?.slice(0, 2) || 'AD'}
                                                            </div>
                                                            <span className="text-xs text-gray-400 font-medium">{res.admin?.email}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                            res.isActive ? "bg-green-600/10 text-green-500 border border-green-500/20" : "bg-red-600/10 text-red-500 border border-red-500/20"
                                                        )}>
                                                            {res.isActive ? 'Operational' : 'Deactivated'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-tighter">{res.plan}</span>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => toggleStatus(res.id, res.isActive)}
                                                                className={cn(
                                                                    "p-2 rounded-lg transition-colors border",
                                                                    res.isActive ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white" : "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white"
                                                                )}
                                                            >
                                                                {res.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleEdit(res)}
                                                                className="p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <div className="relative">
                                                                <button
                                                                    onClick={() => setOpenDropdownId(openDropdownId === res.id ? null : res.id)}
                                                                    className="p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors relative z-10"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>

                                                                {openDropdownId === res.id && (
                                                                    <>
                                                                        <div
                                                                            className="fixed inset-0 z-10"
                                                                            onClick={() => setOpenDropdownId(null)}
                                                                        />
                                                                        <div className="absolute right-0 mt-2 w-48 bg-gray-950 border border-gray-800 rounded-lg shadow-xl overflow-hidden z-20">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setOpenDropdownId(null)
                                                                                    handleDelete(res.id)
                                                                                }}
                                                                                className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-gray-800 flex items-center gap-2 font-medium transition-colors"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                                Delete Restaurant
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
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

            {/* Onboard Modal */}
            {showOnboardModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-2xl p-8 fade-in shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white italic">{editingId ? 'EDIT RESTAURANT' : 'ONBOARD TENANT'}</h2>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                                    {editingId ? 'Modify existing platform tenant settings' : 'Register new restaurant to Scan4Serve SaaS'}
                                </p>
                            </div>
                            <button onClick={() => setShowOnboardModal(false)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleOnboard} className="space-y-6">
                            <div className="flex justify-center mb-8">
                                <div className="relative group">
                                    <div className="w-24 h-24 bg-gray-950 border-2 border-dashed border-gray-800 rounded-3xl overflow-hidden flex items-center justify-center text-gray-700 hover:border-orange-500/50 transition-colors">
                                        {formData.logoUrl ? (
                                            <img src={formData.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                                        ) : (
                                            <Camera className="w-8 h-8 opacity-50" />
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-2 -right-2 w-8 h-8 brand-gradient rounded-xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
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
                                                    setFormData({ ...formData, logoUrl: reader.result as string })
                                                }
                                                reader.readAsDataURL(file)
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest border-b border-orange-500/20 pb-2">Business Data</h3>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Restaurant Name</label>
                                        <input
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none"
                                            placeholder="The Fine Dining"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Subdomain</label>
                                        <div className="relative">
                                            <input
                                                required
                                                value={formData.subdomain}
                                                onChange={e => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none pr-32"
                                                placeholder="finedining"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-700">.scan4serve.com</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Business Email</label>
                                        <input
                                            required
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none"
                                            placeholder="info@restaurant.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-500/20 pb-2">Admin Account</h3>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Admin Name</label>
                                        <input
                                            required
                                            value={formData.adminName}
                                            onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Admin Email</label>
                                        <input
                                            required
                                            type="email"
                                            value={formData.adminEmail}
                                            onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none"
                                            placeholder="admin@restaurant.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">
                                            {editingId ? 'Reset Password (optional)' : 'Admin Password'}
                                        </label>
                                        <input
                                            required={!editingId}
                                            type="password"
                                            value={formData.adminPassword}
                                            onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none"
                                            placeholder={editingId ? 'Leave blank to keep current' : '••••••••'}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setShowOnboardModal(false)}
                                    className="px-6 py-3 rounded-xl text-xs font-black text-gray-500 hover:text-white transition-colors"
                                >
                                    CANCEL
                                </button>
                                <button
                                    disabled={onboarding}
                                    className="brand-gradient px-8 py-3 rounded-xl text-xs font-black text-white glow-orange-sm active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {onboarding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                                    {editingId ? 'UPDATE SETTINGS' : 'ONBOARD RESTAURANT'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
