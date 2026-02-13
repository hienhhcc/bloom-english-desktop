"use client";

import {
  STORAGE_KEY,
  createInitialProgress,
  createInitialTopicProgress,
  createReviewSchedule,
  getTopicStatus,
  isReviewDue,
  type ActiveQuizPosition,
  type ActiveReviewPosition,
  type LearningProgress,
  type TopicProgress,
  type TopicStatus,
} from "@/lib/vocabulary/progress";
import { useCallback, useEffect, useRef, useState } from "react";

interface DueReview {
  topicId: string;
  reviewType: "oneDay" | "oneWeek";
}

interface UseProgressReturn {
  progress: LearningProgress | null;
  isLoaded: boolean;
  getTopicProgress: (topicId: string) => TopicProgress | null;
  getTopicStatusById: (topicId: string) => TopicStatus;
  recordQuizAttempt: (
    topicId: string,
    score: { correct: number; total: number },
  ) => void;
  markReviewCompleted: (
    topicId: string,
    reviewType: "oneDay" | "oneWeek",
  ) => void;
  getDueReviews: () => DueReview[];
  saveReviewPosition: (topicId: string, position: ActiveReviewPosition) => void;
  getReviewPosition: (
    topicId: string,
    reviewType: "oneDay" | "oneWeek",
  ) => ActiveReviewPosition | null;
  clearReviewPosition: (topicId: string) => void;
  saveQuizPosition: (topicId: string, position: ActiveQuizPosition) => void;
  getQuizPosition: (topicId: string) => ActiveQuizPosition | null;
  clearQuizPosition: (topicId: string) => void;
  scheduleReview: (topicId: string) => void;
  // Dismiss alert functions
  dismissReviewAlert: (topicId: string, reviewType: "oneDay" | "oneWeek") => void;
  isReviewAlertDismissed: (topicId: string, reviewType: "oneDay" | "oneWeek") => boolean;
}

export function useProgress(): UseProgressReturn {
  // Initialize as null - localStorage is read in useEffect to avoid hydration mismatch
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from API on mount, fall back to localStorage
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/progress");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data && data.version) {
            setProgress(data as LearningProgress);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            setIsLoaded(true);
            return;
          }
        }
      } catch {
        // API unavailable, fall through to localStorage
      }

      // Fallback: localStorage
      if (!cancelled) {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as LearningProgress;
            setProgress(parsed);
          } else {
            setProgress(createInitialProgress());
          }
        } catch {
          setProgress(createInitialProgress());
        }
        setIsLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Debounce timer for API saves
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save to localStorage immediately + debounced POST to API
  useEffect(() => {
    if (isLoaded && progress) {
      // Immediate localStorage save
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch {
        console.error("Failed to save progress to localStorage");
      }

      // Debounced API save (1s)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(progress),
        }).catch(() => {
          // API save failed silently — localStorage still has the data
        });
      }, 1000);
    }
  }, [progress, isLoaded]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const getTopicProgress = useCallback(
    (topicId: string): TopicProgress | null => {
      if (!progress) return null;
      return progress.topics[topicId] || null;
    },
    [progress],
  );

  const getTopicStatusById = useCallback(
    (topicId: string): TopicStatus => {
      const topicProgress = getTopicProgress(topicId);
      return getTopicStatus(topicProgress);
    },
    [getTopicProgress],
  );

  const recordQuizAttempt = useCallback(
    (topicId: string, score: { correct: number; total: number }) => {
      setProgress((prev) => {
        if (!prev) return prev;

        const now = Date.now();
        const percentage = Math.round((score.correct / score.total) * 100);

        const existingTopicProgress =
          prev.topics[topicId] || createInitialTopicProgress(topicId);

        const isFirstCompletion = existingTopicProgress.completedAt === null;

        const newAttempt = {
          date: now,
          score: percentage,
          correct: score.correct,
          total: score.total,
        };

        const newTopicProgress: TopicProgress = {
          ...existingTopicProgress,
          quizAttempts: [...existingTopicProgress.quizAttempts, newAttempt],
          bestScore:
            existingTopicProgress.bestScore === null
              ? percentage
              : Math.max(existingTopicProgress.bestScore, percentage),
          completedAt: existingTopicProgress.completedAt ?? now,
          reviewSchedule: isFirstCompletion
            ? createReviewSchedule(now)
            : existingTopicProgress.reviewSchedule,
        };

        return {
          ...prev,
          topics: {
            ...prev.topics,
            [topicId]: newTopicProgress,
          },
          lastUpdated: now,
        };
      });
    },
    [],
  );

  const markReviewCompleted = useCallback(
    (topicId: string, reviewType: "oneDay" | "oneWeek") => {
      setProgress((prev) => {
        if (!prev) return prev;

        const existingTopicProgress = prev.topics[topicId];
        if (!existingTopicProgress?.reviewSchedule) return prev;

        const newReviewSchedule = {
          ...existingTopicProgress.reviewSchedule,
          [reviewType]: {
            ...existingTopicProgress.reviewSchedule[reviewType],
            completed: true,
          },
        };

        return {
          ...prev,
          topics: {
            ...prev.topics,
            [topicId]: {
              ...existingTopicProgress,
              reviewSchedule: newReviewSchedule,
            },
          },
          lastUpdated: Date.now(),
        };
      });
    },
    [],
  );

  const getDueReviews = useCallback((): DueReview[] => {
    if (!progress) return [];

    const dueReviews: DueReview[] = [];

    Object.values(progress.topics).forEach((topicProgress) => {
      const reviewStatus = isReviewDue(topicProgress.reviewSchedule);

      if (reviewStatus.oneDay) {
        dueReviews.push({
          topicId: topicProgress.topicId,
          reviewType: "oneDay",
        });
      } else if (reviewStatus.oneWeek) {
        // Only show week review if day review is already completed
        dueReviews.push({
          topicId: topicProgress.topicId,
          reviewType: "oneWeek",
        });
      }
    });

    return dueReviews;
  }, [progress]);

  const saveReviewPosition = useCallback(
    (topicId: string, position: ActiveReviewPosition) => {
      setProgress((prev) => {
        if (!prev) return prev;

        const existingTopicProgress =
          prev.topics[topicId] || createInitialTopicProgress(topicId);

        return {
          ...prev,
          topics: {
            ...prev.topics,
            [topicId]: {
              ...existingTopicProgress,
              activeReview: position,
            },
          },
          lastUpdated: Date.now(),
        };
      });
    },
    [],
  );

  const getReviewPosition = useCallback(
    (
      topicId: string,
      reviewType: "oneDay" | "oneWeek",
    ): ActiveReviewPosition | null => {
      if (!progress) return null;

      const topicProgress = progress.topics[topicId];
      if (!topicProgress?.activeReview) return null;

      // Only return position if reviewType matches
      if (topicProgress.activeReview.reviewType !== reviewType) {
        return null;
      }

      return topicProgress.activeReview;
    },
    [progress],
  );

  const clearReviewPosition = useCallback((topicId: string) => {
    setProgress((prev) => {
      if (!prev) return prev;

      const existingTopicProgress = prev.topics[topicId];
      if (!existingTopicProgress) return prev;

      return {
        ...prev,
        topics: {
          ...prev.topics,
          [topicId]: {
            ...existingTopicProgress,
            activeReview: null,
          },
        },
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const saveQuizPosition = useCallback(
    (topicId: string, position: ActiveQuizPosition) => {
      setProgress((prev) => {
        if (!prev) return prev;

        const existingTopicProgress =
          prev.topics[topicId] || createInitialTopicProgress(topicId);

        return {
          ...prev,
          topics: {
            ...prev.topics,
            [topicId]: {
              ...existingTopicProgress,
              activeQuiz: position,
            },
          },
          lastUpdated: Date.now(),
        };
      });
    },
    [],
  );

  const getQuizPosition = useCallback(
    (topicId: string): ActiveQuizPosition | null => {
      if (!progress) return null;

      const topicProgress = progress.topics[topicId];
      if (!topicProgress?.activeQuiz) return null;

      return topicProgress.activeQuiz;
    },
    [progress],
  );

  const clearQuizPosition = useCallback((topicId: string) => {
    setProgress((prev) => {
      if (!prev) return prev;

      const existingTopicProgress = prev.topics[topicId];
      if (!existingTopicProgress) return prev;

      return {
        ...prev,
        topics: {
          ...prev.topics,
          [topicId]: {
            ...existingTopicProgress,
            activeQuiz: null,
          },
        },
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const scheduleReview = useCallback((topicId: string) => {
    setProgress((prev) => {
      if (!prev) return prev;

      const now = Date.now();
      const existingTopicProgress =
        prev.topics[topicId] || createInitialTopicProgress(topicId);

      // Clear dismissed review alerts for this topic
      const dismissedAlerts = (prev.dismissedReviewAlerts || []).filter(
        (key) => !key.startsWith(`${topicId}-`)
      );

      return {
        ...prev,
        topics: {
          ...prev.topics,
          [topicId]: {
            ...existingTopicProgress,
            reviewSchedule: createReviewSchedule(now),
          },
        },
        dismissedReviewAlerts: dismissedAlerts,
        lastUpdated: now,
      };
    });
  }, []);

  const dismissReviewAlert = useCallback(
    (topicId: string, reviewType: "oneDay" | "oneWeek") => {
      setProgress((prev) => {
        if (!prev) return prev;

        const key = `${topicId}-${reviewType}`;
        const existing = prev.dismissedReviewAlerts || [];

        if (existing.includes(key)) return prev;

        return {
          ...prev,
          dismissedReviewAlerts: [...existing, key],
          lastUpdated: Date.now(),
        };
      });
    },
    []
  );

  const isReviewAlertDismissed = useCallback(
    (topicId: string, reviewType: "oneDay" | "oneWeek"): boolean => {
      if (!progress) return false;

      const key = `${topicId}-${reviewType}`;
      return progress.dismissedReviewAlerts?.includes(key) ?? false;
    },
    [progress]
  );

  return {
    progress,
    isLoaded,
    getTopicProgress,
    getTopicStatusById,
    recordQuizAttempt,
    markReviewCompleted,
    getDueReviews,
    saveReviewPosition,
    getReviewPosition,
    clearReviewPosition,
    saveQuizPosition,
    getQuizPosition,
    clearQuizPosition,
    scheduleReview,
    dismissReviewAlert,
    isReviewAlertDismissed,
  };
}
