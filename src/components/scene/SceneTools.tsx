import { useState } from "react";
import {
  MousePointer2,
  ArrowRightLeft,
  Scan,
  Layers,
  Save,
  X,
  Pencil,
} from "lucide-react";
import { useStudio } from "@/stores/studio";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { useSceneDrawing } from "@/hooks/useSceneDrawing";
export function SceneTools({
  drawing,
  objects,
  toggleObjects,
}: {
  drawing: ReturnType<typeof useSceneDrawing>;
  objects: boolean;
  toggleObjects: () => void;
}) {
  const s = useStudio(),
    [cancel, setCancel] = useState(false),
    locked = s.busy || (s.editing && s.active?.type === "System"),
    pendingZone = drawing.tool === "zone" && drawing.points.length > 0;
  return (
    <>
      <div className="scene-topbar">
        <div
          className="scene-tools"
          role="toolbar"
          aria-label="Scene drawing tools"
        >
          <Button
            size="sm"
            variant={drawing.tool === "select" ? "default" : "ghost"}
            aria-label="Select scene objects"
            title="Select an object; drag its line, fill or vertices to edit"
            onClick={() => drawing.choose("select")}
          >
            <MousePointer2 />
            Select
          </Button>
          <Button
            size="sm"
            disabled={locked}
            variant={drawing.tool === "gate" ? "default" : "ghost"}
            aria-label="Draw Gate"
            onClick={() => drawing.choose("gate")}
          >
            <ArrowRightLeft />
            Draw Gate
          </Button>
          <Button
            size="sm"
            disabled={locked}
            variant={drawing.tool === "zone" ? "default" : "ghost"}
            aria-label="Draw Zone"
            onClick={() => drawing.choose("zone")}
          >
            <Scan />
            Draw Zone
          </Button>
        </div>
        {pendingZone && (
          <div className="zone-draft-controls">
            <span>{drawing.points.length} vertices</span>
            <Button
              size="sm"
              disabled={drawing.points.length < 3}
              onClick={drawing.complete}
            >
              Finish zone
            </Button>
            <Button size="sm" variant="ghost" onClick={drawing.clear}>
              Clear outline
            </Button>
          </div>
        )}
        <div className="scene-tool-status">
          <span>
            {drawing.editable
              ? "Editing scene"
              : "Select a shape to edit, or draw a new one"}
          </span>
          <Button
            size="sm"
            variant="outline"
            aria-pressed={objects}
            onClick={toggleObjects}
          >
            <Layers />
            Objects <span>{s.scene?.objects.length}</span>
          </Button>
        </div>
      </div>
      {s.sceneEditing ? (
        <div className="scene-savebar">
          <span>
            <Pencil size={13} />
            {s.sceneDirty ? "Scene · unsaved changes" : "Editing shared scene"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={s.busy}
            onClick={() => (s.sceneDirty ? setCancel(true) : s.cancelScene())}
          >
            <X />
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={s.busy || pendingZone}
            title={pendingZone ? "Finish the zone before saving" : undefined}
            onClick={() => void s.saveScene()}
          >
            <Save />
            Save scene
          </Button>
        </div>
      ) : s.editing && s.active?.type === "Custom" ? (
        <div className="scene-savebar">
          <span>Scene changes are saved with this rule</span>
          <Button
            size="sm"
            disabled={s.busy || pendingZone}
            title={pendingZone ? "Finish the zone before saving" : undefined}
            onClick={() => void s.save(false, true)}
          >
            <Save />
            Save with rule
          </Button>
        </div>
      ) : null}
      <Dialog
        open={cancel}
        onOpenChange={setCancel}
        title="Discard scene changes?"
        description="Return gates, zones and the background to the last saved scene. Rules and published snapshots stay saved."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCancel(false)}>
            Keep editing
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              s.cancelScene();
              drawing.clear();
              setCancel(false);
            }}
          >
            Discard scene
          </Button>
        </div>
      </Dialog>
    </>
  );
}
