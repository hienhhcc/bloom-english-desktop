'use client';

import { containsVocabularyWord } from '@/lib/languageTool';
import type { VocabularyItem } from '@/lib/vocabulary/types';
import { ArrowRight, Check, Languages, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type QuizState = 'input' | 'result';

interface TranslationQuizProps {
  item: VocabularyItem;
  onComplete: (wasCorrect: boolean) => void;
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()\-\u2018\u2019\u201C\u201D]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(userText: string, referenceText: string): number {
  const userWords = normalizeForComparison(userText).split(' ').filter(Boolean);
  const refWords = normalizeForComparison(referenceText).split(' ').filter(Boolean);

  if (userWords.length === 0 || refWords.length === 0) return 0;

  const refSet = new Set(refWords);

  // Count how many reference words appear in the user's translation
  let matches = 0;
  for (const word of refSet) {
    if (userWords.includes(word)) matches++;
  }

  // Score based on coverage of reference words + penalize very different lengths
  const coverage = matches / refSet.size;
  const lengthRatio = Math.min(userWords.length, refWords.length) / Math.max(userWords.length, refWords.length);
  const score = Math.round(coverage * 80 + lengthRatio * 20);

  return Math.min(100, Math.max(0, score));
}

export function TranslationQuiz({ item, onComplete }: TranslationQuizProps) {
  const [userInput, setUserInput] = useState('');
  const [quizState, setQuizState] = useState<QuizState>('input');

  // Use the third example sentence for translation (dedicated for the translation quiz, not shown on flashcard)
  const exampleSentence = item.examples[2];
  const referenceTranslation = exampleSentence.english;

  const handleCheck = useCallback(() => {
    if (!userInput.trim()) return;
    setQuizState('result');
  }, [userInput]);

  const containsWord = useMemo(
    () => quizState === 'result' ? containsVocabularyWord(userInput, item.word, item.wordFamily) : false,
    [quizState, userInput, item.word, item.wordFamily]
  );

  const similarity = useMemo(
    () => quizState === 'result' ? calculateSimilarity(userInput, referenceTranslation) : 0,
    [quizState, userInput, referenceTranslation]
  );

  const isCorrect = containsWord && similarity >= 70;
  const isPartiallyCorrect = containsWord && similarity >= 40 && similarity < 70;

  const handleContinue = useCallback(() => {
    onComplete(isCorrect);
  }, [isCorrect, onComplete]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-50 dark:bg-green-900/20';
    if (score >= 40) return 'bg-amber-50 dark:bg-amber-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="rounded-2xl p-6 md:p-8">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Languages className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Translation Quiz
              </h2>
              <p className="text-sm text-muted-foreground">
                Translate the Vietnamese sentence to English
              </p>
            </div>
          </div>

          {/* Vietnamese sentence to translate */}
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-1">
              Translate this sentence:
            </p>
            <p className="text-lg font-medium text-amber-900 dark:text-amber-100">
              &ldquo;{exampleSentence.vietnamese}&rdquo;
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              Include the word: <span className="font-bold">{item.word}</span>
            </p>
          </div>

          {quizState === 'input' && (
            <>
              {/* Text input */}
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your English translation here..."
                className="h-32 resize-none"
                autoFocus
              />

              {/* Check button */}
              <Button
                onClick={handleCheck}
                disabled={!userInput.trim()}
                className="w-full mt-4"
              >
                <Check className="size-5" />
                Check Translation
              </Button>
            </>
          )}

          {quizState === 'result' && (
            <div className="space-y-4">
              {/* User's translation */}
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Your translation:</p>
                <p className="text-foreground">{userInput}</p>
              </div>

              {/* Vocabulary word check */}
              <div className={`flex items-center gap-3 p-3 rounded-xl ${containsWord
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                {containsWord ? (
                  <Check className="size-5 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="size-5 text-red-600 dark:text-red-400" />
                )}
                <span className={containsWord
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
                }>
                  {containsWord
                    ? `Contains vocabulary word "${item.word}"`
                    : `Missing vocabulary word "${item.word}"`}
                </span>
              </div>

              {/* Similarity score */}
              <div className={`p-4 rounded-xl ${getScoreBg(similarity)}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {similarity >= 70 ? (
                      <Check className="size-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <X className="size-5 text-red-600 dark:text-red-400" />
                    )}
                    <span className={`font-medium ${getScoreColor(similarity)}`}>
                      Translation accuracy
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(similarity)}`}>
                    {similarity}%
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {similarity >= 70
                    ? 'Your translation closely matches the expected answer.'
                    : similarity >= 40
                      ? 'Your translation partially matches. Compare with the reference below.'
                      : 'Your translation differs significantly from the expected answer.'}
                </p>
              </div>

              {/* Reference translation */}
              <div className="p-4 bg-secondary/50 dark:bg-secondary/20 rounded-xl border border-border">
                <p className="text-sm text-muted-foreground mb-1">
                  Expected translation:
                </p>
                <p className="text-foreground">
                  &ldquo;{referenceTranslation}&rdquo;
                </p>
              </div>

              {/* Result summary and continue */}
              <div className={`p-4 rounded-xl ${isCorrect
                ? 'bg-green-100 dark:bg-green-900/30'
                : isPartiallyCorrect
                  ? 'bg-amber-100 dark:bg-amber-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                <p className={`font-medium ${isCorrect
                  ? 'text-green-800 dark:text-green-300'
                  : isPartiallyCorrect
                    ? 'text-amber-800 dark:text-amber-300'
                    : 'text-red-800 dark:text-red-300'
                  }`}>
                  {isCorrect
                    ? 'Excellent! Your translation is accurate.'
                    : isPartiallyCorrect
                      ? 'Good effort! Your translation is close but could be improved.'
                      : 'Keep practicing! Compare your answer with the expected translation.'}
                </p>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full"
              >
                Continue
                <ArrowRight className="size-5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
