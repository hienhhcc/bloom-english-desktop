import type { VocabularyTopic, TopicData } from './types';
import { readFileSync } from 'fs';
import { join } from 'path';

import topicsData from '@/data/vocabulary/topics.json';

const vocabDir = join(process.cwd(), 'data', 'vocabulary');

export function getTopics(): VocabularyTopic[] {
  return (topicsData as VocabularyTopic[]).map((topic) => {
    try {
      const raw = readFileSync(join(vocabDir, `${topic.id}.json`), 'utf-8');
      const data = JSON.parse(raw) as TopicData;
      return { ...topic, wordCount: data.items.length };
    } catch {
      return topic;
    }
  });
}

export async function getTopicData(topicId: string): Promise<TopicData | null> {
  try {
    const data = await import(`@/data/vocabulary/${topicId}.json`);
    return data.default as TopicData;
  } catch {
    return null;
  }
}

export function getTopicById(topicId: string): VocabularyTopic | undefined {
  return getTopics().find((topic) => topic.id === topicId);
}
