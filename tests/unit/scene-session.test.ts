import { beforeEach, describe, expect, it } from "vitest";
import { db, loadWorkspace } from "@/features/persistence/database";
import { useStudio } from "@/stores/studio";
import type { SpatialObject } from "@/models/types";
const gate: SpatialObject = {
  id: "draw-first",
  name: "Draw first",
  visible: true,
  geometry: {
    kind: "gate",
    points: [
      { x: 0.1, y: 0.4 },
      { x: 0.7, y: 0.4 },
    ],
    positive: 1,
  },
};
const s = () => useStudio.getState();
beforeEach(async () => {
  await db.delete();
  await db.open();
  useStudio.setState({
    active: null,
    editing: false,
    dirty: false,
    busy: false,
    error: "",
    sceneEditing: false,
    sceneDirty: false,
    sceneBaseline: null,
  });
  await s().init();
});
describe("independent shared scene authoring", () => {
  it("draws and saves geometry before any rule exists", async () => {
    expect(s().beginScene()).toBe(true);
    s().addObject(gate);
    expect(s().sceneDirty).toBe(true);
    expect(s().active).toBeNull();
    expect(s().rules).toHaveLength(3);
    await s().saveScene();
    expect((await loadWorkspace()).scene.objects).toContainEqual(gate);
    expect(s().sceneDirty).toBe(false);
    expect(s().sceneEditing).toBe(false);
  });
  it("cancels geometry without changing saved drafts or published versions", async () => {
    const before = await loadWorkspace(),
      drafts = await db.drafts.toArray();
    s().beginScene();
    s().addObject(gate);
    s().cancelScene();
    expect(s().scene).toEqual(before.scene);
    expect(await db.drafts.toArray()).toEqual(drafts);
    expect(await db.published.toArray()).toEqual(before.published);
  });
  it("allows scene editing while viewing Attendance, retaining its locked graph", async () => {
    s().open("rule-1");
    const graph = structuredClone(s().active!.graph),
      published = await db.published.get("rule-1");
    expect(s().beginScene()).toBe(true);
    s().updateObject({ ...s().scene!.objects[0], name: "Updated entrance" });
    await s().saveScene();
    expect(s().active!.graph).toEqual(graph);
    expect(s().active!.status).toBe("Draft");
    expect(await db.published.get("rule-1")).toEqual(published);
    expect((await loadWorkspace()).scene.objects[0].name).toBe(
      "Updated entrance",
    );
  });
  it("keeps unfinished scene edits separate from graph editing", () => {
    s().open("rule-2");
    s().beginScene();
    s().addObject(gate);
    expect(s().open("rule-3")).toBe(false);
    s().edit();
    s().addNode("union");
    expect(s().editing).toBe(false);
    expect(s().active!.graph.nodes).toHaveLength(3);
    s().createRule("Do not lose geometry");
    expect(s().active!.id).toBe("rule-2");
  });
  it("blocks geometry deletion while a saved or published rule still references it", () => {
    s().beginScene();
    s().deleteObject("gate-entrance");
    expect(s().error).toContain("Attendance");
    expect(s().scene!.objects).toHaveLength(2);
  });
  it("spatial drop from a saved scene starts a custom graph edit", async () => {
    s().beginScene();
    s().addObject(gate);
    await s().saveScene();
    s().open("rule-2");
    s().spatialDrop(gate.id, { x: 300, y: 700 });
    expect(s().editing).toBe(true);
    expect(s().active!.graph.nodes.at(-1)?.data.config.spatialId).toBe(gate.id);
  });
  it("presents legacy horizontal graphs vertically without rewriting published records", async () => {
    const rule = (await db.rules.get("rule-2"))!;
    delete rule.graph.layout;
    rule.graph.nodes.forEach((n, i) => {
      n.position = { x: 70 + i * 300, y: 150 };
    });
    await db.rules.put(rule);
    await db.published.put({
      ruleId: rule.id,
      rule,
      publishedAt: rule.updatedAt,
    });
    const before = await db.published.get(rule.id),
      loaded = await loadWorkspace(),
      view = loaded.rules.find((r) => r.id === rule.id)!;
    expect(view.graph.layout).toBe("vertical");
    expect(view.graph.nodes[1].position).toEqual({ x: 150, y: 370 });
    expect(await db.published.get(rule.id)).toEqual(before);
    expect((await db.rules.get(rule.id))!.graph.layout).toBeUndefined();
  });
});
