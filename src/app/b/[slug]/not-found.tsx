import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="glass-header border-b border-border/50 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="text-xl font-bold font-[family-name:var(--font-main)]">
            <span className="font-extrabold">tidy</span>
            <span className="text-primary font-extrabold">tab</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-md enter">
          {/* CSS art — floating receipt */}
          <div className="relative w-32 h-40 mx-auto">
            {/* Receipt body */}
            <div className="absolute inset-0 bg-card rounded-2xl border border-border/60 shadow-lg rotate-3 animate-float">
              <div className="p-4 space-y-2.5 opacity-30">
                <div className="h-2 bg-muted rounded-full w-3/4" />
                <div className="h-2 bg-muted rounded-full w-full" />
                <div className="h-2 bg-muted rounded-full w-2/3" />
                <div className="h-2 bg-muted rounded-full w-5/6" />
                <div className="mt-3 h-2 bg-muted rounded-full w-1/2 mx-auto" />
              </div>
            </div>
            {/* Question mark */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <span className="text-6xl font-extrabold text-primary/20">?</span>
            </div>
            {/* Decorative dots */}
            <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary/15 animate-float" style={{ animationDelay: '1s' }} />
            <div className="absolute -bottom-3 -left-3 w-3 h-3 rounded-full bg-accent/15 animate-float" style={{ animationDelay: '2s' }} />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-main)] tracking-tight">
              Bill Not Found
            </h1>
            <p className="text-muted-foreground text-lg">
              This bill has been tidied up... or never existed 🤷
            </p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              It might have been settled, removed, or the link could be wrong. Double-check with whoever sent it!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto" size="lg">
                Go Home
              </Button>
            </Link>
            <Link href="/new">
              <Button className="gap-2 w-full sm:w-auto" size="lg">
                <Plus className="w-4 h-4" />
                Create a New Bill
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
