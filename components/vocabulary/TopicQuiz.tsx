'use client';

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import type { VocabularyItem } from '@/lib/vocabulary/types';
import { useTopicQuiz, type QuizResult, type UseTopicQuizOptions } from '@/hooks/useTopicQuiz';
import { useProgress } from '@/hooks/useProgress';
import { CombinedQuiz } from './CombinedQuiz';
import { QuizResults } from './QuizResults';
import { ProgressIndicator } from './ProgressIndicator';
import type { ActiveReviewPosition, ActiveQuizPosition } from '@/lib/vocabulary/progress';

interface TopicQuizProps {
  items: VocabularyItem[];
  topicId: string;
  onExit: () => void;
  onQuizComplete?: (score: { correct: number; total: number }, results: QuizResult[]) => void;
  isFirstCompletion?: boolean;
  reviewType?: 'oneDay' | 'oneWeek';
}

// Inner component that handles the actual quiz logic
function TopicQuizInner({
  items,
  topicId,
  onExit,
  onQuizComplete,
  isFirstCompletion = false,
  reviewType,
  savedPosition,
  saveReviewPosition,
  clearReviewPosition,
  saveQuizPosition,
  clearQuizPosition,
}: TopicQuizProps & {
  savedPosition: ActiveReviewPosition | ActiveQuizPosition | null;
  saveReviewPosition: (topicId: string, position: ActiveReviewPosition) => void;
  clearReviewPosition: (topicId: string) => void;
  saveQuizPosition: (topicId: string, position: ActiveQuizPosition) => void;
  clearQuizPosition: (topicId: string) => void;
}) {
  // Build initial state from saved position
  const initialState = useMemo((): UseTopicQuizOptions['initialState'] => {
    if (!savedPosition) return undefined;

    // Convert saved results back to QuizResult format
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const restoredResults: QuizResult[] = [];

    for (const r of savedPosition.results) {
      const item = itemMap.get(r.itemId);
      if (!item) {
        // Item not found, can't restore
        return undefined;
      }
      restoredResults.push({
        item,
        userAnswer: r.userAnswer,
        isCorrect: r.isCorrect,
      });
    }

    return {
      shuffledItemIds: savedPosition.shuffledItemIds,
      currentIndex: savedPosition.currentIndex,
      results: restoredResults,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only compute on mount

  // Position change handler - save for both review and topic quiz modes
  const handlePositionChange = useCallback(
    (position: Omit<ActiveReviewPosition, 'reviewType'>) => {
      if (reviewType) {
        saveReviewPosition(topicId, {
          ...position,
          reviewType,
        });
      } else {
        saveQuizPosition(topicId, position);
      }
    },
    [reviewType, topicId, saveReviewPosition, saveQuizPosition]
  );

  const {
    currentIndex,
    currentItem,
    shuffledItems,
    results,
    isComplete,
    score,
    recordAnswer,
    nextQuestion,
    resetQuiz,
  } = useTopicQuiz(items, {
    initialState,
    onPositionChange: handlePositionChange,
  });

  const handleQuizComplete = useCallback(
    (wasCorrect: boolean, userAnswer?: string) => {
      recordAnswer(userAnswer ?? '', wasCorrect);
      nextQuestion();
    },
    [recordAnswer, nextQuestion]
  );

  // Track if we've already recorded this completion
  const hasRecordedRef = useRef(false);

  // Record progress when quiz completes
  useEffect(() => {
    if (isComplete && onQuizComplete && !hasRecordedRef.current) {
      hasRecordedRef.current = true;
      onQuizComplete(score, results);

      // Clear saved position when quiz/review is completed
      if (reviewType) {
        clearReviewPosition(topicId);
      } else {
        clearQuizPosition(topicId);
      }
    }
  }, [isComplete, onQuizComplete, score, results, reviewType, topicId, clearReviewPosition, clearQuizPosition]);

  // Reset the ref when quiz is reset
  useEffect(() => {
    if (!isComplete) {
      hasRecordedRef.current = false;
    }
  }, [isComplete]);

  if (isComplete) {
    return (
      <QuizResults
        score={score}
        results={results}
        onRetry={resetQuiz}
        onExit={onExit}
        isFirstCompletion={isFirstCompletion}
        isReview={!!reviewType}
      />
    );
  }

  if (!currentItem) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator current={currentIndex} total={shuffledItems.length} />

      <CombinedQuiz
        key={currentItem.id}
        item={currentItem}
        onComplete={handleQuizComplete}
      />
    </div>
  );
}

// Outer component that handles loading state and provides saved position
export function TopicQuiz({
  items,
  topicId,
  onExit,
  onQuizComplete,
  isFirstCompletion = false,
  reviewType,
}: TopicQuizProps) {
  const {
    saveReviewPosition,
    getReviewPosition,
    clearReviewPosition,
    saveQuizPosition,
    getQuizPosition,
    clearQuizPosition,
    isLoaded,
  } = useProgress();

  // Track whether we had a saved position when first loaded (set once, never changes)
  const [initialSavedPosition, setInitialSavedPosition] = useState<
    ActiveReviewPosition | ActiveQuizPosition | null | undefined
  >(undefined);

  // Get saved position - for review mode or topic quiz mode
  const currentSavedPosition = useMemo(() => {
    if (!isLoaded) return null;
    if (reviewType) {
      return getReviewPosition(topicId, reviewType);
    }
    return getQuizPosition(topicId);
  }, [isLoaded, reviewType, topicId, getReviewPosition, getQuizPosition]);

  // Capture the initial saved position once when first loaded
  // This prevents the key from changing when position is cleared on completion
  useEffect(() => {
    if (isLoaded && initialSavedPosition === undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialSavedPosition(currentSavedPosition);
    }
  }, [isLoaded, currentSavedPosition, initialSavedPosition]);

  // Wait for progress to load (so we can restore position)
  if (!isLoaded || initialSavedPosition === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Use a stable key based on the INITIAL saved position state
  // This prevents remounting when position is cleared on completion
  const key = `${topicId}-${reviewType || 'quiz'}-${initialSavedPosition ? 'restored' : 'fresh'}`;

  return (
    <TopicQuizInner
      key={key}
      items={items}
      topicId={topicId}
      onExit={onExit}
      onQuizComplete={onQuizComplete}
      isFirstCompletion={isFirstCompletion}
      reviewType={reviewType}
      savedPosition={initialSavedPosition}
      saveReviewPosition={saveReviewPosition}
      clearReviewPosition={clearReviewPosition}
      saveQuizPosition={saveQuizPosition}
      clearQuizPosition={clearQuizPosition}
    />
  );
}
