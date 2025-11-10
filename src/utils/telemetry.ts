import { writeFileSync, appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { loadConfig } from './config.js';

const TELEMETRY_DIR = join(homedir(), '.openskills', 'telemetry');
const LOG_FILE = join(TELEMETRY_DIR, 'usage.jsonl');

/**
 * Minimal usage event for privacy-first telemetry
 * Tracks only: command, skill name, success, agent, timing
 */
export interface UsageEvent {
  timestamp: string;
  command: 'read' | 'list' | 'install';
  skillName?: string;
  success: boolean;
  agent?: string;
  duration: number; // milliseconds
}

/**
 * Detect which agent platform is running OpenSkills
 * Checks environment variables and parent process
 */
function detectAgent(): string | undefined {
  // Check common env vars
  if (process.env.CURSOR_SESSION_ID) return 'cursor';
  if (process.env.WINDSURF_SESSION) return 'windsurf';
  if (process.env.FACTORY_SESSION) return 'factory';
  if (process.env.AIDER_VERSION) return 'aider';
  
  // Check if running in known agent contexts
  const ppid = process.env.PPID || process.ppid?.toString();
  if (ppid) {
    // Could check parent process name here if needed
    // For now, just check env vars
  }
  
  return undefined;
}

/**
 * Privacy-first telemetry system
 * - All data stays local (~/.openskills/telemetry/)
 * - Minimal tracking (3 commands + success/failure only)
 * - Opt-out via config
 * - Silent failures (never breaks user workflow)
 */
export class Telemetry {
  private enabled: boolean;
  
  constructor() {
    try {
      const config = loadConfig();
      this.enabled = config.telemetry?.enabled !== false; // Default ON
    } catch {
      this.enabled = true; // Default to enabled if config fails to load
    }
  }
  
  /**
   * Log a usage event
   * @param event - Event data (timestamp added automatically)
   */
  log(event: Omit<UsageEvent, 'timestamp' | 'agent'>): void {
    if (!this.enabled) return;
    
    const fullEvent: UsageEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      agent: detectAgent()
    };
    
    try {
      // Ensure directory exists
      if (!existsSync(TELEMETRY_DIR)) {
        mkdirSync(TELEMETRY_DIR, { recursive: true });
      }
      
      // Append as JSONL (one JSON object per line)
      appendFileSync(LOG_FILE, JSON.stringify(fullEvent) + '\n');
    } catch {
      // Silent fail - never break user workflow due to telemetry
    }
  }
  
  /**
   * Read all telemetry events
   */
  static readEvents(): UsageEvent[] {
    if (!existsSync(LOG_FILE)) return [];
    
    try {
      const content = readFileSync(LOG_FILE, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      return lines.map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }
  
  /**
   * Clear all telemetry data
   */
  static clear(): void {
    try {
      if (existsSync(LOG_FILE)) {
        writeFileSync(LOG_FILE, '');
      }
    } catch {
      // Silent fail
    }
  }
}

// Export singleton instance
export const telemetry = new Telemetry();
