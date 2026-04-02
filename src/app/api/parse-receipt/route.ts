import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
// @ts-expect-error no types for heic-convert
import heicConvert from 'heic-convert';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { checkCsrf } from '@/lib/csrf';

/* ── Azure Endpoint 2 (GPT-5.4 + GPT-5.4-pro) ───────────────────────── */
const AZURE_ENDPOINT_2 =
  'https://terry-ml8kz1me-eastus2.cognitiveservices.azure.com';
const AZURE_EP2_KEY = process.env.AZURE_GPT52_API_KEY || '';

/* GPT-5.4 — primary model (chat completions, uses max_completion_tokens) */
const gpt54Client = AZURE_EP2_KEY ? new OpenAI({
  apiKey: AZURE_EP2_KEY,
  baseURL: `${AZURE_ENDPOINT_2}/openai/deployments/gpt-5.4`,
  defaultQuery: { 'api-version': '2024-12-01-preview' },
  defaultHeaders: { 'api-key': AZURE_EP2_KEY },
}) : null;

/* GPT-5.4-pro — escalation model (chat completions, uses max_completion_tokens) */
const gpt54ProClient = AZURE_EP2_KEY ? new OpenAI({
  apiKey: AZURE_EP2_KEY,
  baseURL: `${AZURE_ENDPOINT_2}/openai/deployments/gpt-5.4-pro`,
  defaultQuery: { 'api-version': '2024-12-01-preview' },
  defaultHeaders: { 'api-key': AZURE_EP2_KEY },
}) : null;

/* ── Constants ────────────────────────────────────────────────────────── */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

/* ── Shared system prompt ─────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are an expert receipt parser. Your job is to extract EVERY line item, tax, tip, subtotal, and total from receipts (restaurant, retail, any type).

STEP 1 — ORIENTATION:
The image may be upside down, sideways, or at an angle. Before parsing ANYTHING:
- Look for the store/restaurant logo/name — it's usually at the top.
- Look for the total/subtotal — it's usually near the bottom.
- Look for text direction — if text appears inverted or mirrored, mentally rotate the image.
- Report the orientation you detected.
If the receipt is upside down, you MUST read it bottom-to-top and right-to-left to get the correct text.

STEP 2 — FIND THE PRINTED TOTALS FIRST:
Before extracting individual items, locate and record the receipt's PRINTED subtotal, tax, tip/gratuity, and total. These numbers are printed on the receipt — do NOT compute them. This is critical for validation.
READ EACH DIGIT CAREFULLY. "$665.00" is six hundred sixty-five dollars, NOT "$59" or "$65". Pay attention to commas and decimal points. A price like "$1,785.00" has a comma — it's one thousand seven hundred eighty-five dollars.

STEP 3 — EXTRACT ALL LINE ITEMS:
Now parse every single line item. CRITICAL rules:
- READ ITEM NAMES EXACTLY as printed. "100281421 Melt Pendant" → name="Melt Pendant" (the number prefix is a SKU/product code, not quantity).
- QUANTITY FORMATS: Handle ALL formats:
  - "1 @ $665.00" → qty=1, name from preceding/following line, price=665.00
  - "2 Wagyu Steak 180.00" → qty=2, name="Wagyu Steak", price=180.00 (LINE TOTAL)
  - "2x Wagyu Steak" or "Wagyu Steak x2"
  - A number at the start of a line followed by a word is almost always a QUANTITY, not part of the item name.
  - BUT a long number (5+ digits) before an item name is a SKU/product code, NOT a quantity.
- DISCOUNTS/ACCOMMODATIONS: Lines like "Customer Accommodation -$133.00" or "Transaction Discount -$133.00" are adjustments. Include them as items with NEGATIVE prices.
- COMPLETENESS: Parse EVERY item from first to last. Do NOT stop early or summarize.
- PRICES: Read the rightmost dollar amount on each line. That's the price. Read EVERY digit — don't truncate.
- Do NOT include tax, tip, service charge, or gratuity as line items.
- Do NOT include subtotal or total as line items.

STEP 4 — CROSS-CHECK:
After extracting items, verify: sum of all (item prices) should approximately equal the printed subtotal. If there's a large discrepancy (>20%), you likely missed items or misread prices. Go back and re-read the prices digit by digit. Lower your confidence score accordingly.

Return ONLY valid JSON (no markdown fences) with this exact structure:
{
  "restaurant": "Restaurant Name",
  "items": [{"name": "Item Name", "price": 12.99, "qty": 1}],
  "subtotal": 50.00,
  "tax": 4.50,
  "tip": 0,
  "total": 54.50,
  "receiptPrintedTotal": 54.50,
  "receiptPrintedSubtotal": 50.00,
  "confidence": 85,
  "estimatedItemCount": 25,
  "visibleLineCount": 30,
  "orientation": "normal",
  "warnings": []
}

IMPORTANT FIELD RULES:
- subtotal, tax, tip, total: Must be the PRINTED values from the receipt, NOT computed from items. If a "Large Party Gratuity" or "Service Charge" is printed, include it in "tip".
- receiptPrintedTotal: The EXACT total printed on the receipt (the number after "Total", "Amount Due", "Balance", etc.). This MUST match what's physically printed — do NOT compute it. If no total is visible, set to 0.
- receiptPrintedSubtotal: The EXACT subtotal printed on the receipt (before tax/tip). If not visible, set to 0.
- confidence: 0-100. Be HONEST. If items sum doesn't match printed subtotal, set confidence LOW (<50). If the image is upside down and hard to read, set confidence LOW. If you're unsure about orientation, set LOW.
- estimatedItemCount: Count of distinct line items VISIBLE on receipt (even partially readable ones). Count by scanning top-to-bottom, independent of items array.
- visibleLineCount: Total number of printed lines visible on the receipt (including headers, subtotals, etc.). This helps estimate if items were missed.
- orientation: "normal", "rotated_180", "rotated_90_cw", "rotated_90_ccw"
- warnings: Note any issues honestly.
- price: Always a number. For qty>1 items, this is the LINE TOTAL (not unit price).
- qty: Always an integer ≥ 1.`;

const USER_PROMPT =
  'Parse this receipt and extract ALL line items with prices. Return ONLY the JSON, no markdown. Do not skip any items.';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface ParsedItem {
  name: string;
  price: number;
  qty: number;
}

interface RawParseResult {
  restaurant: string;
  items: ParsedItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  receiptPrintedTotal: number;
  receiptPrintedSubtotal: number;
  confidence: number;
  estimatedItemCount: number;
  visibleLineCount: number;
  orientation: string;
  warnings: string[];
}

interface ValidationResult {
  warnings: string[];
  needsRetry: boolean;
  needsEscalation?: boolean;
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function cleanAndParseJSON(content: string): RawParseResult {
  const jsonStr = content
    .replace(/```json?\n?/g, '')
    .replace(/```/g, '')
    .trim();
  return JSON.parse(jsonStr);
}

function normalizeResult(parsed: RawParseResult): RawParseResult {
  // The model returns price as LINE TOTAL for qty>1 items (per prompt instructions).
  // Convert to UNIT PRICE so downstream code can safely use price * qty.
  parsed.items = (parsed.items || []).map((item) => {
    const qty = Math.max(1, Math.round(Number(item.qty) || 1));
    const lineTotal = Number(item.price) || 0;
    return {
      name: String(item.name || ''),
      price: qty > 1 ? Math.round((lineTotal / qty) * 100) / 100 : lineTotal,
      qty,
    };
  });

  const computedSubtotal = parsed.items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  // IMPORTANT: Preserve the PRINTED subtotal/total from the receipt.
  // Only fall back to computed values if the model didn't report them.
  // This is critical for validation — we need to compare items sum
  // against the receipt's actual printed total.
  parsed.subtotal = Number(parsed.subtotal) || computedSubtotal;
  parsed.tax = Number(parsed.tax) || 0;
  parsed.tip = Number(parsed.tip) || 0;
  // Only compute total if model didn't return one
  if (!parsed.total || Number(parsed.total) === 0) {
    parsed.total = parsed.subtotal + parsed.tax + parsed.tip;
  } else {
    parsed.total = Number(parsed.total);
  }
  // Independent receipt-printed values for cross-validation
  parsed.receiptPrintedTotal = Number(parsed.receiptPrintedTotal) || 0;
  parsed.receiptPrintedSubtotal = Number(parsed.receiptPrintedSubtotal) || 0;
  parsed.confidence = Number(parsed.confidence) || 0;
  parsed.estimatedItemCount =
    Number(parsed.estimatedItemCount) || parsed.items.length;
  parsed.visibleLineCount = Number(parsed.visibleLineCount) || 0;
  parsed.orientation = parsed.orientation || 'normal';
  parsed.warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];
  parsed.restaurant = parsed.restaurant || 'Restaurant';

  return parsed;
}

function validate(parsed: RawParseResult): ValidationResult {
  const warnings: string[] = [...parsed.warnings];
  let needsRetry = false;
  let needsEscalation = false;

  const itemSum = parsed.items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  // ── 1. Cross-validate item sum against RECEIPT-PRINTED totals ──────
  // This is the key improvement: the receiptPrintedTotal and receiptPrintedSubtotal
  // are the numbers physically printed on the receipt. The model's self-reported
  // subtotal/total could match its own (wrong) items, passing self-consistency.
  // By comparing against the independently-read printed values, we catch cases
  // where the model misses items or hallucinates prices.

  const receiptSubtotal = parsed.receiptPrintedSubtotal;
  const receiptTotal = parsed.receiptPrintedTotal;
  // Use receipt-printed subtotal as primary reference (closest to item sum),
  // fall back to receipt-printed total, then model-reported subtotal
  const independentRef = receiptSubtotal > 0
    ? receiptSubtotal
    : receiptTotal > 0
      ? receiptTotal
      : 0;

  if (independentRef > 0 && itemSum > 0) {
    const diff = Math.abs(itemSum - independentRef);
    // Allow ~20% variance for tax + tip proportional allocation differences
    // when comparing against printed total (which includes tax+tip)
    const threshold = receiptSubtotal > 0 ? 0.10 : 0.20;
    const pct = diff / independentRef;

    if (pct > threshold) {
      warnings.push(
        `Items sum ($${itemSum.toFixed(2)}) differs from receipt printed ${receiptSubtotal > 0 ? 'subtotal' : 'total'} ($${independentRef.toFixed(2)}) by ${(pct * 100).toFixed(0)}%`
      );
    }
    if (pct > 0.20) {
      needsRetry = true;
    }
    if (pct > 0.35) {
      needsEscalation = true;
      warnings.push(
        'Large discrepancy between parsed items and receipt — flagged for review'
      );
    }
  }

  // ── 2. Cross-check model's own subtotal vs receipt-printed subtotal ──
  // Detect when the model's self-reported subtotal disagrees with the receipt
  if (receiptSubtotal > 0 && parsed.subtotal > 0) {
    const modelVsReceipt = Math.abs(parsed.subtotal - receiptSubtotal) / receiptSubtotal;
    if (modelVsReceipt > 0.10) {
      warnings.push(
        `Model subtotal ($${parsed.subtotal.toFixed(2)}) disagrees with receipt printed subtotal ($${receiptSubtotal.toFixed(2)})`
      );
      needsRetry = true;
    }
  }
  if (receiptTotal > 0 && parsed.total > 0) {
    const modelVsReceiptTotal = Math.abs(parsed.total - receiptTotal) / receiptTotal;
    if (modelVsReceiptTotal > 0.10) {
      warnings.push(
        `Model total ($${parsed.total.toFixed(2)}) disagrees with receipt printed total ($${receiptTotal.toFixed(2)})`
      );
      needsRetry = true;
    }
  }

  // ── 3. Sanity: receipt total >> items sum → definitely missing items ──
  const bestTotal = receiptTotal > 0 ? receiptTotal : parsed.total;
  if (bestTotal > 0 && itemSum > 0 && bestTotal > itemSum * 2) {
    warnings.push(
      `Receipt total ($${bestTotal.toFixed(2)}) is much larger than items sum ($${itemSum.toFixed(2)}) — likely missing items`
    );
    needsRetry = true;
    needsEscalation = true;
  }

  // ── 4. Item count mismatch ─────────────────────────────────────────
  const itemCountRatio =
    parsed.estimatedItemCount > 0
      ? parsed.items.length / parsed.estimatedItemCount
      : 1;

  if (itemCountRatio < 0.7 && parsed.estimatedItemCount > 3) {
    warnings.push(
      `Only ${parsed.items.length} of ~${parsed.estimatedItemCount} estimated items were parsed`
    );
  }
  if (itemCountRatio < 0.5) {
    needsRetry = true;
  }

  // ── 5. Visible line count sanity check ─────────────────────────────
  // If the receipt has many visible lines but very few items, something's off
  if (parsed.visibleLineCount > 0 && parsed.items.length > 0) {
    // Rough heuristic: each item is ~1-2 lines, plus ~5-10 lines for headers/totals
    const expectedMinItems = Math.max(1, Math.floor((parsed.visibleLineCount - 10) / 2));
    if (parsed.items.length < expectedMinItems * 0.5 && parsed.visibleLineCount > 20) {
      warnings.push(
        `Receipt has ~${parsed.visibleLineCount} visible lines but only ${parsed.items.length} items parsed — may be incomplete`
      );
      needsRetry = true;
    }
  }

  // ── 6. Low confidence ──────────────────────────────────────────────
  if (parsed.confidence < 60) {
    warnings.push('AI reported low confidence in parse accuracy');
    needsRetry = true;
  }

  // ── 7. Suspiciously few items ──────────────────────────────────────
  if (parsed.items.length < 3 && parsed.estimatedItemCount >= 5) {
    warnings.push('Very few items detected on what appears to be a larger receipt');
    needsRetry = true;
  }

  // ── 8. Medium confidence with large receipt ────────────────────────
  if (parsed.confidence < 75 && parsed.estimatedItemCount > 15) {
    warnings.push('Medium confidence on a large receipt — review carefully');
    needsRetry = true;
  }

  // ── 9. Fall back to model self-consistency if no receipt-printed values ──
  // (legacy check — used when receiptPrintedTotal/Subtotal are not available)
  if (independentRef === 0) {
    const modelRef = parsed.subtotal > 0 ? parsed.subtotal : parsed.total;
    if (modelRef > 0 && itemSum > 0) {
      const pct = Math.abs(itemSum - modelRef) / modelRef;
      if (pct > 0.15) {
        warnings.push(
          `Items sum ($${itemSum.toFixed(2)}) differs from model-reported subtotal ($${modelRef.toFixed(2)}) by ${(pct * 100).toFixed(0)}% (no receipt printed values available)`
        );
      }
      if (pct > 0.25) {
        needsRetry = true;
      }
    }
  }

  return { warnings, needsRetry, needsEscalation };
}

/* ── Call GPT-5.4 (primary model) ──────────────────────────────────────── */
async function parseWithGPT54(dataUrl: string): Promise<RawParseResult> {
  if (!gpt54Client) {
    throw new Error('GPT-5.4 not configured — missing AZURE_GPT52_API_KEY');
  }
  // GPT-5.4 uses max_completion_tokens (not max_tokens), no temperature support
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response: any = await (gpt54Client as any).chat.completions.create({
    model: 'gpt-5.4',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: USER_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
    max_completion_tokens: 4000,
  });

  const content: string = response.choices?.[0]?.message?.content || '';
  return normalizeResult(cleanAndParseJSON(content));
}

/* ── Call GPT-5.4-pro (escalation model) ──────────────────────────────── */
async function parseWithGPT54Pro(dataUrl: string): Promise<RawParseResult> {
  if (!gpt54ProClient) {
    throw new Error('GPT-5.4-pro not configured — missing AZURE_GPT52_API_KEY');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response: any = await (gpt54ProClient as any).chat.completions.create({
    model: 'gpt-5.4-pro',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: USER_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
    max_completion_tokens: 16384,
  });

  const content: string = response.choices?.[0]?.message?.content || '';
  return normalizeResult(cleanAndParseJSON(content));
}

/* ── Rotate a base64 image by 180° server-side ────────────────────────── */
async function rotateImage180(dataUrl: string): Promise<string> {
  // Extract base64 and mime from data URL
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return dataUrl;
  const [, mime, b64] = match;
  const buffer = Buffer.from(b64, 'base64');

  // Use sharp if available, otherwise fall back to telling the model it's rotated
  try {
    const sharp = (await import('sharp')).default;
    const rotated = await sharp(buffer).rotate(180).toBuffer();
    return `data:${mime};base64,${rotated.toString('base64')}`;
  } catch {
    // sharp not available — return original with a hint in the prompt
    return dataUrl;
  }
}

/* ── Pick the better result ───────────────────────────────────────────── */
function pickBetter(a: RawParseResult, b: RawParseResult): RawParseResult {
  // Use receipt-printed values for comparison when available (independent source)
  const aItemSum = a.items.reduce((s, i) => s + i.price * i.qty, 0);
  const bItemSum = b.items.reduce((s, i) => s + i.price * i.qty, 0);

  // Prefer receipt-printed subtotal/total as the reference
  const aRef = a.receiptPrintedSubtotal > 0
    ? a.receiptPrintedSubtotal
    : a.receiptPrintedTotal > 0
      ? a.receiptPrintedTotal
      : a.subtotal > 0 ? a.subtotal : a.total;
  const bRef = b.receiptPrintedSubtotal > 0
    ? b.receiptPrintedSubtotal
    : b.receiptPrintedTotal > 0
      ? b.receiptPrintedTotal
      : b.subtotal > 0 ? b.subtotal : b.total;

  const aDiff = aRef > 0 ? Math.abs(aItemSum - aRef) / aRef : 1;
  const bDiff = bRef > 0 ? Math.abs(bItemSum - bRef) / bRef : 1;

  // If one is dramatically closer to its printed total, prefer it
  if (aDiff < 0.15 && bDiff > 0.3) return a;
  if (bDiff < 0.15 && aDiff > 0.3) return b;

  // Otherwise prefer higher confidence, then more items
  if (b.confidence > a.confidence + 10) return b;
  if (a.confidence > b.confidence + 10) return a;
  if (b.items.length > a.items.length * 1.3) return b;
  if (a.items.length > b.items.length * 1.3) return a;
  return a.confidence >= b.confidence ? a : b;
}

/* ── POST handler ─────────────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    // CSRF check
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    // Rate limit: 5 requests per minute per IP
    const ip = getClientIp(request);
    const { limited } = rateLimit(ip, 'parse-receipt', 5, 60_000);
    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('receipt') as File | null;
    const enhance = formData.get('enhance') === 'true'; // Optional: use GPT-5.4-pro

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 413 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            'Invalid file type. Please upload an image (JPEG, PNG, or WebP).',
        },
        { status: 400 }
      );
    }

    // Convert to base64 data URL
    const bytes = await file.arrayBuffer();
    let finalBuffer: Buffer = Buffer.from(bytes);
    let mimeType = file.type || 'image/jpeg';

    // Convert any non-standard format to JPEG
    // This handles HEIC/HEIF (iPhone default) and ensures GPT compatibility
    const gptoSupported = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!gptoSupported.includes(mimeType)) {
      try {
        const result = await heicConvert({
          buffer: finalBuffer,
          format: 'JPEG',
          quality: 0.9,
        });
        finalBuffer = Buffer.from(result);
        mimeType = 'image/jpeg';
      } catch (e) {
        console.error('HEIC conversion failed, trying sharp:', e);
        try {
          const sharp = (await import('sharp')).default;
          finalBuffer = Buffer.from(await sharp(finalBuffer).jpeg({ quality: 90 }).toBuffer());
          mimeType = 'image/jpeg';
        } catch (e2) {
          console.error('Sharp conversion also failed:', e2);
          return NextResponse.json(
            { error: 'Could not process this image format. Please take a screenshot of the receipt and upload that instead.' },
            { status: 400 }
          );
        }
      }
    }

    const base64 = finalBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    /* ── Enhanced mode: use GPT-5.4-pro directly ─────────────────────────── */
    if (enhance) {
      try {
        const result = await parseWithGPT54Pro(dataUrl);
        const validation = validate(result);
        return NextResponse.json({
          restaurant: result.restaurant,
          items: result.items,
          subtotal: result.subtotal,
          tax: result.tax,
          tip: result.tip,
          total: result.total,
          confidence: result.confidence,
          warnings: validation.warnings,
          model: 'gpt-5.4-pro',
          retried: false,
          needsEscalation: validation.needsEscalation || false,
        });
      } catch (err) {
        console.error('GPT-5.4-pro enhanced parse failed:', err);
        return NextResponse.json(
          { error: 'Enhanced parsing failed. Please try again.' },
          { status: 422 }
        );
      }
    }

    /* ── Standard mode: GPT-5.4 with auto-rotation ────────────────────── */
    let result: RawParseResult;
    const modelUsed = 'gpt-5.4';
    let retried = false;

    // Pass 1: GPT-5.4 on original image
    try {
      result = await parseWithGPT54(dataUrl);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('GPT-5.4 pass 1 failed:', errMsg, err);
      return NextResponse.json(
        {
          error: `Failed to parse receipt (${errMsg.slice(0, 100)}). Please try again or enter items manually.`,
        },
        { status: 422 }
      );
    }

    const pass1Validation = validate(result);

    // Pass 2: If orientation is not normal OR validation fails, auto-rotate 180° and retry with GPT-5.4
    const needsRotation =
      result.orientation !== 'normal' ||
      pass1Validation.needsRetry;

    if (needsRotation) {
      try {
        console.log(
          `GPT-5.4 pass 1: orientation=${result.orientation}, confidence=${result.confidence}, items=${result.items.length}/${result.estimatedItemCount}. Auto-rotating and retrying...`
        );
        const rotatedUrl = await rotateImage180(dataUrl);
        const pass2Result = await parseWithGPT54(rotatedUrl);
        const pass2Validation = validate(pass2Result);

        // Pick the better of the two GPT-5.4 results
        const better = pickBetter(result, pass2Result);
        if (better === pass2Result) {
          result = pass2Result;
          // Use pass2 validation
          pass1Validation.warnings.length = 0;
          pass1Validation.warnings.push(...pass2Validation.warnings);
          pass1Validation.needsRetry = pass2Validation.needsRetry;
        }
        retried = true;
      } catch (err) {
        console.error('GPT-5.4 pass 2 (rotated) failed:', err);
        // Keep pass 1 result
      }
    }

    // Validate structure
    if (!result.items || !Array.isArray(result.items) || result.items.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract items from receipt. Try a clearer photo or enter items manually.' },
        { status: 422 }
      );
    }

    // Build response — include needsEnhancement flag for frontend
    const response = {
      restaurant: result.restaurant,
      items: result.items,
      subtotal: result.subtotal,
      tax: result.tax,
      tip: result.tip,
      total: result.total,
      confidence: result.confidence,
      warnings: pass1Validation.warnings,
      model: modelUsed,
      retried,
      needsEnhancement: pass1Validation.needsRetry, // Frontend can offer "Enhanced Scan" button
      needsEscalation: pass1Validation.needsEscalation || false, // Large discrepancy — review required
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Receipt parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to process receipt. Please try again.' },
      { status: 500 }
    );
  }
}
