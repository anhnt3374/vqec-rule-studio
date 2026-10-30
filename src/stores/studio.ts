import { create } from "zustand";
import type { Studio } from "./types";
import { lifecycle } from "./lifecycle";
import { graphEditor } from "./graph";
import { sceneSession } from "./scene-session";
import { sceneEditor } from "./scene";
const empty = {
  ready: false,
  busy: false,
  error: "",
  notice: "",
  rules: [],
  scene: null,
  published: [],
  active: null,
  sceneEditing: false,
  sceneDirty: false,
  sceneBaseline: null,
  editing: false,
  dirty: false,
  baseline: null,
  past: [],
  future: [],
  selectedNode: null,
  selectedObject: null,
  inspector: false,
};
export const useStudio = create<Studio>((set, get, api) => ({
  ...empty,
  ...lifecycle(set, get, api),
  ...graphEditor(set, get, api),
  ...sceneEditor(set, get, api),
  ...sceneSession(set, get, api),
  selectNode(id, inspect = true) {
    const node = get().active?.graph.nodes.find((n) => n.id === id);
    set({
      selectedNode: id,
      selectedObject: node?.data.config.spatialId ?? null,
      inspector: !!id && inspect,
    });
  },
  selectObject(id) {
    set({ selectedObject: id, selectedNode: null, inspector: false });
  },
  notify(notice) {
    set({ notice });
  },
}));
