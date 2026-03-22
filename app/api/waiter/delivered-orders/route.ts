import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')
    const date = searchParams.get('date') // YYYY-MM-DD format

    if (!restaurantId) {
        return NextResponse.json({ success: false, message: 'restaurantId required' }, { status: 400 })
    }

    try {
        let dateFilter = {}
        if (date) {
            const startDate = new Date(date)
            // Start of day
            startDate.setHours(0, 0, 0, 0)
            
            const endDate = new Date(startDate)
            // End of day
            endDate.setDate(endDate.getDate() + 1)
            
            dateFilter = {
                createdAt: {
                    gte: startDate,
                    lt: endDate
                }
            }
        }

        const orders = await prisma.order.findMany({
            where: { 
                restaurantId,
                status: {
                    in: ['served', 'completed']
                },
                ...dateFilter
            },
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
            }
        })

        const formattedOrders = orders.map((order: any) => ({
            id: order.id,
            tableNumber: order.table?.tableNumber || 0,
            items: Array.isArray(order.items) ? order.items : [],
            totalAmount: Number(order.totalAmount),
            status: order.status,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt
        }))

        return NextResponse.json({ success: true, data: formattedOrders })
    } catch (error) {
        console.error('Error fetching delivered orders:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to fetch delivered orders' },
            { status: 500 }
        )
    }
}
