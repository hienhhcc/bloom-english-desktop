'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { VocabularyItem } from '@/lib/vocabulary/types';
import { normalizeVietnameseDefinitions, getPartOfSpeechColor } from '@/lib/vocabulary/utils';
import { findVocabularyWordInSentence } from '@/lib/languageTool';
import { Check, X, ArrowRight } from 'lucide-react';
import { playSuccessSound, playErrorSound } from '@/lib/audio';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface ClozeCardProps {
  item: VocabularyItem;
  onComplete: (wasCorrect: boolean, userAnswer: string) => void;
}

type QuizState = 'input' | 'result';

function parsePartsOfSpeech(pos: string): string[] {
  return pos.split(/[;,]/).map(p => p.trim()).filter(p => p.length > 0);
}

const AUTO_ADVANCE_DELAY = 2000;

export function ClozeCard({ item, onComplete }: ClozeCardProps) {
  const [userInput, setUserInput] = useState('');
  const [quizState, setQuizState] = useState<QuizState>('input');
  const [isCorrect, setIsCorrect] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_ADVANCE_DELAY / 1000);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pick a random example and find the word to blank out
  const clozeData = useMemo(() => {
    const indices = [0, 1, 2];
    // Shuffle indices to try random order
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    for (const idx of indices) {
      const example = item.examples[idx];
      const result = findVocabularyWordInSentence(
        example.english,
        item.word,
        item.wordFamily
      );
      if (result) {
        return {
          example,
          before: example.english.slice(0, result.start),
          after: example.english.slice(result.end),
          answer: result.matched,
        };
      }
    }

    // Fallback: use first example, expect base word
    const example = item.examples[0];
    return {
      example,
      before: '',
      after: '',
      answer: item.word,
      isFallback: true,
    };
  }, [item]);

  // Auto-focus input on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    onComplete(isCorrect, userInput);
  }, [onComplete, isCorrect, userInput]);

  const checkAnswer = useCallback(() => {
    const correct = userInput.trim().toLowerCase() === clozeData.answer.toLowerCase();
    setIsCorrect(correct);
    setQuizState('result');

    if (correct) {
      playSuccessSound();
      setCountdown(AUTO_ADVANCE_DELAY / 1000);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
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
  }, [userInput, clozeData.answer, onComplete]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (quizState === 'input' && userInput.trim().length > 0) {
          checkAnswer();
        } else if (quizState === 'result') {
          handleContinue();
        }
      }
    },
    [quizState, userInput, checkAnswer, handleContinue]
  );

  return (
    <Card
      className="w-full max-w-lg mx-auto rounded-2xl p-6"
      onKeyDown={handleKeyDown}
    >
      <CardContent className="p-0">
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-3">
            Fill in the missing word:
          </p>

          {/* Cloze sentence */}
          <div className="text-lg md:text-xl font-medium text-foreground mb-4 leading-relaxed">
            {clozeData.isFallback ? (
              <span className="text-muted-foreground italic">
                {clozeData.example.english}
              </span>
            ) : (
              <>
                <span>{clozeData.before}</span>
                <span className="inline-block mx-1 px-3 py-0.5 min-w-[80px] border-b-2 border-primary text-primary font-bold">
                  {quizState === 'result' ? clozeData.answer : '\u00A0'}
                </span>
                <span>{clozeData.after}</span>
              </>
            )}
          </div>

          {/* Vietnamese hint */}
          <p className="text-base text-muted-foreground mb-2 italic">
            {clozeData.example.vietnamese}
          </p>

          {/* Part of speech badges */}
          <div className="flex gap-2 flex-wrap justify-center mb-2">
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

          {/* English definition hint */}
          <div className="space-y-1">
            {normalizeVietnameseDefinitions(item.definitionVietnamese).map((def, i) => (
              <div key={i} className="flex items-center justify-center gap-1.5">
                {def.type && (
                  <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getPartOfSpeechColor(def.type)}`}>
                    {def.type}
                  </span>
                )}
                <span className="text-sm text-muted-foreground">{def.definition}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="mb-6">
          <Input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type the missing word..."
            disabled={quizState === 'result'}
            className="text-center text-lg"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>

        {/* Result feedback */}
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
                  <span className="font-medium">
                    Correct! <strong>{clozeData.answer}</strong>
                  </span>
                </>
              ) : (
                <>
                  <X className="size-5" />
                  <span className="font-medium">
                    <span className="line-through opacity-60">{userInput}</span>
                    {' → '}
                    <strong>{clozeData.answer}</strong>
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

        {/* Action buttons */}
        {quizState === 'input' ? (
          <Button
            onClick={checkAnswer}
            disabled={userInput.trim().length === 0}
            className="w-full"
          >
            Check
          </Button>
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
