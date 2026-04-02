import { escapeHtml } from './escape-html';

interface PaymentReminderProps {
  hostName: string;
  restaurantName: string;
  date: string;
  totalPaid: string;
  total: string;
  percent: number;
  remaining: string;
  contributorCount: number;
  billUrl: string;
  unsubscribeUrl: string;
}

export function renderPaymentReminder(props: PaymentReminderProps): string {
  // Sanitize all user-provided strings to prevent XSS
  const p = {
    ...props,
    hostName: escapeHtml(props.hostName),
    restaurantName: escapeHtml(props.restaurantName),
  };
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#fffbf5;">
  <div style="text-align:center;margin-bottom:24px">
    <span style="font-size:28px;font-weight:bold">🧾 Tidy<span style="color:#e67e22">Tab</span></span>
  </div>
  <div style="background:linear-gradient(135deg,#fef3e2 0%,#fff7ed 100%);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
    <div style="font-size:48px;margin-bottom:8px">💸</div>
    <h1 style="font-size:22px;font-weight:bold;color:#1c1917;margin:0 0 8px 0">${p.remaining} still outstanding</h1>
    <p style="color:#78716c;margin:0;font-size:16px">${p.restaurantName} · ${p.date}</p>
  </div>
  <p style="color:#44403c;font-size:16px;line-height:1.6">Hey ${p.hostName},</p>
  <p style="color:#44403c;font-size:16px;line-height:1.6">
    Your ${p.restaurantName} bill from ${p.date} still has <strong>${p.remaining}</strong> outstanding.
  </p>
  <div style="background:#f5f0e8;border-radius:12px;padding:20px;margin-bottom:24px">
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px"><tr>
      <td style="color:#78716c">💰 Collected</td>
      <td style="text-align:right;font-weight:bold">${p.totalPaid} of ${p.total} (${p.percent}%)</td>
    </tr></table>
    <div style="background:#ece5d8;border-radius:8px;height:8px;overflow:hidden;margin-bottom:12px">
      <div style="background:#e67e22;height:100%;width:${Math.min(p.percent, 100)}%;border-radius:8px"></div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="color:#78716c">👥 ${p.contributorCount} people have chipped in so far</td>
    </tr></table>
  </div>
  <p style="color:#44403c;font-size:16px;line-height:1.6">
    Maybe re-share the link with your group?
  </p>
  <div style="text-align:center;margin-bottom:32px">
    <a href="${p.billUrl}" style="display:inline-block;background:#e67e22;color:#ffffff;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px">📤 Share Bill Link</a>
  </div>
  <div style="text-align:center;color:#a8a29e;font-size:13px;border-top:1px solid #ece5d8;padding-top:16px">
    <p>TidyTab · Built with love ♥️ for MBA students who eat out too much 🎓</p>
    <p style="font-size:12px">
      <a href="${p.unsubscribeUrl}" style="color:#a8a29e;text-decoration:underline">Turn off reminders for this bill</a>
    </p>
  </div>
</body>
</html>`;
}
