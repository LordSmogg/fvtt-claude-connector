import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { FoundryBridge } from "../bridge.js";

export const combatTools: Tool[] = [
  {
    name: "combat-create",
    description: "Create a new combat encounter, optionally in a specific scene.",
    inputSchema: {
      type: "object",
      properties: {
        sceneId: { type: "string", description: "Scene to create the encounter in (defaults to active scene)" },
      },
    },
  },
  {
    name: "combat-get",
    description: "Get the current or a specific combat encounter, including all combatants.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Combat ID (omit to get the active combat)" },
      },
    },
  },
  {
    name: "combat-add-combatant",
    description: "Add a token as a combatant to an encounter.",
    inputSchema: {
      type: "object",
      properties: {
        combatId: { type: "string", description: "Combat ID (omit to use active combat)" },
        tokenId: { type: "string" },
        sceneId: { type: "string", description: "Scene the token is in (defaults to active scene)" },
        initiative: { type: "number", description: "Set initiative directly (optional)" },
      },
      required: ["tokenId"],
    },
  },
  {
    name: "combat-set-initiative",
    description: "Set the initiative value for a combatant.",
    inputSchema: {
      type: "object",
      properties: {
        combatId: { type: "string" },
        combatantId: { type: "string" },
        initiative: { type: "number" },
      },
      required: ["combatantId", "initiative"],
    },
  },
  {
    name: "combat-next-turn",
    description: "Advance the combat to the next turn.",
    inputSchema: {
      type: "object",
      properties: {
        combatId: { type: "string", description: "Combat ID (omit to use active combat)" },
      },
    },
  },
  {
    name: "combat-start",
    description: "Start a combat encounter (rolls initiative order if not set).",
    inputSchema: {
      type: "object",
      properties: {
        combatId: { type: "string", description: "Combat ID (omit to use active combat)" },
      },
    },
  },
  {
    name: "combat-end",
    description: "End and delete a combat encounter.",
    inputSchema: {
      type: "object",
      properties: {
        combatId: { type: "string", description: "Combat ID (omit to use active combat)" },
      },
    },
  },
];

export async function handleCombatTool(
  name: string,
  args: Record<string, unknown>,
  bridge: FoundryBridge
): Promise<unknown> {
  return bridge.call(name, args);
}
