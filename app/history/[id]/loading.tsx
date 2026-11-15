import { LoadingHold } from "@/components/LoadingScreen";
import { RecordShell } from "@/components/RecordShell";

/** Holds the loading screen while the session loads after it's opened from History. */
export default function HistoryDetailLoading() {
  return (
    <RecordShell>
      <LoadingHold label="Opening your reflection…" />
    </RecordShell>
  );
}
