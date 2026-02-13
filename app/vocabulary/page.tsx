import { getTopics } from '@/lib/vocabulary/data';
import { VocabularyPageContent } from '@/components/vocabulary/VocabularyPageContent';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = {
  title: 'Vocabulary - Bloom English',
  description: 'Learn English vocabulary with interactive flashcards organized by topic',
};

export default function VocabularyPage() {
  const topics = getTopics();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 cursor-pointer"
          >
            <ChevronLeft className="size-4 mr-1" />
            Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Vocabulary</h1>
          <p className="text-muted-foreground">
            Choose a topic to start learning new words with interactive flashcards
          </p>
        </div>

        <VocabularyPageContent topics={topics} />
      </div>
    </div>
  );
}
