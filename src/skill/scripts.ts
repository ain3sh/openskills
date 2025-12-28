import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { ScriptInfo } from '../types.js';

/**
 * Detect the type of a script based on its extension
 */
function detectScriptType(filePath: string): ScriptInfo['type'] {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.py':
      return 'python';
    case '.sh':
    case '.bash':
      return 'bash';
    case '.js':
    case '.mjs':
    case '.cjs':
      return 'node';
    default:
      return 'other';
  }
}

/**
 * Check if a file is executable
 */
async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract description from a Python script's docstring
 */
function extractPythonDescription(content: string): string | undefined {
  // Look for module-level docstring
  const docstringMatch = content.match(/^"""([\s\S]*?)"""/m) || 
                        content.match(/^'''([\s\S]*?)'''/m);
  if (docstringMatch) {
    const docstring = docstringMatch[1].trim();
    // Return first line of docstring
    return docstring.split('\n')[0];
  }
  
  // Look for a comment at the top
  const commentMatch = content.match(/^#\s*(.+)$/m);
  if (commentMatch) {
    return commentMatch[1].trim();
  }
  
  return undefined;
}

/**
 * Extract description from a shell script
 */
function extractShellDescription(content: string): string | undefined {
  // Look for a comment after the shebang
  const lines = content.split('\n');
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim();
    if (line.startsWith('#') && !line.startsWith('#!')) {
      return line.substring(1).trim();
    }
  }
  return undefined;
}

/**
 * Extract description from a script file
 */
async function extractScriptDescription(filePath: string, type: ScriptInfo['type']): Promise<string | undefined> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const firstChunk = content.substring(0, 500); // Only look at first 500 chars
    
    switch (type) {
      case 'python':
        return extractPythonDescription(firstChunk);
      case 'bash':
        return extractShellDescription(firstChunk);
      case 'node':
        // Look for a comment at the top
        const match = firstChunk.match(/^\/\/\s*(.+)$/m) || firstChunk.match(/^\/\*\s*(.+?)\s*\*\//);
        return match ? match[1].trim() : undefined;
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

/**
 * Generate usage example for a script
 */
function generateUsageExample(scriptPath: string, type: ScriptInfo['type'], baseDir: string): string {
  const fullPath = `{baseDir}/${scriptPath}`;
  
  switch (type) {
    case 'python':
      return `python ${fullPath}`;
    case 'bash':
      return `bash ${fullPath}`;
    case 'node':
      return `node ${fullPath}`;
    default:
      return fullPath;
  }
}

/**
 * Discover executable scripts in a skill directory
 */
export async function discoverSkillScripts(skillDir: string): Promise<ScriptInfo[]> {
  const scripts: ScriptInfo[] = [];
  
  // Directories to search for scripts
  const scriptDirs = ['scripts', 'templates', 'bin', '.'];
  
  // File patterns to look for
  const patterns = ['*.py', '*.sh', '*.bash', '*.js', '*.mjs'];
  
  for (const dir of scriptDirs) {
    const searchDir = path.join(skillDir, dir);
    
    // Skip if directory doesn't exist
    if (!fs.existsSync(searchDir)) {
      continue;
    }
    
    // Skip if it's not a directory
    const stat = await fs.promises.stat(searchDir);
    if (!stat.isDirectory()) {
      continue;
    }
    
    try {
      // Find all matching files
      for (const pattern of patterns) {
        const files = await glob(pattern, { 
          cwd: searchDir,
          nodir: true,
          dot: false
        });
        
        for (const file of files) {
          const relativePath = dir === '.' ? file : path.join(dir, file);
          const fullPath = path.join(skillDir, relativePath);
          const type = detectScriptType(file);
          
          // Skip if we've already found this script
          if (scripts.some(s => s.path === relativePath)) {
            continue;
          }
          
          const script: ScriptInfo = {
            path: relativePath,
            type,
            executable: await isExecutable(fullPath),
            usage: generateUsageExample(relativePath, type, skillDir),
            description: await extractScriptDescription(fullPath, type)
          };
          
          scripts.push(script);
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
      continue;
    }
  }
  
  // Sort scripts by path for consistent ordering
  scripts.sort((a, b) => a.path.localeCompare(b.path));
  
  return scripts;
}


