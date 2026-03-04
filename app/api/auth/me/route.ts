import { getServerSession } from "next-auth/next"
import { authOptions } from "../[...nextauth]/route" // I should export authOptions to make this easier
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
    }

    const userData = await prisma.user.findUnique({
        where: { id: session.user.id! },
        include: {
            restaurant: {
                select: {
                    id: true,
                    name: true,
                    subscriptionStatus: true,
                    isActive: true
                }
            }
        }
    })

    return NextResponse.json({ success: true, data: userData })
}
