import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import { checkCsrf } from '@/lib/csrf';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const ip = getClientIp(request);
    const { limited } = rateLimit(ip, 'create-group', 10, 60_000);
    if (limited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check authentication first — most "missing email" errors are really auth issues
    const cookieStore = await cookies();
    const authClient = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
          },
        },
      }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Please log in to create a group' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    const body = await request.json();

    const { name, emoji, created_by, creator_name, venmo_handle, zelle_info, cashapp_handle, paypal_handle, preferred_payment } = body;

    // Input validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: 'Group name must be 100 characters or fewer' }, { status: 400 });
    }
    if (!created_by || typeof created_by !== 'string') {
      return NextResponse.json({ error: 'Creator email is required' }, { status: 400 });
    }
    if (!creator_name || typeof creator_name !== 'string' || !creator_name.trim()) {
      return NextResponse.json({ error: 'Your name is required' }, { status: 400 });
    }

    const slug = nanoid(8).toLowerCase();
    const groupEmoji = emoji || '🍽️';

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        emoji: groupEmoji,
        slug,
        created_by: created_by.trim(),
      })
      .select()
      .single();

    if (groupError) {
      console.error('Group creation error:', groupError);
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        name: creator_name.trim(),
        email: created_by.trim(),
        venmo_handle: venmo_handle || null,
        zelle_info: zelle_info || null,
        cashapp_handle: cashapp_handle || null,
        paypal_handle: paypal_handle || null,
        preferred_payment: preferred_payment || 'venmo',
        role: 'admin',
      });

    if (memberError) {
      console.error('Member creation error:', memberError);
      // Don't fail — group was created
    }

    return NextResponse.json({
      group,
      slug,
      url: `/g/${slug}`,
      invite_url: `/g/${slug}/join`,
    });
  } catch (error) {
    console.error('Group creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
