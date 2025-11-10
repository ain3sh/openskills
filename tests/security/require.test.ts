import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

/**
 * Dynamic Require Error Handling Security Tests
 * 
 * These tests verify that dynamic require() calls properly distinguish
 * between MODULE_NOT_FOUND errors and other loading failures.
 */

describe('Dynamic Require Error Handling', () => {
  it('should distinguish MODULE_NOT_FOUND from other errors', () => {
    function testRequire(modulePath: string) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(modulePath);
        return { success: true, module: mod };
      } catch (err: any) {
        const code = err?.code;
        const msg = String(err?.message || err);
        
        if (code === 'MODULE_NOT_FOUND') {
          return { success: false, error: 'MODULE_NOT_FOUND', message: msg };
        }
        return { success: false, error: 'OTHER_ERROR', message: msg };
      }
    }

    // Test 1: Module not found
    const result1 = testRequire('./nonexistent-module-xyz');
    expect(result1.success).toBe(false);
    expect(result1.error).toBe('MODULE_NOT_FOUND');

    // Test 2: Valid module (fs is built-in)
    const result2 = testRequire('fs');
    expect(result2.success).toBe(true);
  });

  it('should provide meaningful error messages', () => {
    function testRequireWithMessages(modulePath: string) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(modulePath);
        return { error: null };
      } catch (err: any) {
        const code = err?.code;
        const msg = String(err?.message || err);
        
        if (code === 'MODULE_NOT_FOUND') {
          return { error: 'Module not available - module not found' };
        }
        return { error: `Failed to load module: ${msg}` };
      }
    }

    const result = testRequireWithMessages('./nonexistent');
    expect(result.error).toContain('module not found');
  });

  it('should handle syntax errors in required modules differently', () => {
    // Create a temporary file with syntax errors
    const tempPath = '/tmp/openskills-test-syntax-error.js';
    try {
      // Write invalid JavaScript
      require('fs').writeFileSync(tempPath, 'this is not valid javascript syntax {{{');
      
      function testRequire(modulePath: string) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const mod = require(modulePath);
          return { error: null };
        } catch (err: any) {
          const code = err?.code;
          const msg = String(err?.message || err);
          
          if (code === 'MODULE_NOT_FOUND') {
            return { error: 'MODULE_NOT_FOUND', code };
          }
          return { error: 'LOAD_FAILED', code, message: msg };
        }
      }

      const result = testRequire(tempPath);
      
      // Should detect as LOAD_FAILED, not MODULE_NOT_FOUND
      expect(result.error).toBe('LOAD_FAILED');
      expect(result.code).not.toBe('MODULE_NOT_FOUND');
    } finally {
      // Cleanup
      try {
        require('fs').unlinkSync(tempPath);
      } catch {}
    }
  });

  it('should handle require of non-existent relative paths', () => {
    function testRequire(modulePath: string) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(modulePath);
        return { found: true };
      } catch (err: any) {
        const code = err?.code;
        return { found: false, code };
      }
    }

    const result = testRequire('./totally/fake/path/module.js');
    expect(result.found).toBe(false);
    expect(result.code).toBe('MODULE_NOT_FOUND');
  });

  it('should handle require of built-in modules successfully', () => {
    function testRequire(modulePath: string) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(modulePath);
        return { success: true, hasExports: Object.keys(mod).length > 0 };
      } catch (err: any) {
        return { success: false, error: err?.code };
      }
    }

    // Test built-in Node.js modules
    const fsResult = testRequire('fs');
    expect(fsResult.success).toBe(true);
    expect(fsResult.hasExports).toBe(true);

    const pathResult = testRequire('path');
    expect(pathResult.success).toBe(true);
    expect(pathResult.hasExports).toBe(true);
  });
});

/**
 * Undefined Access Prevention Tests
 * 
 * These tests verify that type guards prevent undefined access errors.
 */

describe('Undefined Access Prevention', () => {
  it('should handle undefined allowed-tools gracefully', () => {
    function normalizeAllowedTools(allowed: unknown): string[] | undefined {
      return Array.isArray(allowed)
        ? (allowed as string[])
        : (typeof allowed === 'string' ? [allowed] : undefined);
    }

    expect(normalizeAllowedTools(undefined)).toBeUndefined();
    expect(normalizeAllowedTools(null)).toBeUndefined();
    expect(normalizeAllowedTools('Read')).toEqual(['Read']);
    expect(normalizeAllowedTools(['Read', 'Write'])).toEqual(['Read', 'Write']);
    expect(normalizeAllowedTools(123)).toBeUndefined();
    expect(normalizeAllowedTools({})).toBeUndefined();
  });

  it('should not throw when spreading undefined arrays', () => {
    function safeSpread(arr: string[] | undefined): string {
      return (arr || []).join(',');
    }

    expect(safeSpread(undefined)).toBe('');
    expect(safeSpread([])).toBe('');
    expect(safeSpread(['a', 'b'])).toBe('a,b');
  });

  it('should handle mixed type inputs for allowed-tools', () => {
    function normalizeAllowedTools(allowed: unknown): string[] | undefined {
      return Array.isArray(allowed)
        ? (allowed as string[])
        : (typeof allowed === 'string' ? [allowed] : undefined);
    }

    // String
    expect(normalizeAllowedTools('Read')).toEqual(['Read']);
    
    // Array
    expect(normalizeAllowedTools(['Read', 'Write'])).toEqual(['Read', 'Write']);
    
    // Number (should return undefined)
    expect(normalizeAllowedTools(42)).toBeUndefined();
    
    // Object (should return undefined)
    expect(normalizeAllowedTools({ tool: 'Read' })).toBeUndefined();
    
    // Boolean (should return undefined)
    expect(normalizeAllowedTools(true)).toBeUndefined();
    
    // Empty string
    expect(normalizeAllowedTools('')).toEqual(['']);
    
    // Empty array
    expect(normalizeAllowedTools([])).toEqual([]);
  });
});
