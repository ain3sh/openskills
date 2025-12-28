# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.1.x   | :white_check_mark: |
| 2.0.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Security Model

OpenSkills implements an execution-first architecture with security as a core principle:

### Process Isolation

- **Scripts run in isolated processes** - No direct code execution in the main process
- **No eval() or dynamic imports** - All execution via subprocess spawning
- **Environment variable injection** - Context passed safely via env vars, not code

### Skill Execution

```bash
# Scripts execute in separate processes
python /path/to/skill/scripts/tool.py --arg value

# NOT via imports or eval
# No: eval(skill_code)
# No: import skill_module
```

### Permission System

Skills declare required tools in their frontmatter:

```yaml
allowed-tools: "Read,Write,Bash"
```

- Skills only access declared tools
- User approval required for unlisted tools
- No automatic privilege escalation

### Path Security

- **No path traversal** - Skills operate within their baseDir
- **Absolute paths used** - Prevents relative path exploits
- **Sanitized inputs** - Command arguments are validated

## Best Practices

### For Skill Authors

1. **Never use eval() or exec()** in skill scripts
2. **Validate all inputs** before processing
3. **Use absolute paths** with `{baseDir}` placeholder
4. **Declare minimal permissions** in allowed-tools
5. **Don't store secrets** in skill files

### For Users

1. **Review skills before installation** - Check SKILL.md and scripts
2. **Install from trusted sources** - Prefer official Anthropic skills
3. **Use project installation** - Limits scope to current project
4. **Monitor execution** - Review what scripts are being run
5. **Keep OpenSkills updated** - Security fixes in new versions

## Reporting Vulnerabilities

Please report security vulnerabilities responsibly:

1. **DO NOT** create public GitHub issues for security vulnerabilities
2. **Email**: security@openskills.dev (coming soon)
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **24 hours**: Initial acknowledgment
- **72 hours**: Preliminary assessment
- **7 days**: Detailed response and timeline
- **30 days**: Fix released (critical issues faster)

## Security Features

### Input Validation

```typescript
// All user inputs are validated
function validateSkillName(name: string): boolean {
  return /^[a-z0-9-]+$/.test(name) && name.length <= 40;
}
```

### Command Injection Prevention

```typescript
// Arguments passed safely to subprocess
const args = ['python', scriptPath, ...userArgs];
spawn(args[0], args.slice(1), { env });
```

### No Dynamic Code Loading

```typescript
// Skills are never imported or evaluated
// ❌ NEVER: require(skillPath)
// ❌ NEVER: eval(skillCode)
// ✅ ALWAYS: spawn('python', [skillScript])
```

## Known Limitations

1. **Script arguments** - Currently requires `--` separator for complex args
2. **Windows support** - Some bash scripts may not work on Windows
3. **Permissions** - Granular tool permissions not yet implemented

## Security Checklist

Before running a skill:

- [ ] Is the skill from a trusted source?
- [ ] Have you reviewed the SKILL.md?
- [ ] Are the requested permissions reasonable?
- [ ] Do the scripts look safe?
- [ ] Is the skill version specified?

## Updates

Security updates are released as:

- **Patch versions** (3.0.x) - Security fixes only
- **Minor versions** (3.x.0) - Security improvements
- **Major versions** (x.0.0) - Security architecture changes

Stay informed:
- Watch the repository for releases
- Review CHANGELOG.md for security notes
- Follow @openskills for announcements (coming soon)

---

Your security is our priority. If you have concerns, please reach out.
