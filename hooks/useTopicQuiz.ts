'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { VocabularyItem } from '@/lib/vocabulary/types';
import type { ActiveReviewPosition } from '@/lib/vocabulary/progress';

export interface QuizResult {
  item: VocabularyItem;
  userAnswer: string;
  isCorrect: boolean;
}

export interface UseTopicQuizOptions {
  initialState?: {
    shuffledItemIds: string[];
    currentIndex: number;
    results: QuizResult[];
  };
  onPositionChange?: (position: Omit<ActiveReviewPosition, 'reviewType'>) => void;
}

interface UseTopicQuizReturn {
  currentIndex: number;
  currentItem: VocabularyItem | null;
  shuffledItems: VocabularyItem[];
  results: QuizResult[];
  isComplete: boolean;
  score: { correct: number; total: number };
  recordAnswer: (userAnswer: string, isCorrect: boolean) => void;
  nextQuestion: () => void;
  resetQuiz: () => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function restoreShuffledItems(
  items: VocabularyItem[],
  shuffledItemIds: string[]
): VocabularyItem[] | null {
  const itemMap = new Map(items.map((item) => [item.id, item]));

  // Validate all IDs exist
  for (const id of shuffledItemIds) {
    if (!itemMap.has(id)) {
      return null; // ID not found, can't restore
    }
  }

  return shuffledItemIds.map((id) => itemMap.get(id)!);
}

export function useTopicQuiz(
  items: VocabularyItem[],
  options?: UseTopicQuizOptions
): UseTopicQuizReturn {
  const { initialState, onPositionChange } = options ?? {};
  const startedAtRef = useRef<number>(0);

  // Set start time on mount (avoiding impure function call during render)
  useEffect(() => {
    if (startedAtRef.current === 0) {
      startedAtRef.current = Date.now();
    }
  }, []);

  // Initialize state, attempting to restore from initialState if provided
  const [shuffledItems, setShuffledItems] = useState<VocabularyItem[]>(() => {
    if (initialState?.shuffledItemIds) {
      const restored = restoreShuffledItems(items, initialState.shuffledItemIds);
      if (restored) {
        return restored;
      }
    }
    return shuffleArray(items);
  });

  const [currentIndex, setCurrentIndex] = useState(() =>
    initialState?.currentIndex ?? 0
  );

  const [results, setResults] = useState<QuizResult[]>(() =>
    initialState?.results ?? []
  );

  const currentItem = shuffledItems[currentIndex] ?? null;
  const isComplete = currentIndex >= shuffledItems.length;

  const score = useMemo(() => {
    const correct = results.filter((r) => r.isCorrect).length;
    return { correct, total: shuffledItems.length };
  }, [results, shuffledItems.length]);

  const recordAnswer = useCallback(
    (userAnswer: string, isCorrect: boolean) => {
      if (!currentItem) return;

      const newResult = {
        item: currentItem,
        userAnswer,
        isCorrect,
      };

      setResults((prev) => [...prev, newResult]);
    },
    [currentItem]
  );

  const nextQuestion = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const resetQuiz = useCallback(() => {
    const newShuffled = shuffleArray(items);
    setShuffledItems(newShuffled);
    setCurrentIndex(0);
    setResults([]);
    startedAtRef.current = Date.now();
  }, [items]);

  // Notify position changes
  useEffect(() => {
    if (!onPositionChange) return;

    onPositionChange({
      currentIndex,
      shuffledItemIds: shuffledItems.map((item) => item.id),
      results: results.map((r) => ({
        itemId: r.item.id,
        userAnswer: r.userAnswer,
        isCorrect: r.isCorrect,
      })),
      startedAt: startedAtRef.current,
    });
  }, [currentIndex, shuffledItems, results, onPositionChange]);

  return {
    currentIndex,
    currentItem,
    shuffledItems,
    results,
    isComplete,
    score,
    recordAnswer,
    nextQuestion,
    resetQuiz,
  };
}
