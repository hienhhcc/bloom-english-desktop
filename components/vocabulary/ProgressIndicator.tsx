import { Progress } from '@/components/ui/progress';

interface ProgressIndicatorProps {
  current: number;
  total: number;
}

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  const percentage = ((current + 1) / total) * 100;

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-md mx-auto">
      <span className="text-sm text-muted-foreground">
        Word {current + 1} of {total}
      </span>
      <Progress value={percentage} />
    </div>
  );
}
