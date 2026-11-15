import { LoadingView } from "@/components/AsyncView";
import { RecordShell } from "@/components/RecordShell";

/** Shown in the record's place while the session loads after it's opened from History. */
export default function HistoryDetailLoading() {
  return (
    <RecordShell>
      <LoadingView label="Opening your reflection…" />
    </RecordShell>
  );
}
