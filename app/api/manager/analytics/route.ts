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

        const totalOrders = orders.length
        const revenueToday = orders
            .filter(o => ['served', 'completed'].includes(o.status))
            .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)

        // Best selling items (from JSON items array)
        const itemCountMap: Record<string, { name: string; count: number; revenue: number }> = {}
        orders.forEach(order => {
            const items = order.items as any[]
            items?.forEach(item => {
                if (!itemCountMap[item.name]) itemCountMap[item.name] = { name: item.name, count: 0, revenue: 0 }
                itemCountMap[item.name].count += (item.quantity || 0)
                itemCountMap[item.name].revenue += (item.price || 0) * (item.quantity || 0)
            })
        })
        const bestSellers = Object.values(itemCountMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)

        // Peak hours (group by hour)
        const hourMap: Record<number, number> = {}
        orders.forEach(order => {
            const hour = new Date(order.createdAt).getHours()
            hourMap[hour] = (hourMap[hour] ?? 0) + 1
        })
        const peakHours = Object.entries(hourMap)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => b.count - a.count)

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

        const totalRevenue = Number(allTimeRevenueResult._sum.totalAmount || 0)

        return NextResponse.json({
            success: true,
            data: { totalOrders, revenueToday, totalRevenue, bestSellers, peakHours },
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
