'use client';

import { Suspense, ReactNode } from 'react';
import { AppLayout } from '../components/shared';

const ThreePlGigaFedexLayout = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="text-slate-600">Loading...</div></div>}>
    <AppLayout>{children}</AppLayout>
  </Suspense>
);

export default ThreePlGigaFedexLayout;
