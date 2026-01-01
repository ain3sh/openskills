export type AgentCli = 'claude' | 'droid';

export type AgentRuntimeVars = {
  /**
   * Name of the env var (exported by the agent) that points at the session env-file.
   * Hooks can append `export ...` statements to this file to persist env vars.
   */
  AGENT_ENV_FILE: string;

  /**
   * Name of the env var (exported by the agent) that points at the project root.
   */
  AGENT_PROJECT_DIR: string;
};

// Central place to map agent CLIs to their runtime-provided variables.
//
// NOTE: Factory Droid currently exposes the env-file path via `CLAUDE_ENV_FILE` in some environments.
// We intentionally map Droid's `AGENT_ENV_FILE` to `CLAUDE_ENV_FILE` for now; a commented out
// `DROID_ENV_FILE` fallback is emitted in generated hook scripts so users can flip it back once fixed.
export const AGENT_RUNTIME_VARS: Record<AgentCli, AgentRuntimeVars> = {
  claude: {
    AGENT_ENV_FILE: 'CLAUDE_ENV_FILE',
    AGENT_PROJECT_DIR: 'CLAUDE_PROJECT_DIR',
  },
  droid: {
    AGENT_ENV_FILE: 'CLAUDE_ENV_FILE',
    AGENT_PROJECT_DIR: 'FACTORY_PROJECT_DIR',
  },
};

export function getAgentRuntimeVars(agent: AgentCli): AgentRuntimeVars {
  return AGENT_RUNTIME_VARS[agent];
}
