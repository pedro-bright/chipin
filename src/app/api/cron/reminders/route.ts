import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/emails/send';
import { renderPaymentReminder } from '@/lib/emails/payment-reminder';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

interface BillWithContributions {
  id: string;
  slug: string;
  host_key: string;
  host_name: string;
  restaurant_name: string | null;
  host_email: string;
  total: number;
  status: string;
  email_notifications: boolean;
  created_at: string;
  last_reminder_sent_at: string | null;
  contributions: { amount: number; person_name: string; note?: string | null }[];
}

function shouldSendReminder(bill: BillWithContributions): boolean {
  const now = new Date();
  const createdAt = new Date(bill.created_at);
  const daysSinceCreation = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Stop reminding after 30 days
  if (daysSinceCreation > 30) return false;

  // Must be at least 2 days old
  if (daysSinceCreation < 2) return false;

  const lastReminder = bill.last_reminder_sent_at
    ? new Date(bill.last_reminder_sent_at)
    : null;

  if (!lastReminder) return true;

  const daysSinceLastReminder = Math.floor(
    (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Reminder cadence:
  // Days 2-7: every 3 days
  // Days 7-14: every 5 days
  // Days 14-30: every 7 days
  if (daysSinceCreation <= 7) {
    return daysSinceLastReminder >= 3;
  } else if (daysSinceCreation <= 14) {
    return daysSinceLastReminder >= 5;
  } else {
    return daysSinceLastReminder >= 7;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tidytab.app';

    // Query open bills with host email, notifications enabled
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*, contributions(*)')
      .eq('status', 'published')
      .not('host_email', 'is', null)
      .eq('email_notifications', true);

    if (error) {
      console.error('Reminder query error:', error);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    if (!bills || bills.length === 0) {
      return NextResponse.json({ message: 'No bills to remind', sent: 0 });
    }

    let sentCount = 0;
    const results: { slug: string; sent: boolean; reason?: string }[] = [];

    for (const bill of bills as BillWithContributions[]) {
      const activeContribs = (bill.contributions || []).filter(
        (c: { note?: string | null }) => c.note !== '[cancelled]' && c.note !== '[pending]'
      );
      const totalPaid = activeContribs.reduce(
        (sum: number, c: { amount: number }) => sum + Number(c.amount),
        0
      );
      const remaining = Math.max(bill.total - totalPaid, 0);

      // Skip if fully paid
      if (remaining <= 0) {
        results.push({ slug: bill.slug, sent: false, reason: 'fully_paid' });
        continue;
      }

      // Check cadence
      if (!shouldSendReminder(bill)) {
        results.push({ slug: bill.slug, sent: false, reason: 'cadence_not_met' });
        continue;
      }

      const percent = bill.total > 0 ? Math.round((totalPaid / bill.total) * 100) : 0;
      const contributorCount = activeContribs.length;
      const date = new Date(bill.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const emailResult = await sendEmail({
        to: bill.host_email,
        subject: `${bill.restaurant_name || 'Your bill'} — ${formatCurrency(remaining)} still outstanding`,
        html: renderPaymentReminder({
          hostName: bill.host_name,
          restaurantName: bill.restaurant_name || 'dinner',
          date,
          totalPaid: formatCurrency(totalPaid),
          total: formatCurrency(bill.total),
          percent,
          remaining: formatCurrency(remaining),
          contributorCount,
          billUrl: `${appUrl}/b/${bill.slug}`,
          unsubscribeUrl: `${appUrl}/api/bills/${bill.slug}/unsubscribe?token=${bill.host_key}`,
        }),
      });

      if (emailResult.success) {
        // Update last_reminder_sent_at
        await supabase
          .from('bills')
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq('id', bill.id);

        sentCount++;
        results.push({ slug: bill.slug, sent: true });
      } else {
        results.push({ slug: bill.slug, sent: false, reason: 'send_failed' });
      }
    }

    return NextResponse.json({
      message: `Sent ${sentCount} reminders`,
      sent: sentCount,
      total: bills.length,
      results,
    });
  } catch (error) {
    console.error('Reminder cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
