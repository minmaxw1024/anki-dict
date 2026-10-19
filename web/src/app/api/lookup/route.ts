import { NextRequest, NextResponse } from 'next/server';
import { lookupCambridge } from '@/lib/cambridge-scraper';
import { lookupFreeDictionary } from '@/lib/free-dictionary';
import { createRateLimiter, mapWithConcurrency } from '@/lib/rate-limit';
import type { LookupResult } from '@/lib/types';

const MAX_WORDS_PER_REQUEST = 20;
// How many upstream dictionary requests one API call makes at once.
const UPSTREAM_CONCURRENCY = 3;

// Counted in words, not requests, so large batches can't dodge the limit.
const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(request: NextRequest) {
  const { words } = await request.json() as { words: string[] };

  if (!words || !Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ error: 'No words provided' }, { status: 400 });
  }

  if (words.length > MAX_WORDS_PER_REQUEST) {
    return NextResponse.json({ error: `Maximum ${MAX_WORDS_PER_REQUEST} words per request` }, { status: 400 });
  }

  const limit = limiter.take(clientIp(request), words.length);
  if (!limit.ok) {
    const retryAfter = Math.ceil(limit.retryAfterMs / 1000);
    return NextResponse.json(
      { error: `Too many lookups. Try again in ${retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const results = await mapWithConcurrency(words, UPSTREAM_CONCURRENCY, async (word): Promise<LookupResult> => {
    const cleanWord = String(word).toLowerCase().trim();
    if (!cleanWord || !/^[a-zA-Z\s-]+$/.test(cleanWord)) {
      return { word: cleanWord, success: false, error: 'Invalid word' };
    }

    try {
      const data = await lookupCambridge(cleanWord);
      return { word: cleanWord, success: true, data };
    } catch {
      try {
        const data = await lookupFreeDictionary(cleanWord);
        return { word: cleanWord, success: true, data };
      } catch {
        return { word: cleanWord, success: false, error: `Could not find "${cleanWord}"` };
      }
    }
  });

  return NextResponse.json({ results });
}
