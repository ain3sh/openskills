# Agent Integration Guide

## Overview

OpenSkills provides a JSON API for headless agent integration. This guide explains how to integrate OpenSkills into your AI coding agent (Cursor, Windsurf, Aider, custom agents, etc.).

**Key Concept:** Skills are **prompt-based context modifiers**, not executable code. They inject specialized instructions and optionally modify the execution context (available tools, model selection, etc.).

---

## Quick Start (3 Steps)

### 1. Discover Available Skills

Get a list of installed skills for your system prompt:

```bash
openskills tool-description --compact
```

**Output:**
```
Skill tool: call by name to load instructions. Skills: pdf, xlsx, docx, pptx, ...
```

This goes in your agent's system prompt to make skills discoverable.

### 2. Find Relevant Skill (Optional)

Use semantic search to match user queries with skills:

```bash
openskills suggest "work with spreadsheets"
```

**Output:**
```json
[
  {
    "name": "xlsx",
    "description": "Comprehensive spreadsheet creation, editing, and analysis...",
    "score": 0.89
  },
  {
    "name": "docx",
    "description": "Document creation and editing...",
    "score": 0.45
  }
]
```

### 3. Invoke Skill

Load the skill and inject into conversation:

```bash
openskills invoke xlsx --yes
```

**Output:**
```json
{
  "skill": {
    "name": "xlsx",
    "baseDir": "/path/to/skills/xlsx",
    "version": "2.1.0"
  },
  "newMessages": [
    {
      "role": "user",
      "content": "<command-message>The \"xlsx\" skill is loading</command-message>",
      "isMeta": false
    },
    {
      "role": "user",
      "content": "<!-- baseDir: /path/to/skills/xlsx -->\n---\nname: xlsx\n...\n\n# Instructions\n...",
      "isMeta": true
    },
    {
      "role": "user",
      "content": "<metadata name=\"xlsx\" baseDir=\"...\" model=\"\" allowedTools=\"Bash,Read\"></metadata>",
      "isMeta": true
    }
  ],
  "contextModifier": {
    "allowedTools": ["Bash", "Read"],
    "normalizedPermissions": {
      "tools": ["bash", "read"]
    }
  },
  "attachments": [
    {
      "type": "file_reference",
      "content": "Bundled resources available in /path/to/skills/xlsx:\n- scripts/create.py\n- references/api.md",
      "metadata": {
        "files": ["scripts/create.py", "references/api.md"],
        "count": 2,
        "baseDir": "/path/to/skills/xlsx"
      }
    }
  ]
}
```

---

## Core Concepts

### Three-Message Pattern

Skills inject **three messages** into the conversation:

1. **Visible Metadata** (`isMeta: false`)
   - User sees: `<command-message>The "xlsx" skill is loading</command-message>`
   - This is the only message visible in the UI
   - Provides feedback that the skill is loading

2. **Hidden Skill Prompt** (`isMeta: true`)
   - Contains the full SKILL.md content (frontmatter + instructions)
   - Agent processes this but user doesn't see it
   - This is where the actual specialized knowledge lives

3. **Hidden Structured Metadata** (`isMeta: true`)
   - XML format: `<metadata name="..." baseDir="..." model="..." allowedTools="...">`
   - Or JSON format (in `invoke` command)
   - Provides structured data for context modification

**Why this pattern?**
- User sees simple "loading" message (not 5000 words of instructions)
- Agent gets full context (the actual skill instructions)
- Clean separation between UX and agent context

### contextModifier Object

The `contextModifier` object tells your agent how to modify execution context:

```typescript
interface ContextModifier {
  allowedTools?: string[];        // Restrict available tools
  model?: string;                 // Override model selection
  reasoningEffort?: string;       // Set thinking parameter
  tokens?: number;                // Reserve output tokens
  normalizedPermissions?: {       // Parsed permissions
    tools?: string[];
    shellAllowPatterns?: string[];
    shellDenyPatterns?: string[];
  };
}
```

**This is NOT enforced by OpenSkills!** Your agent must implement the enforcement logic.

---

## Implementing contextModifier

### Field: `allowedTools`

**Type:** `string[] | undefined`  
**Behavior:** Restrict agent's available tools to this list during skill execution

**Why it matters:** Skills often need specific tools but not others. For example:
- A `pdf` skill needs `Bash` and `Read` but shouldn't allow `Delete` or network tools
- A `read-only-analysis` skill might only allow `Read` and `Grep`

**Implementation Pattern:**

```python
# Python example
def invoke_skill(skill_name: str):
    # Get skill data
    result = subprocess.run(
        ["openskills", "invoke", skill_name, "--yes"],
        capture_output=True,
        text=True
    )
    skill_data = json.loads(result.stdout)
    
    # Save original tool set
    original_tools = agent.available_tools.copy()
    
    try:
        # Apply tool restrictions if specified
        allowed = skill_data.get("contextModifier", {}).get("allowedTools")
        if allowed:
            agent.available_tools = [
                tool for tool in agent.available_tools 
                if tool.name in allowed
            ]
        
        # Inject messages
        for message in skill_data["newMessages"]:
            agent.add_message(message["role"], message["content"])
        
        # Execute agent turn
        agent.run()
        
    finally:
        # CRITICAL: Restore original tools after skill completes
        agent.available_tools = original_tools
```

```javascript
// Node.js example
async function invokeSkill(skillName) {
  const { stdout } = await execFile('openskills', ['invoke', skillName, '--yes']);
  const skillData = JSON.parse(stdout);
  
  const originalTools = [...agent.availableTools];
  
  try {
    // Apply tool filter
    const allowed = skillData.contextModifier?.allowedTools;
    if (allowed) {
      agent.availableTools = agent.availableTools.filter(
        tool => allowed.includes(tool.name)
      );
    }
    
    // Inject messages and run
    for (const msg of skillData.newMessages) {
      agent.addMessage(msg.role, msg.content);
    }
    
    await agent.run();
    
  } finally {
    // Restore tools
    agent.availableTools = originalTools;
  }
}
```

**Key Points:**
- Always save original tool set before filtering
- Restore tools in a `finally` block (even if skill fails)
- Filter by tool name (case-insensitive recommended)

---

### Field: `model`

**Type:** `string | undefined`  
**Behavior:** Override the LLM model for this skill's execution

**Why it matters:** Some skills work better with specific models:
- Complex reasoning tasks might specify `claude-3-7-sonnet` for extended thinking
- Simple templating might specify `claude-3-5-haiku` for speed/cost
- Legacy skills might specify older models for compatibility

**Implementation:**

```python
# Python example
def invoke_skill_with_model_override(skill_name: str):
    result = subprocess.run(
        ["openskills", "invoke", skill_name, "--yes"],
        capture_output=True,
        text=True
    )
    skill_data = json.loads(result.stdout)
    
    # Check for model override
    override_model = skill_data.get("contextModifier", {}).get("model")
    
    if override_model:
        # Use specified model for this interaction
        response = anthropic.messages.create(
            model=override_model,  # e.g., "claude-3-7-sonnet-20250219"
            messages=build_messages(skill_data["newMessages"]),
            max_tokens=1024
        )
    else:
        # Use agent's default model
        response = agent.get_completion(skill_data["newMessages"])
    
    return response
```

**Key Points:**
- Only override if model is explicitly specified (don't default)
- After skill completes, revert to agent's default model
- Handle model availability (fallback if model not available)

---

### Field: `reasoningEffort`

**Type:** `"off" | "low" | "medium" | "high" | undefined`  
**Behavior:** Control extended thinking for Claude 3.7+ models

**Why it matters:** Extended thinking (Claude's internal reasoning) has tradeoffs:
- **High:** Deep analysis, better accuracy, slower, more expensive
- **Low:** Faster responses, less reasoning depth
- **Off:** No extended thinking (default behavior)

**Implementation:**

```python
# Python example with Anthropic SDK
def invoke_skill_with_thinking(skill_name: str):
    skill_data = get_skill_data(skill_name)
    
    reasoning_effort = skill_data.get("contextModifier", {}).get("reasoningEffort")
    
    # Map to Anthropic API parameter
    thinking_config = None
    if reasoning_effort:
        thinking_config = {
            "type": "enabled",
            "budget_tokens": {
                "off": 0,
                "low": 1000,
                "medium": 5000,
                "high": 10000
            }.get(reasoning_effort, 0)
        }
    
    response = anthropic.messages.create(
        model="claude-3-7-sonnet-20250219",
        messages=build_messages(skill_data["newMessages"]),
        thinking=thinking_config,  # Pass thinking config
        max_tokens=4096
    )
    
    return response
```

**Key Points:**
- Only applies to Claude 3.7+ models
- Older models ignore this parameter (safe to pass)
- Budget tokens based on effort level (your choice of mapping)

---

### Field: `tokens`

**Type:** `number | undefined`  
**Behavior:** Reserve output tokens for skill response

**Why it matters:** Skills might need significant output space:
- Code generation skills might need 4000+ tokens
- Analysis skills might need 2000 tokens for detailed reports
- Simple skills might only need 500 tokens

**Implementation:**

```python
# Python example
def invoke_skill_with_token_budget(skill_name: str):
    skill_data = get_skill_data(skill_name)
    
    # Get token budget (default to agent's default if not specified)
    token_budget = skill_data.get("contextModifier", {}).get("tokens")
    max_tokens = token_budget if token_budget else agent.default_max_tokens
    
    response = anthropic.messages.create(
        model=agent.model,
        messages=build_messages(skill_data["newMessages"]),
        max_tokens=max_tokens  # Use skill's token budget
    )
    
    return response
```

**Key Points:**
- Treat as minimum tokens, not maximum
- Don't reduce below agent's default
- Monitor if response is truncated (increase if needed)

---

### Field: `normalizedPermissions`

**Type:** `object | undefined`  
**Behavior:** Fine-grained tool permissions (beyond simple allow list)

**Structure:**
```typescript
{
  tools?: string[];                  // Normalized tool names
  shellAllowPatterns?: string[];     // Bash commands to allow (e.g., ["git:*"])
  shellDenyPatterns?: string[];      // Bash commands to deny
}
```

**Why it matters:** Provides scoped permissions:
- `tools: ["bash"]` + `shellAllowPatterns: ["git:*"]` = only allow git commands
- `shellDenyPatterns: ["rm*", "sudo*"]` = block destructive commands

**Implementation:**

```python
# Python example with shell command filtering
def execute_bash_command(command: str, skill_perms: dict):
    # Check deny patterns first
    deny_patterns = skill_perms.get("shellDenyPatterns", [])
    for pattern in deny_patterns:
        if matches_pattern(command, pattern):
            raise PermissionError(f"Command blocked by deny rule: {pattern}")
    
    # Check allow patterns
    allow_patterns = skill_perms.get("shellAllowPatterns", [])
    if allow_patterns:
        allowed = any(matches_pattern(command, p) for p in allow_patterns)
        if not allowed:
            raise PermissionError(f"Command not in allow list")
    
    # Execute if passed all checks
    return subprocess.run(command, shell=True, capture_output=True)

def matches_pattern(command: str, pattern: str) -> bool:
    # Simple glob-style matching
    # "git:*" matches "git status", "git commit", etc.
    if ':' in pattern:
        prefix, glob = pattern.split(':', 1)
        return command.startswith(prefix)
    return fnmatch.fnmatch(command, pattern)
```

**Key Points:**
- Deny patterns take precedence over allow patterns
- Use glob-style patterns for flexibility
- This is advanced - most skills just use `allowedTools`

---

## Handling Attachments

Attachments provide additional context about the skill:

```typescript
interface AttachmentMessage {
  type: 'file_reference' | 'diagnostics' | 'context';
  content: string;
  metadata: any;
}
```

### Attachment Types

#### 1. `file_reference`

Lists bundled resources (scripts, references, assets):

```json
{
  "type": "file_reference",
  "content": "Bundled resources available in /path/to/skill:\n- scripts/helper.py\n- references/api.md",
  "metadata": {
    "files": ["scripts/helper.py", "references/api.md"],
    "count": 2,
    "baseDir": "/path/to/skill"
  }
}
```

**What to do:** 
- Make agent aware of available resources
- Files can be read with `Read` tool using absolute paths
- Prepend `baseDir` to file paths

#### 2. `diagnostics`

Warnings or errors about the skill:

```json
{
  "type": "diagnostics",
  "content": "[WARNING] Skill has no version field (recommended for tracking)",
  "metadata": {
    "level": "warning",
    "count": 1
  }
}
```

**What to do:**
- `level: "error"` → Abort skill loading, show error to user
- `level: "warning"` → Continue but log warning
- `level: "info"` → Optional, can ignore

#### 3. `context`

Additional context from frontmatter:

```json
{
  "type": "context",
  "content": "This skill requires Python 3.8+ with pandas installed",
  "metadata": {
    "source": "frontmatter"
  }
}
```

**What to do:**
- Include in agent's context
- Use for validation (check prerequisites)

### Controlling Attachment Verbosity

Use `--attachments` flag to control detail level:

```bash
openskills invoke skill --attachments=none      # No attachments
openskills invoke skill --attachments=errors    # Only errors
openskills invoke skill --attachments=warnings  # Errors + warnings (default)
openskills invoke skill --attachments=full      # Everything
```

---

## Integration Examples

### Cursor / Windsurf (via AGENTS.md)

Add to your `.cursorrules` or `.windsurfrules`:

```markdown
# Available Skills

You have access to specialized skills via the `openskills` CLI tool.

<available_skills>
{{RUN: openskills tool-description}}
</available_skills>

## Using Skills

To use a skill:
1. User asks for task
2. You identify relevant skill from <available_skills>
3. You run: `openskills invoke skill-name --yes`
4. You parse the JSON output and extract `newMessages`
5. You follow the instructions in the skill prompt
```

**Workflow:**
1. Cursor/Windsurf loads AGENTS.md into context
2. Agent sees available skills list
3. When user asks "create a spreadsheet", agent runs `openskills invoke xlsx --yes`
4. Agent parses output and follows xlsx skill instructions

---

### Aider (Python CLI)

Create a wrapper in your Aider config:

```python
# .aider.conf.yml
import subprocess
import json

def load_skill(skill_name: str):
    """Load an OpenSkills skill into Aider context"""
    result = subprocess.run(
        ["openskills", "invoke", skill_name, "--yes"],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"Failed to load skill: {result.stderr}")
        return
    
    skill_data = json.loads(result.stdout)
    
    # Extract instructions (message 2)
    instructions = skill_data["newMessages"][1]["content"]
    
    # Add to Aider context
    print(f"📖 Loading skill: {skill_data['skill']['name']}")
    print(instructions)
    
    # Apply tool restrictions
    allowed_tools = skill_data.get("contextModifier", {}).get("allowedTools")
    if allowed_tools:
        print(f"🔒 Restricting tools to: {', '.join(allowed_tools)}")

# Usage in Aider:
# /run load_skill("xlsx")
```

---

### Custom Agent (Node.js)

```javascript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class OpenSkillsAgent {
  constructor(anthropic, model = 'claude-3-7-sonnet-20250219') {
    this.anthropic = anthropic;
    this.model = model;
    this.conversationHistory = [];
  }
  
  async discoverSkills() {
    const { stdout } = await execAsync('openskills tool-description --compact');
    const data = JSON.parse(stdout);
    return data.oneLine;
  }
  
  async suggestSkill(query) {
    const { stdout } = await execAsync(`openskills suggest "${query}"`);
    const suggestions = JSON.parse(stdout);
    return suggestions[0]?.name; // Return top match
  }
  
  async invokeSkill(skillName) {
    const { stdout } = await execAsync(`openskills invoke ${skillName} --yes`);
    const skillData = JSON.parse(stdout);
    
    // Add skill messages to conversation
    for (const msg of skillData.newMessages) {
      this.conversationHistory.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    // Apply context modifiers
    const modifier = skillData.contextModifier || {};
    const config = {
      model: modifier.model || this.model,
      max_tokens: modifier.tokens || 4096
    };
    
    // Add thinking if specified
    if (modifier.reasoningEffort) {
      config.thinking = {
        type: 'enabled',
        budget_tokens: this.mapReasoningEffort(modifier.reasoningEffort)
      };
    }
    
    // Get completion
    const response = await this.anthropic.messages.create({
      ...config,
      messages: this.conversationHistory
    });
    
    return response;
  }
  
  mapReasoningEffort(effort) {
    const map = { off: 0, low: 1000, medium: 5000, high: 10000 };
    return map[effort] || 0;
  }
}

// Usage
const agent = new OpenSkillsAgent(anthropic);

// Discover skills
const skills = await agent.discoverSkills();
console.log('Available:', skills);

// User asks to work with PDFs
const skill = await agent.suggestSkill('extract text from pdf');
const response = await agent.invokeSkill(skill);
```

---

## Best Practices

### 1. Always Save and Restore Context

```python
# ✅ GOOD
original_tools = agent.tools.copy()
try:
    # Apply skill modifications
    agent.tools = filter_tools(skill.allowedTools)
    agent.run()
finally:
    agent.tools = original_tools

# ❌ BAD
agent.tools = filter_tools(skill.allowedTools)
agent.run()
# Oops! Tools stay filtered for next interaction
```

### 2. Handle Missing Skills Gracefully

```python
# ✅ GOOD
result = subprocess.run(["openskills", "invoke", skill_name, "--yes"], ...)
if result.returncode != 0:
    error_data = json.loads(result.stdout)
    if error_data.get("errorCode") == 2:  # UNKNOWN_SKILL
        print(f"Skill '{skill_name}' not installed. Install with:")
        print(f"  openskills install anthropics/skills --skills {skill_name}")
        return
    raise SkillError(error_data.get("error"))

# ❌ BAD
result = subprocess.run(["openskills", "invoke", skill_name, "--yes"], ...)
data = json.loads(result.stdout)  # Crashes if skill not found
```

### 3. Use Compact Discovery for System Prompts

```python
# ✅ GOOD - Compact for system prompt (200 tokens)
system_prompt = f"""
You have access to skills: {get_compact_skills()}

When relevant, invoke with: openskills invoke <name> --yes
"""

def get_compact_skills():
    result = subprocess.run(["openskills", "tool-description", "--compact"], ...)
    return json.loads(result.stdout)["oneLine"]

# ❌ BAD - Full description in system prompt (2000 tokens)
system_prompt = f"""
Available skills:
{get_full_skill_list()}  # Too much detail, wastes tokens
"""
```

### 4. Validate Model Availability

```python
# ✅ GOOD
def invoke_with_model_check(skill_data):
    requested_model = skill_data.get("contextModifier", {}).get("model")
    
    if requested_model and requested_model not in available_models:
        print(f"⚠️  Skill requests {requested_model} but it's not available")
        print(f"Using default model instead: {default_model}")
        requested_model = default_model
    
    return get_completion(model=requested_model, ...)

# ❌ BAD
model = skill_data["contextModifier"]["model"]
return get_completion(model=model, ...)  # Crashes if model unavailable
```

---

## Troubleshooting

### Issue: Skill instructions not followed

**Cause:** Instructions are in `isMeta: true` message, might be ignored

**Solution:** Ensure your agent processes ALL messages, not just visible ones:

```python
# Process all messages, regardless of isMeta flag
for msg in skill_data["newMessages"]:
    agent.add_message(msg["role"], msg["content"])
    # Don't filter by isMeta - agent needs all messages
```

### Issue: Tool restrictions not working

**Cause:** Not implementing contextModifier.allowedTools

**Solution:** Filter tools before agent runs:

```python
allowed = skill_data.get("contextModifier", {}).get("allowedTools", [])
if allowed:
    agent.available_tools = [t for t in agent.tools if t.name in allowed]
```

### Issue: Skill says files exist but agent can't find them

**Cause:** File paths are relative to skill's baseDir

**Solution:** Prepend baseDir to file paths:

```python
base_dir = skill_data["skill"]["baseDir"]
script_path = f"{base_dir}/scripts/helper.py"
content = read_file(script_path)
```

### Issue: Permission denied when invoking skill

**Cause:** Non-interactive mode defaults to deny

**Solution:** Use `--yes` flag:

```bash
openskills invoke skill-name --yes  # Skip permission prompt
```

Or configure permissions in `.openskills.json`:

```json
{
  "permissions": {
    "allow": ["pdf", "xlsx", "docx"]
  }
}
```

---

## Security Considerations

### 1. Validate Skill Sources

```python
# ✅ GOOD - Verify skill source before trusting allowedTools
def is_trusted_skill(skill_data):
    base_dir = skill_data["skill"]["baseDir"]
    
    # Only trust skills from known locations
    trusted_paths = [
        "~/.claude/skills/",
        "./project/.claude/skills/",
        "builtin-skills/"
    ]
    
    return any(base_dir.startswith(p) for p in trusted_paths)

# If untrusted, don't apply contextModifier
if not is_trusted_skill(skill_data):
    print("⚠️  Untrusted skill - ignoring tool restrictions")
    # Still load instructions, but don't apply permissions
```

### 2. Sanitize Shell Commands

Even with `allowedTools: ["Bash"]`, validate commands:

```python
def is_safe_command(cmd: str, allowed_patterns: list) -> bool:
    # Block dangerous patterns
    dangerous = ['rm -rf', 'sudo', '> /dev/', 'dd if=']
    if any(d in cmd for d in dangerous):
        return False
    
    # Check against allow patterns
    if allowed_patterns:
        return any(matches_pattern(cmd, p) for p in allowed_patterns)
    
    return True
```

### 3. Audit Tool Usage

Log what skills request:

```python
def invoke_skill_with_audit(skill_name):
    skill_data = get_skill_data(skill_name)
    
    # Log requested permissions
    allowed_tools = skill_data.get("contextModifier", {}).get("allowedTools", [])
    log.info(f"Skill '{skill_name}' requests tools: {allowed_tools}")
    
    # Alert on sensitive tool combinations
    if "Bash" in allowed_tools and "Read" in allowed_tools:
        log.warning(f"Skill '{skill_name}' can execute code AND read files")
    
    return invoke_skill(skill_data)
```

---

## Reference

### Error Codes

When a skill invocation fails, OpenSkills returns structured errors:

```json
{
  "error": "Skill not found: unknown-skill",
  "errorCode": 2,
  "suggestion": "Install with: openskills install anthropics/skills --skills unknown-skill"
}
```

**Error Codes:**
- `1` - EMPTY_COMMAND: No skill name provided
- `2` - UNKNOWN_SKILL: Skill not installed
- `3` - LOAD_FAILED: File read/parse error
- `4` - INVOCATION_DISABLED: Skill has `disable-model-invocation: true`
- `5` - NOT_PROMPT_BASED: Skill missing description (not prompt-based)

### Command Reference

```bash
# Discovery
openskills tool-description              # Full XML description
openskills tool-description --compact    # One-liner (token-efficient)
openskills list                          # List installed skills (JSON)
openskills suggest "query"               # Semantic search

# Invocation
openskills invoke <name> --yes           # Load skill (JSON output)
openskills read <name> --yes             # Alias for invoke

# Attachments
openskills invoke <name> --attachments=none      # No attachments
openskills invoke <name> --attachments=errors    # Only errors
openskills invoke <name> --attachments=warnings  # Default
openskills invoke <name> --attachments=full      # Everything

# Validation
openskills validate <name>               # Check skill format
```

---

## Next Steps

1. **Test Integration:** Start with a simple skill (e.g., `hello-world`)
2. **Implement contextModifier:** Add tool filtering to your agent
3. **Add to System Prompt:** Include skill discovery in agent's context
4. **Monitor Usage:** Log skill invocations and track effectiveness
5. **Create Custom Skills:** Build domain-specific skills for your use case

**Questions?** Check the [OpenSkills README](../README.md) or [create an issue](https://github.com/ain3sh/openskills/issues).

---

*This guide covers OpenSkills v2.0+. For older versions, some features may not be available.*
