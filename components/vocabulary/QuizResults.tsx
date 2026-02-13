'use client';

import type { QuizResult } from '@/hooks/useTopicQuiz';
import { normalizeVietnameseDefinitions, getPartOfSpeechColor } from '@/lib/vocabulary/utils';
import { Trophy, RotateCcw, ArrowLeft, ChevronDown, ChevronUp, CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface QuizResultsProps {
  score: { correct: number; total: number };
  results: QuizResult[];
  onRetry: () => void;
  onExit: () => void;
  isFirstCompletion?: boolean;
  isReview?: boolean;
}

function getScoreColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-600 dark:text-green-400';
  if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBgColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (percentage >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

function getMessage(percentage: number): string {
  if (percentage === 100) return 'Perfect score! 🎉';
  if (percentage >= 80) return 'Great job! Keep it up! 🌟';
  if (percentage >= 60) return 'Good effort! Practice makes perfect.';
  return 'Keep practicing, you\'ll get better!';
}

export function QuizResults({
  score,
  results,
  onRetry,
  onExit,
  isFirstCompletion = false,
  isReview = false,
}: QuizResultsProps) {
  const [showIncorrect, setShowIncorrect] = useState(true);
  const percentage = Math.round((score.correct / score.total) * 100);
  const incorrectResults = results.filter((r) => !r.isCorrect);

  return (
    <div className="w-full max-w-lg mx-auto">
      <Card className="rounded-2xl p-8 text-center">
        <CardContent className="p-0">
          <div className={`inline-flex p-4 rounded-full ${getScoreBgColor(percentage)} mb-4 animate-trophy`}>
            <Trophy className={`size-12 ${getScoreColor(percentage)}`} />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isReview ? 'Review Complete!' : 'Quiz Complete!'}
          </h2>

          <div className={`text-5xl font-bold ${getScoreColor(percentage)} mb-2 animate-score-reveal`}>
            {score.correct}/{score.total}
          </div>

          <div className="text-lg text-muted-foreground mb-2 animate-score-reveal">
            {percentage}% correct
          </div>

          <p className="text-muted-foreground mb-6">
            {getMessage(percentage)}
          </p>

          {isFirstCompletion && (
            <div className="mb-6 p-4 bg-secondary/50 dark:bg-secondary/20 rounded-xl border border-border">
              <div className="flex items-center gap-2 text-foreground mb-2">
                <CalendarCheck className="size-5 text-primary" />
                <span className="font-medium">Review Scheduled</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• Review in 1 day to strengthen memory</li>
                <li>• Final review in 1 week for long-term retention</li>
              </ul>
            </div>
          )}

          {incorrectResults.length > 0 && (
            <div className="mb-6 text-left">
              <Button
                variant="ghost"
                onClick={() => setShowIncorrect(!showIncorrect)}
                className="w-full justify-between bg-muted hover:bg-muted/80"
              >
                <span className="font-medium">
                  Words to review ({incorrectResults.length})
                </span>
                {showIncorrect ? (
                  <ChevronUp className="size-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-5 text-muted-foreground" />
                )}
              </Button>

              {showIncorrect && (
                <div className="mt-2 space-y-2">
                  {incorrectResults.map((result) => (
                    <div
                      key={result.item.id}
                      className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div className="text-sm text-muted-foreground space-y-1">
                        {normalizeVietnameseDefinitions(result.item.definitionVietnamese).map((def, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            {def.type && (
                              <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getPartOfSpeechColor(def.type)}`}>
                                {def.type}
                              </span>
                            )}
                            <span>{def.definition}</span>
                          </div>
                        ))}
                      </div>
                      <div className="font-medium text-foreground">
                        → {result.item.word}
                      </div>
                      {result.userAnswer && (
                        <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                          Your answer: {result.userAnswer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
              <Button onClick={onRetry} className="w-full">
                <RotateCcw className="size-5" />
                Retry Quiz
              </Button>
            </div>
            <div className="animate-fade-up" style={{ animationDelay: '0.5s' }}>
              <Button variant="outline" onClick={onExit} className="w-full">
                <ArrowLeft className="size-5" />
                Back to Flashcards
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
