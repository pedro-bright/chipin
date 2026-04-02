import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { checkCsrf } from '@/lib/csrf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: bill, error } = await supabase
    .from('bills')
    .select('*, bill_items(*), contributions(*), bill_attendees(*)')
    .eq('slug', slug)
    .single();

  if (error || !bill) {
    return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  }

  // Sort items by sort_order
  if (bill.bill_items) {
    bill.bill_items.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);
  }

  // Check if caller has host access via key param or auth cookie
  const url = new URL(request.url);
  const verifyKey = url.searchParams.get('key');
  const authMode = url.searchParams.get('auth') === 'true';

  let isHostAuthorized = false;

  // Method 1: host_key in query param
  if (verifyKey && verifyKey === bill.host_key) {
    isHostAuthorized = true;
  }

  // Method 2: authenticated user matches host_user_id
  if (!isHostAuthorized && authMode && bill.host_user_id) {
    try {
      const authSupabase = await createAuthClient();
      const { data: { user } } = await authSupabase.auth.getUser();
      if (user && user.id === bill.host_user_id) {
        isHostAuthorized = true;
      }
    } catch {
      // No auth session
    }
  }

  // Host gets full bill data; public gets stripped response
  if (isHostAuthorized) {
    return NextResponse.json({ ...bill, isHostAuthorized: true });
  }

  const { host_key: _hk, host_email: _he, host_user_id: _hu, ...safeBill } = bill;
  return NextResponse.json(safeBill);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // CSRF check
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const { slug } = await params;
  const supabase = createServerClient();
  const body = await request.json();

  const { host_key, ...updates } = body;

  // Verify host key
  const { data: bill } = await supabase
    .from('bills')
    .select('host_key')
    .eq('slug', slug)
    .single();

  if (!bill || bill.host_key !== host_key) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Update bill
  const { data, error } = await supabase
    .from('bills')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 });
  }

  return NextResponse.json(data);
}
