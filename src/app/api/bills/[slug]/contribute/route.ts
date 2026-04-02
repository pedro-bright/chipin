import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/emails/send';
import { renderContributionNotification } from '@/lib/emails/contribution-notification';
import { renderBillFullyCovered } from '@/lib/emails/bill-fully-covered';
import { checkPromptPayerBadge } from '@/lib/badges';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { checkCsrf } from '@/lib/csrf';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// PATCH - Update a contribution (e.g. mark pending → confirmed)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const { slug } = await params;
    const supabase = createServerClient();
    const body = await request.json();
    const { contribution_id, note } = body;

    if (!contribution_id) {
      return NextResponse.json({ error: 'contribution_id is required' }, { status: 400 });
    }

    // Verify the contribution belongs to this bill
    const { data: bill } = await supabase
      .from('bills')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const { data: updated, error } = await supabase
      .from('contributions')
      .update({ note: note ?? null })
      .eq('id', contribution_id)
      .eq('bill_id', bill.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update contribution' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // CSRF check
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    // Rate limit: 10 contributions per minute per IP
    const ip = getClientIp(request);
    const { limited } = rateLimit(ip, 'contribute', 10, 60_000);
    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const { slug } = await params;
    const supabase = createServerClient();
    const body = await request.json();

    const { person_name, amount, payment_method, claimed_item_ids, note } = body;

    // Validate person_name
    if (!person_name || typeof person_name !== 'string' || !person_name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    if (person_name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be 100 characters or fewer' },
        { status: 400 }
      );
    }

    // Validate amount
    const numAmount = Number(amount);
    if (!amount || !Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Get full bill data including host email and existing contributions
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*, contributions(*)')
      .eq('slug', slug)
      .single();

    if (billError || !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    if (bill.status === 'settled') {
      return NextResponse.json({ error: 'This bill has been settled' }, { status: 400 });
    }

    // Validate amount isn't absurdly large (allow up to 2x total for tips/rounding)
    if (numAmount > bill.total * 2) {
      return NextResponse.json(
        { error: 'Amount exceeds the maximum allowed for this bill' },
        { status: 400 }
      );
    }

    // If this is a pending contribution, check if one already exists for this person
    // and update it instead of creating a duplicate
    if (note === '[pending]') {
      const { data: existingPending } = await supabase
        .from('contributions')
        .select('id')
        .eq('bill_id', bill.id)
        .eq('person_name', person_name)
        .eq('note', '[pending]')
        .limit(1)
        .maybeSingle();

      if (existingPending) {
        // Update the existing pending contribution instead of creating a new one
        const { data: updated, error: updateError } = await supabase
          .from('contributions')
          .update({
            amount: Number(amount),
            payment_method: payment_method || 'venmo',
            claimed_item_ids: claimed_item_ids || [],
          })
          .eq('id', existingPending.id)
          .select()
          .single();

        if (updateError) {
          console.error('Update pending contribution error:', updateError);
          return NextResponse.json({ error: 'Failed to update contribution' }, { status: 500 });
        }

        return NextResponse.json(updated);
      }
    }

    // Create contribution
    const { data: contribution, error } = await supabase
      .from('contributions')
      .insert({
        bill_id: bill.id,
        person_name,
        amount: Number(amount),
        payment_method: payment_method || 'venmo',
        claimed_item_ids: claimed_item_ids || [],
        note: note || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Contribution error:', error);
      return NextResponse.json({ error: 'Failed to record contribution' }, { status: 500 });
    }

    // If this is a confirmed contribution (not pending), clean up any
    // pending entries from the same person to prevent duplicates
    if (note !== '[pending]' && note !== '[cancelled]') {
      await supabase
        .from('contributions')
        .delete()
        .eq('bill_id', bill.id)
        .eq('person_name', person_name)
        .eq('note', '[pending]')
        .neq('id', contribution.id)
        .then(({ error: cleanupError }) => {
          if (cleanupError) console.error('Pending cleanup error:', cleanupError);
        });
    }

    // Check prompt payer badge (async)
    if (contribution) {
      checkPromptPayerBadge(
        undefined, // We don't have contributor email in this flow
        bill.created_at,
        contribution.created_at
      ).catch(() => {});
    }

    // Send email notification to host (async, don't block response)
    if (bill.host_email && bill.email_notifications) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tidytab.app';
      const activeContribs = (bill.contributions || []).filter(
        (c: { note?: string | null }) => c.note !== '[cancelled]' && c.note !== '[pending]'
      );
      const existingPaid = activeContribs.reduce(
        (sum: number, c: { amount: number }) => sum + Number(c.amount),
        0
      );
      const totalPaid = existingPaid + Number(amount);
      const remaining = Math.max(bill.total - totalPaid, 0);
      const percent = bill.total > 0 ? Math.round((totalPaid / bill.total) * 100) : 0;
      const contributorCount = activeContribs.length + 1;

      // Send "someone chipped in" notification
      sendEmail({
        to: bill.host_email,
        subject: `${person_name} chipped in ${formatCurrency(Number(amount))} for ${bill.restaurant_name || 'your bill'}!`,
        html: renderContributionNotification({
          hostName: bill.host_name,
          personName: person_name,
          amount: formatCurrency(Number(amount)),
          restaurantName: bill.restaurant_name || 'dinner',
          totalPaid: formatCurrency(totalPaid),
          total: formatCurrency(bill.total),
          percent,
          remaining: formatCurrency(remaining),
          contributorCount,
          billUrl: `${appUrl}/b/${slug}`,
          manageUrl: `${appUrl}/b/${slug}/manage?key=${bill.host_key}`,
        }),
      }).catch((err) => console.error('Email notification error:', err));

      // If bill is now fully covered, send celebration email
      if (remaining <= 0) {
        const allContributors = [
          ...(bill.contributions || []).map((c: { person_name: string; amount: number }) => ({
            name: c.person_name,
            amount: formatCurrency(Number(c.amount)),
          })),
          { name: person_name, amount: formatCurrency(Number(amount)) },
        ];

        sendEmail({
          to: bill.host_email,
          subject: `🎉 Your ${bill.restaurant_name || 'bill'} is fully covered!`,
          html: renderBillFullyCovered({
            hostName: bill.host_name,
            restaurantName: bill.restaurant_name || 'dinner',
            total: formatCurrency(bill.total),
            contributorCount,
            contributors: allContributors,
            billUrl: `${appUrl}/b/${slug}`,
            manageUrl: `${appUrl}/b/${slug}/manage?key=${bill.host_key}`,
          }),
        }).catch((err) => console.error('Celebration email error:', err));
      }
    }

    return NextResponse.json(contribution);
  } catch (error) {
    console.error('Contribution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
