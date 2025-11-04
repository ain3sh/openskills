# 🎯 OPENSKILLS CLAUDE SKILLS PARITY PROJECT

## 📍 PROJECT STATUS

**Current Branch**: `main` (base implementation, ~806 LOC)
**Target**: Full parity with Claude Code's closed-source Skills implementation
**Blocker**: 11 critical security vulnerabilities in PR branches preventing merge
**Overall Parity**: Main branch at 16%, PR #2 at 69% (blocked by security issues)

---

## 🎓 CONTEXT FOR POST-COMPACT WARMUP

### What is OpenSkills?
OpenSkills is a CLI tool that brings Anthropic's Claude Skills system to all AI coding agents (Cursor, Windsurf, Aider, etc.). It replicates Claude Code's skills architecture using the same SKILL.md format, YAML frontmatter, and progressive disclosure pattern.

### What are we doing?
We're achieving **complete parity** with Claude Code's closed-source Skills implementation as documented in the comprehensive blog post deep dive. The reference blog post reverse-engineers Claude's internal architecture including:
- Meta-tool design (Skill tool manages individual skills)
- Two-message injection pattern (metadata visible, prompt hidden via `isMeta` flag)
- Execution context modification (permissions, model override, reasoning effort)
- Progressive disclosure (token budget limiting, skill filtering)
- Resource bundling (scripts/, references/, assets/)

### Why the complexity?
Skills are NOT simple prompt templates. They are sophisticated prompt-based context modifiers that:
1. Inject specialized instructions into conversation context
2. Modify execution context (tool permissions, model selection, thinking tokens)
3. Support dynamic discovery via meta-tool architecture
4. Implement security boundaries through permission systems

---

## 📚 CRITICAL FILES TO READ

### Reference Materials
- `@references/PARITY_ANALYSIS.md` - **COMPLETE** gap analysis, security issues, implementation status
- `@references/claude-skills-blog/blog-content-full.md` - **THE BAR** we're matching (1,247 lines)
- `@references/claude-skills-blog/README.md` - Quick reference for blog concepts
- `@references/claude-skills-blog/01-claude-skill-flowchart.png` - Main architecture diagram
- `@references/claude-skills-blog/08-claude-skill-execution-flow.png` - Tool vs Skill comparison
- `@references/claude-skills-blog/11-turn-1-completion.png` - Message injection flow

### Current Implementation (Main Branch)
- `@src/types.ts` - Core type definitions (Skill, SkillLocation, SkillMetadata)
- `@src/commands/read.ts` - Basic skill reading (30 LOC, no JSON support)
- `@src/utils/yaml.ts` - Basic YAML extraction (14 LOC, regex-based)
- `@src/utils/skills.ts` - Skill discovery logic (64 LOC)
- `@package.json` - Dependencies and scripts

### PR Branch Implementation (Security-Blocked)
Check `origin/droid/parity-fixes` branch for:
- `src/types.ts` - Extended with SkillFrontmatter, ContextModifier, ReadJsonOutput
- `src/commands/read.ts` - JSON output with 3-message structure
- `src/commands/describe.ts` - Metadata export
- `src/commands/suggest.ts` - Semantic search (HAS REDOS VULN)
- `src/commands/validate.ts` - Resource validation
- `src/commands/tool-description.ts` - Meta-tool description generator
- `src/commands/skill-prompt.ts` - LLM meta-prompt generator
- `src/utils/yaml.ts` - Full YAML parser using yaml library
- `src/utils/permissions.ts` - Permission normalization (HAS REDOS VULN)
- `src/utils/presentability.ts` - Skill filtering logic
- `src/utils/refs.ts` - Reference extraction (HAS CRITICAL REDOS VULN)
- `src/utils/frontmatterLint.ts` - Frontmatter validation
- `examples/mcp/skill_server.ts` - MCP meta-tool server (HAS RESOURCE LEAK)

### Code Review Feedback
PR #1: 7 security issues flagged
PR #2: 4 remaining security issues after attempted fixes
**All issues documented in**: `@references/PARITY_ANALYSIS.md` Section "CRITICAL SECURITY ISSUES"

---

## 🚨 IMMEDIATE BLOCKERS

### 11 Security Vulnerabilities (MUST FIX FIRST)

#### Critical (ReDoS - Regular Expression Denial of Service)
1. **`src/utils/refs.ts:5`** - Catastrophic backtracking in reference extraction regex
   ```typescript
   // VULNERABLE: (?:references|scripts|assets)\/[\w.-]+(?:\/[\w.-]+)*
   // FIX: Bound quantifiers: (?:references|scripts|assets)\/[\w.-]{1,100}(?:\/[\w.-]{1,100}){0,10}
   ```

2. **`src/utils/permissions.ts:35`** - Unbounded outer capture group
   ```typescript
   // VULNERABLE: /^(\w+)(?:\(([^)]{0,1000})\))?$/i
   // FIX: /^(\w{1,50})(?:\(([^)]{0,1000})\))?$/i
   ```

3. **`src/commands/suggest.ts`** - Unbounded regex in token matching
   ```typescript
   // VULNERABLE: Multiple unbounded quantifiers in countBoundedOccurrences
   // FIX: Add token length cap (64 chars) and match count cap (100)
   ```

#### High (Resource Leaks & Unsafe Operations)
4. **`examples/mcp/skill_server.ts:178`** - Resource leak in stdin close handler
5. **`examples/mcp/skill_server.ts:24`** - Missing spawn error handling
6. **`src/commands/validate.ts:87`** - Unsafe dynamic require without proper error handling
7. **`src/commands/read.ts:42`** - Potential undefined access in allowedTools array

#### Medium (Path Traversal & Error Handling)
8-11. Various error handling and validation issues

**ALL DETAILS**: See `@references/PARITY_ANALYSIS.md` Section "CRITICAL SECURITY ISSUES"

---

## 📋 IMPLEMENTATION ROADMAP

### PHASE 1: SECURITY FIXES (MANDATORY - BLOCKS EVERYTHING)

#### Step 1.1: Fix ReDoS Vulnerabilities
- [ ] Fix `src/utils/refs.ts` - Bound reference extraction regex quantifiers
- [ ] Fix `src/utils/permissions.ts` - Bound tool pattern regex
- [ ] Fix `src/commands/suggest.ts` - Replace unbounded regex with bounded token matching
- [ ] Add regex safety constants (MAX_TOKEN_LENGTH=64, MAX_MATCHES=100, MAX_PATH_SEGMENTS=10)

#### Step 1.2: Fix Resource Leaks & Spawn Errors
- [ ] Add double-close guard in `examples/mcp/skill_server.ts` stdin handler
- [ ] Add proper spawn error handling with structured error codes
- [ ] Add cleanup guards for server.close()
- [ ] Log spawn errors to stderr for diagnostics

#### Step 1.3: Fix Unsafe Dynamic Operations
- [ ] Fix dynamic require in `src/commands/validate.ts` with proper error codes (MODULE_NOT_FOUND vs others)
- [ ] Add undefined checks in `src/commands/read.ts` allowedTools construction
- [ ] Validate all user input before passing to regex or file operations

#### Step 1.4: Security Testing
- [ ] Create `tests/security/redos.test.ts` - Test all regex patterns with malicious inputs
- [ ] Create `tests/security/spawn.test.ts` - Test spawn failure scenarios
- [ ] Create `tests/security/require.test.ts` - Test module loading edge cases
- [ ] Run security tests in CI/CD pipeline

#### Step 1.5: Security Documentation
- [ ] Document all regex patterns and their bounds in code comments
- [ ] Add security section to README.md
- [ ] Create SECURITY.md with vulnerability reporting process

---

### PHASE 2: MISSING CORE FEATURES

#### Step 2.1: Token Budget & Skill Filtering
- [ ] Create `src/utils/skillToolDescription.ts`
- [ ] Implement `buildSkillToolDescription()` with 15,000 char limit
- [ ] Separate mode commands from regular commands
- [ ] Add token counting function (accurate character count)
- [ ] Add skill entry formatting with XML structure
- [ ] Test with large skill sets (>50 skills)

#### Step 2.2: Multi-Source Skill Discovery
- [ ] Extend `src/utils/dirs.ts` with SkillSource interface
- [ ] Add `getAllSkillSources()` with priority ordering:
  - Priority 1: Project (.agent/skills/, .claude/skills/)
  - Priority 2: User (~/.agent/skills/, ~/.claude/skills/)
  - Priority 3: Plugins (scan ~/.claude/plugins/*/skills/)
  - Priority 4: Built-in (package embedded skills)
- [ ] Implement flexible skills directory resolution as per:
    `https://github.com/intellectronica/skillz#directory-structure-skillz-vs-claude-code`
- [ ] Implement `discoverPluginSkills()` helper
- [ ] Add built-in skills directory to package
- [ ] Update skill loading to respect priority (first found wins)
- [ ] Add source metadata to skill objects

#### Step 2.3: Validation Error Codes
- [ ] Create `enum SkillErrorCode` in `src/commands/read.ts`:
  - EMPTY_COMMAND = 1
  - UNKNOWN_SKILL = 2
  - LOAD_FAILED = 3
  - INVOCATION_DISABLED = 4
  - NOT_PROMPT_BASED = 5
- [ ] Implement `validateSkillCommand()` function
- [ ] Return structured error objects with codes
- [ ] Update all commands to use error codes
- [ ] Add error code documentation

#### Step 2.4: Full Permission System
- [ ] Create `interface PermissionRule` in `src/utils/permissions.ts`
- [ ] Implement `checkSkillPermissions()` with three-tier logic:
  1. Check deny rules (block immediately)
  2. Check allow rules (permit if matched)
  3. Default to ask behavior
- [ ] Add `matchesPattern()` with wildcard support
- [ ] Implement permission rule parsing from config
- [ ] Add user prompt integration (for ask behavior)
- [ ] Test permission precedence (deny > allow > ask)

#### Step 2.5: Attachment Messages
- [ ] Add attachment message support to `src/commands/read.ts`
- [ ] Create `interface AttachmentMessage` type
- [ ] Support diagnostics attachments (error logs, warnings)
- [ ] Support file reference attachments (bundled resources)
- [ ] Support context attachments (additional instructions)
- [ ] Include attachments in JSON output conditionally

---

### PHASE 3: DOCUMENTATION & POLISH

#### Step 3.1: API Documentation
- [ ] Create `docs/API.md` with JSON schemas for:
  - `read --format=json` output (ReadJsonOutput)
  - `describe --format=json` output
  - `suggest --format=json` output
  - `validate --format=json` output
  - `tool-description --format=json` output
  - `list --format=json` output
- [ ] Add TypeScript type definitions for all schemas
- [ ] Include example JSON outputs
- [ ] Document error response formats

#### Step 3.2: Integration Guides
- [ ] Create `docs/INTEGRATION.md` - Guide for agent authors:
  - How to invoke OpenSkills from agents
  - How to parse JSON outputs
  - How to implement contextModifier
  - How to handle permissions
  - Example integrations (Claude Code, Cursor, Windsurf)
- [ ] Create `docs/CONTEXTMODIFIER.md` - Deep dive on execution context:
  - allowedTools implementation
  - model override handling
  - reasoningEffort integration
  - tokens budget enforcement
  - mode command special handling
- [ ] Create `docs/MCP.md` - MCP server setup:
  - Installation and configuration
  - .mcp.json examples
  - Skill tool usage
  - Troubleshooting
- [ ] Create `docs/SECURITY.md` - Security model:
  - Permission system architecture
  - Deny/allow/ask rule precedence
  - Threat model and mitigations
  - ReDoS protections
  - Safe regex patterns

#### Step 3.3: Test Coverage
- [ ] Unit tests for all utilities (target: 90%+):
  - `tests/utils/permissions.test.ts` (extend)
  - `tests/utils/refs.test.ts` (extend)
  - `tests/utils/yaml.test.ts` (extend)
  - `tests/utils/presentability.test.ts` (extend)
  - `tests/utils/skillToolDescription.test.ts` (new)
- [ ] Integration tests for workflows:
  - `tests/integration/full-workflow.test.ts`
  - `tests/integration/json-outputs.test.ts`
  - `tests/integration/permission-flow.test.ts`
- [ ] JSON schema validation tests:
  - `tests/schemas/read-output.test.ts`
  - `tests/schemas/describe-output.test.ts`
  - Validate outputs match documented schemas
- [ ] MCP server tests:
  - `tests/mcp/skill-tool.test.ts`
  - `tests/mcp/refresh.test.ts`
  - `tests/mcp/error-handling.test.ts`

#### Step 3.4: UX Polish
- [ ] Structured error outputs with error codes
- [ ] Actionable suggestions in error messages
- [ ] Consistent JSON error schema: `{ error: string, errorCode?: number, suggestion?: string }`
- [ ] Better progress indicators for long operations (using ora)
- [ ] Color-coded output in text mode (using chalk)
- [ ] Verbose mode flag (`-v, --verbose`) for debugging
- [ ] Quiet mode flag (`-q, --quiet`) for scripting

---

## 🔄 MERGE STRATEGY

### Option A: Security-First Merge (RECOMMENDED)

#### Step A.1: Create Security Hotfix Branch
- [ ] Create `security-hotfix` branch from `origin/droid/parity-fixes`
- [ ] Cherry-pick only security-related changes
- [ ] Apply all 11 security fixes
- [ ] Add comprehensive security tests
- [ ] NO new features in this branch

#### Step A.2: Security Review & Merge
- [ ] Run all security tests
- [ ] Manual security audit
- [ ] Code review focused on security fixes
- [ ] Merge `security-hotfix` → `main`
- [ ] Tag as `v2.0.0-security`

#### Step A.3: Feature Branches
- [ ] Create `feature/token-budget` from main
- [ ] Create `feature/multi-source` from main
- [ ] Create `feature/error-codes` from main
- [ ] Create `feature/permissions` from main
- [ ] Each feature: implement → test → document → PR → merge

#### Step A.4: Documentation & Polish
- [ ] Create `docs/comprehensive` from main
- [ ] Write all documentation
- [ ] Achieve 80%+ test coverage
- [ ] UX improvements
- [ ] Merge → tag as `v2.0.0`

### Option B: Fresh Branch (Alternative)

#### Step B.1: Create Clean Branch
- [ ] Create `parity-v2` branch from `main`
- [ ] Cherry-pick ONLY clean implementations from PR #2
- [ ] Fix security issues during cherry-pick (don't import vulnerable code)

#### Step B.2: Incremental Build
- [ ] Add features one by one with tests
- [ ] Commit frequently with clear messages
- [ ] Keep main branch stable

#### Step B.3: Final Merge
- [ ] Comprehensive testing
- [ ] Documentation complete
- [ ] Merge `parity-v2` → `main`

---

## 🎯 SUCCESS CRITERIA

### Functional Completeness
- [ ] All frontmatter fields supported (17 fields)
- [ ] All JSON output commands working (6 commands)
- [ ] Two-message injection pattern implemented
- [ ] contextModifier fully functional
- [ ] Permission system with deny/allow/ask
- [ ] Multi-source skill discovery (user/project/plugin/builtin)
- [ ] Token budget limiting (15,000 chars)
- [ ] MCP meta-tool server operational

### Security & Quality
- [ ] Zero critical security vulnerabilities
- [ ] Zero high-priority security issues
- [ ] All regex patterns bounded
- [ ] No resource leaks
- [ ] 80%+ test coverage
- [ ] All tests passing in CI

### Documentation
- [ ] API documentation complete with schemas
- [ ] Integration guide for agent authors
- [ ] contextModifier implementation guide
- [ ] MCP setup documentation
- [ ] Security model documented

### Parity Score
- [ ] Core Parsing: 100%
- [ ] JSON Outputs: 100%
- [ ] Security: 100%
- [ ] Permissions: 100%
- [ ] Discovery: 100%
- [ ] Validation: 100%
- [ ] MCP Server: 100%
- [ ] Documentation: 95%+
- [ ] Tests: 90%+
- [ ] **OVERALL: 98%+**

---

## 🔍 VERIFICATION CHECKLIST

Before claiming parity complete, verify against blog post:

### Architecture Match
- [ ] Skills are prompt templates (NOT executable code) ✓
- [ ] Meta-tool pattern (Skill tool manages individual skills) ✓
- [ ] Two-message injection (metadata + hidden prompt) ✓
- [ ] Execution context modification (permissions + model + tokens) ✓
- [ ] Progressive disclosure (token budget + filtering) ⚠️
- [ ] LLM reasoning-based selection (no algorithmic matching) ✓

### SKILL.md Format
- [ ] YAML frontmatter with --- delimiters ✓
- [ ] All required fields (name, description) ✓
- [ ] All optional fields (17 total) ✓
- [ ] Markdown content (instructions) ✓
- [ ] {baseDir} variable resolution ✓

### Resource Bundling
- [ ] scripts/ directory support ✓
- [ ] references/ directory support ✓
- [ ] assets/ directory support ✓
- [ ] Relative path resolution ✓
- [ ] Resource validation ✓

### Permission System
- [ ] Comma-separated string parsing ✓
- [ ] Wildcard support (Bash(git:*)) ✓
- [ ] Scoped permissions ✓
- [ ] Deny rules ⚠️
- [ ] Allow rules ⚠️
- [ ] Ask behavior ⚠️

### JSON Outputs
- [ ] read --format=json (3-message structure) ✓
- [ ] describe --format=json ✓
- [ ] suggest --format=json ✓
- [ ] validate --format=json ✓
- [ ] tool-description --format=json ✓
- [ ] list --format=json ✓

### MCP Server
- [ ] TypeScript implementation ✓
- [ ] Official SDK usage ✓
- [ ] Skill tool with dynamic description ✓
- [ ] skill_refresh tool ✓
- [ ] JSON content support ✓

### Security
- [ ] No ReDoS vulnerabilities ⚠️
- [ ] No resource leaks ⚠️
- [ ] Safe file operations ✓
- [ ] Input validation ✓
- [ ] Error handling ✓

**Legend**: ✓ = Implemented, ⚠️ = Needs work, ❌ = Missing

---

## 💡 IMPLEMENTATION TIPS

### When Fixing Security Issues
1. Always add a test that would have caught the vulnerability
2. Document the attack vector in comments
3. Add bounds to ALL quantifiers in regex patterns
4. Use constants for limits (MAX_*, LIMIT_*)
5. Never trust user input - validate everything

### When Adding Features
1. Read the blog post section FIRST
2. Check if PR #2 has partial implementation (cherry-pick if clean)
3. Write tests BEFORE implementation (TDD approach)
4. Add type definitions to `src/types.ts` first
5. Update documentation simultaneously

### When Writing Tests
1. Test happy path
2. Test error cases
3. Test edge cases (empty, null, undefined)
4. Test malicious input (security)
5. Test performance (large inputs)

### When Writing Documentation
1. Include code examples
2. Show expected outputs
3. Explain WHY not just WHAT
4. Link to related docs
5. Keep it up to date with code

---

## 🚀 QUICK START FOR POST-COMPACT

### Immediate Actions
1. Read `@references/PARITY_ANALYSIS.md` in full
2. Review `@references/claude-skills-blog/blog-content-full.md` (focus on architecture sections)
3. Check current branch: `git status`
4. Review PR #2 changes: `git diff main..origin/droid/parity-fixes --stat`

### Start Implementation
1. Create security hotfix branch: `git checkout -b security-hotfix origin/droid/parity-fixes`
2. Start with Step 1.1 (Fix ReDoS vulnerabilities)
3. Work through PHASE 1 systematically
4. DO NOT move to PHASE 2 until all security issues resolved

### Command Reference
```bash
# View PR branches
git branch -a

# Check PR changes
git diff main..origin/droid/parity-fixes src/utils/refs.ts

# Run tests
npm test

# Run specific test
npm test -- refs

# Build
npm run build

# Type check
npm run typecheck
```

---

## 📞 CONTEXT RESTORATION CHECKLIST

When resuming after compression, verify you understand:
- [ ] What OpenSkills is (CLI tool for Claude Skills)
- [ ] What we're matching (Claude Code's internal Skills implementation)
- [ ] Why it's complex (meta-tool, context modification, security)
- [ ] The blocker (11 security vulnerabilities)
- [ ] The strategy (security first, then features, then docs)
- [ ] The reference (blog post is THE specification)
- [ ] The current state (main=16%, PR#2=69% but blocked)
- [ ] The goal (98%+ parity, zero critical security issues)

---

**REMEMBER**: The blog post at `@references/claude-skills-blog/blog-content-full.md` is the authoritative specification. When in doubt, check the blog. When implementing, match the blog. Success is measured by how closely we replicate Claude Code's actual behavior as documented there.
