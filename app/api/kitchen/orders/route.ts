import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/kitchen/orders?restaurantId=xxx — live order queue
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
        return NextResponse.json({ success: false, message: 'restaurantId required' }, { status: 400 })
    }

    try {
        const orders = await prisma.order.findMany({
            where: {
                restaurantId,
                status: { in: ['placed', 'accepted', 'preparing'] }
            },
            include: { table: { select: { tableNumber: true } } },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' }
            ]
        })
        return NextResponse.json({ success: true, data: orders })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}

// PATCH /api/kitchen/orders — update order status
export async function PATCH(req: NextRequest) {
    const body = await req.json()
    const { orderId, status, estimated_time_minutes } = body

    try {
        const updateData: any = { status }
        if (estimated_time_minutes !== undefined) updateData.estimatedTimeMinutes = Number(estimated_time_minutes)

        const order = await prisma.order.update({
            where: { id: orderId },
            data: updateData
        })
        return NextResponse.json({ success: true, data: order })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
