'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { toast } from 'sonner'
import {
    Users, Search, Plus, Edit2, Trash2, Loader2,
    CheckCircle2, XCircle, Mail, Shield, Clock,
    MoreVertical, X, BadgeCheck, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '@/types'

export default function AdminStaffPage() {
    const [profile, setProfile] = useState<User | null>(null)
    const [staff, setStaff] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [adding, setAdding] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'waiter',
        password: '',
    })
    const router = useRouter()
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
    const [editStaff, setEditStaff] = useState<User | null>(null)
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        role: 'waiter',
        password: ''
    })
    const [editLoading, setEditLoading] = useState(false)

    useEffect(() => {
        fetchProfile()
    }, [])

    async function fetchProfile() {
        try {
            const res = await fetch('/api/auth/me')
            const json = await res.json()
            if (json.success && json.data.role === 'admin') {
                setProfile(json.data)
                fetchStaff()
            } else {
                router.push('/login')
            }
        } catch (e) {
            toast.error('Auth failed')
        }
    }

    async function fetchStaff() {
        try {
            const res = await fetch('/api/admin/staff')
            const json = await res.json()
            if (json.success) {
                setStaff(json.data)
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleAddStaff(e: React.FormEvent) {
        e.preventDefault()
        setAdding(true)
        try {
            const res = await fetch('/api/admin/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const json = await res.json()
            if (json.success) {
                toast.success('Staff member added successfully!')
                setShowAddModal(false)
                fetchStaff()
                setFormData({
                    name: '',
                    email: '',
                    role: 'waiter',
                    password: '',
                })
            } else {
                toast.error(json.message || 'Failed to add staff')
            }
        } catch (e) {
            toast.error('Network error')
        } finally {
            setAdding(false)
        }
    }

    async function toggleStaffStatus(id: string, currentStatus: boolean) {
        try {
            const res = await fetch('/api/admin/staff', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: !currentStatus })
            })
            const json = await res.json()
            if (json.success) {
                toast.success(currentStatus ? 'Staff deactivated' : 'Staff activated!')
                fetchStaff()
            }
        } catch (e) {
            toast.error('Status update failed')
        }
    }

    async function handleEditStaff(e: React.FormEvent) {
        e.preventDefault()
        if (!editStaff) return
        setEditLoading(true)
        try {
            const res = await fetch('/api/admin/staff', {
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
            if (json.success) {
                toast.success('Staff updated!')
                setEditStaff(null)
                setEditForm({ name: '', email: '', role: 'waiter', password: '' })
                fetchStaff()
            } else {
                toast.error(json.message || 'Update failed')
            }
        } catch (e) {
            toast.error('Network error')
        } finally {
            setEditLoading(false)
        }
    }

    async function handleDeleteStaff(id: string) {
        if (!confirm('Are you sure you want to delete this staff member?')) return
        try {
            const res = await fetch(`/api/admin/staff?id=${id}`, { method: 'DELETE' })
            const json = await res.json()
            if (json.success) {
                toast.success('Staff deleted!')
                fetchStaff()
            } else {
                toast.error(json.message || 'Delete failed')
            }
        } catch (e) {
            toast.error('Network error')
        }
    }

    const filtered = staff.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const roleColors: Record<string, string> = {
        manager: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        submanager: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        kitchen: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        waiter: 'bg-green-500/10 text-green-500 border-green-500/20',
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
                        <Users className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-bold text-white tracking-tight">Staff Management</h2>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="max-w-6xl mx-auto space-y-6 fade-in">
                            <div className="glass-card p-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                    <div>
                                        <h3 className="text-xl font-black text-white">Team Members</h3>
                                        <p className="text-xs text-gray-500 font-medium mt-1">Manage your restaurant staff and team</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                            <input
                                                placeholder="Search staff..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-orange-500/30 w-64"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="flex items-center gap-2 brand-gradient px-6 py-2.5 rounded-xl text-xs font-black text-white glow-orange-sm active:scale-95 transition-all"
                                        >
                                            <Plus className="w-4 h-4" /> Add Staff
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-gray-800">
                                                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-4">Name</th>
                                                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-4">Email</th>
                                                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-4">Role</th>
                                                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-4">Status</th>
                                                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-4">Added</th>
                                                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/60">
                                            {filtered.length > 0 ? (
                                                filtered.map(member => (
                                                    <tr key={member.id} className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-4 px-4 font-bold text-white">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-orange-500 border border-gray-800">
                                                                    {member.name.slice(0, 2).toUpperCase()}
                                                                </div>
                                                                <span className="text-sm">{member.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 text-xs text-gray-400 font-medium">{member.email}</td>
                                                        <td className="py-4 px-4">
                                                            <span className={cn(
                                                                "px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                                                roleColors[member.role] || roleColors.waiter
                                                            )}>
                                                                {member.role}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <span className={cn(
                                                                "px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                                member.isActive ? "bg-green-600/10 text-green-500 border border-green-500/20" : "bg-red-600/10 text-red-500 border border-red-500/20"
                                                            )}>
                                                                {member.isActive ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4 text-[10px] text-gray-500">
                                                            {new Date(member.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-4 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-2 relative">
                                                                <button
                                                                    onClick={() => toggleStaffStatus(member.id, member.isActive)}
                                                                    className={cn(
                                                                        "p-2 rounded-lg transition-colors border",
                                                                        member.isActive ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white" : "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white"
                                                                    )}
                                                                >
                                                                    {member.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                                </button>
                                                                <button
                                                                    onClick={() => setActionMenuOpen(actionMenuOpen === member.id ? null : member.id)}
                                                                    className="p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            {actionMenuOpen === member.id && (
                                                                <div className="absolute right-0 top-10 z-50 bg-gray-900 border border-gray-800 rounded-lg shadow-lg w-32">
                                                                    <button
                                                                        className="w-full px-4 py-2 text-left text-xs text-white hover:bg-gray-800"
                                                                        onClick={() => {
                                                                            setEditStaff(member)
                                                                            setEditForm({
                                                                                name: member.name,
                                                                                email: member.email,
                                                                                role: member.role,
                                                                                password: ''
                                                                            })
                                                                            setActionMenuOpen(null)
                                                                        }}
                                                                    >Edit</button>
                                                                    <button
                                                                        className="w-full px-4 py-2 text-left text-xs text-red-500 hover:bg-gray-800"
                                                                        onClick={() => {
                                                                            setActionMenuOpen(null)
                                                                            handleDeleteStaff(member.id)
                                                                        }}
                                                                    >Delete</button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="py-12 px-4 text-center">
                                                        <p className="text-gray-500 text-sm">No staff members found</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-lg p-8 fade-in shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white italic">ADD STAFF MEMBER</h2>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Register new team member</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleAddStaff} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Full Name</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none"
                                    placeholder="john@restaurant.com"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Password</label>
                                <input
                                    required
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Role</label>
                                <select
                                    required
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none"
                                >
                                    <option value="waiter">Waiter</option>
                                    <option value="kitchen">Kitchen Staff</option>
                                    <option value="manager">Manager</option>
                                    <option value="submanager">Sub Manager</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-6 py-3 rounded-xl text-xs font-black text-gray-500 hover:text-white transition-colors"
                                >
                                    CANCEL
                                </button>
                                <button
                                    disabled={adding}
                                    className="brand-gradient px-8 py-3 rounded-xl text-xs font-black text-white glow-orange-sm active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                                    ADD STAFF
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Staff Modal */}
            {editStaff && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-lg p-8 fade-in shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white italic">EDIT STAFF MEMBER</h2>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Update team member details</p>
                            </div>
                            <button onClick={() => setEditStaff(null)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleEditStaff} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Full Name</label>
                                <input
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Email Address</label>
                                <input
                                    value={editForm.email}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none"
                                    placeholder="john@restaurant.com"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Password (leave blank to keep unchanged)</label>
                                <input
                                    type="password"
                                    value={editForm.password}
                                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Role</label>
                                <select
                                    value={editForm.role}
                                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none"
                                >
                                    <option value="waiter">Waiter</option>
                                    <option value="kitchen">Kitchen Staff</option>
                                    <option value="manager">Manager</option>
                                    <option value="submanager">Sub Manager</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setEditStaff(null)}
                                    className="px-6 py-3 rounded-xl text-xs font-black text-gray-500 hover:text-white transition-colors"
                                >
                                    CANCEL
                                </button>
                                <button
                                    disabled={editLoading}
                                    className="brand-gradient px-8 py-3 rounded-xl text-xs font-black text-white glow-orange-sm active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                                    UPDATE STAFF
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
