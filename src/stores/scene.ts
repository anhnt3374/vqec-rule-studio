import type { StudioSlice } from "./types";
export const sceneEditor: StudioSlice<
  "addObject" | "updateObject" | "dependencies" | "deleteObject" | "background"
> = (set, get) => ({
  addObject(object) {
    const { scene, active, editing, busy } = get();
    if (!scene || !active || !editing || busy || active.type === "System")
      return;
    get().checkpoint();
    set({
      scene: { ...scene, objects: [...scene.objects, object] },
      active: { ...active, status: "Unsaved" },
      dirty: true,
      selectedObject: object.id,
    });
  },
  updateObject(object) {
    const { scene, active, editing, busy } = get();
    if (!scene || !active || !editing || busy || active.type === "System")
      return;
    get().checkpoint();
    set({
      scene: {
        ...scene,
        objects: scene.objects.map((o) => (o.id === object.id ? object : o)),
      },
      active: { ...active, status: "Unsaved" },
      dirty: true,
    });
  },
  dependencies(id) {
    const { rules, active, published } = get();
    const names = new Set<string>();
    for (const rule of [
      ...rules,
      ...published.map((p) => p.rule),
      ...(active ? [active] : []),
    ]) {
      if (rule.graph.nodes.some((n) => n.data.config.spatialId === id))
        names.add(rule.name);
    }
    return [...names];
  },
  deleteObject(id) {
    const { scene, active, editing, busy } = get();
    if (!scene || !active || !editing || busy || active.type === "System")
      return;
    const deps = get().dependencies(id);
    if (deps.length) {
      set({
        error: `Cannot delete: referenced by ${deps.join(", ")}. Remove references from saved drafts and published snapshots first.`,
      });
      return;
    }
    get().checkpoint();
    set({
      scene: { ...scene, objects: scene.objects.filter((o) => o.id !== id) },
      active: { ...active, status: "Unsaved" },
      dirty: true,
      selectedObject: null,
    });
  },
  background(url, ratio, type) {
    const { scene, active, editing, busy } = get();
    if (!scene || !active || !editing || busy || active.type === "System")
      return;
    get().checkpoint();
    set({
      scene: { ...scene, background: url, aspectRatio: ratio, mediaType: type },
      active: { ...active, status: "Unsaved" },
      dirty: true,
    });
  },
});
