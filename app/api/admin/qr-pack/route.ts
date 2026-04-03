import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "admin") {
        return NextResponse.json(
            { success: false, message: "Not authorized" },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get("restaurantId");

        if (!restaurantId || restaurantId !== session.user.restaurantId) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 403 }
            );
        }

        // Fetch all tables for the restaurant
        const tables = await prisma.table.findMany({
            where: { restaurantId },
            select: {
                id: true,
                tableNumber: true,
            },
            orderBy: { tableNumber: "asc" },
        });

        // Create a simple CSV-like response with QR code URLs
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        const qrBaseUrl = `${baseUrl}/menu/${restaurantId}`;

        let csvContent = "Table Number,QR Code URL\n";
        tables.forEach((table: { id: string; tableNumber: number }) => {
            const qrUrl = `${qrBaseUrl}/${table.tableNumber}`;
            csvContent += `Table ${table.tableNumber},"${qrUrl}"\n`;
        });

        // Return as downloadable file
        return new Response(csvContent, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": 'attachment; filename="qr-codes.csv"',
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
