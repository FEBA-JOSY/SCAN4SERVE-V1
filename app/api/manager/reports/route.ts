import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/manager/reports?restaurantId=xxx&startDate=2025-01-01&endDate=2025-01-31
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!restaurantId) {
        return NextResponse.json({ success: false, message: 'restaurantId required' }, { status: 400 })
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    end.setHours(23, 59, 59, 999)

    try {
        const orders = await prisma.order.findMany({
            where: {
                restaurantId,
                createdAt: {
                    gte: start,
                    lte: end
                }
            },
            select: {
                id: true,
                items: true,
                totalAmount: true,
                status: true
            }
        })

        // Calculate metrics
        const totalOrders = orders.length
        const completedOrders = orders.filter((o: { status: string }) => ['served', 'completed'].includes(o.status))
        const totalRevenue = completedOrders.reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount || 0), 0)
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

        // Calculate items sold
        const itemCountMap: Record<string, { name: string; count: number; revenue: number }> = {}
        let totalItemsSold = 0

        orders.forEach((order: { items?: any[] }) => {
            const items = order.items as any[]
            items?.forEach((item: { name: string; quantity?: number; price?: number }) => {
                if (!itemCountMap[item.name]) itemCountMap[item.name] = { name: item.name, count: 0, revenue: 0 }
                itemCountMap[item.name].count += (item.quantity || 0)
                itemCountMap[item.name].revenue += (item.price || 0) * (item.quantity || 0)
                totalItemsSold += (item.quantity || 0)
            })
        })

        // Get top items
        const topItems = Object.values(itemCountMap)
            .sort((a: { revenue: number }, b: { revenue: number }) => b.revenue - a.revenue)
            .slice(0, 10)

        return NextResponse.json({
            success: true,
            data: {
                totalOrders,
                totalRevenue,
                avgOrderValue,
                totalItemsSold,
                topItems
            }
        })
    } catch (error) {
        console.error('Error fetching reports:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to fetch reports' },
            { status: 500 }
        )
    }
}
