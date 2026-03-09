interface Window {
  vocabularyAPI?: {
    seed(): Promise<string>;
    scan(): Promise<import('@/lib/vocabulary/types').VocabularyTopic[]>;
    getTopic(topicId: string): Promise<import('@/lib/vocabulary/types').TopicData | null>;
  };
}
