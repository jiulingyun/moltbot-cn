import * as Lark from "@larksuiteoapi/node-sdk";
import type { ClawdbotConfig } from "../config/config.js";
import { loadConfig } from "../config/config.js";
import { getChildLogger } from "../logging.js";
import type { RuntimeEnv } from "../runtime.js";
import { resolveFeishuAccount } from "./accounts.js";
import { processFeishuMessage } from "./message.js";

const logger = getChildLogger({ module: "feishu-monitor" });

export type MonitorFeishuOpts = {
  appId?: string;
  appSecret?: string;
  accountId?: string;
  config?: ClawdbotConfig;
  runtime?: RuntimeEnv;
  abortSignal?: AbortSignal;
};

export async function monitorFeishuProvider(opts: MonitorFeishuOpts = {}): Promise<void> {
  const cfg = opts.config ?? loadConfig();
  const account = resolveFeishuAccount({
    cfg,
    accountId: opts.accountId,
  });

  const appId = opts.appId?.trim() || account.config.appId;
  const appSecret = opts.appSecret?.trim() || account.config.appSecret;

  if (!appId || !appSecret) {
    throw new Error(
      `Feishu App ID and Secret missing for account "${account.accountId}" (set channels.feishu.accounts.${account.accountId}.appId/appSecret or FEISHU_APP_ID/SECRET env vars).`,
    );
  }

  const log = opts.runtime?.log ?? console.log;

  // Create Lark client for API calls
  const client = new Lark.Client({
    appId,
    appSecret,
    logger: {
      debug: (msg) => {
        logger.debug?.(msg);
      },
      info: (msg) => {
        logger.info(msg);
      },
      warn: (msg) => {
        logger.warn(msg);
      },
      error: (msg) => {
        logger.error(msg);
      },
      trace: (msg) => {
        logger.silly?.(msg);
      },
    },
  });

  // Create event dispatcher
  const eventDispatcher = new Lark.EventDispatcher({}).register({
    "im.message.receive_v1": async (data) => {
      try {
        await processFeishuMessage(client, data, appId);
      } catch (err) {
        logger.error(`Error processing Feishu message: ${err}`);
      }
    },
  });

  // Create WebSocket client
  const wsClient = new Lark.WSClient({
    appId,
    appSecret,
    loggerLevel: Lark.LoggerLevel.info,
    logger: {
      debug: (msg) => {
        logger.debug?.(msg);
      },
      info: (msg) => {
        logger.info(msg);
      },
      warn: (msg) => {
        logger.warn(msg);
      },
      error: (msg) => {
        logger.error(msg);
      },
      trace: (msg) => {
        logger.silly?.(msg);
      },
    },
  });

  // Handle abort signal
  const handleAbort = () => {
    logger.info("Stopping Feishu WS client...");
    // WSClient doesn't have a stop method exposed, but it should handle disconnection
    // We'll let the process handle cleanup
  };

  if (opts.abortSignal) {
    opts.abortSignal.addEventListener("abort", handleAbort, { once: true });
  }

  try {
    logger.info("Starting Feishu WebSocket client...");
    await wsClient.start({ eventDispatcher });
    logger.info("Feishu WebSocket connection established");

    // The WSClient.start() should keep running until disconnected
    // If it returns, we need to keep the process alive
    // Wait for abort signal
    if (opts.abortSignal) {
      await new Promise<void>((resolve) => {
        if (opts.abortSignal?.aborted) {
          resolve();
          return;
        }
        opts.abortSignal?.addEventListener("abort", () => resolve(), { once: true });
      });
    } else {
      // If no abort signal, wait indefinitely
      await new Promise<void>(() => {});
    }
  } finally {
    if (opts.abortSignal) {
      opts.abortSignal.removeEventListener("abort", handleAbort);
    }
  }
}
