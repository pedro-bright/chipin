import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function calculateProportionalPrice(
  itemPrice: number,
  subtotal: number,
  tax: number,
  tip: number
): number {
  if (subtotal <= 0) return itemPrice;
  const multiplier = (subtotal + tax + tip) / subtotal;
  return Math.round(itemPrice * multiplier * 100) / 100;
}

/**
 * Sanitize a payment note for use in deep links.
 * Removes characters that break Venmo/CashApp URL handling:
 * parentheses, brackets, quotes, and other specials.
 */
function sanitizePaymentNote(note: string): string {
  return note
    .replace(/[()[\]{}"'<>]/g, '') // remove problematic chars
    .replace(/\s+/g, '-')          // replace spaces with hyphens (Venmo mobile shows + for spaces)
    .replace(/-{2,}/g, '-')        // collapse multiple hyphens
    .replace(/^-|-$/g, '')         // trim leading/trailing hyphens
    .trim();
}

export function generateVenmoLink(
  handle: string,
  amount: number,
  note: string
): string {
  const clean = handle.startsWith('@') ? handle.slice(1) : handle;
  const safeNote = sanitizePaymentNote(note);
  // Venmo web link — opens in browser, Venmo app intercepts on mobile
  // audience=private prevents posting to Venmo feed
  return `https://venmo.com/${encodeURIComponent(clean)}?txn=pay&amount=${amount.toFixed(2)}&note=${encodeURIComponent(safeNote)}&audience=private`;
}

export function generateVenmoDeepLink(
  handle: string,
  amount: number,
  note: string
): string {
  const clean = handle.startsWith('@') ? handle.slice(1) : handle;
  const safeNote = sanitizePaymentNote(note);
  return `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(clean)}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(safeNote)}`;
}

export function generateCashAppLink(
  handle: string,
  amount: number
): string {
  const cleanHandle = handle.startsWith('$') ? handle.slice(1) : handle;
  return `https://cash.app/$${encodeURIComponent(cleanHandle)}/${amount.toFixed(2)}`;
}

// ── Payment handle sanitizers ─────────────────────────────────────────
// Strip common prefixes users accidentally include, plus full URLs.

/** Strip leading @ and venmo.com URLs → bare username */
export function sanitizeVenmoHandle(input: string): string {
  let v = input.trim();
  // Strip full Venmo URLs: https://venmo.com/u/handle or https://venmo.com/handle
  v = v.replace(/^https?:\/\/(www\.)?venmo\.com\/(u\/)?/i, '');
  // Strip leading @
  v = v.replace(/^@+/, '');
  return v;
}

/** Strip leading $ and cash.app URLs → bare tag */
export function sanitizeCashAppHandle(input: string): string {
  let v = input.trim();
  // Strip full CashApp URLs: https://cash.app/$handle
  v = v.replace(/^https?:\/\/(www\.)?cash\.app\/\$?/i, '');
  // Strip leading $
  v = v.replace(/^\$+/, '');
  return v;
}

/** Strip leading @ and paypal.me URLs → bare username */
export function sanitizePayPalHandle(input: string): string {
  let v = input.trim();
  // Strip full PayPal URLs: https://paypal.me/handle or https://www.paypal.com/paypalme/handle
  v = v.replace(/^https?:\/\/(www\.)?paypal\.(me|com\/paypalme)\//i, '');
  // Strip leading @
  v = v.replace(/^@+/, '');
  // Strip any trailing /amount
  v = v.replace(/\/[\d.]+.*$/, '');
  return v;
}

export function getVenmoProfileLink(handle: string): string {
  const clean = handle.startsWith('@') ? handle.slice(1) : handle;
  return `https://venmo.com/u/${clean}`;
}

export function generatePayPalLink(
  handle: string,
  amount: number
): string {
  const clean = handle.replace(/^@/, '').trim();
  return `https://www.paypal.com/paypalme/${encodeURIComponent(clean)}/${amount.toFixed(2)}USD`;
}

export function getPayPalProfileLink(handle: string): string {
  const clean = handle.replace(/^@/, '').trim();
  return `https://paypal.me/${clean}`;
}
