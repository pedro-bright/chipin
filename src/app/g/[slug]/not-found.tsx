import Link from 'next/link';

export default function GroupNotFound() {
  return (
    <main className="bg-background min-h-dvh flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="text-6xl">🔍</div>
        <div>
          <h1 className="text-3xl font-extrabold font-[family-name:var(--font-main)]">
            Group not found
          </h1>
          <p className="text-muted-foreground mt-2">
            This group doesn&apos;t exist or may have been removed.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium text-sm hover:shadow-lg transition-all"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
