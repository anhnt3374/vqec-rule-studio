import { useState, useRef, type PointerEvent } from "react";
import { Navigation } from "./Navigation";
import { GraphWorkspace } from "@/components/graph/GraphWorkspace";
import { SceneEditor } from "@/components/scene/SceneEditor";
export function Workspace() {
  const root = useRef<HTMLDivElement>(null),
    [columns, setColumns] = useState([20, 50, 30]);
  function resize(e: PointerEvent<HTMLDivElement>, index: number) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const start = e.clientX,
      initial = [...columns],
      width = root.current!.clientWidth;
    const element = e.currentTarget;
    const move = (event: globalThis.PointerEvent) => {
      const delta = ((event.clientX - start) / width) * 100,
        next = [...initial],
        minimum = [220, 400, 320].map((v) => (v / width) * 100);
      const amount = Math.max(
        minimum[index] - initial[index],
        Math.min(delta, initial[index + 1] - minimum[index + 1]),
      );
      next[index] += amount;
      next[index + 1] -= amount;
      setColumns(next);
    };
    const up = () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
  }
  const splitter = (index: number) => (
    <div
      className="splitter"
      role="separator"
      aria-label={
        index === 0 ? "Resize navigation and graph" : "Resize graph and camera"
      }
      aria-orientation="vertical"
      aria-valuenow={Math.round(columns[index])}
      tabIndex={0}
      onPointerDown={(e) => resize(e, index)}
      onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
        e.preventDefault();
        const next = [...columns],
          delta = e.key === "ArrowLeft" ? -1 : 1,
          width = root.current!.clientWidth,
          min = [220, 400, 320].map((v) => (v / width) * 100);
        if (
          next[index] + delta >= min[index] &&
          next[index + 1] - delta >= min[index + 1]
        ) {
          next[index] += delta;
          next[index + 1] -= delta;
          setColumns(next);
        }
      }}
    >
      <span />
    </div>
  );
  return (
    <main
      ref={root}
      className="workspace"
      style={{
        gridTemplateColumns: `minmax(220px,${columns[0]}fr) 8px minmax(400px,${columns[1]}fr) 8px minmax(320px,${columns[2]}fr)`,
      }}
    >
      <Navigation />
      {splitter(0)}
      <GraphWorkspace />
      {splitter(1)}
      <SceneEditor />
    </main>
  );
}
