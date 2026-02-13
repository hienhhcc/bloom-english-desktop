// Progress tracking types and utilities

export const STORAGE_KEY = "bloom-english-progress";
export const CURRENT_VERSION = 1;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const ONE_WEEK_MS = 7 * ONE_DAY_MS;

export interface QuizAttempt {
  date: number;
  score: number; // percentage 0-100
  correct: number;
  total: number;
}

export interface ReviewSchedule {
  oneDay: { date: number; completed: boolean };
  oneWeek: { date: number; completed: boolean };
}

export interface ActiveReviewPosition {
  reviewType: 'oneDay' | 'oneWeek';
  currentIndex: number;
  shuffledItemIds: string[];
  results: Array<{
    itemId: string;
    userAnswer: string;
    isCorrect: boolean;
  }>;
  startedAt: number;
}

export interface ActiveQuizPosition {
  currentIndex: number;
  shuffledItemIds: string[];
  results: Array<{
    itemId: string;
    userAnswer: string;
    isCorrect: boolean;
  }>;
  startedAt: number;
}

export interface TopicProgress {
  topicId: string;
  quizAttempts: QuizAttempt[];
  bestScore: number | null;
  completedAt: number | null;
  reviewSchedule: ReviewSchedule | null;
  activeReview: ActiveReviewPosition | null;
  activeQuiz: ActiveQuizPosition | null;
}

export interface LearningProgress {
  version: number;
  topics: Record<string, TopicProgress>;
  lastUpdated: number;
  // Dismissed alerts - stored as "topicId-reviewType" strings
  dismissedReviewAlerts?: string[];
}

export type TopicStatus = "not-started" | "completed" | "review-due";

export function createInitialProgress(): LearningProgress {
  return {
    version: CURRENT_VERSION,
    topics: {},
    lastUpdated: Date.now(),
  };
}

export function createInitialTopicProgress(topicId: string): TopicProgress {
  return {
    topicId,
    quizAttempts: [],
    bestScore: null,
    completedAt: null,
    reviewSchedule: null,
    activeReview: null,
    activeQuiz: null,
  };
}

/**
 * Get the start of the next day (00:00:00 tomorrow)
 */
function getStartOfNextDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Get the start of day N days from now
 */
function getStartOfDayAfter(timestamp: number, days: number): number {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function createReviewSchedule(completedAt: number): ReviewSchedule {
  return {
    // 1-day review: due at start of next day (00:00:00)
    oneDay: { date: getStartOfNextDay(completedAt), completed: false },
    // 7-day review: due at start of 7th day from now (00:00:00)
    oneWeek: { date: getStartOfDayAfter(completedAt, 7), completed: false },
  };
}

export function isReviewDue(schedule: ReviewSchedule | null): {
  oneDay: boolean;
  oneWeek: boolean;
  anyDue: boolean;
} {
  if (!schedule) {
    return { oneDay: false, oneWeek: false, anyDue: false };
  }

  const now = Date.now();
  const oneDayDue = !schedule.oneDay.completed && now >= schedule.oneDay.date;
  const oneWeekDue =
    !schedule.oneWeek.completed && now >= schedule.oneWeek.date;

  return {
    oneDay: oneDayDue,
    // oneDay: true,
    oneWeek: oneWeekDue,
    // oneWeek: true,
    anyDue: oneDayDue || oneWeekDue,
  };
}

export function getTopicStatus(progress: TopicProgress | null): TopicStatus {
  if (!progress || progress.quizAttempts.length === 0) {
    return "not-started";
  }

  const reviewStatus = isReviewDue(progress.reviewSchedule);
  if (reviewStatus.anyDue) {
    return "review-due";
  }

  return "completed";
}

export function getNextReviewType(
  schedule: ReviewSchedule | null,
): "oneDay" | "oneWeek" | null {
  if (!schedule) return null;

  const reviewStatus = isReviewDue(schedule);

  // Return the earliest due review
  if (reviewStatus.oneDay) return "oneDay";
  if (reviewStatus.oneWeek) return "oneWeek";

  return null;
}

export function formatReviewDate(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff < 0) {
    return "overdue";
  }

  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / ONE_DAY_MS);

  if (hours < 24) {
    return hours <= 1 ? "in 1 hour" : `in ${hours} hours`;
  }

  if (days === 1) {
    return "tomorrow";
  }

  return `in ${days} days`;
}
