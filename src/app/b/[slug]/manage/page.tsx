'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, sanitizeVenmoHandle, sanitizeCashAppHandle, sanitizePayPalHandle } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { BillWithItems, Contribution, BillItem } from '@/lib/types';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Lock,
  Eye,
  Copy,
  Share2,
  Plus,
  DollarSign,
  Trash2,
  Send,
  Clock3,
  ChevronDown,
  ChevronUp,
  Settings2,
  Receipt,
} from 'lucide-react';

export default function ManagePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const hostKey = searchParams.get('key') || '';
  const authMode = searchParams.get('auth') === 'true';

  const [bill, setBill] = useState<BillWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingContribution, setAddingContribution] = useState(false);
  const [newContribName, setNewContribName] = useState('');
  const [newContribAmount, setNewContribAmount] = useState('');
  const [newContribMethod, setNewContribMethod] = useState('cash');
  const [linkCopied, setLinkCopied] = useState(false);
  const [deletingContribId, setDeletingContribId] = useState<string | null>(null);
  const [confirmDeleteContrib, setConfirmDeleteContrib] = useState<Contribution | null>(null);
  const [settlingBill, setSettlingBill] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [reminderCopied, setReminderCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showItems, setShowItems] = useState(false);

  // Editable fields
  const [restaurantName, setRestaurantName] = useState('');
  const [venmoHandle, setVenmoHandle] = useState('');
  const [zelleInfo, setZelleInfo] = useState('');
  const [cashappHandle, setCashappHandle] = useState('');
  const [paypalHandle, setPaypalHandle] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchBill();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: fetch on mount/slug change only
  }, [slug]);

  const fetchBill = async () => {
    try {
      // Build URL with auth params so server can verify access
      const effectiveKey = hostKey || localStorage.getItem(`chipin_host_key_${slug}`) || '';
      const fetchParams = new URLSearchParams();
      if (effectiveKey) fetchParams.set('key', effectiveKey);
      if (authMode) fetchParams.set('auth', 'true');
      const qs = fetchParams.toString();

      const res = await fetch(`/api/bills/${slug}${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Bill not found');
      const data = await res.json();

      if (!data.isHostAuthorized) {
        setError('You don\'t have permission to manage this bill.');
        setLoading(false);
        return;
      }

      setBill(data);
      setRestaurantName(data.restaurant_name || '');
      setVenmoHandle(data.venmo_handle || '');
      setZelleInfo(data.zelle_info || '');
      setCashappHandle(data.cashapp_handle || '');
      setPaypalHandle(data.paypal_handle || '');
      setStatus(data.status);
    } catch {
      setError('Failed to load bill');
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveHostKey = () => {
    return hostKey || bill?.host_key || localStorage.getItem(`chipin_host_key_${slug}`) || '';
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bills/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_key: getEffectiveHostKey(),
          restaurant_name: restaurantName,
          venmo_handle: venmoHandle ? venmoHandle.replace(/^@/, '') : null,
          zelle_info: zelleInfo || null,
          cashapp_handle: cashappHandle ? cashappHandle.replace(/^\$/, '') : null,
          paypal_handle: paypalHandle || null,
          status,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      await fetchBill();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    // If changing status to settled and bill isn't fully covered, confirm first
    if (status === 'settled' && bill && bill.status !== 'settled' && remaining > 0) {
      setShowSettleConfirm(true);
      return;
    }
    await executeSave();
  };

  const handleAddContribution = async () => {
    if (!newContribName.trim() || !newContribAmount) return;
    setAddingContribution(true);
    try {
      const res = await fetch(`/api/bills/${slug}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_name: newContribName,
          amount: Number(newContribAmount),
          payment_method: newContribMethod,
          note: 'Added by host',
        }),
      });
      if (!res.ok) throw new Error('Failed to add contribution');
      setNewContribName('');
      setNewContribAmount('');
      setNewContribMethod('cash');
      await fetchBill();
    } catch {
      setError('Failed to add contribution');
    } finally {
      setAddingContribution(false);
    }
  };

  const handleDeleteContribution = async (contribId: string) => {
    setDeletingContribId(contribId);
    try {
      const res = await fetch(`/api/bills/${slug}/contributions/${contribId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_key: hostKey }),
      });
      if (!res.ok) throw new Error('Delete failed');
      await fetchBill();
    } catch {
      setError('Failed to delete contribution');
    } finally {
      setDeletingContribId(null);
    }
  };

  const [showSettleConfirm, setShowSettleConfirm] = useState(false);

  const executeSettle = async () => {
    setSettlingBill(true);
    setShowSettleConfirm(false);
    try {
      const res = await fetch(`/api/bills/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_key: getEffectiveHostKey(),
          status: 'settled',
        }),
      });
      if (!res.ok) throw new Error('Failed to settle');
      setStatus('settled');
      await fetchBill();
    } catch {
      setError('Failed to settle bill');
    } finally {
      setSettlingBill(false);
    }
  };

  const handleQuickSettle = async () => {
    // If bill isn't fully covered, confirm first
    if (bill && remaining > 0) {
      setShowSettleConfirm(true);
      return;
    }
    await executeSettle();
  };

  if (loading) {
    return (
      <main className="bg-background">
        <header className="glass-header border-b border-border/50 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (error && !bill) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-muted mx-auto flex items-center justify-center">
              <Lock className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium font-[family-name:var(--font-main)]">{error}</p>
            <Link href={`/b/${slug}`}>
              <Button className="gap-2">
                <Eye className="w-4 h-4" /> View Bill
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bill) return null;

  const activeContributions = (bill.contributions || []).filter(
    (c: Contribution) => (c as unknown as { note?: string }).note !== '[cancelled]' && (c as unknown as { note?: string }).note !== '[pending]'
  );
  const pendingContributions = (bill.contributions || []).filter(
    (c: Contribution) => (c as unknown as { note?: string }).note === '[pending]'
  );
  const confirmedContributions = activeContributions
    .slice()
    .sort((a: Contribution, b: Contribution) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const totalPaid = activeContributions.reduce((sum: number, c: Contribution) => sum + Number(c.amount), 0);
  const remaining = Math.max(Math.round((bill.total - totalPaid) * 100) / 100, 0);
  const totalContributionCount = (bill.contributions || []).filter(
    (c: Contribution) => (c as unknown as { note?: string }).note !== '[cancelled]'
  ).length;
  const paidCount = confirmedContributions.length;
  const pendingCount = pendingContributions.length;
  const attendeeCount = bill.bill_attendees?.length || bill.person_count || 0;
  const unpaidCount = attendeeCount > 0 ? Math.max(attendeeCount - paidCount - pendingCount, 0) : 0;
  const progressPercent = bill.total > 0 ? Math.min((totalPaid / bill.total) * 100, 100) : 0;
  const billUrl = typeof window !== 'undefined' ? `${window.location.origin}/b/${slug}` : `/b/${slug}`;
  const reminderText = pendingCount > 0
    ? `Quick tidyTab check for ${bill.restaurant_name || 'the bill'}: ${formatCurrency(remaining)} is still outstanding, and ${pendingCount} payment${pendingCount > 1 ? 's are awaiting confirmation' : ' is awaiting confirmation'}. Pay here: ${billUrl}`
    : `Quick reminder for ${bill.restaurant_name || 'the bill'}: ${remaining > 0 ? `${formatCurrency(remaining)} is still left to cover. ` : ''}Pay here: ${billUrl}`;
  const statusLabel = status === 'settled'
    ? 'Settled'
    : remaining <= 0
      ? 'Ready to settle'
      : pendingCount > 0
        ? 'Needs review'
        : 'Collection in progress';
  const statusTone = status === 'settled'
    ? 'text-success'
    : remaining <= 0
      ? 'text-success'
      : pendingCount > 0
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-primary';

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(billUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleCopyReminder = async () => {
    await navigator.clipboard.writeText(reminderText);
    setReminderCopied(true);
    setTimeout(() => setReminderCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      await handleCopyLink();
      return;
    }

    setSharing(true);
    try {
      await navigator.share({
        title: bill.restaurant_name || 'TidyTab bill',
        text: reminderText,
        url: billUrl,
      });
    } catch {
      // ignore cancel
    } finally {
      setSharing(false);
    }
  };

  return (
    <main className="bg-background">
      <header className="glass-header sticky top-0 z-50 border-b border-border/50 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-[family-name:var(--font-main)]">
            <span className="font-extrabold">tidy</span>
            <span className="text-primary font-extrabold">tab</span>
          </Link>
          <Link href={`/b/${slug}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back to Bill
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-main)]">Manage Bill</h1>
          <p className="text-muted-foreground">{bill.restaurant_name}</p>
        </div>

        {/* Quick Settle Banner — when bill is fully covered */}
        {remaining <= 0 && totalPaid > 0 && status !== 'settled' && (
          <Card className="bg-success/10 border-success/20 animate-spring-in">
            <CardContent className="pt-5 pb-5 text-center space-y-3">
              <p className="text-lg font-bold text-foreground font-[family-name:var(--font-main)]">
                🎉 Fully covered!
              </p>
              <p className="text-sm text-muted-foreground">
                Everyone&apos;s chipped in. Mark it as settled to archive it.
              </p>
              <Button
                onClick={handleQuickSettle}
                disabled={settlingBill}
                className="gap-2 bg-success hover:bg-success/90 text-white"
              >
                {settlingBill ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Settling...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Mark as Settled</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Collection Status */}
        <Card className={`${status === 'settled' ? 'bg-success/5 border-success/20' : 'bg-primary/5 border-primary/20'}`}>
          <CardContent className="pt-6 space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1 min-w-0 lg:flex-1">
                <p className="text-sm text-muted-foreground">Host collection status</p>
                <h2 className={`text-2xl font-bold font-[family-name:var(--font-main)] ${statusTone}`}>
                  {statusLabel}
                </h2>
                <p className="text-sm text-muted-foreground max-w-md pr-0 lg:pr-4 break-words text-balance">
                  {status === 'settled'
                    ? 'This bill is closed out and archived.'
                    : remaining <= 0
                      ? 'Everything is covered. One tap settles and clears it off your plate.'
                      : pendingCount > 0
                        ? `${formatCurrency(remaining)} is still open, and you have ${pendingCount} payment${pendingCount > 1 ? 's' : ''} waiting for confirmation.`
                        : `${formatCurrency(remaining)} is still open. Share the link or record outside payments to finish this off.`}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-[280px] lg:flex-none">
                <Button onClick={handleNativeShare} className="gap-2 min-w-0" disabled={sharing}>
                  <Share2 className="w-4 h-4" />
                  {sharing ? 'Sharing...' : 'Share'}
                </Button>
                <Button onClick={handleCopyReminder} variant="outline" className="gap-2 min-w-0 px-3 text-sm sm:text-[13px] lg:text-sm">
                  {reminderCopied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Send className="w-4 h-4" />}
                  {reminderCopied ? 'Copied' : 'Copy Reminder'}
                </Button>
                <Button onClick={handleQuickSettle} variant="outline" className="gap-2 sm:col-span-2 min-w-0" disabled={settlingBill || status === 'settled'}>
                  <CheckCircle2 className="w-4 h-4" />
                  {status === 'settled' ? 'Already Settled' : settlingBill ? 'Settling...' : 'Mark as Settled'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-background/80 border border-border/60 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Total</p>
                <p className="mt-1 text-xl font-bold font-[family-name:var(--font-main)] font-tnum">{formatCurrency(bill.total)}</p>
              </div>
              <div className="rounded-2xl bg-background/80 border border-border/60 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Collected</p>
                <p className="mt-1 text-xl font-bold text-success font-[family-name:var(--font-main)] font-tnum">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="rounded-2xl bg-background/80 border border-border/60 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Remaining</p>
                <p className="mt-1 text-xl font-bold text-primary font-[family-name:var(--font-main)] font-tnum">{status === 'settled' ? formatCurrency(0) : formatCurrency(remaining)}</p>
              </div>
              <div className="rounded-2xl bg-background/80 border border-border/60 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Payments</p>
                <p className="mt-1 text-xl font-bold font-[family-name:var(--font-main)] font-tnum">{paidCount}{pendingCount > 0 ? ` + ${pendingCount}` : ''}</p>
              </div>
            </div>

            {bill.total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{progressPercent.toFixed(0)}% covered</span>
                  <span>{paidCount} confirmed{pendingCount > 0 ? ` • ${pendingCount} pending` : ''}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-success to-emerald-300 rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Needs Attention */}
        {(pendingCount > 0 || remaining > 0 || unpaidCount > 0) && status !== 'settled' && (
          <Card className="border-amber-500/25 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingCount > 0 && (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/15 bg-background/70 p-3">
                  <div>
                    <p className="font-medium">Confirm pending payments</p>
                    <p className="text-sm text-muted-foreground">
                      {pendingCount} payment{pendingCount > 1 ? 's are' : ' is'} waiting for you to confirm.
                    </p>
                  </div>
                  <Badge variant="secondary">{pendingCount}</Badge>
                </div>
              )}
              {remaining > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-3">
                  <div className="min-w-0">
                    <p className="font-medium">Keep collection moving</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(remaining)} is still outstanding{unpaidCount > 0 ? ` across about ${unpaidCount} unpaid ${unpaidCount === 1 ? 'person' : 'people'}` : ''}.
                    </p>
                  </div>
                  <Badge variant="outline" className="self-start sm:self-center">Open balance</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add Contribution Manually */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Record a Payment
            </CardTitle>
            <p className="text-sm text-muted-foreground">Got cash or a Venmo outside TidyTab? Log it here</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Person&apos;s Name</label>
              <Input
                value={newContribName}
                onChange={(e) => setNewContribName(e.target.value)}
                placeholder="e.g., Sarah"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Amount</label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newContribAmount}
                  onChange={(e) => setNewContribAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {/* Quick-fill with split amount or remaining */}
              {bill.total > 0 && (
                <div className="flex gap-2 mt-2">
                  {bill.person_count && bill.person_count > 0 && (
                    <button
                      type="button"
                      onClick={() => setNewContribAmount(String((bill.total / bill.person_count!).toFixed(2)))}
                      className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      Split: {formatCurrency(bill.total / bill.person_count!)}
                    </button>
                  )}
                  {remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => setNewContribAmount(String(remaining.toFixed(2)))}
                      className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-medium"
                    >
                      Remaining: {formatCurrency(remaining)}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Payment Method</label>
              <select
                value={newContribMethod}
                onChange={(e) => setNewContribMethod(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="cash">Cash</option>
                <option value="venmo">Venmo</option>
                <option value="zelle">Zelle</option>
                <option value="cashapp">CashApp</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Button
              onClick={handleAddContribution}
              className="w-full"
              disabled={addingContribution || !newContribName.trim() || !newContribAmount}
            >
              {addingContribution ? 'Adding...' : 'Record Payment'}
            </Button>
          </CardContent>
        </Card>

        {/* Share / Remind */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Share & Remind
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                readOnly
                value={billUrl}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                className="gap-1.5 shrink-0"
                onClick={handleCopyLink}
              >
                {linkCopied ? (
                  <><CheckCircle2 className="w-4 h-4 text-success" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy</>
                )}
              </Button>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-medium">Suggested reminder</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{reminderText}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleCopyReminder} variant="outline" className="gap-2">
                  {reminderCopied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Send className="w-4 h-4" />}
                  {reminderCopied ? 'Reminder copied' : 'Copy reminder text'}
                </Button>
                <Button onClick={handleNativeShare} className="gap-2" disabled={sharing}>
                  <Share2 className="w-4 h-4" />
                  {sharing ? 'Sharing...' : 'Share bill'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contributions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payments ({totalContributionCount})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {pendingContributions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Needs confirmation</p>
                  <Badge variant="secondary">{pendingContributions.length}</Badge>
                </div>
                <div className="space-y-2">
                  {pendingContributions
                    .slice()
                    .sort((a: Contribution, b: Contribution) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((c: Contribution) => (
                      <div key={c.id} className="flex items-center justify-between py-3 px-3 rounded-xl bg-amber-500/5 border border-amber-500/15 gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{c.person_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {c.payment_method} · awaiting confirmation
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline">{formatCurrency(Number(c.amount))}</Badge>
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/bills/${bill.slug}/contribute`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ contribution_id: c.id, note: null }),
                                });
                                await fetchBill();
                              } catch {
                                setError('Failed to confirm payment');
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                          >
                            ✓ Confirm Paid
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Recorded payments</p>
                <Badge variant="outline">{confirmedContributions.length}</Badge>
              </div>

              {confirmedContributions.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-3xl">📬</p>
                  <p className="text-muted-foreground font-medium">
                    No confirmed payments yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Share the bill or record a payment to get collection moving.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {confirmedContributions.map((c: Contribution) => (
                    <div key={c.id} className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-xl hover:bg-muted/30 transition-colors group">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{c.person_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {c.payment_method}
                          {(c as unknown as { note?: string }).note && (
                            <span className="ml-1 opacity-60">· {(c as unknown as { note?: string }).note}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="success">{formatCurrency(Number(c.amount))}</Badge>
                        <button
                          onClick={() => setConfirmDeleteContrib(c)}
                          disabled={deletingContribId === c.id}
                          className="sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg hover:bg-coral/10 text-muted-foreground hover:text-coral transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                          aria-label={`Delete ${c.person_name}'s contribution`}
                        >
                          {deletingContribId === c.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bill Settings */}
        <Card>
          <CardHeader>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between text-left"
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Bill Settings
              </CardTitle>
              {showSettings ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {showSettings && (
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Restaurant Name</label>
                <Input value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Venmo Handle</label>
                <Input value={venmoHandle} onChange={(e) => setVenmoHandle(sanitizeVenmoHandle(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Zelle Info</label>
                <Input value={zelleInfo} onChange={(e) => setZelleInfo(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">CashApp Handle</label>
                <Input value={cashappHandle} onChange={(e) => setCashappHandle(sanitizeCashAppHandle(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">PayPal.me Username</label>
                <Input value={paypalHandle} onChange={(e) => setPaypalHandle(sanitizePayPalHandle(e.target.value))} placeholder="e.g., johndoe" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="published">Published</option>
                  <option value="settled">Settled (Closed)</option>
                </select>
              </div>
              <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <button
              type="button"
              onClick={() => setShowItems(!showItems)}
              className="w-full flex items-center justify-between text-left"
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Receipt Items ({bill.bill_items?.length || 0})
              </CardTitle>
              {showItems ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {showItems && (
            <CardContent>
              <div className="divide-y divide-border/60">
                {bill.bill_items?.map((item: BillItem) => (
                  <div key={item.id} className="flex justify-between py-2 gap-3">
                    <span>{item.name} {item.quantity > 1 ? `×${item.quantity}` : ''}</span>
                    <span className="font-medium shrink-0">{formatCurrency(Number(item.price))}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Confirmation dialog for deleting contribution — portaled to body root */}
      {confirmDeleteContrib && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" style={{ touchAction: 'none' }}>
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setConfirmDeleteContrib(null)}
          />
          <div className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-6 space-y-4 animate-slide-up sm:animate-scale-fade-in safe-area-pb" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-coral/10 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-coral" />
              </div>
              <h3 className="text-lg font-bold font-[family-name:var(--font-main)]">
                Remove Payment?
              </h3>
              <p className="text-sm text-muted-foreground">
                Remove {confirmDeleteContrib.person_name}&apos;s{' '}
                <span className="font-semibold text-foreground">
                  {formatCurrency(Number(confirmDeleteContrib.amount))}
                </span>{' '}
                contribution? This can&apos;t be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDeleteContrib(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-coral hover:bg-coral/90 text-white"
                onClick={() => {
                  handleDeleteContribution(confirmDeleteContrib.id);
                  setConfirmDeleteContrib(null);
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Settle confirmation modal — when bill isn't fully covered */}
      {showSettleConfirm && bill && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-border animate-scale-fade-in">
            <div className="space-y-2 text-center">
              <div className="text-4xl">⚠️</div>
              <h3 className="text-lg font-bold font-[family-name:var(--font-main)]">
                Settle with uncollected amount?
              </h3>
              <p className="text-sm text-muted-foreground">
                Only <span className="font-semibold text-foreground">{formatCurrency(totalPaid)}</span> of{' '}
                <span className="font-semibold text-foreground">{formatCurrency(bill.total)}</span> has been collected.{' '}
                <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(remaining)}</span> is still outstanding.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowSettleConfirm(false);
                  setStatus(bill.status);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={executeSettle}
                disabled={settlingBill}
              >
                {settlingBill ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Settling...</>
                ) : (
                  'Settle Anyway'
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
