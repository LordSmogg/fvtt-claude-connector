import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { FoundryBridge } from "../bridge.js";

export const compendiumTools: Tool[] = [
  {
    name: "compendium-list",
    description: "List all available compendium packs in the world.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Filter by document type: 'Actor', 'Item', 'Scene', 'JournalEntry', 'RollTable', 'Macro', 'Cards', 'Playlist'",
        },
      },
    },
  },
  {
    name: "compendium-search",
    description: "Search for documents within a compendium pack.",
    inputSchema: {
      type: "object",
      properties: {
        packId: { type: "string", description: "The compendium pack ID (e.g. 'dnd5e.heroes')" },
        query: { type: "string", description: "Name search (partial match)" },
        type: { type: "string", description: "Filter by document subtype" },
      },
      required: ["packId"],
    },
  },
  {
    name: "compendium-import",
    description: "Import a document from a compendium pack into the world.",
    inputSchema: {
      type: "object",
      properties: {
        packId: { type: "string", description: "The compendium pack ID" },
        documentId: { type: "string", description: "The document ID within the pack" },
        folder: { type: "string", description: "Destination folder ID" },
      },
      required: ["packId", "documentId"],
    },
  },
];

export async function handleCompendiumTool(
  name: string,
  args: Record<string, unknown>,
  bridge: FoundryBridge
): Promise<unknown> {
  return bridge.call(name, args);
}
