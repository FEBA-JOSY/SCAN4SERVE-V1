import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                console.log('--- Auth Attempt ---')
                console.log('Email:', credentials?.email)

                if (!credentials?.email || !credentials?.password) {
                    console.log('Missing credentials')
                    throw new Error("Missing credentials")
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email },
                    })

                    console.log('User found:', user ? 'Yes' : 'No')

                    if (!user) {
                        console.log('User not found in database')
                        throw new Error("Invalid email or password")
                    }

                    if (!user.isActive) {
                        console.log('User is not active')
                        throw new Error("Account disabled")
                    }

                    const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
                    console.log('Password valid:', isPasswordValid ? 'Yes' : 'No')

                    if (!isPasswordValid) {
                        throw new Error("Invalid password")
                    }

                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role as any,
                        restaurantId: user.restaurantId,
                    }
                } catch (error: any) {
                    console.error('Auth error:', error.message)
                    throw error
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.restaurantId = user.restaurantId
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id
                session.user.role = token.role as any
                session.user.restaurantId = token.restaurantId
            }
            return session
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
