'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import type { VocabularyItem, VocabularyTopic } from '@/lib/vocabulary/types';
import { TopicPageContent } from './TopicPageContent';

interface TopicPageContentWrapperProps {
  topic: VocabularyTopic;
  items: VocabularyItem[];
}

function TopicPageContentInner({ topic, items }: TopicPageContentWrapperProps) {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const review = searchParams.get('review');

  const initialMode = mode === 'quiz' ? 'quiz' : 'learning';
  const reviewType = review === 'oneDay' || review === 'oneWeek' ? review : undefined;

  return <TopicPageContent topic={topic} items={items} initialMode={initialMode} reviewType={reviewType} />;
}

export function TopicPageContentWrapper({ topic, items }: TopicPageContentWrapperProps) {
  return (
    <Suspense fallback={<div className="animate-pulse h-96" />}>
      <TopicPageContentInner topic={topic} items={items} />
    </Suspense>
  );
}
