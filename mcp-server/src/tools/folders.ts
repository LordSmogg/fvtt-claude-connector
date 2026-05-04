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
  {
    name: "folder-update",
    description: "Update an existing folder — rename it, move it to a different parent, or change its color.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Folder ID" },
        name: { type: "string", description: "New name" },
        parent: { type: "string", description: "New parent folder ID (use null to move to root)" },
        color: { type: "string", description: "Hex color (e.g. '#ff0000')" },
      },
      required: ["id"],
    },
  },
  {
    name: "folder-delete",
    description: "Delete a folder. By default contents are moved to root; set deleteContents to true to delete everything inside as well.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Folder ID" },
        deleteContents: { type: "boolean", description: "If true, also deletes all documents inside the folder. Defaults to false (contents moved to root)." },
      },
      required: ["id"],
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
