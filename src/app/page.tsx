'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/UserAuthentication/store/authStore';

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/orders/all');
    } else {
      router.push('/UserAuthentication/dashboard');
    }
  }, [isAuthenticated, router]);

  return null;
}
