import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/customer/menu?restaurantId=xxx
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
        return NextResponse.json({ success: false, message: 'restaurantId required' }, { status: 400 })
    }

    try {
        // Verify restaurant is active
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId, isActive: true },
            select: {
                id: true,
                name: true,
                logoUrl: true,
                subscriptionStatus: true,
                isActive: true
            }
        })

        if (!restaurant) {
            return NextResponse.json({ success: false, message: 'Restaurant not found or inactive' }, { status: 404 })
        }

        if (restaurant.subscriptionStatus === 'expired') {
            return NextResponse.json({ success: false, message: 'Restaurant subscription expired' }, { status: 403 })
        }

        // Get categories + items
        const categories = await prisma.category.findMany({
            where: { restaurantId },
            include: { menuItems: true },
            orderBy: { displayOrder: 'asc' }
        })

        return NextResponse.json({ success: true, data: { restaurant, categories } })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
