import * as React from 'react';
import { escapeHtml } from './escape-html';

interface ContributionNotificationProps {
  hostName: string;
  personName: string;
  amount: string;
  restaurantName: string;
  totalPaid: string;
  total: string;
  percent: number;
  remaining: string;
  contributorCount: number;
  billUrl: string;
  manageUrl: string;
}

export function ContributionNotificationEmail({
  hostName,
  personName,
  amount,
  restaurantName,
  totalPaid,
  total,
  percent,
  remaining,
  contributorCount,
  billUrl,
  manageUrl,
}: ContributionNotificationProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '28px', fontWeight: 'bold' }}>
          🧾 Tidy<span style={{ color: "#e67e22" }}>Tab</span>
        </span>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #fef3e2 0%, #fff7ed 100%)',
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'center',
        marginBottom: '24px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1c1917', margin: '0 0 8px 0' }}>
          {personName} chipped in {amount}!
        </h1>
        <p style={{ color: '#78716c', margin: '0', fontSize: '16px' }}>
          for your {restaurantName} bill
        </p>
      </div>

      <p style={{ color: '#44403c', fontSize: '16px', lineHeight: '1.6' }}>
        Hey {hostName},
      </p>
      <p style={{ color: '#44403c', fontSize: '16px', lineHeight: '1.6' }}>
        <strong>{personName}</strong> just chipped in <strong>{amount}</strong> for your {restaurantName} bill.
      </p>

      <div style={{
        background: '#f5f0e8',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ color: '#78716c' }}>💰 Collected so far</span>
          <span style={{ fontWeight: 'bold' }}>{totalPaid} of {total} ({percent}%)</span>
        </div>
        <div style={{
          background: '#ece5d8',
          borderRadius: '8px',
          height: '8px',
          overflow: 'hidden',
          marginBottom: '12px',
        }}>
          <div style={{
            background: '#e67e22',
            height: '100%',
            width: `${Math.min(percent, 100)}%`,
            borderRadius: '8px',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#78716c' }}>
            📊 {Number(remaining.replace(/[^0-9.]/g, '')) <= 0 ? 'Fully covered! 🎉' : `${remaining} still outstanding`}
          </span>
          <span style={{ color: '#78716c' }}>👥 {contributorCount} chipped in</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <a
          href={billUrl}
          style={{
            display: 'inline-block',
            background: '#e67e22',
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '16px',
            marginRight: '12px',
          }}
        >
          View Bill →
        </a>
        <a
          href={manageUrl}
          style={{
            display: 'inline-block',
            background: '#f5f0e8',
            color: '#44403c',
            padding: '12px 32px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '16px',
          }}
        >
          Manage Bill
        </a>
      </div>

      <div style={{ textAlign: 'center', color: '#a8a29e', fontSize: '13px', borderTop: '1px solid #ece5d8', paddingTop: '16px' }}>
        <p>TidyTab · Built with love ♥️ for MBA students who eat out too much 🎓</p>
      </div>
    </div>
  );
}

export function renderContributionNotification(props: ContributionNotificationProps): string {
  // Simple HTML template for Resend (no React server rendering needed)
  // Sanitize all user-provided strings to prevent XSS
  const p = {
    ...props,
    personName: escapeHtml(props.personName),
    hostName: escapeHtml(props.hostName),
    restaurantName: escapeHtml(props.restaurantName),
  };
  const remainingNum = Number(p.remaining.replace(/[^0-9.]/g, ''));
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#fffbf5;">
  <div style="text-align:center;margin-bottom:24px">
    <span style="font-size:28px;font-weight:bold">🧾 Tidy<span style="color:#e67e22">Tab</span></span>
  </div>
  <div style="background:linear-gradient(135deg,#fef3e2 0%,#fff7ed 100%);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
    <div style="font-size:48px;margin-bottom:8px">🎉</div>
    <h1 style="font-size:24px;font-weight:bold;color:#1c1917;margin:0 0 8px 0">${p.personName} chipped in ${p.amount}!</h1>
    <p style="color:#78716c;margin:0;font-size:16px">for your ${p.restaurantName} bill</p>
  </div>
  <p style="color:#44403c;font-size:16px;line-height:1.6">Hey ${p.hostName},</p>
  <p style="color:#44403c;font-size:16px;line-height:1.6"><strong>${p.personName}</strong> just chipped in <strong>${p.amount}</strong> for your ${p.restaurantName} bill.</p>
  <div style="background:#f5f0e8;border-radius:12px;padding:20px;margin-bottom:24px">
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px"><tr>
      <td style="color:#78716c">💰 Collected so far</td>
      <td style="text-align:right;font-weight:bold">${p.totalPaid} of ${p.total} (${p.percent}%)</td>
    </tr></table>
    <div style="background:#ece5d8;border-radius:8px;height:8px;overflow:hidden;margin-bottom:12px">
      <div style="background:#e67e22;height:100%;width:${Math.min(p.percent, 100)}%;border-radius:8px"></div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="color:#78716c">📊 ${remainingNum <= 0 ? 'Fully covered! 🎉' : p.remaining + ' still outstanding'}</td>
      <td style="text-align:right;color:#78716c">👥 ${p.contributorCount} chipped in</td>
    </tr></table>
  </div>
  <div style="text-align:center;margin-bottom:32px">
    <a href="${p.billUrl}" style="display:inline-block;background:#e67e22;color:#ffffff;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;margin-right:12px">View Bill →</a>
    <a href="${p.manageUrl}" style="display:inline-block;background:#f5f0e8;color:#44403c;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px">Manage Bill</a>
  </div>
  <div style="text-align:center;color:#a8a29e;font-size:13px;border-top:1px solid #ece5d8;padding-top:16px">
    <p>TidyTab · Built with love ♥️ for MBA students who eat out too much 🎓</p>
  </div>
</body>
</html>`;
}
