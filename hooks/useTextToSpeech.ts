"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Accent } from "@/lib/vocabulary/utils";

interface UseTextToSpeechReturn {
  speak: (text: string, slow?: boolean) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

const PUTER_TOKEN_KEY = "puter-auth-token";

function checkWebSpeechSupport(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function getPuterToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PUTER_TOKEN_KEY);
}

// Fallback to Web Speech API
function fallbackSpeak(
  text: string,
  slow: boolean,
  setIsSpeaking: (value: boolean) => void,
  accent: Accent = "AmE"
): void {
  if (!checkWebSpeechSupport()) return;

  window.speechSynthesis.cancel();

  const lang = accent === "BrE" ? "en-GB" : "en-US";

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = slow ? 0.5 : 1;
  utterance.lang = lang;

  const voices = window.speechSynthesis.getVoices();
  const englishVoice =
    voices.find((voice) => voice.lang === lang) ||
    voices.find((voice) => voice.lang.startsWith("en"));

  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  utterance.onstart = () => setIsSpeaking(true);
  utterance.onend = () => setIsSpeaking(false);
  utterance.onerror = () => setIsSpeaking(false);

  window.speechSynthesis.speak(utterance);
}

export function useTextToSpeech(accent: Accent = "AmE"): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const puterRef = useRef<typeof import("@heyputer/puter.js").default | null>(null);

  // Load puter.js if we have a token
  useEffect(() => {
    const token = getPuterToken();
    if (token) {
      setIsSupported(true);
      import("@heyputer/puter.js")
        .then((puterModule) => {
          const puter = puterModule.default;
          puter.setAuthToken(token);
          puterRef.current = puter;
        })
        .catch((err) => {
          console.error("Failed to load puter.js:", err);
          setIsSupported(checkWebSpeechSupport());
        });
    } else {
      setIsSupported(checkWebSpeechSupport());
    }
  }, []);

  const speak = useCallback(
    async (text: string, slow: boolean = false) => {
      // Cancel any current speech
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }
      if (checkWebSpeechSupport()) {
        window.speechSynthesis.cancel();
      }

      // Try Puter.js if we have a token and it's loaded
      const token = getPuterToken();
      if (token && puterRef.current) {
        setIsSpeaking(true);
        try {
          const puter = puterRef.current;
          if (!puter.ai?.txt2speech) {
            throw new Error("Puter.js txt2speech not available");
          }

          const voice = accent === "BrE" ? "Amy" : "Joanna";
          const language = accent === "BrE" ? "en-GB" : "en-US";

          const audio = await puter.ai.txt2speech(text, {
            voice,
            engine: "neural",
            language,
          });

          currentAudioRef.current = audio;

          if (slow) {
            audio.playbackRate = 0.7;
          }

          audio.onended = () => {
            setIsSpeaking(false);
            currentAudioRef.current = null;
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            currentAudioRef.current = null;
          };

          await audio.play();
          return;
        } catch (error) {
          console.error("Puter.js TTS error, falling back to Web Speech:", error);
          setIsSpeaking(false);
        }
      }

      // Fallback to Web Speech API
      fallbackSpeak(text, slow, setIsSpeaking, accent);
    },
    [accent]
  );

  const cancel = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (checkWebSpeechSupport()) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return { speak, cancel, isSpeaking, isSupported };
}
