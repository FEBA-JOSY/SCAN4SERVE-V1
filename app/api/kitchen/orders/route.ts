import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/kitchen/orders?restaurantId=xxx — live order queue
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')
    const statusParam = searchParams.get('status')
    const dateParam = searchParams.get('date')

    if (!restaurantId) {
        return NextResponse.json({ success: false, message: 'restaurantId required' }, { status: 400 })
    }

    try {
        let whereClause: any = { restaurantId }
        
        if (statusParam === 'history') {
            whereClause.status = { in: ['ready', 'served', 'completed'] }
            if (dateParam) {
                const startDate = new Date(dateParam)
                startDate.setHours(0, 0, 0, 0)
                const endDate = new Date(dateParam)
                endDate.setHours(23, 59, 59, 999)
                whereClause.createdAt = {
                    gte: startDate,
                    lte: endDate
                }
            }
        } else {
            whereClause.status = { in: ['placed', 'accepted', 'preparing'] }
        }

        const orderByClause: any = statusParam === 'history'
            ? [{ createdAt: 'desc' }]
            : [{ priority: 'desc' }, { createdAt: 'asc' }]

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: { table: { select: { tableNumber: true } } },
            orderBy: orderByClause
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
