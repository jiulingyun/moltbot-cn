import type { Command } from "commander";
import { formatCliChannelOptions } from "./channel-options.js";
import {
  channelsAddCommand,
  channelsCapabilitiesCommand,
  channelsListCommand,
  channelsLogsCommand,
  channelsRemoveCommand,
  channelsResolveCommand,
  channelsStatusCommand,
} from "../commands/channels.js";
import { danger } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { runChannelLogin, runChannelLogout } from "./channel-auth.js";
import { runCommandWithRuntime } from "./cli-utils.js";
import { hasExplicitOptions } from "./command-options.js";

const optionNamesAdd = [
  "channel",
  "account",
  "name",
  "token",
  "tokenFile",
  "botToken",
  "appToken",
  "signalNumber",
  "cliPath",
  "dbPath",
  "service",
  "region",
  "authDir",
  "httpUrl",
  "httpHost",
  "httpPort",
  "webhookPath",
  "webhookUrl",
  "audienceType",
  "audience",
  "useEnv",
  "homeserver",
  "userId",
  "accessToken",
  "password",
  "deviceName",
  "initialSyncLimit",
  "ship",
  "url",
  "code",
  "groupChannels",
  "dmAllowlist",
  "autoDiscoverChannels",
] as const;

const optionNamesRemove = ["channel", "account", "delete"] as const;

function runChannelsCommand(action: () => Promise<void>) {
  return runCommandWithRuntime(defaultRuntime, action);
}

function runChannelsCommandWithDanger(action: () => Promise<void>, label: string) {
  return runCommandWithRuntime(defaultRuntime, action, (err) => {
    defaultRuntime.error(danger(`${label}: ${String(err)}`));
    defaultRuntime.exit(1);
  });
}

export function registerChannelsCli(program: Command) {
  const channelNames = formatCliChannelOptions();
  const channels = program
    .command("channels")
    .description("管理聊天渠道账户")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("文档：")} ${formatDocsLink(
          "/cli/channels",
          "docs.clawd.bot/cli/channels",
        )}\n`,
    );

  channels
    .command("list")
    .description("列出已配置的渠道 + 认证配置文件")
    .option("--no-usage", "跳过模型提供商用量/配额快照")
    .option("--json", "输出 JSON", false)
    .action(async (opts) => {
      await runChannelsCommand(async () => {
        await channelsListCommand(opts, defaultRuntime);
      });
    });

  channels
    .command("status")
    .description("显示网关渠道状态（使用 status --deep 查看本地）")
    .option("--probe", "探测渠道凭据", false)
    .option("--timeout <ms>", "超时（毫秒）", "10000")
    .option("--json", "输出 JSON", false)
    .action(async (opts) => {
      await runChannelsCommand(async () => {
        await channelsStatusCommand(opts, defaultRuntime);
      });
    });

  channels
    .command("capabilities")
    .description("显示提供商能力（意图/范围 + 支持的功能）")
    .option("--channel <name>", `渠道 (${formatCliChannelOptions(["all"])})`)
    .option("--account <id>", "账户 ID（仅与 --channel 配合使用）")
    .option("--target <dest>", "权限审核的渠道目标（Discord channel:<id>）")
    .option("--timeout <ms>", "超时（毫秒）", "10000")
    .option("--json", "输出 JSON", false)
    .action(async (opts) => {
      await runChannelsCommand(async () => {
        await channelsCapabilitiesCommand(opts, defaultRuntime);
      });
    });

  channels
    .command("resolve")
    .description("将渠道/用户名称解析为 ID")
    .argument("<entries...>", "要解析的条目（名称或 ID）")
    .option("--channel <name>", `渠道 (${channelNames})`)
    .option("--account <id>", "账户 ID (accountId)")
    .option("--kind <kind>", "目标类型 (auto|自动|user|用户|group|群组)", "auto")
    .option("--json", "输出 JSON", false)
    .action(async (entries, opts) => {
      await runChannelsCommand(async () => {
        await channelsResolveCommand(
          {
            channel: opts.channel as string | undefined,
            account: opts.account as string | undefined,
            kind: opts.kind as "auto" | "user" | "group",
            json: Boolean(opts.json),
            entries: Array.isArray(entries) ? entries : [String(entries)],
          },
          defaultRuntime,
        );
      });
    });

  channels
    .command("logs")
    .description("从网关日志文件显示最近的渠道日志")
    .option("--channel <name>", `渠道 (${formatCliChannelOptions(["all"])})`, "all")
    .option("--lines <n>", "行数（默认：200）", "200")
    .option("--json", "输出 JSON", false)
    .action(async (opts) => {
      await runChannelsCommand(async () => {
        await channelsLogsCommand(opts, defaultRuntime);
      });
    });

  channels
    .command("add")
    .description("添加或更新渠道账户")
    .argument("[channel]", "渠道名称 (可选)")
    .option("--channel <name>", `渠道 (${channelNames})`)
    .option("--account <id>", "账户 ID（省略时为默认）")
    .option("--name <name>", "此账户的显示名称")
    .option("--token <token>", "机器人令牌（Telegram/Discord）")
    .option("--token-file <path>", "机器人令牌文件（Telegram）")
    .option("--bot-token <token>", "Slack 机器人令牌 (xoxb-...)")
    .option("--app-token <token>", "Slack 应用令牌 (xapp-...)")
    .option("--signal-number <e164>", "Signal 账户号码 (E.164)")
    .option("--cli-path <path>", "CLI 路径 (signal-cli 或 imsg)")
    .option("--db-path <path>", "iMessage 数据库路径")
    .option("--service <service>", "iMessage 服务 (imessage|sms|auto)")
    .option("--region <region>", "iMessage 地区（用于 SMS）")
    .option("--auth-dir <path>", "WhatsApp 认证目录覆盖")
    .option("--http-url <url>", "Signal HTTP 守护进程基础 URL")
    .option("--http-host <host>", "Signal HTTP 主机")
    .option("--http-port <port>", "Signal HTTP 端口")
    .option("--webhook-path <path>", "Webhook 路径 (Google Chat/BlueBubbles)")
    .option("--webhook-url <url>", "Google Chat webhook URL")
    .option("--audience-type <type>", "Google Chat 受众类型 (app-url|project-number)")
    .option("--audience <value>", "Google Chat 受众值（应用 URL 或项目编号）")
    .option("--homeserver <url>", "Matrix 主服务器 URL")
    .option("--user-id <id>", "Matrix 用户 ID")
    .option("--access-token <token>", "Matrix 访问令牌")
    .option("--password <password>", "Matrix 密码")
    .option("--device-name <name>", "Matrix 设备名称")
    .option("--initial-sync-limit <n>", "Matrix 初始同步限制")
    .option("--ship <ship>", "Tlon 船名 (~sampel-palnet)")
    .option("--url <url>", "Tlon 船 URL")
    .option("--code <code>", "Tlon 登录代码")
    .option("--group-channels <list>", "Tlon 群组频道（逗号分隔）")
    .option("--dm-allowlist <list>", "Tlon DM 白名单（逗号分隔的船名）")
    .option("--auto-discover-channels", "Tlon 自动发现群组频道")
    .option("--no-auto-discover-channels", "禁用 Tlon 自动发现")
    .option("--use-env", "使用环境变量令牌（仅默认账户）", false)
    .action(async (channelArg, opts, command) => {
      // Handle the case where arguments are shifted if channelArg is not provided but opts are?
      // Commander passes arguments first, then options, then command object.
      // If [channel] is optional, the first arg might be opts if channel is missing?
      // No, commander handles this. If channelArg is present it is the string.

      // If we use .argument('[channel]'), the action signature becomes (channel, options, command)
      // If the user doesn't provide channel, channel is undefined.

      // However, the previous signature was (opts, command).
      // We need to adjust.

      let finalOpts = opts;
      let finalCommand = command;
      let channelName = channelArg;

      // Commander weirdness check: if we define argument, it comes first.
      // But if we are in a situation where I am unsure if 'channelArg' is actually 'opts'
      // (though with .argument it should be robust), let's just trust types if I could see them.
      // In JS runtime:
      // action(arg1, arg2, arg3)
      // if [channel] provided: arg1=channel, arg2=opts, arg3=cmd
      // if not provided: arg1=undefined, arg2=opts, arg3=cmd

      if (typeof channelArg === "object" && channelArg !== null && "channel" in channelArg) {
        // This would happen if I didn't add .argument, but I did.
        // Wait, if I change the definition, the action signature changes.
        // So I must match the new signature.
      }

      // Re-assign for clarity
      const options = opts;
      const cmd = command;

      if (channelName && typeof channelName === "string") {
        options.channel = channelName;
      }

      await runChannelsCommand(async () => {
        const hasFlags = hasExplicitOptions(cmd, optionNamesAdd);
        await channelsAddCommand(options, defaultRuntime, { hasFlags });
      });
    });

  channels
    .command("remove")
    .description("禁用或删除渠道账户")
    .option("--channel <name>", `渠道 (${channelNames})`)
    .option("--account <id>", "账户 ID（省略时为默认）")
    .option("--delete", "删除配置条目（无提示）", false)
    .action(async (opts, command) => {
      await runChannelsCommand(async () => {
        const hasFlags = hasExplicitOptions(command, optionNamesRemove);
        await channelsRemoveCommand(opts, defaultRuntime, { hasFlags });
      });
    });

  channels
    .command("login")
    .description("连接渠道账户（如果支持）")
    .option("--channel <channel>", "渠道别名（默认：whatsapp）")
    .option("--account <id>", "账户 ID (accountId)")
    .option("--verbose", "详细连接日志", false)
    .action(async (opts) => {
      await runChannelsCommandWithDanger(async () => {
        await runChannelLogin(
          {
            channel: opts.channel as string | undefined,
            account: opts.account as string | undefined,
            verbose: Boolean(opts.verbose),
          },
          defaultRuntime,
        );
      }, "Channel login failed");
    });

  channels
    .command("logout")
    .description("登出渠道会话（如果支持）")
    .option("--channel <channel>", "渠道别名（默认：whatsapp）")
    .option("--account <id>", "账户 ID (accountId)")
    .action(async (opts) => {
      await runChannelsCommandWithDanger(async () => {
        await runChannelLogout(
          {
            channel: opts.channel as string | undefined,
            account: opts.account as string | undefined,
          },
          defaultRuntime,
        );
      }, "Channel logout failed");
    });
}
