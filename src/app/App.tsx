import { useEffect } from "react";
import { CheckCircle2, AlertCircle, X, LoaderCircle } from "lucide-react";
import { useStudio } from "@/stores/studio";
import { Workspace } from "@/components/layout/Workspace";
import { Button } from "@/components/ui/button";
export function App() {
  const ready = useStudio((s) => s.ready),
    error = useStudio((s) => s.error),
    notice = useStudio((s) => s.notice),
    dirty = useStudio((s) => s.dirty || s.sceneDirty);
  useEffect(() => {
    void useStudio.getState().init().then(()=>{
      const state=useStudio.getState();
      const rule=state.rules.find(r=>r.type==="System");
      if(rule) state.open(rule.id);
    });
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => useStudio.setState({ notice: "" }), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!dirty) return;
    const listener = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  return (
    <>
      {ready ? (
        <Workspace />
      ) : (
        <div className="loading">
          <LoaderCircle className="animate-spin" />
          Opening local workspace…
        </div>
      )}
      {(error || notice) && (
        <div
          role={error ? "alert" : "status"}
          className={`toast ${error ? "error" : ""}`}
        >
          {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <div>
            <strong>
              {error ? "Check your configuration" : "Workspace updated"}
            </strong>
            <p>{error || notice}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss notification"
            onClick={() => useStudio.setState({ error: "", notice: "" })}
          >
            <X />
          </Button>
        </div>
      )}
    </>
  );
}
