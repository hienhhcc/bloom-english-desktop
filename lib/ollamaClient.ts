// Re-export from translationChecker for backwards compatibility
// This file is deprecated - use translationChecker.ts instead

export {
  checkTranslation,
  isOllamaAvailable,
  isLLMAvailable,
  getCurrentProvider,
  type GrammarError,
  type TranslationCheckResult,
} from "./translationChecker";
