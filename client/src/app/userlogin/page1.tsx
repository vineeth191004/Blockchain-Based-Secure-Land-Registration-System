'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiFetcher from '@/utils/fetcher';
import { auth } from '@/utils/auth';

export default function LoginPage() {
    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // 👉 DigiLocker Redirect
    const handleDigiLockerLogin = () => {
        window.location.href = "http://localhost:3003/api/digilocker/auth";
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await apiFetcher.login(credentials);

            if (response.success) {
                auth.setAuthData(response.token, response.user);
                const dashboardRoute = auth.getDashboardRoute();
                router.push(dashboardRoute);
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">

                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Land Registration System
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Sign in to your account
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>

                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                name="username"
                                type="text"
                                required
                                placeholder="Username"
                                className="w-full px-3 py-2 border border-gray-300 rounded-t-md"
                                value={credentials.username}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div>
                            <input
                                name="password"
                                type="password"
                                required
                                placeholder="Password"
                                className="w-full px-3 py-2 border border-gray-300 rounded-b-md"
                                value={credentials.password}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-100 text-red-700 p-2 rounded">
                            {error}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="space-y-3">

                        {/* Normal Login */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>

                        {/* DigiLocker Login */}
                        <button
                            type="button"
                            onClick={handleDigiLockerLogin}
                            className="w-full border border-indigo-600 text-indigo-600 py-2 rounded hover:bg-indigo-50"
                        >
                            Login with DigiLocker
                        </button>

                    </div>

                </form>
            </div>
        </div>
    );
}
