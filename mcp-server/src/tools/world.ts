import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { FoundryBridge } from "../bridge.js";

export const worldTools: Tool[] = [
  {
    name: "world-info",
    description:
      "Get information about the current Foundry world: name, system, active users, active scene, and world settings.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function handleWorldTool(
  name: string,
  args: Record<string, unknown>,
  bridge: FoundryBridge
): Promise<unknown> {
  return bridge.call(name, args);
}
