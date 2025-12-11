export type SkillSourceType = 'project' | 'user' | 'plugin' | 'builtin';

export interface SkillSource {
  type: SkillSourceType;
  path: string;
  priority: number; // Lower = higher priority (1 = highest)
  pluginId?: string; // Identifies the plugin (preferred: "plugin@marketplace")
  layout?: 'collection' | 'single';
  pluginEnabled?: boolean;
}

export interface ScriptInfo {
  path: string;              // Relative to skill baseDir
  type: 'python' | 'bash' | 'node' | 'other';
  executable: boolean;
  usage?: string;            // Example usage command
  description?: string;      // Extracted from docstring/comments
}

export interface Skill {
  name: string;
  description: string;
  location: 'project' | 'global';
  path: string;
  source?: SkillSourceType;  // Track where skill came from
  sourceLabel?: string;       // e.g., "plugin:pdf-tools" or "builtin"
  pluginKey?: string;         // For plugin skills: "plugin@marketplace"
  pluginEnabled?: boolean;    // For plugin skills: whether enabled in Claude settings (when detectable)
  scripts?: ScriptInfo[];     // Discovered executable scripts
  version?: string;           // Optional metadata for display surfaces
  license?: string;           // Optional metadata for display surfaces
}

export interface SkillLocation {
  path: string;
  baseDir: string;
  source: string;
}

export interface InstallOptions {
  global?: boolean;
  yes?: boolean;
}

export interface SkillMetadata {
  name: string;
  description: string;
  context?: string;
}

export interface ExecutionPayload {
  skill: {
    name: string;
    baseDir: string;
  };
  execution: {
    workDir: string;
    scripts: Array<{
      path: string;
      usage: string;
      description?: string;
    }>;
    environment: {
      SKILL_BASE: string;
      WORK_DIR: string;
    };
  };
  prompt: string;
  instructions: string;
  permissions?: {
    allowedTools?: string[];
    model?: string | null;
  };
}

// Parsed SKILL.md frontmatter (loosely based on blog spec)
/**
 * Complete SkillFrontmatter interface per blog spec
 * Supports both naming conventions (hyphenated and underscored)
 */
export interface SkillFrontmatter {
  // Required fields
  name: string;
  description: string;
  
  // Discovery & matching
  when_to_use?: string;
  'when-to-use'?: string;
  
  // Tool permissions
  allowed_tools?: string[] | string;
  'allowed-tools'?: string[] | string;
  
  // Metadata
  version?: string;
  license?: string;
  author?: string;
  'created-at'?: string;
  'updated-at'?: string;
  
  // Execution context
  model?: string;
  disable_model_invocation?: boolean;
  'disable-model-invocation'?: boolean;
  mode?: string | boolean;
  reasoning_effort?: string;
  'reasoning-effort'?: string;
  tokens?: any;
  
  // Discovery & search
  aliases?: string[] | string;
  keywords?: string[] | string;
  tags?: string[] | string;
  
  // Visibility control
  enabled?: boolean;
  hidden?: boolean;
  unlisted?: boolean;
  
  // Context & attachments
  context?: string;
  'additional-context'?: string;
  notes?: string;
  
  // Allow unknown fields for extensibility
  [key: string]: unknown;
}

export interface ContextModifier {
  allowedTools?: string[];
  model?: string;
  disableModelInvocation?: boolean;
  reasoningEffort?: 'off' | 'none' | 'low' | 'medium' | 'high';
  mode?: string | boolean;
  tokens?: any;
  normalizedPermissions?: {
    tools?: string[];
    shellAllowPatterns?: string[];
    shellDenyPatterns?: string[];
  }
}

export type AttachmentType = 'diagnostic' | 'reference' | 'context';

export interface NewMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | { type: 'command_permissions'; allowedTools?: string[]; model?: string | null };
  isMeta?: boolean;
  attachmentType?: AttachmentType;
  metadata?: Record<string, unknown>;
}

/**
 * Attachment message mirrored in both JSON output and injected messages
 */
export interface AttachmentMessage extends Omit<NewMessage, 'content' | 'role' | 'attachmentType' | 'isMeta'> {
  role: 'user';
  isMeta: true;
  content: string;
  attachmentType: AttachmentType;
}

export interface ReadJsonOutput {
  skill: { name: string; baseDir: string; version?: string };
  newMessages: NewMessage[];
  contextModifier?: ContextModifier;
  attachments?: AttachmentMessage[];  // Optional: included when relevant
}

export interface ToolDescriptionJson {
  oneLine: string;
  instructions: string;
  available_skills_xml: string;
  truncated: boolean;
  detailed: string;
  skills: Array<{ name: string; description: string; version?: string; license?: string }>;
}

/**
 * Skill error codes per blog spec
 * Used for structured error reporting in validation
 */
export enum SkillErrorCode {
  EMPTY_COMMAND = 1,           // No skill name provided
  UNKNOWN_SKILL = 2,           // Skill not found in any source
  LOAD_FAILED = 3,             // File read/parse error
  INVOCATION_DISABLED = 4,     // disable-model-invocation: true
  NOT_PROMPT_BASED = 5         // Missing description (not prompt-based)
}

/**
 * Result of skill command validation
 * Provides structured error information with actionable suggestions
 */
export interface SkillValidationResult {
  valid: boolean;
  errorCode?: SkillErrorCode;
  message?: string;
  suggestion?: string;
}

/**
 * Permission rule for skill access control
 * Implements deny > allow > ask precedence
 */
export interface PermissionRule {
  pattern: string;           // e.g., "pdf*", "*-creator", "plugin:*"
  behavior: 'allow' | 'deny' | 'ask';
  message?: string;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  behavior: 'allow' | 'deny' | 'ask';
  message?: string;
}

/**
 * Attachment verbosity level
 * Controls the level of detail in attachment messages
 * 
 * - none: No attachments (minimal output)
 * - errors: Only critical diagnostics (errors)
 * - warnings: Errors + warnings (default, balanced)
 * - full: All diagnostics + file references + context
 */
export type AttachmentVerbosity = 'none' | 'errors' | 'warnings' | 'full';

/**
 * Options for controlling attachment generation
 * Provides fine-grained control over what gets included
 */
export interface AttachmentOptions {
  verbosity: AttachmentVerbosity;
  includeFileReferences?: boolean;  // Override: include bundled resource list
  includeDiagnostics?: boolean;      // Override: include diagnostic messages
}
