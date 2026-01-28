---
summary: "安全更新 Clawdbot（全局安装或源码），以及回滚策略"
read_when:
  - 更新 Clawdbot
  - 更新后出现问题
---

# 更新

Clawdbot 发展迅速（"1.0"之前）。像对待发布基础设施一样对待更新：更新 → 运行检查 → 重启（或使用 `clawdbot-cn update`，它会重启）→ 验证。

## 推荐：重新运行网站安装器（原地升级）

**首选**的更新路径是从网站重新运行安装器。它会检测现有安装、原地升级，并在需要时运行 `clawdbot-cn doctor`。

```bash
curl -fsSL https://clawd.org.cn/install.sh | bash
```

注意：
- 如果不想再次运行引导向导，添加 `--no-onboard`。
- 对于**源码安装**，使用：
  ```bash
  curl -fsSL https://clawd.org.cn/install.sh | bash -s -- --install-method git --no-onboard
  ```
  安装器仅在仓库干净时才会 `git pull --rebase`。
- 对于**全局安装**，脚本底层使用 `npm install -g clawdbot-cn@latest`。

## 更新前

- 了解你的安装方式：**全局**（npm/pnpm）vs **从源码**（git clone）。
- 了解你的 Gateway 运行方式：**前台终端** vs **监督服务**（launchd/systemd）。
- 快照你的定制：
  - 配置：`~/.clawdbot/clawdbot.json`
  - 凭证：`~/.clawdbot/credentials/`
  - 工作区：`~/clawd`

## 更新（全局安装）

全局安装（选择一个）：

```bash
npm i -g clawdbot-cn@latest
```

```bash
pnpm add -g clawdbot-cn@latest
```

我们**不推荐**将 Bun 用于 Gateway 运行时（WhatsApp/Telegram 有 bug）。

切换更新渠道（git + npm 安装）：

```bash
clawdbot-cn update --channel beta
clawdbot-cn update --channel dev
clawdbot-cn update --channel stable
```

使用 `--tag <dist-tag|version>` 进行一次性安装标签/版本。

参见 [开发渠道](/install/development-channels) 了解渠道语义和发布说明。

注意：在 npm 安装上，gateway 启动时会记录更新提示（检查当前渠道标签）。通过 `update.checkOnStart: false` 禁用。

然后：

```bash
clawdbot-cn doctor
clawdbot-cn gateway restart
clawdbot-cn health
```

注意：
- 如果你的 Gateway 作为服务运行，`clawdbot-cn gateway restart` 比杀死 PID 更好。
- 如果你固定在特定版本，参见下面的"回滚 / 固定"。

## 更新（`clawdbot-cn update`）

对于**源码安装**（git 检出），首选：

```bash
clawdbot-cn update
```

它运行一个相对安全的更新流程：
- 需要干净的工作树。
- 切换到选定的渠道（标签或分支）。
- 获取 + 变基到配置的上游（dev 渠道）。
- 安装依赖、构建、构建控制 UI，并运行 `clawdbot-cn doctor`。
- 默认重启 gateway（使用 `--no-restart` 跳过）。

如果你通过 **npm/pnpm** 安装（无 git 元数据），`clawdbot-cn update` 会尝试通过你的包管理器更新。如果无法检测安装，改用"更新（全局安装）"。

## 更新（控制 UI / RPC）

控制 UI 有 **更新和重启**（RPC：`update.run`）。它：
1) 运行与 `clawdbot-cn update` 相同的源码更新流程（仅 git 检出）。
2) 用结构化报告（stdout/stderr 尾部）写入重启哨兵。
3) 重启 gateway 并用报告 ping 最后活跃的会话。

如果变基失败，gateway 中止并在不应用更新的情况下重启。

## 更新（从源码）

从仓库检出：

首选：

```bash
clawdbot-cn update
```

手动（大致等效）：

```bash
git pull
pnpm install
pnpm build
pnpm ui:build # 首次运行会自动安装 UI 依赖
clawdbot-cn doctor
clawdbot-cn health
```

注意：
- 当你运行打包的 `clawdbot-cn` 二进制文件（[`dist/entry.js`](https://github.com/jiulingyun/clawdbot-chinese/blob/main/dist/entry.js)）或使用 Node 运行 `dist/` 时，`pnpm build` 很重要。
- 如果你从没有全局安装的仓库检出运行，使用 `pnpm clawdbot-cn ...` 运行 CLI 命令。
- 如果你直接从 TypeScript 运行（`pnpm clawdbot-cn ...`），通常不需要重建，但**配置迁移仍然适用** → 运行 doctor。
- 在全局和 git 安装之间切换很简单：安装另一种方式，然后运行 `clawdbot-cn doctor` 以便 gateway 服务入口点被重写为当前安装。

## 始终运行：`clawdbot-cn doctor`

Doctor 是"安全更新"命令。它故意很无聊：修复 + 迁移 + 警告。

注意：如果你是**源码安装**（git 检出），`clawdbot-cn doctor` 会提议先运行 `clawdbot-cn update`。

它通常做的事情：
- 迁移已弃用的配置键 / 旧配置文件位置。
- 审计私信策略并警告有风险的"开放"设置。
- 检查 Gateway 健康状态并可以提议重启。
- 检测并迁移旧的 gateway 服务（launchd/systemd；旧版 schtasks）到当前 Clawdbot 服务。
- 在 Linux 上，确保 systemd 用户驻留（以便 Gateway 在注销后继续运行）。

详情：[Doctor](/gateway/doctor)

## 启动 / 停止 / 重启 Gateway

CLI（无论操作系统都有效）：

```bash
clawdbot-cn gateway status
clawdbot-cn gateway stop
clawdbot-cn gateway restart
clawdbot-cn gateway --port 18789
clawdbot-cn logs --follow
```

如果你被监督：
- macOS launchd（应用捆绑的 LaunchAgent）：`launchctl kickstart -k gui/$UID/com.clawdbot.gateway`（如果设置了配置文件则使用 `com.clawdbot.<profile>`）
- Linux systemd 用户服务：`systemctl --user restart clawdbot-gateway[-<profile>].service`
- Windows（WSL2）：`systemctl --user restart clawdbot-gateway[-<profile>].service`
  - `launchctl`/`systemctl` 仅在服务已安装时有效；否则运行 `clawdbot-cn gateway install`。

运行手册 + 精确服务标签：[Gateway 运行手册](/gateway)

## 回滚 / 固定（出问题时）

### 固定（全局安装）

安装已知良好的版本（将 `<version>` 替换为最后工作的版本）：

```bash
npm i -g clawdbot-cn@<version>
```

```bash
pnpm add -g clawdbot-cn@<version>
```

提示：要查看当前发布的版本，运行 `npm view clawdbot-cn version`。

然后重启 + 重新运行 doctor：

```bash
clawdbot-cn doctor
clawdbot-cn gateway restart
```

### 按日期固定（源码）

从日期选择提交（示例："2026-01-01 时 main 的状态"）：

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
```

然后重新安装依赖 + 重启：

```bash
pnpm install
pnpm build
clawdbot-cn gateway restart
```

如果以后想回到最新：

```bash
git checkout main
git pull
```

## 如果你卡住了

- 再次运行 `clawdbot-cn doctor` 并仔细阅读输出（它通常会告诉你修复方法）。
- 检查：[故障排除](/gateway/troubleshooting)
- 在 Discord 提问：https://discord.gg/clawd
