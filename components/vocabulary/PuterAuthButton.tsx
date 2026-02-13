"use client";

import { useCallback, useEffect, useState } from "react";
import { Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

declare global {
  interface Window {
    puterAuth?: {
      isElectron: boolean;
      login: () => Promise<string>;
    };
  }
}

const PUTER_TOKEN_KEY = "puter-auth-token";

export function PuterAuthButton() {
  const [isElectron, setIsElectron] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (window.puterAuth?.isElectron) {
      setIsElectron(true);
      setIsConnected(!!localStorage.getItem(PUTER_TOKEN_KEY));
    }
  }, []);

  const handleConnect = useCallback(async () => {
    if (!window.puterAuth) return;
    setIsLoading(true);
    try {
      const token = await window.puterAuth.login();
      if (token) {
        localStorage.setItem(PUTER_TOKEN_KEY, token);
        setIsConnected(true);
        // Reload to re-initialize hooks with the new token
        window.location.reload();
      }
    } catch (err) {
      console.error("Puter login failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem(PUTER_TOKEN_KEY);
    setIsConnected(false);
    window.location.reload();
  }, []);

  // Only render in Electron
  if (!isElectron) return null;

  if (isConnected) {
    return (
      <div className="flex items-center justify-center gap-2">
        <Badge variant="secondary" className="gap-1.5 py-1 px-3">
          <Volume2 className="size-3.5 text-green-600 dark:text-green-400" />
          <span className="text-xs">Puter HD Audio</span>
        </Badge>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleDisconnect}
          title="Disconnect Puter"
        >
          <X className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleConnect}
      disabled={isLoading}
      className="gap-1.5"
    >
      <Volume2 className="size-3.5" />
      {isLoading ? "Connecting..." : "Connect Puter HD Audio"}
    </Button>
  );
}
