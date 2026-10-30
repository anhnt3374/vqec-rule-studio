import type { Studio, StudioSlice } from "./types";
import type { CameraScene } from "@/models/types";
export const canEditScene = (s: Studio) =>
  !!s.scene &&
  !s.busy &&
  (s.sceneEditing || (s.editing && s.active?.type === "Custom"));
function change(s: Studio, scene: CameraScene): Partial<Studio> {
  if (s.sceneEditing) return { scene, sceneDirty: true };
  return {
    scene,
    active: s.active ? { ...s.active, status: "Unsaved" } : null,
    dirty: true,
  };
}
export const sceneEditor: StudioSlice<
  "addObject" | "updateObject" | "dependencies" | "deleteObject" | "background"
> = (set, get) => ({
  addObject(object) {
    const s = get();
    if (!canEditScene(s)) return;
    s.checkpoint();
    set({
      ...change(s, { ...s.scene!, objects: [...s.scene!.objects, object] }),
      selectedObject: object.id,
    });
  },
  updateObject(object) {
    const s = get();
    if (!canEditScene(s)) return;
    s.checkpoint();
    set(
      change(s, {
        ...s.scene!,
        objects: s.scene!.objects.map((o) => (o.id === object.id ? object : o)),
      }),
    );
  },
  dependencies(id) {
    const { rules, active, published } = get(),
      names = new Set<string>();
    for (const rule of [
      ...rules,
      ...published.map((p) => p.rule),
      ...(active ? [active] : []),
    ])
      if (rule.graph.nodes.some((n) => n.data.config.spatialId === id))
        names.add(rule.name);
    return [...names];
  },
  deleteObject(id) {
    const s = get();
    if (!canEditScene(s)) return;
    const deps = s.dependencies(id);
    if (deps.length) {
      set({
        error: `Cannot delete: referenced by ${deps.join(", ")}. Remove references from saved drafts and published snapshots first.`,
      });
      return;
    }
    s.checkpoint();
    set({
      ...change(s, {
        ...s.scene!,
        objects: s.scene!.objects.filter((o) => o.id !== id),
      }),
      selectedObject: null,
    });
  },
  background(url, ratio, type) {
    const s = get();
    if (!canEditScene(s)) return;
    s.checkpoint();
    set(
      change(s, {
        ...s.scene!,
        background: url,
        aspectRatio: ratio,
        mediaType: type,
      }),
    );
  },
});
