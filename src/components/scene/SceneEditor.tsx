import { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  Camera,
  SlidersHorizontal,
  Radio,
  ChevronDown,
  Check,
  LockKeyhole,
} from "lucide-react";
import { useStudio } from "@/stores/studio";
import { Button } from "@/components/ui/button";
import { useSceneDrawing } from "@/hooks/useSceneDrawing";
import { useWhep, type WhepSource } from "@/hooks/useWhep";
import { SceneOverlay, type SceneFilters } from "./SceneOverlay";
import { SceneTools } from "./SceneTools";
import { SceneObjects } from "./SceneObjects";
import { SourceDialog } from "./SourceDialog";
export function SceneEditor() {
  const s = useStudio(),
    drawing = useSceneDrawing(),
    [filters, setFilters] = useState<SceneFilters>({
      gates: true,
      zones: true,
      labels: true,
      mock: false,
      all: false,
    }),
    [objects, setObjects] = useState(false),
    [expanded, setExpanded] = useState(false),
    [sourceOpen, setSourceOpen] = useState(false),
    [source, setSource] = useState<WhepSource | null>(null),
    [liveRatio, setLiveRatio] = useState(16 / 9);
  const { stream, status } = useWhep(source),
    container = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null),
    [size, setSize] = useState({ width: 600, height: 337.5 });
  const ratio = stream ? liveRatio : (s.scene?.aspectRatio ?? 16 / 9);
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const w = Math.min(width, height * ratio);
      setSize({ width: w, height: w / ratio });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ratio]);
  useEffect(() => {
    if (video.current) {
      video.current.srcObject = stream;
      if (stream) void video.current.play().catch(() => {});
    }
  }, [stream]);
  useEffect(() => {
    setObjects(false);
  }, [s.active?.id]);
  useEffect(() => {
    if (s.selectedObject) {
      setObjects(true);
      setExpanded(false);
    } else setObjects(false);
  }, [s.selectedObject]);
  if (!s.scene) return <section className="column" />;
  const toggle = (key: keyof SceneFilters) =>
    setFilters({ ...filters, [key]: !filters[key] });
  return (
    <section className="column scene-column">
      <header className="panel-header scene-header">
        <Camera size={19} />
        <div className="min-w-0 flex-1">
          <span className="eyebrow">CAMERA SCENE</span>
          <h2 className="truncate">{source?.cameraName ?? s.scene.name}</h2>
        </div>
        <span
          className={`scene-source-indicator ${stream ? "online" : ""}`}
          title={status}
        />
        <Button
          size="icon"
          variant="ghost"
          aria-label="Camera source"
          onClick={() => setSourceOpen(true)}
        >
          <SlidersHorizontal />
        </Button>
      </header>
      <div className="scene-filters">
        <span className="filter-label">SHOW</span>
        {(["gates", "zones", "labels", "mock", "all"] as const).map((key) => (
          <button
            key={key}
            className={filters[key] ? "on" : ""}
            onClick={() => toggle(key)}
            aria-pressed={filters[key]}
          >
            {filters[key] && <Check size={10} />}
            {
              {
                gates: "Gates",
                zones: "Zones",
                labels: "Labels",
                mock: "Mock",
                all: "All",
              }[key]
            }
          </button>
        ))}
        <button className="source-select" onClick={() => setSourceOpen(true)}>
          {source ? "AI stream" : "Local scene"}
          <ChevronDown size={11} />
        </button>
      </div>
      <div className="camera-content">
        <SceneTools
          drawing={drawing}
          objects={objects && expanded}
          toggleObjects={() => {
            setExpanded(!objects || !expanded);
            setObjects(!objects || !expanded);
          }}
        />
        <div ref={container} className="scene-stage-container">
          <div
            className="scene-stage"
            style={{ width: size.width, height: size.height }}
          >
            {s.scene.mediaType === "image" ? (
              <img
                src={s.scene.background}
                alt="Camera scene background"
                draggable={false}
              />
            ) : (
              <video
                key={s.scene.background}
                src={s.scene.background}
                autoPlay
                loop
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  e.currentTarget.play().catch(() => {});
                }}
              />
            )}
            <video
              ref={video}
              autoPlay
              muted
              playsInline
              className={`live-video ${stream ? "visible" : "hidden"}`}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth) setLiveRatio(v.videoWidth / v.videoHeight);
              }}
            />
            <SceneOverlay
              drawing={drawing}
              filters={filters}
              width={size.width || 1}
              height={size.height || 1}
            />
          </div>
        </div>
        <div className="scene-instructions">
          {drawing.tool === "gate" ? (
            <>
              <span className="instruction-dot" />
              Click and drag to draw a gate
            </>
          ) : drawing.tool === "zone" ? (
            <>
              <span className="instruction-dot" />
              Drag an outline, or click vertices · Enter to finish{" "}
            </>
          ) : (
            <>
              <span className="instruction-dot" />
              {drawing.editable ? (
                "Draw on camera. Drag labels into the graph."
              ) : (
                <>
                  <LockKeyhole size={11} />
                  Click a gate/zone to edit · or use Draw Gate / Draw Zone
                </>
              )}
            </>
          )}
        </div>
        {objects && (
          <SceneObjects
            close={() => setObjects(false)}
            editable={drawing.editable}
            compact={!expanded}
          />
        )}
        <div className="camera-watermark">
          <Camera size={12} /> VQEC VISION
        </div>
      </div>
      <footer className="scene-footer">
        <span>
          <Radio size={12} />
          {status}
        </span>
        <span>
          {source ? "WHEP" : "LOCAL"} · {drawing.editable ? "EDIT" : "VIEW"}
        </span>
      </footer>
      <SourceDialog
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        connect={setSource}
        disconnect={() => setSource(null)}
        editable={drawing.editable}
      />
    </section>
  );
}
