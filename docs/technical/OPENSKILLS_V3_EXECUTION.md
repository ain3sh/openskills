# OpenSkills v3.0: Execution Parity with Claude Code

## Executive Summary

OpenSkills v3.0 bridges the critical gap between **documentation** and **execution**. Previous versions presented skills as static text to be read. v3.0 transforms skills into **executable toolkits** - exactly how Claude Code uses them.

### The Fundamental Shift

**Before (v2.x):** Skills were documentation that agents would read and try to understand
**Now (v3.0):** Skills are executable scripts that agents run directly via Bash

This matches Claude Code's execution model where skills contain scripts that are **executed, not imported**.

## Key Features

### 1. Execution-Focused SKILLS.md

The new SKILLS.md generation emphasizes the execution model:

```xml
<usage>
Skills are EXECUTABLE TOOLKITS containing scripts and resources.

HOW TO USE SKILLS:
1. Get skill context: Bash("openskills invoke <skill-name> --format=execution")
   Returns: { baseDir, scripts[], environment{} }
2. Execute scripts: python <baseDir>/scripts/script.py [args]
3. Scripts are STANDALONE - run them via Bash, DON'T import as modules

CRITICAL EXECUTION MODEL:
✅ CORRECT: python /path/to/skill/scripts/create_gif.py --output test.gif
❌ WRONG: import sys; sys.path.append('/path/to/skill'); from templates import *
</usage>
```

### 2. New `--format=execution` Mode

Get complete execution context for any skill:

```bash
openskills invoke slack-gif-creator --format=execution
```

Returns:
```json
{
  "skill": {
    "name": "slack-gif-creator",
    "baseDir": "/path/to/skill"
  },
  "execution": {
    "workDir": "/current/directory",
    "scripts": [
      {
        "path": "templates/pulse.py",
        "usage": "python /path/to/skill/templates/pulse.py",
        "description": "Pulse Animation - Scale objects rhythmically"
      }
    ],
    "environment": {
      "SKILL_BASE": "/path/to/skill",
      "WORK_DIR": "/current/directory"
    }
  }
}
```

### 3. Direct Script Execution with `openskills exec`

Execute skill scripts directly without manual path resolution:

```bash
# Execute a skill script
openskills exec slack-gif-creator templates/pulse.py

# Pass arguments to the script
openskills exec slack-gif-creator scripts/create_gif.py --emoji "🎉" --output party.gif
```

The `exec` command:
- Resolves the skill's base directory
- Sets up environment variables (SKILL_BASE, WORK_DIR)
- Executes the script with proper context
- Handles Python, Bash, Node.js scripts automatically

### 4. Script Discovery

Skills now include automatic script discovery:

```typescript
interface ScriptInfo {
  path: string;              // Relative to skill baseDir
  type: 'python' | 'bash' | 'node' | 'other';
  executable: boolean;
  usage?: string;            // Example usage command
  description?: string;      // Extracted from docstring/comments
}
```

Scripts are discovered from:
- `scripts/` - Primary location for utilities
- `templates/` - Animation templates (e.g., slack-gif-creator)
- `bin/` - Executable binaries
- `.` - Root-level scripts

### 5. Shell Integration

The `openskills-wrap` wrapper provides functions for shell integration:

```bash
# Source the wrapper
source /path/to/openskills/scripts/openskills-wrap

# Get skill base directory
base=$(openskills_base slack-gif-creator)

# List available scripts
openskills_scripts slack-gif-creator

# Run a script
openskills_run slack-gif-creator templates/pulse.py
```

## Usage Examples

### For AI Agents

When an agent encounters a skill, it should:

1. **Get execution context:**
```bash
openskills invoke skill-name --format=execution
```

2. **Execute scripts directly:**
```bash
python /path/to/skill/scripts/script.py --args
```

3. **Never import modules:**
```python
# ❌ WRONG - Don't do this!
import sys
sys.path.append('/path/to/skill')
from templates.pulse import create_pulse_animation

# ✅ CORRECT - Execute the script!
os.system('python /path/to/skill/templates/pulse.py')
```

### For Developers

Set up your shell for easy skill execution:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias claude="openskills-wrap claude"
alias cursor="openskills-wrap cursor"
alias aider="openskills-wrap aider"

# Or source functions directly
source /path/to/openskills/scripts/openskills-wrap
```

## Architecture Changes

### Progressive Disclosure (3 Levels)

1. **Level 1: Metadata** (~100 tokens)
   - Skill name, description, baseDir
   - Listed in SKILLS.md

2. **Level 2: Execution Context** (~500 tokens)
   - Scripts list with usage examples
   - Environment variables
   - Available via `--format=execution`

3. **Level 3: Full Content** (unlimited)
   - Complete SKILL.md
   - All referenced files
   - Available via `openskills read`

### Execution Flow

```mermaid
graph LR
    A[User Request] --> B[Agent Reads SKILLS.md]
    B --> C[Agent Invokes Skill]
    C --> D[Get Execution Context]
    D --> E[Execute Scripts via Bash]
    E --> F[Process Results]
```

## Migration Guide

### For Skill Authors

No changes required! Existing skills work as-is. To optimize for execution:

1. **Add script descriptions** as docstrings
2. **Make scripts executable** with proper shebangs
3. **Use argparse** for clear command-line interfaces
4. **Avoid relative imports** - scripts should be standalone

### For Agent Users

Update your AGENTS.md or prompts to emphasize execution:

```markdown
Skills contain EXECUTABLE SCRIPTS. When using a skill:
1. Get its base directory
2. Execute scripts via python/bash/node
3. Never import skill modules as Python packages
```

## Comparison with Claude Code

| Feature | Claude Code | OpenSkills v3.0 |
|---------|-------------|-----------------|
| Skill Discovery | ✅ Automatic | ✅ Automatic |
| Script Execution | ✅ Via Skill tool | ✅ Via exec command |
| Progressive Disclosure | ✅ 3 levels | ✅ 3 levels |
| baseDir Resolution | ✅ Automatic | ✅ Automatic |
| Environment Setup | ✅ Internal | ✅ Via wrapper |
| Agent-Agnostic | ❌ Claude only | ✅ Any agent |

## Performance Characteristics

- **Script Discovery**: Cached for 60 seconds
- **Execution Overhead**: ~50ms to resolve paths
- **Token Savings**: ~2000 tokens vs full skill content
- **Memory Usage**: Minimal - scripts run in separate processes

## Security Considerations

1. **Scripts are executed, not sandboxed** - Review before running
2. **Environment variables** expose paths - Be cautious with sensitive data
3. **Permission system** still applies - Use `--yes` carefully
4. **No automatic installation** of dependencies

## Future Enhancements

- [ ] Dependency management (auto-install requirements.txt)
- [ ] Script sandboxing options
- [ ] Performance metrics collection
- [ ] Skill composition (skills using other skills)
- [ ] Cloud execution support

## Conclusion

OpenSkills v3.0 achieves **full execution parity** with Claude Code while remaining **agent-agnostic**. Skills are no longer just documentation - they're **executable toolkits** that any AI agent can leverage effectively.

The critical insight: **Skills are meant to be executed, not imported**. This fundamental shift transforms how agents interact with skills, moving from "understanding instructions" to "running tools".

---

*For technical implementation details, see the [source code](https://github.com/yourusername/openskills) and [spec document](OPENSKILLS_V3_SPEC.md).*
