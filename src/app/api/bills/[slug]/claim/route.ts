import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { checkCsrf } from '@/lib/csrf';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // CSRF check
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const { slug } = await params;
    const { host_key } = await request.json();

    if (!host_key) {
      return NextResponse.json({ error: 'Host key is required' }, { status: 400 });
    }

    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use admin client to verify and update
    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify slug + host_key match
    const { data: bill, error: billError } = await admin
      .from('bills')
      .select('id, host_key, restaurant_name, host_user_id')
      .eq('slug', slug)
      .single();

    if (billError || !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    if (bill.host_key !== host_key) {
      return NextResponse.json({ error: 'Invalid host key' }, { status: 403 });
    }

    if (bill.host_user_id && bill.host_user_id !== user.id) {
      return NextResponse.json(
        { error: 'This bill is already linked to another account' },
        { status: 409 }
      );
    }

    // Link the bill to this user
    const { error: updateError } = await admin
      .from('bills')
      .update({
        host_user_id: user.id,
        host_email: user.email,
      })
      .eq('id', bill.id);

    if (updateError) {
      console.error('Claim update error:', updateError);
      return NextResponse.json({ error: 'Failed to claim bill' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      restaurant_name: bill.restaurant_name,
    });
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
