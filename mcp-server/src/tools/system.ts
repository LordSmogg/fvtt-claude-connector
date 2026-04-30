import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { FoundryBridge } from "../bridge.js";

export const systemTools: Tool[] = [
  {
    name: "system-info",
    description:
      "Get information about the active game system: ID, title, version, supported actor/item types, and the full data model schema. Use this to understand what types and fields are valid for the current game system before creating or updating actors and items.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function handleSystemTool(
  name: string,
  args: Record<string, unknown>,
  bridge: FoundryBridge
): Promise<unknown> {
  return bridge.call(name, args);
}
