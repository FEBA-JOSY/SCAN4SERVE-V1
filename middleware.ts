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

        console.log('--- Middleware Debug ---')
        console.log('Path:', pathname)
        console.log('Token exists:', !!token)
        console.log('User Role in Token:', token?.role)

        // Already checked authentication via withAuth wrapper
        // Now check role-based access
        const routeEntry = Object.entries(ROLE_ROUTES).find(([route]) =>
            pathname.startsWith(route)
        )

        if (token && routeEntry) {
            const [, allowedRoles] = routeEntry
            const userRole = (token?.role as string)?.toLowerCase() as UserRole

            console.log('Allowed Roles for this route:', allowedRoles)
            console.log('Normalized User Role:', userRole)

            if (!userRole || !allowedRoles.includes(userRole)) {
                console.log('⛔ Unauthorized: Redirecting back to login')
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
