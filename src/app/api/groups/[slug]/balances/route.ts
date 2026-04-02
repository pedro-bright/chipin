import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { computeBalances } from '@/lib/balances';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const supabase = createServerClient();

    // Get group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get all bills with contributions AND attendees
    const { data: bills } = await supabase
      .from('bills')
      .select('id, host_name, total, contributions(person_name, amount), bill_attendees(member_name, expected_amount)')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true });

    // Get all settlements
    const { data: settlements } = await supabase
      .from('settlements')
      .select('*')
      .eq('group_id', group.id)
      .order('settled_at', { ascending: true });

    const billData = (bills || []).map((b) => ({
      host_name: b.host_name,
      total: Number(b.total),
      contributions: (b.contributions || []).map((c: { person_name: string; amount: number }) => ({
        person_name: c.person_name,
        amount: Number(c.amount),
      })),
      // Include attendees if present (new attendee-based model)
      attendees: (b.bill_attendees && b.bill_attendees.length > 0)
        ? b.bill_attendees.map((a: { member_name: string; expected_amount: number }) => ({
            member_name: a.member_name,
            expected_amount: Number(a.expected_amount),
          }))
        : undefined,
    }));

    const settlementData = (settlements || []).map((s) => ({
      from_name: s.from_name,
      to_name: s.to_name,
      amount: Number(s.amount),
    }));

    const balances = computeBalances(billData, settlementData);

    return NextResponse.json({
      group: { id: group.id, name: group.name },
      ...balances,
      settlements: settlements || [],
      billCount: (bills || []).length,
    });
  } catch (error) {
    console.error('Balances computation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
