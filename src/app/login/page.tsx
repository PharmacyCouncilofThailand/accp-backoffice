'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('Attempting login with API URL:', process.env.NEXT_PUBLIC_API_URL);
            const data = await api.auth.login({ email, password });

            if (data.success) {
                login(data.user, data.token);
                // Role-based redirection
                if (data.user.role === 'verifier') {
                    router.push('/verification');
                } else if (data.user.role === 'reviewer') {
                    router.push('/abstracts');
                } else if (data.user.role === 'organizer') {
                    router.push('/reports');
                } else if (data.user.role === 'staff') {
                    router.push('/checkin');
                } else {
                    router.push('/'); // Go to Dashboard
                }
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">
                        Conference<span className="text-blue-200">Hub</span>
                    </h1>
                    <p className="text-blue-200 mt-2">Backoffice Management System</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
                        Sign In
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="admin@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center">
                                <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                                <span className="ml-2 text-sm text-gray-600">Remember me</span>
                            </label>
                            <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                Forgot password?
                            </a>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Demo Credentials - Development Only */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-xs text-yellow-600 text-center mb-2">⚠️ Development Only:</p>
                            <p className="text-sm text-yellow-700 text-center font-mono">
                                admin@accp.org / admin123
                            </p>
                        </div>
                    )}
                </div>

                <p className="text-center text-blue-200 text-sm mt-6">
                    © 2026 ConferenceHub. All rights reserved.
                </p>
            </div>
        </div>
    );
}
