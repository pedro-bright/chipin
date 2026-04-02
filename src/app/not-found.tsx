import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function GlobalNotFound() {
  return (
    <main className="min-h-dvh flex flex-col bg-background">
      {/* Header / Nav */}
      <nav className="glass-nav nav-shadow sticky top-0 z-50 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <Link
            href="/"
            className="text-lg sm:text-xl tracking-tight font-[family-name:var(--font-main)] flex items-center gap-0"
          >
            <span className="font-bold text-foreground">tidy</span>
            <span className="font-bold text-primary">tab</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full px-4 text-xs sm:text-sm font-semibold min-h-[40px] border border-border bg-background hover:bg-muted transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/new"
              className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 text-xs sm:text-sm font-semibold min-h-[40px] bg-gradient-to-r from-primary to-accent text-primary-foreground border-none"
            >
              <Plus className="w-3.5 h-3.5" />
              New Bill
            </Link>
          </div>
        </div>
      </nav>

      {/* 404 Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-md enter">
          {/* CSS art — lost receipt */}
          <div className="relative w-36 h-44 mx-auto">
            {/* Tilted receipt */}
            <div className="absolute inset-0 bg-card rounded-2xl border border-border/60 shadow-lg -rotate-6 animate-float">
              <div className="p-4 space-y-2.5 opacity-25">
                <div className="h-2 bg-muted rounded-full w-3/4" />
                <div className="h-2 bg-muted rounded-full w-full" />
                <div className="h-2 bg-muted rounded-full w-2/3" />
                <div className="h-2 bg-muted rounded-full w-5/6" />
                <div className="h-2 bg-muted rounded-full w-1/2" />
                <div className="mt-3 h-2 bg-muted rounded-full w-1/3 mx-auto" />
              </div>
            </div>
            {/* 404 overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <span className="text-5xl font-extrabold text-primary/20 font-[family-name:var(--font-main)]">
                404
              </span>
            </div>
            {/* Decorative floating dots */}
            <div
              className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-primary/15 animate-float"
              style={{ animationDelay: '0.5s' }}
            />
            <div
              className="absolute -bottom-2 -left-4 w-4 h-4 rounded-full bg-accent/15 animate-float"
              style={{ animationDelay: '1.5s' }}
            />
            <div
              className="absolute top-1/2 -right-5 w-3 h-3 rounded-full bg-coral/15 animate-float"
              style={{ animationDelay: '2.5s' }}
            />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-main)] tracking-tight">
              Nothing to split here
            </h1>
            <p className="text-muted-foreground text-lg">
              This page got lost on the way to dinner 🍽️
            </p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              The page you&apos;re looking for doesn&apos;t exist. Maybe it was moved, or the URL is wrong.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-border bg-background hover:bg-muted transition-colors font-medium text-sm"
            >
              Go Home
            </Link>
            <Link
              href="/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium text-sm hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Create a Bill
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
