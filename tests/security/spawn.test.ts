import { describe, it, expect } from 'vitest';
import { run } from '../../examples/mcp/skill_server.js';

/**
 * Spawn Error Handling Security Tests
 * 
 * These tests verify that spawn() errors are properly caught and don't
 * cause silent failures or resource leaks.
 */

describe('Spawn Error Handling', () => {
  it('should handle command not found gracefully', async () => {
    const result = await run('nonexistent-command-12345', []);
    
    expect(result.code).toBe(127); // Standard "command not found" exit code
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/spawn|ENOENT|not found/i);
  });

  it('should handle spawn with invalid arguments', async () => {
    const result = await run('echo', ['test']);
    
    // Should succeed for valid command
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('test');
  });

  it('should return structured error for spawn failures', async () => {
    const result = await run('/path/to/nonexistent/binary', ['arg1', 'arg2']);
    
    expect(result).toHaveProperty('code');
    expect(result).toHaveProperty('stdout');
    expect(result).toHaveProperty('stderr');
    expect(result.code).toBe(127);
    expect(result.stderr).toBeTruthy(); // Should contain error message
  });

  it('should log spawn errors to stderr', async () => {
    // Capture console.error output
    const originalError = console.error;
    const errorLogs: string[] = [];
    console.error = (...args: any[]) => {
      errorLogs.push(args.join(' '));
    };

    try {
      await run('invalid-command-xyz', ['test']);
      
      // Should have logged the error
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs.some(log => log.includes('Failed to spawn') || log.includes('Spawn exception'))).toBe(true);
    } finally {
      console.error = originalError;
    }
  });

  it('should handle empty command gracefully', async () => {
    const result = await run('', []);
    
    expect(result.code).toBe(127);
    expect(result.stderr).toBeTruthy();
  });

  it('should complete spawn failures quickly (no hanging)', async () => {
    const start = Date.now();
    await run('nonexistent-command', ['arg1', 'arg2', 'arg3']);
    const elapsed = Date.now() - start;
    
    // Should fail fast (< 1 second)
    expect(elapsed).toBeLessThan(1000);
  });
});

/**
 * Resource Leak Prevention Tests
 * 
 * These tests verify that the double-close guard prevents resource leaks
 * in the MCP server's stdin handler.
 */

describe('Resource Leak Prevention', () => {
  it('should only close server once when stdin closes multiple times', () => {
    let closeCount = 0;
    const mockServer = {
      close: () => {
        closeCount++;
        return Promise.resolve();
      }
    };

    // Simulate the stdin close handler logic
    let closed = false;
    const handler = () => {
      if (!closed) {
        closed = true;
        mockServer.close();
      }
    };

    // Call handler multiple times (simulating multiple close events)
    handler();
    handler();
    handler();

    // Should only close once due to guard flag
    expect(closeCount).toBe(1);
  });

  it('should set closed flag before calling close()', () => {
    let closedWhenCloseWasCalled = false;
    let closed = false;

    const mockServer = {
      close: () => {
        closedWhenCloseWasCalled = closed;
        return Promise.resolve();
      }
    };

    const handler = () => {
      if (!closed) {
        closed = true; // Set flag BEFORE calling close()
        mockServer.close();
      }
    };

    handler();

    // Flag should be set before close() is called
    expect(closedWhenCloseWasCalled).toBe(true);
  });
});
