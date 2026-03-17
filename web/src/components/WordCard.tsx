'use client';

import type { WordEntry } from '@/lib/types';
import { escapeHtml } from '@/lib/utils';

function AudioButton({ url }: { url: string }) {
  const play = () => {
    const fullUrl = url.startsWith('http')
      ? url
      : `https://dictionary.cambridge.org${url}`;
    new Audio(fullUrl).play();
  };

  return (
    <button
      onClick={play}
      className="ad-audio-btn"
      title="Play pronunciation"
    >
      🔊
    </button>
  );
}

export default function WordCard({ entry }: { entry: WordEntry }) {
  const { word, pronunciations, definitions } = entry;

  const allExamples = definitions.flatMap(d => d.examples).slice(0, 5);

  return (
    <div className="ad-card ad-back">
      <div className="ad-word">{word}</div>

      {(pronunciations.uk || pronunciations.us) && (
        <div className="ad-prons">
          {pronunciations.uk && (
            <span className="ad-pron ad-pron--uk">
              <span className="ad-pron-flag">🇬🇧</span>
              {pronunciations.uk.audioUrl && (
                <AudioButton url={pronunciations.uk.audioUrl} />
              )}
              <span className="ad-pron-ipa">{pronunciations.uk.ipa}</span>
            </span>
          )}
          {pronunciations.us && (
            <span className="ad-pron ad-pron--us">
              <span className="ad-pron-flag">🇺🇸</span>
              {pronunciations.us.audioUrl && (
                <AudioButton url={pronunciations.us.audioUrl} />
              )}
              <span className="ad-pron-ipa">{pronunciations.us.ipa}</span>
            </span>
          )}
        </div>
      )}

      {definitions.length > 0 && (
        <div className="ad-definitions">
          {definitions.map((def, i) => (
            <div key={i} style={{ marginBottom: i < definitions.length - 1 ? '12px' : 0 }}>
              <b>{def.partOfSpeech}</b>
              {def.level && <span className="level">({def.level})</span>}
              {def.category && (
                <>
                  <br />
                  <b>{def.category}:</b>
                </>
              )}
              <br />
              <span dangerouslySetInnerHTML={{ __html: escapeHtml(def.meaning) }} />
            </div>
          ))}
        </div>
      )}

      {allExamples.length > 0 && (
        <div className="ad-examples-wrap">
          <div className="ad-examples-title">Examples</div>
          <div className="ad-examples">
            <ul>
              {allExamples.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {entry.sourceUrl && entry.sourceUrl.includes('cambridge') && (
        <div className="ad-source">
          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">
            📖 View in Cambridge Dictionary
          </a>
        </div>
      )}
    </div>
  );
}
