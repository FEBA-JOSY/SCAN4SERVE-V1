import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { UserRole } from "@/types"

const ROLE_ROUTES: Record<string, UserRole[]> = {
    '/superadmin': ['superadmin'],
    '/admin': ['admin', 'superadmin'],
    '/manager': ['manager', 'admin', 'superadmin'],
    '/kitchen': ['kitchen', 'manager', 'admin', 'superadmin'],
    '/waiter': ['waiter', 'manager', 'admin', 'superadmin'],
}

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const pathname = req.nextUrl.pathname

        // Already checked authentication via withAuth wrapper
        // Now check role-based access
        const routeEntry = Object.entries(ROLE_ROUTES).find(([route]) =>
            pathname.startsWith(route)
        )

        if (routeEntry) {
            const [, allowedRoles] = routeEntry
            const userRole = token?.role as UserRole

            if (!userRole || !allowedRoles.includes(userRole)) {
                return NextResponse.redirect(new URL('/login?error=unauthorized', req.url))
            }
        }

        return NextResponse.next()
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const pathname = req.nextUrl.pathname

                // Public routes
                if (pathname.startsWith('/menu') || pathname === '/login' || pathname.startsWith('/api/auth')) {
                    return true
                }

                // Public API routes for customers (no authentication required)
                if (pathname.startsWith('/api/customer')) {
                    return true
                }

                return !!token
            },
        },
        secret: process.env.NEXTAUTH_SECRET,
    }
)

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
