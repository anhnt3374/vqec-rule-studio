import type { Rule, CameraScene } from '@/models/types';
import { makeNode } from '@/data/operators';
export function compileAttendance(rule: Rule, scene: CameraScene) {
  const { nodes, edges } = rule.graph;
  const category = nodes.find(n => n.data.kind === 'category');
  const gate = nodes.find(n => n.data.kind === 'gate');
  const event = nodes.find(n => n.data.kind === 'event');
  const highlight = nodes.find(n => n.data.kind === 'highlight');
  const chain = [category, gate, ...(highlight ? [highlight] : []), event];
  if (!category || !gate || !event || nodes.length !== chain.length || edges.length !== chain.length-1 ||
      chain.some((n,i)=>!n || (i>0 && !edges.some(e=>e.source===chain[i-1]!.id && e.target===n.id))))
    throw new Error('Runtime supports Category → Gate → optional Highlight → Attendance only.');
  const values = (category.data.config.value ?? '').toLowerCase().split(/[|,]/).map(v => v.trim());
  if (category.data.config.property !== 'category' || category.data.config.comparison !== 'equals' || !values.length ||
      values.some(v => !['person', 'pedestrian'].includes(v)))
    throw new Error('Attendance category must be person or pedestrian.');
  if (event.data.config.eventName?.toLowerCase() !== 'attendance')
    throw new Error('Runtime output must be Attendance.');
  const geometry = scene.objects.find(o => o.id === gate.data.config.spatialId)?.geometry;
  if (!geometry || geometry.kind !== 'gate' || !['Positive', 'Negative'].includes(gate.data.config.direction ?? ''))
    throw new Error('Choose a finite gate and one crossing direction.');
  const color = highlight?.data.config.highlightColor ?? '#ff0000';
  if (highlight && !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Choose a six-digit Highlight color.');
  const [a,b] = geometry.points;
  return {kind:'attendance',x1:a.x,y1:a.y,x2:b.x,y2:b.y,
    direction:geometry.positive * (gate.data.config.direction === 'Negative' ? -1 : 1),
    highlight:{enabled:!!highlight && highlight.data.config.highlightEnabled!==false,color,lifetime:'track'}};
}
// Add the explicit Highlight template as an unpublished draft; preserve history.
export function normalizeSystemAttendance(rule: Rule): Rule {
  if (rule.type !== 'System' || rule.name !== 'Attendance' || rule.graph.nodes.length !== 3) return rule;
  const category=rule.graph.nodes.find(n=>n.data.kind==='category');
  const gate=rule.graph.nodes.find(n=>n.data.kind==='gate');
  const event=rule.graph.nodes.find(n=>n.data.kind==='event');
  if (!category || !gate || !event) return rule;
  const highlight=makeNode('highlight',{x:180,y:500});
  highlight.id=rule.id+':highlight';
  const nodes=[{...category,position:{x:180,y:40}},{...gate,position:{x:180,y:270}},highlight,
    {...event,position:{x:180,y:730}}];
  return {...rule,status:'Draft',graph:{...rule.graph,nodes,edges:nodes.slice(1).map((node,i)=>({
    id:`${rule.id}:attendance:${i}`,source:nodes[i].id,target:node.id,sourceHandle:'out',targetHandle:'in',
  }))}};
}
