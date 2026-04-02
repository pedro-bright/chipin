import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="bg-background">
      <header className="border-b border-border/50 px-4 py-4 glass-header">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Skeleton className="h-7 w-28" />
          <div className="flex gap-2 items-center">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="h-9 w-64 mx-auto" />
          <Skeleton className="h-4 w-80 mx-auto" />
        </div>

        <Skeleton className="h-64 w-full rounded-2xl" />

        <Skeleton className="h-4 w-40 mx-auto" />
      </div>
    </main>
  );
}
