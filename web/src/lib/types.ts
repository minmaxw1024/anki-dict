import type { WordEntry } from '@shared/types';

export type { WordEntry, Definition } from '@shared/types';

export interface LookupResult {
  word: string;
  success: boolean;
  data?: WordEntry;
  error?: string;
}
