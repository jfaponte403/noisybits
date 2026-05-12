import { useEffect } from "react";
import { usePipelineStore } from "../store/pipelineStore";

export function Toast() {
  const { toast, dismissToast } = usePipelineStore();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismissToast, toast.kind === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);

  if (!toast) return null;
  const cls = toast.kind === "error" ? "err" : "ok";

  return (
    <div className={"toast " + cls} role="status" onClick={dismissToast}>
      <span className="ic">{toast.kind === "error" ? "×" : "✓"}</span>
      <span>{toast.message}</span>
    </div>
  );
}
