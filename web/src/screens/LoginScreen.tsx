import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export function LoginScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const navigate = useNavigate()
    const initialize = useAuthStore(s => s.initialize)

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        console.log('Login attempted:', email)
        setIsLoading(true)
        setError(null)

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (authError) throw authError

            await initialize()
            navigate({ to: '/dashboard' })

        } catch (err: any) {
            setError(err.message ?? 'Login gagal. Coba lagi.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="w-full max-w-sm">

                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center
                                    w-14 h-14 bg-blue-600 rounded-2xl mb-4">
                        <svg className="w-7 h-7 text-white" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10
                                     a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2
                                     2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2
                                     a2 2 0 012 2" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        JobReport
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Admin Dashboard
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border
                                border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-6">
                        Masuk ke akun Anda
                    </h2>

                    <form onSubmit={handleLogin} className="space-y-4">

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="admin@jobreport.com"
                                required
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200
                                            rounded-lg px-3 py-2">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors duration-150"
                        >
                            {isLoading ? 'Masuk...' : 'Masuk'}
                        </button>

                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-400 mt-6">
                    JobReport v1.0 · Hanya untuk admin
                </p>

            </div>
        </div>
    )
}