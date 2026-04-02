import Link from 'next/link';
import { Mail, ArrowLeft, Users, Receipt, DollarSign } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — TidyTab',
  description:
    'TidyTab is the easiest way to split bills with friends. No app downloads, no sign-ups. Just snap, share, and get paid.',
};

export default function AboutPage() {
  return (
    <main className="bg-background min-h-dvh">
      {/* Header — branding matches shared Nav exactly */}
      <nav className="glass-nav nav-shadow sticky top-0 z-50 px-4 sm:px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg sm:text-xl tracking-tight font-[family-name:var(--font-main)]">
            <span className="font-bold text-foreground">tidy</span>
            <span className="font-bold text-primary">tab</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to app
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-5 enter">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-[family-name:var(--font-main)]">
            About{' '}
            <span className="font-extrabold">tidy</span>
            <span className="text-primary font-extrabold">tab</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            The easiest way to split bills with friends — no app downloads, no sign-ups, no
            awkwardness.
          </p>
        </div>

        {/* Feature strip — badges with more visual weight */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 enter enter-delay-1">
          {[
            { icon: Receipt, value: 'AI', label: 'Receipt Scanning', color: 'text-primary', bg: 'from-primary/10 to-accent/5' },
            { icon: DollarSign, value: 'Free', label: 'No Paywalls', color: 'text-success', bg: 'from-success/10 to-emerald-400/5' },
            { icon: Users, value: 'Link', label: 'No App Needed', color: 'text-lavender', bg: 'from-lavender/10 to-violet-400/5' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-5 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-layered"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.bg} flex items-center justify-center mx-auto mb-3`}>
                <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-[family-name:var(--font-main)] tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Terry's Story */}
        <div className="space-y-6 enter enter-delay-2">
          <h2 className="text-2xl font-extrabold font-[family-name:var(--font-main)]">
            The Story
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              I built TidyTab after a 12-person dinner where I fronted the bill and spent three days
              sending individual Venmo requests, calculating everyone&apos;s share of tax and tip, and
              fielding &ldquo;wait, did I have the appetizer?&rdquo; messages.
              There had to be a better way — so I built one over a weekend. Snap the receipt, share
              a link, let people chip in. No app downloads, no sign-ups for your friends.
            </p>
          </div>
        </div>

        {/* How it works — quick */}
        <div className="space-y-6 enter enter-delay-3">
          <h2 className="text-3xl sm:text-4xl font-semibold font-serif italic tracking-tight">
            Dead Simple
          </h2>
          <div className="space-y-8 sm:space-y-10">
            {[
              {
                step: '01',
                title: 'Snap the receipt',
                desc: 'AI reads every line item, tax, and tip.',
              },
              {
                step: '02',
                title: 'Share a link',
                desc: 'Text, WhatsApp, whatever. No app needed.',
              },
              {
                step: '03',
                title: 'Get paid',
                desc: 'Venmo, Zelle, CashApp, or PayPal — one tap.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-4 sm:gap-6"
              >
                <span className="step-number flex-shrink-0">{item.step}</span>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight font-[family-name:var(--font-main)]">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="space-y-6 enter enter-delay-4">
          <h2 className="text-2xl font-extrabold font-[family-name:var(--font-main)]">
            What I Believe
          </h2>
          <div className="grid gap-4">
            {[
              {
                title: 'Zero friction > features',
                desc: "Every extra tap is a chance for someone to give up.",
              },
              {
                title: 'Free means free',
                desc: 'No paywalls, no limits. The core product is free, forever.',
              },
            ].map((value) => (
              <div
                key={value.title}
                className="p-5 rounded-2xl bg-card border border-border/60"
              >
                <h3 className="font-semibold font-[family-name:var(--font-main)]">
                  {value.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Groups */}
        <div id="groups" className="space-y-6 enter enter-delay-5">
          <h2 className="text-2xl font-extrabold font-[family-name:var(--font-main)]">
            Groups
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Split with the same people regularly? Save everyone&apos;s payment info once, then just pick the group and go.
          </p>
          <div className="grid gap-3">
            {[
              { title: 'Saved payment info', desc: 'Venmo, Zelle, CashApp, PayPal — stored once.' },
              { title: 'Bill history', desc: 'See who owes what at a glance.' },
              { title: 'Invite link', desc: 'New members add themselves.' },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-2xl bg-card border border-border/60 flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm font-[family-name:var(--font-main)]">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/groups/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
          >
            <Users className="w-5 h-5" />
            Create a Group
          </Link>
        </div>

        {/* Contact */}
        <div className="space-y-6 enter enter-delay-5">
          <h2 className="text-2xl font-extrabold font-[family-name:var(--font-main)]">
            Get in Touch
          </h2>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 space-y-4">
            <p className="text-muted-foreground">
              Feedback, bugs, or just saying hi — I&apos;d love to hear from you.
            </p>
            <a
              href="mailto:hello@tidytab.app"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
            >
              <Mail className="w-5 h-5" />
              hello@tidytab.app
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
