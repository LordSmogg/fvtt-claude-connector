import type { FoundryBridgeClient } from "../bridge.js";

const CHAT_TYPE_MAP: Record<string, number> = {
  ooc: CONST.CHAT_MESSAGE_STYLES.OOC,
  ic: CONST.CHAT_MESSAGE_STYLES.IC,
  emote: CONST.CHAT_MESSAGE_STYLES.EMOTE,
  whisper: CONST.CHAT_MESSAGE_STYLES.OTHER,
  roll: CONST.CHAT_MESSAGE_STYLES.ROLL,
};

export function registerChatHandlers(client: FoundryBridgeClient) {
  client.register("chat-send", async (params) => {
    const {
      content,
      type = "ooc",
      speaker,
      whisperTo,
    } = params as {
      content: string;
      type?: string;
      speaker?: { alias?: string; actor?: string; token?: string };
      whisperTo?: string[];
    };

    const messageData: Record<string, unknown> = {
      content,
      style: CHAT_TYPE_MAP[type] ?? CONST.CHAT_MESSAGE_STYLES.OOC,
    };

    if (speaker) {
      messageData.speaker = {
        alias: speaker.alias,
        actor: speaker.actor,
        token: speaker.token,
        scene: game.scenes?.active?.id,
      };
    }

    if (whisperTo?.length) {
      messageData.whisper = whisperTo;
    }

    const message = await ChatMessage.create(
      messageData as Parameters<typeof ChatMessage.create>[0]
    );
    if (!message) throw new Error("Failed to send chat message");

    return { id: message.id, content: message.content };
  });
}
