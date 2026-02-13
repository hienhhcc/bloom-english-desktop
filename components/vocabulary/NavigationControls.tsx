import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavigationControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function NavigationControls({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: NavigationControlsProps) {
  return (
    <div className="flex justify-center gap-4">
      <Button
        variant="secondary"
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="cursor-pointer"
        aria-label="Previous word"
      >
        <ChevronLeft className="size-5" />
        <span>Previous</span>
      </Button>
      <Button
        onClick={onNext}
        disabled={!hasNext}
        className="cursor-pointer"
        aria-label="Next word"
      >
        <span>Next</span>
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
