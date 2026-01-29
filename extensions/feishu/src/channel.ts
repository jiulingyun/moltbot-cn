import {
  type ChannelPlugin,
  feishuOutbound,
  normalizeFeishuTarget,
  resolveFeishuAccount,
  listFeishuAccountIds,
  resolveDefaultFeishuAccountId,
  getChatChannelMeta
} from "clawdbot/plugin-sdk";
import { createFeishuBot, startFeishuBot } from "../../../src/feishu/bot.js";
import { feishuOnboardingAdapter } from "./onboarding.js";

const meta = getChatChannelMeta("feishu");

export const feishuPlugin: ChannelPlugin = {
  id: "feishu",
  meta: {
      ...meta,
      quickstartAllowFrom: true,
  },
  onboarding: feishuOnboardingAdapter,
  outbound: feishuOutbound,
  messaging: {
      normalizeTarget: normalizeFeishuTarget,
  },
  config: {
      listAccountIds: (cfg) => listFeishuAccountIds(cfg),
      resolveAccount: (cfg, accountId) => resolveFeishuAccount({ cfg, accountId }),
      defaultAccountId: (cfg) => resolveDefaultFeishuAccountId(cfg),
      isConfigured: (account) => (account as any).tokenSource !== "none",
  },
  gateway: {
      startAccount: async (ctx) => {
          const { account, log } = ctx;
          log?.info(`Starting Feishu bot for account ${account.accountId}`);
          const config = (account as any).config;
          const bot = createFeishuBot({
              appId: config.appId,
              appSecret: config.appSecret
          });
          await startFeishuBot(bot);
      }
  }
};
