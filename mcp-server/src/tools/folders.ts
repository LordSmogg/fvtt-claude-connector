import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { FoundryBridge } from "../bridge.js";

export const folderTools: Tool[] = [
  {
    name: "folder-list",
    description: "List folders, optionally filtered by the document type they contain.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description:
            "Document type: 'Actor', 'Item', 'Scene', 'JournalEntry', 'RollTable', 'Macro', 'Cards', 'Playlist'",
        },
      },
    },
  },
  {
    name: "folder-create",
    description: "Create a new folder to organize documents.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        type: {
          type: "string",
          description:
            "Document type this folder contains: 'Actor', 'Item', 'Scene', 'JournalEntry', 'RollTable', 'Macro'",
        },
        parent: { type: "string", description: "Parent folder ID (for nested folders)" },
        color: { type: "string", description: "Hex color for the folder (e.g. '#ff0000')" },
      },
      required: ["name", "type"],
    },
  },
];

export async function handleFolderTool(
  name: string,
  args: Record<string, unknown>,
  bridge: FoundryBridge
): Promise<unknown> {
  return bridge.call(name, args);
}
