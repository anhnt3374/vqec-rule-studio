import { useState } from "react";
import {
  ArrowRightLeft,
  Scan,
  Eye,
  EyeOff,
  Trash2,
  Repeat2,
  Plus,
  X,
  GripVertical,
} from "lucide-react";
import { useStudio } from "@/stores/studio";
import { Button } from "@/components/ui/button";
import { SPATIAL_MIME } from "@/data/operators";
import { Dialog } from "@/components/ui/dialog";
export function SceneObjects({
  close,
  editable,
}: {
  close: () => void;
  editable: boolean;
}) {
  const s = useStudio(),
    [renaming, setRenaming] = useState<string | null>(null),
    [name, setName] = useState(""),
    [deleting, setDeleting] = useState<string | null>(null);
  const object = s.scene?.objects.find((o) => o.id === s.selectedObject),
    linked =
      s.active?.graph.nodes.filter(
        (n) => n.data.config.spatialId === object?.id,
      ) ?? [];
  const dependencies = deleting ? s.dependencies(deleting) : [];
  return (
    <section className="scene-objects">
      <header>
        <h3>
          Scene objects <span>{s.scene?.objects.length}</span>
        </h3>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Close scene objects"
          onClick={close}
        >
          <X />
        </Button>
      </header>
      <div className="objects-list">
        {s.scene?.objects.map((o) => (
          <div
            key={o.id}
            className={`object-row ${o.id === s.selectedObject ? "selected" : ""}`}
            draggable={editable}
            onDragStart={(e) => {
              e.dataTransfer.setData(SPATIAL_MIME, o.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
          >
            <button
              className="object-main"
              onClick={() => s.selectObject(o.id)}
            >
              <GripVertical size={13} />
              {o.geometry.kind === "gate" ? (
                <ArrowRightLeft size={15} />
              ) : (
                <Scan size={15} />
              )}
              <span>{o.name}</span>
            </button>
            <Button
              size="icon"
              variant="ghost"
              disabled={!editable}
              aria-label={`Toggle ${o.name}`}
              onClick={() => s.updateObject({ ...o, visible: !o.visible })}
            >
              {o.visible ? <Eye /> : <EyeOff />}
            </Button>
          </div>
        ))}
        {!s.scene?.objects.length && (
          <p className="p-4 text-xs text-slate-400">
            Draw a gate or zone to get started.
          </p>
        )}
      </div>
      {object && (
        <div className="object-details">
          <div className="flex items-center justify-between">
            <strong>{object.name}</strong>
            <span className="eyebrow">
              {object.geometry.kind.toUpperCase()}
            </span>
          </div>
          <p>
            {linked.length
              ? `${linked.length} operator reference(s) in this rule`
              : "Unassigned scene object"}{" "}
            · normalized coordinates
          </p>
          <div className="flex gap-1 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={!editable}
              onClick={() => {
                setName(object.name);
                setRenaming(object.id);
              }}
            >
              Rename
            </Button>
            {object.geometry.kind === "gate" && (
              <Button
                variant="outline"
                size="sm"
                disabled={!editable}
                onClick={() => {
                  if (object.geometry.kind === "gate")
                    s.updateObject({
                      ...object,
                      geometry: {
                        ...object.geometry,
                        positive: object.geometry.positive === 1 ? -1 : 1,
                      },
                    });
                }}
              >
                <Repeat2 />
                Reverse
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={!editable}
              aria-label="Delete selected spatial object"
              onClick={() => setDeleting(object.id)}
            >
              <Trash2 />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!editable}
              onClick={() => s.spatialDrop(object.id, { x: 120, y: 120 })}
            >
              <Plus />
              To graph
            </Button>
          </div>
        </div>
      )}
      <footer>Drag any object into the graph. Geometry stays shared.</footer>
      <Dialog
        open={!!renaming}
        onOpenChange={() => setRenaming(null)}
        title="Rename spatial object"
        description="The name is shared across all rule references."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const o = s.scene?.objects.find((o) => o.id === renaming);
            if (o) s.updateObject({ ...o, name: name.trim() });
            setRenaming(null);
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
          <Button type="submit" className="mt-4">
            Apply name
          </Button>
        </form>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title={
          dependencies.length
            ? "This object is referenced"
            : "Delete spatial object?"
        }
        description={
          dependencies.length
            ? `Referenced by: ${dependencies.join(", ")}. Remove references from all saved drafts and published snapshots before deleting.`
            : "This removes the shared spatial definition when you save the draft."
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            {dependencies.length ? "Keep object" : "Cancel"}
          </Button>
          {!dependencies.length && (
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting) s.deleteObject(deleting);
                setDeleting(null);
              }}
            >
              Delete object
            </Button>
          )}
        </div>
      </Dialog>
    </section>
  );
}
