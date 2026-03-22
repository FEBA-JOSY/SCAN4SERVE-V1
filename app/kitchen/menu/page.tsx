'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import {
    ChefHat, Edit2, Trash2, Plus, X, Loader2, ImageIcon
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { User, MenuItem, Category } from '@/types'

export default function KitchenMenuPage() {
    const [profile, setProfile] = useState<User | null>(null)
    const [loadingAuth, setLoadingAuth] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(json => {
                if (json.success && json.data) {
                    setProfile(json.data)
                } else {
                    router.push('/login')
                }
            })
            .catch(() => toast.error('Auth failed'))
            .finally(() => setLoadingAuth(false))
    }, [router])

    if (loadingAuth) {
        return <div className="min-h-screen bg-gray-950 flex justify-center items-center"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
    }

    if (!profile) return null

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar
                role={profile.role || 'kitchen'}
                userName={profile.name || 'Chef'}
                restaurantName={profile.restaurant?.name}
            />
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 flex items-center px-8 border-b border-gray-800/60 glass z-20">
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <ChefHat className="w-5 h-5 text-orange-500" /> Kitchen Menu Management
                    </h2>
                </header>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {profile.restaurantId ? (
                        <MenuTab restaurantId={profile.restaurantId} />
                    ) : (
                        <p className="text-gray-500">No restaurant linked</p>
                    )}
                </div>
            </main>
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
            if (Array.isArray(json.data) && json.data.length === 0) {
                const defaults = ['Starters', 'Soups', 'Salads', 'Main Course', 'Sides', 'Desserts', 'Beverages', 'Specials']
                await fetch('/api/manager/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'seed', restaurantId, categories: defaults })
                })
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
        <div className="space-y-6 fade-in h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <h3 className="font-bold text-white text-lg">Menu Items ({items.length})</h3>
                <button
                    onClick={() => { setEditingItem(undefined); setModalOpen(true); }}
                    className="flex items-center gap-2 brand-gradient px-4 py-2 rounded-xl text-xs font-black text-white glow-orange-sm hover:scale-[1.02] transition-transform"
                >
                    <Plus className="w-4 h-4" /> Add New Dish
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 flex-1 pr-2">
                {items.map(item => (
                    <div key={item.id} className="glass-card group overflow-hidden border-gray-800/40 shrink-0">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
