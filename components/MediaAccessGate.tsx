"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ErrorView } from "@/components/AsyncView";

type Access = "checking" | "granted" | "denied";

const REQUIRED_MESSAGE =
  "Microphone and camera access is required to use Rhetor. Allow both for this site in your browser's settings, then try again.";

/**
 * Asks for the microphone and camera, and only shows its children while both are allowed.
 * Any change to either permission in the browser's site settings is checked again at once,
 * so revoking one mid-Session closes the gate and allowing both opens it.
 */
export function MediaAccessGate({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<Access>("checking");
  // Only the latest check may settle the gate, however the checks' answers arrive.
  const latestCheck = useRef(0);

  const check = useCallback(async () => {
    const id = ++latestCheck.current;
    const granted = await requestMediaAccess();
    if (id === latestCheck.current) setAccess(granted ? "granted" : "denied");
  }, []);

  useEffect(() => {
    void check();
    const unwatch = watchPermissionChanges(() => void check());
    return () => {
      // A check still in flight after unmount must not settle anything.
      latestCheck.current += 1;
      unwatch();
    };
  }, [check]);

  if (access === "checking") return null;
  if (access === "denied") return <ErrorView message={REQUIRED_MESSAGE} onRetry={() => void check()} />;
  return <>{children}</>;
}

/** Prompts for both devices, releasing them straight away; capture opens its own streams later. */
async function requestMediaAccess(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

/** Calls `onChange` whenever the microphone or camera permission changes, either way. Returns a cleanup. */
function watchPermissionChanges(onChange: () => void): () => void {
  const statuses: PermissionStatus[] = [];
  let stopped = false;
  const handleChange = () => onChange();

  for (const name of ["microphone", "camera"] as PermissionName[]) {
    // Not every browser can query these names; there the gate only checks on entry and on "Try again".
    navigator.permissions
      ?.query({ name })
      .then((status) => {
        if (stopped) return;
        status.addEventListener("change", handleChange);
        statuses.push(status);
      })
      .catch(() => {});
  }

  return () => {
    stopped = true;
    statuses.forEach((status) => status.removeEventListener("change", handleChange));
  };
}
