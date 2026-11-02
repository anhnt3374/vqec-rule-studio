import { describe, it, expect } from 'vitest';
import { seed } from '../../src/data/seed';
import { compileAttendance, normalizeSystemAttendance } from '../../src/features/runtime/attendance';
describe('attendance runtime contract', () => {
  it('compiles category → gate → event with downward direction', () => {
    const { scene, rules } = seed();
    const config = compileAttendance(rules[0], scene);
    expect(config.kind).toBe('attendance');
    expect(config.direction).toBe(1);
    expect(config.x1).toBeLessThan(config.x2);
    expect(config.y1).toBe(config.y2);
    expect(rules[0].graph.nodes.map(n => n.data.kind)).toEqual(['category', 'gate', 'highlight', 'event']);
  });
  it('upgrades legacy system ordering while preserving gate settings', () => {
    const { scene, rules } = seed();
    const rule = structuredClone(rules[0]);
    const [category,gate] = rule.graph.nodes;
    const event=rule.graph.nodes.find(n=>n.data.kind==='event')!;
    gate.data.config.direction = 'Negative';
    rule.graph.nodes = [gate,category,event];
    const upgraded = normalizeSystemAttendance(rule);
    expect(upgraded.graph.nodes.map(n=>n.data.kind)).toEqual(['category','gate','highlight','event']);
    expect(compileAttendance(upgraded,scene).direction).toBe(-1);
    expect(rule.graph.nodes[0].data.kind).toBe('gate');
  });
  it('compiles the configured Highlight color and disable switch', () => {
    const { scene, rules }=seed();
    const node=rules[0].graph.nodes.find(n=>n.data.kind==='highlight')!;
    node.data.config.highlightColor='#12abef';
    expect(compileAttendance(rules[0],scene).highlight).toEqual({enabled:true,color:'#12abef',lifetime:'track'});
    node.data.config.highlightEnabled=false;
    expect(compileAttendance(rules[0],scene).highlight.enabled).toBe(false);
    node.data.config.highlightColor='red';
    expect(()=>compileAttendance(rules[0],scene)).toThrow();
  });
  it('no Highlight node means no drawing instruction',()=>{
    const {scene,rules}=seed(); const rule=rules[0];
    rule.graph.nodes=rule.graph.nodes.filter(n=>n.data.kind!=='highlight');
    const [category,gate,event]=rule.graph.nodes;
    rule.graph.edges=[{id:'a',source:category.id,target:gate.id},{id:'b',source:gate.id,target:event.id}];
    expect(compileAttendance(rule,scene).highlight.enabled).toBe(false);
  });
  it('rejects unsupported category instead of silently running person filter', () => {
    const { scene, rules } = seed();
    rules[0].graph.nodes[0].data.config.value = 'Car';
    expect(() => compileAttendance(rules[0], scene)).toThrow();
  });
  it('rejects a category node with a mismatched metadata key', () => {
    const { scene, rules } = seed();
    rules[0].graph.nodes[0].data.config.property = 'identity';
    expect(() => compileAttendance(rules[0], scene)).toThrow();
  });
  it('rejects unconnected graph', () => {
    const { scene, rules } = seed();
    rules[0].graph.edges = [];
    expect(() => compileAttendance(rules[0], scene)).toThrow();
  });
});
