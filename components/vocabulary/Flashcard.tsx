'use client';

import type { VocabularyItem } from '@/lib/vocabulary/types';
import { FlashcardFront } from './FlashcardFront';
import { FlashcardBack } from './FlashcardBack';

interface FlashcardProps {
  item: VocabularyItem;
  isFlipped: boolean;
  onFlip: () => void;
}

export function Flashcard({ item, isFlipped, onFlip }: FlashcardProps) {
  return (
    <div
      className="perspective-1000 w-full max-w-lg mx-auto cursor-pointer"
      onClick={onFlip}
    >
      <div
        className={`grid w-full preserve-3d transition-transform duration-500 ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        <FlashcardFront item={item} />
        <FlashcardBack item={item} />
      </div>
    </div>
  );
}
