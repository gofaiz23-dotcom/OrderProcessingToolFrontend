'use client';

import { Suspense, ReactNode } from 'react';
import { AppLayout } from '../components/shared';
import { useLogisticsTokenRefresh } from '../hooks/useLogisticsTokenRefresh';

const LogisticsLayout = ({ children }: { children: ReactNode }) => {
  // Auto-refresh tokens every 10 minutes if session is active
  useLogisticsTokenRefresh();
  
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="text-slate-600">Loading...</div></div>}>
      <AppLayout>{children}</AppLayout>
    </Suspense>
  );
};

export default LogisticsLayout;

