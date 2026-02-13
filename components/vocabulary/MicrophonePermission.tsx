'use client';

import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MicrophonePermissionProps {
  error: 'not-allowed' | 'audio-capture' | null;
  onRetry: () => void;
  onSkip?: () => void;
}

export function MicrophonePermission({ error, onRetry, onSkip }: MicrophonePermissionProps) {
  const isPermissionDenied = error === 'not-allowed';
  const isMicrophoneError = error === 'audio-capture';

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-2xl">
      <div className={`size-16 rounded-full flex items-center justify-center mb-4 ${
        isPermissionDenied || isMicrophoneError
          ? 'bg-red-100 dark:bg-red-900/30'
          : 'bg-amber-100 dark:bg-amber-900/30'
      }`}>
        {isPermissionDenied || isMicrophoneError ? (
          <MicOff className="size-8 text-red-600 dark:text-red-400" />
        ) : (
          <Mic className="size-8 text-amber-600 dark:text-amber-400" />
        )}
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {isPermissionDenied
          ? 'Microphone Access Denied'
          : isMicrophoneError
          ? 'Microphone Error'
          : 'Microphone Access Required'}
      </h3>

      <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
        {isPermissionDenied ? (
          <>
            Please allow microphone access in your browser settings to use the pronunciation quiz.
            <br />
            <span className="text-xs mt-2 block">
              Click the lock/settings icon in your browser&apos;s address bar to manage permissions.
            </span>
          </>
        ) : isMicrophoneError ? (
          'Unable to access your microphone. Please check that it is connected and not being used by another application.'
        ) : (
          'We need access to your microphone to check your pronunciation. Click the button below and allow microphone access when prompted.'
        )}
      </p>

      {(isPermissionDenied || isMicrophoneError) && (
        <Alert className="mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <AlertCircle className="size-5 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
            {isPermissionDenied
              ? 'After updating permissions, you may need to refresh the page.'
              : 'Try disconnecting and reconnecting your microphone, then click retry.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button onClick={onRetry}>
          {isPermissionDenied || isMicrophoneError ? 'Retry' : 'Enable Microphone'}
        </Button>

        {onSkip && (
          <Button variant="secondary" onClick={onSkip}>
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}
