'use client';

import { useState, useCallback } from 'react';

export type ViewMode = 'flashcard' | 'quiz';

interface UseFlashcardReturn {
  currentIndex: number;
  isFlipped: boolean;
  viewMode: ViewMode;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  toggleFlip: () => void;
  resetFlip: () => void;
  startQuiz: () => void;
  exitQuiz: () => void;
}

export function useFlashcard(totalCards: number): UseFlashcardReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('flashcard');

  const goToNext = useCallback(() => {
    setIsFlipped(false);
    setViewMode('flashcard');
    setCurrentIndex((prev) => (prev + 1) % totalCards);
  }, [totalCards]);

  const goToPrevious = useCallback(() => {
    setIsFlipped(false);
    setViewMode('flashcard');
    setCurrentIndex((prev) => (prev - 1 + totalCards) % totalCards);
  }, [totalCards]);

  const goToIndex = useCallback((index: number) => {
    setIsFlipped(false);
    setViewMode('flashcard');
    setCurrentIndex(Math.max(0, Math.min(index, totalCards - 1)));
  }, [totalCards]);

  const toggleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const resetFlip = useCallback(() => {
    setIsFlipped(false);
  }, []);

  const startQuiz = useCallback(() => {
    setViewMode('quiz');
  }, []);

  const exitQuiz = useCallback(() => {
    setViewMode('flashcard');
  }, []);

  return {
    currentIndex,
    isFlipped,
    viewMode,
    goToNext,
    goToPrevious,
    goToIndex,
    toggleFlip,
    resetFlip,
    startQuiz,
    exitQuiz,
  };
}
