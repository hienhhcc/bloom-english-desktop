'use client';

import { Check, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TopicStatus } from '@/lib/vocabulary/progress';

interface TopicProgressBadgeProps {
  status: TopicStatus;
  bestScore?: number | null;
}

export function TopicProgressBadge({ status, bestScore }: TopicProgressBadgeProps) {
  if (status === 'not-started') {
    return null;
  }

  if (status === 'review-due') {
    return (
      <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 animate-pulse">
        <Clock className="size-3" />
        <span>Review Due</span>
      </Badge>
    );
  }

  // status === 'completed'
  return (
    <Badge variant="outline" className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
      <Check className="size-3" />
      {bestScore !== null && bestScore !== undefined ? (
        <span>Best: {bestScore}%</span>
      ) : (
        <span>Completed</span>
      )}
    </Badge>
  );
}
