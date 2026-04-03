'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
    UtensilsCrossed, LayoutDashboard, ChefHat, Users, ShoppingBag,
    BarChart3, Table2, Settings, LogOut, Building2, Bell, Wallet,
    ClipboardList, ScrollText, History, Menu, X
} from 'lucide-react'
import type { UserRole } from '@/types'

const ROLE_NAV: Record<UserRole, { label: string; href: string; icon: React.ElementType }[]> = {
    superadmin: [
        { label: 'Dashboard', href: '/superadmin', icon: LayoutDashboard },
        { label: 'Restaurants', href: '/superadmin/restaurants', icon: Building2 },
        { label: 'Subscriptions', href: '/superadmin/subscriptions', icon: Wallet },
        { label: 'Analytics', href: '/superadmin/analytics', icon: BarChart3 },
        { label: 'Audit Logs', href: '/superadmin/audit', icon: ScrollText },
    ],
    admin: [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { label: 'Staff', href: '/admin/staff', icon: Users },
        { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
    manager: [
        { label: 'Dashboard', href: '/manager', icon: LayoutDashboard },
        { label: 'Orders', href: '/manager/orders', icon: ShoppingBag },
        { label: 'Menu', href: '/manager/menu', icon: ChefHat },
        { label: 'Tables & QR', href: '/manager/tables', icon: Table2 },
        { label: 'Staff', href: '/manager/staff', icon: Users },
        { label: 'Reports', href: '/manager/reports', icon: BarChart3 },
    ],
    submanager: [
        { label: 'Dashboard', href: '/manager', icon: LayoutDashboard },
        { label: 'Orders', href: '/manager/orders', icon: ShoppingBag },
        { label: 'Staff', href: '/manager/staff', icon: Users },
    ],
    kitchen: [
        { label: 'Order Queue', href: '/kitchen', icon: ClipboardList },
        { label: 'Menu', href: '/kitchen/menu', icon: ChefHat },
        { label: 'Notifications', href: '/kitchen/notifications', icon: Bell },
        { label: 'Order History', href: '/kitchen/history', icon: History },
    ],
    waiter: [
        { label: 'Tables', href: '/waiter', icon: Table2 },
        { label: 'Notifications', href: '/waiter/notifications', icon: Bell },
    ],
}

interface SidebarProps {
    role: UserRole
    userName: string
    restaurantName?: string
}

export function Sidebar({ role, userName, restaurantName }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)

    const navItems = ROLE_NAV[role] ?? []

    async function handleLogout() {
        await signOut({ redirect: false })
        toast.success('Signed out successfully')
        router.push('/login')
    }

    const roleLabels: Record<UserRole, string> = {
        superadmin: 'Super Admin',
        admin: 'Restaurant Admin',
        manager: 'Manager',
        submanager: 'Sub-Manager',
        kitchen: 'Kitchen Staff',
        waiter: 'Waiter',
    }

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="md:hidden fixed top-3 left-4 z-50 p-2 bg-gray-900 border border-gray-800 rounded-xl text-white shadow-xl"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={cn(
                "fixed md:static inset-y-0 left-0 z-50 flex flex-col w-64 min-h-screen bg-gray-900/95 md:bg-gray-900/50 border-r border-gray-800/60 backdrop-blur-xl md:backdrop-blur-sm transition-transform duration-300",
                isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                {/* Logo */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 brand-gradient rounded-xl flex items-center justify-center glow-orange-sm flex-shrink-0">
                            <UtensilsCrossed className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-white text-sm leading-none">Scan4Serve</p>
                            {restaurantName && (
                                <p className="text-gray-500 text-xs mt-0.5 truncate">{restaurantName}</p>
                            )}
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="md:hidden p-2 text-gray-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Role badge */}
                <div className="px-4 pt-4">
                    <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <p className="text-orange-400 text-xs font-semibold">{roleLabels[role]}</p>
                        <p className="text-gray-400 text-xs truncate">{userName}</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(({ label, href, icon: Icon }) => {
                        const isActive = pathname === href || (href !== '/manager' && pathname.startsWith(href))
                        return (
                            <button
                                key={href}
                                onClick={() => router.push(href)}
                                className={cn('w-full text-left', isActive ? 'sidebar-item-active' : 'sidebar-item')}
                            >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                <span>{label}</span>
                            </button>
                        )
                    })}
                </nav>

                {/* Logout */}
                <div className="p-3 border-t border-gray-800/60">
                    <button
                        onClick={handleLogout}
                        className="w-full sidebar-item text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
