import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/manager/menu?restaurantId=xxx
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
        return NextResponse.json({ success: false, message: 'Missing restaurantId' }, { status: 400 })
    }

    try {
        const menuItems = await prisma.menuItem.findMany({
            where: { restaurantId },
            include: { category: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json({ success: true, data: menuItems })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}

// POST /api/manager/menu — create menu item
export async function POST(req: NextRequest) {
    const body = await req.json()
    const { restaurant_id, category_id, name, description, price, image_url, is_veg, prep_time_minutes } = body

    try {
        const menuItem = await prisma.menuItem.create({
            data: {
                restaurantId: restaurant_id,
                categoryId: category_id,
                name,
                description,
                price: Number(price),
                imageUrl: image_url,
                isVeg: is_veg,
                prepTimeMinutes: prep_time_minutes || 15,
                available: true
            }
        })
        return NextResponse.json({ success: true, data: menuItem }, { status: 201 })
    } catch (error: any) {
        console.error("Create menu item error:", error);
        return NextResponse.json({ success: false, message: error.message || "Failed to create menu item" }, { status: 500 })
    }
}

// PATCH /api/manager/menu — update menu item
export async function PATCH(req: NextRequest) {
    const body = await req.json()
    const { id, ...updates } = body

    try {
        // Map snake_case to camelCase for Prisma if necessary, 
        // but here we use updates directly. We should be careful with types.
        const formattedUpdates: any = {}
        if (updates.name) formattedUpdates.name = updates.name
        if (updates.description) formattedUpdates.description = updates.description
        if (updates.price) formattedUpdates.price = Number(updates.price)
        if (updates.category_id) formattedUpdates.categoryId = updates.category_id
        if (updates.image_url) formattedUpdates.imageUrl = updates.image_url
        if (updates.is_veg !== undefined) formattedUpdates.isVeg = updates.is_veg
        if (updates.prep_time_minutes !== undefined) formattedUpdates.prepTimeMinutes = updates.prep_time_minutes
        if (updates.available !== undefined) formattedUpdates.available = updates.available

        const menuItem = await prisma.menuItem.update({
            where: { id },
            data: formattedUpdates
        })
        return NextResponse.json({ success: true, data: menuItem })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}

// DELETE /api/manager/menu?id=xxx
export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ success: false, message: 'Missing id' }, { status: 400 })
    }

    try {
        await prisma.menuItem.delete({
            where: { id }
        })
        return NextResponse.json({ success: true, message: 'Item deleted' })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
