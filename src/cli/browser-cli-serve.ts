import type { Command } from "commander";

import { loadConfig } from "../config/config.js";
import { danger, info } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import { resolveBrowserConfig, resolveProfile } from "../browser/config.js";
import { startBrowserBridgeServer, stopBrowserBridgeServer } from "../browser/bridge-server.js";
import { ensureChromeExtensionRelayServer } from "../browser/extension-relay.js";

function isLoopbackBindHost(host: string) {
  const h = host.trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

function parsePort(raw: unknown): number | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0 || n > 65535) return null;
  return n;
}

export function registerBrowserServeCommands(
  browser: Command,
  _parentOpts: (cmd: Command) => unknown,
) {
  browser
    .command("serve")
    .description("运行独立的浏览器控制服务器（用于远程网关）")
    .option("--bind <host>", "绑定主机（默认：127.0.0.1）")
    .option("--port <port>", "绑定端口（默认：来自 browser.controlUrl）")
    .option("--token <token>", "需要授权：Bearer <token>（绑定非环回地址时必需）")
    .action(async (opts: { bind?: string; port?: string; token?: string }) => {
      const cfg = loadConfig();
      const resolved = resolveBrowserConfig(cfg.browser);
      if (!resolved.enabled) {
        defaultRuntime.error(danger("浏览器控制已禁用。请设置 browser.enabled=true 并重试。"));
        defaultRuntime.exit(1);
      }

      const host = (opts.bind ?? "127.0.0.1").trim();
      const port = parsePort(opts.port) ?? resolved.controlPort;

      const envToken = process.env.CLAWDBOT_BROWSER_CONTROL_TOKEN?.trim();
      const authToken = (opts.token ?? envToken ?? resolved.controlToken)?.trim();
      if (!isLoopbackBindHost(host) && !authToken) {
        defaultRuntime.error(
          danger(
            `拒绝在 ${host} 上绑定浏览器控制，缺少 --token（或 CLAWDBOT_BROWSER_CONTROL_TOKEN，或 browser.controlToken）。`,
          ),
        );
        defaultRuntime.exit(1);
      }

      const bridge = await startBrowserBridgeServer({
        resolved,
        host,
        port,
        ...(authToken ? { authToken } : {}),
      });

      // If any profile uses the Chrome extension relay, start the local relay server eagerly
      // so the extension can connect before the first browser action.
      for (const name of Object.keys(resolved.profiles)) {
        const profile = resolveProfile(resolved, name);
        if (!profile || profile.driver !== "extension") continue;
        await ensureChromeExtensionRelayServer({ cdpUrl: profile.cdpUrl }).catch((err) => {
          defaultRuntime.error(
            danger(`配置文件 "${name}" 的 Chrome 扩展中继初始化失败：${String(err)}`),
          );
        });
      }

      defaultRuntime.log(
        info(
          [
            `🦞 Browser control listening on ${bridge.baseUrl}/`,
            authToken ? "认证：需要 Bearer 令牌。" : "认证：关闭（仅限环回）。",
            "",
            "粘贴到网关（clawdbot.json）：",
            JSON.stringify(
              {
                browser: {
                  enabled: true,
                  controlUrl: bridge.baseUrl,
                  ...(authToken ? { controlToken: authToken } : {}),
                },
              },
              null,
              2,
            ),
            ...(authToken
              ? [
                  "",
                  "或在网关上使用环境变量（代替配置中的 controlToken）：",
                  `export CLAWDBOT_BROWSER_CONTROL_TOKEN=${JSON.stringify(authToken)}`,
                ]
              : []),
          ].join("\n"),
        ),
      );

      let shuttingDown = false;
      const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        defaultRuntime.log(info(`正在关闭 (${signal})...`));
        await stopBrowserBridgeServer(bridge.server).catch(() => {});
        process.exit(0);
      };
      process.once("SIGINT", () => void shutdown("SIGINT"));
      process.once("SIGTERM", () => void shutdown("SIGTERM"));

      await new Promise(() => {});
    });
}
