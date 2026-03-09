'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getTopicDataRuntime } from '@/lib/vocabulary/loader';
import { TopicPageContentWrapper } from '@/components/vocabulary/TopicPageContentWrapper';
import type { TopicData, VocabularyTopic } from '@/lib/vocabulary/types';

function DynamicTopicPageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const [data, setData] = useState<TopicData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    getTopicDataRuntime(id)
      .then((result) => {
        if (!result) setError(true);
        else setData(result);
      })
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Topic not found.
      </div>
    );
  }

  if (!data) {
    return <div className="animate-pulse h-96" />;
  }

  const topic: VocabularyTopic = {
    id,
    name: id,
    nameVietnamese: '',
    description: '',
    icon: '📚',
    wordCount: data.items.length,
    difficulty: 'intermediate',
    createdAt: new Date().toISOString(),
  };

  return <TopicPageContentWrapper topic={topic} items={data.items} />;
}

export default function DynamicTopicPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/vocabulary"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 cursor-pointer"
        >
          <ChevronLeft className="size-4 mr-1" />
          Back to Topics
        </Link>

        <Suspense fallback={<div className="animate-pulse h-96" />}>
          <DynamicTopicPageInner />
        </Suspense>
      </div>
    </div>
  );
}
