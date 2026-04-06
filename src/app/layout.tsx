import type { Metadata } from 'next';
import { Space_Grotesk, Newsreader } from 'next/font/google';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { SWRegister } from '@/components/sw-register';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-main',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TidyTab — Split the Bill. Skip the Drama.',
  description:
    'The easiest way to split group dinner bills. Snap a receipt photo, AI reads every item, share a link — everyone pays in one tap. Free, no app download needed.',
  keywords: [
    'split bill app', 'bill splitting', 'split dinner bill', 'group bill calculator',
    'restaurant bill splitter', 'Venmo bill split', 'receipt scanner', 'split check app',
    'share bill with friends', 'split the tab', 'meal cost splitter', 'group payment app',
  ],
  manifest: '/manifest.json',
  icons: {
    apple: '/apple-touch-icon.png',
  },
  other: {
    'theme-color': '#F59E0B',
  },
  openGraph: {
    title: 'TidyTab — Split the Bill. Skip the Drama.',
    description:
      'Snap a receipt, share a link, everyone pays in one tap. Free, no app, no signup.',
    type: 'website',
    siteName: 'TidyTab',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TidyTab — Split the Bill. Skip the Drama.',
    description:
      'Snap a receipt, share a link, everyone pays in one tap. Free, no app, no signup.',
  },
  metadataBase: new URL('https://tidytab.app'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${newsreader.variable} antialiased bg-background`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'TidyTab',
              url: 'https://tidytab.app',
              description: 'The easiest way to split group dinner bills. AI-powered receipt scanning, instant sharing, one-tap payments.',
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Any',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              featureList: [
                'AI receipt scanning',
                'One-tap bill splitting',
                'Venmo, Zelle, CashApp, PayPal integration',
                'No app download required',
                'Real-time contribution tracking',
              ],
            }),
          }}
        />
        <div className="flex flex-col min-h-svh">
          <PWAInstallPrompt />
          <div className="flex-1">{children}</div>
          <SWRegister />
          <Analytics />
      <SpeedInsights />

          {/* Footer */}
          <footer className="border-t border-border/30 py-8 sm:py-10 bg-background">
            <div className="max-w-3xl mx-auto px-6 flex flex-col items-center gap-3">
              <Link href="/" className="text-sm font-bold font-[family-name:var(--font-main)] opacity-60 hover:opacity-100 transition-opacity">
                <span className="font-extrabold">tidy</span>
                <span className="text-primary font-extrabold">tab</span>
              </Link>
              <p className="text-sm text-muted-foreground text-center leading-relaxed font-serif italic">
                Built by Terry with love ♥️ for MBA cohorts who eat out too
                much 🎓
              </p>
              <div className="flex items-center gap-6 text-xs text-muted-foreground/70">
                <a
                  href="/about"
                  className="link-fancy hover:text-foreground transition-colors py-2 px-1 min-h-[44px] flex items-center"
                >
                  About
                </a>
                <span className="text-border" aria-hidden="true">·</span>
                <a
                  href="mailto:hello@tidytab.app"
                  className="link-fancy hover:text-foreground transition-colors py-2 px-1 min-h-[44px] flex items-center"
                >
                  Contact
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
