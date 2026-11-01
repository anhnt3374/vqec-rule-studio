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
    expect(rules[0].graph.nodes.map(n => n.data.kind)).toEqual(['category', 'gate', 'event']);
  });
  it('upgrades legacy system ordering while preserving gate settings', () => {
    const { scene, rules } = seed();
    const rule = structuredClone(rules[0]);
    const [category,gate,event] = rule.graph.nodes;
    gate.data.config.direction = 'Negative';
    rule.graph.nodes = [gate,category,event];
    const upgraded = normalizeSystemAttendance(rule);
    expect(upgraded.graph.nodes.map(n=>n.data.kind)).toEqual(['category','gate','event']);
    expect(compileAttendance(upgraded,scene).direction).toBe(-1);
    expect(rule.graph.nodes[0].data.kind).toBe('gate');
  });
  it('rejects unsupported category instead of silently running person filter', () => {
    const { scene, rules } = seed();
    rules[0].graph.nodes[0].data.config.value = 'Car';
    expect(() => compileAttendance(rules[0], scene)).toThrow();
  });
  it('rejects unconnected graph', () => {
    const { scene, rules } = seed();
    rules[0].graph.edges = [];
    expect(() => compileAttendance(rules[0], scene)).toThrow();
  });
});
