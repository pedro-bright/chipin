'use client';

import { useState, useEffect, useRef } from 'react';
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
  const totalPaid = activeContributions.reduce((sum: number, c: Contribution) => sum + Number(c.amount), 0);
  const remaining = Math.max(Math.round((bill.total - totalPaid) * 100) / 100, 0);

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

        {/* Summary */}
        <Card className={`${status === 'settled' ? 'bg-success/5 border-success/20' : 'bg-primary/5 border-primary/20'}`}>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold font-[family-name:var(--font-main)]">{formatCurrency(bill.total)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-xl font-bold text-success font-[family-name:var(--font-main)]">{formatCurrency(totalPaid)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{status === 'settled' ? 'Status' : 'Remaining'}</p>
                <p className={`text-xl font-bold font-[family-name:var(--font-main)] ${status === 'settled' ? 'text-success' : 'text-primary'}`}>
                  {status === 'settled' ? '✓ Settled' : formatCurrency(remaining)}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            {bill.total > 0 && (
              <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-success to-emerald-300 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min((totalPaid / bill.total) * 100, 100)}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Edit Details</CardTitle>
          </CardHeader>
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
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items ({bill.bill_items?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {bill.bill_items?.map((item: BillItem) => (
                <div key={item.id} className="flex justify-between py-2">
                  <span>{item.name} {item.quantity > 1 ? `×${item.quantity}` : ''}</span>
                  <span className="font-medium">{formatCurrency(Number(item.price))}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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

        {/* Contributions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contributions ({bill.contributions?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {bill.contributions?.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-3xl">📬</p>
                <p className="text-muted-foreground font-medium">
                  No payments recorded yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Share the link below and watch payments roll in!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {bill.contributions
                  ?.sort((a: Contribution, b: Contribution) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )
                  .filter((c: Contribution) => (c as unknown as { note?: string }).note !== '[cancelled]')
                  .map((c: Contribution) => {
                    const isPending = (c as unknown as { note?: string }).note === '[pending]';
                    return (
                    <div key={c.id} className={`flex items-center justify-between py-2.5 px-3 -mx-3 rounded-xl hover:bg-muted/30 transition-colors group ${isPending ? 'bg-amber-500/5' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {c.person_name}
                          {isPending && (
                            <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">⏳ Awaiting</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {c.payment_method}
                          {!isPending && (c as unknown as { note?: string }).note && (
                            <span className="ml-1 opacity-60">· {(c as unknown as { note?: string }).note}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/bills/${bill.slug}/contribute`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ contribution_id: c.id, note: null }),
                                });
                                window.location.reload();
                              } catch { /* ignore */ }
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                          >
                            ✓ Confirm Paid
                          </button>
                        ) : (
                          <Badge variant="success">{formatCurrency(Number(c.amount))}</Badge>
                        )}
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
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Share Link */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Share
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/b/${slug}` : `/b/${slug}`}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                className="gap-1.5 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/b/${slug}`);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
              >
                {linkCopied ? (
                  <><CheckCircle2 className="w-4 h-4 text-success" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy</>
                )}
              </Button>
            </div>
          </CardContent>
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
