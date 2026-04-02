import { createServerClient } from '@/lib/supabase';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { BillView } from './bill-view';
import { ErrorBoundary } from '@/components/error-boundary';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string; key?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServerClient();
  const { data: bill } = await supabase
    .from('bills')
    .select('restaurant_name, host_name, total, contributions(amount)')
    .eq('slug', slug)
    .single();

  if (!bill) return { title: 'Bill Not Found' };

  const activeContributions = (bill.contributions || []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => c.note !== '[pending]' && c.note !== '[cancelled]'
  );
  const totalPaid = activeContributions.reduce(
    (s: number, c: { amount: number }) => s + Number(c.amount),
    0
  );
  const progress = bill.total > 0 ? Math.round((totalPaid / bill.total) * 100) : 0;
  const contributorCount = activeContributions.length;

  const title = `${bill.restaurant_name || 'Bill'} — TidyTab`;
  const description = `${bill.host_name} shared a $${Number(bill.total).toFixed(2)} bill from ${bill.restaurant_name || 'a restaurant'}. Tap to chip in!`;

  // Build OG image URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tidytab.app';
  const ogParams = new URLSearchParams({
    title: bill.restaurant_name || 'Shared Bill',
    total: String(bill.total),
    host: bill.host_name || 'Someone',
    progress: String(progress),
    count: String(contributorCount),
  });
  const ogImageUrl = `${appUrl}/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${bill.restaurant_name || 'Bill'} — ${bill.host_name} shared a $${Number(bill.total).toFixed(2)} bill`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function BillPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { created, key } = await searchParams;
  const supabase = createServerClient();

  const { data: bill, error } = await supabase
    .from('bills')
    .select('*, bill_items(*), contributions(*), bill_attendees(*)')
    .eq('slug', slug)
    .single();

  if (error || !bill) {
    notFound();
  }

  // Sort items by sort_order
  bill.bill_items?.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);

  // Get group info if bill is linked to a group
  let groupInfo: { name: string; emoji: string; slug: string } | null = null;
  if (bill.group_id) {
    const { data: group } = await supabase
      .from('groups')
      .select('name, emoji, slug')
      .eq('id', bill.group_id)
      .single();
    if (group) {
      groupInfo = group;
    }
  }

  // Check if the logged-in user is the host (v2 auth check)
  let isAuthHost = false;
  try {
    const authSupabase = await createAuthClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();
    if (user && bill.host_user_id && user.id === bill.host_user_id) {
      isAuthHost = true;
    }
  } catch {
    // No auth session, that's fine
  }

  return (
    <ErrorBoundary>
      <BillView
        bill={bill}
        isCreator={created === 'true'}
        hostKey={key || undefined}
        isAuthHost={isAuthHost}
        groupInfo={groupInfo}
      />
    </ErrorBoundary>
  );
}
