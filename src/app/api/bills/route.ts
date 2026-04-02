import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import { checkAndAwardBillCreationBadges } from '@/lib/badges';
import { checkCsrf } from '@/lib/csrf';
import { sendEmail } from '@/lib/emails/send';
import { renderNewGroupBillEmail } from '@/lib/emails/new-group-bill';
import { formatCurrency } from '@/lib/utils';
import { encodeReceiptUrls } from '@/lib/receipt-urls';

export async function POST(request: NextRequest) {
  try {
    // CSRF check
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const body = await request.json();
    const supabase = createServerClient();

    const slug = nanoid(6);
    const host_key = nanoid(24);

    const {
      host_name,
      restaurant_name,
      receipt_image_url,
      subtotal,
      tax,
      tip,
      total,
      person_count,
      venmo_handle,
      zelle_info,
      cashapp_handle,
      paypal_handle,
      default_mode,
      items,
      host_email,
      host_user_id,
      group_id,
      attendees,
      receipt_image_urls,
    } = body;

    // ── Input validation ──────────────────────────────────────────────
    if (!host_name || typeof host_name !== 'string' || !host_name.trim()) {
      return NextResponse.json({ error: 'Host name is required' }, { status: 400 });
    }
    if (host_name.length > 100) {
      return NextResponse.json({ error: 'Host name must be 100 characters or fewer' }, { status: 400 });
    }

    const numTotal = Number(total);
    if (!Number.isFinite(numTotal) || numTotal <= 0) {
      return NextResponse.json({ error: 'Total must be a positive number' }, { status: 400 });
    }
    if (numTotal > 1_000_000) {
      return NextResponse.json({ error: 'Total seems unreasonably large' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }
    if (items.length > 500) {
      return NextResponse.json({ error: 'Too many items (max 500)' }, { status: 400 });
    }

    // Sanitize restaurant name (truncate if absurdly long)
    const cleanRestaurantName = (restaurant_name || 'Restaurant').slice(0, 200);

    // Validate email format if provided
    if (host_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(host_email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate items have names and valid prices
    for (const item of items) {
      if (!item.name || typeof item.name !== 'string') {
        return NextResponse.json({ error: 'Each item must have a name' }, { status: 400 });
      }
      if (item.name.length > 500) {
        return NextResponse.json({ error: 'Item name too long (max 500 characters)' }, { status: 400 });
      }
    }

    // Encode receipt URLs: single URL stays as-is, multiple become JSON array
    const encodedReceiptUrl = Array.isArray(receipt_image_urls) && receipt_image_urls.length > 0
      ? encodeReceiptUrls(receipt_image_urls)
      : receipt_image_url || null;

    // Insert the bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .insert({
        slug,
        host_key,
        host_name,
        restaurant_name: cleanRestaurantName,
        receipt_image_url: encodedReceiptUrl,
        subtotal: Number(subtotal) || 0,
        tax: Number(tax) || 0,
        tip: Number(tip) || 0,
        total: Number(total) || 0,
        person_count: person_count ? Number(person_count) : null,
        venmo_handle,
        zelle_info,
        cashapp_handle,
        paypal_handle: paypal_handle || null,
        default_mode: ['claim', 'split', 'custom'].includes(default_mode) ? default_mode : null,
        status: 'published',
        host_email: host_email || null,
        host_user_id: host_user_id || null,
        email_notifications: host_email ? true : false,
        group_id: group_id || null,
      })
      .select()
      .single();

    if (billError) {
      console.error('Bill creation error:', billError);
      return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 });
    }

    // Insert line items
    if (items && items.length > 0) {
      const billItems = items.map((item: { name: string; price: number; quantity?: number; qty?: number; shared_by?: number | null }, index: number) => ({
        bill_id: bill.id,
        name: String(item.name).slice(0, 500).trim() || 'Item',
        price: Math.max(0, Number(item.price) || 0),
        quantity: Math.max(1, Math.round(Number(item.quantity || item.qty || 1))),
        sort_order: index,
        shared_by: item.shared_by && Number(item.shared_by) >= 2 ? Number(item.shared_by) : null,
      }));

      const { error: itemsError } = await supabase.from('bill_items').insert(billItems);

      if (itemsError) {
        console.error('Items creation error:', itemsError);
      }
    }

    // Insert attendees (for group bills with attendee selection)
    if (attendees && Array.isArray(attendees) && attendees.length > 0 && group_id) {
      const attendeeRows = attendees
        .filter((a: { group_member_id: string; member_name: string; expected_amount: number }) =>
          a.group_member_id && a.member_name && a.expected_amount > 0
        )
        .map((a: { group_member_id: string; member_name: string; expected_amount: number }) => ({
          bill_id: bill.id,
          group_member_id: a.group_member_id,
          member_name: String(a.member_name).trim(),
          expected_amount: Math.round(Number(a.expected_amount) * 100) / 100,
        }));

      if (attendeeRows.length > 0) {
        const { error: attendeesError } = await supabase.from('bill_attendees').insert(attendeeRows);
        if (attendeesError) {
          console.error('Attendees creation error:', attendeesError);
        }
      }
    }

    // Send group notification emails (async, don't block response)
    if (group_id) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tidytab.app';
      (async () => {
        try {
          // Get group info
          const { data: group } = await supabase
            .from('groups')
            .select('name, emoji')
            .eq('id', group_id)
            .single();

          if (!group) return;

          // Get group members with email (excluding the bill creator)
          const { data: members } = await supabase
            .from('group_members')
            .select('name, email')
            .eq('group_id', group_id)
            .not('email', 'is', null);

          if (!members || members.length === 0) return;

          const billTotal = Number(total) || 0;
          const attendeeCount = attendees?.length || members.length;
          const perPersonShare = attendeeCount > 0 ? billTotal / attendeeCount : billTotal;

          for (const member of members) {
            // Skip the host (who created the bill)
            if (!member.email) continue;
            if (host_email && member.email.toLowerCase() === host_email.toLowerCase()) continue;

            // Find their specific share if attendees are set
            let share = perPersonShare;
            if (attendees && Array.isArray(attendees)) {
              const memberAttendee = attendees.find(
                (a: { member_name: string }) =>
                  a.member_name.trim().toLowerCase() === member.name.trim().toLowerCase()
              );
              if (memberAttendee) {
                share = Number(memberAttendee.expected_amount) || perPersonShare;
              } else {
                // Not an attendee of this bill — skip notification
                continue;
              }
            }

            const html = renderNewGroupBillEmail({
              memberName: member.name,
              groupName: group.name,
              groupEmoji: group.emoji,
              hostName: host_name,
              billName: cleanRestaurantName,
              billTotal: formatCurrency(billTotal),
              memberShare: formatCurrency(share),
              billUrl: `${appUrl}/b/${slug}`,
              unsubscribeUrl: `${appUrl}/api/bills/${slug}/unsubscribe?email=${encodeURIComponent(member.email)}`,
            });

            await sendEmail({
              to: member.email,
              subject: `${group.emoji} New bill in ${group.name}: ${cleanRestaurantName}`,
              html,
            });
          }
        } catch (err) {
          console.error('Group notification error:', err);
        }
      })();
    }

    // Award badges (async, don't block response)
    if (host_email) {
      checkAndAwardBillCreationBadges(host_email, {
        tip: Number(tip) || 0,
        subtotal: Number(subtotal) || 0,
        person_count: person_count ? Number(person_count) : null,
      }).catch((err) => console.error('Badge check error:', err));
    }

    return NextResponse.json({
      bill,
      host_key,
      slug,
      url: `/b/${slug}`,
      manage_url: `/b/${slug}/manage?key=${host_key}`,
    });
  } catch (error) {
    console.error('Bill creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
