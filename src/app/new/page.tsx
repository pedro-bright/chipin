'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ViewTransitionLink } from '@/components/view-transition-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, getVenmoProfileLink, getPayPalProfileLink, sanitizeVenmoHandle, sanitizeCashAppHandle, sanitizePayPalHandle } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  Camera,
  Upload,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Rocket,
  PenLine,
  Check,
  Sparkles,
  Scissors,
  Merge,
  Users,
  UtensilsCrossed,
  Coins,
  Split,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface ParsedItem {
  name: string;
  price: number;
  qty: number;
  shared_by?: number | null;
  _splitFrom?: string; // Track original name for merge
}

interface ReceiptData {
  restaurant: string;
  items: ParsedItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  confidence?: number;
  warnings?: string[];
  model?: string;
  retried?: boolean;
  needsEnhancement?: boolean;
}

type Step = 'upload' | 'review' | 'details' | 'publishing';

/* ── Constants ─────────────────────────────────────────────────────────── */
const PARSING_MESSAGES = [
  "Reading the sommelier's handwriting...",
  'Counting appetizers...',
  'Calculating your tip guilt...',
  'Decoding the specials board...',
  'Sorting out who had the extra guac...',
  'Translating menu Italian...',
  'Verifying the tax math...',
  'Making sure nobody snuck in an extra drink...',
  'Converting chicken scratch to line items...',
  'Doing the math so you don\'t have to...',
  'Teaching AI about appetizer portions...',
  'Debating whether that was a large or small...',
];

const FORTUNE_TEMPLATES = [
  (count: number, perPerson: number) =>
    `🍕 ${count} items at ${formatCurrency(perPerson)}/person — that's ${(perPerson / 5).toFixed(1)} Chipotle burritos each!`,
  (count: number, perPerson: number) =>
    `☕ ${count} items split evenly — each person owes about ${Math.round(perPerson / 6)} fancy lattes worth`,
  (count: number) =>
    `🧮 ${count} items detected — our AI had an easier time than your group's mental math`,
  (_count: number, perPerson: number) =>
    `💰 At ${formatCurrency(perPerson)}/person, that's ${(perPerson / 2.5).toFixed(0)} subway rides in NYC`,
];

/* ── Utility: Rotate image 180° via canvas ─────────────────────────────── */
async function rotateImage180(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      // Rotate 180°: translate to center, rotate, draw
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create rotated image'));
            return;
          }
          const rotatedFile = new File([blob], file.name, {
            type: file.type || 'image/jpeg',
          });
          resolve(rotatedFile);
        },
        file.type || 'image/jpeg',
        0.92
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for rotation'));
    img.src = URL.createObjectURL(file);
  });
}

/* ── Component ─────────────────────────────────────────────────────────── */
export default function NewBillPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState('');
  const [receiptImageUrls, setReceiptImageUrls] = useState<string[]>([]);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState('');
  const [isAddingReceipt, setIsAddingReceipt] = useState(false);
  const [parsingMessageIndex, setParsingMessageIndex] = useState(0);
  const [showFortune, setShowFortune] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const parsingInterval = useRef<ReturnType<typeof setInterval>>(undefined);

  // Confidence / AI metadata
  const [confidence, setConfidence] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [wasRetried, setWasRetried] = useState(false);

  // Rotation retry & enhancement
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [needsEnhancement, setNeedsEnhancement] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Set<number>>(new Set());

  // Bill details
  const [restaurantName, setRestaurantName] = useState('');
  const [hostName, setHostName] = useState('');
  const [personCount, setPersonCount] = useState('');
  const [defaultMode, setDefaultMode] = useState<'claim' | 'split' | 'custom'>('claim');
  const [venmoHandle, setVenmoHandle] = useState('');
  const [zelleInfo, setZelleInfo] = useState('');
  const [cashappHandle, setCashappHandle] = useState('');
  const [paypalHandle, setPaypalHandle] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Group state
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupSlug, setSelectedGroupSlug] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<{ id: string; name: string; emoji: string; slug: string; members: string[]; memberObjects?: { id: string; name: string }[] }[]>([]);
  const [groupMemberNames, setGroupMemberNames] = useState<string[]>([]);
  const [groupMemberObjects, setGroupMemberObjects] = useState<{ id: string; name: string }[]>([]);
  
  // Attendee state (who was there?)
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set()); // set of group_member_ids

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // H2+H3: Reset bill creation state on fresh mount (prevent stale state from Next.js router cache)
  useEffect(() => {
    setStep('upload');
    setItems([]);
    setSubtotal(0);
    setTax(0);
    setTip(0);
    setTotal(0);
    setRestaurantName('');
    setReceiptData(null);
    setReceiptImageUrl('');
    setReceiptImageUrls([]);
    setError('');
    setShowFortune(false);
    setConfidence(null);
    setWarnings([]);
    setNeedsEnhancement(false);
    setLastUploadedFile(null);
    setIsManualEntry(false);
    setValidationErrors(new Set());
    setIsAddingReceipt(false);
  }, []);

  // Cycle through parsing messages
  useEffect(() => {
    if (isParsing) {
      setParsingMessageIndex(0);
      parsingInterval.current = setInterval(() => {
        setParsingMessageIndex((i) => (i + 1) % PARSING_MESSAGES.length);
      }, 2200);
    } else {
      if (parsingInterval.current) clearInterval(parsingInterval.current);
    }
    return () => {
      if (parsingInterval.current) clearInterval(parsingInterval.current);
    };
  }, [isParsing]);

  // Check if user is logged in, auto-fill from profile, load groups
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAuthUserId(user.id);
        if (user.email) {
          setHostEmail(user.email);

          // Load user's groups
          fetch('/api/user-groups')
            .then((r) => r.json())
            .then(({ groups }) => {
              if (groups) {
                setUserGroups(groups);
                // Check URL for pre-selected group
                const params = new URLSearchParams(window.location.search);
                const groupSlug = params.get('group');
                if (groupSlug) {
                  const g = groups.find((gr: { slug: string }) => gr.slug === groupSlug);
                  if (g) {
                    setSelectedGroupId(g.id);
                    setSelectedGroupSlug(g.slug);
                    setGroupMemberNames(g.members || []);
                    setGroupMemberObjects(g.memberObjects || []);
                    // Select all members as attendees by default
                    if (g.memberObjects) {
                      setSelectedAttendees(new Set(g.memberObjects.map((m: { id: string }) => m.id)));
                    }
                  }
                }
              }
            })
            .catch(() => {});
        }
        fetch('/api/profile')
          .then((r) => r.json())
          .then(({ profile }) => {
            if (profile) {
              if (profile.display_name) setHostName(profile.display_name);

              const preferred = profile.preferred_payment;
              const hasPreferred =
                (preferred === 'venmo' && profile.venmo_handle) ||
                (preferred === 'zelle' && profile.zelle_info) ||
                (preferred === 'cashapp' && profile.cashapp_handle) ||
                (preferred === 'paypal' && profile.paypal_handle);

              if (hasPreferred) {
                setVenmoHandle(preferred === 'venmo' ? profile.venmo_handle || '' : '');
                setZelleInfo(preferred === 'zelle' ? profile.zelle_info || '' : '');
                setCashappHandle(preferred === 'cashapp' ? profile.cashapp_handle || '' : '');
                setPaypalHandle(preferred === 'paypal' ? profile.paypal_handle || '' : '');
              } else {
                if (profile.venmo_handle) setVenmoHandle(profile.venmo_handle);
                if (profile.zelle_info) setZelleInfo(profile.zelle_info);
                if (profile.cashapp_handle) setCashappHandle(profile.cashapp_handle);
                if (profile.paypal_handle) setPaypalHandle(profile.paypal_handle);
              }
            }
          })
          .catch(() => {});
      }
    });
  }, []);

  // Items state for editing
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [tip, setTip] = useState(0);
  const [total, setTotal] = useState(0);

  /* ── File upload + parse ────────────────────────────────────────────── */
  const handleFileUpload = useCallback(
    async (file: File, merge = false) => {
      setError('');
      setIsUploading(true);
      setIsParsing(true);
      setShowFortune(false);

      setLastUploadedFile(file);

      try {
        const uploadForm = new FormData();
        uploadForm.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForm });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
        setReceiptImageUrl(uploadData.url);
        setReceiptImageUrls((prev) => [...prev, uploadData.url]);
        setIsUploading(false);

        const parseForm = new FormData();
        parseForm.append('receipt', file);
        const parseRes = await fetch('/api/parse-receipt', { method: 'POST', body: parseForm });
        const parsed: ReceiptData = await parseRes.json();

        if (!parseRes.ok) throw new Error((parsed as { error?: string }).error || 'Parsing failed');

        setReceiptData(parsed);

        // Store AI metadata
        setConfidence(parsed.confidence ?? null);
        setWarnings(parsed.warnings ?? []);
        setModelUsed(parsed.model ?? null);
        setWasRetried(parsed.retried ?? false);
        setNeedsEnhancement((parsed as ReceiptData & { needsEnhancement?: boolean }).needsEnhancement ?? false);

        if (merge) {
          setItems((prev) => [...prev, ...(parsed.items || [])]);
          setSubtotal((prev) => Math.round((prev + (parsed.subtotal || 0)) * 100) / 100);
          setTax((prev) => Math.round((prev + (parsed.tax || 0)) * 100) / 100);
          setTip((prev) => Math.round((prev + (parsed.tip || 0)) * 100) / 100);
          setTotal((prev) => Math.round((prev + (parsed.total || 0)) * 100) / 100);
        } else {
          setItems(parsed.items || []);
          setSubtotal(parsed.subtotal || 0);
          setTax(parsed.tax || 0);
          setTip(parsed.tip || 0);
          setTotal(parsed.total || 0);
          // Smart bill naming: auto-format "Restaurant Name — Feb 7"
          if (parsed.restaurant) {
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const hasDate = parsed.restaurant.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2})/i);
            setRestaurantName(hasDate ? parsed.restaurant : `${parsed.restaurant} — ${dateStr}`);
          } else {
            setRestaurantName('');
          }
        }
        setIsAddingReceipt(false);
        setShowFortune(true);
        setIsManualEntry(false);
        setStep('review');
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Hmm, that receipt's playing hard to read. Try a clearer photo, or enter items by hand!"
        );
      } finally {
        setIsUploading(false);
        setIsParsing(false);
      }
    },
    []
  );

  /* ── Retry with 180° rotation ───────────────────────────────────────── */
  const handleRetryRotated = useCallback(async () => {
    if (!lastUploadedFile) return;
    setIsRotating(true);
    setError('');
    try {
      const rotatedFile = await rotateImage180(lastUploadedFile);
      // Parse only (skip re-uploading the image — we already have it)
      setIsParsing(true);
      const parseForm = new FormData();
      parseForm.append('receipt', rotatedFile);
      const parseRes = await fetch('/api/parse-receipt', { method: 'POST', body: parseForm });
      const parsed: ReceiptData = await parseRes.json();

      if (!parseRes.ok) throw new Error((parsed as { error?: string }).error || 'Parsing failed');

      setReceiptData(parsed);
      setConfidence(parsed.confidence ?? null);
      setWarnings(parsed.warnings ?? []);
      setModelUsed(parsed.model ?? null);
      setWasRetried(parsed.retried ?? false);

      setItems(parsed.items || []);
      setSubtotal(parsed.subtotal || 0);
      setTax(parsed.tax || 0);
      setTip(parsed.tip || 0);
      setTotal(parsed.total || 0);
      setRestaurantName(parsed.restaurant || '');

      // Store the rotated file for potential further retries
      setLastUploadedFile(rotatedFile);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Still tricky! No worries — you can tweak items by hand.'
      );
    } finally {
      setIsRotating(false);
      setIsParsing(false);
    }
  }, [lastUploadedFile]);

  /* ── Enhanced scan with GPT-5.2 ─────────────────────────────────────── */
  const handleEnhancedScan = useCallback(async () => {
    if (!lastUploadedFile) return;
    setIsEnhancing(true);
    setError('');
    try {
      const parseForm = new FormData();
      parseForm.append('receipt', lastUploadedFile);
      parseForm.append('enhance', 'true');
      const parseRes = await fetch('/api/parse-receipt', { method: 'POST', body: parseForm });
      const parsed: ReceiptData = await parseRes.json();

      if (!parseRes.ok) throw new Error((parsed as { error?: string }).error || 'Enhanced parsing failed');

      setReceiptData(parsed);
      setConfidence(parsed.confidence ?? null);
      setWarnings(parsed.warnings ?? []);
      setModelUsed(parsed.model ?? null);
      setWasRetried(false);
      setNeedsEnhancement(false);

      setItems(parsed.items || []);
      setSubtotal(parsed.subtotal || 0);
      setTax(parsed.tax || 0);
      setTip(parsed.tip || 0);
      setTotal(parsed.total || 0);
      if (parsed.restaurant) setRestaurantName(parsed.restaurant);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Enhanced scan had a hiccup. You can still edit items by hand!'
      );
    } finally {
      setIsEnhancing(false);
    }
  }, [lastUploadedFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleFileUpload(file, isAddingReceipt);
      }
    },
    [handleFileUpload, isAddingReceipt]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file, isAddingReceipt);
      // Reset the input so the same file can be re-selected
      e.target.value = '';
    },
    [handleFileUpload, isAddingReceipt]
  );

  const updateItem = (index: number, field: keyof ParsedItem, value: string | number) => {
    const updated = [...items];
    if (field === 'price') {
      updated[index].price = Number(value) || 0;
    } else if (field === 'qty') {
      updated[index].qty = Number(value) || 1;
    } else if (field === 'shared_by') {
      const n = Number(value);
      updated[index].shared_by = n >= 2 ? n : null;
    } else {
      updated[index].name = String(value);
    }
    setItems(updated);
    recalcSubtotal(updated);
  };

  const splitItem = (index: number) => {
    const item = items[index];
    if (item.qty <= 1) return;
    // price is already the unit price, so each split row keeps it as-is
    const splitItems: ParsedItem[] = Array.from({ length: item.qty }, (_, i) => ({
      name: `${item.name} (${i + 1}/${item.qty})`,
      price: item.price,
      qty: 1,
      shared_by: item.shared_by,
      _splitFrom: item.name,
    }));
    const updated = [...items.slice(0, index), ...splitItems, ...items.slice(index + 1)];
    setItems(updated);
    recalcSubtotal(updated);
  };

  const mergeItems = (index: number) => {
    const item = items[index];
    const baseName = item._splitFrom;
    if (!baseName) return;
    // Find all consecutive split items with the same _splitFrom
    let start = index;
    while (start > 0 && items[start - 1]._splitFrom === baseName) start--;
    let end = index;
    while (end < items.length - 1 && items[end + 1]._splitFrom === baseName) end++;
    const count = end - start + 1;
    // price is per-unit, so just use any split item's price (they're all the same)
    const merged: ParsedItem = {
      name: baseName,
      price: item.price,
      qty: count,
      shared_by: item.shared_by,
    };
    const updated = [...items.slice(0, start), merged, ...items.slice(end + 1)];
    setItems(updated);
    recalcSubtotal(updated);
  };

  const addItem = () => {
    setItems([...items, { name: '', price: 0, qty: 1 }]);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    recalcSubtotal(updated);
  };

  const recalcSubtotal = (itemList: ParsedItem[]) => {
    const newSubtotal = itemList.reduce((sum, item) => sum + item.price * item.qty, 0);
    setSubtotal(Math.round(newSubtotal * 100) / 100);
    setTotal(Math.round((newSubtotal + tax + tip) * 100) / 100);
  };

  // H1+M6: Validate items before proceeding to details
  const handleContinueToDetails = () => {
    // Auto-remove completely empty items (no name AND no price)
    const cleaned = items.filter(item => item.name.trim() !== '' || item.price > 0);

    if (cleaned.length === 0) {
      setError('Add at least one item with a name and price to continue');
      return;
    }

    // Check for items missing names (have price but no name)
    const errors = new Set<number>();
    cleaned.forEach((item, idx) => {
      if (item.name.trim() === '') errors.add(idx);
    });

    if (errors.size > 0) {
      setItems(cleaned);
      recalcSubtotal(cleaned);
      setValidationErrors(errors);
      setError('Give each item a name before continuing');
      return;
    }

    // All valid — clean up and proceed
    setItems(cleaned);
    recalcSubtotal(cleaned);
    setValidationErrors(new Set());
    setError('');
    setStep('details');
  };

  const handlePublish = async () => {
    if (!hostName.trim()) {
      setError('Add your name so friends know who to pay.');
      return;
    }
    if (!venmoHandle.trim() && !zelleInfo.trim() && !cashappHandle.trim() && !paypalHandle.trim()) {
      setError('Add at least one payment method.');
      return;
    }

    // M6: Filter out items with empty names (defense in depth)
    const validItems = items.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      setError('Add at least one item with a name to your bill');
      return;
    }

    setStep('publishing');
    setError('');

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_name: hostName,
          restaurant_name: restaurantName || 'Restaurant',
          receipt_image_url: receiptImageUrls.length > 0 ? receiptImageUrls[0] : receiptImageUrl,
          receipt_image_urls: receiptImageUrls,
          subtotal,
          tax,
          tip,
          total,
          person_count: personCount ? parseInt(personCount) : null,
          venmo_handle: venmoHandle ? venmoHandle.replace(/^@/, '') : null,
          zelle_info: zelleInfo || null,
          cashapp_handle: cashappHandle || null,
          paypal_handle: paypalHandle || null,
          default_mode: defaultMode,
          items: validItems.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.qty,
            shared_by: item.shared_by || null,
          })),
          host_email: hostEmail || null,
          host_user_id: authUserId || null,
          group_id: selectedGroupId || null,
          attendees: selectedGroupId && selectedAttendees.size > 0
            ? groupMemberObjects
                .filter(m => selectedAttendees.has(m.id))
                .map(m => ({
                  group_member_id: m.id,
                  member_name: m.name,
                  expected_amount: Math.round((total / selectedAttendees.size) * 100) / 100,
                }))
            : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create bill');

      localStorage.setItem(`chipin_host_key_${data.slug}`, data.host_key);

      if (authUserId) {
        fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            display_name: hostName,
            venmo_handle: venmoHandle,
            zelle_info: zelleInfo,
            cashapp_handle: cashappHandle,
            paypal_handle: paypalHandle,
          }),
        }).catch(() => {});
      }

      // H2+H3: Clear all form state before navigation to prevent stale state
      setStep('upload');
      setItems([]);
      setSubtotal(0);
      setTax(0);
      setTip(0);
      setTotal(0);
      setRestaurantName('');
      setReceiptData(null);
      setReceiptImageUrl('');
      setReceiptImageUrls([]);
      setIsManualEntry(false);
      setValidationErrors(new Set());

      router.push(`/b/${data.slug}?created=true&key=${data.host_key}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
      setStep('details');
    }
  };

  const skipToManual = () => {
    setItems([{ name: '', price: 0, qty: 1 }]);
    setConfidence(null);
    setWarnings([]);
    setModelUsed(null);
    setIsManualEntry(true);
    setValidationErrors(new Set());
    setStep('review');
  };

  const dismissWarning = (index: number) => {
    setWarnings((prev) => prev.filter((_, i) => i !== index));
  };

  // Generate receipt fortune
  const getReceiptFortune = () => {
    if (!items.length || total <= 0) return null;
    if (!personCount || parseInt(personCount) <= 0) return null;
    const count = items.length;
    const people = parseInt(personCount);
    const perPerson = total / people;
    const template = FORTUNE_TEMPLATES[count % FORTUNE_TEMPLATES.length];
    return template(count, perPerson);
  };

  // Confidence level helper
  const getConfidenceLevel = () => {
    if (confidence === null) return null;
    if (confidence >= 80) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  };

  // Step progress
  const steps = ['Upload', 'Review', 'Details'];
  const stepIndex =
    step === 'upload'
      ? 0
      : step === 'review'
        ? 1
        : step === 'details' || step === 'publishing'
          ? 2
          : 0;

  return (
    <main className="bg-background min-h-dvh">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-border/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <ViewTransitionLink
            href="/"
            className="text-lg sm:text-xl font-bold font-[family-name:var(--font-main)] shrink-0"
          >
            <span className="font-extrabold">tidy</span>
            <span className="text-primary font-extrabold">tab</span>
          </ViewTransitionLink>

          {/* Step indicator */}
          <div className="flex items-center gap-0">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`w-8 sm:w-12 h-0.5 transition-colors duration-500 ${
                      i <= stepIndex ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      i === stepIndex
                        ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md scale-110'
                        : i < stepIndex
                          ? 'bg-success text-white'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className={`text-[10px] font-medium hidden sm:block ${
                      i === stepIndex
                        ? 'text-primary'
                        : i < stepIndex
                          ? 'text-success'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {s}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-coral/10 border border-coral/20 rounded-2xl text-sm animate-spring-in">
            <div className="flex items-start justify-between gap-2">
              <p className="text-coral">{error}</p>
              <button onClick={() => setError('')} className="text-coral font-bold hover:opacity-70 shrink-0 mt-0.5">
                ×
              </button>
            </div>
            {/* Show manual entry CTA when on upload step or if parsing failed */}
            {(step === 'upload' || (step === 'review' && items.length === 0)) && (
              <button
                onClick={() => {
                  setError('');
                  skipToManual();
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-coral/10 hover:bg-coral/20 text-coral font-semibold text-sm transition-colors min-h-[44px]"
              >
                <PenLine className="w-4 h-4" />
                Enter items by hand instead
              </button>
            )}
          </div>
        )}

        {/* ── Step 1: Upload ────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="space-y-6 enter">
            <div className="text-center space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-main)] tracking-tight">
                {isAddingReceipt ? 'Add Another Receipt' : 'Add Your Bill'}
              </h1>
              <p className="text-muted-foreground text-base">
                {isAddingReceipt
                  ? `You have ${items.length} items so far. New items will be added to the list.`
                  : 'Snap a receipt or type it in — your call'}
              </p>
            </div>

            {/* Entry mode toggle — both options are first-class */}
            {!isAddingReceipt && (
              <div className="flex gap-2 bg-muted rounded-2xl p-1.5">
                <button
                  onClick={() => {/* already in upload mode */}}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all bg-card text-foreground shadow-sm min-h-[48px]"
                >
                  <Camera className="w-4.5 h-4.5" />
                  Upload Receipt
                </button>
                <button
                  onClick={skipToManual}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all text-muted-foreground hover:text-foreground min-h-[48px]"
                >
                  <PenLine className="w-4.5 h-4.5" />
                  Enter Manually
                </button>
              </div>
            )}

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer group transition-all duration-300 ${
                isDragOver
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-border/60 hover:border-primary/50 bg-primary/[0.02] hover:bg-primary/[0.04]'
              }`}
              style={{
                backgroundImage: isDragOver
                  ? undefined
                  : 'radial-gradient(circle at 50% 50%, rgba(230, 126, 34, 0.04) 0%, transparent 70%)',
              }}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              {/* Animated border glow */}
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div
                  className="absolute inset-[-1px] rounded-3xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20"
                  style={{
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'exclude',
                    padding: '2px',
                  }}
                />
              </div>

              {isUploading || isParsing ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-foreground font-semibold text-base font-[family-name:var(--font-main)]">
                      {isUploading ? 'Uploading...' : PARSING_MESSAGES[parsingMessageIndex]}
                    </p>
                    <p className="text-xs text-muted-foreground">This usually takes a few seconds</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary mx-auto flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold font-[family-name:var(--font-main)]">
                      Tap to snap or choose a photo
                    </p>
                  </div>
                </div>
              )}
              <input
                id="fileInput"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {isAddingReceipt && (
              <div className="text-center">
                <button
                  onClick={() => {
                    setIsAddingReceipt(false);
                    setStep('review');
                  }}
                  className="text-sm text-primary hover:underline flex items-center justify-center gap-1 mx-auto font-medium"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to review
                </button>
              </div>
            )}

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Works with paper receipts, screenshots, and photos
            </p>
          </div>
        )}

        {/* ── Step 2: Review Items ──────────────────────────────────── */}
        {step === 'review' && (
          <div className="space-y-6 enter">
            <div className="text-center space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-main)] tracking-tight">
                {isManualEntry ? 'Add Your Items' : 'Review Items'}
              </h1>
              <p className="text-muted-foreground">
                {isManualEntry
                  ? 'Enter your items below'
                  : 'Edit anything that looks off'}
              </p>
            </div>

            {/* ── Enhanced scan (only when needed, no confidence banner) ── */}
            {needsEnhancement && lastUploadedFile && !isEnhancing && (
              <div className="flex justify-center animate-spring-in">
                <button
                  onClick={handleEnhancedScan}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Try Enhanced Scan
                </button>
              </div>
            )}
            {isEnhancing && (
              <div className="flex justify-center animate-spring-in">
                <span className="flex items-center gap-1.5 text-sm text-primary">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Running enhanced scan...
                </span>
              </div>
            )}

            {/* ── Single warning summary (collapsed, not chips) ───── */}
            {warnings.length > 0 && (
              <details className="text-xs text-muted-foreground animate-spring-in">
                <summary className="cursor-pointer hover:text-foreground transition-colors">
                  {warnings.length} {warnings.length === 1 ? 'note' : 'notes'} about this scan
                </summary>
                <ul className="mt-2 space-y-1 pl-4 list-disc">
                  {warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </details>
            )}

            {/* Enhancing loading overlay */}
            {isEnhancing && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center animate-spring-in">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm font-medium text-foreground">
                    Running enhanced AI scan — this may take a moment...
                  </p>
                </div>
              </div>
            )}

            {/* Rotating/parsing loading overlay */}
            {(isRotating || isParsing) && !isEnhancing && step === 'review' && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center animate-spring-in">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm font-medium text-foreground">
                    {isRotating
                      ? 'Retrying with rotated image...'
                      : PARSING_MESSAGES[parsingMessageIndex]}
                  </p>
                </div>
              </div>
            )}

            {/* Receipt Fortune Card */}
            {showFortune && getReceiptFortune() && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/10 text-center animate-spring-in">
                <p className="text-sm font-medium text-foreground">{getReceiptFortune()}</p>
                <button
                  onClick={() => setShowFortune(false)}
                  className="text-xs text-muted-foreground hover:text-foreground mt-1"
                >
                  dismiss
                </button>
              </div>
            )}

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className={`rounded-xl p-3 space-y-2 group transition-colors ${
                        item._splitFrom
                          ? 'bg-primary/5 border border-dashed border-primary/20 hover:bg-primary/10'
                          : 'bg-muted/40 hover:bg-muted/60'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <Input
                        value={item.name}
                        onChange={(e) => {
                          updateItem(index, 'name', e.target.value);
                          if (validationErrors.has(index)) {
                            setValidationErrors(prev => {
                              const next = new Set(prev);
                              next.delete(index);
                              return next;
                            });
                          }
                        }}
                        placeholder="Item name"
                        className={`w-full h-11 ${validationErrors.has(index) ? 'border-coral ring-1 ring-coral/30' : ''}`}
                      />
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.price || ''}
                            onChange={(e) => updateItem(index, 'price', e.target.value)}
                            className="flex-1 h-10 pl-7"
                            placeholder="0.00"
                          />
                        </div>
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItem(index, 'qty', e.target.value)}
                          className="w-14 shrink-0 h-10 text-center"
                          title="Quantity"
                        />
                        <button
                          onClick={() => removeItem(index)}
                          className="text-muted-foreground hover:text-coral active:text-coral p-2 transition-colors shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
                          aria-label={`Remove ${item.name || 'item'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* ── Action row: Split / Merge / Shared ── */}
                      <div className="flex gap-2 items-center flex-wrap">
                        {/* Split button — only for qty > 1 items that aren't already split */}
                        {item.qty > 1 && !item._splitFrom && (
                          <button
                            onClick={() => splitItem(index)}
                            className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10 rounded-lg px-2.5 py-1.5 transition-colors"
                            title={`Split into ${item.qty} separate items`}
                          >
                            <Scissors className="w-3 h-3" /> Split ×{item.qty}
                          </button>
                        )}
                        {/* Merge button — only for split items */}
                        {item._splitFrom && (
                          <button
                            onClick={() => mergeItems(index)}
                            className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10 rounded-lg px-2.5 py-1.5 transition-colors"
                            title="Merge back into one item"
                          >
                            <Merge className="w-3 h-3" /> Merge
                          </button>
                        )}
                        {/* Shared by N */}
                        {item.shared_by ? (
                          <span className="inline-flex items-center gap-1.5 text-xs bg-accent/10 text-accent rounded-lg px-2.5 py-1.5">
                            <Users className="w-3 h-3" />
                            <span>Shared by {item.shared_by}</span>
                            <span className="text-accent/60">({formatCurrency(item.price / item.shared_by)}/ea)</span>
                            <button
                              onClick={() => updateItem(index, 'shared_by', '')}
                              className="ml-0.5 hover:text-coral transition-colors"
                              title="Remove sharing"
                            >×</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              const n = prompt('Shared by how many people?', '2');
                              if (n && Number(n) >= 2) updateItem(index, 'shared_by', n);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 rounded-lg px-2.5 py-1.5 transition-colors"
                            title="Mark as shared item"
                          >
                            <Users className="w-3 h-3" /> Share
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={addItem} className="flex-1 gap-1.5">
                    <Plus className="w-4 h-4" /> Add Item
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddingReceipt(true);
                      setStep('upload');
                    }}
                    className="flex-1 gap-1.5"
                  >
                    <Camera className="w-4 h-4" /> Add Receipt
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold font-[family-name:var(--font-main)]">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-muted-foreground">Tax</span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={tax || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setTax(val);
                        setTotal(Math.round((subtotal + val + tip) * 100) / 100);
                      }}
                      className="w-24 h-10"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <span className="text-muted-foreground">Tip</span>
                    {/* Quick tip buttons */}
                    {subtotal > 0 && (
                      <div className="flex gap-1.5 mt-1.5">
                        {[15, 18, 20, 25].map((pct) => {
                          const tipAmount = Math.round(subtotal * pct) / 100;
                          const isActive = Math.abs(tip - tipAmount) < 0.01;
                          return (
                            <button
                              key={pct}
                              onClick={() => {
                                setTip(tipAmount);
                                setTotal(Math.round((subtotal + tax + tipAmount) * 100) / 100);
                              }}
                              className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all duration-150 active:scale-95 ${
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                            >
                              {pct}%
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={tip || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setTip(val);
                        setTotal(Math.round((subtotal + tax + val) * 100) / 100);
                      }}
                      className="w-24 h-10"
                    />
                  </div>
                </div>
                <div className="gradient-divider my-2" />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-xl font-[family-name:var(--font-main)]">Total</span>
                  <span className="font-bold text-xl font-[family-name:var(--font-main)]">
                    {formatCurrency(total)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('upload')} className="flex-1 gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                onClick={handleContinueToDetails}
                className="flex-1 gap-1.5"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Details & Publish ─────────────────────────────── */}
        {step === 'details' && (
          <div className="space-y-6 enter">
            <div className="text-center space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-main)] tracking-tight">
                Final Details
              </h1>
              <p className="text-muted-foreground">Add your info and publish.</p>
            </div>

            {/* Group selector */}
            {userGroups.length > 0 && (
              <Card className="enter enter-delay-1">
                <CardContent className="pt-5 pb-5">
                  <label className="text-sm font-medium mb-2 block text-foreground">
                    Link to Group <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedGroupId(null);
                        setSelectedGroupSlug(null);
                        setGroupMemberNames([]);
                        setGroupMemberObjects([]);
                        setSelectedAttendees(new Set());
                      }}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                        !selectedGroupId
                          ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      None
                    </button>
                    {userGroups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          setSelectedGroupId(g.id);
                          setSelectedGroupSlug(g.slug);
                          setGroupMemberNames(g.members || []);
                          setGroupMemberObjects(g.memberObjects || []);
                          // Select all members as attendees by default
                          if (g.memberObjects) {
                            setSelectedAttendees(new Set(g.memberObjects.map((m: { id: string }) => m.id)));
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 flex items-center gap-1.5 ${
                          selectedGroupId === g.id
                            ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <span>{g.emoji}</span>
                        {g.name}
                      </button>
                    ))}
                  </div>
                  {/* Attendee Selection — "Who was there?" */}
                  {groupMemberObjects.length > 0 && selectedGroupId && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">
                          Who was there?
                        </label>
                        {total > 0 && selectedAttendees.size > 0 && (
                          <span className="text-xs font-semibold text-primary">
                            {formatCurrency(Math.round((total / selectedAttendees.size) * 100) / 100)} each
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {groupMemberObjects.map((member) => {
                          const isSelected = selectedAttendees.has(member.id);
                          const isHost = member.name.trim().toLowerCase() === hostName.trim().toLowerCase();
                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => {
                                // Host can't be unchecked
                                if (isHost && isSelected) return;
                                const next = new Set(selectedAttendees);
                                if (isSelected) {
                                  next.delete(member.id);
                                } else {
                                  next.add(member.id);
                                }
                                setSelectedAttendees(next);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 min-h-[44px] ${
                                isSelected
                                  ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              } ${isHost ? 'ring-2 ring-primary/40' : ''}`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                isSelected ? 'bg-primary border-primary text-white' : 'border-border/80'
                              }`}>
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                              {member.name}
                              {isHost && <span className="text-[10px] opacity-60">host</span>}
                            </button>
                          );
                        })}
                      </div>
                      {selectedAttendees.size > 0 && total > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Split {formatCurrency(total)} between {selectedAttendees.size} {selectedAttendees.size === 1 ? 'person' : 'people'}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-6 space-y-5">
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-foreground">
                    Event Name
                  </label>
                  <Input
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder={`e.g., Dinner at Nobu — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  />
                  {restaurantName && !restaurantName.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2})/i) && (
                    <button
                      type="button"
                      onClick={() => {
                        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        setRestaurantName(`${restaurantName} — ${dateStr}`);
                      }}
                      className="text-xs text-primary hover:underline mt-1.5 inline-flex items-center gap-1"
                    >
                      + Add today&apos;s date
                    </button>
                  )}
                  {!restaurantName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Add a name + date for easy reference
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block text-foreground">
                      Your Name *
                    </label>
                    <Input
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="e.g., Alex"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block text-foreground">
                      # of People
                    </label>
                    <Input
                      type="number"
                      min="2"
                      value={personCount}
                      onChange={(e) => {
                        setPersonCount(e.target.value);
                        // If person count is cleared or < 2 while split is selected, fall back to claim
                        if (defaultMode === 'split' && (!e.target.value || parseInt(e.target.value) < 2)) {
                          setDefaultMode('claim');
                        }
                      }}
                      placeholder="e.g., 6"
                    />
                  </div>
                </div>

                {/* ── Default Chip-in Mode ── */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-foreground">
                    How should people chip in?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDefaultMode('claim')}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-150 active:scale-[0.97] ${
                        defaultMode === 'claim'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <UtensilsCrossed className={`w-4.5 h-4.5 ${defaultMode === 'claim' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-semibold ${defaultMode === 'claim' ? 'text-primary' : 'text-muted-foreground'}`}>
                        Pick dishes
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (personCount && parseInt(personCount) >= 2) {
                          setDefaultMode('split');
                        }
                      }}
                      disabled={!personCount || parseInt(personCount) < 2}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-150 active:scale-[0.97] ${
                        defaultMode === 'split'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm'
                          : !personCount || parseInt(personCount) < 2
                            ? 'border-border/50 opacity-40 cursor-not-allowed'
                            : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <Split className={`w-4.5 h-4.5 ${defaultMode === 'split' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-semibold ${defaultMode === 'split' ? 'text-primary' : 'text-muted-foreground'}`}>
                        Split evenly
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultMode('custom')}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-150 active:scale-[0.97] ${
                        defaultMode === 'custom'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <Coins className={`w-4.5 h-4.5 ${defaultMode === 'custom' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-semibold ${defaultMode === 'custom' ? 'text-primary' : 'text-muted-foreground'}`}>
                        Custom amount
                      </span>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {defaultMode === 'claim' && 'Contributors pick which items they had'}
                    {defaultMode === 'split' && `Bill split ${personCount} ways — ${formatCurrency(total / parseInt(personCount))} each`}
                    {defaultMode === 'custom' && 'Contributors enter their own amount'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block text-foreground">
                    Your Email
                  </label>
                  <Input
                    type="email"
                    value={hostEmail}
                    onChange={(e) => setHostEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {authUserId
                      ? '✓ Linked to your account'
                      : 'Get notified when people pay'}
                  </p>
                </div>

                <div className="gradient-divider" />

                <div className="space-y-1">
                  <h3 className="font-semibold text-sm text-foreground">Payment Methods</h3>
                  <p className="text-xs text-muted-foreground">
                    At least one required
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block text-foreground">
                    Venmo Handle
                  </label>
                  <Input
                    value={venmoHandle}
                    onChange={(e) => setVenmoHandle(sanitizeVenmoHandle(e.target.value))}
                    placeholder="e.g., john-doe"
                  />
                  {venmoHandle && (
                    <a
                      href={getVenmoProfileLink(venmoHandle)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      ✓ Verify: {getVenmoProfileLink(venmoHandle)}
                    </a>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block text-foreground">
                    Zelle Email or Phone
                  </label>
                  <Input
                    value={zelleInfo}
                    onChange={(e) => setZelleInfo(e.target.value)}
                    placeholder="e.g., john@email.com or (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block text-foreground">
                    CashApp Tag
                  </label>
                  <Input
                    value={cashappHandle}
                    onChange={(e) => setCashappHandle(sanitizeCashAppHandle(e.target.value))}
                    placeholder="e.g., johndoe"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block text-foreground">
                    PayPal.me Username
                  </label>
                  <Input
                    value={paypalHandle}
                    onChange={(e) => setPaypalHandle(sanitizePayPalHandle(e.target.value))}
                    placeholder="e.g., johndoe"
                  />
                  {paypalHandle && (
                    <a
                      href={getPayPalProfileLink(paypalHandle)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      ✓ Verify: {getPayPalProfileLink(paypalHandle)}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Total bill</p>
                  <p className="text-4xl font-extrabold font-[family-name:var(--font-main)] text-gradient">
                    {formatCurrency(total)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {items.length} item{items.length !== 1 && 's'}
                    {personCount &&
                      ` · ${personCount} people · ~${formatCurrency(total / parseInt(personCount))}/person`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Validation */}
            {(items.length === 0 || total <= 0) && (
              <div className="p-3 bg-coral/10 border border-coral/20 rounded-xl text-coral text-sm text-center">
                {items.length === 0
                  ? '⚠️ Add at least one item to your bill'
                  : '⚠️ Total must be greater than $0'}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('review')} className="flex-1 gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                onClick={handlePublish}
                className="flex-1 gap-2 text-base animate-cta-glow rounded-xl"
                size="lg"
                disabled={items.length === 0 || total <= 0}
              >
                <Rocket className="w-4 h-4" /> Publish &amp; Share
              </Button>
            </div>
          </div>
        )}

        {/* Publishing state */}
        {step === 'publishing' && (
          <div className="flex flex-col items-center justify-center py-24 space-y-8 enter">
            <div className="relative">
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-primary/20 animate-ping" />
              <div className="w-24 h-24 relative flex items-center justify-center">
                <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <Rocket className="absolute w-10 h-10 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold font-[family-name:var(--font-main)]">
                Creating your bill...
              </p>
              <p className="text-muted-foreground">Generating your share link...</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
