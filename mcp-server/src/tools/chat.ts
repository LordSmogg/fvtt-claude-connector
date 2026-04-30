import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { FoundryBridge } from "../bridge.js";

export const chatTools: Tool[] = [
  {
    name: "chat-send",
    description: "Send a message to the Foundry chat.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Message content (supports HTML)" },
        type: {
          type: "string",
          enum: ["ooc", "ic", "emote", "whisper", "roll"],
          description: "Message type (default: 'ooc' = out of character)",
        },
        speaker: {
          type: "object",
          description: "Speaker identity",
          properties: {
            alias: { type: "string", description: "Display name" },
            actor: { type: "string", description: "Actor ID" },
            token: { type: "string", description: "Token ID" },
          },
        },
        whisperTo: {
          type: "array",
          description: "Array of user IDs to whisper to",
          items: { type: "string" },
        },
      },
      required: ["content"],
    },
  },
];

export async function handleChatTool(
  name: string,
  args: Record<string, unknown>,
  bridge: FoundryBridge
): Promise<unknown> {
  return bridge.call(name, args);
}
