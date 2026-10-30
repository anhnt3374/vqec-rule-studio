import { useState } from "react";
import {
  ArrowLeft,
  Search,
  Plus,
  LockKeyhole,
  ChevronRight,
  Workflow,
  Trash2,
} from "lucide-react";
import { useStudio } from "@/stores/studio";
import { Button } from "@/components/ui/button";
import { Status } from "@/components/rules/Status";
import { operators, OPERATOR_MIME } from "@/data/operators";
import { OperatorIcon } from "@/components/operators/icons";
import { Dialog } from "@/components/ui/dialog";
export function Navigation() {
  const s = useStudio(),
    [search, setSearch] = useState(""),
    [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [deleting, setDeleting] = useState<string | null>(null),
    [leave, setLeave] = useState(false);
  const back = () => {
    if (s.dirty) setLeave(true);
    else s.open(null);
  };
  const selected = s.active;
  return (
    <aside className="column navigation">
      <header className="panel-header">
        {selected ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to rules"
              onClick={back}
            >
              <ArrowLeft />
            </Button>
            <div className="min-w-0 flex-1">
              <span className="eyebrow">RULE WORKSPACE</span>
              <h2 className="truncate">{selected.name}</h2>
            </div>
            <Status status={selected.status} compact />
          </>
        ) : (
          <>
            <div className="brand-icon">
              <Workflow size={22} />
            </div>
            <div>
              <span className="eyebrow">VQEC VISION</span>
              <h1>
                Rule Studio<span className="version"> / 01</span>
              </h1>
            </div>
          </>
        )}
      </header>
      <div className="nav-body">
        <div className="section-label">
          {selected ? "OPERATOR LIBRARY" : "YOUR RULES"}
          <span>{selected ? "15" : s.rules.length}</span>
        </div>
        <label className="search">
          <Search size={15} />
          <input
            aria-label={selected ? "Search operators" : "Search rules"}
            placeholder={selected ? "Find an operator…" : "Search rules…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <kbd>⌕</kbd>
        </label>
        {selected ? (
          <>
            <p className="library-hint">
              {selected.type === "System"
                ? "Fixed template · parameters only"
                : s.editing
                  ? "Drag or click to add to the canvas."
                  : "Enter Edit mode to build your graph."}
            </p>
            {(["Spatial", "Property", "Set", "Time", "Output"] as const).map(
              (category) => (
                <section className="operator-group" key={category}>
                  <h3>
                    {category}
                    <span>
                      {operators.filter((o) => o.category === category).length}
                    </span>
                  </h3>
                  {operators
                    .filter(
                      (o) =>
                        o.category === category &&
                        o.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((o) => (
                      <button
                        className="operator-item"
                        key={o.kind}
                        disabled={
                          !s.editing || selected.type === "System" || s.busy
                        }
                        draggable={
                          s.editing && selected.type === "Custom" && !s.busy
                        }
                        onDragStart={(e) => {
                          e.dataTransfer.setData(OPERATOR_MIME, o.kind);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => s.addNode(o.kind)}
                      >
                        <span
                          className="operator-icon"
                          style={{ color: o.color, background: `${o.color}14` }}
                        >
                          <OperatorIcon kind={o.kind} />
                        </span>
                        <span className="operator-title">
                          {o.name}
                          <small>{o.description}</small>
                        </span>
                        <Plus size={13} className="add-symbol" />
                      </button>
                    ))}
                </section>
              ),
            )}
          </>
        ) : (
          <>
            <div className="rules-label">
              CONFIGURATIONS <span>LOCAL</span>
            </div>
            {s.rules
              .filter((r) =>
                r.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((rule) => (
                <div className="rule-card" key={rule.id}>
                  <button
                    className="rule-open"
                    onClick={() => {
                      s.open(rule.id);
                      setSearch("");
                    }}
                  >
                    <div
                      className={`rule-symbol ${rule.type === "System" ? "system" : ""}`}
                    >
                      {rule.type === "System" ? (
                        <LockKeyhole size={18} />
                      ) : (
                        <Workflow size={19} />
                      )}
                    </div>
                    <div className="rule-copy">
                      <strong>{rule.name}</strong>
                      <small>
                        {rule.type} rule · {rule.graph.nodes.length} operators
                      </small>
                      <Status status={rule.status} />
                    </div>
                    <ChevronRight size={14} />
                  </button>
                  {rule.type === "Custom" && (
                    <button
                      aria-label={`Delete ${rule.name}`}
                      className="rule-delete"
                      onClick={() => setDeleting(rule.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            <div className="local-note">
              <span className="local-dot" />
              Stored in this browser
              <p>
                Your workspace is private and saved locally. No analytics are
                executed.
              </p>
            </div>
          </>
        )}
      </div>
      <footer className="nav-footer">
        {selected ? (
          <div className="shortcut-note">
            <kbd>⌘/Ctrl</kbd> + <kbd>S</kbd> Save draft
            <br />
            <span>Drag scene objects to create spatial nodes</span>
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={() => {
              setName("");
              setCreating(true);
            }}
          >
            <Plus />
            Rule
          </Button>
        )}
        <span className="footer-note">
          CONFIGURATION STUDIO · LOCAL PROTOTYPE
        </span>
      </footer>
      <Dialog
        open={creating}
        onOpenChange={setCreating}
        title="Create a rule"
        description="Start with an empty graph. Scene objects are shared between rules."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            s.createRule(name);
            setCreating(false);
            setSearch("");
          }}
        >
          <label className="field">
            Rule name
            <input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Entrance monitoring"
            />
          </label>
          <Button className="mt-5 w-full" type="submit">
            Create rule <ChevronRight />
          </Button>
        </form>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Delete this rule?"
        description="Its draft and published snapshot will be removed. Shared gates and zones will be kept."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Keep rule
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleting) void s.deleteRule(deleting);
              setDeleting(null);
            }}
          >
            Delete rule
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={leave}
        onOpenChange={setLeave}
        title="Discard unsaved changes?"
        description="The rule and scene will return to their last saved state."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLeave(false)}>
            Keep editing
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              s.cancel();
              s.open(null);
              setLeave(false);
              setSearch("");
            }}
          >
            Discard changes
          </Button>
        </div>
      </Dialog>
    </aside>
  );
}
