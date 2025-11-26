'use client';

import { memo } from 'react';
import { Skeleton } from '@/app/components/shared/ui';

export const EmailListItemSkeleton = memo(() => {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
      {/* Star icon skeleton */}
      <Skeleton className="h-5 w-5 flex-shrink-0" />

      {/* Sender/Recipient skeleton */}
      <div className="min-w-[120px] flex-shrink-0">
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Subject and snippet skeleton */}
      <div className="flex-1 min-w-0">
        <Skeleton className="mb-2 h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>

      {/* Time skeleton */}
      <div className="min-w-[80px] flex-shrink-0 text-right">
        <Skeleton className="ml-auto h-3 w-12" />
      </div>
    </div>
  );
});

EmailListItemSkeleton.displayName = 'EmailListItemSkeleton';

