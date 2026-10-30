import type { StudioSlice } from "./types";
import type { Rule } from "@/models/types";
import {
  loadWorkspace,
  persist,
  removeRule,
} from "@/features/persistence/database";
import { validateRule } from "@/features/graph-editor/validation";
import { clone } from "@/utils/cn";
export const lifecycle: StudioSlice<
  | "init"
  | "open"
  | "createRule"
  | "edit"
  | "cancel"
  | "save"
  | "deleteRule"
  | "rename"
> = (set, get) => ({
  async init() {
    try {
      const data = await loadWorkspace();
      set({ ...data, ready: true, error: "" });
    } catch {
      set({
        error: "Cannot open local storage. Enable IndexedDB and reload.",
        ready: true,
      });
    }
  },
  open(id) {
    if (get().busy) return false;
    if (get().sceneEditing) {
      get().notify("Save or cancel the scene before switching rules.");
      return false;
    }
    if (get().dirty) return false;
    const active = get().rules.find((r) => r.id === id) ?? null;
    set({
      active: active ? clone(active) : null,
      editing: false,
      baseline: null,
      selectedNode: null,
      selectedObject: null,
      inspector: false,
      past: [],
      future: [],
    });
    return true;
  },
  createRule(name) {
    if (get().dirty || get().busy || !get().scene) return;
    if (get().sceneEditing) {
      get().notify("Save or cancel the scene before creating a rule.");
      return;
    }
    const now = new Date().toISOString();
    const rule: Rule = {
      id: crypto.randomUUID(),
      name: name.trim() || "Untitled rule",
      description: "",
      type: "Custom",
      status: "Unsaved",
      createdAt: now,
      updatedAt: now,
      graph: { layout: "vertical", nodes: [], edges: [] },
      cameraId: get().scene!.id,
      version: 1,
    };
    set({
      active: rule,
      editing: true,
      dirty: true,
      baseline: { rule: clone(rule), scene: get().scene! },
      past: [],
      future: [],
      selectedNode: null,
      selectedObject: null,
      inspector: false,
    });
  },
  edit() {
    const { active, scene, busy } = get();
    if (!active || !scene || busy) return;
    if (get().sceneEditing) {
      get().notify("Save or cancel the scene before editing the graph.");
      return;
    }
    set({
      editing: true,
      baseline: { rule: clone(active), scene },
      past: [],
      future: [],
    });
  },
  cancel() {
    const { baseline, busy, rules } = get();
    if (!baseline || busy) return;
    const existing = rules.some((r) => r.id === baseline.rule.id);
    set({
      active: existing ? clone(baseline.rule) : null,
      scene: baseline.scene,
      editing: false,
      dirty: false,
      baseline: null,
      past: [],
      future: [],
      selectedNode: null,
      selectedObject: null,
      inspector: false,
    });
  },
  async save(publish = false, stay = false) {
    const { active, scene, busy, baseline, editing } = get();
    if (!active || !scene || busy || !editing) return;
    if (publish) {
      const errors = validateRule(active, scene, baseline?.rule);
      if (errors.length) {
        set({ error: errors.join("\n") });
        return;
      }
    }
    set({ busy: true, error: "" });
    const rule = clone({
      ...active,
      status: publish ? "Published" : "Draft",
      version: active.version + 1,
      updatedAt: new Date().toISOString(),
    } as Rule);
    try {
      await persist(rule, clone(scene), publish);
      const rules = get()
        .rules.filter((r) => r.id !== rule.id)
        .concat(rule);
      const published = publish
        ? get()
            .published.filter((p) => p.ruleId !== rule.id)
            .concat({
              ruleId: rule.id,
              publishedAt: rule.updatedAt,
              rule: clone(rule),
            })
        : get().published;
      set({
        rules,
        published,
        active: rule,
        dirty: false,
        editing: stay,
        baseline: stay ? { rule: clone(rule), scene } : null,
        past: [],
        future: [],
        busy: false,
        notice: publish
          ? "Published locally. Snapshot saved."
          : "Draft and scene saved on this browser.",
      });
    } catch {
      set({
        busy: false,
        error:
          "Save failed. Your working copy is still available. Check browser storage space.",
      });
    }
  },
  async deleteRule(id) {
    if (get().busy || get().rules.find((r) => r.id === id)?.type === "System")
      return;
    set({ busy: true });
    try {
      await removeRule(id);
      set({
        rules: get().rules.filter((r) => r.id !== id),
        ...(get().active?.id === id
          ? { active: null, editing: false, dirty: false, baseline: null }
          : {}),
        busy: false,
        notice: "Rule deleted. Shared scene objects were kept.",
      });
    } catch {
      set({ busy: false, error: "Could not delete this rule." });
    }
  },
  rename(name, description) {
    const { active, editing, busy } = get();
    if (!active || !editing || busy || active.type === "System") return;
    get().checkpoint();
    set({
      active: { ...active, name, description, status: "Unsaved" },
      dirty: true,
    });
  },
});
