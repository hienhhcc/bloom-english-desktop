export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'interjection'
  | 'determiner'
  | 'phrasal verb';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ExampleSentence {
  english: string;
  vietnamese: string;
}

export interface WordFamilyItem {
  word: string;
  partOfSpeech: PartOfSpeech;
  definition?: string;
}

export interface VietnameseDefinition {
  type: string;
  definition: string;
}

export interface VocabularyItem {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: PartOfSpeech;
  definitionEnglish: string;
  definitionVietnamese: string | VietnameseDefinition[];
  difficulty: DifficultyLevel;
  imageUrl: string;
  examples: [ExampleSentence, ExampleSentence, ExampleSentence];
  collocations: string[];
  synonyms: string[];
  antonyms: string[];
  wordFamily: WordFamilyItem[];
}

export interface VocabularyTopic {
  id: string;
  name: string;
  nameVietnamese: string;
  description: string;
  icon: string;
  wordCount: number;
  difficulty: DifficultyLevel;
  createdAt: string; // ISO datetime string (YYYY-MM-DDTHH:mm:ss)
}

export interface TopicData {
  topicId: string;
  items: VocabularyItem[];
}
