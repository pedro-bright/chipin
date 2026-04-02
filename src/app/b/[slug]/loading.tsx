import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="bg-background">
      {/* Header skeleton */}
      <header className="border-b border-border/50 px-4 py-4 glass-header">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-9 w-20" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Title skeleton */}
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-40 mx-auto" />
        </div>

        {/* Progress card skeleton */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-28" />
            </div>
            <div className="text-right space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Items card skeleton */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="p-6 pb-3">
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="p-6 pt-0 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between py-3">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
            <div className="gradient-divider" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex justify-between pt-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Chip in card skeleton */}
        <div className="rounded-2xl border border-primary/30 bg-card p-6 space-y-4 shadow-sm">
          <Skeleton className="h-5 w-52 mx-auto" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
