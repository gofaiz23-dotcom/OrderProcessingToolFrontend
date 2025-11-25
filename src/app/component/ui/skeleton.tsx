import { cn } from '@/app/utils/cn';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200', className)} {...props} />;
}

export { Skeleton };

