/** Stands in for the camera feed. SpeechCapture owns all real capture. */
export function CameraPlaceholder({ live = false }: { live?: boolean }) {
  return (
    <div className="relative flex aspect-video w-full items-end bg-field p-4">
      <span className="text-lg text-mute">Camera feed</span>
      {live && (
        <span className="absolute left-4 top-4 flex items-center gap-2 font-bold">
          <span aria-hidden className="live-mark" />
          Listening
        </span>
      )}
    </div>
  );
}
