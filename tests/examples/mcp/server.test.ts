import { describe, it, expect } from 'vitest';

// Prevent auto-start of the MCP server when importing the module under test
process.env.OPENSKILLS_MCP_TEST = '1';

import { extractCommand, run } from '../../../examples/mcp/skill_server.js';

describe('MCP Skill server helpers', () => {
  it('accepts args.name as an alias for command', () => {
    expect(extractCommand({ command: 'pdf' })).toBe('pdf');
    expect(extractCommand({ name: 'csv' })).toBe('csv');
    // Prefer command over name if both provided
    expect(extractCommand({ command: 'images', name: 'pdf' })).toBe('images');
    // Missing or invalid
    expect(extractCommand({})).toBeUndefined();
    expect(extractCommand({ command: 123 })).toBeUndefined();
  });

  it('maps spawn failures to code=127 and returns stderr message', async () => {
    const { code, stderr } = await run('definitely-not-a-real-binary-xyz', ['--help']);
    expect(code).toBe(127);
    expect(typeof stderr).toBe('string');
    expect(stderr.length).toBeGreaterThan(0);
  });
});
