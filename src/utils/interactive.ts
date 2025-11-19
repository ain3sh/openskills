import { confirm } from '@inquirer/prompts';
import { stdin, stdout } from 'process';

export interface InteractiveOptions {
  force?: boolean;  // auto-approve (default in non-interactive mode)
  nonInteractive?: boolean;  // CI/CD mode
}

/**
 * Ask user for permission interactively
 * 
 * Handles:
 * - TTY detection (non-interactive environments)
 * - force/auto-approve bypass
 * - Graceful fallback for CI/CD
 * - Timeout protection (30s)
 * 
 * @param skillName - Name of skill requesting permission
 * @param options - Configuration options
 * @returns Promise<boolean> - true if approved, false if denied
 */
export async function askUserPermission(
  skillName: string,
  options: InteractiveOptions = {}
): Promise<boolean> {
  // Bypass for force/auto-approve (default in non-interactive mode)
  if (options.force) {
    return true;
  }
  
  // Check if we're in non-interactive environment
  if (options.nonInteractive || !stdin.isTTY || !stdout.isTTY) {
    // Fallback: Default to deny in automated environments for security
    console.warn(`⚠️  Non-interactive mode: Denying skill "${skillName}"`);
    console.warn('💡 Commands auto-approve by default; use --tui only in interactive terminals');
    return false;
  }
  
  // Interactive prompt with timeout
  try {
    let timeoutId: NodeJS.Timeout | undefined;
    const answer = await Promise.race([
      confirm({
        message: `Allow skill "${skillName}" to execute?`,
        default: false  // Secure default
      }),
      new Promise<boolean>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Timeout')), 30000);
      })
    ]);
    
    // Clear timeout to prevent resource leak
    // Note: timeoutId is always assigned before race completes (Promise constructor is synchronous)
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    return answer;
  } catch (error) {
    if (error instanceof Error && error.message === 'Timeout') {
      console.warn('⏱️  Permission prompt timed out - denying');
      return false;
    }
    // User cancelled (Ctrl+C) or other error - deny
    return false;
  }
}
