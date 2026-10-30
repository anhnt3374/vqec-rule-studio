import type { Node, Edge } from "@xyflow/react";
export type RuleStatus = "Unsaved" | "Draft" | "Published";
export type OperatorKind =
  | "gate"
  | "zone"
  | "movement"
  | "category"
  | "identity"
  | "group"
  | "property"
  | "union"
  | "intersection"
  | "complement"
  | "schedule"
  | "duration"
  | "within"
  | "sequence"
  | "event";
export interface Point {
  x: number;
  y: number;
}
export interface GateGeometry {
  kind: "gate";
  points: [Point, Point];
  positive: 1 | -1;
}
export interface ZoneGeometry {
  kind: "zone";
  points: Point[];
}
export interface SpatialObject {
  id: string;
  name: string;
  visible: boolean;
  geometry: GateGeometry | ZoneGeometry;
}
export interface CameraScene {
  id: string;
  name: string;
  aspectRatio: number;
  background: string;
  mediaType: "image" | "video";
  objects: SpatialObject[];
}
export interface OperatorConfig {
  name: string;
  spatialId?: string;
  direction?: "Positive" | "Negative" | "Both";
  mode?: "Inside" | "Outside" | "Enter" | "Exit";
  property?: string;
  comparison?: string;
  value?: string;
  seconds?: number;
  schedule?: string;
  eventName?: string;
  eventType?: string;
  description?: string;
}
export interface OperatorData extends Record<string, unknown> {
  kind: OperatorKind;
  config: OperatorConfig;
}
export type OperatorNode = Node<OperatorData, "operator">;
export type OperatorEdge = Edge;
export interface RuleGraph {
  layout?: "vertical";
  nodes: OperatorNode[];
  edges: OperatorEdge[];
}
export interface Rule {
  id: string;
  name: string;
  description: string;
  type: "System" | "Custom";
  status: RuleStatus;
  createdAt: string;
  updatedAt: string;
  graph: RuleGraph;
  cameraId: string;
  version: number;
}
export interface OperatorDefinition {
  kind: OperatorKind;
  name: string;
  category: "Spatial" | "Property" | "Set" | "Time" | "Output";
  color: string;
  description: string;
  input: boolean;
  output: boolean;
}
export interface DraftSnapshot {
  ruleId: string;
  savedAt: string;
  rule: Rule;
}
export interface PublishedSnapshot {
  ruleId: string;
  publishedAt: string;
  rule: Rule;
}
export interface EditSnapshot {
  rule: Rule;
  scene: CameraScene;
}
