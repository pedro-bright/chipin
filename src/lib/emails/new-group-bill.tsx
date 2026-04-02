import { escapeHtml } from './escape-html';

interface NewGroupBillEmailProps {
  memberName: string;
  groupName: string;
  groupEmoji: string;
  hostName: string;
  billName: string;
  billTotal: string;
  memberShare: string;
  billUrl: string;
  unsubscribeUrl: string;
}

export function renderNewGroupBillEmail({
  memberName,
  groupName,
  groupEmoji,
  hostName,
  billName,
  billTotal,
  memberShare,
  billUrl,
  unsubscribeUrl,
}: NewGroupBillEmailProps): string {
  const p = {
    memberName: escapeHtml(memberName),
    groupName: escapeHtml(groupName),
    groupEmoji: escapeHtml(groupEmoji),
    hostName: escapeHtml(hostName),
    billName: escapeHtml(billName),
    billTotal: escapeHtml(billTotal),
    memberShare: escapeHtml(memberShare),
    billUrl,
    unsubscribeUrl,
  };

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#fffbf5;">
  <div style="text-align:center;margin-bottom:24px">
    <span style="font-size:28px;font-weight:bold">🧾 Tidy<span style="color:#e67e22">Tab</span></span>
  </div>

  <div style="background:linear-gradient(135deg,#fef3e2 0%,#fff7ed 100%);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
    <div style="font-size:48px;margin-bottom:8px">${p.groupEmoji}</div>
    <h1 style="font-size:22px;font-weight:bold;color:#1c1917;margin:0 0 8px 0">
      New bill in ${p.groupName}!
    </h1>
    <p style="color:#78716c;margin:0;font-size:16px">
      ${p.hostName} added <strong>${p.billName}</strong>
    </p>
  </div>

  <p style="color:#44403c;font-size:16px;line-height:1.6">
    Hey ${p.memberName},
  </p>
  <p style="color:#44403c;font-size:16px;line-height:1.6">
    <strong>${p.hostName}</strong> just posted a new bill to <strong>${p.groupName}</strong>.
  </p>

  <div style="background:#f5f0e8;border-radius:12px;padding:20px;margin-bottom:24px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="color:#78716c;padding-bottom:12px">🧾 Bill</td>
        <td style="text-align:right;font-weight:bold;padding-bottom:12px">${p.billName}</td>
      </tr>
      <tr>
        <td style="color:#78716c;padding-bottom:12px">💰 Total</td>
        <td style="text-align:right;font-weight:bold;padding-bottom:12px">${p.billTotal}</td>
      </tr>
      <tr>
        <td style="color:#78716c">🎯 Your share</td>
        <td style="text-align:right;font-weight:bold;font-size:18px;color:#e67e22">${p.memberShare}</td>
      </tr>
    </table>
  </div>

  <div style="text-align:center;margin-bottom:32px">
    <a href="${p.billUrl}" style="display:inline-block;background:#e67e22;color:#ffffff;padding:14px 40px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px">
      Tap to Pay →
    </a>
  </div>

  <div style="text-align:center;color:#a8a29e;font-size:13px;border-top:1px solid #ece5d8;padding-top:16px">
    <p>TidyTab · Split bills without the drama 🎓</p>
    <p style="margin-top:8px">
      <a href="${p.unsubscribeUrl}" style="color:#a8a29e;text-decoration:underline">Unsubscribe from group notifications</a>
    </p>
  </div>
</body>
</html>`;
}
