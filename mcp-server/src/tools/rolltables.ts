import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { FoundryBridge } from "../bridge.js";

export const rolltableTools: Tool[] = [
  {
    name: "rolltable-list",
    description: "List all roll tables in the world.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Filter by name (partial match)" },
        folder: { type: "string" },
      },
    },
  },
  {
    name: "rolltable-get",
    description: "Get a roll table by ID, including all its results.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "rolltable-create",
    description: "Create a new roll table.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        formula: { type: "string", description: "Roll formula (e.g. '1d20')" },
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              range: {
                type: "array",
                description: "Numeric range [min, max]",
                items: { type: "number" },
              },
              text: { type: "string", description: "Result text" },
              type: { type: "number", description: "0=text, 1=document, 2=compendium" },
            },
            required: ["range", "text"],
          },
        },
        folder: { type: "string" },
        replacement: { type: "boolean", description: "Draw with replacement (default true)" },
      },
      required: ["name", "results"],
    },
  },
  {
    name: "rolltable-roll",
    description: "Roll on a table and get the result.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        displayChat: { type: "boolean", description: "Show result in chat (default false)" },
      },
      required: ["id"],
    },
  },
];

export async function handleRolltableTool(
  name: string,
  args: Record<string, unknown>,
  bridge: FoundryBridge
): Promise<unknown> {
  return bridge.call(name, args);
}
