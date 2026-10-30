import type {
  OperatorDefinition,
  OperatorKind,
  OperatorNode,
} from "@/models/types";
const groups = {
  Spatial: [
    ["gate", "Gate Crossing", "Cross a directional line"],
    ["zone", "Zone Presence", "Presence inside a region"],
    ["movement", "Movement", "Configure movement metadata"],
  ],
  Property: [
    ["category", "Object Category", "Person, vehicle or object"],
    ["identity", "Identity Status", "Known or unknown identity"],
    ["group", "Person Group", "Filter a person group"],
    ["property", "Generic Property", "Compare an object property"],
  ],
  Set: [
    ["union", "Union", "Combine connected inputs"],
    ["intersection", "Intersection", "Match all connected inputs"],
    ["complement", "Complement", "Invert an input set"],
  ],
  Time: [
    ["schedule", "Schedule", "Set an active schedule"],
    ["duration", "Duration", "Configure a duration"],
    ["within", "Within", "Configure a time window"],
    ["sequence", "Sequence", "Describe ordered inputs"],
  ],
  Output: [["event", "Trigger Event", "Define an output configuration"]],
} as const;
const colors = {
  Spatial: "#36b8ef",
  Property: "#a78bfa",
  Set: "#f9b85a",
  Time: "#42cfb0",
  Output: "#fa8293",
};
export const operators: OperatorDefinition[] = Object.entries(groups).flatMap(
  ([category, items]) =>
    items.map(([kind, name, description]) => ({
      kind,
      name,
      description,
      category: category as OperatorDefinition["category"],
      color: colors[category as keyof typeof colors],
      input: kind !== "gate" && kind !== "zone" && kind !== "movement",
      output: kind !== "event",
    })),
);
export const definition = (kind: OperatorKind) =>
  operators.find((item) => item.kind === kind)!;
export function makeNode(
  kind: OperatorKind,
  position = { x: 100, y: 100 },
  spatialId?: string,
): OperatorNode {
  return {
    id: crypto.randomUUID(),
    type: "operator",
    position,
    data: {
      kind,
      config: {
        name: definition(kind).name,
        ...(kind === "gate" ? { direction: "Both" as const } : {}),
        ...(kind === "zone" ? { mode: "Inside" as const } : {}),
        ...(spatialId ? { spatialId } : {}),
        ...(definition(kind).category === "Property"
          ? {
              property: kind === "property" ? "" : kind,
              comparison: "equals",
              value: "",
            }
          : {}),
        ...(definition(kind).category === "Time"
          ? { seconds: 30, schedule: "Mon–Fri 09:00–18:00" }
          : {}),
        ...(kind === "event" ? { eventName: "", eventType: "Custom" } : {}),
      },
    },
  };
}
export const SPATIAL_MIME = "application/x-vqec-spatial";
export const OPERATOR_MIME = "application/x-vqec-operator";
