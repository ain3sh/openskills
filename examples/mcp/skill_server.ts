import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  ListToolsResultSchema,
  CallToolRequestSchema,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "node:child_process";

type SkillInfo = { name: string; description?: string; version?: string; license?: string };

/**
 * Execute a command and capture stdout/stderr
 * 
 * Security: Proper error handling prevents silent failures
 * - spawn() errors are caught and logged to stderr
 * - Exceptions during spawn are caught and returned as structured errors
 * - Exit code 127 indicates spawn failure (standard shell convention)
 */
export function run(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], env: process.env });
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf-8");
      child.stderr.setEncoding("utf-8");
      child.stdout.on("data", (d) => (stdout += String(d)));
      child.stderr.on("data", (d) => (stderr += String(d)));
      child.on("close", (code) => {
        resolve({ code: code ?? 0, stdout, stderr });
      });
      // Security: Handle spawn errors (file not found, permission denied, etc.)
      child.on("error", (err: any) => {
        const msg = String(err?.message || err);
        // Log for diagnostics; result still returned to caller as structured error
        console.error("Failed to spawn:", cmd, args.join(" "), "—", msg);
        resolve({ code: 127, stdout: "", stderr: msg });
      });
    } catch (e: any) {
      // Security: Handle synchronous spawn exceptions
      console.error("Spawn exception:", cmd, args.join(" "), "—", String(e?.message || e));
      resolve({ code: 127, stdout: "", stderr: String(e?.message || e) });
    }
  });
}

export function buildMcpContent(payload: any): Array<{ type: string; [k: string]: any }> {
  if (process.env.OPENSKILLS_MCP_JSON === "1") {
    return [{ type: "json", json: payload }];
  }
  return [{ type: "text", text: JSON.stringify(payload) }];
}

async function listSkills(): Promise<{ skills: SkillInfo[]; description: string }> {
  const { code, stdout } = await run("openskills", ["tool-description", "--format=json"]);
  if (code !== 0) {
    return {
      skills: [],
      description:
        "Skill meta-tool: call by name to load instructions. (openskills CLI not found or failed; install with npm i -g openskills)",
    };
  }
  try {
    const data = JSON.parse(stdout || "{}");
    const skills: SkillInfo[] = Array.isArray(data.skills) ? data.skills : [];
    const names = skills.map((s) => s.name).filter(Boolean).join(", ");
    const oneLine = data.oneLine || `Skill tool: call by name to load instructions. Skills: ${names}`;
    const detailed = data.detailed || oneLine;
    return { skills, description: detailed };
  } catch {
    return {
      skills: [],
      description: "Skill meta-tool: call by name to load instructions. (invalid JSON from openskills)",
    };
  }
}

function skillDoc(skills: SkillInfo[]): string {
  const names = skills.map((s) => s.name).filter(Boolean).join(", ");
  let meta = "Use the Skill tool to invoke a specific skill by name. ";
  if (names) meta += `Available skills: ${names}.`;
  else meta += "No skills discovered at startup.";
  meta += "\nArgument: command — exact skill name (string).";
  return meta;
}

export function extractCommand(args: unknown): string | undefined {
  const a: any = args || {};
  const cmd = a?.command ?? a?.name;
  return typeof cmd === "string" ? cmd : undefined;
}

const server = new Server(
  { name: "openskills-mcp-server", version: "0.1.0" },
  { capabilities: { tools: { listChanged: false } } }
);

let cachedSkills: SkillInfo[] = [];
let cachedDescription = "";

async function initialize() {
  const { skills, description } = await listSkills();
  cachedSkills = skills;
  cachedDescription = description;

  // tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = [
      {
        name: "Skill",
        description: skillDoc(cachedSkills),
        inputSchema: {
          type: "object",
          properties: {
            command: { type: "string" },
          },
        },
      },
      {
        name: "skill_refresh",
        description: "Refresh the Skill tool's cached skill list and return current metadata.",
        inputSchema: { type: "object" },
      },
    ];
    return ListToolsResultSchema.parse({ tools });
  });

  // tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params as any;
    if (name === "skill_refresh") {
      const refreshed = await listSkills();
      cachedSkills = refreshed.skills;
      cachedDescription = refreshed.description;
      return CallToolResultSchema.parse({
        content: buildMcpContent({ skills: cachedSkills, description: cachedDescription }),
      });
    }

    if (name === "Skill") {
      const command = extractCommand(args);
      if (!command) {
        return CallToolResultSchema.parse({
          content: buildMcpContent({ error: "Missing 'command' string" }),
          isError: true,
        });
      }

      const known = new Set(cachedSkills.map((s) => s.name));
      if (!known.has(command)) {
        const refreshed = await listSkills();
        cachedSkills = refreshed.skills;
        cachedDescription = refreshed.description;
        const known2 = new Set(cachedSkills.map((s) => s.name));
        if (!known2.has(command)) {
          return CallToolResultSchema.parse({
            content: buildMcpContent({ error: `Unknown skill: ${command}`, knownSkills: Array.from(known2).sort() }),
            isError: true,
          });
        }
      }

      const { code, stdout, stderr } = await run("openskills", ["read", command, "--format=json"]);
      if (code !== 0) {
        return CallToolResultSchema.parse({
          content: buildMcpContent({ error: stderr || stdout || "failed to run openskills" }),
          isError: true,
        });
      }
      try {
        const payload = JSON.parse(stdout || "{}");
        return CallToolResultSchema.parse({ content: buildMcpContent(payload) });
      } catch (e: any) {
        return CallToolResultSchema.parse({
          content: buildMcpContent({ error: `invalid JSON from openskills: ${e?.message || e}` }),
          isError: true,
        });
      }
    }

    return CallToolResultSchema.parse({
      content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
      isError: true,
    });
  });
}

async function main() {
  await initialize();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (!process.env.OPENSKILLS_MCP_TEST) {
  main().catch((err) => {
    console.error("MCP server failed to start:", err);
    process.exit(1);
  });
}

// Security: Prevent double-close resource leak
// Guard flag ensures server.close() is only called once
let closed = false;
process.stdin.on("close", () => {
  if (!closed) {
    closed = true;
    server.close();
  }
});
