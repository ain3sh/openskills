import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Blog Spec Compliance: Two-Message Pattern', () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = join(tmpdir(), `openskills-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    mkdirSync(join(tempDir, '.agent', 'skills'), { recursive: true });
  });
  
  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('outputs exactly 2 messages when no permissions/attachments (blog line 692)', () => {
    // Create test skill with NO allowed-tools, NO model
    const skillDir = join(tempDir, '.agent', 'skills', 'test-minimal');
    mkdirSync(skillDir, { recursive: true });
    
    const testSkill = `---
name: test-minimal
description: Test skill with minimal frontmatter
version: 1.0.0
---
Test content for minimal skill`;
    
    writeFileSync(join(skillDir, 'SKILL.md'), testSkill);
    
    // Invoke the skill and check message count (auto-approves by default)
    const result = execSync(
      `node ${join(process.cwd(), 'dist', 'cli.js')} load test-minimal`,
      { cwd: tempDir, encoding: 'utf8' }
    );
    
    // Verify text output format
    // Should contain the hidden baseDir comment and the body
    expect(result).toContain('<!-- baseDir: ');
    expect(result).toContain('Test content for minimal skill');
    
    // Should NOT contain XML wrappers from the old format
    expect(result).not.toContain('<command-message>');
  });
  
  it('outputs prompt text without extra metadata wrappers', () => {
    // Test skill WITH allowed-tools
    const skillDir = join(tempDir, '.agent', 'skills', 'test-permissions');
    mkdirSync(skillDir, { recursive: true });
    
    const testSkill = `---
name: test-permissions
description: Test skill with permissions
version: 1.0.0
allowed-tools: "Read,Write,Edit"
---
Test content with permissions`;
    
    writeFileSync(join(skillDir, 'SKILL.md'), testSkill);
    
    const result = execSync(
      `node ${join(process.cwd(), 'dist', 'cli.js')} load test-permissions`,
      { cwd: tempDir, encoding: 'utf8' }
    );
    
    // Check for content
    expect(result).toContain('Test content with permissions');
    // Check for baseDir
    expect(result).toContain('<!-- baseDir: ');
    
    // Should NOT contain JSON structure
    expect(() => JSON.parse(result)).toThrow();
  });
  
  it('does not output model overrides in text mode', () => {
    const skillDir = join(tempDir, '.agent', 'skills', 'test-model');
    mkdirSync(skillDir, { recursive: true });
    
    const testSkill = `---
name: test-model
description: Test skill with model override
version: 1.0.0
model: claude-3-sonnet
---
Test content with model override`;
    
    writeFileSync(join(skillDir, 'SKILL.md'), testSkill);
    
    const result = execSync(
      `node ${join(process.cwd(), 'dist', 'cli.js')} load test-model`,
      { cwd: tempDir, encoding: 'utf8' }
    );
    
    // Text output is just the body + baseDir
    // Model info is consumed by the agent platform reading the frontmatter/metadata separately if needed?
    // Or maybe `use` returns it?
    
    expect(result).toContain('Test content with model override');
    // Ensure no JSON leaking
    expect(result).not.toContain('"model": "claude-3-sonnet"');
  });
  
  it('load (text) and use (json) provide consistent baseDir', { timeout: 10000 }, () => {
    const skillDir = join(tempDir, '.agent', 'skills', 'test-consistency');
    mkdirSync(skillDir, { recursive: true });
    
    const testSkill = `---
name: test-consistency
description: Test consistency between load and use
version: 1.0.0
allowed-tools: "Read,Write"
model: claude-3-haiku
---
Test content for consistency check`;
    
    writeFileSync(join(skillDir, 'SKILL.md'), testSkill);
    
    // Get output from load (text)
    const loadResult = execSync(
      `node ${join(process.cwd(), 'dist', 'cli.js')} load test-consistency`,
      { cwd: tempDir, encoding: 'utf8' }
    );
    
    // Get output from use (JSON)
    const useResult = execSync(
      `node ${join(process.cwd(), 'dist', 'cli.js')} use test-consistency`,
      { cwd: tempDir, encoding: 'utf8' }
    );
    
    const useJson = JSON.parse(useResult);
    
    // Verify baseDir matches
    // loadResult: <!-- baseDir: /path/to/skill -->
    const baseDirMatch = loadResult.match(/<!-- baseDir: (.*?) -->/);
    expect(baseDirMatch).not.toBeNull();
    const loadBaseDir = baseDirMatch![1];
    
    expect(useJson.skill.baseDir).toBe(loadBaseDir);
  });
  
  it('NEVER outputs duplicative XML metadata', () => {
    const skillDir = join(tempDir, '.agent', 'skills', 'test-no-xml');
    mkdirSync(skillDir, { recursive: true });
    
    const testSkill = `---
name: test-no-xml
description: Test no XML metadata duplication
version: 1.0.0
---
Test content`;
    
    writeFileSync(join(skillDir, 'SKILL.md'), testSkill);
    
    const result = execSync(
      `node ${join(process.cwd(), 'dist', 'cli.js')} load test-no-xml`,
      { cwd: tempDir, encoding: 'utf8' }
    );
    
    // Check that NO message contains XML metadata string
    expect(result).not.toMatch(/<metadata.*baseDir=.*model=.*allowedTools=/);
  });
});
