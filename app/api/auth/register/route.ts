import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// POST /api/auth/register — create staff user (admin/manager/kitchen/waiter)
export async function POST(req: NextRequest) {
    const body = await req.json()
    const { email, password, name, role, restaurant_id, created_by } = body

    if (!email || !password || !name || !role) {
        return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role,
                restaurantId: restaurant_id || null,
                createdBy: created_by || null,
                isActive: true,
            }
        })

        return NextResponse.json({ success: true, data: user }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
}
