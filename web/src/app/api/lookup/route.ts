import { NextRequest, NextResponse } from 'next/server';
import { lookupCambridge } from '@/lib/cambridge-scraper';
import { lookupFreeDictionary } from '@/lib/free-dictionary';
import type { LookupResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  const { words } = await request.json() as { words: string[] };

  if (!words || !Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ error: 'No words provided' }, { status: 400 });
  }

  if (words.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 words per request' }, { status: 400 });
  }

  const results: LookupResult[] = await Promise.all(
    words.map(async (word): Promise<LookupResult> => {
      const cleanWord = word.toLowerCase().trim();
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
    }),
  );

  return NextResponse.json({ results });
}
