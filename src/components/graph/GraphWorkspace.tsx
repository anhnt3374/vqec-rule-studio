import { useState, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  addEdge,
  useReactFlow,
  BackgroundVariant,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import { Workflow, Copy, Trash2, MousePointer2 } from "lucide-react";
import { useStudio } from "@/stores/studio";
import { OperatorNode } from "./OperatorNode";
import { GraphToolbar } from "./GraphToolbar";
import { Configuration } from "@/components/operators/Configuration";
import { Button } from "@/components/ui/button";
import {
  definition,
  OPERATOR_MIME,
  SPATIAL_MIME,
  operators,
} from "@/data/operators";
import { clone } from "@/utils/cn";
import type { OperatorKind } from "@/models/types";
import { useShortcuts } from "@/hooks/useShortcuts";
const nodeTypes = { operator: OperatorNode };
function Canvas() {
  const s = useStudio(),
    flow = useReactFlow(),
    [edgeId, setEdgeId] = useState<string | null>(null);
  const graph = s.active?.graph,
    editable = s.editing && s.active?.type === "Custom" && !s.busy;
  const remove = useCallback(() => {
    const state = useStudio.getState();
    if (!state.active) return;
    const g = state.active.graph;
    if (state.selectedNode) {
      const id = state.selectedNode;
      state.graph({
        nodes: g.nodes.filter((n) => n.id !== id),
        edges: g.edges.filter((e) => e.source !== id && e.target !== id),
      });
      state.selectNode(null);
    } else if (edgeId) {
      state.graph({ ...g, edges: g.edges.filter((e) => e.id !== edgeId) });
      setEdgeId(null);
    }
  }, [edgeId]);
  const duplicate = useCallback(() => {
    const state = useStudio.getState(),
      node = state.active?.graph.nodes.find((n) => n.id === state.selectedNode);
    if (!node || !state.active) return;
    const copy = clone(node);
    copy.id = crypto.randomUUID();
    copy.position = { x: node.position.x + 45, y: node.position.y + 65 };
    copy.data.config.name += " copy";
    state.graph({
      ...state.active.graph,
      nodes: [...state.active.graph.nodes, copy],
    });
    state.selectNode(copy.id, false);
  }, []);
  useShortcuts({ remove, duplicate });
  const onNodesChange = (changes: NodeChange[]) => {
    if (!graph || !editable) return;
    const mutations = changes.filter((c) => c.type === "position");
    if (mutations.length)
      s.graph(
        { ...graph, nodes: applyNodeChanges(mutations, graph.nodes) },
        false,
      );
  };
  const onEdgesChange = (changes: EdgeChange[]) => {
    if (!graph || !editable) return;
    const ids = changes.filter((c) => c.type === "remove").map((c) => c.id);
    if (ids.length)
      s.graph({
        ...graph,
        edges: graph.edges.filter((e) => !ids.includes(e.id)),
      });
  };
  const connect = (connection: Connection) => {
    if (graph && editable)
      s.graph({
        ...graph,
        edges: addEdge({ ...connection, id: crypto.randomUUID() }, graph.edges),
      });
  };
  return (
    <section className="column graph-column">
      <GraphToolbar />
      <div
        className="graph-canvas"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = editable ? "copy" : "none";
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (!editable) return;
          const point = flow.screenToFlowPosition({
            x: e.clientX,
            y: e.clientY,
          });
          const spatial = e.dataTransfer.getData(SPATIAL_MIME),
            kind = e.dataTransfer.getData(OPERATOR_MIME);
          if (spatial) s.spatialDrop(spatial, point);
          else if (operators.some((o) => o.kind === kind))
            s.addNode(kind as OperatorKind, point);
        }}
      >
        <ReactFlow
          key={s.active?.id ?? "empty"}
          nodes={(graph?.nodes ?? []).map((n) => ({
            ...n,
            selected: n.id === s.selectedNode,
          }))}
          edges={(graph?.edges ?? []).map((e) => ({
            ...e,
            selected: e.id === edgeId,
            type: "smoothstep",
          }))}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={connect}
          onNodeDragStart={s.checkpoint}
          onNodeClick={(_, n) => {
            setEdgeId(null);
            s.selectNode(n.id);
          }}
          onNodeDoubleClick={(_, n) => s.selectNode(n.id)}
          onEdgeClick={(_, e) => {
            s.selectNode(null);
            setEdgeId(e.id);
          }}
          onPaneClick={() => {
            s.selectNode(null);
            setEdgeId(null);
          }}
          nodesDraggable={editable}
          nodesConnectable={editable}
          edgesReconnectable={false}
          deleteKeyCode={null}
          elementsSelectable
          fitView
          fitViewOptions={{ padding: 0.22, maxZoom: 1 }}
          minZoom={0.15}
          maxZoom={2}
          colorMode="dark"
          defaultEdgeOptions={{
            style: { stroke: "#647b99", strokeWidth: 1.6 },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1}
            color="#354054"
          />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => definition(n.data.kind as OperatorKind).color}
            maskColor="#0e141dba"
            pannable
            zoomable
          />
        </ReactFlow>
        {!graph?.nodes.length && (
          <div className="canvas-empty">
            <div className="empty-graph-icon">
              <Workflow size={34} />
            </div>
            <span className="eyebrow">BUILD WITH INTENTION</span>
            <h2>
              {s.active
                ? "A blank canvas. Endless possibilities."
                : "Every rule starts with a connection."}
            </h2>
            <p>
              {s.active
                ? "Draw a gate or zone in the camera, then drag its label here. Add operators to shape your configuration."
                : "Open a rule from the left, or create your own. Your graph and camera stay together in one workspace."}
            </p>
            <div className="empty-steps">
              <span>
                01 <small>Draw a region</small>
              </span>
              <i />
              <span>
                02 <small>Add operators</small>
              </span>
              <i />
              <span>
                03 <small>Save your rule</small>
              </span>
            </div>
          </div>
        )}
        {(s.selectedNode || edgeId) && editable && (
          <div className="selection-tools">
            {s.selectedNode && (
              <Button variant="ghost" size="sm" onClick={duplicate}>
                <Copy />
                Duplicate
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={remove}>
              <Trash2 />
              Delete {edgeId ? "edge" : "node"}
            </Button>
          </div>
        )}
        <Configuration />
      </div>
      <footer className="graph-footer">
        <span>
          <MousePointer2 size={12} />
          {graph
            ? `${graph.nodes.length} operators · ${graph.edges.length} connections`
            : "Select a rule to get started"}
        </span>
        <span>Scroll to zoom · Drag to pan</span>
      </footer>
    </section>
  );
}
export function GraphWorkspace() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
