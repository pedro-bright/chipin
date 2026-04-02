'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentProps, MouseEvent } from 'react';

/**
 * A Link component that triggers the View Transitions API when available.
 * Falls back to normal Next.js navigation when not supported.
 * GPU-friendly — no backdrop-filter, uses compositor animations only.
 */
export function ViewTransitionLink({
  href,
  onClick,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let modifier clicks (new tab, etc.) work normally
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      onClick?.(e);
      return;
    }

    // Check if View Transitions API is available
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };

    if (doc.startViewTransition && typeof href === 'string') {
      e.preventDefault();
      onClick?.(e);
      doc.startViewTransition(() => {
        router.push(href);
      });
    } else {
      onClick?.(e);
    }
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
