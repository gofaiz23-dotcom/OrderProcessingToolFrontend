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
      router.push('/orders/walmart');
    }
  }, [isAuthenticated, router]);

  // Show login message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-12 w-full max-w-lg text-center">
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <div className="bg-amber-100 rounded-full p-4 sm:p-6 mb-4 sm:mb-6">
              <Lock className="w-8 h-8 sm:w-12 sm:h-12 text-amber-600" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">Access Restricted</h1>
            <p className="text-gray-700 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8">
              Please login to continue
            </p>
          </div>

          <Link
            href="/UserAuthentication/login"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-5 sm:px-6 py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all w-full sm:w-auto"
          >
            <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // This should not render if authenticated (redirect happens)
  return null;
}

