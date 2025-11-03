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
        content: [
          {
            type: "text",
            text: JSON.stringify({ skills: cachedSkills, description: cachedDescription }),
          },
        ],
      });
    }

    if (name === "Skill") {
      const command = (args as any)?.command;
      if (!command || typeof command !== "string") {
        return CallToolResultSchema.parse({
          content: [{ type: "text", text: JSON.stringify({ error: "Missing 'command' string" }) }],
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
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: `Unknown skill: ${command}`, knownSkills: Array.from(known2).sort() }),
              },
            ],
            isError: true,
          });
        }
      }

      const { code, stdout, stderr } = await run("openskills", ["read", command, "--format=json"]);
      if (code !== 0) {
        return CallToolResultSchema.parse({
          content: [{ type: "text", text: JSON.stringify({ error: stderr || stdout || "failed to run openskills" }) }],
          isError: true,
        });
      }
      try {
        const payload = JSON.parse(stdout || "{}");
        return CallToolResultSchema.parse({ content: [{ type: "text", text: JSON.stringify(payload) }] });
      } catch (e: any) {
        return CallToolResultSchema.parse({
          content: [{ type: "text", text: JSON.stringify({ error: `invalid JSON from openskills: ${e?.message || e}` }) }],
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

main().catch((err) => {
  console.error("MCP server failed to start:", err);
  process.exit(1);
});

process.stdin.on("close", () => {
  server.close();
});
