// Translation checker with support for multiple LLM providers (Ollama, OpenAI)

export interface GrammarError {
  message: string;
  context: string;
  suggestion: string;
}

export interface TranslationCheckResult {
  grammarCorrect: boolean;
  grammarErrors: GrammarError[];
  isCorrect: boolean;
  score: number; // 0-100, -1 if unavailable
  feedback: string;
  suggestions: string[];
  referenceTranslation: string;
}

type LLMProvider = "ollama" | "openai";

// Configuration from environment variables
const LLM_PROVIDER: LLMProvider =
  (process.env.LLM_PROVIDER as LLMProvider) || "ollama";
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

// Shared prompt for translation evaluation
function getEvaluationPrompt(
  vietnameseSentence: string,
  userTranslation: string,
  vocabularyWord: string
): string {
  return `You are evaluating an English translation of a Vietnamese sentence for a vocabulary learning app.

Vietnamese sentence: "${vietnameseSentence}"
User's translation: "${userTranslation}"
REQUIRED vocabulary word: "${vocabularyWord}"

=== ABSOLUTE REQUIREMENT - READ CAREFULLY ===
Your "referenceTranslation" field MUST contain the EXACT word "${vocabularyWord}".
This is NON-NEGOTIABLE. The entire purpose of this app is to practice specific vocabulary words.

WRONG examples (DO NOT DO THIS):
- If vocabularyWord is "portion", do NOT write "amount" or "serving" - write "portion"
- If vocabularyWord is "scrumptious", do NOT write "delicious" - write "scrumptious"
- If vocabularyWord is "beverage", do NOT write "drink" - write "beverage"

CORRECT example:
- vocabularyWord: "portion" → referenceTranslation: "Controlling food portions can help manage weight."

=== YOUR TASK ===
1. First, write a referenceTranslation that:
   - Accurately translates the Vietnamese sentence
   - Contains the EXACT word "${vocabularyWord}" (not a synonym!)
2. Then evaluate the user's translation against your reference

Output ONLY valid JSON:
{
  "referenceTranslation": "Your translation containing the word '${vocabularyWord}'",
  "grammarCorrect": true/false,
  "grammarErrors": [],
  "isCorrect": true/false,
  "score": 0-100,
  "feedback": "Brief feedback",
  "suggestions": []
}

Scoring:
- 85-100: Correct meaning AND uses "${vocabularyWord}"
- 70-84: Correct meaning but awkward phrasing
- 50-69: Partial meaning or missing "${vocabularyWord}"
- Below 50: Wrong meaning or major errors

FINAL CHECK before responding:
- Does your referenceTranslation contain "${vocabularyWord}"? If NO, rewrite it!`;
}

// ============ OLLAMA PROVIDER ============

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

const MAX_OLLAMA_RETRIES = 3;

async function checkWithOllama(
  vietnameseSentence: string,
  userTranslation: string,
  vocabularyWord: string
): Promise<TranslationCheckResult> {
  const prompt = getEvaluationPrompt(vietnameseSentence, userTranslation, vocabularyWord);

  let lastResult: TranslationCheckResult | null = null;

  for (let attempt = 1; attempt <= MAX_OLLAMA_RETRIES; attempt++) {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data: OllamaResponse = await response.json();
    const result = parseJSONResponse(data.response);
    lastResult = result;

    // Check if we got a valid reference translation:
    // 1. Not empty
    // 2. Not Vietnamese (doesn't contain the Vietnamese sentence)
    // 3. Contains the required vocabulary word
    const refLower = result.referenceTranslation?.toLowerCase() || "";
    const vocabLower = vocabularyWord.toLowerCase();
    const hasValidReference =
      result.referenceTranslation &&
      result.referenceTranslation.trim() !== "" &&
      !result.referenceTranslation.includes(vietnameseSentence) &&
      refLower.includes(vocabLower);

    if (hasValidReference) {
      return result;
    }

    // Log retry attempt with reason
    if (attempt < MAX_OLLAMA_RETRIES) {
      const reason = !result.referenceTranslation
        ? "empty reference"
        : !refLower.includes(vocabLower)
          ? `missing vocabulary word "${vocabularyWord}"`
          : "contains Vietnamese";
      console.log(
        `Ollama retry ${attempt}/${MAX_OLLAMA_RETRIES}: ${reason}, retrying...`
      );
    }
  }

  // Return the last result even if reference translation is invalid
  // Clear the invalid reference to avoid showing Vietnamese
  if (lastResult) {
    return {
      ...lastResult,
      referenceTranslation: "",
    };
  }

  throw new Error("Failed to get valid response from Ollama after retries");
}

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ============ OPENAI PROVIDER ============

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function checkWithOpenAI(
  vietnameseSentence: string,
  userTranslation: string,
  vocabularyWord: string
): Promise<TranslationCheckResult> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when using OpenAI provider");
  }

  const systemPrompt = `You are an expert Vietnamese-English translation evaluator for a vocabulary learning app.

=== ABSOLUTE REQUIREMENT ===
Your "referenceTranslation" MUST contain the EXACT vocabulary word specified. This is NON-NEGOTIABLE.

WRONG (never do this):
- vocabularyWord: "portion" → "Controlling the amount of food..." ❌
- vocabularyWord: "scrumptious" → "The food was delicious..." ❌

CORRECT:
- vocabularyWord: "portion" → "Controlling food portions..." ✓
- vocabularyWord: "scrumptious" → "The food was scrumptious..." ✓

Other rules:
- Be precise with Vietnamese terms (e.g., "Cá voi lưng gù" = "Humpback whale")
- Check for spelling errors and mark grammarCorrect: false if found
- Always provide a non-empty referenceTranslation with the required vocabulary word`;

  const userPrompt = getEvaluationPrompt(vietnameseSentence, userTranslation, vocabularyWord);

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: messages,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data: OpenAIResponse = await response.json();
  const content = data.choices[0]?.message?.content || "";
  return parseJSONResponse(content);
}

export async function isOpenAIAvailable(): Promise<boolean> {
  return !!OPENAI_API_KEY;
}

// ============ SHARED UTILITIES ============

function parseJSONResponse(response: string): TranslationCheckResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const grammarErrors: GrammarError[] = Array.isArray(parsed.grammarErrors)
      ? parsed.grammarErrors
          .filter((e: unknown) => typeof e === "object" && e !== null)
          .map(
            (e: { message?: string; context?: string; suggestion?: string }) => ({
              message: typeof e.message === "string" ? e.message : "Grammar issue",
              context: typeof e.context === "string" ? e.context : "",
              suggestion: typeof e.suggestion === "string" ? e.suggestion : "",
            })
          )
          .slice(0, 5)
      : [];

    return {
      grammarCorrect:
        typeof parsed.grammarCorrect === "boolean" ? parsed.grammarCorrect : true,
      grammarErrors,
      isCorrect:
        typeof parsed.isCorrect === "boolean" ? parsed.isCorrect : true,
      score:
        typeof parsed.score === "number"
          ? Math.min(100, Math.max(0, parsed.score))
          : 50,
      feedback:
        typeof parsed.feedback === "string"
          ? parsed.feedback
          : "Translation evaluated.",
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions
            .filter((s: unknown) => typeof s === "string")
            .slice(0, 3)
        : [],
      referenceTranslation:
        typeof parsed.referenceTranslation === "string" && parsed.referenceTranslation.trim()
          ? parsed.referenceTranslation.trim()
          : "",
    };
  } catch {
    console.error("Failed to parse LLM response:", response);
    return {
      grammarCorrect: true,
      grammarErrors: [],
      isCorrect: true,
      score: -1,
      feedback: "Could not parse evaluation result",
      suggestions: [],
      referenceTranslation: "",
    };
  }
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = normalizeForComparison(text1).split(" ");
  const words2 = normalizeForComparison(text2).split(" ");

  if (words1.length === 0 || words2.length === 0) return 0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  let matches = 0;
  for (const word of set1) {
    if (set2.has(word)) matches++;
  }

  const union = new Set([...words1, ...words2]).size;
  return Math.round((matches / union) * 100);
}

/**
 * Filter out suggestions that recommend something the user already wrote
 * e.g., "Use 'bald eagle'" when user already wrote "bald eagle"
 */
function filterContradictorySuggestions(
  userTranslation: string,
  suggestions: string[]
): string[] {
  const normalizedUser = normalizeForComparison(userTranslation);

  return suggestions.filter((suggestion) => {
    // Extract quoted terms from the suggestion (e.g., 'bald eagle' or "bald eagle")
    const quotedTerms = suggestion.match(/['"]([^'"]+)['"]/g);
    if (!quotedTerms) return true;

    // Check if any suggested term already exists in user's translation
    for (const quoted of quotedTerms) {
      const term = quoted.replace(/['"]/g, "").toLowerCase();
      if (normalizedUser.includes(term)) {
        // User already has this term, filter out this contradictory suggestion
        return false;
      }
    }
    return true;
  });
}

/**
 * Filter out grammar errors that are contradictory
 * e.g., "Replace X with Y" when user already has Y
 */
function filterContradictoryGrammarErrors(
  userTranslation: string,
  errors: GrammarError[]
): GrammarError[] {
  const normalizedUser = normalizeForComparison(userTranslation);

  return errors.filter((error) => {
    // Check if the suggestion contains a term the user already has
    const suggestion = error.suggestion.toLowerCase();
    const quotedTerms = suggestion.match(/['"]([^'"]+)['"]/g);

    if (quotedTerms) {
      for (const quoted of quotedTerms) {
        const term = quoted.replace(/['"]/g, "");
        if (normalizedUser.includes(term)) {
          return false;
        }
      }
    }

    // Also check if the suggestion itself (without quotes) is in user's text
    const cleanSuggestion = normalizeForComparison(error.suggestion);
    if (cleanSuggestion.length > 3 && normalizedUser.includes(cleanSuggestion)) {
      return false;
    }

    return true;
  });
}

function correctScoreIfSimilar(
  userTranslation: string,
  result: TranslationCheckResult
): TranslationCheckResult {
  // First, filter out contradictory suggestions and grammar errors
  const filteredSuggestions = filterContradictorySuggestions(
    userTranslation,
    result.suggestions
  );
  const filteredGrammarErrors = filterContradictoryGrammarErrors(
    userTranslation,
    result.grammarErrors
  );

  // Update result with filtered values
  let correctedResult: TranslationCheckResult = {
    ...result,
    suggestions: filteredSuggestions,
    grammarErrors: filteredGrammarErrors,
    grammarCorrect: filteredGrammarErrors.length === 0,
  };

  // If we filtered out all suggestions/errors, boost the score
  const removedSuggestions = result.suggestions.length - filteredSuggestions.length;
  const removedErrors = result.grammarErrors.length - filteredGrammarErrors.length;

  if (removedSuggestions > 0 || removedErrors > 0) {
    // LLM made contradictory claims, boost the score
    const scoreBoost = (removedSuggestions + removedErrors) * 5;
    correctedResult = {
      ...correctedResult,
      score: Math.min(100, correctedResult.score + scoreBoost),
      feedback: filteredSuggestions.length === 0 && filteredGrammarErrors.length === 0
        ? "Good translation!"
        : correctedResult.feedback,
    };
  }

  if (!result.referenceTranslation) return correctedResult;

  const similarity = calculateSimilarity(
    userTranslation,
    result.referenceTranslation
  );

  if (similarity >= 90 && correctedResult.score < 90) {
    return {
      ...correctedResult,
      score: Math.max(correctedResult.score, 95),
      isCorrect: true,
      feedback: "Excellent! Your translation matches the reference very closely.",
      suggestions: [],
      grammarErrors: [],
      grammarCorrect: true,
    };
  }

  if (similarity >= 80 && correctedResult.score < 80) {
    return {
      ...correctedResult,
      score: Math.max(correctedResult.score, 85),
      isCorrect: true,
      feedback: correctedResult.feedback || "Good translation with minor differences.",
      suggestions:
        correctedResult.suggestions.length > 2
          ? correctedResult.suggestions.slice(0, 1)
          : correctedResult.suggestions,
    };
  }

  return correctedResult;
}

// ============ MAIN EXPORT ============

/**
 * Check translation using configured LLM provider
 * Provider is selected via LLM_PROVIDER environment variable
 */
export async function checkTranslation(
  vietnameseSentence: string,
  userTranslation: string,
  vocabularyWord: string
): Promise<TranslationCheckResult> {
  try {
    let result: TranslationCheckResult;

    if (LLM_PROVIDER === "openai") {
      result = await checkWithOpenAI(vietnameseSentence, userTranslation, vocabularyWord);
    } else {
      result = await checkWithOllama(vietnameseSentence, userTranslation, vocabularyWord);
    }

    // Post-process to fix inconsistent scores
    return correctScoreIfSimilar(userTranslation, result);
  } catch (error) {
    console.error("Translation check failed:", error);
    return {
      grammarCorrect: true,
      grammarErrors: [],
      isCorrect: true,
      score: -1,
      feedback: `Translation check unavailable (${LLM_PROVIDER})`,
      suggestions: [],
      referenceTranslation: "",
    };
  }
}

/**
 * Check if the configured LLM provider is available
 */
export async function isLLMAvailable(): Promise<boolean> {
  if (LLM_PROVIDER === "openai") {
    return isOpenAIAvailable();
  }
  return isOllamaAvailable();
}

/**
 * Get the current LLM provider name
 */
export function getCurrentProvider(): LLMProvider {
  return LLM_PROVIDER;
}
