import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkCsrf } from '@/lib/csrf';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const ip = getClientIp(request);
    const { limited } = rateLimit(ip, 'join-group', 20, 60_000);
    if (limited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { slug } = await context.params;
    const body = await request.json();
    const supabase = createServerClient();

    const { name, email, venmo_handle, zelle_info, cashapp_handle, paypal_handle, preferred_payment } = body;

    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or fewer' }, { status: 400 });
    }

    // Find the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if name already taken in group
    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('name', name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Someone with that name is already in this group. Try a different name or add your last initial!' },
        { status: 409 }
      );
    }

    // Add member
    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        name: name.trim(),
        email: email?.trim() || null,
        venmo_handle: venmo_handle || null,
        zelle_info: zelle_info || null,
        cashapp_handle: cashapp_handle || null,
        paypal_handle: paypal_handle || null,
        preferred_payment: preferred_payment || 'venmo',
        role: 'member',
      })
      .select()
      .single();

    if (memberError) {
      console.error('Join error:', memberError);
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
    }

    return NextResponse.json({ member, group_name: group.name });
  } catch (error) {
    console.error('Join error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
