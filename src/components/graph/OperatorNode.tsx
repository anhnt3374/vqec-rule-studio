import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Check, CircleAlert } from "lucide-react";
import type { OperatorNode as OperatorNodeType } from "@/models/types";
import { useStudio } from "@/stores/studio";
import { definition } from "@/data/operators";
import { nodeErrors } from "@/features/graph-editor/validation";
import { OperatorIcon } from "@/components/operators/icons";
export function OperatorNode({
  data,
  id,
  selected,
}: NodeProps<OperatorNodeType>) {
  const scene = useStudio((s) => s.scene),
    objectId = useStudio((s) => s.selectedObject),
    select = useStudio((s) => s.selectNode);
  const def = definition(data.kind),
    object = scene?.objects.find((o) => o.id === data.config.spatialId);
  const valid = scene
    ? nodeErrors(
        { id, type: "operator", data, position: { x: 0, y: 0 } },
        scene,
      ).length === 0
    : false;
  const summary = object
    ? `${object.name} · ${data.kind === "gate" ? data.config.direction : data.config.mode}`
    : data.kind === "gate" || data.kind === "zone"
      ? "Select a spatial object"
      : def.category === "Property"
        ? `${data.config.property || "Property"} ${data.config.comparison || "="} ${data.config.value || "…"}`
        : def.category === "Time"
          ? data.kind === "schedule"
            ? data.config.schedule
            : `${data.config.seconds ?? 0} seconds`
          : data.kind === "event"
            ? data.config.eventName || "Configure an event"
            : def.description;
  return (
    <div
      className={`operator-node ${selected ? "is-selected" : ""} ${objectId && objectId === data.config.spatialId ? "is-linked" : ""}`}
      style={{ "--node-color": def.color } as React.CSSProperties}
    >
      {def.input && <Handle id="in" type="target" position={Position.Top} />}
      <div className="node-top">
        <span className="node-icon">
          <OperatorIcon kind={data.kind} />
        </span>
        <span className="node-category">{def.category}</span>
        <span
          className={`node-valid ${valid ? "valid" : ""}`}
          title={valid ? "Configured" : "Needs configuration"}
        >
          {valid ? <Check size={12} /> : <CircleAlert size={12} />}
        </span>
      </div>
      <strong>{data.config.name || def.name}</strong>
      <p>{summary}</p>
      <button
        className="node-config nodrag"
        onClick={(e) => {
          e.stopPropagation();
          select(id);
        }}
        aria-label={`Configure ${data.config.name}`}
      >
        Configure <span>↗</span>
      </button>
      {def.output && (
        <Handle id="out" type="source" position={Position.Bottom} />
      )}
    </div>
  );
}
