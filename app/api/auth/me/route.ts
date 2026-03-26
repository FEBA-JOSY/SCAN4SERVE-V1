import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'
import bcrypt from "bcryptjs"

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
    }

    const userData = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            restaurant: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    subscriptionStatus: true,
                    isActive: true
                }
            }
        }
    })

    return NextResponse.json({ success: true, data: userData })
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
    }

    try {
        const { name, email, password } = await req.json()
        const dataToUpdate: any = { name, email }

        if (password) {
            dataToUpdate.password = await bcrypt.hash(password, 10)
        }

        const userData = await prisma.user.update({
            where: { id: session.user.id },
            data: dataToUpdate
        })

        return NextResponse.json({ success: true, data: userData })
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message || 'Update failed' }, { status: 500 })
    }
}
