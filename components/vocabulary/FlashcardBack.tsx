import { Badge } from '@/components/ui/badge';
import { generateWordVariations } from '@/lib/languageTool';
import type { VocabularyItem } from '@/lib/vocabulary/types';
import type { ReactNode } from 'react';

interface FlashcardBackProps {
  item: VocabularyItem;
}

function boldWord(text: string, item: VocabularyItem): ReactNode {
  // Collect all inflected forms: the word + word family, each with variations
  const allForms = new Set<string>();
  for (const form of generateWordVariations(item.word)) {
    allForms.add(form.toLowerCase());
  }
  for (const wf of item.wordFamily) {
    for (const form of generateWordVariations(wf.word)) {
      allForms.add(form.toLowerCase());
    }
  }

  // Sort longest-first so "offenders" matches before "offend"
  const sorted = [...allForms].sort((a, b) => b.length - a.length);

  const pattern = new RegExp(
    `\\b(${sorted.map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi'
  );

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={match.index}>{match[0]}</strong>);
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex === 0) return text;
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export function FlashcardBack({ item }: FlashcardBackProps) {
  return (
    <div className="[grid-area:1/1] backface-hidden rotate-y-180 bg-card rounded-2xl p-4 flex flex-col border card-glow">

      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">Examples</h3>
          <div className="space-y-1.5">
            {item.examples.slice(0, -1).map((example, index) => (
              <div key={index} className="px-3 py-2 bg-muted rounded-lg">
                <p className="text-sm text-foreground mb-0.5">{boldWord(example.english, item)}</p>
                <p className="text-xs text-muted-foreground">{example.vietnamese}</p>
              </div>
            ))}
          </div>
        </div>

        {item.collocations.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">Collocations</h3>
            <div className="flex flex-wrap gap-1.5">
              {item.collocations.map((collocation) => (
                <Badge
                  key={collocation}
                  variant="outline"
                  className="bg-secondary/50 dark:bg-secondary/20 text-secondary-foreground border-border"
                >
                  {collocation}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {item.synonyms.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">Synonyms</h3>
            <div className="flex flex-wrap gap-1.5">
              {item.synonyms.map((synonym) => (
                <Badge
                  key={synonym}
                  variant="outline"
                  className="bg-accent/30 dark:bg-accent/20 text-accent-foreground border-accent/30"
                >
                  {synonym}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {item.antonyms.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">Antonyms</h3>
            <div className="flex flex-wrap gap-1.5">
              {item.antonyms.map((antonym) => (
                <Badge
                  key={antonym}
                  variant="outline"
                  className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                >
                  {antonym}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {item.wordFamily.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">Word Family</h3>
            <div className="space-y-1.5">
              {item.wordFamily.map((wf) => (
                <div key={`${wf.word}-${wf.partOfSpeech}`} className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className="bg-primary/10 dark:bg-primary/20 text-primary border-primary/20 shrink-0"
                  >
                    {wf.word} <span className="text-xs opacity-75">({wf.partOfSpeech})</span>
                  </Badge>
                  {wf.definition && (
                    <span className="text-sm text-muted-foreground">{wf.definition}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
