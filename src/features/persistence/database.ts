import Dexie, { type EntityTable } from "dexie";
import type {
  Rule,
  CameraScene,
  DraftSnapshot,
  PublishedSnapshot,
} from "@/models/types";
import { seed } from "@/data/seed";
export class StudioDatabase extends Dexie {
  rules!: EntityTable<Rule, "id">;
  scenes!: EntityTable<CameraScene, "id">;
  drafts!: EntityTable<DraftSnapshot, "ruleId">;
  published!: EntityTable<PublishedSnapshot, "ruleId">;
  constructor(name = "vqec-rule-studio") {
    super(name);
    this.version(1).stores({
      rules: "id, cameraId",
      scenes: "id",
      drafts: "ruleId",
      published: "ruleId",
    });
  }
}
export const db = new StudioDatabase();
export async function loadWorkspace() {
  await db.transaction(
    "rw",
    db.rules,
    db.scenes,
    db.drafts,
    db.published,
    async () => {
      if (await db.scenes.count()) return;
      const { scene, rules } = seed();
      await db.scenes.put(scene);
      await db.rules.bulkPut(rules);
      for (const rule of rules) {
        await db.drafts.put({ ruleId: rule.id, savedAt: rule.updatedAt, rule });
        if (rule.status === "Published")
          await db.published.put({
            ruleId: rule.id,
            publishedAt: rule.updatedAt,
            rule,
          });
      }
    },
  );
  return {
    rules: (await db.rules.toArray()).map(verticalRule),
    scene: (await db.scenes.toArray())[0],
    published: await db.published.toArray(),
  };
}
export async function persist(
  rule: Rule,
  scene: CameraScene,
  publish: boolean,
) {
  await db.transaction(
    "rw",
    db.rules,
    db.scenes,
    db.drafts,
    db.published,
    async () => {
      await db.rules.put(rule);
      await db.scenes.put(scene);
      await db.drafts.put({ ruleId: rule.id, savedAt: rule.updatedAt, rule });
      if (publish)
        await db.published.put({
          ruleId: rule.id,
          publishedAt: rule.updatedAt,
          rule,
        });
    },
  );
}
export async function removeRule(id: string) {
  await db.transaction("rw", db.rules, db.drafts, db.published, async () => {
    await db.rules.delete(id);
    await db.drafts.delete(id);
    await db.published.delete(id);
  });
}

// Present legacy horizontal documents vertically without rewriting saved snapshots.
export function verticalRule(rule: Rule): Rule {
  if (rule.graph.layout === "vertical") return rule;
  return {
    ...rule,
    graph: {
      ...rule.graph,
      layout: "vertical",
      nodes: rule.graph.nodes.map((node) => ({
        ...node,
        position: { x: node.position.y, y: node.position.x },
      })),
    },
  };
}
export async function persistScene(scene: CameraScene) {
  await db.scenes.put(scene);
}
