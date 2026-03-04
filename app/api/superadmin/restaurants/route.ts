import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

// GET /api/superadmin/restaurants — all restaurants
export async function GET() {
    try {
        const restaurants = await prisma.restaurant.findMany({
            include: {
                users: {
                    where: { role: 'admin' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Format to include admin naturally for the frontend
        const formatted = restaurants.map(r => ({
            ...r,
            admin: r.users[0] || null
        }))

        return NextResponse.json({ success: true, data: formatted })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}

// POST /api/superadmin/restaurants — create a new restaurant
export async function POST(req: NextRequest) {
    const body = await req.json()
    const { name, subdomain, email, phone, address, plan, adminEmail, adminPassword, adminName } = body

    try {
        const hashedPassword = await bcrypt.hash(adminPassword, 10)

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create restaurant
            const restaurant = await tx.restaurant.create({
                data: {
                    name,
                    subdomain,
                    email,
                    phone,
                    address,
                    plan,
                    subscriptionStatus: 'active',
                    isActive: true,
                }
            })

            // 2. Create admin user
            const adminUser = await tx.user.create({
                data: {
                    email: adminEmail,
                    password: hashedPassword,
                    name: adminName,
                    role: 'admin',
                    restaurantId: restaurant.id,
                    isActive: true,
                }
            })

            return restaurant
        })

        return NextResponse.json({ success: true, data: result }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}

// PATCH /api/superadmin/restaurants — toggle active/subscription status
export async function PATCH(req: NextRequest) {
    const body = await req.json()
    const { id, isActive, subscriptionStatus, subscriptionExpiresAt, plan, subdomain } = body
    const session = await getServerSession(authOptions)

    try {
        const updates: any = {}
        if (isActive !== undefined) updates.isActive = isActive
        if (subscriptionStatus) updates.subscriptionStatus = subscriptionStatus
        if (subscriptionExpiresAt) updates.subscriptionExpiresAt = new Date(subscriptionExpiresAt)
        if (plan) updates.plan = plan
        if (subdomain) updates.subdomain = subdomain

        const restaurant = await prisma.restaurant.update({
            where: { id },
            data: updates
        })

        // Log audit
        await prisma.auditLog.create({
            data: {
                userId: session?.user?.id,
                action: `restaurant_updated:${id}`,
                details: updates,
            }
        })

        return NextResponse.json({ success: true, data: restaurant })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
