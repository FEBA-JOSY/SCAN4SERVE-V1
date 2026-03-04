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
    const { restaurant_id, table_number } = body

    // Build QR URL (points to the customer menu page)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const qr_code_url = `${baseUrl}/menu/${restaurant_id}/${table_number}`

    try {
        const table = await prisma.table.create({
            data: {
                restaurantId: restaurant_id,
                tableNumber: Number(table_number),
                qrCodeUrl: qr_code_url,
                active: true
            }
        })
        return NextResponse.json({ success: true, data: table }, { status: 201 })
    } catch (error: any) {
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
        await prisma.table.delete({
            where: { id }
        })
        return NextResponse.json({ success: true, message: 'Table deleted' })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
