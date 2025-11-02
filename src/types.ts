export interface Skill {
  name: string;
  description: string;
  location: 'project' | 'global';
  path: string;
}

export interface SkillLocation {
  path: string;
  baseDir: string;
  source: string;
}

export interface InstallOptions {
  global?: boolean;
  universal?: boolean;
  yes?: boolean;
}

export interface SkillMetadata {
  name: string;
  description: string;
  context?: string;
}

// Parsed SKILL.md frontmatter (loosely based on blog spec)
export interface SkillFrontmatter {
  name: string;
  description: string;
  when_to_use?: string;
  allowed_tools?: string[] | string; // underscore version
  'allowed-tools'?: string[] | string; // hyphenated version
  version?: string;
  model?: string;
  disable_model_invocation?: boolean;
  'disable-model-invocation'?: boolean;
  mode?: string | boolean;
  reasoning_effort?: string;
  'reasoning-effort'?: string;
  tokens?: any;
  aliases?: string[] | string;
  keywords?: string[] | string;
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

export interface NewMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isMeta?: boolean;
}

export interface ReadJsonOutput {
  skill: { name: string; baseDir: string; version?: string };
  newMessages: NewMessage[];
  contextModifier?: ContextModifier;
}

export interface ToolDescriptionJson {
  oneLine: string;
  detailed: string;
  skills: Array<{ name: string; description: string }>;
}
