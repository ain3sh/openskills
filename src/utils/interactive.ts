import { confirm } from '@inquirer/prompts';
import { stdin, stdout } from 'process';

export interface InteractiveOptions {
  force?: boolean;  // --yes flag
  nonInteractive?: boolean;  // CI/CD mode
}

/**
 * Ask user for permission interactively
 * 
 * Handles:
 * - TTY detection (non-interactive environments)
 * - --yes flag bypass
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
  // Bypass for --yes flag
  if (options.force) {
    return true;
  }
  
  // Check if we're in non-interactive environment
  if (options.nonInteractive || !stdin.isTTY || !stdout.isTTY) {
    // Fallback: Default to deny in automated environments for security
    console.warn(`⚠️  Non-interactive mode: Denying skill "${skillName}"`);
    console.warn('💡 Use --yes flag to approve all skills in automated scripts');
    return false;
  }
  
  // Interactive prompt with timeout
  try {
    let timeoutId: NodeJS.Timeout;
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
    clearTimeout(timeoutId!);
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
