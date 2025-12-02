'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/app/UserAuthentication/store/authStore';
import { ReactNode } from 'react';

type AuthGuardProps = {
  children: ReactNode;
};

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/UserAuthentication/login', '/UserAuthentication/dashboard'];

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand persist to rehydrate from localStorage
  useEffect(() => {
    // Give Zustand persist middleware time to rehydrate
    const timer = setTimeout(() => {
      setIsHydrated(true);
      setMounted(true);
    }, 150); // Slightly longer to ensure localStorage is read

    return () => clearTimeout(timer);
  }, []);

  // Scroll to top on pathname change
  useEffect(() => {
    if (pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname]);

  // Handle redirect for unauthenticated users (only after hydration)
  useEffect(() => {
    if (!mounted || !isHydrated || !pathname) return;

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));

    // If not authenticated and trying to access protected route, redirect
    if (!isAuthenticated && !isPublicRoute && !isRedirecting) {
      setIsRedirecting(true);
      router.replace('/UserAuthentication/dashboard');
      // Scroll to top after redirect
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 100);
    } else if (isAuthenticated || isPublicRoute) {
      setIsRedirecting(false);
    }
  }, [isAuthenticated, pathname, router, mounted, isHydrated, isRedirecting]);

  // Show loading state during initial mount and hydration
  if (!mounted || !isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If redirecting, show loading state
  if (isRedirecting) {
    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));
    if (!isPublicRoute) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-gray-600">Redirecting...</p>
          </div>
        </div>
      );
    }
  }

  // Allow access if authenticated or on public route
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));
  if (!isAuthenticated && !isPublicRoute) {
    return null; // Will be handled by redirect
  }

  return <>{children}</>;
}

