import type { StudioSlice } from "./types";
import { persistScene } from "@/features/persistence/database";
export const sceneSession: StudioSlice<
  "beginScene" | "saveScene" | "cancelScene"
> = (set, get) => ({
  beginScene() {
    const s = get();
    if (s.busy || !s.scene) return false;
    if (s.editing) {
      if (s.active?.type === "Custom") return true;
      s.notify(
        "Finish editing the system rule before editing the shared scene.",
      );
      return false;
    }
    if (!s.sceneEditing)
      set({ sceneEditing: true, sceneDirty: false, sceneBaseline: s.scene });
    return true;
  },
  async saveScene() {
    const { scene, sceneEditing, busy } = get();
    if (!scene || !sceneEditing || busy) return;
    set({ busy: true, error: "" });
    try {
      await persistScene(scene);
      set({
        busy: false,
        sceneEditing: false,
        sceneDirty: false,
        sceneBaseline: null,
        notice:
          "Scene saved. Shared gates and zones are available to every rule.",
      });
    } catch {
      set({
        busy: false,
        error: "Could not save the scene. Your edits are still available.",
      });
    }
  },
  cancelScene() {
    const { sceneBaseline, busy } = get();
    if (busy || !sceneBaseline) return;
    set({
      scene: sceneBaseline,
      sceneEditing: false,
      sceneDirty: false,
      sceneBaseline: null,
      selectedObject: null,
    });
  },
});
