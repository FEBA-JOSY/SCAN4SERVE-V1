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
            whereClause.status = { in: ['ready', 'served', 'completed', 'rejected'] }
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
    const { orderId, status, estimated_time_minutes, rejectedIndexes, markOutofStock } = body

    try {
        const orderOriginal = await prisma.order.findUnique({ where: { id: orderId } });
        if (!orderOriginal) {
            return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
        }

        let updatedTotal = Number(orderOriginal.totalAmount);
        let itemsArray: any[] = Array.isArray(orderOriginal.items) ? (orderOriginal.items as any[]) : [];
        let itemsStatusChanged = false;

        if (rejectedIndexes && Array.isArray(rejectedIndexes) && rejectedIndexes.length > 0) {
            itemsStatusChanged = true;
            for (let idx of rejectedIndexes) {
                if (itemsArray[idx] && itemsArray[idx].status !== 'rejected') {
                    itemsArray[idx].status = 'rejected';
                    updatedTotal = updatedTotal - (Number(itemsArray[idx].price) * Number(itemsArray[idx].quantity));

                    if (markOutofStock && itemsArray[idx].menu_item_id) {
                        // Safely mark item as unavailable
                        await prisma.menuItem.update({
                            where: { id: itemsArray[idx].menu_item_id },
                            data: { available: false }
                        }).catch(() => null);
                    }
                }
            }
        }

        const updateData: any = { status }
        if (status === 'rejected') {
            updateData.totalAmount = 0;
            updateData.paymentStatus = 'cancelled';
        }
        if (estimated_time_minutes !== undefined) updateData.estimatedTimeMinutes = Number(estimated_time_minutes)
        if (itemsStatusChanged) {
            updateData.items = itemsArray;
            updateData.totalAmount = Math.max(0, updatedTotal);
        }

        const order = await prisma.order.update({
            where: { id: orderId },
            data: updateData
        })
        return NextResponse.json({ success: true, data: order })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
