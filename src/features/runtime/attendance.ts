import type { Rule, CameraScene } from '@/models/types';
export function compileAttendance(rule: Rule, scene: CameraScene) {
  const { nodes, edges } = rule.graph;
  const category = nodes.find(n => n.data.kind === 'category');
  const gate = nodes.find(n => n.data.kind === 'gate');
  const event = nodes.find(n => n.data.kind === 'event');
  if (nodes.length !== 3 || edges.length !== 2 || !category || !gate || !event ||
      !edges.some(e => e.source === category.id && e.target === gate.id) ||
      !edges.some(e => e.source === gate.id && e.target === event.id))
    throw new Error('Runtime supports Category → Gate → Attendance only.');
  const values = (category.data.config.value ?? '').toLowerCase().split(/[|,]/).map(v => v.trim());
  if (category.data.config.comparison !== 'equals' || !values.length ||
      values.some(v => !['person', 'pedestrian'].includes(v)))
    throw new Error('Attendance category must be person or pedestrian.');
  if (event.data.config.eventName?.toLowerCase() !== 'attendance')
    throw new Error('Runtime output must be Attendance.');
  const geometry = scene.objects.find(o => o.id === gate.data.config.spatialId)?.geometry;
  if (!geometry || geometry.kind !== 'gate' || !['Positive', 'Negative'].includes(gate.data.config.direction ?? ''))
    throw new Error('Choose a finite gate and one crossing direction.');
  const [a,b] = geometry.points;
  return {kind:'attendance',x1:a.x,y1:a.y,x2:b.x,y2:b.y,
    direction:geometry.positive * (gate.data.config.direction === 'Negative' ? -1 : 1)};
}
// Upgrade the old fixed Gate→Category template without overwriting published history.
export function normalizeSystemAttendance(rule: Rule): Rule {
  const [gate, category, event] = rule.graph.nodes;
  if (rule.type !== 'System' || rule.name !== 'Attendance' || rule.graph.nodes.length !== 3 ||
      gate?.data.kind !== 'gate' || category?.data.kind !== 'category' || event?.data.kind !== 'event') return rule;
  return {...rule,status:'Draft',graph:{...rule.graph,nodes:[
    {...category,position:{x:180,y:40}}, {...gate,position:{x:180,y:270}}, {...event,position:{x:180,y:500}},
  ],edges:[
    {id:'attendance-category-gate',source:category.id,target:gate.id,sourceHandle:'out',targetHandle:'in'},
    {id:'attendance-gate-event',source:gate.id,target:event.id,sourceHandle:'out',targetHandle:'in'},
  ]}};
}
