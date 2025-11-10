import { Telemetry, type UsageEvent } from '../utils/telemetry.js';
import { loadConfig } from '../utils/config.js';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface TelemetryOptions {
  stats?: boolean;
  clear?: boolean;
  disable?: boolean;
  enable?: boolean;
}

/**
 * Calculate statistics from telemetry events
 */
function calculateStats(events: UsageEvent[]) {
  if (events.length === 0) {
    return {
      total: 0,
      bySkill: {},
      byAgent: {},
      byCommand: {},
      successRate: 0,
      avgDuration: 0
    };
  }
  
  const bySkill: Record<string, number> = {};
  const byAgent: Record<string, number> = {};
  const byCommand: Record<string, number> = {};
  let successCount = 0;
  let totalDuration = 0;
  
  for (const event of events) {
    // Count by skill
    if (event.skillName) {
      bySkill[event.skillName] = (bySkill[event.skillName] || 0) + 1;
    }
    
    // Count by agent
    if (event.agent) {
      byAgent[event.agent] = (byAgent[event.agent] || 0) + 1;
    }
    
    // Count by command
    byCommand[event.command] = (byCommand[event.command] || 0) + 1;
    
    // Track success
    if (event.success) successCount++;
    
    // Track duration
    totalDuration += event.duration;
  }
  
  return {
    total: events.length,
    bySkill,
    byAgent,
    byCommand,
    successRate: (successCount / events.length) * 100,
    avgDuration: totalDuration / events.length
  };
}

/**
 * Format duration in human-readable form
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Display telemetry statistics
 */
function displayStats(events: UsageEvent[]): void {
  const stats = calculateStats(events);
  
  if (stats.total === 0) {
    console.log('📊 No usage data collected yet\n');
    console.log('OpenSkills will track usage as you invoke commands.');
    console.log('Disable: openskills telemetry --disable');
    return;
  }
  
  console.log('📊 OpenSkills Usage Statistics\n');
  console.log(`Total invocations: ${stats.total}`);
  
  // Most used skills
  const topSkills = Object.entries(stats.bySkill)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  if (topSkills.length > 0) {
    console.log(`\nMost used skills:`);
    topSkills.forEach(([skill, count], i) => {
      console.log(`  ${i + 1}. ${skill} (${count} times)`);
    });
  }
  
  console.log(`\nSuccess rate: ${stats.successRate.toFixed(1)}% (${Math.round(stats.successRate * stats.total / 100)}/${stats.total})`);
  
  // By agent
  const agentEntries = Object.entries(stats.byAgent);
  if (agentEntries.length > 0) {
    console.log(`\nBy agent:`);
    agentEntries.forEach(([agent, count]) => {
      const percent = ((count / stats.total) * 100).toFixed(0);
      console.log(`  ${agent}: ${count} (${percent}%)`);
    });
  }
  
  // Performance
  console.log(`\nPerformance:`);
  console.log(`  Average response: ${formatDuration(stats.avgDuration)}`);
  
  // Commands breakdown
  console.log(`\nCommands breakdown:`);
  Object.entries(stats.byCommand).forEach(([cmd, count]) => {
    console.log(`  ${cmd}: ${count}`);
  });
  
  console.log(`\nData location: ~/.openskills/telemetry/usage.jsonl`);
  console.log('Disable tracking: openskills telemetry --disable');
  console.log('Clear data: openskills telemetry --clear');
}

/**
 * Update telemetry config setting
 */
function updateTelemetryConfig(enabled: boolean): void {
  const configPath = join(homedir(), '.openskills.json');
  let config: any = {};
  
  // Load existing config
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      config = {};
    }
  }
  
  // Update telemetry setting
  if (!config.telemetry) config.telemetry = {};
  config.telemetry.enabled = enabled;
  
  // Write back
  try {
    const dir = join(homedir(), '.openskills');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    if (enabled) {
      console.log('✅ Telemetry enabled');
      console.log('Usage data will be collected locally at ~/.openskills/telemetry/');
    } else {
      console.log('✅ Telemetry disabled');
      console.log('No usage data will be collected');
    }
  } catch (err) {
    console.error('❌ Failed to update config:', err instanceof Error ? err.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Telemetry command handler
 */
export function telemetryCommand(options: TelemetryOptions): void {
  // Handle --enable
  if (options.enable) {
    updateTelemetryConfig(true);
    return;
  }
  
  // Handle --disable
  if (options.disable) {
    updateTelemetryConfig(false);
    return;
  }
  
  // Handle --clear
  if (options.clear) {
    Telemetry.clear();
    console.log('✅ Telemetry data cleared');
    return;
  }
  
  // Default: show stats
  const events = Telemetry.readEvents();
  displayStats(events);
}
