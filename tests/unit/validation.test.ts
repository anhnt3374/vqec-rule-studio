import { describe, it, expect } from "vitest";
import { seed } from "@/data/seed";
import { validateRule } from "@/features/graph-editor/validation";
import {
  translate,
  normalized,
  hasArea,
} from "@/features/scene-editor/geometry";
describe("structural validation", () => {
  it("accepts complete sample graphs", () => {
    const { rules, scene } = seed();
    for (const rule of rules) expect(validateRule(rule, scene)).toEqual([]);
  });
  it("rejects dangling edges, duplicate IDs and unavailable handles", () => {
    const { rules, scene } = seed(),
      rule = rules[1];
    rule.graph.nodes.push(rule.graph.nodes[0]);
    rule.graph.edges.push({
      id: "bad",
      source: "missing",
      target: rule.graph.nodes[0].id,
    });
    rule.graph.edges[0].sourceHandle = "bad";
    expect(validateRule(rule, scene)).toContain("Node IDs must be unique.");
    expect(validateRule(rule, scene)).toContain(
      "An edge references a missing node.",
    );
    expect(validateRule(rule, scene)).toContain(
      "An edge uses unavailable handles.",
    );
  });
  it("rejects wrong spatial object type", () => {
    const { rules, scene } = seed();
    rules[0].graph.nodes.find(n=>n.data.kind==="gate")!.data.config.spatialId = "zone-restricted";
    expect(validateRule(rules[0], scene)[0]).toContain("choose a valid gate");
  });
  it("detects system structure tampering", () => {
    const { rules, scene } = seed(),
      baseline = structuredClone(rules[0]);
    rules[0].graph.edges = [];
    expect(validateRule(rules[0], scene, baseline)).toContain(
      "System connections are locked.",
    );
  });
});
describe("normalized geometry", () => {
  it("moves objects within bounds without changing their size", () => {
    const { scene } = seed(),
      object = scene.objects[0];
    const moved = translate(object, { x: 5, y: -5 });
    expect(moved.geometry.points[1].x).toBe(1);
    expect(moved.geometry.points[0].y).toBe(0);
    expect(moved.geometry.points[1].x - moved.geometry.points[0].x).toBeCloseTo(
      0.8,
    );
  });
  it("normalizes pointers independently of display dimensions", () => {
    const rect = { left: 100, top: 200, width: 400, height: 200 } as DOMRect;
    expect(normalized(300, 300, rect)).toEqual({ x: 0.5, y: 0.5 });
    expect(normalized(-10, 1000, rect)).toEqual({ x: 0, y: 1 });
  });
  it("rejects degenerate zones", () => {
    expect(
      hasArea([
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
      ]),
    ).toBe(false);
  });
});
