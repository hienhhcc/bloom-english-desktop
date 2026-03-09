import type { VocabularyTopic, TopicData } from './types';

let seedPromise: Promise<void> | null = null;
function ensureSeeded() {
  if (typeof window === 'undefined' || !window.vocabularyAPI) return Promise.resolve();
  if (!seedPromise) seedPromise = window.vocabularyAPI.seed().then(() => {});
  return seedPromise;
}

export async function getTopicsRuntime(): Promise<VocabularyTopic[]> {
  if (typeof window !== 'undefined' && window.vocabularyAPI) {
    await ensureSeeded();
    return window.vocabularyAPI.scan();
  }
  return [];
}

export async function getTopicDataRuntime(topicId: string): Promise<TopicData | null> {
  if (typeof window !== 'undefined' && window.vocabularyAPI) {
    await ensureSeeded();
    return window.vocabularyAPI.getTopic(topicId);
  }
  return null;
}
