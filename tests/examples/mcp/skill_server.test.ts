import { describe, it, expect } from "vitest";

describe("MCP skill_server helpers", () => {
  it("extractCommand accepts canonical 'command' and alias 'name'", async () => {
    process.env.OPENSKILLS_MCP_TEST = "1";
    const mod = await import("../../examples/mcp/skill_server.ts");
    expect(mod.extractCommand({ command: "pdf" })).toBe("pdf");
    expect(mod.extractCommand({ name: "csv" })).toBe("csv");
    expect(mod.extractCommand({})).toBeUndefined();
    expect(mod.extractCommand(null as any)).toBeUndefined();
  });

  it("run returns code 127 when command cannot be spawned", async () => {
    process.env.OPENSKILLS_MCP_TEST = "1";
    const mod = await import("../../examples/mcp/skill_server.ts");
    const res = await mod.run("openskills-not-installed-or-missing-binary", ["--version"]);
    expect(res.code).toBe(127);
    expect(typeof res.stderr).toBe("string");
  });
});
