import type { CameraScene, Rule } from "@/models/types";
import { makeNode } from "./operators";
export function seed() {
  const scene: CameraScene = {
    id: "camera-01",
    name: "Camera 01 · Main entrance",
    aspectRatio: 16 / 9,
    background: "./scene.svg",
    mediaType: "image",
    objects: [
      {
        id: "gate-entrance",
        name: "Entrance gate",
        visible: true,
        geometry: {
          kind: "gate",
          points: [
            { x: 0.18, y: 0.66 },
            { x: 0.72, y: 0.66 },
          ],
          positive: 1,
        },
      },
      {
        id: "zone-restricted",
        name: "Restricted area",
        visible: true,
        geometry: {
          kind: "zone",
          points: [
            { x: 0.59, y: 0.23 },
            { x: 0.9, y: 0.29 },
            { x: 0.84, y: 0.7 },
            { x: 0.57, y: 0.59 },
          ],
        },
      },
    ],
  };
  const specs = [
    ["Attendance", "System", "gate", "Published"],
    ["Restricted Area Alert", "Custom", "zone", "Draft"],
    ["Dwell Time Alert", "Custom", "zone", "Draft"],
  ] as const;
  const rules: Rule[] = specs.map(([name, type, kind, status], i) => {
    const first = makeNode(
      kind,
      { x: 180, y: 40 },
      kind === "gate" ? "gate-entrance" : "zone-restricted",
    );
    const middle = makeNode(i === 2 ? "duration" : "category", {
      x: 180,
      y: 270,
    });
    if (i !== 2) middle.data.config.value = "Person";
    const last = makeNode("event", { x: 180, y: 500 });
    last.data.config.eventName = name;
    return {
      id: `rule-${i + 1}`,
      name,
      description:
        i === 0
          ? "Fixed attendance template. Gate and crossing direction are configurable."
          : "A local configuration example. No analytics are executed.",
      type,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cameraId: scene.id,
      version: 1,
      graph: {
        layout: "vertical",
        nodes: [first, middle, last],
        edges: [
          {
            id: `${i}-a`,
            source: first.id,
            target: middle.id,
            sourceHandle: "out",
            targetHandle: "in",
          },
          {
            id: `${i}-b`,
            source: middle.id,
            target: last.id,
            sourceHandle: "out",
            targetHandle: "in",
          },
        ],
      },
    };
  });
  return { scene, rules };
}
