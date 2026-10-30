import { beforeEach, describe, it, expect } from "vitest";
import { db, loadWorkspace } from "@/features/persistence/database";
import { useStudio } from "@/stores/studio";
import type { SpatialObject } from "@/models/types";
const gate: SpatialObject = {
  id: "shared-gate",
  name: "Shared entrance",
  visible: true,
  geometry: {
    kind: "gate",
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.8, y: 0.2 },
    ],
    positive: 1,
  },
};
async function fresh() {
  await db.delete();
  await db.open();
  useStudio.setState({
    active: null,
    scene: null,
    rules: [],
    published: [],
    dirty: false,
    editing: false,
    busy: false,
    error: "",
    notice: "",
    baseline: null,
    past: [],
    future: [],
  });
  await useStudio.getState().init();
}
const studio = () => useStudio.getState();
beforeEach(fresh);
describe("local configuration lifecycle", () => {
  it("saves and restores an independent draft with its scene", async () => {
    studio().createRule("My entrance");
    studio().addObject(gate);
    studio().spatialDrop(gate.id, { x: 200, y: 300 });
    const id = studio().active!.id;
    await studio().save(false, true);
    const reloaded = await loadWorkspace();
    expect(
      reloaded.rules.find((r) => r.id === id)?.graph.nodes[0].data.config
        .spatialId,
    ).toBe(gate.id);
    expect(reloaded.scene.objects).toContainEqual(gate);
    expect((await db.drafts.get(id))?.rule.status).toBe("Draft");
    expect(await db.published.get(id)).toBeUndefined();
  });
  it("keeps published snapshots unchanged while editing and saving drafts", async () => {
    studio().open("rule-1");
    const original = await db.published.get("rule-1");
    studio().edit();
    const node = studio().active!.graph.nodes[0];
    studio().config(node.id, { ...node.data.config, direction: "Negative" });
    expect(studio().active!.status).toBe("Unsaved");
    expect(studio().published.find((p) => p.ruleId === "rule-1")).toEqual(
      original,
    );
    await studio().save(false, true);
    expect(await db.published.get("rule-1")).toEqual(original);
    expect(
      (await db.drafts.get("rule-1"))!.rule.graph.nodes[0].data.config
        .direction,
    ).toBe("Negative");
    await studio().save(true);
    expect(
      (await db.published.get("rule-1"))!.rule.graph.nodes[0].data.config
        .direction,
    ).toBe("Negative");
  });
  it("cancel restores graph and shared geometry, without saving modifications", async () => {
    studio().open("rule-2");
    const rule = structuredClone(studio().active!),
      scene = structuredClone(studio().scene!);
    studio().edit();
    studio().addObject(gate);
    studio().addNode("union");
    studio().cancel();
    expect(studio().active).toEqual(rule);
    expect(studio().scene).toEqual(scene);
    expect((await loadWorkspace()).scene).toEqual(scene);
  });
  it("cancel after saving a draft returns to that save boundary", async () => {
    studio().open("rule-2");
    studio().edit();
    studio().addObject(gate);
    await studio().save(false, true);
    studio().updateObject({ ...gate, name: "Temporary name" });
    studio().cancel();
    expect(studio().scene!.objects.find((o) => o.id === gate.id)?.name).toBe(
      "Shared entrance",
    );
  });
  it("new unsaved rule and geometry are discarded on cancel", () => {
    const count = studio().rules.length;
    studio().createRule("Temporary");
    studio().addObject(gate);
    studio().cancel();
    expect(studio().active).toBeNull();
    expect(studio().rules).toHaveLength(count);
    expect(
      studio().scene!.objects.find((o) => o.id === gate.id),
    ).toBeUndefined();
  });
  it("an invalid graph cannot publish", async () => {
    studio().createRule("Incomplete");
    studio().addNode("gate");
    await studio().save(true);
    expect(studio().error).toContain("choose a valid gate");
    expect(await db.published.get(studio().active!.id)).toBeUndefined();
  });
  it("blocks switching rules while there are unsaved changes", () => {
    studio().createRule("Work");
    const id = studio().active!.id;
    expect(studio().open("rule-1")).toBe(false);
    expect(studio().active!.id).toBe(id);
  });
});
describe("history status", () => {
  it("undoing to the saved baseline clears Unsaved status", () => {
    studio().open("rule-2");
    studio().edit();
    studio().addNode("union");
    expect(studio().dirty).toBe(true);
    studio().undo();
    expect(studio().dirty).toBe(false);
    expect(studio().active!.status).toBe("Draft");
    studio().redo();
    expect(studio().dirty).toBe(true);
  });
});
describe("spatial references and restrictions", () => {
  it("creates geometry without creating nodes, and drops it into multiple rules", async () => {
    studio().createRule("First");
    studio().addObject(gate);
    expect(studio().active!.graph.nodes).toHaveLength(0);
    studio().spatialDrop(gate.id, { x: 1, y: 2 });
    studio().spatialDrop(gate.id, { x: 300, y: 2 });
    expect(studio().active!.graph.nodes).toHaveLength(2);
    await studio().save();
    studio().createRule("Second");
    studio().spatialDrop(gate.id, { x: 5, y: 7 });
    expect(studio().active!.graph.nodes[0].data.kind).toBe("gate");
    expect(studio().active!.graph.nodes[0].position).toEqual({ x: 5, y: 7 });
    expect(studio().active!.graph.nodes[0].data.config.spatialId).toBe(gate.id);
    studio().updateObject({ ...gate, name: "Updated shared entrance" });
    await studio().save();
    expect(
      (await loadWorkspace()).scene.objects.find((o) => o.id === gate.id)?.name,
    ).toBe("Updated shared entrance");
    expect(
      (await loadWorkspace()).rules.filter((r) =>
        r.graph.nodes.some((n) => n.data.config.spatialId === gate.id),
      ),
    ).toHaveLength(2);
  });
  it("blocks deletion of references in saved drafts or published snapshots", () => {
    studio().open("rule-2");
    studio().edit();
    const count = studio().scene!.objects.length;
    studio().deleteObject("gate-entrance");
    expect(studio().scene!.objects).toHaveLength(count);
    expect(studio().error).toContain("Attendance");
  });
  it("deleting a custom rule preserves global scene definitions", async () => {
    const scene = studio().scene;
    await studio().deleteRule("rule-2");
    expect(await db.rules.get("rule-2")).toBeUndefined();
    expect((await loadWorkspace()).scene).toEqual(scene);
  });
  it("system rule permits only explicitly allowed parameters", async () => {
    studio().open("rule-1");
    studio().edit();
    const graph = structuredClone(studio().active!.graph);
    studio().addNode("property");
    studio().graph({ nodes: [], edges: [] });
    studio().addObject(gate);
    studio().rename("Invalid", "Invalid");
    const node = graph.nodes[0];
    studio().config(node.id, {
      name: "Invalid",
      spatialId: "gate-entrance",
      direction: "Negative",
      mode: "Exit",
    });
    expect(studio().active!.name).toBe("Attendance");
    expect(studio().active!.graph.nodes).toHaveLength(3);
    expect(studio().active!.graph.edges).toEqual(graph.edges);
    expect(studio().active!.graph.nodes[0].data.config).toEqual({
      ...node.data.config,
      direction: "Negative",
    });
    expect(
      studio().scene!.objects.find((o) => o.id === gate.id),
    ).toBeUndefined();
    await studio().deleteRule("rule-1");
    expect(await db.rules.get("rule-1")).toBeDefined();
  });
  it("undo and redo restore shared geometry and graph together", () => {
    studio().createRule("History");
    studio().addObject(gate);
    studio().spatialDrop(gate.id, { x: 1, y: 2 });
    studio().undo();
    expect(studio().active!.graph.nodes).toHaveLength(0);
    expect(studio().scene!.objects).toContainEqual(gate);
    studio().undo();
    expect(
      studio().scene!.objects.find((o) => o.id === gate.id),
    ).toBeUndefined();
    studio().redo();
    expect(studio().scene!.objects).toContainEqual(gate);
  });
});
