'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { VocabularyItem, VocabularyTopic } from '@/lib/vocabulary/types';
import { FlashcardContainer } from './FlashcardContainer';
import { TopicQuiz } from './TopicQuiz';
import { useProgress } from '@/hooks/useProgress';
import { CalendarPlus, ClipboardList, TextCursorInput } from 'lucide-react';
import type { QuizResult } from '@/hooks/useTopicQuiz';
import { Button } from '@/components/ui/button';
import { ClozeQuizMode } from './ClozeQuizMode';

type PageMode = 'learning' | 'quiz' | 'cloze';

interface TopicPageContentProps {
  topic: VocabularyTopic;
  items: VocabularyItem[];
  initialMode?: PageMode;
  reviewType?: 'oneDay' | 'oneWeek';
}

export function TopicPageContent({ topic, items, initialMode = 'learning', reviewType }: TopicPageContentProps) {
  const [pageMode, setPageMode] = useState<PageMode>(initialMode);
  const { recordQuizAttempt, getTopicProgress, markReviewCompleted, scheduleReview } = useProgress();
  const [reviewScheduled, setReviewScheduled] = useState(false);
  const reviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const topicProgress = getTopicProgress(topic.id);
  const isFirstCompletion = topicProgress === null || topicProgress.completedAt === null;

  const hasActiveReview = topicProgress?.reviewSchedule != null &&
    (!topicProgress.reviewSchedule.oneDay.completed || !topicProgress.reviewSchedule.oneWeek.completed);

  const handleScheduleReview = useCallback(() => {
    scheduleReview(topic.id);
    setReviewScheduled(true);
    if (reviewTimeoutRef.current) clearTimeout(reviewTimeoutRef.current);
    reviewTimeoutRef.current = setTimeout(() => setReviewScheduled(false), 2000);
  }, [scheduleReview, topic.id]);

  useEffect(() => {
    return () => {
      if (reviewTimeoutRef.current) clearTimeout(reviewTimeoutRef.current);
    };
  }, []);

  const handleQuizComplete = useCallback(
    (score: { correct: number; total: number }, _results: QuizResult[]) => {
      recordQuizAttempt(topic.id, score);

      // If there's a due review, mark it as completed
      if (topicProgress?.reviewSchedule) {
        const now = Date.now();
        if (
          !topicProgress.reviewSchedule.oneDay.completed &&
          now >= topicProgress.reviewSchedule.oneDay.date
        ) {
          markReviewCompleted(topic.id, 'oneDay');
        } else if (
          topicProgress.reviewSchedule.oneDay.completed &&
          !topicProgress.reviewSchedule.oneWeek.completed &&
          now >= topicProgress.reviewSchedule.oneWeek.date
        ) {
          markReviewCompleted(topic.id, 'oneWeek');
        }
      }
    },
    [recordQuizAttempt, markReviewCompleted, topic.id, topicProgress]
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{topic.icon}</span>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{topic.name}</h1>
            <p className="text-muted-foreground">{topic.nameVietnamese}</p>
          </div>
        </div>

        {pageMode === 'learning' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleScheduleReview}
              disabled={reviewScheduled}
            >
              <CalendarPlus className="size-5" />
              {reviewScheduled ? (
                <span>Review Scheduled!</span>
              ) : (
                <>
                  <span className="hidden sm:inline">
                    {hasActiveReview ? 'Re-schedule Review' : 'Add to Review'}
                  </span>
                  <span className="sm:hidden">Review</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPageMode('cloze')}
            >
              <TextCursorInput className="size-5" />
              <span className="hidden sm:inline">Cloze Quiz</span>
              <span className="sm:hidden">Cloze</span>
            </Button>
            <Button
              onClick={() => setPageMode('quiz')}
            >
              <ClipboardList className="size-5" />
              <span className="hidden sm:inline">Start Topic Quiz</span>
              <span className="sm:hidden">Quiz</span>
            </Button>
          </div>
        )}
      </div>

      {pageMode === 'learning' ? (
        <FlashcardContainer items={items} />
      ) : pageMode === 'cloze' ? (
        <ClozeQuizMode
          items={items}
          topicId={topic.id}
          onExit={() => setPageMode('learning')}
        />
      ) : (
        <TopicQuiz
          items={items}
          topicId={topic.id}
          onExit={() => setPageMode('learning')}
          onQuizComplete={handleQuizComplete}
          isFirstCompletion={isFirstCompletion}
          reviewType={reviewType}
        />
      )}
    </>
  );
}
