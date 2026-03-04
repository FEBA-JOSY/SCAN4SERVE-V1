import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json(
            { success: false, message: "Not authenticated" },
            { status: 401 }
        );
    }

    // Only allow admins and superadmins to update restaurant info
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        // If it's an admin, verify they only update their own restaurant
        if (session.user.role === "admin" && id !== session.user.restaurantId) {
            return NextResponse.json(
                { success: false, message: "Unauthorized to update this restaurant" },
                { status: 403 }
            );
        }

        const updatedRestaurant = await prisma.restaurant.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ success: true, data: updatedRestaurant });
    } catch (error: any) {
        console.error("Error updating restaurant:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Failed to update restaurant" },
            { status: 500 }
        );
    }
}
