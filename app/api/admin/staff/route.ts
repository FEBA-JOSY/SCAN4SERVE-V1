import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "admin") {
        return NextResponse.json(
            { success: false, message: "Not authorized" },
            { status: 401 }
        );
    }

    try {
        const staff = await prisma.user.findMany({
            where: {
                restaurantId: session.user.restaurantId,
                role: { in: ["manager", "submanager", "kitchen", "waiter"] },
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ success: true, data: staff });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "admin") {
        return NextResponse.json(
            { success: false, message: "Not authorized" },
            { status: 401 }
        );
    }

    try {
        const { name, email, role, password } = await request.json();

        if (!name || !email || !role || !password) {
            return NextResponse.json(
                { success: false, message: "Missing required fields" },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { success: false, message: "Email already exists" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const staff = await prisma.user.create({
            data: {
                name,
                email,
                role,
                password: hashedPassword,
                restaurantId: session.user.restaurantId,
                createdBy: session.user.id,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ success: true, data: staff });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "admin") {
        return NextResponse.json(
            { success: false, message: "Not authorized" },
            { status: 401 }
        );
    }

    try {
        const { id, isActive, name, email, role, password } = await request.json();

        const updateData: any = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined) updateData.role = role;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const staff = await prisma.user.update({
            where: { id, restaurantId: session.user.restaurantId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ success: true, data: staff });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "admin") {
        return NextResponse.json(
            { success: false, message: "Not authorized" },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Staff ID is required" },
                { status: 400 }
            );
        }

        await prisma.user.delete({
            where: { id, restaurantId: session.user.restaurantId }
        });

        return NextResponse.json({ success: true, message: "Staff deleted successfully" });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
