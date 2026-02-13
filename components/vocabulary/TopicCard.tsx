import Link from 'next/link';
import type { VocabularyTopic } from '@/lib/vocabulary/types';
import type { TopicProgress } from '@/lib/vocabulary/progress';
import { getTopicStatus } from '@/lib/vocabulary/progress';
import { TopicProgressBadge } from './TopicProgressBadge';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TopicCardProps {
  topic: VocabularyTopic;
  progress?: TopicProgress | null;
  isReviewDismissed?: boolean;
}

function getNextReviewLabel(progress: TopicProgress | null): { text: string; isOverdue: boolean } | null {
  if (!progress?.reviewSchedule) return null;

  const { oneDay, oneWeek } = progress.reviewSchedule;
  const now = Date.now();

  // Find the next uncompleted review (oneDay first, then oneWeek)
  const next = !oneDay.completed ? oneDay : !oneWeek.completed ? oneWeek : null;
  if (!next) return null;

  const isOverdue = now >= next.date;
  if (isOverdue) return { text: 'Overdue', isOverdue: true };

  const diff = next.date - now;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (hours < 1) return { text: 'Review: less than 1h', isOverdue: false };
  if (hours < 24) return { text: `Review: in ${hours}h`, isOverdue: false };
  if (days === 1) return { text: 'Review: tomorrow', isOverdue: false };

  // Show the actual date for >1 day away
  const date = new Date(next.date);
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { text: `Review: ${formatted}`, isOverdue: false };
}

function getDifficultyVariant(difficulty: string): string {
  switch (difficulty) {
    case 'beginner':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'advanced':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function TopicCard({ topic, progress, isReviewDismissed }: TopicCardProps) {
  const rawStatus = getTopicStatus(progress ?? null);
  const status = rawStatus === 'review-due' && isReviewDismissed ? 'completed' : rawStatus;
  const reviewLabel = getNextReviewLabel(progress ?? null);

  return (
    <Link href={`/vocabulary/${topic.id}`}>
      <Card className={`p-6 h-full hover:shadow-lg hover:translate-y-[-2px] hover:border-primary/20 transition-all duration-200 cursor-pointer ${
        status === 'review-due'
          ? 'border-amber-300 dark:border-amber-700'
          : ''
      }`}>
        <CardContent className="p-0 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <span className="text-4xl">{topic.icon}</span>
            <div className="flex items-center gap-2">
              <TopicProgressBadge status={status} bestScore={progress?.bestScore} />
              <Badge variant="secondary" className={getDifficultyVariant(topic.difficulty)}>
                {topic.difficulty}
              </Badge>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-1">{topic.name}</h3>
          <p className="text-sm text-muted-foreground mb-2">{topic.nameVietnamese}</p>
          <p className="text-sm text-muted-foreground mb-4 flex-1">{topic.description}</p>

          {reviewLabel && (
            <div className={`flex items-center gap-1.5 text-xs mb-3 ${
              reviewLabel.isOverdue
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground'
            }`}>
              <CalendarDays className="size-3.5" />
              <span>{reviewLabel.text}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{topic.wordCount} words</span>
            <span
              className={`font-medium inline-flex items-center gap-1 ${
                status === 'review-due'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-primary'
              }`}
            >
              {status === 'not-started' && 'Start Learning'}
              {status === 'completed' && 'Practice More'}
              {status === 'review-due' && 'Review Now'}
              <ArrowRight className="size-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
