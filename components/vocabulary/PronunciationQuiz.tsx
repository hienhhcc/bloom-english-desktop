'use client';

import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAccentPreference } from '@/hooks/useAccentPreference';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { playErrorSound, playSuccessSound } from '@/lib/audio';
import { evaluatePronunciation, getPronunciationFeedback, type PronunciationResult } from '@/lib/pronunciationEvaluator';
import type { VocabularyItem } from '@/lib/vocabulary/types';
import type { Accent } from '@/lib/vocabulary/utils';
import { ArrowRight, Check, Mic, RotateCcw, Snail, Volume2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MicrophonePermission } from './MicrophonePermission';
import { RecordingButton } from './RecordingButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type QuizState = 'ready' | 'recording' | 'processing' | 'result';
type PronunciationPhase = 'word' | 'sentence';

interface PronunciationQuizProps {
  item: VocabularyItem;
  onComplete: (wasCorrect: boolean) => void;
}

export function PronunciationQuiz({ item, onComplete }: PronunciationQuizProps) {
  const [phase, setPhase] = useState<PronunciationPhase>('word');
  const [hasResult, setHasResult] = useState(false);
  const [wordResult, setWordResult] = useState<PronunciationResult | null>(null);
  const [sentenceResult, setSentenceResult] = useState<PronunciationResult | null>(null);
  const [showPermissionUI, setShowPermissionUI] = useState(false);
  const [evaluatedText, setEvaluatedText] = useState<string>('');

  // Track previous isProcessing state to detect when transcription completes
  const prevIsProcessingRef = useRef(false);

  const {
    isListening,
    isProcessing,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const { accent, setAccent } = useAccentPreference();
  const { speak, isSpeaking } = useTextToSpeech(accent);

  // Use first example sentence for pronunciation practice
  const exampleSentence = item.examples[0];

  // Compute quiz state from recording/processing status and result
  const quizState: QuizState = hasResult
    ? 'result'
    : isListening
      ? 'recording'
      : isProcessing
        ? 'processing'
        : 'ready';

  // Get the expected text based on current phase
  const getExpectedText = useCallback(() => {
    return phase === 'word' ? item.word : exampleSentence.english;
  }, [phase, item.word, exampleSentence.english]);

  // Process recording result when transcription completes
  const processRecordingResult = useCallback((currentTranscript: string) => {
    const expected = getExpectedText();

    if (currentTranscript) {
      // Store the text that was actually evaluated
      setEvaluatedText(currentTranscript);

      const result = evaluatePronunciation(currentTranscript, expected);

      if (phase === 'word') {
        setWordResult(result);
      } else {
        setSentenceResult(result);
      }

      if (result.isPassing) {
        playSuccessSound();
      } else {
        playErrorSound();
      }
    } else {
      // No speech detected - create a failing result
      const expectedWords = expected.toLowerCase().split(' ').filter(w => w.length > 0);
      const noSpeechResult: PronunciationResult = {
        isExactMatch: false,
        wordMatchScore: 0,
        phoneticScore: 0,
        editDistanceScore: 0,
        overallScore: 0,
        isPassing: false,
        recognizedWords: [],
        expectedWords: expectedWords,
        matchedWords: 0,
      };

      setEvaluatedText('');

      if (phase === 'word') {
        setWordResult(noSpeechResult);
      } else {
        setSentenceResult(noSpeechResult);
      }

      playErrorSound();
    }

    setHasResult(true);
  }, [phase, getExpectedText]);

  // Handle permission errors
  const handlePermissionError = useCallback(() => {
    setShowPermissionUI(true);
    setHasResult(false);
  }, []);

  // Handle transcription completion - when isProcessing goes from true to false
  useEffect(() => {
    if (prevIsProcessingRef.current && !isProcessing && !hasResult) {
      // Transcription just completed
      queueMicrotask(() => processRecordingResult(transcript));
    }
    prevIsProcessingRef.current = isProcessing;
  }, [isProcessing, transcript, hasResult, processRecordingResult]);

  // Handle errors
  useEffect(() => {
    if (error === 'not-allowed' || error === 'audio-capture') {
      queueMicrotask(() => handlePermissionError());
    } else if (error === 'transcription-failed' || error === 'no-speech' || error === 'non-english-detected') {
      // Handle transcription errors - including non-English detection
      queueMicrotask(() => processRecordingResult(''));
    }
  }, [error, handlePermissionError, processRecordingResult]);

  const handleStartRecording = useCallback(() => {
    resetTranscript();
    // Don't set quizState here - let the effect handle it when isListening becomes true
    startListening({
      maxDuration: 30000, // 30 seconds max
    });
  }, [resetTranscript, startListening]);

  const handleStopRecording = useCallback(() => {
    stopListening();
  }, [stopListening]);

  const handleRetryRecording = useCallback(() => {
    resetTranscript();
    setEvaluatedText('');
    if (phase === 'word') {
      setWordResult(null);
    } else {
      setSentenceResult(null);
    }
    setHasResult(false);
  }, [resetTranscript, phase]);

  const handleContinue = useCallback(() => {
    if (phase === 'word') {
      // Move to sentence phase
      resetTranscript();
      setEvaluatedText('');
      setPhase('sentence');
      setHasResult(false);
    } else {
      // Both phases complete - determine overall result
      const wordPassed = wordResult?.isPassing ?? false;
      const sentencePassed = sentenceResult?.isPassing ?? false;
      const overallPassed = wordPassed && sentencePassed;
      onComplete(overallPassed);
    }
  }, [phase, wordResult, sentenceResult, onComplete, resetTranscript]);

  const handleSkip = useCallback(() => {
    // Skip counts as not passing
    onComplete(false);
  }, [onComplete]);

  const handleRetryPermission = useCallback(() => {
    setShowPermissionUI(false);
    handleStartRecording();
  }, [handleStartRecording]);

  const handleListen = useCallback((slow: boolean = false) => {
    const text = getExpectedText();
    speak(text, slow);
  }, [speak, getExpectedText]);

  // isSupported is always true now (MediaRecorder is widely supported)
  // But keep the check for edge cases
  if (!isSupported) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Card className="rounded-2xl p-6 md:p-8">
          <CardContent className="text-center p-0">
            <p className="text-muted-foreground mb-4">
              Audio recording is not supported in your browser.
            </p>
            <Button variant="secondary" onClick={handleSkip}>
              Skip Pronunciation Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show permission UI
  if (showPermissionUI) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Card className="rounded-2xl p-6 md:p-8">
          <CardContent className="p-0">
            <MicrophonePermission
              error={error === 'not-allowed' || error === 'audio-capture' ? error : null}
              onRetry={handleRetryPermission}
              onSkip={handleSkip}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentResult = phase === 'word' ? wordResult : sentenceResult;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="rounded-2xl p-6 md:p-8">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Mic className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Pronunciation Quiz
              </h2>
              <p className="text-sm text-muted-foreground">
                {phase === 'word' ? 'Pronounce the vocabulary word' : 'Pronounce the sentence'}
              </p>
            </div>
          </div>

          {/* Phase indicator */}
          <div className="flex gap-2 mb-6">
            <div className={`flex-1 h-1 rounded-full ${phase === 'word' ? 'bg-primary' : 'bg-primary'
              }`} />
            <div className={`flex-1 h-1 rounded-full ${phase === 'sentence' ? 'bg-primary' : 'bg-muted'
              }`} />
          </div>

          {/* Text to pronounce */}
          <div className="mb-6 p-4 bg-secondary/50 dark:bg-secondary/20 rounded-xl border border-border">
            <p className="text-sm text-muted-foreground mb-2">
              {phase === 'word' ? 'Pronounce this word:' : 'Pronounce this sentence:'}
            </p>
            <p className="text-xl font-medium text-foreground mb-3">
              {phase === 'word' ? item.word : `"${exampleSentence.english}"`}
            </p>

            {/* Listen buttons and accent selector */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleListen(false)}
                disabled={isSpeaking}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              >
                <Volume2 className="size-4" />
                Listen
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleListen(true)}
                disabled={isSpeaking}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              >
                <Snail className="size-4" />
                Slow
              </Button>
              <div className="ml-auto flex rounded-md border border-border overflow-hidden">
                {(['AmE', 'BrE'] as Accent[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAccent(a)}
                    className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                      accent === a
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ready state - show record button */}
          {quizState === 'ready' && (
            <div className="flex flex-col items-center py-6">
              <RecordingButton
                isRecording={false}
                isDisabled={false}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                size="lg"
              />
              <p className="mt-4 text-sm text-muted-foreground">
                Tap to start recording
              </p>
            </div>
          )}

          {/* Recording state */}
          {quizState === 'recording' && (
            <div className="flex flex-col items-center py-6">
              {/* Recording indicator ring */}
              <div className="relative">
                <div className="absolute inset-0 -m-2 rounded-full bg-red-400/30 animate-ping pointer-events-none" />
                <div className="absolute inset-0 -m-1 rounded-full bg-red-400/50 animate-pulse pointer-events-none" />
                <RecordingButton
                  isRecording={true}
                  isDisabled={false}
                  onStartRecording={handleStartRecording}
                  onStopRecording={handleStopRecording}
                  size="lg"
                />
              </div>
              <p className="mt-4 text-sm text-red-500 dark:text-red-400 font-medium">
                Recording... Tap to stop
              </p>
            </div>
          )}

          {/* Processing state */}
          {quizState === 'processing' && (
            <div className="flex flex-col items-center py-6">
              <div className="size-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <div className="size-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="mt-4 text-sm text-amber-600 dark:text-amber-400 font-medium">
                Processing your pronunciation...
              </p>
            </div>
          )}

          {/* Result state */}
          {quizState === 'result' && currentResult && (
            <div className="space-y-4">
              {/* What was recognized */}
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">You said:</p>
                <p className="text-foreground">{evaluatedText || '(No speech detected)'}</p>
              </div>

              {/* Result indicator */}
              <div className={`flex items-center gap-3 p-3 rounded-xl ${currentResult.isPassing
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                {currentResult.isPassing ? (
                  <Check className="size-5 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="size-5 text-red-600 dark:text-red-400" />
                )}
                <div className="flex-1">
                  <span className={currentResult.isPassing
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-red-800 dark:text-red-300'
                  }>
                    {getPronunciationFeedback(currentResult)}
                  </span>
                </div>
                <span className={`text-lg font-bold ${currentResult.isPassing
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                  }`}>
                  {currentResult.overallScore}%
                </span>
              </div>

              {/* Retry and continue buttons */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={handleRetryRecording}
                  className="flex-1"
                >
                  <RotateCcw className="size-5" />
                  Try Again
                </Button>
                <Button
                  onClick={handleContinue}
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="size-5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
