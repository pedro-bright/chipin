import { createServerClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { JoinGroupView } from './join-view';
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
    title: `Join ${group.name} — TidyTab`,
    description: `${group.emoji} You've been invited to join ${group.name} on TidyTab!`,
  };
}

export default async function JoinGroupPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createServerClient();

  // Get group with member count
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
    .select('name')
    .eq('group_id', group.id);

  // Get recent bills for social proof
  const { data: bills } = await supabase
    .from('bills')
    .select('restaurant_name, created_at')
    .eq('group_id', group.id)
    .order('created_at', { ascending: false })
    .limit(3);

  return (
    <JoinGroupView
      group={group}
      memberNames={(members || []).map((m) => m.name)}
      recentBills={bills || []}
      slug={slug}
    />
  );
}
