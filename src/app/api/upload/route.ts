import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { checkCsrf } from '@/lib/csrf';
// @ts-expect-error no types for heic-convert
import heicConvert from 'heic-convert';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function POST(request: NextRequest) {
  try {
    // CSRF check
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    // Rate limit: 10 uploads per minute per IP
    const ip = getClientIp(request);
    const { limited } = rateLimit(ip, 'upload', 10, 60_000);
    if (limited) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait a moment.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

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
        { error: 'Invalid file type. Please upload an image (JPEG, PNG, or WebP).' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);
    let contentType = file.type;
    let ext = 'jpg';

    // Convert HEIC/HEIF to JPEG so browsers can display the stored image
    if (file.type === 'image/heic' || file.type === 'image/heif') {
      try {
        const result = await heicConvert({
          buffer,
          format: 'JPEG',
          quality: 0.9,
        });
        buffer = Buffer.from(result);
        contentType = 'image/jpeg';
        ext = 'jpg';
      } catch (e) {
        console.error('HEIC conversion failed in upload:', e);
        // Store as-is — better than failing entirely
        ext = 'heic';
      }
    } else {
      ext = file.name.split('.').pop() || 'jpg';
    }

    const fileName = `${nanoid(12)}.${ext}`;

    const { error } = await supabase.storage
      .from('receipts')
      .upload(fileName, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
