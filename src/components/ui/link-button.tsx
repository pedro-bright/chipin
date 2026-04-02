'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface LinkButtonProps extends ButtonProps {
  href: string;
}

export function LinkButton({ href, children, className, disabled, ...props }: LinkButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clicked, setClicked] = useState(false);

  const loading = isPending || clicked;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setClicked(true);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Button
      className={className}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
