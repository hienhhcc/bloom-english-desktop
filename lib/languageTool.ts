// LanguageTool API integration for grammar checking

export interface GrammarError {
  message: string;
  offset: number;
  length: number;
  replacements: string[];
  context: string;
}

export interface GrammarCheckResult {
  isCorrect: boolean;
  errors: GrammarError[];
}

interface LanguageToolMatch {
  message: string;
  offset: number;
  length: number;
  replacements: { value: string }[];
  context: {
    text: string;
    offset: number;
    length: number;
  };
}

interface LanguageToolResponse {
  matches: LanguageToolMatch[];
}

const API_URL = 'https://api.languagetool.org/v2/check';

export async function checkGrammar(text: string): Promise<GrammarCheckResult> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        language: 'en-US',
      }),
    });

    if (!response.ok) {
      throw new Error(`LanguageTool API error: ${response.status}`);
    }

    const data: LanguageToolResponse = await response.json();

    return {
      isCorrect: data.matches.length === 0,
      errors: data.matches.map((match) => ({
        message: match.message,
        offset: match.offset,
        length: match.length,
        replacements: match.replacements.slice(0, 3).map((r) => r.value),
        context: match.context.text,
      })),
    };
  } catch (error) {
    console.error('Grammar check failed:', error);
    // Return a result indicating check failed but don't block the user
    return {
      isCorrect: true, // Assume correct if API fails
      errors: [],
    };
  }
}

/**
 * Generate common word variations (plurals, verb forms, etc.)
 */
export function generateWordVariations(word: string): string[] {
  const variations: string[] = [word];
  const lowerWord = word.toLowerCase();

  // Plural forms for nouns
  if (lowerWord.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(lowerWord[lowerWord.length - 2])) {
    // words ending in consonant + y: change y to ies (e.g., baby -> babies)
    variations.push(lowerWord.slice(0, -1) + 'ies');
  } else if (lowerWord.endsWith('s') || lowerWord.endsWith('x') || lowerWord.endsWith('z') ||
             lowerWord.endsWith('ch') || lowerWord.endsWith('sh')) {
    // words ending in s, x, z, ch, sh: add es
    variations.push(lowerWord + 'es');
  } else if (lowerWord.endsWith('f')) {
    // words ending in f: change f to ves (e.g., leaf -> leaves)
    variations.push(lowerWord.slice(0, -1) + 'ves');
  } else if (lowerWord.endsWith('fe')) {
    // words ending in fe: change fe to ves (e.g., knife -> knives)
    variations.push(lowerWord.slice(0, -2) + 'ves');
  } else {
    // regular plural: add s
    variations.push(lowerWord + 's');
  }

  // Verb forms
  // -ing form
  if (lowerWord.endsWith('e') && !lowerWord.endsWith('ee')) {
    variations.push(lowerWord.slice(0, -1) + 'ing'); // make -> making
  } else if (lowerWord.endsWith('ie')) {
    variations.push(lowerWord.slice(0, -2) + 'ying'); // die -> dying
  } else {
    variations.push(lowerWord + 'ing');
  }

  // -ed form (past tense)
  if (lowerWord.endsWith('e')) {
    variations.push(lowerWord + 'd'); // bake -> baked
  } else if (lowerWord.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(lowerWord[lowerWord.length - 2])) {
    variations.push(lowerWord.slice(0, -1) + 'ied'); // try -> tried
  } else {
    variations.push(lowerWord + 'ed');
  }

  // -s form (third person singular)
  if (lowerWord.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(lowerWord[lowerWord.length - 2])) {
    variations.push(lowerWord.slice(0, -1) + 'ies'); // try -> tries
  } else if (lowerWord.endsWith('s') || lowerWord.endsWith('x') || lowerWord.endsWith('z') ||
             lowerWord.endsWith('ch') || lowerWord.endsWith('sh') || lowerWord.endsWith('o')) {
    variations.push(lowerWord + 'es');
  } else {
    variations.push(lowerWord + 's');
  }

  // -er form (comparative/agent)
  if (lowerWord.endsWith('e')) {
    variations.push(lowerWord + 'r');
  } else {
    variations.push(lowerWord + 'er');
  }

  // -est form (superlative)
  if (lowerWord.endsWith('e')) {
    variations.push(lowerWord + 'st');
  } else {
    variations.push(lowerWord + 'est');
  }

  return [...new Set(variations)]; // Remove duplicates
}

/**
 * Check if the translation contains the vocabulary word or any of its word family variations
 */
export function containsVocabularyWord(
  translation: string,
  word: string,
  wordFamily: { word: string }[]
): boolean {
  const lowerTranslation = translation.toLowerCase();

  // Generate variations of the main word
  const wordVariations = generateWordVariations(word);

  // Check all variations of the main word
  for (const variation of wordVariations) {
    const wordRegex = new RegExp(`\\b${escapeRegExp(variation)}\\b`, 'i');
    if (wordRegex.test(lowerTranslation)) {
      return true;
    }
  }

  // Check word family variations and their generated forms
  for (const variant of wordFamily) {
    const familyVariations = generateWordVariations(variant.word);
    for (const variation of familyVariations) {
      const variantRegex = new RegExp(`\\b${escapeRegExp(variation)}\\b`, 'i');
      if (variantRegex.test(lowerTranslation)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find the vocabulary word (or a variation) in a sentence.
 * Returns the matched text (preserving original case) and its position.
 * Search order: exact word → word variations → word family → word family variations
 */
export function findVocabularyWordInSentence(
  sentence: string,
  word: string,
  wordFamily: { word: string }[]
): { matched: string; start: number; end: number } | null {
  // Helper to find first match of any candidate in the sentence
  function findFirst(candidates: string[]): { matched: string; start: number; end: number } | null {
    for (const candidate of candidates) {
      const regex = new RegExp(`\\b${escapeRegExp(candidate)}\\b`, 'i');
      const match = regex.exec(sentence);
      if (match) {
        return {
          matched: match[0], // preserves original case from sentence
          start: match.index,
          end: match.index + match[0].length,
        };
      }
    }
    return null;
  }

  // 1. Exact word
  const exact = findFirst([word]);
  if (exact) return exact;

  // 2. Word variations
  const variations = generateWordVariations(word);
  const fromVariations = findFirst(variations);
  if (fromVariations) return fromVariations;

  // 3. Word family (exact)
  const familyWords = wordFamily.map((wf) => wf.word);
  const fromFamily = findFirst(familyWords);
  if (fromFamily) return fromFamily;

  // 4. Word family variations
  for (const familyWord of familyWords) {
    const familyVariations = generateWordVariations(familyWord);
    const fromFamilyVariation = findFirst(familyVariations);
    if (fromFamilyVariation) return fromFamilyVariation;
  }

  return null;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
