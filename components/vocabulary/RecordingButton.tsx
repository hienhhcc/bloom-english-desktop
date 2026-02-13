'use client';

import { useCallback, useRef } from 'react';
import { Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecordingButtonProps {
  isRecording: boolean;
  isDisabled: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RecordingButton({
  isRecording,
  isDisabled,
  onStartRecording,
  onStopRecording,
  size = 'md',
  className = '',
}: RecordingButtonProps) {
  // Track if we've handled a touch event to prevent click from firing too
  const handledByTouchRef = useRef(false);

  const sizeClasses = {
    sm: 'size-10',
    md: 'size-14',
    lg: 'size-20',
  };

  const iconSizes = {
    sm: 'size-5',
    md: 'size-6',
    lg: 'size-8',
  };

  const handleAction = useCallback(() => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  }, [isRecording, onStartRecording, onStopRecording]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Skip if this click was triggered by a touch we already handled
    if (handledByTouchRef.current) {
      handledByTouchRef.current = false;
      return;
    }

    handleAction();
  }, [handleAction]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Mark that we handled this via touch so we skip the synthetic click
    handledByTouchRef.current = true;

    // Reset the flag after a short delay (in case click doesn't fire)
    setTimeout(() => {
      handledByTouchRef.current = false;
    }, 100);

    handleAction();
  }, [handleAction]);

  return (
    <Button
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      disabled={isDisabled}
      className={cn(
        'rounded-full flex items-center justify-center touch-manipulation select-none',
        sizeClasses[size],
        isRecording
          ? 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white'
          : 'bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground',
        className
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isRecording ? (
        <Square className={iconSizes[size]} fill="currentColor" />
      ) : (
        <Mic className={iconSizes[size]} />
      )}
    </Button>
  );
}
