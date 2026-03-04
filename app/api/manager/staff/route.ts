import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json(
            { success: false, message: "Not authenticated" },
            { status: 401 }
        );
    }

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId || (session.user.role !== "superadmin" && session.user.restaurantId !== restaurantId)) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 403 }
        );
    }

    try {
        const staff = await prisma.user.findMany({
            where: { restaurantId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({ success: true, data: staff });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
