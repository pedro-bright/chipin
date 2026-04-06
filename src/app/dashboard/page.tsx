import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { DashboardView } from './dashboard-view';
import { ErrorBoundary } from '@/components/error-boundary';
import type { BillWithItems, Group } from '@/lib/types';

export const metadata = {
  title: 'Host Control Center — TidyTab',
  description: 'Run your groups, bills, reminders, and payment settings in one place',
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Use admin client to fetch all bills for this user (bypasses RLS)
  const admin = createAdminClient();

  // Fetch bills linked by host_user_id OR host_email
  const { data: bills, error } = await admin
    .from('bills')
    .select('*, bill_items(*), contributions(*)')
    .or(`host_user_id.eq.${user.id},host_email.eq.${user.email}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Dashboard bills fetch error:', error);
  }

  // If there are bills matched by email but not linked to user_id, link them
  if (bills && bills.length > 0) {
    const unlinkedBills = bills.filter(
      (b: BillWithItems) => b.host_email === user.email && !b.host_user_id
    );
    if (unlinkedBills.length > 0) {
      await admin
        .from('bills')
        .update({ host_user_id: user.id })
        .in(
          'id',
          unlinkedBills.map((b: BillWithItems) => b.id)
        );
    }
  }

  // Fetch groups the user is a member of (by email)
  const { data: memberRows } = await admin
    .from('group_members')
    .select('group_id')
    .eq('email', user.email);

  const groups: (Group & { member_count: number; bill_count: number })[] = [];

  if (memberRows && memberRows.length > 0) {
    const groupIds = memberRows.map((m: { group_id: string }) => m.group_id);
    const { data: groupData } = await admin
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('updated_at', { ascending: false });

    if (groupData) {
      // Get member counts and bill counts
      for (const g of groupData) {
        const { count: memberCount } = await admin
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id);
        const { count: billCount } = await admin
          .from('bills')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id);
        groups.push({
          ...g,
          member_count: memberCount || 0,
          bill_count: billCount || 0,
        });
      }
    }
  }

  return (
    <ErrorBoundary>
      <DashboardView
        bills={(bills as BillWithItems[]) || []}
        userEmail={user.email || ''}
        userId={user.id}
        groups={groups}
      />
    </ErrorBoundary>
  );
}
