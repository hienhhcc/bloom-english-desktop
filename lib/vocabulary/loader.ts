import type { VocabularyTopic, TopicData } from './types';

// Called on initial mount: seeds new files from source, then scans.
export async function getTopicsRuntime(): Promise<VocabularyTopic[]> {
  if (typeof window !== 'undefined' && window.vocabularyAPI) {
    await window.vocabularyAPI.seed();
    return window.vocabularyAPI.scan();
  }
  return [];
}

// Called by the Refresh button: re-seeds source files, then scans.
export async function scanTopicsRuntime(): Promise<VocabularyTopic[]> {
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
