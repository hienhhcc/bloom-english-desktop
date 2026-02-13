// Pronunciation evaluation utilities

export interface PronunciationResult {
  isExactMatch: boolean;
  wordMatchScore: number;
  phoneticScore: number;
  editDistanceScore: number;
  overallScore: number;
  isPassing: boolean;
  recognizedWords: string[];
  expectedWords: string[];
  matchedWords: number;
}

interface EvaluationOptions {
  passingThreshold?: number;
  caseSensitive?: boolean;
}

/**
 * Normalize text for comparison
 * - Convert to lowercase
 * - Remove punctuation
 * - Trim whitespace
 * - Collapse multiple spaces
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Generate Soundex code for a word
 * Soundex is a phonetic algorithm that encodes words based on how they sound
 */
export function soundexCode(word: string): string {
  if (!word) return "";

  const normalized = word.toUpperCase().replace(/[^A-Z]/g, "");
  if (!normalized) return "";

  // Soundex coding table
  const codes: { [key: string]: string } = {
    B: "1",
    F: "1",
    P: "1",
    V: "1",
    C: "2",
    G: "2",
    J: "2",
    K: "2",
    Q: "2",
    S: "2",
    X: "2",
    Z: "2",
    D: "3",
    T: "3",
    L: "4",
    M: "5",
    N: "5",
    R: "6",
  };

  // Start with first letter
  let soundex = normalized[0];
  let prevCode = codes[normalized[0]] || "";

  // Process remaining letters
  for (let i = 1; i < normalized.length && soundex.length < 4; i++) {
    const code = codes[normalized[i]] || "";
    if (code && code !== prevCode) {
      soundex += code;
    }
    if (code) {
      prevCode = code;
    }
  }

  // Pad with zeros if necessary
  return (soundex + "000").slice(0, 4);
}

/**
 * Calculate phonetic similarity between two words using Soundex
 * Returns a score from 0-100
 */
function calculatePhoneticWordSimilarity(word1: string, word2: string): number {
  const code1 = soundexCode(word1);
  const code2 = soundexCode(word2);

  if (!code1 || !code2) return 0;
  if (code1 === code2) return 100;

  // Calculate partial match
  let matches = 0;
  for (let i = 0; i < 4; i++) {
    if (code1[i] === code2[i]) matches++;
  }

  return (matches / 4) * 100;
}

/**
 * Calculate word-level match score
 * Compares words in recognized text against expected text
 */
function calculateWordMatchScore(
  recognizedWords: string[],
  expectedWords: string[]
): { score: number; matchedWords: number } {
  if (expectedWords.length === 0) return { score: 100, matchedWords: 0 };
  if (recognizedWords.length === 0) return { score: 0, matchedWords: 0 };

  let matchedWords = 0;
  const expectedSet = new Set(expectedWords);

  // Check how many expected words were recognized
  for (const word of recognizedWords) {
    if (expectedSet.has(word)) {
      matchedWords++;
      expectedSet.delete(word); // Avoid counting duplicates
    }
  }

  const score = (matchedWords / expectedWords.length) * 100;
  return { score, matchedWords };
}

/**
 * Calculate phonetic similarity score across all words
 */
function calculatePhoneticScore(
  recognizedWords: string[],
  expectedWords: string[]
): number {
  if (expectedWords.length === 0) return 100;
  if (recognizedWords.length === 0) return 0;

  let totalSimilarity = 0;
  const usedRecognized = new Set<number>();

  for (const expectedWord of expectedWords) {
    let bestSimilarity = 0;
    let bestIndex = -1;

    // Find best matching recognized word
    for (let i = 0; i < recognizedWords.length; i++) {
      if (usedRecognized.has(i)) continue;

      const similarity = calculatePhoneticWordSimilarity(
        recognizedWords[i],
        expectedWord
      );
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestIndex = i;
      }
    }

    totalSimilarity += bestSimilarity;
    if (bestIndex >= 0) {
      usedRecognized.add(bestIndex);
    }
  }

  return totalSimilarity / expectedWords.length;
}

/**
 * Calculate edit distance score
 * Converts Levenshtein distance to a percentage score
 */
function calculateEditDistanceScore(
  recognized: string,
  expected: string
): number {
  const distance = calculateLevenshteinDistance(recognized, expected);
  const maxLength = Math.max(recognized.length, expected.length);

  if (maxLength === 0) return 100;

  return Math.max(0, 100 - (distance / maxLength) * 100);
}

/**
 * Evaluate pronunciation accuracy
 * Compares recognized speech against expected text
 */
export function evaluatePronunciation(
  recognized: string,
  expected: string,
  options: EvaluationOptions = {}
): PronunciationResult {
  const { passingThreshold = 70, caseSensitive = false } = options;

  // Normalize texts
  const normalizedRecognized = caseSensitive
    ? recognized.replace(/[.,!?;:'"()-]/g, "").trim()
    : normalizeText(recognized);
  const normalizedExpected = caseSensitive
    ? expected.replace(/[.,!?;:'"()-]/g, "").trim()
    : normalizeText(expected);

  // Check for exact match
  const isExactMatch = normalizedRecognized === normalizedExpected;

  // Split into words
  const recognizedWords = normalizedRecognized
    .split(" ")
    .filter((w) => w.length > 0);
  const expectedWords = normalizedExpected.split(" ").filter((w) => w.length > 0);

  // Calculate individual scores
  const { score: wordMatchScore, matchedWords } = calculateWordMatchScore(
    recognizedWords,
    expectedWords
  );
  const phoneticScore = calculatePhoneticScore(recognizedWords, expectedWords);
  const editDistanceScore = calculateEditDistanceScore(
    normalizedRecognized,
    normalizedExpected
  );

  // Calculate weighted overall score
  // 40% word matching + 30% phonetic similarity + 30% edit distance
  const overallScore =
    wordMatchScore * 0.4 + phoneticScore * 0.3 + editDistanceScore * 0.3;

  return {
    isExactMatch,
    wordMatchScore: Math.round(wordMatchScore),
    phoneticScore: Math.round(phoneticScore),
    editDistanceScore: Math.round(editDistanceScore),
    overallScore: Math.round(overallScore),
    isPassing: overallScore >= passingThreshold,
    recognizedWords,
    expectedWords,
    matchedWords,
  };
}

/**
 * Find the best matching alternative from speech recognition results
 * Returns the alternative with the highest evaluation score
 */
export function findBestAlternative(
  alternatives: string[],
  expected: string
): { bestMatch: string; score: number } {
  if (alternatives.length === 0) {
    return { bestMatch: "", score: 0 };
  }

  let bestMatch = alternatives[0];
  let bestScore = 0;

  for (const alt of alternatives) {
    const result = evaluatePronunciation(alt, expected);
    if (result.overallScore > bestScore) {
      bestScore = result.overallScore;
      bestMatch = alt;
    }
  }

  return { bestMatch, score: bestScore };
}

/**
 * Get feedback message based on pronunciation result
 */
export function getPronunciationFeedback(result: PronunciationResult): string {
  // Handle no speech detected
  if (result.recognizedWords.length === 0) {
    return "No speech detected. Please try again and speak clearly.";
  }

  if (result.isExactMatch) {
    return "Perfect pronunciation!";
  }

  if (result.overallScore >= 90) {
    return "Excellent! Your pronunciation is very accurate.";
  }

  if (result.overallScore >= 80) {
    return "Great job! Minor differences detected.";
  }

  if (result.overallScore >= 70) {
    return "Good effort! Keep practicing for better accuracy.";
  }

  if (result.overallScore >= 50) {
    return "Getting there! Try listening to the pronunciation and try again.";
  }

  return "Keep practicing! Listen carefully to the correct pronunciation.";
}
