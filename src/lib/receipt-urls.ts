/**
 * Receipt URL encoding helpers.
 *
 * Multiple receipt images are stored as a JSON array string in the
 * existing `receipt_image_url` text column (no DB migration needed).
 *
 * - Old bills:  "https://...single-url"
 * - New bills:  '["https://...url1","https://...url2"]'
 *
 * Detection: if the value starts with '[' → parse as JSON array.
 */

import type { Bill } from './types';

/** Extract all receipt image URLs from a bill. */
export function getReceiptUrls(bill: Pick<Bill, 'receipt_image_url'>): string[] {
  const raw = bill.receipt_image_url;
  if (!raw) return [];

  // JSON-encoded array?
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === 'string' && u.length > 0);
      }
    } catch {
      // Malformed JSON — fall through to single-URL
    }
  }

  // Single URL
  return [raw];
}

/** Encode an array of URLs for storage in `receipt_image_url`. */
export function encodeReceiptUrls(urls: string[]): string | null {
  if (!urls || urls.length === 0) return null;
  if (urls.length === 1) return urls[0]; // Single URL stays plain
  return JSON.stringify(urls);
}
