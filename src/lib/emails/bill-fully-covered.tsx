import { escapeHtml } from './escape-html';

interface BillFullyCoveredProps {
  hostName: string;
  restaurantName: string;
  total: string;
  contributorCount: number;
  contributors: { name: string; amount: string }[];
  billUrl: string;
  manageUrl: string;
}

export function renderBillFullyCovered(props: BillFullyCoveredProps): string {
  // Sanitize all user-provided strings to prevent XSS
  const p = {
    ...props,
    hostName: escapeHtml(props.hostName),
    restaurantName: escapeHtml(props.restaurantName),
    contributors: props.contributors.map((c) => ({
      name: escapeHtml(c.name),
      amount: c.amount,
    })),
  };
  const contributorRows = p.contributors
    .map(
      (c) => `
    <tr>
      <td style="padding:8px 0;color:#44403c">${c.name}</td>
      <td style="padding:8px 0;text-align:right;font-weight:bold;color:#22c55e">${c.amount}</td>
    </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#fffbf5;">
  <div style="text-align:center;margin-bottom:24px">
    <span style="font-size:28px;font-weight:bold">🧾 Tidy<span style="color:#e67e22">Tab</span></span>
  </div>
  <div style="background:linear-gradient(135deg,#dcfce7 0%,#f0fdf4 100%);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
    <div style="font-size:48px;margin-bottom:8px">🎉🎉🎉</div>
    <h1 style="font-size:24px;font-weight:bold;color:#166534;margin:0 0 8px 0">Your bill is fully covered!</h1>
    <p style="color:#4ade80;margin:0;font-size:18px;font-weight:bold">${p.total} for ${p.restaurantName}</p>
  </div>
  <p style="color:#44403c;font-size:16px;line-height:1.6">Hey ${p.hostName}! 🥳</p>
  <p style="color:#44403c;font-size:16px;line-height:1.6">
    Great news — your ${p.restaurantName} bill has been fully covered by ${p.contributorCount} people!
  </p>
  <div style="background:#f5f0e8;border-radius:12px;padding:20px;margin-bottom:24px">
    <h3 style="margin:0 0 12px 0;color:#1c1917;font-size:16px">Who chipped in</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      ${contributorRows}
      <tr style="border-top:2px solid #ece5d8">
        <td style="padding:12px 0 0;font-weight:bold;color:#1c1917;font-size:16px">Total</td>
        <td style="padding:12px 0 0;text-align:right;font-weight:bold;color:#1c1917;font-size:16px">${p.total}</td>
      </tr>
    </table>
  </div>
  <p style="color:#44403c;font-size:16px;line-height:1.6">
    You can mark this bill as settled from your dashboard or the manage page.
  </p>
  <div style="text-align:center;margin-bottom:32px">
    <a href="${p.manageUrl}" style="display:inline-block;background:#22c55e;color:#ffffff;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;margin-right:12px">✅ Mark as Settled</a>
    <a href="${p.billUrl}" style="display:inline-block;background:#f5f0e8;color:#44403c;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px">View Bill</a>
  </div>
  <div style="text-align:center;color:#a8a29e;font-size:13px;border-top:1px solid #ece5d8;padding-top:16px">
    <p>TidyTab · Built with love ♥️ for MBA students who eat out too much 🎓</p>
  </div>
</body>
</html>`;
}
