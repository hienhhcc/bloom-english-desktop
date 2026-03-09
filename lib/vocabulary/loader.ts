import type { VocabularyTopic, TopicData } from './types';

export async function getTopicsRuntime(): Promise<VocabularyTopic[]> {
  if (typeof window !== 'undefined' && window.vocabularyAPI) {
    await window.vocabularyAPI.seed();
    return window.vocabularyAPI.scan();
  }
  return [];
}

export async function getTopicDataRuntime(topicId: string): Promise<TopicData | null> {
  if (typeof window !== 'undefined' && window.vocabularyAPI) {
    await window.vocabularyAPI.seed();
    return window.vocabularyAPI.getTopic(topicId);
  }
  return null;
}
