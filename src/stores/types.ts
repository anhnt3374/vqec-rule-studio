import type { StateCreator } from "zustand";
import type {
  CameraScene,
  Rule,
  EditSnapshot,
  OperatorKind,
  OperatorConfig,
  RuleGraph,
  SpatialObject,
  PublishedSnapshot,
  Point,
} from "@/models/types";
export interface Studio {
  ready: boolean;
  busy: boolean;
  error: string;
  notice: string;
  rules: Rule[];
  scene: CameraScene | null;
  published: PublishedSnapshot[];
  active: Rule | null;
  editing: boolean;
  dirty: boolean;
  baseline: EditSnapshot | null;
  past: EditSnapshot[];
  future: EditSnapshot[];
  selectedNode: string | null;
  selectedObject: string | null;
  inspector: boolean;
  init: () => Promise<void>;
  open: (id: string | null) => boolean;
  createRule: (name: string) => void;
  edit: () => void;
  cancel: () => void;
  save: (publish?: boolean, stay?: boolean) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  rename: (name: string, description: string) => void;
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  graph: (graph: RuleGraph, history?: boolean) => void;
  addNode: (kind: OperatorKind, position?: Point, spatialId?: string) => void;
  spatialDrop: (id: string, position: Point) => void;
  config: (id: string, config: OperatorConfig) => void;
  addObject: (object: SpatialObject) => void;
  updateObject: (object: SpatialObject) => void;
  deleteObject: (id: string) => void;
  dependencies: (id: string) => string[];
  background: (url: string, ratio: number, type: "image" | "video") => void;
  selectNode: (id: string | null, inspect?: boolean) => void;
  selectObject: (id: string | null) => void;
  notify: (notice: string) => void;
}

export type StudioSlice<Keys extends keyof Studio> = StateCreator<
  Studio,
  [],
  [],
  Pick<Studio, Keys>
>;
