import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { PermissionRule } from '../types.js';
import { FastCache } from './fastCache.js';

// Cache for config loading (60 second TTL)
const configCache = new FastCache<OpenskillsConfig>('config');

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
  telemetry?: {
    enabled?: boolean; // Default: true
  };
}

/**
 * Load and merge configuration from multiple sources
 * 
 * Priority (later overrides earlier):
 * 1. Default values
 * 2. Global config (~/.openskills.json)
 * 3. Project config (.openskills.json)
 * 
 * Performance: Cached for 60 seconds, invalidates when config files change
 * 
 * @returns Merged configuration
 */
export function loadConfig(): OpenskillsConfig {
  // Try cache first
  const validator = () => {
    // Hash of config file mtimes
    const globalConfigPath = join(homedir(), '.openskills.json');
    const projectConfigPath = join(process.cwd(), '.openskills.json');
    const mtimes: string[] = [];
    
    if (existsSync(globalConfigPath)) {
      try {
        const stat = statSync(globalConfigPath);
        mtimes.push(`global:${stat.mtime.toISOString()}`);
      } catch {
        // Ignore
      }
    }
    
    if (existsSync(projectConfigPath)) {
      try {
        const stat = statSync(projectConfigPath);
        mtimes.push(`project:${stat.mtime.toISOString()}`);
      } catch {
        // Ignore
      }
    }
    
    return mtimes.join('|') || 'none';
  };
  
  const cached = configCache.get('merged-config', validator);
  if (cached) return cached;
  
  // Cache miss - load from files
  const config = loadConfigInternal();
  configCache.set('merged-config', config, validator());
  return config;
}

/**
 * Internal function to load config from files
 */
function loadConfigInternal(): OpenskillsConfig {
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
      // Invalid JSON: Warn clearly and continue with defaults (non-fatal)
      console.warn(`Warning: Failed to parse ${globalConfigPath} (invalid JSON) - using defaults`);
    }
  }

  // Try to load project config (overrides global)
  const projectConfigPath = join(process.cwd(), '.openskills.json');
  if (existsSync(projectConfigPath)) {
    try {
      const projectConfig = JSON.parse(readFileSync(projectConfigPath, 'utf-8'));
      mergeConfig(config, projectConfig);
    } catch (err) {
      // Invalid JSON: Warn clearly and continue with merged config (non-fatal)
      console.warn(`Warning: Failed to parse ${projectConfigPath} (invalid JSON) - using merged defaults`);
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
  
  if (source.telemetry) {
    if (!target.telemetry) target.telemetry = {};
    if (source.telemetry.enabled !== undefined) {
      target.telemetry.enabled = source.telemetry.enabled;
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

/**
 * Clear config cache (useful for tests)
 */
export function clearConfigCache(): void {
  configCache.clear('merged-config');
}
