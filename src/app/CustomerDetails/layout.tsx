import { Suspense } from 'react';
import AppLayout from '@/app/components/shared/AppLayout';

export default function CustomerDetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="text-slate-600">Loading...</div></div>}>
      <AppLayout>{children}</AppLayout>
    </Suspense>
  );
}

