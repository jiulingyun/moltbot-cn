import type { Client } from "@larksuiteoapi/node-sdk";
import { dispatchReplyWithBufferedBlockDispatcher } from "../auto-reply/reply/provider-dispatcher.js";
import { loadConfig } from "../config/config.js";
import { getChildLogger } from "../logging.js";
import { sendMessageFeishu } from "./send.js";

const logger = getChildLogger({ module: "feishu-message" });

export async function processFeishuMessage(client: Client, data: any, appId: string) {
  // SDK 2.0 schema: data directly contains message, sender, etc.
  const message = data.message ?? data.event?.message;
  const sender = data.sender ?? data.event?.sender;

  if (!message) {
    logger.warn(`Received event without message field`);
    return;
  }

  const chatId = message.chat_id;
  const isGroup = message.chat_type === "group";

  // Only handle text messages for now
  if (message.message_type !== "text") {
    logger.debug(`Skipping non-text message type: ${message.message_type}`);
    return;
  }

  let text = "";
  try {
    const content = JSON.parse(message.content);
    text = content.text || "";
  } catch (e) {
    logger.error(`Failed to parse message content: ${e}`);
    return;
  }

  // Handle @mentions
  const mentions = message.mentions ?? data.mentions ?? [];
  const wasMentioned = mentions.length > 0;

  // In group chat, only respond when bot is mentioned
  if (isGroup && !wasMentioned) {
    logger.debug(`Ignoring group message without @mention`);
    return;
  }

  // Remove @mention placeholders from text
  for (const mention of mentions) {
    if (mention.key) {
      text = text.replace(mention.key, "").trim();
    }
  }

  if (!text) {
    logger.debug(`Empty text after processing, skipping`);
    return;
  }

  const senderId = sender?.sender_id?.open_id || sender?.sender_id?.user_id || "unknown";
  const senderName = sender?.sender_id?.user_id || "unknown";
  const cfg = loadConfig();

  // Context construction
  const ctx = {
    Body: text,
    RawBody: text,
    From: senderId,
    To: chatId, // This is where we send reply back
    SenderId: senderId,
    SenderName: senderName,
    ChatType: isGroup ? "group" : "dm",
    Provider: "feishu",
    Surface: "feishu",
    Timestamp: Number(message.create_time),
    MessageSid: message.message_id,
    AccountId: appId,
    OriginatingChannel: "feishu",
    OriginatingTo: chatId,
  };

  await dispatchReplyWithBufferedBlockDispatcher({
    ctx,
    cfg,
    dispatcherOptions: {
      deliver: async (payload) => {
        if (!payload.text) return;
        await sendMessageFeishu(
          client,
          chatId,
          { text: payload.text },
          {
            msgType: "text",
            receiveIdType: "chat_id",
          },
        );
      },
      onError: (err) => {
        logger.error(`Reply error: ${err}`);
      },
      onReplyStart: () => {},
    },
    replyOptions: {
      disableBlockStreaming: true,
    },
  });
}
