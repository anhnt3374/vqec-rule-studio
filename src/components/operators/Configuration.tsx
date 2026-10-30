import { X, LocateFixed, LockKeyhole } from "lucide-react";
import { useStudio } from "@/stores/studio";
import { definition } from "@/data/operators";
import { Button } from "@/components/ui/button";
import { OperatorIcon } from "./icons";
import { nodeErrors } from "@/features/graph-editor/validation";
import type { OperatorConfig } from "@/models/types";
export function Configuration() {
  const s = useStudio(),
    node = s.active?.graph.nodes.find((n) => n.id === s.selectedNode);
  if (!node || !s.inspector || !s.scene) return null;
  const { kind, config } = node.data,
    def = definition(kind),
    locked = !s.editing || s.busy,
    system = s.active?.type === "System";
  const change = (patch: Partial<OperatorConfig>) =>
    s.config(node.id, { ...config, ...patch });
  const errors = nodeErrors(node, s.scene),
    spatial = kind === "gate" || kind === "zone";
  return (
    <section className="config-panel" aria-label="Operator configuration">
      <header>
        <span style={{ color: def.color }}>
          <OperatorIcon kind={kind} />
        </span>
        <div>
          <span className="eyebrow">{def.category.toUpperCase()} OPERATOR</span>
          <h3>{def.name}</h3>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Close configuration"
          onClick={() => useStudio.setState({ inspector: false })}
        >
          <X />
        </Button>
      </header>
      <div className="config-fields">
        <label className="field">
          Display name
          <input
            value={config.name}
            disabled={locked || system}
            onChange={(e) => change({ name: e.target.value })}
          />
        </label>
        {spatial && (
          <>
            <label className="field">
              Referenced {kind}
              <select
                value={config.spatialId ?? ""}
                disabled={locked}
                onChange={(e) => {
                  change({ spatialId: e.target.value });
                  useStudio.setState({ selectedObject: e.target.value });
                }}
              >
                <option value="">Select an existing {kind}</option>
                {s.scene.objects
                  .filter((o) => o.geometry.kind === kind)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </label>
            {kind === "gate" ? (
              <label className="field">
                Crossing direction
                <select
                  value={config.direction ?? "Both"}
                  disabled={locked}
                  onChange={(e) =>
                    change({
                      direction: e.target.value as OperatorConfig["direction"],
                    })
                  }
                >
                  {["Positive", "Negative", "Both"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field">
                Presence mode
                <select
                  value={config.mode ?? "Inside"}
                  disabled={locked || system}
                  onChange={(e) =>
                    change({ mode: e.target.value as OperatorConfig["mode"] })
                  }
                >
                  {["Inside", "Outside", "Enter", "Exit"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}
            <Button
              variant="outline"
              className="w-full"
              disabled={!config.spatialId}
              onClick={() =>
                useStudio.setState({
                  selectedObject: config.spatialId,
                  notice: `${kind === "gate" ? "Gate" : "Zone"} highlighted in camera. Use Select to edit geometry.`,
                })
              }
            >
              <LocateFixed />
              Locate in camera
            </Button>
          </>
        )}
        {def.category === "Property" && (
          <>
            <label className="field">
              Property name
              <input
                disabled={locked || system}
                value={config.property ?? ""}
                onChange={(e) => change({ property: e.target.value })}
                placeholder="e.g. object.category"
              />
            </label>
            <label className="field">
              Comparison
              <select
                disabled={locked || system}
                value={config.comparison ?? "equals"}
                onChange={(e) => change({ comparison: e.target.value })}
              >
                {[
                  "equals",
                  "not equals",
                  "contains",
                  "greater than",
                  "less than",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Value
              <input
                disabled={locked || system}
                value={config.value ?? ""}
                onChange={(e) => change({ value: e.target.value })}
                placeholder="e.g. Person"
              />
            </label>
          </>
        )}
        {def.category === "Set" && (
          <>
            <label className="field">
              Set operator
              <input readOnly value={def.name} />
            </label>
            <div className="info-box">
              {s.active?.graph.edges.filter((e) => e.target === node.id).length}{" "}
              input connection(s). Connect nodes on the canvas to configure
              inputs.
            </div>
          </>
        )}
        {def.category === "Time" &&
          (kind === "schedule" ? (
            <label className="field">
              Schedule
              <input
                disabled={locked || system}
                value={config.schedule ?? ""}
                onChange={(e) => change({ schedule: e.target.value })}
                placeholder="Mon–Fri 09:00–18:00"
              />
            </label>
          ) : (
            <label className="field">
              {kind === "within"
                ? "Time window"
                : kind === "sequence"
                  ? "Sequence window"
                  : "Duration"}{" "}
              (seconds)
              <input
                type="number"
                min="0.1"
                step="0.1"
                disabled={locked || system}
                value={config.seconds ?? ""}
                onChange={(e) =>
                  change({
                    seconds:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  })
                }
              />
            </label>
          ))}
        {kind === "event" && (
          <>
            <label className="field">
              Event name
              <input
                disabled={locked || system}
                value={config.eventName ?? ""}
                onChange={(e) => change({ eventName: e.target.value })}
              />
            </label>
            <label className="field">
              Event type
              <select
                disabled={locked || system}
                value={config.eventType ?? "Custom"}
                onChange={(e) => change({ eventType: e.target.value })}
              >
                {["Custom", "Alert", "Attendance", "Notification"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Description
              <textarea
                disabled={locked || system}
                value={config.description ?? ""}
                onChange={(e) => change({ description: e.target.value })}
              />
            </label>
          </>
        )}
        {kind === "movement" && (
          <label className="field">
            Movement description
            <input
              disabled={locked || system}
              value={config.description ?? ""}
              onChange={(e) => change({ description: e.target.value })}
              placeholder="e.g. moving north"
            />
          </label>
        )}
        {errors.length > 0 && (
          <div className="validation-note">
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        )}
        <p className="config-footnote">
          {system ? (
            <>
              <LockKeyhole size={12} />
              System template · only spatial reference and gate direction can
              change.
            </>
          ) : locked ? (
            "View mode · enter Edit to change properties."
          ) : (
            "Changes remain unsaved until you save the draft."
          )}
        </p>
      </div>
    </section>
  );
}
