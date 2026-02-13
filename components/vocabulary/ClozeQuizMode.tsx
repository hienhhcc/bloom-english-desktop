'use client';

import { useState, useCallback, useMemo } from 'react';
import type { VocabularyItem } from '@/lib/vocabulary/types';
import type { QuizResult } from '@/hooks/useTopicQuiz';
import { ClozeCard } from './ClozeCard';
import { ProgressIndicator } from './ProgressIndicator';
import { QuizResults } from './QuizResults';

interface ClozeQuizModeProps {
  items: VocabularyItem[];
  topicId: string;
  onExit: () => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function ClozeQuizMode({ items, topicId: _topicId, onExit }: ClozeQuizModeProps) {
  const [shuffledItems, setShuffledItems] = useState<VocabularyItem[]>(() => shuffleArray(items));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);

  const isComplete = currentIndex >= shuffledItems.length;
  const currentItem = shuffledItems[currentIndex] ?? null;

  const score = useMemo(() => {
    const correct = results.filter((r) => r.isCorrect).length;
    return { correct, total: shuffledItems.length };
  }, [results, shuffledItems.length]);

  const handleCardComplete = useCallback(
    (wasCorrect: boolean, userAnswer: string) => {
      if (!currentItem) return;
      setResults((prev) => [
        ...prev,
        { item: currentItem, userAnswer, isCorrect: wasCorrect },
      ]);
      setCurrentIndex((prev) => prev + 1);
    },
    [currentItem]
  );

  const handleRetry = useCallback(() => {
    setShuffledItems(shuffleArray(items));
    setCurrentIndex(0);
    setResults([]);
  }, [items]);

  if (isComplete) {
    return (
      <QuizResults
        score={score}
        results={results}
        onRetry={handleRetry}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ProgressIndicator current={currentIndex} total={shuffledItems.length} />
      {currentItem && (
        <ClozeCard
          key={currentItem.id}
          item={currentItem}
          onComplete={handleCardComplete}
        />
      )}
    </div>
  );
}
