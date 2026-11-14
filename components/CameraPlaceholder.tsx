/** Stands in for the camera feed. SpeechCapture owns all real capture. */
export function CameraPlaceholder({ live = false }: { live?: boolean }) {
  return (
    <div className="relative flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-100 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500">
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-12">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
        />
      </svg>
      <span className="font-medium">Camera feed</span>
      {live && (
        <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm dark:bg-neutral-800/90 dark:text-neutral-200">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-indigo-500" />
          Listening
        </span>
      )}
    </div>
  );
}
