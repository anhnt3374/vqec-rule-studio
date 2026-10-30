import type { Point, SpatialObject } from "@/models/types";
export const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function normalized(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): Point {
  return {
    x: clamp((clientX - rect.left) / rect.width),
    y: clamp((clientY - rect.top) / rect.height),
  };
}
export function translate(object: SpatialObject, delta: Point): SpatialObject {
  const points = object.geometry.points;
  const dx = Math.max(
    -Math.min(...points.map((p) => p.x)),
    Math.min(delta.x, 1 - Math.max(...points.map((p) => p.x))),
  );
  const dy = Math.max(
    -Math.min(...points.map((p) => p.y)),
    Math.min(delta.y, 1 - Math.max(...points.map((p) => p.y))),
  );
  return {
    ...object,
    geometry: {
      ...object.geometry,
      points: points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    } as SpatialObject["geometry"],
  };
}
export function gateArrow(
  object: SpatialObject,
  width: number,
  height: number,
) {
  if (object.geometry.kind !== "gate") return null;
  const [a, b] = object.geometry.points,
    dx = (b.x - a.x) * width,
    dy = (b.y - a.y) * height,
    len = Math.hypot(dx, dy) || 1;
  const mid = { x: (a.x + b.x) * 500, y: (a.y + b.y) * 500 },
    sign = object.geometry.positive;
  return {
    x1: mid.x,
    y1: mid.y,
    x2: mid.x - (((dy / len) * sign * 32) / width) * 1000,
    y2: mid.y + (((dx / len) * sign * 32) / height) * 1000,
  };
}
export function hasArea(points: Point[]) {
  return (
    Math.abs(
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p.x * q.y - q.x * p.y;
      }, 0),
    ) > 0.0001
  );
}
// Reduce pointer samples to editable vertices while retaining the drawn outline.
export function simplifyStroke(points: Point[], tolerance = 0.008): Point[] {
  if (points.length <= 2) return points;
  const a = points[0],
    b = points[points.length - 1],
    dx = b.x - a.x,
    dy = b.y - a.y,
    length = dx * dx + dy * dy;
  let max = 0,
    index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i],
      t = length
        ? Math.max(
            0,
            Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length),
          )
        : 0;
    const distance = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
    if (distance > max) {
      max = distance;
      index = i;
    }
  }
  return max > tolerance
    ? [
        ...simplifyStroke(points.slice(0, index + 1), tolerance).slice(0, -1),
        ...simplifyStroke(points.slice(index), tolerance),
      ]
    : [a, b];
}
