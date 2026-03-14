import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/kitchen/notifications?restaurantId=xxx
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
        return NextResponse.json({ success: false, message: 'restaurantId required' }, { status: 400 })
    }

    try {
        // Get recent orders with placed or preparing status
        const orders = await prisma.order.findMany({
            where: {
                restaurantId,
                status: { in: ['placed', 'preparing'] }
            },
            select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                table: {
                    select: {
                        tableNumber: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20
        })

        // Format notifications
        const notifications = orders.map((order: {
            id: string;
            status: string;
            createdAt: string | number | Date;
            table?: { tableNumber?: number } | null;
        }) => ({
            id: order.id,
            title: order.status === 'placed' ? 'New Order Received' : 'Order Being Prepared',
            message: `Table #${order.table?.tableNumber} has ${order.status === 'placed' ? 'placed a new order' : 'an order in preparation'}`,
            tableNumber: order.table?.tableNumber,
            type: order.status === 'placed' ? 'new' : 'preparing',
            timestamp: new Date(order.createdAt).toLocaleTimeString()
        }))

        return NextResponse.json({ success: true, data: notifications })
    } catch (error) {
        console.error('Error fetching kitchen notifications:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to fetch notifications' },
            { status: 500 }
        )
    }
}
