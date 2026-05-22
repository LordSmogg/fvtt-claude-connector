import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { FoundryBridge } from "../bridge.js";

export const actorTools: Tool[] = [
  {
    name: "actor-list",
    description: "List all actors in the world. Optionally filter by type or name.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Filter by actor type (e.g. 'character', 'npc')" },
        name: { type: "string", description: "Filter by name (partial match)" },
        folder: { type: "string", description: "Filter by folder ID" },
      },
    },
  },
  {
    name: "actor-get",
    description: "Get a single actor by ID, including all system data and embedded items.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The actor's ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "actor-create",
    description: "Create a new actor. Pass arbitrary system data for the active game system.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        type: { type: "string", description: "Actor type for the active game system (e.g. 'character', 'npc')" },
        system: { type: "object", description: "System-specific data — pass through whatever the game system uses" },
        img: { type: "string", description: "Image path" },
        folder: { type: "string", description: "Folder ID" },
        prototypeToken: { type: "object", description: "Token prototype settings" },
      },
      required: ["name", "type"],
    },
  },
  {
    name: "actor-update",
    description: "Update an existing actor. Only the fields you provide will be changed.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        system: { type: "object", description: "System-specific data to update (supports dot-notation keys)" },
        img: { type: "string" },
        folder: { type: "string", description: "Move to a different folder by ID (use folder-list to find IDs)" },
        prototypeToken: { type: "object" },
      },
      required: ["id"],
    },
  },
  {
    name: "actor-delete",
    description: "Delete an actor by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
];

export async function handleActorTool(
  name: string,
  args: Record<string, unknown>,
  bridge: FoundryBridge
): Promise<unknown> {
  return bridge.call(name, args);
}
