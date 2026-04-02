import { NextRequest, NextResponse } from 'next/server';
import { getUserBadges } from '@/lib/badges';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const badges = await getUserBadges(email);
    return NextResponse.json({ badges });
  } catch (error) {
    console.error('Badges fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
