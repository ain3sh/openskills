import { describe, it, expect } from 'vitest';
import { buildAttachments, collectDiagnostics } from '../../src/utils/attachments.js';
import type { AttachmentOptions, SkillFrontmatter } from '../../src/types.js';

describe('Attachment Building', () => {
  const mockFrontmatter: SkillFrontmatter = {
    name: 'test-skill',
    description: 'Test skill for attachment testing'
  };

  const mockResources = [
    'scripts/extract.py',
    'references/api.md',
    'assets/template.json'
  ];

  const mockDiagnostics = [
    { level: 'error' as const, message: 'Missing required file' },
    { level: 'warning' as const, message: 'No version field' },
    { level: 'info' as const, message: 'No license information' }
  ];

  describe('Verbosity Levels', () => {
    it('should include nothing when verbosity=none', () => {
      const options: AttachmentOptions = { verbosity: 'none' };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test/path',
        resources: mockResources,
        diagnostics: mockDiagnostics,
        options
      });

      expect(attachments).toHaveLength(0);
    });

    it('should include only errors when verbosity=errors', () => {
      const options: AttachmentOptions = { verbosity: 'errors' };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test/path',
        resources: mockResources,
        diagnostics: mockDiagnostics,
        options
      });

      // Should have file references + diagnostics
      expect(attachments).toHaveLength(2);
      
      // Find diagnostics attachment
      const diagAttachment = attachments.find(a => a.attachmentType === 'diagnostic');
      expect(diagAttachment).toBeDefined();
      expect(diagAttachment!.content).toContain('[ERROR]');
      expect(diagAttachment!.content).not.toContain('[WARNING]');
      expect(diagAttachment!.content).not.toContain('[INFO]');
      expect(diagAttachment!.metadata.count).toBe(1);
    });

    it('should include errors and warnings when verbosity=warnings', () => {
      const options: AttachmentOptions = { verbosity: 'warnings' };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test/path',
        resources: mockResources,
        diagnostics: mockDiagnostics,
        options
      });

      const diagAttachment = attachments.find(a => a.attachmentType === 'diagnostic');
      expect(diagAttachment).toBeDefined();
      expect(diagAttachment!.content).toContain('[ERROR]');
      expect(diagAttachment!.content).toContain('[WARNING]');
      expect(diagAttachment!.content).not.toContain('[INFO]');
      expect(diagAttachment!.metadata.count).toBe(2);
    });

    it('should include everything when verbosity=full', () => {
      const options: AttachmentOptions = { verbosity: 'full' };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test/path',
        resources: mockResources,
        diagnostics: mockDiagnostics,
        options
      });

      const diagAttachment = attachments.find(a => a.attachmentType === 'diagnostic');
      expect(diagAttachment).toBeDefined();
      expect(diagAttachment!.content).toContain('[ERROR]');
      expect(diagAttachment!.content).toContain('[WARNING]');
      expect(diagAttachment!.content).toContain('[INFO]');
      expect(diagAttachment!.metadata.count).toBe(3);
    });
  });

  describe('Override Options', () => {
    it('should respect includeFileReferences=false override', () => {
      const options: AttachmentOptions = {
        verbosity: 'full',
        includeFileReferences: false
      };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test/path',
        resources: mockResources,
        diagnostics: mockDiagnostics,
        options
      });

      expect(attachments.every(a => a.attachmentType !== 'reference')).toBe(true);
    });

    it('should respect includeFileReferences=true even with verbosity=none', () => {
      const options: AttachmentOptions = {
        verbosity: 'none',
        includeFileReferences: true
      };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test/path',
        resources: mockResources,
        diagnostics: mockDiagnostics,
        options
      });

      expect(attachments).toHaveLength(1);
      expect(attachments[0].attachmentType).toBe('reference');
    });

    it('should respect includeDiagnostics=false override', () => {
      const options: AttachmentOptions = {
        verbosity: 'full',
        includeDiagnostics: false
      };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test/path',
        resources: mockResources,
        diagnostics: mockDiagnostics,
        options
      });

      expect(attachments.every(a => a.attachmentType !== 'diagnostic')).toBe(true);
    });

    it('should respect includeDiagnostics=true even with verbosity=none', () => {
      const options: AttachmentOptions = {
        verbosity: 'none',
        includeDiagnostics: true
      };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test/path',
        resources: [],
        diagnostics: mockDiagnostics,
        options
      });

      // With verbosity=none but includeDiagnostics=true, filter still applies (none → no diagnostics)
      // This is correct behavior: override enables the category, but verbosity still filters
      expect(attachments).toHaveLength(0);
    });
  });

  describe('File Reference Attachments', () => {
    it('should format file references correctly', () => {
      const options: AttachmentOptions = { verbosity: 'warnings' };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/path/to/skill',
        resources: mockResources,
        diagnostics: [],
        options
      });

      const fileAttachment = attachments.find(a => a.attachmentType === 'reference');
      expect(fileAttachment).toBeDefined();
      expect(fileAttachment!.role).toBe('user');
      expect(fileAttachment!.isMeta).toBe(true);
      expect(fileAttachment!.content).toContain('/path/to/skill');
      expect(fileAttachment!.content).toContain('- scripts/extract.py');
      expect(fileAttachment!.content).toContain('- references/api.md');
      expect(fileAttachment!.content).toContain('- assets/template.json');
      expect(fileAttachment!.metadata.count).toBe(3);
      expect(fileAttachment!.metadata.files).toEqual(mockResources);
    });

    it('should not include file reference when resources are empty', () => {
      const options: AttachmentOptions = { verbosity: 'full' };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/path/to/skill',
        resources: [],
        diagnostics: mockDiagnostics,
        options
      });

      expect(attachments.every(a => a.attachmentType !== 'reference')).toBe(true);
    });
  });

  describe('Diagnostics Attachments', () => {
    it('should set overall level to error when errors present', () => {
      const options: AttachmentOptions = { verbosity: 'full' };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test',
        resources: [],
        diagnostics: mockDiagnostics,
        options
      });

      const diagAttachment = attachments.find(a => a.attachmentType === 'diagnostic');
      expect(diagAttachment!.metadata.level).toBe('error');
      expect(diagAttachment!.role).toBe('user');
      expect(diagAttachment!.isMeta).toBe(true);
    });

    it('should set overall level to warning when no errors but warnings present', () => {
      const options: AttachmentOptions = { verbosity: 'full' };
      const diagnosticsWithoutErrors = mockDiagnostics.filter(d => d.level !== 'error');
      
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test',
        resources: [],
        diagnostics: diagnosticsWithoutErrors,
        options
      });

      const diagAttachment = attachments.find(a => a.attachmentType === 'diagnostic');
      expect(diagAttachment!.metadata.level).toBe('warning');
    });

    it('should set overall level to info when only info present', () => {
      const options: AttachmentOptions = { verbosity: 'full' };
      const infoOnly = [{ level: 'info' as const, message: 'Just info' }];
      
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test',
        resources: [],
        diagnostics: infoOnly,
        options
      });

      const diagAttachment = attachments.find(a => a.attachmentType === 'diagnostic');
      expect(diagAttachment!.metadata.level).toBe('info');
    });

    it('should not include diagnostics when none exist', () => {
      const options: AttachmentOptions = { verbosity: 'full' };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test',
        resources: mockResources,
        diagnostics: [],
        options
      });

      expect(attachments.every(a => a.attachmentType !== 'diagnostic')).toBe(true);
    });
  });

  describe('collectDiagnostics', () => {
    it('should warn about missing version', () => {
      const frontmatter: SkillFrontmatter = {
        name: 'test',
        description: 'test skill'
      };

      const diagnostics = collectDiagnostics(frontmatter);
      
      expect(diagnostics.some(d => 
        d.level === 'warning' && d.message.includes('version')
      )).toBe(true);
    });

    it('should info about missing license', () => {
      const frontmatter: SkillFrontmatter = {
        name: 'test',
        description: 'test skill'
      };

      const diagnostics = collectDiagnostics(frontmatter);
      
      expect(diagnostics.some(d => 
        d.level === 'info' && d.message.includes('license')
      )).toBe(true);
    });

    it('should info about when_to_use field', () => {
      const frontmatter: any = {
        name: 'test',
        description: 'test skill',
        when_to_use: 'Use this when...'
      };

      const diagnostics = collectDiagnostics(frontmatter);
      
      expect(diagnostics.some(d => 
        d.level === 'info' && d.message.includes('when_to_use')
      )).toBe(true);
    });

    it('should return no diagnostics for complete frontmatter', () => {
      const frontmatter: SkillFrontmatter = {
        name: 'test',
        description: 'test skill',
        version: '1.0.0',
        license: 'MIT'
      };

      const diagnostics = collectDiagnostics(frontmatter);
      
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty resources and diagnostics gracefully', () => {
      const options: AttachmentOptions = { verbosity: 'full' };
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test',
        resources: [],
        diagnostics: [],
        options
      });

      expect(attachments).toHaveLength(0);
    });

    it('should handle very long resource lists', () => {
      const manyResources = Array.from({ length: 100 }, (_, i) => `file-${i}.txt`);
      const options: AttachmentOptions = { verbosity: 'warnings' };
      
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test',
        resources: manyResources,
        diagnostics: [],
        options
      });

      const fileAttachment = attachments.find(a => a.attachmentType === 'reference');
      expect(fileAttachment!.metadata.count).toBe(100);
      expect(fileAttachment!.metadata.files).toHaveLength(100);
    });

    it('should handle special characters in file paths', () => {
      const specialResources = [
        'scripts/file with spaces.py',
        'references/unicode-文件.md',
        'assets/special!@#$.json'
      ];
      const options: AttachmentOptions = { verbosity: 'warnings' };
      
      const attachments = buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test',
        resources: specialResources,
        diagnostics: [],
        options
      });

      const fileAttachment = attachments.find(a => a.attachmentType === 'reference');
      expect(fileAttachment!.content).toContain('file with spaces.py');
      expect(fileAttachment!.content).toContain('unicode-文件.md');
    });
  });

  describe('Pure Function Properties', () => {
    it('should return same output for same input (deterministic)', () => {
      const options: AttachmentOptions = { verbosity: 'warnings' };
      const params = {
        frontmatter: mockFrontmatter,
        baseDir: '/test',
        resources: mockResources,
        diagnostics: mockDiagnostics,
        options
      };

      const result1 = buildAttachments(params);
      const result2 = buildAttachments(params);

      expect(result1).toEqual(result2);
    });

    it('should not mutate input parameters', () => {
      const options: AttachmentOptions = { verbosity: 'warnings' };
      const resourcesCopy = [...mockResources];
      const diagnosticsCopy = [...mockDiagnostics];

      buildAttachments({
        frontmatter: mockFrontmatter,
        baseDir: '/test',
        resources: resourcesCopy,
        diagnostics: diagnosticsCopy,
        options
      });

      expect(resourcesCopy).toEqual(mockResources);
      expect(diagnosticsCopy).toEqual(mockDiagnostics);
    });
  });
});
