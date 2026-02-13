'use client';

import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

interface LetterSlotsProps {
  word: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showResult?: 'correct' | 'incorrect' | null;
  lockedChars?: number;
}

export interface LetterSlotsRef {
  focus: () => void;
}

export const LetterSlots = forwardRef<LetterSlotsRef, LetterSlotsProps>(function LetterSlots({
  word,
  value,
  onChange,
  disabled = false,
  showResult = null,
  lockedChars = 0,
}, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Move cursor to end
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    },
  }), []);

  // Move cursor to end of input value
  const moveCursorToEnd = useCallback(() => {
    if (inputRef.current) {
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, []);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
      moveCursorToEnd();
    }
  }, [disabled, moveCursorToEnd]);

  // Also move cursor to end when value changes (e.g., after hint)
  useEffect(() => {
    moveCursorToEnd();
  }, [value, moveCursorToEnd]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Small delay to ensure the focus event completes before moving cursor
    requestAnimationFrame(() => {
      moveCursorToEnd();
    });
  }, [moveCursorToEnd]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Prevent modifying locked characters
    if (newValue.length < lockedChars) {
      // Restore locked prefix if user tried to delete it
      const lockedPrefix = word.slice(0, lockedChars);
      onChange(lockedPrefix);
      return;
    }

    // Ensure locked characters remain unchanged
    if (lockedChars > 0) {
      const lockedPrefix = word.slice(0, lockedChars);
      const userSuffix = newValue.slice(lockedChars);
      const correctedValue = lockedPrefix + userSuffix;
      if (correctedValue.length <= word.length) {
        onChange(correctedValue);
      }
      return;
    }

    if (newValue.length <= word.length) {
      onChange(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent backspace from deleting locked characters
    if (e.key === 'Backspace' && value.length <= lockedChars) {
      e.preventDefault();
    }
  };

  const getSlotColor = (index: number) => {
    if (!showResult) {
      // Show hinted/locked characters in a different color
      if (index < lockedChars) {
        return 'text-amber-600 dark:text-amber-400';
      }
      return 'text-foreground';
    }
    if (showResult === 'correct') {
      return 'text-green-600 dark:text-green-400';
    }
    // Incorrect - show which letters are right/wrong
    const userChar = value[index]?.toLowerCase();
    const correctChar = word[index]?.toLowerCase();
    if (userChar === correctChar) {
      return 'text-green-600 dark:text-green-400';
    }
    return 'text-red-600 dark:text-red-400';
  };

  const getUnderscoreColor = (index: number) => {
    if (showResult) {
      if (showResult === 'correct') {
        return 'bg-green-500 dark:bg-green-400';
      }
      return 'bg-red-500 dark:bg-red-400';
    }
    // Highlight current typing position
    if (!disabled && isFocused && index === value.length) {
      return 'bg-primary animate-pulse';
    }
    return 'bg-muted-foreground/40';
  };

  return (
    <div
      className="relative cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        className="absolute opacity-0 w-0 h-0"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />

      <div className={`flex justify-center flex-wrap gap-1 ${word.length > 12 ? 'gap-0.5' : 'md:gap-1.5'}`}>
        {word.split('').map((char, index) => {
          const isSpace = char === ' ';
          const userChar = value[index] || '';
          const displayChar = showResult === 'incorrect' && !userChar ? word[index] : userChar;

          if (isSpace) {
            return (
              <div key={index} className="w-3 md:w-4" />
            );
          }

          // Smaller slots for long words
          const slotSizeClass = word.length > 15
            ? 'w-4 md:w-5'
            : word.length > 12
              ? 'w-5 md:w-6'
              : 'w-5 md:w-7';

          const fontSizeClass = word.length > 15
            ? 'text-base md:text-lg'
            : 'text-lg md:text-xl';

          return (
            <div
              key={index}
              className={`flex flex-col items-center ${slotSizeClass}`}
            >
              <span
                className={`${fontSizeClass} font-mono font-bold h-7 flex items-center justify-center ${getSlotColor(index)}`}
              >
                {displayChar || '\u00A0'}
              </span>
              <div
                className={`w-full h-0.5 rounded-full ${getUnderscoreColor(index)}`}
              />
            </div>
          );
        })}
      </div>

      {!disabled && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          Type the word ({word.length} letters)
        </p>
      )}
    </div>
  );
});
