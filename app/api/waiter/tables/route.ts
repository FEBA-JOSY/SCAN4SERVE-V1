import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/waiter/tables?restaurantId=xxx — table grid with active orders
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
        return NextResponse.json({ success: false, message: 'restaurantId required' }, { status: 400 })
    }

    try {
        const tables = await prisma.table.findMany({
            where: {
                restaurantId,
                active: true
            },
            include: {
                orders: {
                    where: {
                        status: { notIn: ['completed', 'cancelled'] }
                    },
                    select: {
                        id: true,
                        status: true,
                        totalAmount: true,
                        items: true,
                        createdAt: true
                    }
                }
            },
            orderBy: { tableNumber: 'asc' }
        })

        // Annotate each table with its latest active order
        const enriched = tables.map((table: any) => {
            return {
                ...table,
                hasActiveOrder: table.orders.length > 0,
                hasReadyOrder: table.orders.some((o: any) => o.status === 'ready'),
                activeOrders: table.orders,
            }
        })

        return NextResponse.json({ success: true, data: enriched })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}

// PATCH /api/waiter/tables — mark order as served or complete payment
export async function PATCH(req: NextRequest) {
    const body = await req.json()
    const { orderId, action } = body // action: 'serve' | 'complete'

    const statusMap: Record<string, string> = {
        serve: 'served',
        complete: 'completed',
    }

    const newStatus = statusMap[action]
    if (!newStatus) return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })

    try {
        const updateData: any = { status: newStatus }
        if (action === 'complete') updateData.paymentStatus = 'paid'

        const order = await prisma.order.update({
            where: { id: orderId },
            data: updateData,
            include: { table: { select: { tableNumber: true } } }
        })

        return NextResponse.json({ success: true, data: order })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
