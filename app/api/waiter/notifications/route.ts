import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/waiter/notifications?restaurantId=xxx
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
        return NextResponse.json({ success: false, message: 'restaurantId required' }, { status: 400 })
    }

    try {
        // Get recent orders with ready or served status
        const orders = await prisma.order.findMany({
            where: {
                restaurantId,
                status: { in: ['ready', 'served'] }
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
                updatedAt: 'desc'
            },
            take: 20
        })

        // Format notifications
        const notifications = orders.map((order: {
            id: string;
            status: string;
            updatedAt: string | number | Date;
            table?: { tableNumber?: number } | null;
        }) => ({
            id: order.id,
            title: order.status === 'ready' ? 'Order Ready for Pickup' : 'Order Served',
            message: `Order is ${order.status === 'ready' ? 'ready to be served' : 'marked as served'}`,
            tableNumber: order.table?.tableNumber,
            type: order.status === 'ready' ? 'ready' : 'order',
            timestamp: new Date(order.updatedAt).toLocaleTimeString()
        }))

        return NextResponse.json({ success: true, data: notifications })
    } catch (error) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to fetch notifications' },
            { status: 500 }
        )
    }
}
