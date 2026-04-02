import { createServerClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { GroupView } from './group-view';
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
    title: `${group.emoji} ${group.name} — TidyTab`,
    description: `Join ${group.name} on TidyTab to split bills together.`,
  };
}

export default async function GroupPage({ params }: PageProps) {
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

  // Get bills (include attendees for balance display)
  const { data: bills } = await supabase
    .from('bills')
    .select('*, bill_items(*), contributions(*), bill_attendees(*)')
    .eq('group_id', group.id)
    .order('created_at', { ascending: false });

  return (
    <GroupView
      group={group}
      members={members || []}
      bills={bills || []}
      slug={slug}
    />
  );
}
