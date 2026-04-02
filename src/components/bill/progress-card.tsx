'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface ProgressCardProps {
  total: number;
  totalPaid: number;
  remaining: number;
  progress: number;
  contributionCount: number;
  status: string;
}

export function ProgressCard({
  total,
  remaining,
  progress,
  status,
}: ProgressCardProps) {
  const isComplete = remaining <= 0 || status === 'settled';

  return (
    <Card
      className={`enter enter-delay-1 ${
        isComplete ? 'bg-success/10 border-success/20' : ''
      }`}
    >
      <CardContent className="pt-5 pb-5 space-y-3">
        {/* Single metric line */}
        <div className="flex items-center justify-between text-sm">
          {isComplete ? (
            <span className="flex items-center gap-1.5 text-success font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Fully covered
            </span>
          ) : (
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground font-tnum">
                {formatCurrency(remaining)}
              </span>
              {' '}remaining of {formatCurrency(total)}
            </span>
          )}
        </div>
        <Progress value={progress} max={100} className="h-3" />
      </CardContent>
    </Card>
  );
}
