'use client';

import { memo } from 'react';
import { Skeleton } from '@/app/components/shared/ui';

export const ReadingPaneSkeleton = memo(() => {
  return (
    <article className="flex h-full flex-col bg-white overflow-hidden">
      {/* Email Header Skeleton */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="mb-3 h-7 w-3/4" />
            <div className="mt-3 flex items-center justify-between">
              <div className="flex-1">
                <Skeleton className="mb-2 h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          {/* Reply and Forward Buttons Skeleton */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </header>

      {/* Email Body Skeleton - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <section className="px-6 py-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
          </div>
        </section>
      </div>
    </article>
  );
});

ReadingPaneSkeleton.displayName = 'ReadingPaneSkeleton';

