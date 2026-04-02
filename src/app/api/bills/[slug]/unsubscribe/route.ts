import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return new NextResponse(renderPage('Missing token', false), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const supabase = createServerClient();

    // Verify the token matches the host_key
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('id, host_key, restaurant_name')
      .eq('slug', slug)
      .single();

    if (billError || !bill || bill.host_key !== token) {
      return new NextResponse(renderPage('Invalid link', false), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Disable notifications
    const { error: updateError } = await supabase
      .from('bills')
      .update({ email_notifications: false })
      .eq('id', bill.id);

    if (updateError) {
      return new NextResponse(renderPage('Something went wrong', false), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new NextResponse(
      renderPage(`Reminders turned off for "${bill.restaurant_name || 'this bill'}"`, true),
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch {
    return new NextResponse(renderPage('Something went wrong', false), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// Also support POST for form submissions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return GET(request, { params });
}

function renderPage(message: string, success: boolean): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TidyTab — Unsubscribe</title>
  <style>
    body { font-family: Arial, sans-serif; background: #fffbf5; color: #1c1917; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: white; border: 1px solid #ece5d8; border-radius: 16px; padding: 40px; max-width: 400px; text-align: center; }
    .emoji { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 0 0 12px; }
    p { color: #78716c; font-size: 14px; margin: 0; }
    a { color: #e67e22; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">${success ? '✅' : '❌'}</div>
    <h1>${message}</h1>
    <p>${success ? 'You won\'t receive any more reminder emails for this bill.' : 'Please try again or contact support.'}</p>
    <p style="margin-top: 16px"><a href="/">← Back to TidyTab</a></p>
  </div>
</body>
</html>`;
}
