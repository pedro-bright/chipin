import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkCsrf } from '@/lib/csrf';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const supabase = createServerClient();

    // Get group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('slug', slug)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get members
    const { data: members } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', group.id)
      .order('joined_at', { ascending: true });

    // Get bills
    const { data: bills } = await supabase
      .from('bills')
      .select('*, bill_items(*), contributions(*)')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      group: {
        ...group,
        group_members: members || [],
        bills: bills || [],
      },
    });
  } catch (error) {
    console.error('Group fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const { slug } = await context.params;
    const body = await request.json();
    const supabase = createServerClient();

    const { name, emoji } = body;

    const updates: Record<string, string> = { updated_at: new Date().toISOString() };
    if (name && typeof name === 'string') updates.name = name.trim().slice(0, 100);
    if (emoji && typeof emoji === 'string') updates.emoji = emoji;

    const { data: group, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('slug', slug)
      .select()
      .single();

    if (error || !group) {
      return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error('Group update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
