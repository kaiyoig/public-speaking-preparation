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

/** The Host as type: its state line, the red live mark while it speaks, and its caption. */
export function Host({ caption, isSpeaking, placeholder = "…" }: HostProps) {
  return (
    <section aria-label="Host" className="rule-top">
      <p className="flex items-center gap-3 text-lg font-bold">
        Host
        <span className={`flex items-center gap-2 font-normal ${isSpeaking ? "text-ink" : "text-mute"}`}>
          <span className="sr-only">is</span>
          {isSpeaking && <span aria-hidden className="live-mark" />}
          {isSpeaking ? "Speaking" : "Listening"}
        </span>
      </p>
      <p aria-live="polite" className="mt-3 text-xl leading-snug">
        {caption || placeholder}
      </p>
    </section>
  );
}
