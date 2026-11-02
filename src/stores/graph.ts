import type { EditSnapshot } from "@/models/types";
import type { StudioSlice } from "./types";
import { makeNode } from "@/data/operators";
import { clone } from "@/utils/cn";
// Scene mutations always replace objects. History shares immutable scene references
// so uploaded media strings are not copied into every undo entry.
function restore(snapshot: EditSnapshot, baseline: EditSnapshot | null) {
  const rule = clone(snapshot.rule),
    scene = snapshot.scene;
  const dirty =
    !baseline ||
    baseline.rule.status === "Unsaved" ||
    JSON.stringify({ ...rule, status: baseline.rule.status }) !==
      JSON.stringify(baseline.rule) ||
    JSON.stringify(scene) !== JSON.stringify(baseline.scene);
  return {
    active: {
      ...rule,
      status: dirty ? ("Unsaved" as const) : baseline!.rule.status,
    },
    scene,
    dirty,
  };
}
export const graphEditor: StudioSlice<
  | "checkpoint"
  | "undo"
  | "redo"
  | "graph"
  | "addNode"
  | "spatialDrop"
  | "config"
> = (set, get) => ({
  checkpoint() {
    const { active, scene, editing, busy, past } = get();
    if (active && scene && editing && !busy)
      set({
        past: [...past, { rule: clone(active), scene }].slice(-60),
        future: [],
      });
  },
  undo() {
    const { past, active, scene, editing, busy, future } = get();
    if (!editing || busy || !past.length || !active || !scene) return;
    const snapshot = past[past.length - 1];
    set({
      ...restore(snapshot, get().baseline),
      past: past.slice(0, -1),
      future: [{ rule: clone(active), scene }, ...future],
    });
  },
  redo() {
    const { past, active, scene, editing, busy, future } = get();
    if (!editing || busy || !future.length || !active || !scene) return;
    const snapshot = future[0];
    set({
      ...restore(snapshot, get().baseline),
      future: future.slice(1),
      past: [...past, { rule: clone(active), scene }],
    });
  },
  graph(graph, history = true) {
    const { active, editing, busy } = get();
    if (!active || !editing || busy || active.type === "System") return;
    if (history) get().checkpoint();
    set({
      active: {
        ...active,
        graph: { ...graph, layout: "vertical" },
        status: "Unsaved",
      },
      dirty: true,
    });
  },
  addNode(kind, position, spatialId) {
    const { active, editing, busy } = get();
    if (!active || !editing || busy || active.type === "System") return;
    const node = makeNode(
      kind,
      position ?? {
        x: 180 + Math.floor(active.graph.nodes.length / 4) * 300,
        y: 40 + (active.graph.nodes.length % 4) * 230,
      },
      spatialId,
    );
    get().graph({ ...active.graph, nodes: [...active.graph.nodes, node] });
    get().selectNode(node.id, false);
  },
  spatialDrop(id, position) {
    const s = get();
    if (s.sceneEditing) {
      s.notify("Save the scene before adding a spatial operator.");
      return;
    }
    if (!s.active || s.active.type === "System") {
      s.notify("Choose a custom rule to add this spatial operator.");
      return;
    }
    if (!s.editing) s.edit();
    const object = get().scene?.objects.find((o) => o.id === id);
    if (object) get().addNode(object.geometry.kind, position, id);
  },
  config(id, config) {
    const { active, editing, busy } = get();
    if (!active || !editing || busy) return;
    const node = active.graph.nodes.find((n) => n.id === id);
    if (!node) return;
    const next =
      active.type === "System"
        ? {
            ...node.data.config,
            ...(node.data.kind === "gate"
              ? { spatialId: config.spatialId, direction: config.direction }
              : node.data.kind === "highlight"
                ? { highlightColor: config.highlightColor, highlightEnabled: config.highlightEnabled }
              : node.data.kind === "zone"
                ? { spatialId: config.spatialId }
                : {}),
          }
        : config;
    if (JSON.stringify(next) === JSON.stringify(node.data.config)) return;
    get().checkpoint();
    set({
      active: {
        ...active,
        status: "Unsaved",
        graph: {
          ...active.graph,
          nodes: active.graph.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, config: next } } : n,
          ),
        },
      },
      dirty: true,
    });
  },
});
