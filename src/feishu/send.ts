import type { Client } from "@larksuiteoapi/node-sdk";
import { getChildLogger } from "../logging.js";
import { loadWebMedia } from "../web/media.js";
import { mediaKindFromMime } from "../media/constants.js";

const logger = getChildLogger({ module: "feishu-send" });

export type FeishuMsgType = "text" | "image" | "file" | "audio" | "media" | "post" | "interactive";

export type FeishuSendOpts = {
  msgType?: FeishuMsgType;
  receiveIdType?: "open_id" | "user_id" | "union_id" | "email" | "chat_id";
  /** URL of media to upload and send (for image/file/audio/media types) */
  mediaUrl?: string;
  /** Max bytes for media download */
  maxBytes?: number;
};

export type FeishuSendResult = {
  message_id?: string;
};

/**
 * Upload an image to Feishu and get image_key
 */
export async function uploadImageFeishu(client: Client, imageBuffer: Buffer): Promise<string> {
  const res = await client.im.image.create({
    data: {
      image_type: "message",
      image: imageBuffer,
    },
  });

  if (!res?.image_key) {
    throw new Error(`Feishu image upload failed: no image_key returned`);
  }
  return res.image_key;
}

/**
 * Upload a file to Feishu and get file_key
 * @param fileType - opus (audio), mp4 (video), pdf, doc, xls, ppt, stream (other)
 */
export async function uploadFileFeishu(
  client: Client,
  fileBuffer: Buffer,
  fileName: string,
  fileType: "opus" | "mp4" | "pdf" | "doc" | "xls" | "ppt" | "stream",
  duration?: number,
): Promise<string> {
  const res = await client.im.file.create({
    data: {
      file_type: fileType,
      file_name: fileName,
      file: fileBuffer,
      ...(duration ? { duration } : {}),
    },
  });

  if (!res?.file_key) {
    throw new Error(`Feishu file upload failed: no file_key returned`);
  }
  return res.file_key;
}

/**
 * Determine Feishu file_type from content type
 */
function resolveFeishuFileType(
  contentType?: string,
  fileName?: string,
): "opus" | "mp4" | "pdf" | "doc" | "xls" | "ppt" | "stream" {
  const ct = contentType?.toLowerCase() ?? "";
  const fn = fileName?.toLowerCase() ?? "";

  // Audio - Feishu only supports opus for audio messages
  if (ct.includes("audio/") || fn.endsWith(".opus") || fn.endsWith(".ogg")) {
    return "opus";
  }
  // Video
  if (ct.includes("video/") || fn.endsWith(".mp4") || fn.endsWith(".mov")) {
    return "mp4";
  }
  // Documents
  if (ct.includes("pdf") || fn.endsWith(".pdf")) return "pdf";
  if (
    ct.includes("msword") ||
    ct.includes("wordprocessingml") ||
    fn.endsWith(".doc") ||
    fn.endsWith(".docx")
  ) {
    return "doc";
  }
  if (
    ct.includes("excel") ||
    ct.includes("spreadsheetml") ||
    fn.endsWith(".xls") ||
    fn.endsWith(".xlsx")
  ) {
    return "xls";
  }
  if (
    ct.includes("powerpoint") ||
    ct.includes("presentationml") ||
    fn.endsWith(".ppt") ||
    fn.endsWith(".pptx")
  ) {
    return "ppt";
  }

  return "stream";
}

/**
 * Send a message to Feishu
 */
export async function sendMessageFeishu(
  client: Client,
  receiveId: string,
  content: any,
  opts: FeishuSendOpts = {},
): Promise<FeishuSendResult | null> {
  const receiveIdType = opts.receiveIdType || "chat_id";
  let msgType = opts.msgType || "text";
  let finalContent = content;

  // Handle media URL - upload first, then send
  if (opts.mediaUrl) {
    try {
      const media = await loadWebMedia(opts.mediaUrl, opts.maxBytes);
      const kind = mediaKindFromMime(media.contentType ?? undefined);
      const fileName = media.fileName ?? "file";

      if (kind === "image") {
        // Upload image and send as image message
        const imageKey = await uploadImageFeishu(client, media.buffer);
        msgType = "image";
        finalContent = { image_key: imageKey };
      } else if (kind === "video") {
        // Upload video file and send as media message
        const fileKey = await uploadFileFeishu(client, media.buffer, fileName, "mp4");
        msgType = "media";
        finalContent = { file_key: fileKey };
      } else if (kind === "audio") {
        // Feishu audio messages (msg_type: "audio") only support opus format
        // For other audio formats (mp3, wav, etc.), send as file instead
        const isOpus =
          media.contentType?.includes("opus") ||
          media.contentType?.includes("ogg") ||
          fileName.toLowerCase().endsWith(".opus") ||
          fileName.toLowerCase().endsWith(".ogg");

        if (isOpus) {
          const fileKey = await uploadFileFeishu(client, media.buffer, fileName, "opus");
          msgType = "audio";
          finalContent = { file_key: fileKey };
        } else {
          // Send non-opus audio as file attachment
          const fileKey = await uploadFileFeishu(client, media.buffer, fileName, "stream");
          msgType = "file";
          finalContent = { file_key: fileKey };
        }
      } else {
        // Upload as file
        const fileType = resolveFeishuFileType(media.contentType, fileName);
        const fileKey = await uploadFileFeishu(client, media.buffer, fileName, fileType);
        msgType = "file";
        finalContent = { file_key: fileKey };
      }

      // If there's text alongside media, we need to send two messages
      // First send the media, then send text as a follow-up
      if (content?.text && typeof content.text === "string" && content.text.trim()) {
        // Send media first
        const mediaRes = await client.im.message.create({
          params: { receive_id_type: receiveIdType },
          data: {
            receive_id: receiveId,
            msg_type: msgType,
            content: JSON.stringify(finalContent),
          },
        });

        if (mediaRes.code !== 0) {
          logger.error(`Feishu media send failed: ${mediaRes.code} - ${mediaRes.msg}`);
          throw new Error(`Feishu API Error: ${mediaRes.msg}`);
        }

        // Then send text
        const textRes = await client.im.message.create({
          params: { receive_id_type: receiveIdType },
          data: {
            receive_id: receiveId,
            msg_type: "text",
            content: JSON.stringify({ text: content.text }),
          },
        });

        return textRes.data ?? null;
      }
    } catch (err) {
      logger.error(`Feishu media upload/send error: ${err}`);
      // Fallback to sending URL as text
      msgType = "text";
      const textContent = content?.text ? `${content.text}\n${opts.mediaUrl}` : opts.mediaUrl;
      finalContent = { text: textContent };
    }
  }

  const contentStr = typeof finalContent === "string" ? finalContent : JSON.stringify(finalContent);

  try {
    const res = await client.im.message.create({
      params: { receive_id_type: receiveIdType },
      data: {
        receive_id: receiveId,
        msg_type: msgType,
        content: contentStr,
      },
    });

    if (res.code !== 0) {
      logger.error(`Feishu send failed: ${res.code} - ${res.msg}`);
      throw new Error(`Feishu API Error: ${res.msg}`);
    }
    return res.data ?? null;
  } catch (err) {
    logger.error(`Feishu send error: ${err}`);
    throw err;
  }
}
