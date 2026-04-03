import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/manager/tables?restaurantId=xxx
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
        return NextResponse.json({ success: false, message: 'Missing restaurantId' }, { status: 400 })
    }

    try {
        const tables = await prisma.table.findMany({
            where: { restaurantId },
            orderBy: { tableNumber: 'asc' }
        })
        return NextResponse.json({ success: true, data: tables })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}

// POST /api/manager/tables — add a table and generate QR URL
export async function POST(req: NextRequest) {
    const body = await req.json()
    const { restaurantId, tableNumber } = body

    if (!restaurantId || !tableNumber) {
        return NextResponse.json({ success: false, message: 'Missing restaurantId or tableNumber' }, { status: 400 })
    }

    // Build QR URL (points to the customer menu page)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
    const qrCodeUrl = `${baseUrl}/menu/${restaurantId}/${tableNumber}`

    try {
        const table = await prisma.table.create({
            data: {
                restaurantId,
                tableNumber: Number(tableNumber),
                qrCodeUrl,
                active: true
            }
        })
        return NextResponse.json({ success: true, data: table }, { status: 201 })
    } catch (error: any) {
        console.error('Table creation error:', error)
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}

// DELETE /api/manager/tables?id=xxx
export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ success: false, message: 'Missing id' }, { status: 400 })
    }

    try {
        // First delete or handle associated orders because of onDelete: Restrict
        await prisma.order.deleteMany({
            where: { tableId: id }
        })

        await prisma.table.delete({
            where: { id }
        })
        return NextResponse.json({ success: true, message: 'Table and its history removed' })
    } catch (error: any) {
        console.error('Table deletion error:', error)
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
