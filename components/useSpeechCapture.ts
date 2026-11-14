"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Recording } from "@/domain/types";
import { services } from "@/services";

type CaptureStatus = "idle" | "starting" | "running" | "stopping";

export interface SpeechCaptureControls {
  start: () => Promise<void>;
  stop: () => Promise<Recording>;
  /** Whether capture is currently running (started and not yet stopped). */
  isRunning: () => boolean;
}

/**
 * Wraps `SpeechCapture` for a component. If the component unmounts while
 * capture is running (Quit, browser back), capture is stopped and the
 * Recording discarded, since Sessions are not saved.
 */
export function useSpeechCapture(): SpeechCaptureControls {
  const status = useRef<CaptureStatus>("idle");
  const pendingStart = useRef<Promise<void> | null>(null);

  const start = useCallback(async () => {
    status.current = "starting";
    const starting = services.speechCapture.start();
    pendingStart.current = starting;
    try {
      await starting;
      status.current = "running";
    } catch (error) {
      status.current = "idle";
      throw error;
    } finally {
      pendingStart.current = null;
    }
  }, []);

  const stop = useCallback(async () => {
    status.current = "stopping";
    try {
      const recording = await services.speechCapture.stop();
      status.current = "idle";
      return recording;
    } catch (error) {
      status.current = "running";
      throw error;
    }
  }, []);

  const isRunning = useCallback(() => status.current === "running", []);

  useEffect(() => {
    return () => {
      const discard = () => services.speechCapture.stop().then(() => undefined);
      if (status.current === "running") {
        discard().catch(() => {});
      } else if (status.current === "starting") {
        pendingStart.current?.then(discard).catch(() => {});
      }
    };
  }, []);

  return { start, stop, isRunning };
}
