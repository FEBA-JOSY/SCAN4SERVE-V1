'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import {
    LayoutDashboard, ChefHat, Table2, Users,
    BarChart3, Plus, Edit2, Trash2,
    Download, TrendingUp, ShoppingBag,
    DollarSign, QrCode, X,
    Loader2, ImageIcon, Share2, Clock,
    CheckCircle2, AlertCircle, FileText,
    Filter
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { User, MenuItem, Category, Table } from '@/types'
import mqtt from 'mqtt'

type ManagerTab = 'overview' | 'menu' | 'tables' | 'staff' | 'orders' | 'reports'

export default function ManagerDashboard({ initialTab = 'overview' }: { initialTab?: ManagerTab } = {}) {
    const [profile, setProfile] = useState<User | null>(null)
    const [activeTab, setActiveTab] = useState<ManagerTab>(initialTab)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me')
            const json = await res.json()
            if (json.success) {
                setProfile(json.data)
            } else {
                router.push('/login')
            }
        } catch {
            toast.error('Auth failed')
        } finally {
            setLoading(false)
        }
    }, [router])

    useEffect(() => {
        // if we landed on a deep route like /manager/menu set tab accordingly
        if (pathname && pathname.endsWith('/menu')) setActiveTab('menu')
        if (pathname && pathname.endsWith('/tables')) setActiveTab('tables')
        if (pathname && pathname.endsWith('/staff')) setActiveTab('staff')
        if (pathname && pathname.endsWith('/orders')) setActiveTab('orders')
        if (pathname && pathname.endsWith('/reports')) setActiveTab('reports')
    }, [pathname])

    useEffect(() => {
        fetchProfile()
    }, [fetchProfile])

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'menu', label: 'Menu Management', icon: ChefHat },
        { id: 'orders', label: 'Orders', icon: ShoppingBag },
        { id: 'tables', label: 'Tables & QR', icon: Table2 },
        { id: 'staff', label: 'Staff Management', icon: Users },
        { id: 'reports', label: 'Reports', icon: FileText },
    ]

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar
                role={profile?.role || 'manager'}
                userName={profile?.name || 'Manager'}
                restaurantName={profile?.name}
            />

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 flex items-center justify-between px-8 border-b border-gray-800/60 glass z-20">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-bold text-white tracking-tight">Manager Hub</h2>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && profile?.restaurantId && <OverviewTab restaurantId={profile.restaurantId} />}
                            {activeTab === 'menu' && profile?.restaurantId && <MenuTab restaurantId={profile.restaurantId} />}
                            {activeTab === 'orders' && profile?.restaurantId && <OrdersTab restaurantId={profile.restaurantId} />}
                            {activeTab === 'reports' && profile?.restaurantId && <ReportsTab restaurantId={profile.restaurantId} />}
                            {activeTab === 'tables' && profile?.restaurantId && <TablesTab restaurantId={profile.restaurantId} />}
                            {activeTab === 'staff' && profile?.restaurantId && profile && <StaffTab restaurantId={profile.restaurantId} profile={profile} />}
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}

interface AnalyticsData {
    totalOrders: number
    revenueToday: number
    totalRevenue: number
    peakHours: Array<{ hour: number; count: number }>
    bestSellers: Array<{ name: string; count: number; revenue: number }>
}

function OverviewTab({ restaurantId }: { restaurantId: string }) {
    const [stats, setStats] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    })

    const fetchAnalytics = useCallback(async () => {
        setLoading(true)
        try {
            const url = `/api/manager/analytics?restaurantId=${restaurantId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
            const res = await fetch(url)
            const json = await res.json()
            if (json.success) setStats(json.data)
        } finally {
            setLoading(false)
        }
    }, [restaurantId, dateRange])

    useEffect(() => {
        if (restaurantId) fetchAnalytics()
    }, [restaurantId, fetchAnalytics])

    if (loading && !stats) return <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>

    const cards = [
        { label: 'Orders in Period', value: stats?.totalOrders || 0, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Period Revenue', value: formatCurrency(stats?.revenueToday || 0), icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: 'All-Time Revenue', value: formatCurrency(stats?.totalRevenue || 0), icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        { label: 'Avg Order Value', value: formatCurrency(stats?.totalOrders ? (stats.revenueToday / stats.totalOrders) : 0), icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    ]

    return (
        <div className="space-y-8 fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-white italic tracking-tight">BUSINESS ANALYSIS</h3>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Real-time revenue & order statistics</p>
                </div>

                <div className="flex items-center gap-4 bg-gray-900/50 p-2 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 px-2">
                        <Filter className="w-3.5 h-3.5 text-gray-500" />
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={dateRange.startDate}
                                onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="bg-transparent border-none text-[10px] font-bold text-white focus:outline-none"
                            />
                            <span className="text-gray-700 font-bold">to</span>
                            <input
                                type="date"
                                value={dateRange.endDate}
                                onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="bg-transparent border-none text-[10px] font-bold text-white focus:outline-none"
                            />
                        </div>
                    </div>
                    <button
                        onClick={fetchAnalytics}
                        disabled={loading}
                        className="brand-gradient px-4 py-1.5 rounded-lg text-[10px] font-black text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-500/20 border-0"
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'APPLY FILTER'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map(card => (
                    <div key={card.label} className="glass-card p-6">
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
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-orange-500" />
                            Peak Hours Today
                        </h3>
                        <button className="text-[10px] font-bold text-gray-500 uppercase hover:text-white transition-colors">Download CSV</button>
                    </div>
                    {/* Simple Peak Hours Visualizer */}
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
                                            count > 0 ? "bg-orange-500/40 group-hover:bg-orange-500" : "bg-gray-800/40"
                                        )}
                                        style={{ height: `${height}%` }}
                                    >
                                        {count > 0 && (
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-[8px] font-bold text-white px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                {count}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[8px] text-gray-600 font-bold">{i}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                        <ChefHat className="w-5 h-5 text-orange-500" />
                        Best Sellers
                    </h3>
                    <div className="space-y-4">
                        {stats?.bestSellers?.map((item, idx) => (
                            <div key={item.name} className="flex items-center justify-between p-3 bg-gray-900/40 rounded-xl border border-gray-800/60">
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
    )
}

function MenuTab({ restaurantId }: { restaurantId?: string }) {
    const [items, setItems] = useState<MenuItem[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [modalOpen, setModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined)

    const fetchMenu = useCallback(async () => {
        if (!restaurantId) return
        const res = await fetch(`/api/manager/menu?restaurantId=${restaurantId}`)
        const json = await res.json()
        if (json.success) setItems(json.data)
    }, [restaurantId])

    const fetchCategories = useCallback(async () => {
        if (!restaurantId) return
        const res = await fetch(`/api/manager/categories?restaurantId=${restaurantId}`)
        const json = await res.json()
        if (json.success) {
            setCategories(json.data)
            // if no categories exist, seed defaults
            if (Array.isArray(json.data) && json.data.length === 0) {
                const defaults = ['Starters', 'Soups', 'Salads', 'Main Course', 'Sides', 'Desserts', 'Beverages', 'Specials']
                await fetch('/api/manager/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'seed', restaurantId, categories: defaults })
                })
                // refetch after seeding
                const r2 = await fetch(`/api/manager/categories?restaurantId=${restaurantId}`)
                const j2 = await r2.json()
                if (j2.success) setCategories(j2.data)
            }
        }
    }, [restaurantId])

    useEffect(() => {
        if (restaurantId) {
            Promise.resolve().then(() => fetchMenu())
            Promise.resolve().then(() => fetchCategories())
        }
    }, [restaurantId, fetchMenu, fetchCategories])

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this dish?')) return
        const res = await fetch(`/api/manager/menu?id=${id}`, { method: 'DELETE' })
        const json = await res.json()
        if (json.success) {
            toast.success('Dish vanished!')
            fetchMenu()
        }
    }

    async function toggleAvailability(item: MenuItem) {
        const res = await fetch('/api/manager/menu', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id, available: !item.available })
        })
        if (res.ok) fetchMenu()
    }

    return (
        <div className="space-y-6 fade-in">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-lg">Menu Items ({items.length})</h3>
                <button
                    onClick={() => { setEditingItem(undefined); setModalOpen(true); }}
                    className="flex items-center gap-2 brand-gradient px-4 py-2 rounded-xl text-xs font-black text-white glow-orange-sm hover:scale-[1.02] transition-transform"
                >
                    <Plus className="w-4 h-4" /> Add New Dish
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map(item => (
                    <div key={item.id} className="glass-card group overflow-hidden border-gray-800/40">
                        <div className="h-40 bg-gray-900 relative overflow-hidden">
                            {item.imageUrl ? (
                                <Image src={item.imageUrl} alt={item.name} fill className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-800">
                                    <ImageIcon className="w-12 h-12" />
                                </div>
                            )}
                            <div className="absolute top-3 left-3 flex gap-2">
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                    item.isVeg ? "bg-green-600 text-white" : "bg-red-600 text-white"
                                )}>
                                    {item.isVeg ? 'Veg' : 'Non-Veg'}
                                </span>
                                <span className="bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white">
                                    {item.category?.name}
                                </span>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">{item.name}</h4>
                                <span className="text-orange-500 font-black text-sm">{formatCurrency(item.price)}</span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 h-8 leading-relaxed mb-4">{item.description}</p>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleAvailability(item)}
                                        className={cn(
                                            "text-[10px] font-bold px-2 py-1 rounded-md transition-all",
                                            item.available ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                        )}
                                    >
                                        {item.available ? 'In Stock' : 'Out of Stock'}
                                    </button>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => { setEditingItem(item); setModalOpen(true); }}
                                        className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg"
                                    ><Edit2 className="w-4 h-4" /></button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                                    ><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {modalOpen && (
                <MenuModal
                    restaurantId={restaurantId!}
                    categories={categories}
                    item={editingItem}
                    onClose={() => { setModalOpen(false); fetchMenu(); }}
                />
            )}
        </div>
    )
}

function MenuModal({ restaurantId, categories, item, onClose }: { restaurantId: string; categories: Category[]; item?: MenuItem; onClose: () => void }) {
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        name: item?.name || '',
        price: item?.price || '',
        description: item?.description || '',
        categoryId: item?.categoryId || (categories.length > 0 ? categories[0].id : ''),
        isVeg: item?.isVeg ?? true,
        imageUrl: item?.imageUrl || '',
        prepTimeMinutes: item?.prepTimeMinutes || 15,
        available: item?.available ?? true
    })

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setForm({ ...form, imageUrl: reader.result as string })
            }
            reader.readAsDataURL(file)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const method = item ? 'PATCH' : 'POST'
        const payload: Record<string, unknown> = {
            restaurant_id: restaurantId,
            name: form.name,
            description: form.description,
            price: form.price,
            category_id: form.categoryId,
            image_url: form.imageUrl,
            is_veg: form.isVeg,
            prep_time_minutes: form.prepTimeMinutes,
            available: form.available
        }
        if (item?.id) payload.id = item.id

        const res = await fetch('/api/manager/menu', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (res.ok) {
            toast.success(item ? 'Dish updated!' : 'New dish added!')
            onClose()
        } else {
            toast.error('Operation failed')
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-xl glass-card p-8 bg-gray-900 border-orange-500/20 shadow-2xl slide-in">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-white tracking-tight">{item ? 'Update Dish' : 'Create New Dish'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Dish Name</label>
                            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Price (₹)</label>
                            <input type="number" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Category</label>
                            <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50 appearance-none">
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Description</label>
                            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Dish Image (URL or Upload)</label>
                            <div className="flex gap-4 items-center">
                                {form.imageUrl && (
                                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-800 relative bg-gray-900">
                                        <Image src={form.imageUrl} alt="Preview" fill className="object-cover" />
                                    </div>
                                )}
                                <div className="flex-1 space-y-2">
                                    <input type="url" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="Paste Image URL..." className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-gray-500 text-[10px] font-bold uppercase">OR</span>
                                        <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-colors inline-block">
                                            Select image from files
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Type</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, isVeg: true })}
                                    className={cn("flex-1 py-3 rounded-xl border text-[10px] font-black uppercase transition-all", form.isVeg ? "bg-green-600/10 border-green-600 text-green-500" : "bg-gray-800 border-gray-800 text-gray-600")}
                                >Veg</button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, isVeg: false })}
                                    className={cn("flex-1 py-3 rounded-xl border text-[10px] font-black uppercase transition-all", !form.isVeg ? "bg-red-600/10 border-red-600 text-red-500" : "bg-gray-800 border-gray-800 text-gray-600")}
                                >Non-Veg</button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Prep Time (mins)</label>
                            <input type="number" value={form.prepTimeMinutes} onChange={e => setForm({ ...form, prepTimeMinutes: parseInt(e.target.value) })} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Availability</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, available: true })}
                                    className={cn("flex-1 py-3 rounded-xl border text-[10px] font-black uppercase transition-all", form.available ? "bg-green-600/10 border-green-600 text-green-500" : "bg-gray-800 border-gray-800 text-gray-600")}
                                >In Stock</button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, available: false })}
                                    className={cn("flex-1 py-3 rounded-xl border text-[10px] font-black uppercase transition-all", !form.available ? "bg-red-600/10 border-red-600 text-red-500" : "bg-gray-800 border-gray-800 text-gray-600")}
                                >Out of Stock</button>
                            </div>
                        </div>
                    </div>

                    <button disabled={loading} className="w-full brand-gradient py-4 rounded-xl text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : item ? 'Update Dish' : 'Create Dish'}
                    </button>
                </form>
            </div>
        </div>
    )
}

function ReportsTab({ restaurantId }: { restaurantId?: string }) {
    interface TopItem {
        name: string;
        count: number;
        revenue: number;
    }
    interface ReportData {
        totalOrders: number;
        totalRevenue: number;
        avgOrderValue: number;
        totalItemsSold: number;
        topItems: TopItem[];
    }
    const [reportData, setReportData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        endDate: new Date().toISOString().split('T')[0]
    })

    const fetchReports = useCallback(async () => {
        if (!restaurantId) return
        setLoading(true)
        try {
            const res = await fetch(
                `/api/manager/reports?restaurantId=${restaurantId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
            )
            const json = await res.json()
            if (json.success) {
                setReportData(json.data)
            }
        } catch (e) {
            toast.error('Failed to fetch reports')
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [restaurantId, dateRange])

    useEffect(() => {
        if (restaurantId) fetchReports()
    }, [restaurantId, fetchReports])

    const handleExport = () => {
        if (!reportData) return
        const csv = [
            ['Date Range', `${dateRange.startDate} to ${dateRange.endDate}`],
            [],
            ['Metric', 'Value'],
            ['Total Orders', reportData.totalOrders],
            ['Total Revenue', formatCurrency(reportData.totalRevenue)],
            ['Average Order Value', formatCurrency(reportData.avgOrderValue)],
            ['Total Items Sold', reportData.totalItemsSold],
            [],
            ['Top Items', 'Quantity', 'Revenue'],
            ...reportData.topItems.map((item: TopItem) => [item.name, item.count, formatCurrency(item.revenue)])
        ]
            .map((row: (string | number)[]) => row.map((cell: string | number) => `"${cell}"`).join(','))
            .join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `report-${dateRange.startDate}-${dateRange.endDate}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success('Report exported!')
    }

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
    }

    return (
        <div className="space-y-6 fade-in">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h3 className="font-bold text-white text-lg mb-2">Business Reports</h3>
                    <p className="text-gray-500 text-xs">Analyze your restaurant's performance</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 brand-gradient px-4 py-2 rounded-xl text-xs font-black text-white glow-orange-sm"
                >
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            <div className="glass-card p-4 border border-gray-800/40 flex gap-4">
                <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Start Date</label>
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        className="w-full bg-gray-950/50 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">End Date</label>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        className="w-full bg-gray-950/50 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={fetchReports}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-white text-xs font-bold transition-all"
                    >
                        <Filter className="w-4 h-4" /> Apply
                    </button>
                </div>
            </div>

            {reportData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Orders</p>
                            <ShoppingBag className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-2xl font-bold text-white">{reportData.totalOrders}</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Revenue</p>
                            <DollarSign className="w-5 h-5 text-green-400" />
                        </div>
                        <p className="text-2xl font-bold text-white">{formatCurrency(reportData.totalRevenue)}</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Avg Order Value</p>
                            <BarChart3 className="w-5 h-5 text-orange-400" />
                        </div>
                        <p className="text-2xl font-bold text-white">{formatCurrency(reportData.avgOrderValue)}</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Items Sold</p>
                            <TrendingUp className="w-5 h-5 text-purple-400" />
                        </div>
                        <p className="text-2xl font-bold text-white">{reportData.totalItemsSold}</p>
                    </div>
                </div>
            ) : null}

            {reportData?.topItems && reportData.topItems.length > 0 && (
                <div className="glass-card p-6 border border-gray-800/40">
                    <h4 className="font-bold text-white mb-4">Top Selling Items</h4>
                    <div className="space-y-3">
                        {reportData.topItems.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800/30">
                                <div>
                                    <p className="font-bold text-white">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.count} sold</p>
                                </div>
                                <p className="font-bold text-orange-400">{formatCurrency(item.revenue)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

interface OrderData {
    id: string
    tableNumber: number
    items: Array<{ name: string; quantity: number; price: number }>
    totalAmount: string | number
    status: string
    paymentStatus: string
    createdAt: string
}

function OrdersTab({ restaurantId }: { restaurantId?: string }) {
    const [orders, setOrders] = useState<OrderData[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'placed' | 'preparing' | 'ready' | 'served' | 'completed'>('all')
    const [dateRange, setDateRange] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    })

    const fetchOrders = useCallback(async () => {
        if (!restaurantId) return
        setLoading(true)
        try {
            let url = `/api/manager/orders?restaurantId=${restaurantId}`
            if (dateRange.startDate && dateRange.endDate) {
                // To get full day, we normalize dates
                url += `&startDate=${dateRange.startDate}T00:00:00.000Z&endDate=${dateRange.endDate}T23:59:59.999Z`
            }
            const res = await fetch(url)
            const json = await res.json()
            if (json.success) {
                setOrders(json.data || [])
            }
        } catch (e) {
            toast.error('Failed to fetch orders')
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [restaurantId, dateRange])

    useEffect(() => {
        if (restaurantId) fetchOrders()
        
        // --- MQTT Real-time Updates ---
        const client = mqtt.connect('wss://y12dbb61.ala.asia-southeast1.emqxsl.com:8084/mqtt', {
            username: 'table_T01',
            password: 'scan4serve',
            clientId: 'manager_' + Math.random().toString(16).substring(2, 10)
        });

        client.on('connect', () => {
            console.log("✅ Manager MQTT Connected");
            client.subscribe('restaurant/snmimt/#');
        });

        client.on('error', (err) => {
            console.log("⚠️ Manager MQTT Error:", err);
        });

        client.on('message', (topic, message) => {
            try {
                const data = JSON.parse(message.toString());
                if (data.type === "ORDER_PLACED" || data.type === "ORDER") {
                    console.log("New order detected via MQTT, refetching...");
                    fetchOrders();
                }
            } catch (e) {
                console.error("MQTT parse error", e);
            }
        });

        // Still keep a longer polling interval as a fallback
        const interval = setInterval(() => fetchOrders(), 30000) 
        
        return () => {
            client.end();
            clearInterval(interval);
        }
    }, [restaurantId, fetchOrders])

    const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/manager/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                toast.success('Order status updated')
                fetchOrders()
            } else {
                toast.error('Failed to update order')
            }
        } catch (e) {
            toast.error('Error updating order')
            console.error(e)
        }
    }, [fetchOrders])

    const filteredOrders = filter === 'all'
        ? orders
        : orders.filter(o => o.status === filter)

    const totalRevenue = filteredOrders.reduce((sum, order) => {
        if (order.paymentStatus === 'paid' && order.status !== 'cancelled') {
            return sum + (typeof order.totalAmount === 'number' ? order.totalAmount : Number(order.totalAmount))
        }
        return sum
    }, 0)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'placed': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            case 'preparing': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
            case 'ready': return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
            case 'served': return 'bg-green-500/10 text-green-400 border-green-500/30'
            case 'completed': return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'placed': return <Clock className="w-4 h-4" />
            case 'preparing': return <Clock className="w-4 h-4" />
            case 'ready': return <AlertCircle className="w-4 h-4" />
            case 'served': return <CheckCircle2 className="w-4 h-4" />
            case 'completed': return <CheckCircle2 className="w-4 h-4" />
            default: return <Clock className="w-4 h-4" />
        }
    }

    const statusOptions = ['placed', 'preparing', 'ready', 'served', 'completed']

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
    }

    return (
        <div className="space-y-6 fade-in">
            <div>
                <h3 className="font-bold text-white text-lg mb-4">Restaurant Orders</h3>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-2 flex-wrap">
                        {(['all', 'placed', 'preparing', 'ready', 'served', 'completed'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all",
                                    filter === status
                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                        : "bg-gray-800/50 text-gray-400 hover:text-gray-300"
                                )}
                            >
                                {status === 'all' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded-xl border border-gray-800">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Period:</span>
                            <input
                                type="date"
                                value={dateRange.startDate}
                                onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="bg-transparent border-none text-[10px] font-bold text-white focus:outline-none"
                            />
                            <span className="text-gray-700">-</span>
                            <input
                                type="date"
                                value={dateRange.endDate}
                                onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="bg-transparent border-none text-[10px] font-bold text-white focus:outline-none"
                            />
                            <button
                                onClick={fetchOrders}
                                className="p-1 px-2 bg-orange-500 hover:bg-orange-600 rounded text-[8px] font-black text-white uppercase tracking-widest transition-colors"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {dateRange.startDate && dateRange.endDate && (
                    <div className="glass-card p-4 border border-orange-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Selected Period Revenue</p>
                                <p className="text-xl font-black text-white">{formatCurrency(totalRevenue)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{filteredOrders.length} Orders</p>
                            <p className="text-xs font-bold text-orange-500 opacity-80 italic">Success Rate: {Math.round((filteredOrders.filter(o => o.status === 'completed' || o.status === 'served').length / (filteredOrders.length || 1)) * 100)}%</p>
                        </div>
                    </div>
                )}
            </div>

            {filteredOrders.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <ShoppingBag className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500">No {filter === 'all' ? '' : filter} orders yet</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredOrders.map(order => (
                        <div key={order.id} className="glass-card p-4 border border-gray-800/40 hover:border-orange-500/20 transition-all">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-bold text-white">Table {order.tableNumber}</h4>
                                        <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1", getStatusColor(order.status))}>
                                            {getStatusIcon(order.status)}
                                            {order.status}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                            {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="ml-0">
                                        <p className="text-xs text-gray-400 mb-2">
                                            {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-orange-400">
                                                {formatCurrency(Number(order.totalAmount))}
                                            </span>
                                            <span className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded-lg",
                                                order.paymentStatus === 'paid'
                                                    ? 'bg-green-500/10 text-green-400'
                                                    : 'bg-red-500/10 text-red-400'
                                            )}>
                                                Payment: {order.paymentStatus}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <select
                                    value={order.status}
                                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                    className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-xs font-bold text-white cursor-pointer hover:border-orange-500/50 focus:border-orange-500"
                                >
                                    {statusOptions.map(status => (
                                        <option key={status} value={status}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function TablesTab({ restaurantId }: { restaurantId?: string }) {
    const [tables, setTables] = useState<Table[]>([])

    const fetchTables = useCallback(async () => {
        if (!restaurantId) return
        const res = await fetch(`/api/manager/tables?restaurantId=${restaurantId}`)
        const json = await res.json()
        if (json.success) setTables(json.data)
    }, [restaurantId])

    async function addTable() {
        const lastNum = tables.length > 0 ? tables[tables.length - 1].tableNumber : 0
        const res = await fetch('/api/manager/tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurantId: restaurantId, tableNumber: lastNum + 1 })
        })
        if (res.ok) {
            toast.success('New table ready for guests!')
            fetchTables()
        }
    }

    async function deleteTable(id: string) {
        if (!confirm('Trash this table and its QR?')) return
        const res = await fetch(`/api/manager/tables?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
            toast.success('Table removed')
            fetchTables()
        }
    }

    function shareQRLink(table: typeof tables[0]) {
        const text = `Join us at Table #${table.tableNumber}: ${table.qrCodeUrl}`
        if (navigator.share) {
            navigator.share({ title: 'Scan4Serve Menu', text, url: table.qrCodeUrl })
        } else {
            navigator.clipboard.writeText(table.qrCodeUrl!)
            toast.success('Link copied to clipboard!')
        }
    }

    useEffect(() => {
        if (restaurantId) {
            Promise.resolve().then(() => fetchTables())
        }
    }, [restaurantId, fetchTables])

    return (
        <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-white text-lg">Order Points</h3>
                    <p className="text-gray-500 text-xs">Generate QR codes for seating areas</p>
                </div>
                <button
                    onClick={addTable}
                    className="flex items-center gap-2 brand-gradient px-4 py-2 rounded-xl text-xs font-black text-white glow-orange-sm transition-transform active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Add Table
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {tables.map(table => (
                    <div key={table.id} className="glass-card p-4 flex flex-col items-center group relative">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-x-1 flex">
                            <button onClick={() => shareQRLink(table)} className="p-1 text-gray-500 hover:text-blue-500" title="Share link"><Share2 className="w-3 h-3" /></button>
                            <button onClick={() => deleteTable(table.id)} className="p-1 text-gray-500 hover:text-red-500" title="Delete table"><Trash2 className="w-3 h-3" /></button>
                        </div>
                        <div className="w-full aspect-square brand-gradient rounded-2xl flex items-center justify-center mb-4 text-white">
                            <QrCode className="w-1/2 h-1/2" />
                        </div>
                        <span className="text-xl font-black text-white">#{table.tableNumber}</span>
                        <button onClick={() => shareQRLink(table)} className="text-[8px] font-black text-orange-500 uppercase tracking-widest mt-1 hover:underline">Share Link</button>
                    </div>
                ))}
            </div>
        </div>
    )
}

function StaffTab({ restaurantId, profile }: { restaurantId?: string; profile: User }) {
    const [staff, setStaff] = useState<User[]>([])
    const [showRegister, setShowRegister] = useState(false)
    const [registerForm, setRegisterForm] = useState({
        name: '',
        email: '',
        role: 'waiter',
        password: ''
    })
    const [registerLoading, setRegisterLoading] = useState(false)
    const [editStaff, setEditStaff] = useState<User | null>(null)
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        role: 'waiter',
        password: ''
    })
    const [editLoading, setEditLoading] = useState(false)

    const fetchStaff = useCallback(async () => {
        if (!restaurantId) return
        const res = await fetch(`/api/manager/staff?restaurantId=${restaurantId}`)
        const json = await res.json()
        if (json.success) setStaff(json.data)
    }, [restaurantId])

    useEffect(() => {
        if (restaurantId) {
            Promise.resolve().then(() => fetchStaff())
        }
    }, [restaurantId, fetchStaff])

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault()
        setRegisterLoading(true)
        const res = await fetch('/api/manager/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...registerForm,
                restaurantId
            })
        })
        const json = await res.json()
        setRegisterLoading(false)
        if (json.success) {
            toast.success('Staff registered!')
            setShowRegister(false)
            setRegisterForm({ name: '', email: '', role: 'waiter', password: '' })
            fetchStaff()
        } else {
            toast.error(json.message || 'Registration failed')
        }
    }

    async function handleEdit(e: React.FormEvent) {
        e.preventDefault()
        if (!editStaff) return
        setEditLoading(true)
        const res = await fetch('/api/manager/staff', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editStaff.id,
                name: editForm.name,
                email: editForm.email,
                role: editForm.role,
                password: editForm.password || undefined
            })
        })
        const json = await res.json()
        setEditLoading(false)
        if (json.success) {
            toast.success('Staff updated!')
            setEditStaff(null)
            setEditForm({ name: '', email: '', role: 'waiter', password: '' })
            fetchStaff()
        } else {
            toast.error(json.message || 'Update failed')
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this staff member?')) return
        const res = await fetch(`/api/manager/staff?id=${id}`, { method: 'DELETE' })
        const json = await res.json()
        if (json.success) {
            toast.success('Staff deleted!')
            fetchStaff()
        } else {
            toast.error(json.message || 'Delete failed')
        }
    }

    return (
        <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-white text-lg">Resource Staff</h3>
                    <p className="text-gray-500 text-xs">Manage kitchen and service personnel</p>
                </div>
                <button
                    className="flex items-center gap-2 brand-gradient px-4 py-2 rounded-xl text-xs font-black text-white glow-orange-sm"
                    onClick={() => setShowRegister(true)}
                >
                    <Plus className="w-4 h-4" /> Register Staff
                </button>
            </div>

            {showRegister && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRegister(false)} />
                    <div className="relative w-full max-w-md glass-card p-8 bg-gray-900 border-orange-500/20 shadow-2xl slide-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Register Staff</h3>
                            <button onClick={() => setShowRegister(false)} className="p-2 hover:bg-gray-800 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Name</label>
                                <input required value={registerForm.name} onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Email</label>
                                <input required type="email" value={registerForm.email} onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Role</label>
                                <select value={registerForm.role} onChange={e => setRegisterForm(f => ({ ...f, role: e.target.value }))} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50">
                                    <option value="waiter">Waiter</option>
                                    <option value="kitchen">Kitchen</option>
                                    <option value="manager">Manager</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Password</label>
                                <input required type="password" value={registerForm.password} onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                            </div>
                            <button disabled={registerLoading} className="w-full brand-gradient py-3 rounded-xl text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                                {registerLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Register'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.map(member => (
                    <div key={member.id} className="glass-card p-4 flex items-center gap-4 border-gray-800/40">
                        <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate">{member.name}</p>
                            <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest">{member.role}</p>
                            <p className="text-[10px] text-gray-600 truncate">{member.email}</p>
                        </div>
                        <div className="flex gap-1">
                            <button
                                className="p-2 text-gray-500 hover:text-white"
                                onClick={() => {
                                    setEditStaff(member)
                                    setEditForm({
                                        name: member.name,
                                        email: member.email,
                                        role: member.role,
                                        password: ''
                                    })
                                }}
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {member.id !== profile?.id && (
                                <button
                                    className="p-2 text-gray-500 hover:text-red-500"
                                    onClick={() => handleDelete(member.id)}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {editStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditStaff(null)} />
                    <div className="relative w-full max-w-md glass-card p-8 bg-gray-900 border-orange-500/20 shadow-2xl slide-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Edit Staff</h3>
                            <button onClick={() => setEditStaff(null)} className="p-2 hover:bg-gray-800 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleEdit} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Name</label>
                                <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Email</label>
                                <input required type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Role</label>
                                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50">
                                    <option value="waiter">Waiter</option>
                                    <option value="kitchen">Kitchen</option>
                                    <option value="manager">Manager</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Password (leave blank to keep unchanged)</label>
                                <input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
                            </div>
                            <button disabled={editLoading} className="w-full brand-gradient py-3 rounded-xl text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                                {editLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Update'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
