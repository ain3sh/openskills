import { describe, it, expect } from 'vitest';

process.env.OPENSKILLS_MCP_TEST = '1';

describe('MCP content builder prefers JSON when enabled', () => {
  it('returns text by default', async () => {
    delete process.env.OPENSKILLS_MCP_JSON;
    const mod = await import('../../../examples/mcp/skill_server.js');
    const out = mod.buildMcpContent({ ok: true });
    expect(Array.isArray(out)).toBe(true);
    expect(out[0].type).toBe('text');
    expect(typeof out[0].text).toBe('string');
  });

  it('returns json content part when OPENSKILLS_MCP_JSON=1', async () => {
    process.env.OPENSKILLS_MCP_JSON = '1';
    const mod = await import('../../../examples/mcp/skill_server.js');
    const out = mod.buildMcpContent({ ok: true, data: [1,2,3] });
    expect(out[0].type).toBe('json');
    expect(out[0].json).toEqual({ ok: true, data: [1,2,3] });
  });
});
