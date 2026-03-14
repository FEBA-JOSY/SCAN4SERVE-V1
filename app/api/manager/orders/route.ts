import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/manager/orders?restaurantId=xxx
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
        return NextResponse.json({ success: false, message: 'restaurantId required' }, { status: 400 })
    }

    try {
        const orders = await prisma.order.findMany({
            where: { restaurantId },
            select: {
                id: true,
                tableId: true,
                items: true,
                totalAmount: true,
                status: true,
                paymentStatus: true,
                createdAt: true,
                table: {
                    select: {
                        tableNumber: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100 // Last 100 orders
        })

        const formattedOrders = orders.map((order: {
            id: string;
            table?: { tableNumber?: number } | null;
            items?: any[];
            totalAmount?: number;
            status?: string;
            paymentStatus?: string;
            createdAt?: string | number | Date;
        }) => ({
            id: order.id,
            tableNumber: order.table?.tableNumber || 0,
            items: Array.isArray(order.items) ? order.items : [],
            totalAmount: order.totalAmount,
            status: order.status,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt
        }))

        return NextResponse.json({ success: true, data: formattedOrders })
    } catch (error) {
        console.error('Error fetching orders:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to fetch orders' },
            { status: 500 }
        )
    }
}
