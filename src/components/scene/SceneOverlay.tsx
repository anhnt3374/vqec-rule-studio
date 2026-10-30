import type { useSceneDrawing } from "@/hooks/useSceneDrawing";
import { useStudio } from "@/stores/studio";
import { gateArrow } from "@/features/scene-editor/geometry";
import { SPATIAL_MIME } from "@/data/operators";
import type { SpatialObject } from "@/models/types";
export interface SceneFilters {
  gates: boolean;
  zones: boolean;
  labels: boolean;
  mock: boolean;
  all: boolean;
}
export function SceneOverlay({
  drawing,
  filters,
  width,
  height,
}: {
  drawing: ReturnType<typeof useSceneDrawing>;
  filters: SceneFilters;
  width: number;
  height: number;
}) {
  const s = useStudio(),
    refs = new Set(s.active?.graph.nodes.map((n) => n.data.config.spatialId));
  const objects = s.scene!.objects.filter(
    (o) =>
      o.visible && (o.geometry.kind === "gate" ? filters.gates : filters.zones),
  );
  const viewObject = (object: SpatialObject) =>
    drawing.preview?.id === object.id ? drawing.preview : object;
  const dim = (object: SpatialObject) =>
    !filters.all &&
    s.active &&
    !refs.has(object.id) &&
    s.selectedObject !== object.id;
  return (
    <>
      <svg
        ref={drawing.svg}
        className={`scene-overlay tool-${drawing.tool}`}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        aria-label="Scene drawing canvas"
        onPointerDown={drawing.down}
        onPointerMove={drawing.move}
        onPointerUp={drawing.up}
        onPointerCancel={drawing.clear}
        onDoubleClick={() => drawing.tool === "zone" && drawing.complete()}
      >
        <defs>
          <marker
            id="positive-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="#54d9ff" />
          </marker>
        </defs>
        {filters.mock && (
          <g className="mock-tracks" pointerEvents="none">
            <rect x="330" y="380" width="85" height="230" />
            <text x="330" y="365">
              MOCK · Person 01
            </text>
            <path d="M370 610 L340 730 L280 810" />
          </g>
        )}
        {objects.map((original) => {
          const object = viewObject(original),
            selected = s.selectedObject === object.id,
            g = object.geometry,
            arrow = gateArrow(object, width, height),
            color = g.kind === "gate" ? "#54d9ff" : "#b197fc";
          return (
            <g
              key={object.id}
              opacity={dim(object) ? 0.25 : 1}
              style={{
                cursor:
                  drawing.tool === "select"
                    ? drawing.editable
                      ? "move"
                      : "pointer"
                    : "crosshair",
              }}
            >
              {g.kind === "gate" ? (
                <>
                  <line
                    x1={g.points[0].x * 1000}
                    y1={g.points[0].y * 1000}
                    x2={g.points[1].x * 1000}
                    y2={g.points[1].y * 1000}
                    stroke="transparent"
                    strokeWidth="18"
                    vectorEffect="non-scaling-stroke"
                    onPointerDown={(e) => drawing.begin(e, object)}
                  />
                  <line
                    x1={g.points[0].x * 1000}
                    y1={g.points[0].y * 1000}
                    x2={g.points[1].x * 1000}
                    y2={g.points[1].y * 1000}
                    stroke={color}
                    strokeWidth={selected ? 4 : 2.5}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                  {arrow && (
                    <line
                      {...arrow}
                      stroke={color}
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                      markerEnd="url(#positive-arrow)"
                      pointerEvents="none"
                    />
                  )}
                </>
              ) : (
                <polygon
                  points={g.points
                    .map((p) => `${p.x * 1000},${p.y * 1000}`)
                    .join(" ")}
                  fill={selected ? "#a78bfa35" : "#a78bfa18"}
                  stroke={color}
                  strokeWidth={selected ? 3 : 2}
                  vectorEffect="non-scaling-stroke"
                  onPointerDown={(e) => drawing.begin(e, object)}
                />
              )}
              {(selected || g.kind === "gate") &&
                g.points.map((p, i) => (
                  <ellipse
                    key={i}
                    cx={p.x * 1000}
                    cy={p.y * 1000}
                    rx={(5 / width) * 1000}
                    ry={(5 / height) * 1000}
                    stroke={color}
                    strokeWidth="2"
                    fill="#101827"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      cursor: drawing.editable ? "crosshair" : "pointer",
                    }}
                    onPointerDown={(e) => drawing.begin(e, object, i)}
                  />
                ))}
            </g>
          );
        })}
        {drawing.points.length > 0 && (
          <g pointerEvents="none">
            {drawing.tool === "gate" ? (
              <line
                x1={drawing.points[0].x * 1000}
                y1={drawing.points[0].y * 1000}
                x2={drawing.points[1].x * 1000}
                y2={drawing.points[1].y * 1000}
                stroke="#54d9ff"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <polyline
                points={drawing.points
                  .map((p) => `${p.x * 1000},${p.y * 1000}`)
                  .join(" ")}
                fill="#a78bfa22"
                stroke="#b197fc"
                strokeWidth="2"
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {drawing.points.map((p, i) => (
              <ellipse
                key={i}
                cx={p.x * 1000}
                cy={p.y * 1000}
                rx={(4 / width) * 1000}
                ry={(4 / height) * 1000}
                fill="#ffffff"
              />
            ))}
          </g>
        )}
      </svg>
      {filters.labels &&
        objects.map((original) => {
          const object = viewObject(original);
          return (
            <button
              key={object.id}
              className={`spatial-label ${s.selectedObject === object.id ? "selected" : ""}`}
              style={{
                left: `${object.geometry.points[0].x * 100}%`,
                top: `${object.geometry.points[0].y * 100}%`,
                opacity: dim(object) ? 0.35 : 1,
                pointerEvents: drawing.tool === "select" ? "auto" : "none",
              }}
              draggable={drawing.editable && drawing.tool === "select"}
              onDragStart={(e) => {
                e.dataTransfer.setData(SPATIAL_MIME, object.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => s.selectObject(object.id)}
              title="Drag into graph to create an operator"
            >
              {object.geometry.kind === "gate" ? "↗" : "⬡"} {object.name}
              <span>⠿</span>
            </button>
          );
        })}
    </>
  );
}
