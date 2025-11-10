# Security Policy

## Supported Versions

We provide security updates for the latest version.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ Active support |
| < 1.0   | ❌ No longer supported |

## Security Considerations

### ReDoS (Regular Expression Denial of Service) Protection

OpenSkills implements strict bounds on all regular expressions to prevent catastrophic backtracking attacks:

✅ **Protections in place:**
- **Path extraction** (`src/utils/refs.ts`): Limited to 100 chars per segment, max 10 nested levels
- **Permission parsing** (`src/utils/permissions.ts`): Tool names capped at 50 chars, scoped patterns at 1000 chars
- **Token matching** (`src/commands/suggest.ts`): Tokens capped at 64 chars, max 100 matches per token
- All regex patterns use bounded quantifiers for O(n) linear time complexity

🔒 **Attack vectors prevented:**
- Long nested paths like `"scripts/" + "a/".repeat(1000)`
- Malicious tool names with 10,000+ characters
- Repeated pattern attacks in search/suggest functionality

### Resource Leak Prevention

OpenSkills prevents resource leaks in MCP server operation:

✅ **Protections in place:**
- **Double-close guard**: `stdin.on("close")` handler uses flag to prevent multiple `server.close()` calls
- **Spawn error handling**: All `child_process.spawn()` calls include `error` event handlers
- **Structured error codes**: Exit code 127 for spawn failures (standard shell convention)
- **Stderr logging**: All spawn errors logged for diagnostics

### Safe Module Loading

Dynamic `require()` calls properly distinguish error types:

✅ **Protections in place:**
- **MODULE_NOT_FOUND**: Detected via `err.code === 'MODULE_NOT_FOUND'`
- **Other errors**: Syntax errors, permission errors reported separately
- **Meaningful messages**: Different error messages for different failure modes

### Type Safety

Proper type guards prevent undefined access errors:

✅ **Protections in place:**
- `allowed-tools` validated as Array/string/undefined before use
- No unsafe array spreads on potentially undefined values
- Comprehensive type checking for frontmatter fields

### Git Credentials

OpenSkills clones repositories from GitHub. To protect your security:

✅ **What we do:**
- Use `git clone` with HTTPS (no credentials required for public repos)
- Clean up temporary directories after installation
- Only install from public repositories by default

⚠️ **What you should do:**
- Only install skills from trusted sources
- Review SKILL.md content before loading in AI agents
- Be cautious with skills that include executable scripts
- Verify repository ownership before installing

### Reporting a Vulnerability

If you discover a security vulnerability:

1. **DO NOT open a public issue**
2. Email: security@[check GitHub profile for contact]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We aim to respond to security reports within 48 hours.

### Responsible Disclosure

We follow responsible disclosure practices:
- Security issues are patched before public disclosure
- Reporter receives credit (unless anonymity is requested)
- Timeline for disclosure is coordinated with reporter

### Security Testing

OpenSkills includes comprehensive security tests:

```bash
# Run all security tests
npm test tests/security

# Individual test suites
npm test tests/security/redos.test.ts      # ReDoS protection
npm test tests/security/spawn.test.ts      # Resource leaks
npm test tests/security/require.test.ts    # Module loading
```

**Test coverage:**
- ReDoS attack vectors with malicious inputs
- Spawn failure scenarios and error handling  
- Resource leak prevention (double-close guards)
- Dynamic module loading edge cases
- Type safety and undefined access prevention

All security tests must pass before any release.

### Security Best Practices

When using OpenSkills:

- **Verify sources:** Only install skills from trusted repositories
- **Review content:** Check SKILL.md before loading in agents
- **Inspect scripts:** Review any executable scripts in skills/scripts/
- **Keep updated:** Use the latest version for security patches
- **Report issues:** If you find malicious skills, report them

### Out of Scope

The following are **not** security vulnerabilities:
- Skills with poor quality or incorrect instructions
- Git clone failures due to network issues
- Skills that don't work as described
- Repository not found errors

### Dependencies

OpenSkills minimizes dependencies for security:
- **Only dependency:** `commander` (CLI framework)
- Regular dependency updates for security patches
- No network requests except `git clone`
- No telemetry or analytics

## Questions?

For security questions that are not vulnerabilities, open a discussion thread on GitHub.

---

**Note:** OpenSkills is not affiliated with Anthropic. For Anthropic security concerns, contact Anthropic directly.
