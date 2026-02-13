import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTopicData, getTopicById, getTopics } from '@/lib/vocabulary/data';
import { TopicPageContentWrapper } from '@/components/vocabulary/TopicPageContentWrapper';
import { ChevronLeft } from 'lucide-react';

interface TopicPageProps {
  params: Promise<{ topic: string }>;
}

export async function generateStaticParams() {
  const topics = getTopics();
  return topics.map((topic) => ({
    topic: topic.id,
  }));
}

export async function generateMetadata({ params }: TopicPageProps) {
  const { topic: topicId } = await params;
  const topic = getTopicById(topicId);

  if (!topic) {
    return {
      title: 'Topic Not Found - Bloom English',
    };
  }

  return {
    title: `${topic.name} Vocabulary - Bloom English`,
    description: topic.description,
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topic: topicId } = await params;
  const topic = getTopicById(topicId);
  const topicData = await getTopicData(topicId);

  if (!topic || !topicData) {
    notFound();
  }

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

        <TopicPageContentWrapper topic={topic} items={topicData.items} />
      </div>
    </div>
  );
}
