import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { Decimal } from '@prisma/client/runtime/library'

// POST /api/customer/orders — place a new order
export async function POST(req: NextRequest) {
    const body = await req.json()
    const { restaurant_id, table_id, items, special_instructions } = body

    if (!restaurant_id || !table_id || !items?.length) {
        return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    try {
        // Verify restaurant subscription
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurant_id },
            select: { subscriptionStatus: true, isActive: true }
        })

        if (!restaurant?.isActive || restaurant.subscriptionStatus === 'expired') {
            return NextResponse.json({ success: false, message: 'Restaurant cannot accept orders' }, { status: 403 })
        }

        // Calculate total
        const total_amount = (items as { price: number; quantity: number }[])
            .reduce((sum, item) => sum + item.price * item.quantity, 0)

        const order = await prisma.order.create({
            data: {
                restaurantId: restaurant_id,
                tableId: table_id,
                items,
                totalAmount: new Decimal(total_amount),
                specialInstructions: special_instructions || null,
                status: 'placed',
                paymentStatus: 'pending',
                priority: 0,
            },
            include: { table: { select: { tableNumber: true } } }
        })

        return NextResponse.json({ success: true, data: order }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}

// GET /api/customer/orders?orderId=xxx — track order status
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
        return NextResponse.json({ success: false, message: 'orderId required' }, { status: 400 })
    }

    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                status: true,
                paymentStatus: true,
                items: true,
                totalAmount: true,
                estimatedTimeMinutes: true,
                createdAt: true,
                updatedAt: true
            }
        })

        if (!order) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: order })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
