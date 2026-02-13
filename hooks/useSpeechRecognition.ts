"use client";

import { useCallback, useRef, useState } from "react";

export type SpeechRecognitionError =
  | "not-allowed"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "not-supported"
  | "transcription-failed"
  | "non-english-detected"
  | "unknown";

interface ListeningOptions {
  maxDuration?: number; // Max recording time in ms (default: 30000)
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  transcript: string;
  error: SpeechRecognitionError | null;
  startListening: (options?: ListeningOptions) => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

const PUTER_TOKEN_KEY = "puter-auth-token";

interface PuterAI {
  speech2txt: (
    audio: Blob,
    options?: { model?: string; language?: string }
  ) => Promise<string | { text?: string }>;
}

interface Puter {
  ai: PuterAI;
  setAuthToken: (token: string) => void;
}

function getPuterToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PUTER_TOKEN_KEY);
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Detect if text contains non-English characters (CJK, Cyrillic, Arabic, etc.)
 */
function containsNonEnglishCharacters(text: string): boolean {
  const cjkPattern = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;
  const cyrillicPattern = /[\u0400-\u04ff]/;
  const arabicPattern = /[\u0600-\u06ff]/;
  const thaiPattern = /[\u0e00-\u0e7f]/;
  const devanagariPattern = /[\u0900-\u097f]/;

  return (
    cjkPattern.test(text) ||
    cyrillicPattern.test(text) ||
    arabicPattern.test(text) ||
    thaiPattern.test(text) ||
    devanagariPattern.test(text)
  );
}

/**
 * Remove non-English characters from text, keeping only ASCII and common punctuation
 */
function filterToEnglishOnly(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<SpeechRecognitionError | null>(null);

  // Web Speech Recognition refs
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Puter.js / MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const puterRef = useRef<Puter | null>(null);
  const isStartingRef = useRef(false);
  const pendingStopRef = useRef(false);

  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hasPuterToken = typeof window !== "undefined" && getPuterToken() !== null;
  const hasWebSpeech = typeof window !== "undefined" && getSpeechRecognition() !== null;
  const isSupported = hasPuterToken || hasWebSpeech;

  // Load Puter.js on first use
  const loadPuter = async (): Promise<Puter> => {
    if (!puterRef.current) {
      const puterModule = await import("@heyputer/puter.js");
      const puter = puterModule.default as unknown as Puter;
      const token = getPuterToken();
      if (token) {
        puter.setAuthToken(token);
      }
      puterRef.current = puter;
    }
    return puterRef.current;
  };

  // Process audio with Puter.js speech2txt
  const processAudioWithPuter = useCallback(async (mimeType: string) => {
    setIsListening(false);
    setIsProcessing(true);
    isStartingRef.current = false;
    pendingStopRef.current = false;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    audioChunksRef.current = [];

    if (audioBlob.size === 0) {
      setError("no-speech");
      setIsProcessing(false);
      return;
    }

    try {
      const puter = await loadPuter();
      const result = await puter.ai.speech2txt(audioBlob, {
        language: "en",
      });
      let text = typeof result === "string" ? result : result.text || "";
      text = text.trim();

      const hadNonEnglish = containsNonEnglishCharacters(text);
      if (hadNonEnglish) {
        text = filterToEnglishOnly(text);
      }

      if (!text || text.length < 2) {
        setError(hadNonEnglish ? "non-english-detected" : "no-speech");
      } else {
        setTranscript(text);
      }
    } catch (err) {
      console.error("Puter.js transcription error:", err);
      setError("transcription-failed");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Start listening with Puter.js (MediaRecorder + speech2txt)
  const startPuterListening = useCallback(
    async (options: ListeningOptions = {}) => {
      if (isStartingRef.current || isListening || isProcessing) return;

      isStartingRef.current = true;
      pendingStopRef.current = false;
      setError(null);
      setTranscript("");
      audioChunksRef.current = [];

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        if (pendingStopRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          isStartingRef.current = false;
          pendingStopRef.current = false;
          return;
        }

        streamRef.current = stream;

        const mimeType = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "audio/wav";

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (maxDurationTimeoutRef.current) {
            clearTimeout(maxDurationTimeoutRef.current);
            maxDurationTimeoutRef.current = null;
          }
          mediaRecorderRef.current = null;
          processAudioWithPuter(mimeType);
        };

        mediaRecorder.start(100);
        setIsListening(true);
        isStartingRef.current = false;

        if (pendingStopRef.current) {
          mediaRecorder.stop();
          return;
        }

        const maxDuration = options.maxDuration ?? 30000;
        maxDurationTimeoutRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        }, maxDuration);
      } catch (err) {
        isStartingRef.current = false;
        pendingStopRef.current = false;
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError") setError("not-allowed");
          else if (err.name === "NotFoundError") setError("audio-capture");
          else setError("unknown");
        } else {
          setError("unknown");
        }
      }
    },
    [isListening, isProcessing, processAudioWithPuter]
  );

  // Start listening with Web Speech Recognition
  const startWebSpeechListening = useCallback(
    async (options: ListeningOptions = {}) => {
      if (isListening || isProcessing) return;

      const SpeechRecognitionClass = getSpeechRecognition();
      if (!SpeechRecognitionClass) {
        setError("not-supported");
        return;
      }

      setError(null);
      setTranscript("");

      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: { results: { transcript: string }[][] }) => {
        const text = event.results[0][0].transcript.trim();
        if (text) {
          setTranscript(text);
        } else {
          setError("no-speech");
        }
      };

      recognition.onerror = (event: { error: string }) => {
        setIsListening(false);
        setIsProcessing(false);
        switch (event.error) {
          case "not-allowed":
            setError("not-allowed");
            break;
          case "no-speech":
            setError("no-speech");
            break;
          case "audio-capture":
            setError("audio-capture");
            break;
          case "network":
            setError("network");
            break;
          default:
            setError("unknown");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setIsProcessing(false);
        recognitionRef.current = null;
        if (maxDurationTimeoutRef.current) {
          clearTimeout(maxDurationTimeoutRef.current);
          maxDurationTimeoutRef.current = null;
        }
      };

      try {
        recognition.start();
        setIsProcessing(true);

        const maxDuration = options.maxDuration ?? 30000;
        maxDurationTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, maxDuration);
      } catch {
        setError("unknown");
      }
    },
    [isListening, isProcessing]
  );

  const stopListening = useCallback(() => {
    pendingStopRef.current = true;

    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }

    // Stop MediaRecorder (Puter path)
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    // Stop Web Speech Recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const startListening = useCallback(
    (options: ListeningOptions = {}) => {
      // Use Puter.js if token is available, otherwise fall back to Web Speech
      if (getPuterToken()) {
        startPuterListening(options);
      } else {
        startWebSpeechListening(options);
      }
    },
    [startPuterListening, startWebSpeechListening]
  );

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  return {
    isListening,
    isProcessing,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
