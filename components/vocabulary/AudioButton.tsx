'use client';

import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { Volume2, Snail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Accent } from '@/lib/vocabulary/utils';

interface AudioButtonProps {
  text: string;
  slow?: boolean;
  className?: string;
  accent?: Accent;
}

export function AudioButton({ text, slow = false, className = '', accent = 'AmE' }: AudioButtonProps) {
  const { speak, isSpeaking, isSupported } = useTextToSpeech(accent);

  if (!isSupported) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    speak(text, slow);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isSpeaking}
      className={`rounded-full ${className}`}
      aria-label={slow ? 'Play slow pronunciation' : 'Play pronunciation'}
      title={slow ? 'Slow speed' : 'Normal speed'}
    >
      {slow ? (
        <Snail className="size-6" />
      ) : (
        <Volume2 className="size-6" />
      )}
    </Button>
  );
}
