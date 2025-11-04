import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { PermissionRule } from '../types.js';

/**
 * OpenSkills configuration structure
 */
export interface OpenskillsConfig {
  permissions?: {
    skills?: {
      deny?: string[];
      allow?: string[];
      default?: 'allow' | 'deny' | 'ask';
    };
  };
  tokenBudget?: number;
}

/**
 * Load and merge configuration from multiple sources
 * 
 * Priority (later overrides earlier):
 * 1. Default values
 * 2. Global config (~/.openskills.json)
 * 3. Project config (.openskills.json)
 * 
 * @returns Merged configuration
 */
export function loadConfig(): OpenskillsConfig {
  // Default configuration
  const config: OpenskillsConfig = {
    permissions: {
      skills: {
        deny: [],
        allow: [],
        default: 'ask'
      }
    },
    tokenBudget: 15000
  };

  // Try to load global config
  const globalConfigPath = join(homedir(), '.openskills.json');
  if (existsSync(globalConfigPath)) {
    try {
      const globalConfig = JSON.parse(readFileSync(globalConfigPath, 'utf-8'));
      mergeConfig(config, globalConfig);
    } catch (err) {
      // Ignore invalid JSON in global config
      console.warn(`Warning: Failed to parse ${globalConfigPath}`);
    }
  }

  // Try to load project config (overrides global)
  const projectConfigPath = join(process.cwd(), '.openskills.json');
  if (existsSync(projectConfigPath)) {
    try {
      const projectConfig = JSON.parse(readFileSync(projectConfigPath, 'utf-8'));
      mergeConfig(config, projectConfig);
    } catch (err) {
      // Ignore invalid JSON in project config
      console.warn(`Warning: Failed to parse ${projectConfigPath}`);
    }
  }

  return config;
}

/**
 * Merge configuration objects (deep merge for nested objects)
 */
function mergeConfig(target: OpenskillsConfig, source: Partial<OpenskillsConfig>): void {
  if (source.tokenBudget !== undefined) {
    target.tokenBudget = source.tokenBudget;
  }

  if (source.permissions) {
    if (!target.permissions) target.permissions = {};
    
    if (source.permissions.skills) {
      if (!target.permissions.skills) target.permissions.skills = {};
      
      if (source.permissions.skills.deny) {
        target.permissions.skills.deny = source.permissions.skills.deny;
      }
      if (source.permissions.skills.allow) {
        target.permissions.skills.allow = source.permissions.skills.allow;
      }
      if (source.permissions.skills.default) {
        target.permissions.skills.default = source.permissions.skills.default;
      }
    }
  }
}

/**
 * Convert config to permission rules array
 */
export function configToPermissionRules(config: OpenskillsConfig): PermissionRule[] {
  const rules: PermissionRule[] = [];

  if (config.permissions?.skills) {
    // Add deny rules
    if (config.permissions.skills.deny) {
      for (const pattern of config.permissions.skills.deny) {
        rules.push({ pattern, behavior: 'deny' });
      }
    }

    // Add allow rules
    if (config.permissions.skills.allow) {
      for (const pattern of config.permissions.skills.allow) {
        rules.push({ pattern, behavior: 'allow' });
      }
    }
  }

  return rules;
}
