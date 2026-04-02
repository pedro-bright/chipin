import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkCsrf } from '@/lib/csrf';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const { slug } = await context.params;
    const body = await request.json();
    const supabase = createServerClient();

    const { from_name, to_name, amount } = body;

    // Validation
    if (!from_name || typeof from_name !== 'string' || !from_name.trim()) {
      return NextResponse.json({ error: 'from_name is required' }, { status: 400 });
    }
    if (!to_name || typeof to_name !== 'string' || !to_name.trim()) {
      return NextResponse.json({ error: 'to_name is required' }, { status: 400 });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    if (from_name.trim().toLowerCase() === to_name.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Cannot settle with yourself' }, { status: 400 });
    }

    // Get group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Insert settlement
    const { data: settlement, error: insertError } = await supabase
      .from('settlements')
      .insert({
        group_id: group.id,
        from_name: from_name.trim(),
        to_name: to_name.trim(),
        amount: Math.round(amount * 100) / 100,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Settlement insert error:', insertError);
      return NextResponse.json({ error: 'Failed to record settlement' }, { status: 500 });
    }

    return NextResponse.json({ settlement }, { status: 201 });
  } catch (error) {
    console.error('Settlement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
