import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { FoundryBridge } from "../bridge.js";

export const journalTools: Tool[] = [
  {
    name: "journal-list",
    description: "List all journal entries in the world.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Filter by name (partial match)" },
        folder: { type: "string", description: "Filter by folder ID" },
      },
    },
  },
  {
    name: "journal-get",
    description: "Get a journal entry by ID, including all its pages.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "journal-create",
    description: "Create a new journal entry, optionally with an initial page.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        folder: { type: "string" },
        initialPage: {
          type: "object",
          description: "Optional first page to create with the entry",
          properties: {
            name: { type: "string" },
            type: { type: "string", description: "Page type: 'text', 'image', 'pdf', 'video'" },
            text: { type: "object", description: "Text content object with 'content' (HTML) field" },
            src: { type: "string", description: "Image/PDF/video source path" },
          },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "journal-update",
    description: "Update a journal entry's metadata (name, folder).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        folder: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "journal-page-create",
    description: "Add a new page to an existing journal entry.",
    inputSchema: {
      type: "object",
      properties: {
        journalId: { type: "string" },
        name: { type: "string" },
        type: { type: "string", description: "Page type: 'text', 'image', 'pdf', 'video'" },
        text: {
          type: "object",
          description: "For text pages: { content: '<p>HTML content</p>', format: 1 }",
        },
        src: { type: "string", description: "For image/pdf/video pages: file path or URL" },
        sort: { type: "number", description: "Sort order" },
      },
      required: ["journalId", "name", "type"],
    },
  },
  {
    name: "journal-page-update",
    description: "Update a page within a journal entry.",
    inputSchema: {
      type: "object",
      properties: {
        journalId: { type: "string" },
        pageId: { type: "string" },
        name: { type: "string" },
        text: { type: "object" },
        src: { type: "string" },
      },
      required: ["journalId", "pageId"],
    },
  },
];

export async function handleJournalTool(
  name: string,
  args: Record<string, unknown>,
  bridge: FoundryBridge
): Promise<unknown> {
  return bridge.call(name, args);
}
