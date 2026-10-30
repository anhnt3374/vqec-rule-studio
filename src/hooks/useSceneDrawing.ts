import { useState, useRef, useEffect } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { canEditScene } from "@/stores/scene";
import { useStudio } from "@/stores/studio";
import type { Point, SpatialObject } from "@/models/types";
import {
  normalized,
  translate,
  hasArea,
  simplifyStroke,
} from "@/features/scene-editor/geometry";
export type SceneTool = "select" | "gate" | "zone";
interface Drag {
  object: SpatialObject;
  start: Point;
  vertex?: number;
}
export function useSceneDrawing() {
  const s = useStudio(),
    [tool, setTool] = useState<SceneTool>("select"),
    [points, setPoints] = useState<Point[]>([]),
    [preview, setPreview] = useState<SpatialObject | null>(null);
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<Drag | null>(null),
    gateStart = useRef<Point | null>(null),
    zoneStroke = useRef<Point[] | null>(null);
  const editable = canEditScene(s);
  const point = (e: ReactPointerEvent) =>
    normalized(e.clientX, e.clientY, svg.current!.getBoundingClientRect());
  function clear() {
    setPoints([]);
    setPreview(null);
    drag.current = null;
    gateStart.current = null;
    zoneStroke.current = null;
  }
  function choose(next: SceneTool) {
    if (next !== "select" && !useStudio.getState().beginScene()) return;
    clear();
    if (next !== "select") s.selectObject(null);
    setTool(next);
  }
  function createZone(vertices: Point[]) {
    if (
      !useStudio.getState().scene ||
      !canEditScene(useStudio.getState()) ||
      vertices.length < 3
    )
      return;
    if (!hasArea(vertices)) {
      s.notify("Zone needs at least three non-collinear vertices.");
      return;
    }
    s.addObject({
      id: crypto.randomUUID(),
      name: `Zone ${s.scene!.objects.filter((o) => o.geometry.kind === "zone").length + 1}`,
      visible: true,
      geometry: { kind: "zone", points: vertices },
    });
    setPoints([]);
    zoneStroke.current = null;
    setTool("select");
  }
  function complete() {
    createZone(points);
  }
  function down(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0 || !editable || tool === "select") return;
    const p = point(e);
    if (tool === "gate") {
      gateStart.current = p;
      svg.current?.setPointerCapture(e.pointerId);
      setPoints([p, p]);
    }
    if (tool === "zone") {
      if (
        points.length >= 3 &&
        Math.hypot(
          (p.x - points[0].x) * svg.current!.clientWidth,
          (p.y - points[0].y) * svg.current!.clientHeight,
        ) < 12
      ) {
        complete();
        return;
      }
      if (e.detail < 2) {
        if (!points.length) {
          zoneStroke.current = [p];
          svg.current?.setPointerCapture(e.pointerId);
        }
        setPoints([...points, p]);
      }
    }
  }
  function begin(e: ReactPointerEvent, object: SpatialObject, vertex?: number) {
    if (tool !== "select") return;
    e.stopPropagation();
    s.selectObject(object.id);
    if (!editable && !useStudio.getState().beginScene()) return;
    drag.current = { object, start: point(e), vertex };
    setPreview(object);
    svg.current?.setPointerCapture(e.pointerId);
  }
  function move(e: ReactPointerEvent<SVGSVGElement>) {
    const p = point(e);
    if (gateStart.current) setPoints([gateStart.current, p]);
    if (zoneStroke.current) {
      const stroke = zoneStroke.current,
        last = stroke[stroke.length - 1];
      if (
        Math.hypot(
          (p.x - last.x) * svg.current!.clientWidth,
          (p.y - last.y) * svg.current!.clientHeight,
        ) > 6 &&
        stroke.length < 256
      ) {
        stroke.push(p);
        setPoints([...stroke]);
      }
    }
    const d = drag.current;
    if (!d) return;
    if (d.vertex === undefined)
      setPreview(
        translate(d.object, { x: p.x - d.start.x, y: p.y - d.start.y }),
      );
    else
      setPreview({
        ...d.object,
        geometry: {
          ...d.object.geometry,
          points: d.object.geometry.points.map((v, i) =>
            i === d.vertex ? p : v,
          ),
        } as SpatialObject["geometry"],
      });
  }
  function up(e: ReactPointerEvent<SVGSVGElement>) {
    if (zoneStroke.current) {
      const stroke = zoneStroke.current;
      zoneStroke.current = null;
      if (stroke.length > 2 && hasArea(stroke)) {
        const vertices = simplifyStroke(stroke),
          first = vertices[0],
          last = vertices[vertices.length - 1];
        if (
          vertices.length > 3 &&
          Math.hypot(last.x - first.x, last.y - first.y) < 0.02
        )
          vertices.pop();
        createZone(vertices);
      }
    }
    if (gateStart.current) {
      const start = gateStart.current,
        end = point(e);
      if (
        Math.hypot(
          (end.x - start.x) * svg.current!.clientWidth,
          (end.y - start.y) * svg.current!.clientHeight,
        ) > 12
      ) {
        s.addObject({
          id: crypto.randomUUID(),
          name: `Gate ${s.scene!.objects.filter((o) => o.geometry.kind === "gate").length + 1}`,
          visible: true,
          geometry: { kind: "gate", points: [start, end], positive: 1 },
        });
        setTool("select");
      }
      setPoints([]);
      gateStart.current = null;
    }
    if (drag.current && preview) {
      const valid =
        preview.geometry.kind === "gate"
          ? Math.hypot(
              preview.geometry.points[1].x - preview.geometry.points[0].x,
              preview.geometry.points[1].y - preview.geometry.points[0].y,
            ) > 0.005
          : hasArea(preview.geometry.points);
      if (
        valid &&
        JSON.stringify(preview) !== JSON.stringify(drag.current.object)
      )
        s.updateObject(preview);
      drag.current = null;
      setPreview(null);
    }
    if (svg.current?.hasPointerCapture(e.pointerId))
      svg.current.releasePointerCapture(e.pointerId);
  }
  useEffect(() => {
    if (!editable) {
      setPoints([]);
      setPreview(null);
      drag.current = null;
      gateStart.current = null;
      setTool("select");
      zoneStroke.current = null;
    }
  }, [editable, s.active?.id]);
  const pendingOutline = points.length > 0;
  useEffect(() => {
    if (!pendingOutline) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pendingOutline]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          'input,textarea,select,[role="dialog"]',
        )
      )
        return;
      if (e.key === "Escape") {
        clear();
        setTool("select");
      }
      if (e.key === "Enter" && tool === "zone") {
        e.preventDefault();
        complete();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  return {
    svg,
    tool,
    choose,
    points,
    preview,
    editable,
    down,
    move,
    up,
    begin,
    complete,
    clear,
  };
}
