import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkCsrf } from '@/lib/csrf';

interface RouteContext {
  params: Promise<{ slug: string; id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const { slug, id } = await context.params;
    const supabase = createServerClient();

    // Verify group exists
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Delete member
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', id)
      .eq('group_id', group.id);

    if (error) {
      console.error('Delete member error:', error);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const { slug, id } = await context.params;
    const body = await request.json();
    const supabase = createServerClient();

    // Verify group exists
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const { venmo_handle, zelle_info, cashapp_handle, paypal_handle, preferred_payment } = body;

    const updates: Record<string, string | null> = {};
    if (venmo_handle !== undefined) updates.venmo_handle = venmo_handle || null;
    if (zelle_info !== undefined) updates.zelle_info = zelle_info || null;
    if (cashapp_handle !== undefined) updates.cashapp_handle = cashapp_handle || null;
    if (paypal_handle !== undefined) updates.paypal_handle = paypal_handle || null;
    if (preferred_payment !== undefined) updates.preferred_payment = preferred_payment;

    const { data: member, error } = await supabase
      .from('group_members')
      .update(updates)
      .eq('id', id)
      .eq('group_id', group.id)
      .select()
      .single();

    if (error) {
      console.error('Update member error:', error);
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
