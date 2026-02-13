"use client";

import { useCallback, useEffect, useState } from "react";
import type { Accent } from "@/lib/vocabulary/utils";

const STORAGE_KEY = "bloom-english-accent";

interface UseAccentPreferenceReturn {
  accent: Accent;
  setAccent: (accent: Accent) => void;
  isLoaded: boolean;
}

export function useAccentPreference(): UseAccentPreferenceReturn {
  const [accent, setAccentState] = useState<Accent>("AmE");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/preferences");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && (data.accent === "AmE" || data.accent === "BrE")) {
            setAccentState(data.accent);
            localStorage.setItem(STORAGE_KEY, data.accent);
            setIsLoaded(true);
            return;
          }
        }
      } catch {
        // API unavailable, fall through to localStorage
      }

      if (!cancelled) {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored === "BrE" || stored === "AmE") {
            setAccentState(stored);
          }
        } catch {
          // localStorage unavailable
        }
        setIsLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const setAccent = useCallback((newAccent: Accent) => {
    setAccentState(newAccent);
    try {
      localStorage.setItem(STORAGE_KEY, newAccent);
    } catch {
      // localStorage unavailable
    }
    fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accent: newAccent }),
    }).catch(() => {
      // API save failed silently
    });
  }, []);

  return { accent, setAccent, isLoaded };
}
