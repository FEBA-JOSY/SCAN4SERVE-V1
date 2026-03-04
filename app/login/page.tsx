'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UtensilsCrossed, Eye, EyeOff, Loader2 } from 'lucide-react'

const ROLE_REDIRECT: Record<string, string> = {
    superadmin: '/superadmin',
    admin: '/admin',
    manager: '/manager',
    submanager: '/manager',
    kitchen: '/kitchen',
    waiter: '/waiter',
}

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                throw new Error(result.error)
            }

            // Fetch user data to get the role for redirection
            const response = await fetch('/api/auth/me')
            const resultData = await response.json()

            if (!resultData.success) {
                throw new Error(resultData.message || 'Failed to fetch user data')
            }

            const userData = resultData.data

            toast.success(`Welcome back! Redirecting to your dashboard...`)
            router.push(ROLE_REDIRECT[userData.role] ?? '/')
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Login failed'
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-950 relative overflow-hidden p-4">
            {/* Background glow orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 brand-gradient rounded-2xl mb-4 glow-orange">
                        <UtensilsCrossed className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold brand-gradient-text">Scan4Serve</h1>
                    <p className="text-gray-500 mt-1 text-sm">Restaurant Management Platform</p>
                </div>

                {/* Card */}
                <div className="glass-card p-8">
                    <h2 className="text-xl font-semibold text-white mb-1">Sign in to your account</h2>
                    <p className="text-gray-500 text-sm mb-6">Enter your credentials to continue</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Email address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@restaurant.com"
                                className="w-full px-4 py-3 bg-gray-900/60 border border-gray-800 rounded-xl text-white 
                           placeholder-gray-600 focus:outline-none focus:border-orange-500/60 focus:ring-1 
                           focus:ring-orange-500/30 transition-all duration-200 text-sm"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 pr-12 bg-gray-900/60 border border-gray-800 rounded-xl text-white 
                             placeholder-gray-600 focus:outline-none focus:border-orange-500/60 focus:ring-1 
                             focus:ring-orange-500/30 transition-all duration-200 text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 brand-gradient rounded-xl text-white font-semibold text-sm
                         hover:opacity-90 active:scale-[0.99] transition-all duration-200 
                         disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2
                         glow-orange-sm mt-2"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-gray-600 text-xs mt-6">
                    © {new Date().getFullYear()} Scan4Serve · All rights reserved
                </p>
            </div>
        </main>
    )
}
