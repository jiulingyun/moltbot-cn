import type { Command } from "commander";

import { browserSnapshot, resolveBrowserControlUrl } from "../browser/client.js";
import { browserScreenshotAction } from "../browser/client-actions.js";
import { loadConfig } from "../config/config.js";
import { danger } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import { shortenHomePath } from "../utils.js";
import type { BrowserParentOpts } from "./browser-cli-shared.js";

export function registerBrowserInspectCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  browser
    .command("screenshot")
    .description("捕获屏幕截图（MEDIA:<路径>）")
    .argument("[targetId]", "CDP target id (or unique prefix)")
    .option("--full-page", "捕获完整可滚动页面", false)
    .option("--ref <ref>", "ARIA ref from ai snapshot")
    .option("--element <selector>", "CSS selector for element screenshot")
    .option("--type <png|jpeg>", "输出类型（默认：png）", "png")
    .action(async (targetId: string | undefined, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      try {
        const result = await browserScreenshotAction(baseUrl, {
          targetId: targetId?.trim() || undefined,
          fullPage: Boolean(opts.fullPage),
          ref: opts.ref?.trim() || undefined,
          element: opts.element?.trim() || undefined,
          type: opts.type === "jpeg" ? "jpeg" : "png",
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`MEDIA:${shortenHomePath(result.path)}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("snapshot")
    .description("捕获快照（默认：ai；aria 是无障碍树）")
    .option("--format <aria|ai>", "快照格式（默认：ai）", "ai")
    .option("--target-id <id>", "CDP target id (or unique prefix)")
    .option("--limit <n>", "最大节点数（默认：500/800）", (v: string) => Number(v))
    .option("--mode <efficient>", "快照预设（高效）")
    .option("--efficient", "使用高效快照预设", false)
    .option("--interactive", "角色快照：仅交互元素", false)
    .option("--compact", "角色快照：紧凑输出", false)
    .option("--depth <n>", "角色快照：最大深度", (v: string) => Number(v))
    .option("--selector <sel>", "角色快照：限定到 CSS 选择器")
    .option("--frame <sel>", "角色快照：限定到 iframe 选择器")
    .option("--labels", "包含视口标签叠加截图", false)
    .option("--out <path>", "将快照写入文件")
    .action(async (opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      const format = opts.format === "aria" ? "aria" : "ai";
      const configMode =
        format === "ai" && loadConfig().browser?.snapshotDefaults?.mode === "efficient"
          ? "efficient"
          : undefined;
      const mode = opts.efficient === true || opts.mode === "efficient" ? "efficient" : configMode;
      try {
        const result = await browserSnapshot(baseUrl, {
          format,
          targetId: opts.targetId?.trim() || undefined,
          limit: Number.isFinite(opts.limit) ? opts.limit : undefined,
          interactive: Boolean(opts.interactive) || undefined,
          compact: Boolean(opts.compact) || undefined,
          depth: Number.isFinite(opts.depth) ? opts.depth : undefined,
          selector: opts.selector?.trim() || undefined,
          frame: opts.frame?.trim() || undefined,
          labels: Boolean(opts.labels) || undefined,
          mode,
          profile,
        });

        if (opts.out) {
          const fs = await import("node:fs/promises");
          if (result.format === "ai") {
            await fs.writeFile(opts.out, result.snapshot, "utf8");
          } else {
            const payload = JSON.stringify(result, null, 2);
            await fs.writeFile(opts.out, payload, "utf8");
          }
          if (parent?.json) {
            defaultRuntime.log(
              JSON.stringify(
                {
                  ok: true,
                  out: opts.out,
                  ...(result.format === "ai" && result.imagePath
                    ? { imagePath: result.imagePath }
                    : {}),
                },
                null,
                2,
              ),
            );
          } else {
            defaultRuntime.log(shortenHomePath(opts.out));
            if (result.format === "ai" && result.imagePath) {
              defaultRuntime.log(`MEDIA:${shortenHomePath(result.imagePath)}`);
            }
          }
          return;
        }

        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }

        if (result.format === "ai") {
          defaultRuntime.log(result.snapshot);
          if (result.imagePath) {
            defaultRuntime.log(`MEDIA:${shortenHomePath(result.imagePath)}`);
          }
          return;
        }

        const nodes = "nodes" in result ? result.nodes : [];
        defaultRuntime.log(
          nodes
            .map((n) => {
              const indent = "  ".repeat(Math.min(20, n.depth));
              const name = n.name ? ` "${n.name}"` : "";
              const value = n.value ? ` = "${n.value}"` : "";
              return `${indent}- ${n.role}${name}${value}`;
            })
            .join("\n"),
        );
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });
}
