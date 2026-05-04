import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { FoundryBridge } from "../bridge.js";

export const itemTools: Tool[] = [
  {
    name: "item-list",
    description: "List all world-level items (not embedded in actors). Optionally filter by type or name.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Filter by item type" },
        name: { type: "string", description: "Filter by name (partial match)" },
        folder: { type: "string", description: "Filter by folder ID" },
      },
    },
  },
  {
    name: "item-get",
    description: "Get a single world-level item by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "item-create",
    description: "Create a new world-level item. Always call system-info first to get valid item types and field names for the active game system. Use the dedicated system fields for structured data (availability, price, page, etc.) rather than duplicating them in the description HTML.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        type: { type: "string", description: "Item type for the active game system (e.g. 'mod', 'gear', 'spell')" },
        system: { type: "object", description: "System-specific item data. Use system-info to find valid fields." },
        img: { type: "string" },
        folder: { type: "string" },
      },
      required: ["name", "type"],
    },
  },
  {
    name: "item-update",
    description: "Update a world-level item.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        system: { type: "object" },
        img: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "item-delete",
    description: "Delete a world-level item by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "actor-item-list",
    description: "List all items embedded in an actor (the actor's inventory/sheet items).",
    inputSchema: {
      type: "object",
      properties: {
        actorId: { type: "string" },
        type: { type: "string", description: "Filter by item type" },
      },
      required: ["actorId"],
    },
  },
  {
    name: "actor-item-add",
    description:
      "Add an item to an actor. Either provide a worldItemId to copy a world item, or provide name+type+system to create a new embedded item directly. Use dedicated system fields for structured data rather than duplicating them in description HTML.",
    inputSchema: {
      type: "object",
      properties: {
        actorId: { type: "string" },
        worldItemId: { type: "string", description: "ID of an existing world item to copy onto the actor" },
        name: { type: "string", description: "Name of a new item to create (used when worldItemId is not provided)" },
        type: { type: "string" },
        system: { type: "object" },
        img: { type: "string" },
      },
      required: ["actorId"],
    },
  },
  {
    name: "actor-item-update",
    description: "Update an item embedded in an actor.",
    inputSchema: {
      type: "object",
      properties: {
        actorId: { type: "string" },
        itemId: { type: "string" },
        name: { type: "string" },
        system: { type: "object" },
        img: { type: "string" },
      },
      required: ["actorId", "itemId"],
    },
  },
  {
    name: "actor-item-remove",
    description: "Remove an embedded item from an actor.",
    inputSchema: {
      type: "object",
      properties: {
        actorId: { type: "string" },
        itemId: { type: "string" },
      },
      required: ["actorId", "itemId"],
    },
  },
];

export async function handleItemTool(
  name: string,
  args: Record<string, unknown>,
  bridge: FoundryBridge
): Promise<unknown> {
  return bridge.call(name, args);
}
