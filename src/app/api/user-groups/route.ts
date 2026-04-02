import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ groups: [] });
    }

    const admin = createAdminClient();

    // Get groups the user is a member of
    const { data: memberRows } = await admin
      .from('group_members')
      .select('group_id')
      .eq('email', user.email);

    if (!memberRows || memberRows.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    const groupIds = memberRows.map((m: { group_id: string }) => m.group_id);
    const { data: groups } = await admin
      .from('groups')
      .select('id, name, emoji, slug')
      .in('id', groupIds)
      .order('updated_at', { ascending: false });

    if (!groups) {
      return NextResponse.json({ groups: [] });
    }

    // Get members for each group (include id for attendee selection)
    const result = await Promise.all(
      groups.map(async (g: { id: string; name: string; emoji: string; slug: string }) => {
        const { data: members } = await admin
          .from('group_members')
          .select('id, name')
          .eq('group_id', g.id)
          .order('joined_at', { ascending: true });
        return {
          ...g,
          members: (members || []).map((m: { name: string }) => m.name),
          memberObjects: (members || []).map((m: { id: string; name: string }) => ({ id: m.id, name: m.name })),
        };
      })
    );

    return NextResponse.json({ groups: result });
  } catch (error) {
    console.error('User groups error:', error);
    return NextResponse.json({ groups: [] });
  }
}
