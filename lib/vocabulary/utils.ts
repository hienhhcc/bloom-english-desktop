import type { VietnameseDefinition } from './types';

export type Accent = 'BrE' | 'AmE';

interface ParsedPhonetic {
  bre: string | null;
  ame: string | null;
}

const PHONETIC_REGEX = /(.+?)\s*\(BrE\)\s*\|\s*(.+?)\s*\(AmE\)/;

export function parsePhonetic(phonetic: string): ParsedPhonetic {
  const match = phonetic.match(PHONETIC_REGEX);
  if (!match) return { bre: null, ame: null };
  return { bre: match[1].trim(), ame: match[2].trim() };
}

export function normalizeVietnameseDefinitions(
  def: string | VietnameseDefinition[]
): VietnameseDefinition[] {
  if (Array.isArray(def)) return def;
  if (def.includes('|')) {
    return def
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ type: '', definition: s }));
  }
  return [{ type: '', definition: def }];
}

export function getPartOfSpeechColor(pos: string): string {
  const normalizedPos = pos.toLowerCase().trim();
  switch (normalizedPos) {
    case 'noun':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'verb':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'adjective':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'adverb':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
