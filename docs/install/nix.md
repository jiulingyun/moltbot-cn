---
summary: "使用 Nix 声明式安装 Clawdbot"
read_when:
  - 您想要可重现、可回滚的安装
  - 您已经在使用 Nix/NixOS/Home Manager
  - 您想要一切都被固定并声明式管理
---

# Nix 安装

使用 Nix 运行 Clawdbot 的推荐方式是通过 **[nix-clawdbot](https://github.com/clawdbot/nix-clawdbot)** — 一个功能齐全的 Home Manager 模块。

## 快速开始

将此粘贴到您的 AI 代理（Claude、Cursor 等）中：

```text
我想在我的 Mac 上设置 nix-clawdbot。
仓库：github:clawdbot/nix-clawdbot

我需要您做的是：
1. 检查是否已安装 Determinate Nix（如果没有，请安装）
2. 在 ~/code/clawdbot-local 使用 templates/agent-first/flake.nix 创建本地 flake
3. 帮助我创建一个 Telegram 机器人（@BotFather）并获取我的聊天 ID（@userinfobot）
4. 设置密钥（机器人令牌、Anthropic 密钥）—— ~/.secrets/ 中的普通文件即可
5. 填入模板占位符并运行 home-manager switch
6. 验证：launchd 正在运行，机器人响应消息

参考 nix-clawdbot README 了解模块选项。
```

> **📦 完整指南：[github.com/clawdbot/nix-clawdbot](https://github.com/clawdbot/nix-clawdbot)**
>
> nix-clawdbot 仓库是 Nix 安装的真实来源。本页只是一个快速概览。

## 您得到的功能

- 网关 + macOS 应用 + 工具（whisper、spotify、摄像头）—— 全部被固定
- 能够在重启后存活的 Launchd 服务
- 具有声明式配置的插件系统
- 即时回滚：`home-manager switch --rollback`

---

## Nix 模式运行时行为

当设置 `CLAWDBOT_NIX_MODE=1` 时（与 nix-clawdbot 自动配合）：

Clawdbot 支持一种**Nix 模式**，使配置确定化并禁用自动安装流程。
通过导出来启用它：

```bash
CLAWDBOT_NIX_MODE=1
```

在 macOS 上，GUI 应用不会自动继承 shell 环境变量。您也可以通过默认值启用 Nix 模式：

```bash
defaults write com.clawdbot.mac clawdbot.nixMode -bool true
```

### 配置 + 状态路径

Clawdbot 从 `CLAWDBOT_CONFIG_PATH` 读取 JSON5 配置并在 `CLAWDBOT_STATE_DIR` 中存储可变数据。

- `CLAWDBOT_STATE_DIR`（默认：`~/.clawdbot`）
- `CLAWDBOT_CONFIG_PATH`（默认：`$CLAWDBOT_STATE_DIR/clawdbot.json`）

在 Nix 下运行时，将这些显式设置为 Nix 管理的位置，以便运行时状态和配置
保持在不可变存储之外。

### Nix 模式下的运行时行为

- 自动安装和自我变异流程被禁用
- 缺少依赖项时显示特定于 Nix 的解决方案消息
- UI 在存在时显示只读 Nix 模式横幅

## 打包说明（macOS）

macOS 打包流程期望在以下位置有一个稳定的 Info.plist 模板：

```
apps/macos/Sources/Clawdbot/Resources/Info.plist
```

[`scripts/package-mac-app.sh`](https://github.com/clawdbot/clawdbot/blob/main/scripts/package-mac-app.sh) 将此模板复制到应用包中并修补动态字段
（包 ID、版本/构建、Git SHA、Sparkle 密钥）。这使得 plist 对 SwiftPM
打包和 Nix 构建（不依赖完整的 Xcode 工具链）保持确定性。

## 相关

- [nix-clawdbot](https://github.com/clawdbot/nix-clawdbot) — 完整设置指南
- [向导](/start/wizard) — 非 Nix CLI 设置
- [Docker](/install/docker) — 容器化设置
