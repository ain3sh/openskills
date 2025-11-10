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
    mkdirSync(join(tempDir, '.openskills', 'skills'), { recursive: true });
  });
  
  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('outputs exactly 2 messages when no permissions/attachments (blog line 692)', () => {
    // Create test skill with NO allowed-tools, NO model
    const skillDir = join(tempDir, '.openskills', 'skills', 'test-minimal');
    mkdirSync(skillDir, { recursive: true });
    
    const testSkill = `---
name: test-minimal
description: Test skill with minimal frontmatter
version: 1.0.0
---
Test content for minimal skill`;
    
    writeFileSync(join(skillDir, 'SKILL.md'), testSkill);
    
    // Invoke the skill and check message count (--yes to skip permissions, format defaults to json)
    const result = execSync(
      `node ${join(process.cwd(), 'dist', 'cli.js')} read test-minimal --yes`,
      { cwd: tempDir, encoding: 'utf8' }
    );
    
    const json = JSON.parse(result);
    
    // Blog line 692: "two separate user messages"
    expect(json.newMessages.length).toBe(2);
    expect(json.newMessages[0].isMeta).toBe(false); // Message 1: visible
    expect(json.newMessages[1].isMeta).toBe(true);  // Message 2: hidden
  });
  
  it('outputs 3 messages ONLY when permissions present (blog lines 773-783)', () => {
    // Test skill WITH allowed-tools
    const skillDir = join(tempDir, '.openskills', 'skills', 'test-permissions');
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
      `node ${join(process.cwd(), 'dist', 'cli.js')} read test-permissions --yes`,
      { cwd: tempDir, encoding: 'utf8' }
    );
    
    const json = JSON.parse(result);
    
    // Should have 3 messages: 2 base + 1 permission
    expect(json.newMessages.length).toBe(3);
    expect(json.newMessages[2].content).toHaveProperty('type', 'command_permissions');
    expect(json.newMessages[2].content).toHaveProperty('allowedTools');
  });
  
  it('outputs 3 messages when model override present', () => {
    const skillDir = join(tempDir, '.openskills', 'skills', 'test-model');
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
      `node ${join(process.cwd(), 'dist', 'cli.js')} read test-model --yes`,
      { cwd: tempDir, encoding: 'utf8' }
    );
    
    const json = JSON.parse(result);
    
    // Should have 3 messages: 2 base + 1 permission (with model)
    expect(json.newMessages.length).toBe(3);
    expect(json.newMessages[2].content).toHaveProperty('type', 'command_permissions');
    expect(json.newMessages[2].content).toHaveProperty('model', 'claude-3-sonnet');
  });
  
  it('read and invoke produce identical message structures', { timeout: 10000 }, () => {
    const skillDir = join(tempDir, '.openskills', 'skills', 'test-consistency');
    mkdirSync(skillDir, { recursive: true });
    
    const testSkill = `---
name: test-consistency
description: Test consistency between read and invoke
version: 1.0.0
allowed-tools: "Read,Write"
model: claude-3-haiku
---
Test content for consistency check`;
    
    writeFileSync(join(skillDir, 'SKILL.md'), testSkill);
    
    // Get output from read
    const readResult = execSync(
      `node ${join(process.cwd(), 'dist', 'cli.js')} read test-consistency --yes`,
      { cwd: tempDir, encoding: 'utf8' }
    );
    
    // Get output from invoke
    const invokeResult = execSync(
      `node ${join(process.cwd(), 'dist', 'cli.js')} invoke test-consistency --yes`,
      { cwd: tempDir, encoding: 'utf8' }
    );
    
    const readJson = JSON.parse(readResult);
    const invokeJson = JSON.parse(invokeResult);
    
    // Both should have same number of messages
    expect(readJson.newMessages.length).toBe(invokeJson.newMessages.length);
    
    // Both should have permissions message with same structure
    expect(readJson.newMessages[2].content).toMatchObject({
      type: 'command_permissions',
      allowedTools: ['Read', 'Write'],
      model: 'claude-3-haiku'
    });
    
    expect(invokeJson.newMessages[2].content).toMatchObject({
      type: 'command_permissions',
      allowedTools: ['Read', 'Write'],
      model: 'claude-3-haiku'
    });
  });
  
  it('NEVER outputs duplicative XML metadata (no third message)', () => {
    const skillDir = join(tempDir, '.openskills', 'skills', 'test-no-xml');
    mkdirSync(skillDir, { recursive: true });
    
    const testSkill = `---
name: test-no-xml
description: Test no XML metadata duplication
version: 1.0.0
---
Test content`;
    
    writeFileSync(join(skillDir, 'SKILL.md'), testSkill);
    
    const result = execSync(
      `node ${join(process.cwd(), 'dist', 'cli.js')} read test-no-xml --yes`,
      { cwd: tempDir, encoding: 'utf8' }
    );
    
    const json = JSON.parse(result);
    
    // Check that NO message contains XML metadata string
    for (const message of json.newMessages) {
      const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
      expect(content).not.toMatch(/<metadata.*baseDir=.*model=.*allowedTools=/);
    }
  });
});
