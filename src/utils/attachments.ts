import type { AttachmentMessage, AttachmentOptions, AttachmentVerbosity, SkillFrontmatter } from '../types.js';

/**
 * Diagnostic entry with severity level
 */
interface Diagnostic {
  level: 'error' | 'warning' | 'info';
  message: string;
}

/**
 * Parameters for building attachment messages
 */
interface BuildAttachmentsParams {
  frontmatter: SkillFrontmatter;
  baseDir: string;
  resources: string[];
  diagnostics: Diagnostic[];
  options: AttachmentOptions;
}

/**
 * Build attachment messages based on verbosity settings
 * 
 * Pure function with elegant conditional logic and clear separation of concerns.
 * Each attachment type is built independently for maximum composability.
 * 
 * @param params - All parameters needed for attachment generation
 * @returns Array of attachment messages (empty if verbosity is 'none')
 * 
 * @example
 * const attachments = buildAttachments({
 *   frontmatter: { name: 'pdf', description: '...' },
 *   baseDir: '/path/to/skill',
 *   resources: ['scripts/extract.py', 'references/api.md'],
 *   diagnostics: [{ level: 'warning', message: 'No version field' }],
 *   options: { verbosity: 'warnings' }
 * });
 */
export function buildAttachments(params: BuildAttachmentsParams): AttachmentMessage[] {
  const { options, resources, diagnostics, baseDir } = params;
  const attachments: AttachmentMessage[] = [];

  // Early return for 'none' verbosity (most efficient path)
  if (options.verbosity === 'none' && !options.includeFileReferences && !options.includeDiagnostics) {
    return attachments;
  }

  // File references (if enabled and resources exist)
  const shouldIncludeFiles = options.includeFileReferences ?? (options.verbosity !== 'none');
  if (shouldIncludeFiles && resources.length > 0) {
    attachments.push(buildFileReferenceAttachment(baseDir, resources));
  }

  // Diagnostics (filtered by verbosity level)
  const shouldIncludeDiagnostics = options.includeDiagnostics ?? (options.verbosity !== 'none');
  if (shouldIncludeDiagnostics) {
    const filteredDiagnostics = filterDiagnosticsByVerbosity(diagnostics, options.verbosity);
    if (filteredDiagnostics.length > 0) {
      attachments.push(buildDiagnosticsAttachment(filteredDiagnostics));
    }
  }

  return attachments;
}

/**
 * Filter diagnostics based on verbosity level
 * 
 * Elegant enum-based filtering with clear precedence hierarchy.
 * Uses Set for O(1) lookup performance.
 * 
 * Verbosity hierarchy:
 * - none: [] (no diagnostics)
 * - errors: ['error'] (critical only)
 * - warnings: ['error', 'warning'] (actionable issues)
 * - full: ['error', 'warning', 'info'] (everything)
 * 
 * @param diagnostics - All diagnostic messages
 * @param verbosity - Desired verbosity level
 * @returns Filtered diagnostics matching the verbosity level
 */
function filterDiagnosticsByVerbosity(
  diagnostics: Diagnostic[],
  verbosity: AttachmentVerbosity
): Diagnostic[] {
  // Elegant mapping: verbosity level → allowed diagnostic levels
  const verbosityLevels: Record<AttachmentVerbosity, readonly Diagnostic['level'][]> = {
    none: [],
    errors: ['error'],
    warnings: ['error', 'warning'],
    full: ['error', 'warning', 'info']
  };

  const allowedLevels = new Set(verbosityLevels[verbosity]);
  
  // Pure filter: no side effects, predictable output
  return diagnostics.filter(d => allowedLevels.has(d.level));
}

/**
 * Build file reference attachment message
 * 
 * Pure function: given baseDir and files, always produces the same output.
 * No side effects, no external dependencies.
 * 
 * @param baseDir - Base directory of the skill
 * @param files - Array of resource file paths
 * @returns Formatted attachment message with file list
 */
function buildFileReferenceAttachment(baseDir: string, files: string[]): AttachmentMessage {
  return {
    role: 'user',
    isMeta: true,
    attachmentType: 'reference',
    content: `Bundled resources available in ${baseDir}:\n${files.map(f => `- ${f}`).join('\n')}`,
    metadata: {
      files,
      count: files.length,
      baseDir
    }
  };
}

/**
 * Build diagnostics attachment message
 * 
 * Pure function: formats diagnostics consistently with severity indicators.
 * Automatically determines overall severity level (error > warning > info).
 * 
 * @param diagnostics - Filtered diagnostic messages
 * @returns Formatted attachment message with severity metadata
 */
function buildDiagnosticsAttachment(diagnostics: Diagnostic[]): AttachmentMessage {
  // Determine highest severity level (for metadata)
  const hasError = diagnostics.some(d => d.level === 'error');
  const hasWarning = diagnostics.some(d => d.level === 'warning');
  const overallLevel = hasError ? 'error' : (hasWarning ? 'warning' : 'info');

  // Format each diagnostic with severity prefix
  const formattedLines = diagnostics.map(d => 
    `[${d.level.toUpperCase()}] ${d.message}`
  );

  return {
    role: 'user',
    isMeta: true,
    attachmentType: 'diagnostic',
    content: formattedLines.join('\n'),
    metadata: {
      level: overallLevel,
      count: diagnostics.length
    }
  };
}

/**
 * Collect diagnostics from skill frontmatter and validation
 * 
 * Scans frontmatter for common issues that should be surfaced to users.
 * Pure function: no side effects, deterministic output.
 * 
 * @param frontmatter - Skill frontmatter to validate
 * @returns Array of diagnostic messages
 */
export function collectDiagnostics(frontmatter: SkillFrontmatter): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Check for missing recommended fields
  if (!frontmatter.version) {
    diagnostics.push({
      level: 'warning',
      message: 'Skill has no version field (recommended for tracking)'
    });
  }

  if (!frontmatter.license) {
    diagnostics.push({
      level: 'info',
      message: 'No license information provided'
    });
  }

  // Check for deprecated patterns
  if ((frontmatter as any).when_to_use) {
    diagnostics.push({
      level: 'info',
      message: 'Field "when_to_use" is supported but consider using description instead'
    });
  }

  return diagnostics;
}
