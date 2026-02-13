"use client";

import { Badge } from "@/components/ui/badge";
import { useAccentPreference } from "@/hooks/useAccentPreference";
import type { VocabularyItem } from "@/lib/vocabulary/types";
import {
  getPartOfSpeechColor,
  normalizeVietnameseDefinitions,
  parsePhonetic,
  type Accent,
} from "@/lib/vocabulary/utils";
import { AudioButton } from "./AudioButton";

interface FlashcardFrontProps {
  item: VocabularyItem;
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "beginner":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "intermediate":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "advanced":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function parsePartsOfSpeech(pos: string): string[] {
  return pos
    .split(/[;,]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function FlashcardFront({ item }: FlashcardFrontProps) {
  const { accent, setAccent } = useAccentPreference();
  const parsed = parsePhonetic(item.phonetic);
  const hasVariants = parsed.bre !== null && parsed.ame !== null;

  const handleAccentSelect = (selected: Accent, e: React.MouseEvent) => {
    e.stopPropagation();
    setAccent(selected);
  };

  return (
    <div className="[grid-area:1/1] backface-hidden bg-card rounded-2xl p-6 flex flex-col border card-glow">
      <div className="flex justify-start items-start mb-2">
        <Badge
          variant="secondary"
          className={getDifficultyColor(item.difficulty)}
        >
          {item.difficulty}
        </Badge>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-2">{item.word}</h2>
        {hasVariants ? (
          <div className="flex flex-row gap-1 mb-1">
            {(
              [
                ["BrE", parsed.bre!],
                ["AmE", parsed.ame!],
              ] as const
            ).map(([label, phonetic]) => (
              <button
                key={label}
                type="button"
                onClick={(e) => handleAccentSelect(label, e)}
                className={`flex items-center gap-2 px-2.5 py-0.5 rounded-md transition-colors ${
                  accent === label
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide w-7 text-left ${
                    accent === label ? "text-primary" : ""
                  }`}
                >
                  {label}
                </span>
                <span className="text-base">{phonetic}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-lg text-muted-foreground mb-1">{item.phonetic}</p>
        )}

        {/* Part of Speech */}
        <div className="flex gap-1.5 flex-wrap justify-center mb-2">
          {parsePartsOfSpeech(item.partOfSpeech).map((pos) => (
            <Badge
              key={pos}
              variant="secondary"
              className={getPartOfSpeechColor(pos)}
            >
              {pos}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <AudioButton text={item.word} accent={accent} />
          <AudioButton text={item.word} slow accent={accent} />
        </div>

        <div className="space-y-2 w-full max-w-md">
          <div className="px-3 py-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-0.5">English</p>
            <p className="text-sm text-foreground">{item.definitionEnglish}</p>
          </div>
          <div className="px-3 py-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-0.5">Vietnamese</p>
            <div className="space-y-1">
              {normalizeVietnameseDefinitions(item.definitionVietnamese).map(
                (def, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {def.type && (
                      <span
                        className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${getPartOfSpeechColor(def.type)}`}
                      >
                        {def.type}
                      </span>
                    )}
                    <p className="text-sm text-foreground">{def.definition}</p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
