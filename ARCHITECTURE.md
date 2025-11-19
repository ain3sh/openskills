# OpenSkills Architecture: The Execution-First Skills System

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [System Architecture](#system-architecture)
3. [The Three-Phase Skill Lifecycle](#the-three-phase-skill-lifecycle)
4. [Message Protocol & Tool Contract](#message-protocol--tool-contract)
5. [Script Discovery & Execution](#script-discovery--execution)
6. [Progressive Disclosure Implementation](#progressive-disclosure-implementation)
7. [File System Layout](#file-system-layout)
8. [Technical Implementation Details](#technical-implementation-details)
9. [Performance Characteristics](#performance-characteristics)
10. [Security Model](#security-model)

## Core Philosophy

OpenSkills implements an **execution-first** architecture for AI agent skills. Unlike documentation-based approaches, OpenSkills treats skills as **executable toolkits** containing standalone scripts that agents run via shell commands.

### Fundamental Principles

1. **Scripts are executed, never imported** - All skill code runs in isolated processes
2. **Progressive disclosure over token flooding** - Three levels of detail exposure
3. **Agent-agnostic by design** - No dependency on specific AI platforms
4. **Execution context injection** - Environment variables provide runtime configuration
5. **Transclusion over injection** - Skills referenced, not embedded in agent configs

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent (Any AI System)                     │
├─────────────────────────────────────────────────────────────────┤
│                          AGENTS.md                               │
│                     (Contains @SKILLS.md)                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Transclusion (Default)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                          SKILLS.md                               │
│              (Generated Skills Manifest - XML)                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ <usage>                                                  │   │
│  │   Skills are EXECUTABLE TOOLKITS...                     │   │
│  │   1. Get context: openskills use <skill>                │   │
│  │   2. Execute: python <baseDir>/scripts/script.py        │   │
│  │ </usage>                                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ <skill>                                                  │   │
│  │   <name>slack-gif-creator</name>                        │   │
│  │   <baseDir>/path/to/skill</baseDir>                     │   │
│  │   <scripts>...</scripts>                                │   │
│  │ </skill>                                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Agent invokes
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OpenSkills CLI                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ use <skill>               : Returns execution payload    │   │
│  │ exec <skill> <script>     : Executes script directly     │   │
│  │ load <skill>              : Returns full SKILL.md        │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Executes
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Skill Directory                             │
│  ├── SKILL.md          (Instructions & frontmatter)             │
│  ├── scripts/          (Executable Python/Bash scripts)         │
│  ├── templates/        (Additional executables)                 │
│  ├── references/       (Documentation files)                    │
│  └── assets/           (Static resources)                       │
└─────────────────────────────────────────────────────────────────┘
```

## The Three-Phase Skill Lifecycle

### Phase 1: Discovery (Agent Reads SKILLS.md)

When an agent starts, it reads SKILLS.md which contains minimal metadata for all available skills:

```xml
<skill>
  <name>slack-gif-creator</name>
  <description>Toolkit for creating animated GIFs...</description>
  <location>project</location>
  <baseDir>/absolute/path/to/skill</baseDir>
</skill>
```

**Token Cost**: ~100 tokens per skill (name + description + path)

### Phase 2: Invocation (Agent Gets Execution Context)

When the agent decides to use a skill, it calls:

```bash
openskills use slack-gif-creator
```

This returns the `ExecutionPayload` (JSON):

```typescript
interface ExecutionPayload {
  skill: {
    name: string;
    baseDir: string;  // Absolute path to skill directory
  };
  execution: {
    workDir: string;  // Current working directory
    scripts: Array<{
      path: string;       // "templates/pulse.py"
      usage: string;      // "python /path/to/skill/templates/pulse.py"
      description?: string; // Extracted from docstring
    }>;
    environment: {
      SKILL_BASE: string; // Same as baseDir
      WORK_DIR: string;   // Same as workDir
    };
  };
  prompt: string;         // First 1000 chars of SKILL.md
  instructions: string;   // "Execute scripts from baseDir..."
}
```

**Token Cost**: ~500 tokens (structured execution metadata)

### Phase 3: Execution (Agent Runs Scripts)

The agent executes scripts directly via Bash:

```bash
python /path/to/skill/templates/pulse.py --emoji "❤️" --frames 20
```

Or using the exec command:

```bash
openskills exec slack-gif-creator templates/pulse.py --emoji "❤️"
```

**Token Cost**: 0 (execution happens outside conversation context)

## Message Protocol & Tool Contract

OpenSkills implements a strict message protocol for skill invocation, inspired by Anthropic's two-message pattern:

### Load Command Output Structure

When a skill is read via `load` (full content mode):

1. **Message 1: Visible Metadata**
```xml
<command-message>The "slack-gif-creator" skill is loading</command-message>
<command-name>slack-gif-creator</command-name>
```

2. **Message 2: Hidden Skill Content**
```markdown
<!-- baseDir: /path/to/skill -->
[Full SKILL.md content without frontmatter]
```

## Script Discovery & Execution

### Discovery Algorithm

```typescript
async function discoverSkillScripts(skillDir: string): Promise<ScriptInfo[]> {
  const scriptDirs = ['scripts', 'templates', 'bin', '.'];
  const patterns = ['*.py', '*.sh', '*.bash', '*.js', '*.mjs'];
  
  for (const dir of scriptDirs) {
    const searchDir = path.join(skillDir, dir);
    if (!fs.existsSync(searchDir)) continue;
    
    for (const pattern of patterns) {
      const files = await glob(pattern, { cwd: searchDir });
      // Extract metadata, detect type, check executable
    }
  }
  
  return scripts.sort((a, b) => a.path.localeCompare(b.path));
}
```

### Execution Flow

```typescript
async function execSkillScript(
  skillName: string,
  scriptPath: string,
  args: string[]
): Promise<void> {
  const skill = findSkill(skillName);
  const fullPath = join(skill.baseDir, scriptPath);
  
  // Detect interpreter
  const ext = extname(scriptPath);
  const command = ext === '.py' ? 'python3' :
                 ext === '.sh' ? 'bash' :
                 ext === '.js' ? 'node' : fullPath;
  
  // Set environment
  const env = {
    ...process.env,
    SKILL_BASE: skill.baseDir,
    SKILL_NAME: skillName,
    WORK_DIR: process.cwd()
  };
  
  // Execute
  spawn(command, [fullPath, ...args], { env, stdio: 'inherit' });
}
```

### Script Metadata Extraction

Scripts can include metadata via docstrings/comments:

```python
#!/usr/bin/env python3
"""
Pulse Animation - Scale objects rhythmically for emphasis.
"""
# First line of docstring becomes description
```

## Progressive Disclosure Implementation

### Level 1: Skills Manifest (SKILLS.md)

Generated by `generateSkillsXml()`:

```typescript
function generateSkillsXml(skills: Skill[]): string {
  const skillTags = skills.map(s => {
    let scriptExamples = '';
    if (s.scripts?.length > 0) {
      const examples = s.scripts
        .slice(0, 2)
        .map(script => `    python ${s.path}/${script.path}`)
        .join('\n');
      scriptExamples = `\n<scripts>\n${examples}\n</scripts>`;
    }
    
    return `<skill>
<name>${s.name}</name>
<description>${s.description}</description>
<location>${s.location}</location>
<baseDir>${s.path}</baseDir>${scriptExamples}
</skill>`;
  }).join('\n\n');
  
  return `<skills_system priority="1">
${USAGE_INSTRUCTIONS}
<available_skills>
${skillTags}
</available_skills>
</skills_system>`;
}
```

### Level 2: Execution Context

The `use` command provides structured metadata without loading full content:

```typescript
if (command === 'use') {
  const scripts = await discoverSkillScripts(loc.baseDir);
  
  const executionPayload: ExecutionPayload = {
    skill: { name, baseDir: loc.baseDir },
    execution: {
      workDir: process.cwd(),
      scripts: scripts.map(s => ({
        path: s.path,
        usage: s.usage?.replace('{baseDir}', loc.baseDir),
        description: s.description
      })),
      environment: {
        SKILL_BASE: loc.baseDir,
        WORK_DIR: process.cwd()
      }
    },
    prompt: body.substring(0, 1000) + '...',
    instructions: "Execute scripts from baseDir..."
  };
  
  return executionPayload;
}
```

### Level 3: Full Content

Only when absolutely necessary, the full SKILL.md is loaded via `load`:

```typescript
if (command === 'load') {
  // Return just the body with baseDir comment
  console.log(`<!-- baseDir: ${skill.baseDir} -->\n${skillBody}`);
}
```

## File System Layout

### Skill Directory Structure

```
skill-name/
├── SKILL.md                  # Required: Frontmatter + instructions
├── scripts/                  # Primary executable scripts
│   ├── main.py              # Main entry point
│   └── utils.py             # Helper scripts
├── templates/               # Alternative script location
│   └── animation.py         # Template scripts
├── references/              # Documentation loaded on demand
│   └── API.md              # Detailed docs
└── assets/                  # Static resources
    └── template.html        # File templates
```

### Discovery Paths (Priority Order)

```typescript
const SKILL_SEARCH_PATHS = [
  './.agent/skills/',          // 1. Project agent-agnostic (highest priority)
  './.claude/skills/',         // 2. Project Claude-specific
  '~/.agent/skills/',          // 3. Global agent-agnostic
  '~/.claude/skills/',         // 4. Global Claude-specific
];
```

**Rationale**: 
- `.agent/skills` is the default for all new installations (agent-agnostic)
- `.claude/skills` maintained for Claude Code compatibility
- Project paths have priority over global (allows project-specific overrides)
- Simplified from 6+ paths to just 4 essential ones

## Technical Implementation Details

### Transclusion Pattern Detection

```typescript
function detectTransclusionPattern(content: string): string | null {
  const patterns = [
    /<!--\s*@include:\s*SKILLS\.md\s*-->/,  // HTML comment
    /@include:\s*SKILLS\.md/,                // VuePress style
    /@SKILLS\.md/                            // Simple reference
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[0];
  }
  return null;
}
```

### Frontmatter Parsing

```typescript
function parseFrontmatter<T>(content: string): {
  frontmatter: T | null;
  body: string;
} {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  
  if (!match) {
    return { frontmatter: null, body: content };
  }
  
  try {
    const frontmatter = yaml.load(match[1]) as T;
    return { frontmatter, body: match[2] };
  } catch {
    return { frontmatter: null, body: content };
  }
}
```

## Security Model

### Principle of Least Privilege

Skills operate under strict constraints:

1. **No automatic code execution** - Scripts require explicit invocation
2. **No module imports** - Scripts run in isolated processes
3. **No system modification** - Environment variables are process-local
4. **No network access by default** - Scripts must explicitly request

### Permission Layers

```
User Permission (.openskills.json)
    ↓
Skill Frontmatter (allowed-tools)
    ↓
Script Execution (process isolation)
    ↓
OS Permissions (file system, network)
```

### Trust Boundaries

```
┌─────────────────────────────┐
│      Trusted Zone           │
│  - OpenSkills CLI           │
│  - Skill Discovery          │
│  - Execution Context        │
└──────────┬──────────────────┘
           │ Process Boundary
┌──────────▼──────────────────┐
│     Untrusted Zone          │
│  - Skill Scripts            │
│  - External Commands        │
│  - Network Operations       │
└─────────────────────────────┘
```

## Comparison with Claude Code Skills

| Aspect | Claude Code | OpenSkills |
|--------|------------|------------|
| **Invocation** | Built-in Skill tool | CLI commands (`use`, `load`) |
| **Discovery** | Internal scanning | Multi-path filesystem scan |
| **Execution** | Managed by runtime | Direct process spawn |
| **Context** | Automatic injection | Explicit via commands |
| **Permissions** | Runtime enforcement | Configuration + runtime |
| **Agent Lock-in** | Claude only | Agent-agnostic |
| **Token Efficiency** | Progressive disclosure | Progressive disclosure |
| **Script Isolation** | Process isolation | Process isolation |

---

*Implementation: [github.com/openskills](https://github.com/openskills)*  
*Specification: OpenSkills v2.0.0*  
*Last Updated: November 2024*
