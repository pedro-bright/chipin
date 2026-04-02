import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// DELETE a contribution (host-only, verified by host_key)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const body = await request.json().catch(() => ({}));
    const { host_key } = body;

    const supabase = createServerClient();

    // Verify host_key matches the bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('id, host_key')
      .eq('slug', slug)
      .single();

    if (billError || !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    if (bill.host_key !== host_key) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the contribution
    const { error: delError } = await supabase
      .from('contributions')
      .delete()
      .eq('id', id)
      .eq('bill_id', bill.id);

    if (delError) {
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
