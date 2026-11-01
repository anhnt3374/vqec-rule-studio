import type { CameraScene, Rule, OperatorNode } from "@/models/types";
import { definition } from "@/data/operators";
export function nodeErrors(node: OperatorNode, scene: CameraScene): string[] {
  const { kind, config } = node.data,
    errors: string[] = [];
  const label = config.name || definition(kind).name;
  if (!config.name.trim()) errors.push("Node name is required.");
  if (kind === "gate" || kind === "zone") {
    const object = scene.objects.find((o) => o.id === config.spatialId);
    if (!object || object.geometry.kind !== kind)
      errors.push(`${label}: choose a valid ${kind}.`);
  }
  if (
    definition(kind).category === "Property" &&
    (!config.property?.trim() ||
      !config.value?.trim() ||
      ![
        "equals",
        "not equals",
        "contains",
        "greater than",
        "less than",
      ].includes(config.comparison ?? ""))
  )
    errors.push(`${label}: complete the property comparison.`);
  if (
    kind === "event" &&
    (!config.eventName?.trim() || !config.eventType?.trim())
  )
    errors.push(`${label}: event name and type are required.`);
  if (
    definition(kind).category === "Time" &&
    kind !== "schedule" &&
    (!Number.isFinite(config.seconds) || (config.seconds ?? 0) <= 0)
  )
    errors.push(`${label}: duration must be positive.`);
  if (kind === "schedule" && !config.schedule?.trim())
    errors.push(`${label}: schedule is required.`);
  return errors;
}
export function validateRule(
  rule: Rule,
  scene: CameraScene,
  baseline?: Rule,
): string[] {
  const errors = rule.graph.nodes.flatMap((n) => nodeErrors(n, scene));
  if (!rule.name.trim()) errors.push("Rule name is required.");
  if (!rule.graph.nodes.length) errors.push("Add at least one operator.");
  if (!rule.graph.nodes.some((n) => n.data.kind === "event"))
    errors.push("Add a Trigger Event output.");
  const ids = rule.graph.nodes.map((n) => n.id);
  if (new Set(ids).size !== ids.length) errors.push("Node IDs must be unique.");
  if (
    new Set(rule.graph.edges.map((e) => e.id)).size !== rule.graph.edges.length
  )
    errors.push("Edge IDs must be unique.");
  for (const edge of rule.graph.edges) {
    const source = rule.graph.nodes.find((n) => n.id === edge.source),
      target = rule.graph.nodes.find((n) => n.id === edge.target);
    if (!source || !target) {
      errors.push("An edge references a missing node.");
      continue;
    }
    if (
      !definition(source.data.kind).output ||
      !definition(target.data.kind).input ||
      edge.sourceHandle !== "out" ||
      edge.targetHandle !== "in"
    )
      errors.push("An edge uses unavailable handles.");
  }
  for (const node of rule.graph.nodes) {
    if (
      !["category", "gate", "zone", "movement"].includes(node.data.kind) &&
      definition(node.data.kind).input &&
      !rule.graph.edges.some((e) => e.target === node.id)
    )
      errors.push(`${node.data.config.name}: connect an input.`);
    if (
      definition(node.data.kind).output &&
      !rule.graph.edges.some((e) => e.source === node.id)
    )
      errors.push(`${node.data.config.name}: connect an output.`);
  }
  if (
    baseline?.type === "System" &&
    JSON.stringify(
      rule.graph.nodes.map((n) => ({
        id: n.id,
        kind: n.data.kind,
        position: n.position,
      })),
    ) !==
      JSON.stringify(
        baseline.graph.nodes.map((n) => ({
          id: n.id,
          kind: n.data.kind,
          position: n.position,
        })),
      )
  )
    errors.push("System graph structure is locked.");
  if (
    baseline?.type === "System" &&
    JSON.stringify(rule.graph.edges) !== JSON.stringify(baseline.graph.edges)
  )
    errors.push("System connections are locked.");
  return [...new Set(errors)];
}
