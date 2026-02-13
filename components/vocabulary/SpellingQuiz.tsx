'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { VocabularyItem } from '@/lib/vocabulary/types';
import { normalizeVietnameseDefinitions, getPartOfSpeechColor } from '@/lib/vocabulary/utils';
import { LetterSlots, type LetterSlotsRef } from './LetterSlots';
import { Check, X, ArrowRight, Lightbulb, Volume2 } from 'lucide-react';
import { playSuccessSound, playErrorSound } from '@/lib/audio';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useAccentPreference } from '@/hooks/useAccentPreference';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SpellingQuizProps {
  item: VocabularyItem;
  onComplete: (wasCorrect: boolean, userAnswer?: string) => void;
}

type QuizState = 'input' | 'result';

function parsePartsOfSpeech(pos: string): string[] {
  return pos.split(/[;,]/).map(p => p.trim()).filter(p => p.length > 0);
}

const AUTO_ADVANCE_DELAY = 5000;

function calculateMaxHints(wordLength: number): number {
  // Allow roughly 1 hint per 3 letters, minimum 1, maximum 3
  return Math.min(Math.max(Math.floor(wordLength / 3), 1), 3);
}

export function SpellingQuiz({ item, onComplete }: SpellingQuizProps) {
  const [userInput, setUserInput] = useState('');
  const [quizState, setQuizState] = useState<QuizState>('input');
  const [isCorrect, setIsCorrect] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_ADVANCE_DELAY / 1000);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [pronunciationHintUsed, setPronunciationHintUsed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const letterSlotsRef = useRef<LetterSlotsRef>(null);

  const { accent } = useAccentPreference();
  const { speak, isSpeaking } = useTextToSpeech(accent);

  const maxHints = useMemo(() => calculateMaxHints(item.word.length), [item.word.length]);
  const hintsRemaining = maxHints - hintsUsed;

  const handleContinue = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    onComplete(isCorrect, userInput);
  }, [onComplete, isCorrect, userInput]);

  const checkAnswer = useCallback(() => {
    const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
    const correct = normalize(userInput) === normalize(item.word);
    setIsCorrect(correct);
    setQuizState('result');

    if (correct) {
      playSuccessSound();
      setCountdown(AUTO_ADVANCE_DELAY / 1000);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timerRef.current = setTimeout(() => {
        onComplete(true, userInput);
      }, AUTO_ADVANCE_DELAY);
    } else {
      playErrorSound();
    }
  }, [userInput, item.word, onComplete]);

  const useHint = useCallback(() => {
    if (hintsUsed >= maxHints) return;

    const newHintLevel = hintsUsed + 1;
    setHintsUsed(newHintLevel);

    // Reveal the first newHintLevel letters, keeping user's input after that
    const correctPrefix = item.word.slice(0, newHintLevel);
    const userSuffix = userInput.slice(newHintLevel);
    setUserInput(correctPrefix + userSuffix);

    // Focus the input after hint is revealed
    requestAnimationFrame(() => {
      letterSlotsRef.current?.focus();
    });
  }, [hintsUsed, maxHints, item.word, userInput]);

  const usePronunciationHint = useCallback(() => {
    if (pronunciationHintUsed) return;
    setPronunciationHintUsed(true);
    speak(item.word, true);
  }, [pronunciationHintUsed, speak, item.word]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (quizState === 'input' && userInput.length > 0) {
          checkAnswer();
        } else if (quizState === 'result') {
          handleContinue();
        }
      }
    },
    [quizState, userInput.length, checkAnswer, handleContinue]
  );

  return (
    <Card
      className="w-full max-w-lg mx-auto rounded-2xl p-6"
      onKeyDown={handleKeyDown}
    >
      <CardContent className="p-0">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-2">
            Spell the word for:
          </p>
          <div className="mb-2 space-y-1.5">
            {normalizeVietnameseDefinitions(item.definitionVietnamese).map((def, i) => (
              <div key={i} className="flex items-center justify-center gap-2">
                {def.type && (
                  <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${getPartOfSpeechColor(def.type)}`}>
                    {def.type}
                  </span>
                )}
                <span className="text-lg md:text-xl font-bold text-foreground">
                  {def.definition}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm md:text-base text-muted-foreground mb-1 italic">
            {item.definitionEnglish}
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            {parsePartsOfSpeech(item.partOfSpeech).map((pos) => (
              <Badge
                key={pos}
                variant="secondary"
                className={getPartOfSpeechColor(pos)}
              >
                {pos}
              </Badge>
            ))}
          </div>
        </div>

        <div className="bg-muted rounded-xl p-6 mb-6">
          <LetterSlots
            ref={letterSlotsRef}
            word={item.word}
            value={userInput}
            onChange={setUserInput}
            disabled={quizState === 'result'}
            showResult={quizState === 'result' ? (isCorrect ? 'correct' : 'incorrect') : null}
            lockedChars={hintsUsed}
          />
        </div>

        {quizState === 'result' && (
          <div
            className={`flex flex-col items-center gap-2 mb-6 p-3 rounded-lg ${
              isCorrect
                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <>
                  <Check className="size-5" />
                  <span className="font-medium">Correct!</span>
                </>
              ) : (
                <>
                  <X className="size-5" />
                  <span className="font-medium">
                    The correct word is: <strong>{item.word}</strong>
                  </span>
                </>
              )}
            </div>
            {isCorrect && (
              <span className="text-sm opacity-75">
                Continuing in {countdown}s...
              </span>
            )}
          </div>
        )}

        {quizState === 'input' ? (
          <div className="flex flex-col gap-3">
            {hintsRemaining > 0 ? (
              <Button
                variant="outline"
                onClick={useHint}
                className="w-full border-amber-400 dark:border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <Lightbulb className="size-4" />
                Get Hint ({hintsRemaining} left)
              </Button>
            ) : !pronunciationHintUsed ? (
              <Button
                variant="outline"
                onClick={usePronunciationHint}
                disabled={isSpeaking}
                className="w-full border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Volume2 className="size-4" />
                Hear Pronunciation
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled
                className="w-full"
              >
                <Lightbulb className="size-4" />
                No hints left
              </Button>
            )}
            <Button
              onClick={checkAnswer}
              disabled={userInput.length === 0}
              className="w-full"
            >
              Check
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleContinue}
            className="w-full"
          >
            Continue
            <ArrowRight className="size-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
