'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/UserAuthentication/store/authStore';
import { LogIn, Lock } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // If user is authenticated, redirect to orders page
    if (isAuthenticated) {
      router.push('/orders/all');
    }
  }, [isAuthenticated, router]);

  // Show login message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="bg-white rounded-2xl shadow-xl p-12 w-full max-w-lg text-center">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-amber-100 rounded-full p-6 mb-6">
              <Lock className="w-12 h-12 text-amber-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Access Restricted</h1>
            <p className="text-gray-700 text-lg mb-8">
              Please login to continue
            </p>
          </div>

          <Link
            href="/UserAuthentication/login"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
          >
            <LogIn className="w-5 h-5" />
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // This should not render if authenticated (redirect happens)
  return null;
}

