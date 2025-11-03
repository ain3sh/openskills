import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from "node:child_process";

type SkillInfo = { name: string; description?: string; version?: string; license?: string };

function run(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
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
    child.on("error", (err: any) => {
      resolve({ code: 1, stdout: "", stderr: String(err?.message || err) });
    });
  });
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

const server = new McpServer({ name: "openskills-mcp-server", version: "0.1.0" });

let cachedSkills: SkillInfo[] = [];
let cachedDescription = "";

async function initialize() {
  const { skills, description } = await listSkills();
  cachedSkills = skills;
  cachedDescription = description;

  // Register Skill tool with dynamic description
  server.registerTool(
    {
      name: "Skill",
      description: skillDoc(cachedSkills),
      inputSchema: z
        .object({
          command: z.string().min(1).describe("Exact skill name to load"),
        })
        .strict(),
    },
    async (input: { command: string }) => {
      const known = new Set(cachedSkills.map((s) => s.name));
      if (!known.has(input.command)) {
        const refreshed = await listSkills();
        cachedSkills = refreshed.skills;
        cachedDescription = refreshed.description;
        const known2 = new Set(cachedSkills.map((s) => s.name));
        if (!known2.has(input.command)) {
          return {
            content: [
              {
                type: "json",
                json: { error: `Unknown skill: ${input.command}`, knownSkills: Array.from(known2).sort() },
              },
            ],
          };
        }
      }

      const { code, stdout, stderr } = await run("openskills", ["read", input.command, "--format=json"]);
      if (code !== 0) {
        return { content: [{ type: "json", json: { error: stderr || stdout || "failed to run openskills" } }] };
      }
      try {
        const payload = JSON.parse(stdout || "{}");
        return { content: [{ type: "json", json: payload }] };
      } catch (e: any) {
        return { content: [{ type: "json", json: { error: `invalid JSON from openskills: ${e?.message || e}` } }] };
      }
    }
  );

  // Optional: refresh tool to update cache/description
  server.registerTool(
    {
      name: "skill_refresh",
      description: "Refresh the Skill tool's cached skill list and return current metadata.",
      inputSchema: z.object({}).strict(),
    },
    async () => {
      const refreshed = await listSkills();
      cachedSkills = refreshed.skills;
      cachedDescription = refreshed.description;
      return { content: [{ type: "json", json: { skills: cachedSkills, description: cachedDescription } }] };
    }
  );
}

async function main() {
  await initialize();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server failed to start:", err);
  process.exit(1);
});

process.stdin.on("close", () => {
  server.close();
});
