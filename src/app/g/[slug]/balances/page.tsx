import { createServerClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { BalancesView } from './balances-view';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: group } = await supabase
    .from('groups')
    .select('name, emoji')
    .eq('slug', slug)
    .single();

  if (!group) return { title: 'Group Not Found' };

  return {
    title: `Balances — ${group.emoji} ${group.name} — TidyTab`,
    description: `View balances and ledger for ${group.name}.`,
  };
}

export default async function BalancesPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createServerClient();

  // Get group
  const { data: group, error } = await supabase
    .from('groups')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !group) {
    notFound();
  }

  // Get members
  const { data: members } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', group.id)
    .order('joined_at', { ascending: true });

  // Get bills with contributions
  const { data: bills } = await supabase
    .from('bills')
    .select('*, contributions(person_name, amount)')
    .eq('group_id', group.id)
    .order('created_at', { ascending: false });

  // Get settlements
  let settlements: Array<{
    id: string;
    group_id: string;
    from_name: string;
    to_name: string;
    amount: number;
    settled_at: string;
  }> = [];
  try {
    const { data } = await supabase
      .from('settlements')
      .select('*')
      .eq('group_id', group.id)
      .order('settled_at', { ascending: false });
    settlements = data || [];
  } catch {
    // settlements table might not exist yet
  }

  return (
    <BalancesView
      group={group}
      members={members || []}
      bills={bills || []}
      settlements={settlements}
      slug={slug}
    />
  );
}
