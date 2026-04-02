import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const title = searchParams.get('title') || 'Shared Bill';
  const total = searchParams.get('total') || '0';
  const host = searchParams.get('host') || 'Someone';
  const progress = parseInt(searchParams.get('progress') || '0', 10);
  const count = searchParams.get('count') || '0';

  const progressPct = Math.min(Math.max(progress, 0), 100);
  const isComplete = progressPct >= 100;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 64px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: 'linear-gradient(135deg, #FFF5E8 0%, #FFECD2 40%, #FFF0DB 70%, #FFFBF5 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(230, 126, 34, 0.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-60px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.06)',
          }}
        />

        {/* Top: branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span
              style={{
                fontSize: '36px',
                fontWeight: 800,
                color: '#0F0F12',
                letterSpacing: '-0.5px',
              }}
            >
              tidy
            </span>
            <span
              style={{
                fontSize: '36px',
                fontWeight: 800,
                color: '#E67E22',
                letterSpacing: '-0.5px',
              }}
            >
              tab
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '20px',
              color: '#78716c',
            }}
          >
            {count !== '0' && (
              <span>
                {count} {parseInt(count) === 1 ? 'person' : 'people'}
              </span>
            )}
          </div>
        </div>

        {/* Middle: bill info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#0F0F12',
              lineHeight: 1.1,
              letterSpacing: '-1px',
              maxWidth: '900px',
              wordBreak: 'break-word',
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
            }}
          >
            <span
              style={{
                fontSize: '64px',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #E67E22, #F59E0B)',
                backgroundClip: 'text',
                color: 'transparent',
                letterSpacing: '-2px',
              }}
            >
              ${parseFloat(total).toFixed(2)}
            </span>
            <span style={{ fontSize: '22px', color: '#78716c' }}>hosted by {host}</span>
          </div>
        </div>

        {/* Bottom: progress bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '18px',
              color: '#78716c',
            }}
          >
            <span>{isComplete ? '✅ Fully covered!' : `${progressPct}% collected`}</span>
            <span>Tap to chip in →</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '16px',
              borderRadius: '8px',
              background: 'rgba(230, 126, 34, 0.12)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                borderRadius: '8px',
                background: isComplete
                  ? 'linear-gradient(90deg, #34D399, #10B981)'
                  : 'linear-gradient(90deg, #E67E22, #F59E0B)',
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
