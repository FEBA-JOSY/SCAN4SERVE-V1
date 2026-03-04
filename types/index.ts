export type UserRole = 'superadmin' | 'admin' | 'manager' | 'submanager' | 'kitchen' | 'waiter'

export type OrderStatus = 'placed' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'

export type PaymentStatus = 'pending' | 'paid' | 'failed'

export type SubscriptionStatus = 'active' | 'expired' | 'suspended'

export type SubscriptionPlan = 'basic' | 'pro' | 'enterprise'

export interface Restaurant {
    id: string
    name: string
    subdomain: string
    email?: string
    phone?: string
    address?: string
    logoUrl?: string
    subscriptionStatus: string
    plan: string
    subscriptionExpiresAt?: string
    isActive: boolean
    createdAt: string
}

export interface User {
    id: string
    name: string
    email: string
    role: UserRole
    restaurantId?: string | null
    isActive: boolean
    createdBy?: string
    createdAt: string
}

export interface Table {
    id: string
    restaurantId: string
    tableNumber: number
    qrCodeUrl?: string
    active: boolean
    createdAt: string
}

export interface Category {
    id: string
    restaurantId: string
    name: string
    displayOrder: number
    createdAt: string
}

export interface MenuItem {
    id: string
    restaurantId: string
    categoryId: string
    name: string
    description?: string
    price: number
    imageUrl?: string
    available: boolean
    prepTimeMinutes?: number
    isVeg: boolean
    createdAt: string
    category?: Category
}

export interface OrderItem {
    menuItemId: string
    name: string
    price: number
    quantity: number
    specialInstructions?: string
}

export interface Order {
    id: string
    restaurantId: string
    tableId: string
    items: OrderItem[]
    totalAmount: number
    status: OrderStatus
    paymentStatus: PaymentStatus
    specialInstructions?: string
    priority: number
    estimatedTimeMinutes?: number
    createdAt: string
    updatedAt: string
    table?: Table
}

export interface AuditLog {
    id: string
    userId: string
    action: string
    details?: any
    timestamp: string
    user?: User
}

// NextAuth Extensions
import "next-auth"

declare module "next-auth" {
    interface User {
        id: string
        role: UserRole
        restaurantId?: string | null
    }

    interface Session {
        user: User
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: UserRole
        restaurantId?: string | null
    }
}
