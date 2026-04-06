'use client';

import { useEffect, useRef, useState } from 'react';
import { Nav } from '@/components/nav';
import { LinkButton } from '@/components/ui/link-button';
import { Plus } from 'lucide-react';

/* ================================================================
   Homepage — short, confident, mobile-first
   ================================================================ */

export default function Home() {
  return (
    <main className="bg-background overflow-x-hidden">
      <Nav />
      <HeroSection />
      <FeatureStrip />
      <HowItWorks />
      <StickyMobileCTA />
    </main>
  );
}

/* ------------------------------------------------------------------
   Sticky Mobile CTA — appears after scrolling past hero
   ------------------------------------------------------------------ */
function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const heroCta = document.getElementById('hero-cta');
    const bottomCta = document.getElementById('bottom-cta');
    if (!heroCta) return;

    // Track visibility of both CTAs
    let heroVisible = true;
    let bottomVisible = false;

    const update = () => setVisible(!heroVisible && !bottomVisible);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target.id === 'hero-cta') heroVisible = entry.isIntersecting;
          if (entry.target.id === 'bottom-cta') bottomVisible = entry.isIntersecting;
        }
        update();
      },
      { threshold: 0 }
    );
    observer.observe(heroCta);
    if (bottomCta) observer.observe(bottomCta);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-50 sm:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-background/95 backdrop-blur-md border-t border-border/60 px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <LinkButton
          href="/new"
          size="lg"
          className="cta-primary text-base w-full py-3 rounded-xl gap-2"
          aria-label="Create a new bill — free"
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
          Create a Bill — free
        </LinkButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Hero Section — full above-the-fold
   ------------------------------------------------------------------ */
function HeroSection() {
  return (
    <div className="gradient-mesh dot-grid noise-texture flex items-center justify-center relative">
      <section className="flex flex-col lg:flex-row items-center gap-8 lg:gap-20 px-6 max-w-6xl mx-auto w-full py-16 sm:py-24">
        {/* Copy */}
        <div className="flex-1 text-center lg:text-left space-y-5 enter">
          <h1 className="text-[clamp(2.25rem,8vw,6rem)] font-extrabold tracking-tight leading-[1.02] font-[family-name:var(--font-main)]">
            Split the bill.
            <br />
            <span className="text-gradient">Skip the drama.</span>
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-md mx-auto lg:mx-0 leading-relaxed enter enter-delay-1">
            Snap a receipt, share a link, get paid. Great for dinners, trips, roommates, parties, and any group expense. No app&nbsp;needed.
          </p>

          <div id="hero-cta" className="enter enter-delay-2">
            <LinkButton
              href="/new"
              size="lg"
              className="cta-primary animate-cta-glow text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-2xl gap-2 w-full sm:w-auto"
              aria-label="Create a new bill to split with friends — it's free"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
              Create a Bill — it&apos;s free
            </LinkButton>
          </div>
        </div>

        {/* Product mockup */}
        <div className="flex-1 max-w-sm w-full enter enter-delay-3 hidden sm:block">
          <ProductMockup />
        </div>

        <div className="sm:hidden w-full max-w-[280px] enter enter-delay-3">
          <MobileMockupTeaser />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------
   Product Mockup — desktop
   ------------------------------------------------------------------ */
function ProductMockup() {
  return (
    <div className="mockup-card p-5 sm:p-6 animate-float relative">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Friday dinner
          </p>
          <p className="text-2xl font-bold font-tnum mt-0.5">$142.50</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <span className="text-lg">🍕</span>
        </div>
      </div>

      <div className="gradient-divider mb-4" />

      <div className="space-y-3 mb-5">
        <ReceiptItem name="Margherita Pizza" price="$18.00" />
        <ReceiptItem name="Truffle Pasta" price="$24.50" />
        <ReceiptItem name="Caesar Salad" price="$14.00" />
        <ReceiptItem name="2× Craft Beer" price="$16.00" />
      </div>

      <div className="gradient-divider mb-4" />

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground font-medium">Paid so far</span>
          <span className="font-bold font-tnum text-success">$107.00 / $142.50</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-success to-emerald-300 rounded-full mockup-progress"
            style={{ width: '75%' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="mockup-avatar w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white">
          S
        </div>
        <div className="mockup-avatar w-8 h-8 rounded-full bg-gradient-to-br from-lavender to-violet-400 flex items-center justify-center text-xs font-bold text-white">
          J
        </div>
        <div className="mockup-avatar w-8 h-8 rounded-full bg-gradient-to-br from-success to-emerald-400 flex items-center justify-center text-xs font-bold text-white">
          M
        </div>
        <span className="text-xs text-muted-foreground ml-2 font-medium">
          3 of 4 paid ✓
        </span>
      </div>

      <div className="mockup-confetti-piece bg-primary" style={{ top: '20%', left: '10%' }} />
      <div className="mockup-confetti-piece bg-accent" style={{ top: '15%', right: '15%' }} />
      <div className="mockup-confetti-piece bg-coral" style={{ top: '25%', left: '30%' }} />
      <div className="mockup-confetti-piece bg-success" style={{ top: '10%', right: '30%' }} />
      <div className="mockup-confetti-piece bg-lavender" style={{ top: '20%', left: '50%' }} />
    </div>
  );
}

function ReceiptItem({ name, price }: { name: string; price: string }) {
  return (
    <div className="mockup-receipt-item flex items-center justify-between">
      <span className="text-sm text-card-foreground">{name}</span>
      <span className="text-sm font-semibold font-tnum text-card-foreground">
        {price}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------
   Mobile Mockup Teaser
   ------------------------------------------------------------------ */
function MobileMockupTeaser() {
  return (
    <div className="mockup-card p-4 relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Friday dinner
          </p>
          <p className="text-lg font-bold font-tnum">$142.50</p>
        </div>
        <span className="text-base">🍕</span>
      </div>
      <div className="gradient-divider mb-2.5" />
      <div className="space-y-1.5 mb-3">
        {['Margherita Pizza — $18', 'Truffle Pasta — $24.50', 'Caesar Salad — $14'].map(
          (item, i) => (
            <div key={i} className="mockup-receipt-item flex items-center justify-between">
              <span className="text-xs text-card-foreground">{item.split(' — ')[0]}</span>
              <span className="text-xs font-semibold font-tnum text-card-foreground">
                {item.split(' — ')[1]}
              </span>
            </div>
          )
        )}
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-success to-emerald-300 rounded-full mockup-progress"
          style={{ width: '75%' }}
        />
      </div>
      <div className="flex items-center gap-1">
        <div className="mockup-avatar w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[8px] font-bold text-white">
          S
        </div>
        <div className="mockup-avatar w-5 h-5 rounded-full bg-gradient-to-br from-lavender to-violet-400 flex items-center justify-center text-[8px] font-bold text-white">
          J
        </div>
        <div className="mockup-avatar w-5 h-5 rounded-full bg-gradient-to-br from-success to-emerald-400 flex items-center justify-center text-[8px] font-bold text-white">
          M
        </div>
        <span className="text-[10px] text-muted-foreground ml-1 font-medium">
          3 of 4 paid ✓
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Feature Strip — tight, no descriptions
   ------------------------------------------------------------------ */
function FeatureStrip() {
  const features = [
    'AI Receipt Scan',
    'No App Needed',
    'Settle Fast',
    'Always Free',
  ];

  return (
    <section className="border-y border-border/40 py-4 bg-secondary/30">
      <div className="flex items-center justify-center gap-4 sm:gap-10 px-4 max-w-4xl mx-auto flex-wrap">
        {features.map((feature, i) => (
          <span
            key={i}
            className="text-xs sm:text-sm font-semibold text-muted-foreground tracking-wide uppercase"
          >
            {feature}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   How It Works — 3 tight steps, one CTA at the end
   ------------------------------------------------------------------ */
function HowItWorks() {
  return (
    <section id="how-it-works" className="py-14 sm:py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3 text-center enter">
          How it works
        </p>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-center mb-10 sm:mb-14 font-[family-name:var(--font-main)] enter enter-delay-1">
          Three steps. Zero friction.
        </h2>

        <div className="space-y-8 sm:space-y-10">
          <Step num="01" title="Snap the receipt">
            Photo any receipt — AI reads every item, tax, and tip instantly.
          </Step>
          <Step num="02" title="Share the link">
            Drop one link in the group chat. Friends claim items on any phone.
          </Step>
          <Step num="03" title="Get paid">
            One-tap Venmo, Zelle, CashApp, or PayPal. See who&apos;s paid in real time.
          </Step>
        </div>

        {/* Single bottom CTA */}
        <div id="bottom-cta" className="text-center mt-12 sm:mt-16 scroll-reveal">
          <p className="text-muted-foreground mb-4 text-sm">
            Takes 30 seconds. Always free.
          </p>
          <LinkButton
            href="/new"
            size="lg"
            className="cta-primary text-base sm:text-lg px-10 py-5 sm:py-6 rounded-2xl gap-2"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            Split Your First Bill
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

function Step({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="scroll-reveal flex items-start gap-4 sm:gap-6">
      <span className="step-number flex-shrink-0">{num}</span>
      <div>
        <h3 className="text-lg sm:text-xl font-bold tracking-tight font-[family-name:var(--font-main)]">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mt-1">
          {children}
        </p>
      </div>
    </div>
  );
}
