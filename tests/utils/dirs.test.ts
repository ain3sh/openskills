import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { homedir } from 'os';
import { getSkillsDir, getSearchDirs, getAllSkillSources } from '../../src/utils/dirs.js';

describe('getSkillsDir', () => {
  it('should return global .openskills dir by default', () => {
    const dir = getSkillsDir();
    expect(dir).toBe(join(homedir(), '.openskills/skills'));
  });

  it('should return project .openskills dir when projectLocal is true', () => {
    const dir = getSkillsDir(true);
    expect(dir).toBe(join(process.cwd(), '.openskills/skills'));
  });

  it('should return global .agent dir when universal is true', () => {
    const dir = getSkillsDir(false, true);
    expect(dir).toBe(join(homedir(), '.agent/skills'));
  });

  it('should return project .agent dir when both projectLocal and universal are true', () => {
    const dir = getSkillsDir(true, true);
    expect(dir).toBe(join(process.cwd(), '.agent/skills'));
  });
});

describe('getSearchDirs', () => {
  it('should return all dirs in priority order', () => {
    const dirs = getSearchDirs();
    expect(dirs).toHaveLength(6);
    expect(dirs[0]).toBe(join(process.cwd(), '.openskills/skills'));
    expect(dirs[1]).toBe(join(process.cwd(), '.agent/skills'));
    expect(dirs[2]).toBe(join(homedir(), '.openskills/skills'));
    expect(dirs[3]).toBe(join(homedir(), '.agent/skills'));
    expect(dirs[4]).toBe(join(process.cwd(), '.claude/skills'));
    expect(dirs[5]).toBe(join(homedir(), '.claude/skills'));
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
    
    // Project sources should have priority 1-3
    const projectSources = sources.filter(s => s.type === 'project');
    expect(projectSources.every(s => s.priority >= 1 && s.priority <= 3)).toBe(true);
    
    // User sources should have priority 4-6
    const userSources = sources.filter(s => s.type === 'user');
    expect(userSources.every(s => s.priority >= 4 && s.priority <= 6)).toBe(true);
    
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
});
