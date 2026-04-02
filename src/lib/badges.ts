import { createServerClient } from '@/lib/supabase';

export type BadgeType =
  | 'first_host'
  | 'prompt_payer'
  | 'big_tipper'
  | 'party_host'
  | 'regular'
  | 'generous';

export interface BadgeInfo {
  type: BadgeType;
  label: string;
  icon: string;
  description: string;
  color: string;
}

export const BADGE_DEFINITIONS: Record<BadgeType, Omit<BadgeInfo, 'type'>> = {
  first_host: {
    label: 'First Host',
    icon: '🎉',
    description: 'Created their first bill',
    color: 'bg-amber-100 text-amber-800',
  },
  prompt_payer: {
    label: 'Prompt Payer',
    icon: '⚡',
    description: 'Paid within 1 hour',
    color: 'bg-yellow-100 text-yellow-800',
  },
  big_tipper: {
    label: 'Big Tipper',
    icon: '💎',
    description: 'Bill had 20%+ tip',
    color: 'bg-purple-100 text-purple-800',
  },
  party_host: {
    label: 'Party Host',
    icon: '🎊',
    description: 'Bill with 8+ people',
    color: 'bg-pink-100 text-pink-800',
  },
  regular: {
    label: 'Regular',
    icon: '⭐',
    description: '5+ bills created',
    color: 'bg-blue-100 text-blue-800',
  },
  generous: {
    label: 'Generous',
    icon: '💝',
    description: 'Covered the most in the crew',
    color: 'bg-green-100 text-green-800',
  },
};

export async function awardBadge(
  userEmail: string,
  badgeType: BadgeType,
  badgeData: Record<string, unknown> = {}
): Promise<boolean> {
  try {
    const supabase = createServerClient();
    const { error } = await supabase
      .from('user_badges')
      .upsert(
        {
          user_email: userEmail,
          badge_type: badgeType,
          badge_data: badgeData,
        },
        { onConflict: 'user_email,badge_type' }
      );

    if (error) {
      console.error('Badge award error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Badge award error:', err);
    return false;
  }
}

export async function getUserBadges(userEmail: string) {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_email', userEmail)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('Badge fetch error:', error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function checkAndAwardBillCreationBadges(
  hostEmail: string,
  billData: {
    tip: number;
    subtotal: number;
    person_count: number | null;
  }
) {
  const supabase = createServerClient();

  // Check first_host badge
  const { count } = await supabase
    .from('bills')
    .select('id', { count: 'exact', head: true })
    .eq('host_email', hostEmail);

  if (count === 1) {
    await awardBadge(hostEmail, 'first_host');
  }

  // Check regular badge (5+ bills)
  if (count && count >= 5) {
    await awardBadge(hostEmail, 'regular', { bill_count: count });
  }

  // Check big_tipper badge (20%+ tip)
  if (billData.subtotal > 0 && billData.tip > 0) {
    const tipPercent = (billData.tip / billData.subtotal) * 100;
    if (tipPercent >= 20) {
      await awardBadge(hostEmail, 'big_tipper', { tip_percent: Math.round(tipPercent) });
    }
  }

  // Check party_host badge (8+ people)
  if (billData.person_count && billData.person_count >= 8) {
    await awardBadge(hostEmail, 'party_host', { person_count: billData.person_count });
  }

  // Calculate host streak
  const { data: recentBills } = await supabase
    .from('bills')
    .select('host_email, created_at')
    .eq('host_email', hostEmail)
    .order('created_at', { ascending: false })
    .limit(20);

  if (recentBills && recentBills.length > 0) {
    let streak = 0;
    for (const b of recentBills) {
      if (b.host_email === hostEmail) {
        streak++;
      } else {
        break;
      }
    }

    // Update the latest bill's streak
    if (streak > 0) {
      const { data: latestBill } = await supabase
        .from('bills')
        .select('id')
        .eq('host_email', hostEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestBill) {
        await supabase
          .from('bills')
          .update({ host_streak: streak })
          .eq('id', latestBill.id);
      }
    }
  }
}

export async function checkPromptPayerBadge(
  payerEmail: string | undefined,
  billCreatedAt: string,
  contributionCreatedAt: string
) {
  if (!payerEmail) return;

  const billTime = new Date(billCreatedAt).getTime();
  const contribTime = new Date(contributionCreatedAt).getTime();
  const hourInMs = 60 * 60 * 1000;

  if (contribTime - billTime <= hourInMs) {
    await awardBadge(payerEmail, 'prompt_payer');
  }
}

export function isPromptPayer(billCreatedAt: string, contributionCreatedAt: string): boolean {
  const billTime = new Date(billCreatedAt).getTime();
  const contribTime = new Date(contributionCreatedAt).getTime();
  const hourInMs = 60 * 60 * 1000;
  return contribTime - billTime <= hourInMs;
}
