import type { Client } from "@larksuiteoapi/node-sdk";
import { dispatchReplyWithBufferedBlockDispatcher } from "../auto-reply/reply/provider-dispatcher.js";
import { loadConfig } from "../config/config.js";
import { getChildLogger } from "../logging.js";
import { resolveFeishuMedia, type FeishuMediaRef } from "./download.js";
import { sendMessageFeishu } from "./send.js";

const logger = getChildLogger({ module: "feishu-message" });

// Supported message types for processing
const SUPPORTED_MSG_TYPES = ["text", "image", "file", "audio", "media", "sticker"];

export async function processFeishuMessage(
  client: Client,
  data: any,
  appId: string,
  maxMediaBytes: number = 30 * 1024 * 1024,
) {
  // SDK 2.0 schema: data directly contains message, sender, etc.
  const message = data.message ?? data.event?.message;
  const sender = data.sender ?? data.event?.sender;

  if (!message) {
    logger.warn(`Received event without message field`);
    return;
  }

  const chatId = message.chat_id;
  const isGroup = message.chat_type === "group";
  const msgType = message.message_type;

  // Check if this is a supported message type
  if (!SUPPORTED_MSG_TYPES.includes(msgType)) {
    logger.debug(`Skipping unsupported message type: ${msgType}`);
    return;
  }

  // Handle @mentions for group chats
  const mentions = message.mentions ?? data.mentions ?? [];
  const wasMentioned = mentions.length > 0;

  // In group chat, only respond when bot is mentioned
  if (isGroup && !wasMentioned) {
    logger.debug(`Ignoring group message without @mention`);
    return;
  }

  // Extract text content (for text messages or captions)
  let text = "";
  if (msgType === "text") {
    try {
      const content = JSON.parse(message.content);
      text = content.text || "";
    } catch (e) {
      logger.error(`Failed to parse text message content: ${e}`);
    }
  }

  // Remove @mention placeholders from text
  for (const mention of mentions) {
    if (mention.key) {
      text = text.replace(mention.key, "").trim();
    }
  }

  // Resolve media if present
  let media: FeishuMediaRef | null = null;
  if (msgType !== "text") {
    try {
      media = await resolveFeishuMedia(client, message, maxMediaBytes);
    } catch (err) {
      logger.error(`Failed to download media: ${err}`);
    }
  }

  // Build body text
  let bodyText = text;
  if (!bodyText && media) {
    bodyText = media.placeholder;
  }

  // Skip if no content
  if (!bodyText && !media) {
    logger.debug(`Empty message after processing, skipping`);
    return;
  }

  const senderId = sender?.sender_id?.open_id || sender?.sender_id?.user_id || "unknown";
  const senderName = sender?.sender_id?.user_id || "unknown";
  const cfg = loadConfig();

  // Context construction
  const ctx = {
    Body: bodyText,
    RawBody: text || media?.placeholder || "",
    From: senderId,
    To: chatId,
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
    // Media fields (similar to Telegram)
    MediaPath: media?.path,
    MediaType: media?.contentType,
    MediaUrl: media?.path,
    WasMentioned: isGroup ? wasMentioned : undefined,
  };

  await dispatchReplyWithBufferedBlockDispatcher({
    ctx,
    cfg,
    dispatcherOptions: {
      deliver: async (payload) => {
        const hasMedia = payload.mediaUrl || (payload.mediaUrls && payload.mediaUrls.length > 0);
        if (!payload.text && !hasMedia) return;

        // Handle media URLs
        const mediaUrls = payload.mediaUrls?.length
          ? payload.mediaUrls
          : payload.mediaUrl
            ? [payload.mediaUrl]
            : [];

        if (mediaUrls.length > 0) {
          // Send each media item
          for (let i = 0; i < mediaUrls.length; i++) {
            const mediaUrl = mediaUrls[i];
            const caption = i === 0 ? payload.text || "" : "";
            await sendMessageFeishu(
              client,
              chatId,
              { text: caption },
              {
                mediaUrl,
                receiveIdType: "chat_id",
              },
            );
          }
        } else if (payload.text) {
          // Text-only message
          await sendMessageFeishu(
            client,
            chatId,
            { text: payload.text },
            {
              msgType: "text",
              receiveIdType: "chat_id",
            },
          );
        }
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
