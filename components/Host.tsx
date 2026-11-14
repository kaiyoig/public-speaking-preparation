"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { services } from "@/services";

export interface HostVoice {
  /** The line currently (or most recently) spoken by the Host. */
  caption: string;
  isSpeaking: boolean;
  /** Has the Host speak a line. Resolves when the Host finishes speaking. */
  say: (text: string) => Promise<void>;
}

/** Wraps `HostBrain.speak`. Every Host line goes through `say`. */
export function useHost(): HostVoice {
  const [caption, setCaption] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Only the most recent line may return the Host to idle.
  const latestLine = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const say = useCallback(async (text: string) => {
    const line = ++latestLine.current;
    setCaption(text);
    setIsSpeaking(true);
    try {
      await services.hostBrain.speak(text);
    } finally {
      if (mounted.current && line === latestLine.current) setIsSpeaking(false);
    }
  }, []);

  return { caption, isSpeaking, say };
}

interface HostProps {
  caption: string;
  isSpeaking: boolean;
  /** Shown when the Host has nothing to say yet. */
  placeholder?: string;
}

/** The Host's avatar placeholder, speaking indicator and caption. */
export function Host({ caption, isSpeaking, placeholder = "…" }: HostProps) {
  return (
    <section aria-label="Host" className="card flex items-start gap-4">
      <div className="relative shrink-0">
        {isSpeaking && (
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-indigo-400/50 dark:bg-indigo-400/40"
          />
        )}
        <div
          className={`relative flex size-14 items-center justify-center rounded-full text-lg font-semibold text-white transition-colors ${
            isSpeaking ? "bg-indigo-600 dark:bg-indigo-500" : "bg-neutral-400 dark:bg-neutral-600"
          }`}
        >
          <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="size-7">
            <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.42 0-8 2.24-8 5v1.5h16V19c0-2.76-3.58-5-8-5Z" />
          </svg>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Host <span className="sr-only">is</span>
          <span className="ml-1 text-xs font-normal">{isSpeaking ? "speaking…" : "listening"}</span>
        </p>
        <p
          aria-live="polite"
          className={`mt-1 text-lg leading-snug ${
            isSpeaking ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-600 dark:text-neutral-400"
          }`}
        >
          {caption || placeholder}
        </p>
      </div>
    </section>
  );
}
