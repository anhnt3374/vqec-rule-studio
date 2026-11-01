import { RuntimePanel } from "./RuntimePanel";
import { useState } from "react";
import {
  Pencil,
  Undo2,
  Redo2,
  LockKeyhole,
  GitBranch,
  Check,
  Save,
  Upload,
  X,
  Info,
} from "lucide-react";
import { useStudio } from "@/stores/studio";
import { Button } from "@/components/ui/button";
import { Status } from "@/components/rules/Status";
import { Dialog } from "@/components/ui/dialog";
export function GraphToolbar() {
  const s = useStudio(),
    [cancel, setCancel] = useState(false),
    [info, setInfo] = useState(false),
    [details, setDetails] = useState(false),
    [name, setName] = useState(""),
    [description, setDescription] = useState("");
  const active = s.active;
  return (
    <>
      <header className="panel-header graph-header">
        <div className="graph-heading">
          <GitBranch size={19} />
          <div>
            <span className="eyebrow">RULE GRAPH</span>
            <h2>{active?.name ?? "Your next workflow"}</h2>
          </div>
        </div>
        {active && (
          <>
            <Status status={active.status} />
            <span className={`mode-badge ${s.editing ? "edit" : ""}`}>
              {s.editing ? "EDIT" : "VIEW"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Snapshot information"
              onClick={() => setInfo(true)}
            >
              <Info />
            </Button>
          </>
        )}
      </header>
      <RuntimePanel />
      <div className="graph-toolbar">
        <div className="flex items-center gap-1">
          {active?.type === "System" ? (
            <span className="locked-label">
              <LockKeyhole size={13} /> Structure locked
            </span>
          ) : (
            <span className="canvas-label">
              <span />
              Visual editor
            </span>
          )}
          {s.editing && (
            <>
              <span className="toolbar-divider" />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Undo"
                title="Undo · Ctrl+Z"
                disabled={!s.past.length || s.busy}
                onClick={s.undo}
              >
                <Undo2 />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Redo"
                title="Redo · Ctrl+Shift+Z"
                disabled={!s.future.length || s.busy}
                onClick={s.redo}
              >
                <Redo2 />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {active &&
            (s.editing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={s.busy}
                  onClick={() => (s.dirty ? setCancel(true) : s.cancel())}
                >
                  <X />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={s.busy}
                  onClick={() => void s.save(false, false)}
                >
                  <Save />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={s.busy}
                  onClick={() => void s.save(false, true)}
                >
                  Save Draft
                </Button>
                <Button
                  size="sm"
                  disabled={s.busy}
                  onClick={() => void s.save(true, false)}
                >
                  <Upload />
                  Publish
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={active.type === "System"}
                  onClick={() => {
                    setName(active.name);
                    setDescription(active.description);
                    setDetails(true);
                  }}
                >
                  Details
                </Button>
                <Button size="sm" onClick={s.edit}>
                  <Pencil />
                  Edit rule
                </Button>
              </>
            ))}
        </div>
      </div>
      <Dialog
        open={cancel}
        onOpenChange={setCancel}
        title="Discard editing session?"
        description="Discard unsaved graph and scene changes since the last save. Published snapshots are kept."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCancel(false)}>
            Keep editing
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              s.cancel();
              setCancel(false);
            }}
          >
            Discard changes
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={info}
        onOpenChange={setInfo}
        title="Local versions"
        description="Working copy, saved draft and published snapshot are separate records."
      >
        <div className="version-details">
          <p>
            Working copy <Status status={active?.status ?? "Unsaved"} />
          </p>
          <p>
            Saved draft{" "}
            <span>
              {s.rules.find((r) => r.id === active?.id)
                ? "Stored in IndexedDB"
                : "Not saved"}
            </span>
          </p>
          <p>
            Published snapshot{" "}
            <span>
              {s.published.find((p) => p.ruleId === active?.id)
                ? `v${s.published.find((p) => p.ruleId === active?.id)!.rule.version}`
                : "Not published"}
            </span>
          </p>
          <p className="text-slate-500 text-xs">
            Publish activates the supported attendance graph on the device. Local drafts do not change the active rule.
          </p>
        </div>
      </Dialog>
      <Dialog
        open={details}
        onOpenChange={setDetails}
        title="Rule details"
        description="Editing details starts a working copy. Save the rule to keep your changes."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            s.edit();
            s.rename(name, description);
            setDetails(false);
          }}
        >
          <label className="field">
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field mt-3">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <Button type="submit" className="mt-4">
            <Check />
            Apply details
          </Button>
        </form>
      </Dialog>
    </>
  );
}
