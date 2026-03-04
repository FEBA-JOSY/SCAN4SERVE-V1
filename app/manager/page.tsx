'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import {
    LayoutDashboard, ChefHat, Table2, Users,
    BarChart3, Plus, Search, Edit2, Trash2,
    Download, Filter, TrendingUp, ShoppingBag,
    DollarSign, Clock, QrCode, Save, X,
    Loader2, ImageIcon, MoreVertical
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { User, Restaurant, MenuItem, Category, Table } from '@/types'

type ManagerTab = 'overview' | 'menu' | 'tables' | 'staff'

export default function ManagerDashboard() {
    const [profile, setProfile] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<ManagerTab>('overview')
    const [loading, setLoading] = useState(true)
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
            } else {
                router.push('/login')
            }
        } catch (e) {
            toast.error('Auth failed')
        } finally {
            setLoading(false)
        }
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'menu', label: 'Menu Management', icon: ChefHat },
        { id: 'tables', label: 'Tables & QR', icon: Table2 },
        { id: 'staff', label: 'Staff Management', icon: Users },
    ]

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar
                role={profile?.role || 'manager'}
                userName={profile?.name || 'Manager'}
                restaurantName={profile?.restaurant?.name}
            />

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 flex items-center justify-between px-8 border-b border-gray-800/60 glass z-20">
                    <h2 className="text-xl font-bold text-white tracking-tight">Manager Hub</h2>
                    <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-xl border border-gray-800">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as ManagerTab)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                                    activeTab === tab.id
                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && <OverviewTab restaurantId={profile?.restaurantId} />}
                            {activeTab === 'menu' && <MenuTab restaurantId={profile?.restaurantId} />}
                            {activeTab === 'tables' && <TablesTab restaurantId={profile?.restaurantId} />}
                            {activeTab === 'staff' && <StaffTab restaurantId={profile?.restaurantId} profile={profile} />}
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}

function OverviewTab({ restaurantId }: { restaurantId?: string }) {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (restaurantId) fetchAnalytics()
    }, [restaurantId])

    async function fetchAnalytics() {
        try {
            const res = await fetch(`/api/manager/analytics?restaurantId=${restaurantId}`)
            const json = await res.json()
            if (json.success) setStats(json.data)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return null

    const cards = [
        { label: 'Today Orders', value: stats?.totalOrders || 0, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Today Revenue', value: formatCurrency(stats?.revenueToday || 0), icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: 'Total Revenue', value: formatCurrency(stats?.totalRevenue || 0), icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        { label: 'Avg Order Value', value: formatCurrency(stats?.totalOrders ? (stats.revenueToday / stats.totalOrders) : 0), icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    ]

    return (
        <div className="space-y-8 fade-in">
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
                            const hourData = stats?.peakHours?.find((h: any) => h.hour === i)
                            const count = hourData?.count || 0
                            const maxCount = Math.max(...(stats?.peakHours?.map((h: any) => h.count) || [1]))
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
                        {stats?.bestSellers?.map((item: any, idx: number) => (
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
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)

    useEffect(() => {
        if (restaurantId) {
            fetchMenu()
            fetchCategories()
        }
    }, [restaurantId])

    async function fetchMenu() {
        const res = await fetch(`/api/manager/menu?restaurantId=${restaurantId}`)
        const json = await res.json()
        if (json.success) setItems(json.data)
        setLoading(false)
    }

    async function fetchCategories() {
        const res = await fetch(`/api/manager/categories?restaurantId=${restaurantId}`)
        const json = await res.json()
        if (json.success) setCategories(json.data)
    }

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
                    onClick={() => { setEditingItem(null); setModalOpen(true); }}
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
                                <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
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
                                    {(item as any).categories?.name}
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

function MenuModal({ restaurantId, categories, item, onClose }: { restaurantId: string; categories: Category[]; item?: any; onClose: () => void }) {
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        name: item?.name || '',
        price: item?.price || '',
        description: item?.description || '',
        categoryId: item?.categoryId || (categories[0]?.id || ''),
        isVeg: item?.isVeg ?? true,
        imageUrl: item?.imageUrl || '',
        prepTimeMinutes: item?.prepTimeMinutes || 15
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const method = item ? 'PATCH' : 'POST'
        const res = await fetch('/api/manager/menu', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, restaurantId: restaurantId, id: item?.id })
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
                            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50 appearance-none">
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Description</label>
                            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500/50" />
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
                    </div>

                    <button disabled={loading} className="w-full brand-gradient py-4 rounded-xl text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : item ? 'Update Dish' : 'Create Dish'}
                    </button>
                </form>
            </div>
        </div>
    )
}

function TablesTab({ restaurantId }: { restaurantId?: string }) {
    const [tables, setTables] = useState<Table[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (restaurantId) fetchTables()
    }, [restaurantId])

    async function fetchTables() {
        const res = await fetch(`/api/manager/tables?restaurantId=${restaurantId}`)
        const json = await res.json()
        if (json.success) setTables(json.data)
        setLoading(false)
    }

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
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => deleteTable(table.id)} className="p-1 text-gray-500 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                        </div>
                        <div className="w-full aspect-square brand-gradient rounded-2xl flex items-center justify-center mb-4 text-white relative">
                            <QrCode className="w-1/2 h-1/2" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer">
                                <Download className="w-6 h-6" />
                            </div>
                        </div>
                        <span className="text-xl font-black text-white">#{table.tableNumber}</span>
                        <button className="text-[8px] font-black text-orange-500 uppercase tracking-widest mt-1 hover:underline">Download QR</button>
                    </div>
                ))}
            </div>
        </div>
    )
}

function StaffTab({ restaurantId, profile }: { restaurantId?: string; profile: any }) {
    const [staff, setStaff] = useState<User[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (restaurantId) fetchStaff()
    }, [restaurantId])

    async function fetchStaff() {
        const res = await fetch(`/api/manager/staff?restaurantId=${restaurantId}`)
        const json = await res.json()
        if (json.success) setStaff(json.data)
        setLoading(false)
    }

    return (
        <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-white text-lg">Resource Staff</h3>
                    <p className="text-gray-500 text-xs">Manage kitchen and service personnel</p>
                </div>
                <button className="flex items-center gap-2 brand-gradient px-4 py-2 rounded-xl text-xs font-black text-white glow-orange-sm">
                    <Plus className="w-4 h-4" /> Register Staff
                </button>
            </div>

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
                            <button className="p-2 text-gray-500 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                            {member.id !== profile?.id && (
                                <button className="p-2 text-gray-500 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
