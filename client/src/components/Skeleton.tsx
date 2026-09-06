import type { CSSProperties } from 'react';

interface SkeletonProps { className?: string; style?: CSSProperties }

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} style={style} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
          <Skeleton className="h-4 w-24 flex-shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
      <Skeleton className="h-5 w-1/4 mb-4" />
      <div className="flex items-end gap-2 h-40">
        {[60, 80, 45, 90, 55, 70, 40].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}
