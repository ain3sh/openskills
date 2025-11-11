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
                       │ Transclusion
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                          SKILLS.md                               │
│              (Generated Skills Manifest - XML)                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ <usage>                                                  │   │
│  │   Skills are EXECUTABLE TOOLKITS...                     │   │
│  │   1. Get context: openskills invoke <skill> --format... │   │
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
│  │ invoke --format=execution : Returns execution payload    │   │
│  │ exec <skill> <script>     : Executes script directly     │   │
│  │ read <skill>              : Returns full SKILL.md        │   │
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
openskills invoke slack-gif-creator --format=execution
```

This returns the `ExecutionPayload`:

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

### Read Command Output Structure

```typescript
interface ReadJsonOutput {
  skill: {
    name: string;
    baseDir: string;
    version?: string;
  };
  newMessages: NewMessage[];
  contextModifier?: ContextModifier;
  attachments?: Attachment[];
}

interface NewMessage {
  role: 'user' | 'assistant';
  content: string | object;
  isMeta?: boolean;  // Hidden from UI when true
}
```

### Message Injection Pattern

When a skill is invoked via `read` (full content mode):

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

3. **Message 3 (Optional): Permissions**
```json
{
  "type": "command_permissions",
  "allowedTools": ["Read", "Write", "Bash"],
  "model": "claude-3-opus-20240229"
}
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

The `--format=execution` mode provides structured metadata without loading full content:

```typescript
if (options.format === 'execution') {
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

Only when absolutely necessary, the full SKILL.md is loaded:

```typescript
if (options.format === 'prompt') {
  // Return just the body for slash commands
  console.log(newMessages[1].content);
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

### Cache Strategy

```typescript
class FastCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl = 60000; // 60 seconds
  
  get(key: string, validator?: () => string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    if (validator && entry.validationHash !== validator()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
}
```

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

### Permission System

```typescript
interface PermissionRules {
  skills: {
    allow?: string[];
    deny?: string[];
    default?: 'allow' | 'deny' | 'ask';
  };
}

function checkSkillPermissions(
  skillName: string, 
  rules: PermissionRules
): PermissionCheckResult {
  // Check deny list first
  if (rules.skills?.deny?.includes(skillName)) {
    return { behavior: 'deny', reason: 'Skill is denied' };
  }
  
  // Check allow list
  if (rules.skills?.allow?.includes(skillName)) {
    return { behavior: 'allow' };
  }
  
  // Use default
  return { behavior: rules.skills?.default || 'ask' };
}
```

### Environment Variable Injection

```typescript
const env = {
  ...process.env,
  // Core variables
  SKILL_BASE: skill.baseDir,
  SKILL_NAME: skillName,
  WORK_DIR: process.cwd(),
  
  // OpenSkills metadata
  OPENSKILLS_MODE: 'execution',
  OPENSKILLS_VERSION: VERSION,
  
  // Execution context
  OPENSKILLS_INVOKE_TIME: new Date().toISOString(),
  OPENSKILLS_AGENT: process.env.OPENSKILLS_AGENT || 'unknown'
};
```

## Performance Characteristics

### Caching Strategy

| Component | TTL | Invalidation |
|-----------|-----|--------------|
| Skill Discovery | 60s | Directory mtime change |
| Script Metadata | 60s | File mtime change |
| Frontmatter Parse | ∞ | Never (per execution) |
| Execution Context | 0 | Always fresh |

### Token Economics

| Operation | Token Cost | Frequency |
|-----------|------------|-----------|
| SKILLS.md Load | ~500-2000 | Once per session |
| Skill Invocation | ~500 | Per skill use |
| Full Read | ~5000-15000 | Rarely needed |
| Execution | 0 | No tokens consumed |

### Execution Overhead

```
Command: openskills exec skill-name script.py
├── Skill resolution: ~5ms (cached)
├── Script path validation: ~2ms
├── Environment setup: ~3ms
├── Process spawn: ~40ms
└── Total: ~50ms overhead
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

### Validation Points

1. **Skill name validation** - Alphanumeric + hyphens only
2. **Path traversal prevention** - No `..` in script paths
3. **Command injection prevention** - Arguments properly escaped
4. **Resource limits** - Via OS process limits

## Comparison with Claude Code Skills

| Aspect | Claude Code | OpenSkills |
|--------|------------|------------|
| **Invocation** | Built-in Skill tool | CLI commands |
| **Discovery** | Internal scanning | Multi-path filesystem scan |
| **Execution** | Managed by runtime | Direct process spawn |
| **Context** | Automatic injection | Explicit via --format |
| **Permissions** | Runtime enforcement | Configuration + runtime |
| **Agent Lock-in** | Claude only | Agent-agnostic |
| **Token Efficiency** | Progressive disclosure | Progressive disclosure |
| **Script Isolation** | Process isolation | Process isolation |

## Design Decisions & Rationale

### Why Execution Over Import?

1. **Security**: Process isolation prevents code injection
2. **Simplicity**: No Python path management or dependency conflicts
3. **Language Agnostic**: Scripts can be Python, Bash, Node.js, etc.
4. **Clear Boundaries**: Scripts are tools, not libraries

### Why Transclusion Over Injection?

1. **Token Efficiency**: AGENTS.md remains small
2. **Dynamic Updates**: SKILLS.md can be regenerated without touching AGENTS.md
3. **Separation of Concerns**: Agent config vs. skill manifest
4. **Version Control**: Less churn in AGENTS.md

### Why Three Levels of Disclosure?

1. **Level 1 (Metadata)**: Sufficient for skill selection
2. **Level 2 (Execution)**: Sufficient for script usage
3. **Level 3 (Full)**: Only when deep understanding needed

### Why Environment Variables?

1. **Universal**: Every language can read env vars
2. **Safe**: No code injection risk
3. **Simple**: No parsing or escaping needed
4. **Traceable**: Easy to log and debug

## Future Architecture Considerations

### Planned Enhancements

1. **Dependency Management**
   - Auto-install from requirements.txt
   - Virtual environment per skill
   - Version pinning

2. **Distributed Execution**
   - Remote script execution
   - Cloud function deployment
   - Result streaming

3. **Skill Composition**
   - Skills calling other skills
   - Workflow orchestration
   - DAG execution

4. **Advanced Discovery**
   - Semantic search over skills
   - Tag-based filtering
   - Capability matching

### Non-Goals

1. **Not a package manager** - Use pip/npm/cargo
2. **Not a scheduler** - Use cron/systemd
3. **Not an API server** - Skills are CLI tools
4. **Not a database** - Skills are files

## Conclusion

OpenSkills implements a **precise, execution-focused architecture** that treats skills as executable toolkits rather than passive documentation. Through progressive disclosure, process isolation, and environment injection, it achieves feature parity with proprietary systems while remaining completely agent-agnostic.

The architecture prioritizes:
- **Execution over interpretation**
- **Isolation over integration**  
- **Explicitness over magic**
- **Simplicity over features**

This design ensures that any AI agent—present or future—can leverage skills effectively without understanding complex APIs or implementation details. Skills are just scripts that run. That's it. That's the architecture.

---

*Implementation: [github.com/openskills](https://github.com/openskills)*  
*Specification: OpenSkills v3.0*  
*Last Updated: November 2024*
