'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  pulse?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, pulse = false, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const isComplete = percentage >= 100;

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={isComplete ? 'Fully covered' : `${Math.round(percentage)}% covered`}
        className={cn(
          'relative h-3 w-full overflow-hidden rounded-full bg-secondary',
          isComplete && 'shadow-[0_0_12px_rgba(52,211,153,0.4)]',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'progress-bar-fill h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary',
            isComplete && 'from-success via-emerald-400 to-success',
            pulse && !isComplete && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
        {/* Shimmer effect while filling */}
        {!isComplete && percentage > 0 && (
          <div
            className="absolute inset-0 overflow-hidden rounded-full"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/25 dark:via-white/10 to-transparent" />
          </div>
        )}
        {/* Celebration glow when complete */}
        {isComplete && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-success/20 via-emerald-300/30 to-success/20 animate-pulse" />
        )}
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
