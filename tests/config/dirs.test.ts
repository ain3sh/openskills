import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { homedir } from 'os';
import { getSkillsDir, getAllSkillSources } from '../../src/config/dirs.js';

describe('getSkillsDir', () => {
  it('should return global .agents dir by default', () => {
    const dir = getSkillsDir();
    expect(dir).toBe(join(homedir(), '.agents/skills'));
  });

  it('should return project .agents dir when projectLocal is true', () => {
    const dir = getSkillsDir(true);
    expect(dir).toBe(join(process.cwd(), '.agents/skills'));
  });

  it('should return global .agents dir when universal is false', () => {
    const dir = getSkillsDir(false, false);
    expect(dir).toBe(join(homedir(), '.agents/skills'));
  });

  it('should return project .agents dir when projectLocal is true and universal is false', () => {
    const dir = getSkillsDir(true, false);
    expect(dir).toBe(join(process.cwd(), '.agents/skills'));
  });
});

describe('getAllSkillSources', () => {
  it('should return sources with all types', () => {
    const sources = getAllSkillSources();
    
    // Should have at least project, user, and builtin sources
    expect(sources.length).toBeGreaterThanOrEqual(5);
    
    // Check types are present
    const types = sources.map(s => s.type);
    expect(types).toContain('project');
    expect(types).toContain('user');
    expect(types).toContain('builtin');
    // Plugin sources may or may not exist
  });

  it('should have correct priority ordering', () => {
    const sources = getAllSkillSources();
    
    // Project sources should have priority 1-2
    const projectSources = sources.filter(s => s.type === 'project');
    expect(projectSources.every(s => s.priority >= 1 && s.priority <= 2)).toBe(true);
    
    // User sources should have priority 3-4
    const userSources = sources.filter(s => s.type === 'user');
    expect(userSources.every(s => s.priority >= 3 && s.priority <= 4)).toBe(true);
    
    // Plugin sources should have priority 7+
    const pluginSources = sources.filter(s => s.type === 'plugin');
    expect(pluginSources.every(s => s.priority >= 7 && s.priority < 99)).toBe(true);
    
    // Builtin should have priority 99 (lowest)
    const builtinSources = sources.filter(s => s.type === 'builtin');
    expect(builtinSources.every(s => s.priority === 99)).toBe(true);
  });

  it('should include builtin skills directory', () => {
    const sources = getAllSkillSources();
    const builtinSource = sources.find(s => s.type === 'builtin');
    
    expect(builtinSource).toBeDefined();
    expect(builtinSource?.path).toContain('builtin-skills');
  });

  it('should handle missing plugin directories gracefully', () => {
    // Should not throw even if plugin dirs don't exist
    expect(() => getAllSkillSources()).not.toThrow();
  });

  it('should have unique paths', () => {
    const sources = getAllSkillSources();
    const paths = sources.map(s => s.path);
    const uniquePaths = new Set(paths);
    
    // All paths should be unique
    expect(uniquePaths.size).toBe(paths.length);
  });

  it('should discover nested plugin skills (marketplace pattern)', () => {
    const sources = getAllSkillSources();
    const pluginSources = sources.filter(s => s.type === 'plugin');
    
    // If there are plugin sources, they should have a manifest-derived plugin key.
    if (pluginSources.length > 0) {
      pluginSources.forEach(source => {
        expect(source.pluginId).toBeDefined();
        expect(typeof source.pluginId).toBe('string');
        expect(source.pluginId).toContain('@');
      });
    }
  });

  it('should include pluginId for all plugin sources', () => {
    const sources = getAllSkillSources();
    const pluginSources = sources.filter(s => s.type === 'plugin');
    
    // All plugin sources should have pluginId defined
    pluginSources.forEach(source => {
      expect(source.pluginId).toBeDefined();
      expect(source.pluginId).not.toBe('');
    });
  });

  it('should use plugin@marketplace identifiers for plugin sources', () => {
    const sources = getAllSkillSources();
    const pluginSources = sources.filter(s => s.type === 'plugin');

    if (pluginSources.length > 0) {
      pluginSources.forEach(source => {
        expect(source.pluginId).toMatch(/.+@.+/);
      });
    }
  });
});
