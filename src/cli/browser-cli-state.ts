import type { Command } from "commander";

import { resolveBrowserControlUrl } from "../browser/client.js";
import {
  browserSetDevice,
  browserSetGeolocation,
  browserSetHeaders,
  browserSetHttpCredentials,
  browserSetLocale,
  browserSetMedia,
  browserSetOffline,
  browserSetTimezone,
} from "../browser/client-actions.js";
import { browserAct } from "../browser/client-actions-core.js";
import { danger } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import { parseBooleanValue } from "../utils/boolean.js";
import type { BrowserParentOpts } from "./browser-cli-shared.js";
import { registerBrowserCookiesAndStorageCommands } from "./browser-cli-state.cookies-storage.js";
import { runCommandWithRuntime } from "./cli-utils.js";

function parseOnOff(raw: string): boolean | null {
  const parsed = parseBooleanValue(raw);
  return parsed === undefined ? null : parsed;
}

function runBrowserCommand(action: () => Promise<void>) {
  return runCommandWithRuntime(defaultRuntime, action, (err) => {
    defaultRuntime.error(danger(String(err)));
    defaultRuntime.exit(1);
  });
}

export function registerBrowserStateCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  registerBrowserCookiesAndStorageCommands(browser, parentOpts);

  const set = browser.command("set").description("浏览器环境设置");

  set
    .command("viewport")
    .description("设置视口大小（resize 的别名）")
    .argument("<width>", "视口宽度", (v: string) => Number(v))
    .argument("<height>", "视口高度", (v: string) => Number(v))
    .option("--target-id <id>", "CDP target id (or unique prefix)")
    .action(async (width: number, height: number, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        defaultRuntime.error(danger("width and height must be numbers"));
        defaultRuntime.exit(1);
        return;
      }
      await runBrowserCommand(async () => {
        const result = await browserAct(
          baseUrl,
          {
            kind: "resize",
            width,
            height,
            targetId: opts.targetId?.trim() || undefined,
          },
          { profile },
        );
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`viewport set: ${width}x${height}`);
      });
    });

  set
    .command("offline")
    .description("切换离线模式")
    .argument("<on|off>", "on/off")
    .option("--target-id <id>", "CDP target id (or unique prefix)")
    .action(async (value: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      const offline = parseOnOff(value);
      if (offline === null) {
        defaultRuntime.error(danger("期望 on|off"));
        defaultRuntime.exit(1);
        return;
      }
      await runBrowserCommand(async () => {
        const result = await browserSetOffline(baseUrl, {
          offline,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`offline: ${offline}`);
      });
    });

  set
    .command("headers")
    .description("设置额外的 HTTP 头（JSON 对象）")
    .requiredOption("--json <json>", "JSON object of headers")
    .option("--target-id <id>", "CDP target id (or unique prefix)")
    .action(async (opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const parsed = JSON.parse(String(opts.json)) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("headers json must be an object");
        }
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof v === "string") headers[k] = v;
        }
        const result = await browserSetHeaders(baseUrl, {
          headers,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log("headers set");
      });
    });

  set
    .command("credentials")
    .description("设置 HTTP 基础认证凭证")
    .option("--clear", "清除凭证", false)
    .argument("[username]", "用户名")
    .argument("[password]", "密码")
    .option("--target-id <id>", "CDP target id (or unique prefix)")
    .action(async (username: string | undefined, password: string | undefined, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = await browserSetHttpCredentials(baseUrl, {
          username: username?.trim() || undefined,
          password,
          clear: Boolean(opts.clear),
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(opts.clear ? "credentials cleared" : "credentials set");
      });
    });

  set
    .command("geo")
    .description("设置地理位置（并授予权限）")
    .option("--clear", "清除地理位置 + 权限", false)
    .argument("[latitude]", "纬度", (v: string) => Number(v))
    .argument("[longitude]", "经度", (v: string) => Number(v))
    .option("--accuracy <m>", "精度（米）", (v: string) => Number(v))
    .option("--origin <origin>", "用于授予权限的来源")
    .option("--target-id <id>", "CDP target id (or unique prefix)")
    .action(async (latitude: number | undefined, longitude: number | undefined, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = await browserSetGeolocation(baseUrl, {
          latitude: Number.isFinite(latitude) ? latitude : undefined,
          longitude: Number.isFinite(longitude) ? longitude : undefined,
          accuracy: Number.isFinite(opts.accuracy) ? opts.accuracy : undefined,
          origin: opts.origin?.trim() || undefined,
          clear: Boolean(opts.clear),
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(opts.clear ? "geolocation cleared" : "geolocation set");
      });
    });

  set
    .command("media")
    .description("模拟偏好颜色主题")
    .argument("<dark|light|none>", "dark/light/none")
    .option("--target-id <id>", "CDP target id (or unique prefix)")
    .action(async (value: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      const v = value.trim().toLowerCase();
      const colorScheme =
        v === "dark" ? "dark" : v === "light" ? "light" : v === "none" ? "none" : null;
      if (!colorScheme) {
        defaultRuntime.error(danger("期望 dark|light|none"));
        defaultRuntime.exit(1);
        return;
      }
      await runBrowserCommand(async () => {
        const result = await browserSetMedia(baseUrl, {
          colorScheme,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`media colorScheme: ${colorScheme}`);
      });
    });

  set
    .command("timezone")
    .description("覆盖时区（CDP）")
    .argument("<timezoneId>", "时区 ID（例如 America/New_York）")
    .option("--target-id <id>", "CDP target id (or unique prefix)")
    .action(async (timezoneId: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = await browserSetTimezone(baseUrl, {
          timezoneId,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`timezone: ${timezoneId}`);
      });
    });

  set
    .command("locale")
    .description("覆盖区域设置（CDP）")
    .argument("<locale>", "区域设置（例如 en-US）")
    .option("--target-id <id>", "CDP target id (or unique prefix)")
    .action(async (locale: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = await browserSetLocale(baseUrl, {
          locale,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`locale: ${locale}`);
      });
    });

  set
    .command("device")
    .description('Apply a Playwright device descriptor (e.g. "iPhone 14")')
    .argument("<name>", "设备名称（Playwright 设备）")
    .option("--target-id <id>", "CDP target id (or unique prefix)")
    .action(async (name: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = await browserSetDevice(baseUrl, {
          name,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`device: ${name}`);
      });
    });
}
