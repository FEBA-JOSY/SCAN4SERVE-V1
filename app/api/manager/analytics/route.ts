import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/manager/analytics?restaurantId=xxx&date=2025-03-01
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')
    const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

    if (!restaurantId) {
        return NextResponse.json({ success: false, message: 'restaurantId required' }, { status: 400 })
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`)
    const endOfDay = new Date(`${date}T23:59:59.999Z`)

    try {
        // Today's orders
        const orders = await prisma.order.findMany({
            where: {
                restaurantId,
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            select: {
                id: true,
                totalAmount: true,
                status: true,
                items: true,
                createdAt: true
            }
        })

        const revenueGeneratingOrders = orders.filter((o: { status: string }) => ['served', 'completed'].includes(o.status))
        const totalOrders = revenueGeneratingOrders.length

        // Revenue should include the 10% (5% GST + 5% Service Charge) added in the bill modal
        const revenueToday = revenueGeneratingOrders
            .reduce((sum: number, o: { totalAmount: number }) => sum + Number(o.totalAmount || 0) * 1.10, 0)

        // Best selling items (base calculation on quantity and price)
        const itemCountMap: Record<string, { name: string; count: number; revenue: number }> = {}
        orders.forEach(order => {
            // Only count best sellers for served/completed orders for accuracy
            if (!['served', 'completed'].includes(order.status)) return

            const items = order.items as any[]
            items?.forEach(item => {
                if (!itemCountMap[item.name]) itemCountMap[item.name] = { name: item.name, count: 0, revenue: 0 }
                itemCountMap[item.name].count += (item.quantity || 0)
                // Item revenue also scaled by 1.10 to match grand totals
                itemCountMap[item.name].revenue += (item.price || 0) * (item.quantity || 0) * 1.10
            })
        })
        const bestSellers = Object.values(itemCountMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)

        // Peak hours (group by hour)
        const hourMap: Record<number, number> = {}
        orders.forEach(order => {
            if (['cancelled'].includes(order.status)) return
            const hour = new Date(order.createdAt).getHours()
            hourMap[hour] = (hourMap[hour] ?? 0) + 1
        })
        const peakHours = Object.entries(hourMap)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => a.hour - b.hour) // Sort chronologically for the chart

        // All-time revenue
        const allTimeRevenueResult = await prisma.order.aggregate({
            where: {
                restaurantId,
                status: { in: ['served', 'completed'] }
            },
            _sum: {
                totalAmount: true
            }
        })

        // Apply 1.10 factor to all-time revenue as well
        const totalRevenue = Number(allTimeRevenueResult._sum.totalAmount || 0) * 1.10

        return NextResponse.json({
            success: true,
            data: { totalOrders, revenueToday, totalRevenue, bestSellers, peakHours },
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
