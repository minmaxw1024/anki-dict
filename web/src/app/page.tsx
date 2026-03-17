'use client';

import { useState, useCallback } from 'react';
import type { WordEntry, LookupResult } from '@/lib/types';
import { generateAnkiCSV } from '@/lib/csv-exporter';
import WordCard from '@/components/WordCard';

type LookupStatus = 'idle' | 'loading' | 'done';

export default function Home() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<LookupResult[]>([]);
  const [status, setStatus] = useState<LookupStatus>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const parseWords = (text: string): string[] => {
    return text
      .split(/[,\n\r]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0 && /^[a-zA-Z\s-]+$/.test(w))
      .filter((w, i, arr) => arr.indexOf(w) === i);
  };

  const handleLookup = useCallback(async () => {
    const words = parseWords(input);
    if (words.length === 0) return;

    setStatus('loading');
    setResults([]);
    setProgress({ current: 0, total: words.length });

    const batchSize = 5;
    const allResults: LookupResult[] = [];

    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);

      try {
        const res = await fetch('/api/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ words: batch }),
        });

        const data = await res.json();
        if (data.results) {
          allResults.push(...data.results);
          setResults([...allResults]);
        }
      } catch {
        batch.forEach(w => {
          allResults.push({ word: w, success: false, error: 'Network error' });
        });
        setResults([...allResults]);
      }

      setProgress({ current: Math.min(i + batchSize, words.length), total: words.length });
    }

    setStatus('done');
  }, [input]);

  const successResults = results.filter(r => r.success && r.data);
  const failedResults = results.filter(r => !r.success);

  const handleExportCSV = () => {
    const words = successResults.map(r => r.data!);
    if (words.length === 0) return;

    const csv = generateAnkiCSV(words);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anki-words-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = parseWords(input).length;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b-2 border-[#e5e5e5] shadow-[0_2px_0_#e5e5e5]">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#58cc02] flex items-center justify-center text-white text-xl font-extrabold shadow-[0_3px_0_#43c000]">
            A
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#4b4b4b]">Anki Dict</h1>
            <p className="text-xs font-bold text-[#afafaf] uppercase tracking-wider">Batch Card Generator</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-[0_4px_0_#e5e5e5] p-6 mb-8">
          <label className="block text-sm font-extrabold text-[#afafaf] uppercase tracking-wider mb-3">
            Enter Words
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"Paste words here, separated by commas or new lines\n\ne.g. apple, banana, cherry\nor one word per line"}
            className="w-full h-40 p-4 rounded-xl border-2 border-[#e5e5e5] bg-[#f7f7f7] text-[#4b4b4b] text-base font-semibold resize-none focus:outline-none focus:border-[#58cc02] focus:bg-white transition-colors placeholder:text-[#cfcfcf]"
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm font-bold text-[#afafaf]">
              {wordCount > 0 ? `${wordCount} word${wordCount > 1 ? 's' : ''} detected` : 'No words yet'}
            </span>
            <button
              onClick={handleLookup}
              disabled={wordCount === 0 || status === 'loading'}
              className="px-6 py-3 rounded-xl bg-[#58cc02] text-white font-extrabold text-base border-b-4 border-[#43c000] hover:bg-[#61d800] active:border-b-0 active:mt-1 disabled:bg-[#e5e5e5] disabled:border-[#cccccc] disabled:text-[#afafaf] disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {status === 'loading' ? 'Looking up...' : 'Generate Cards'}
            </button>
          </div>
        </div>

        {/* Progress */}
        {status === 'loading' && (
          <div className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-[0_4px_0_#e5e5e5] p-6 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="spinner" />
              <span className="text-sm font-bold text-[#777]">
                Looking up words... {progress.current}/{progress.total}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Results Summary & Export */}
        {status === 'done' && results.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-[0_4px_0_#e5e5e5] p-6 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-[#58cc02]">{successResults.length}</div>
                  <div className="text-xs font-bold text-[#afafaf] uppercase">Found</div>
                </div>
                {failedResults.length > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-[#ff4b4b]">{failedResults.length}</div>
                    <div className="text-xs font-bold text-[#afafaf] uppercase">Not Found</div>
                  </div>
                )}
              </div>
              {successResults.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="px-6 py-3 rounded-xl bg-[#1cb0f6] text-white font-extrabold text-base border-b-4 border-[#0095d9] hover:bg-[#40bff8] active:border-b-0 active:mt-1 transition-all cursor-pointer"
                >
                  Export CSV for Anki
                </button>
              )}
            </div>

            {failedResults.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-[#fff0f0] border-2 border-[#ffcccc]">
                <p className="text-sm font-bold text-[#ff4b4b] mb-1">Words not found:</p>
                <p className="text-sm text-[#777]">
                  {failedResults.map(r => r.word).join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Word Cards */}
        {successResults.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-sm font-extrabold text-[#afafaf] uppercase tracking-wider">
              Preview Cards ({successResults.length})
            </h2>
            <div className="flex flex-col items-center gap-6">
              {successResults.map(r => (
                <WordCard key={r.word} entry={r.data as WordEntry} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
