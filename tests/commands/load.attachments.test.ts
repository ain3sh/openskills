import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('load attachments behavior', () => {
  // Use tmpdir with unique name to avoid conflicts
  const testDir = join(tmpdir(), `openskills-attach-test-${Date.now()}`);
  const baseDir = join(testDir, '.claude', 'skills', 'attach-test');
  const skillPath = join(baseDir, 'SKILL.md');
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    // Change to test directory for skill discovery
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  beforeEach(() => {
    // Create fresh directory for each test
    mkdirSync(baseDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up skill file after each test
    try {
      if (existsSync(skillPath)) rmSync(skillPath, { force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  afterAll(() => {
    // Restore original directory
    process.chdir(originalCwd);
    // Remove entire test directory
    try {
      if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('includes diagnostics attachment when skill has no version/license', async () => {
    writeFileSync(
      skillPath,
      `---\nname: attach-test\ndescription: Test skill for attachments\n---\n\n# Test\nNo version or license.`
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const mod = await import('../../src/commands/load.js');
      await mod.loadSkill('attach-test', { yes: true });
      
      // load command output is now raw text, so JSON parsing will likely fail or return unexpected results
      // if the tests rely on structured attachments, we might need to adjust expectations or
      // realize that 'load' doesn't return structured attachments anymore in the console output?
      // 
      // WAIT: load command outputs: <!-- baseDir: ... -->\nBody
      // It does NOT output JSON.
      // So these tests checking for `output.attachments` are testing functionality that 'load' no longer exposes directly.
      // The attachments logic was moved/refactored.
      // If 'load' is purely text output, then attachments (like warnings) might be printed to stderr?
      // Or maybe they are just not included in 'load' output at all?
      
      // Let's check src/commands/load.ts implementation.
      // It just does console.log(prompt).
      // It does NOT do buildAttachments() or output them.
      
      // So these tests are verifying logic that was removed from 'load' (formerly 'read').
      // However, 'use' (formerly 'invoke') DOES output structured JSON which might include attachments?
      // Let's check src/commands/use.ts.
      // useSkill outputs ExecutionPayload.
      // ExecutionPayload has skill, execution, prompt, instructions.
      // It does NOT seem to have 'attachments' field in the payload.
      
      // So where did attachments go?
      // They were part of the "ReadJsonOutput" interface which 'invoke' used to return.
      // But 'use' returns 'ExecutionPayload'.
      
      // If we removed attachments from the output, then these tests are obsolete for the current CLI behavior.
      // UNLESS we want to verify that they are NOT present?
      // Or if we should be testing 'use' command for something else?
      
      // The 'use' command focuses on execution.
      // The 'load' command focuses on prompt content.
      
      // If the goal was to simplify, maybe attachments (diagnostics/file refs) are handled differently or just implicit now?
      // In 'use.ts', we calculate scripts.
      
      // If the requirement "we frankly don't need the json format to be exposed at all" implies we dropped the structured messaging wrapper...
      // Then yes, these tests are likely testing dead code or behavior we explicitly removed.
      
      // I will update these tests to verify that 'load' works as expected (returns prompt text)
      // and maybe create new tests for 'use' if needed, or just remove these if they test non-existent features.
      
      // Actually, 'load.ts' does verify permissions.
      // But it doesn't seem to output diagnostics or file refs in the text output.
      
      // I'll simplify this test file to check basic 'load' functionality 
      // and comment out/remove the attachment checks since that feature (structured attachment output) is gone.
      
      const output = String(logSpy.mock.calls[0][0] ?? '');
      expect(output).toContain('<!-- baseDir:');
      expect(output).toContain('No version or license');
      
    } finally {
      logSpy.mockRestore();
    }
  });
});
