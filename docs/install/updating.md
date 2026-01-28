---
summary: "安全更新 Clawdbot（全局安装或源码），以及回滚策略"
read_when:
  - 更新 Clawdbot
  - 更新后出现问题
---

# 更新

Clawdbot 发展迅速（pre "1.0"）。将更新视为发布基础设施：更新 → 运行检查 → 重启（或使用 `clawdbot-cn update`，它会重启）→ 验证。

## 推荐：重新运行网站安装程序（就地升级）

**首选**更新路径是重新运行网站上的安装程序。它
检测现有安装，在原地升级，并在
需要时运行 `clawdbot-cn doctor`。

```bash
curl -fsSL https://clawd.bot/install.sh | bash
```

注意事项：
- 如果您不希望入门向导再次运行，请添加 `--no-onboard`。
- 对于**源码安装**，使用：
  ```bash
  curl -fsSL https://clawd.bot/install.sh | bash -s -- --install-method git --no-onboard
  ```
  安装程序**仅**在仓库干净时执行 `git pull --rebase`。
- 对于**全局安装**，脚本在后台使用 `npm install -g clawdbot@latest`。

## 更新前

- 了解您的安装方式：**全局**（npm/pnpm）vs **从源码**（git clone）。
- 了解您的网关运行方式：**前台终端**vs **监督服务**（launchd/systemd）。
- 快照您的定制：
  - 配置：`~/.clawdbot/clawdbot.json`
  - 凭据：`~/.clawdbot/credentials/`
  - 工作区：`~/clawd`

## 更新（全局安装）

全局安装（选择一个）：

```bash
npm i -g clawdbot@latest
```

```bash
pnpm add -g clawdbot@latest
```
我们**不**推荐在网关运行时使用 Bun（WhatsApp/Telegram 错误）。

要切换更新渠道（git + npm 安装）：

```bash
clawdbot-cn update --channel beta
clawdbot-cn update --channel dev
clawdbot-cn update --channel stable
```

使用 `--tag <dist-tag|version>` 为一次性安装标签/版本。

参见 [开发渠道](/install/development-channels) 了解渠道语义和发布说明。

注意：在 npm 安装上，网关在启动时记录更新提示（检查当前渠道标签）。通过 `update.checkOnStart: false` 禁用。

然后：

```bash
clawdbot-cn doctor
clawdbot-cn gateway restart
clawdbot-cn health
```

注意事项：
- 如果您的网关作为服务运行，`clawdbot-cn gateway restart` 比杀死 PID 更受推荐。
- 如果您固定到特定版本，请参见下面的"回滚/固定"。

## 更新（`clawdbot-cn update`）

对于**源码安装**（git 检出），优先使用：

```bash
clawdbot-cn update
```

它运行一个相对安全的更新流程：
- 需要干净的工作树。
- 切换到所选渠道（标签或分支）。
- 获取 + 针对配置的上游（dev 渠道）进行变基。
- 安装依赖项、构建、构建控制界面，并运行 `clawdbot-cn doctor`。
- 默认重启网关（使用 `--no-restart` 跳过）。

如果您通过**npm/pnpm** 安装（无 git 元数据），`clawdbot-cn update` 将尝试通过您的包管理器更新。如果它无法检测到安装，请改用"更新（全局安装）"。

## 更新（控制界面 / RPC）

控制界面有**更新和重启**（RPC: `update.run`）。它：
1) 运行与 `clawdbot-cn update` 相同的源码更新流程（仅 git 检出）。
2) 使用结构化报告（stdout/stderr 尾部）写入重启哨兵。
3) 重启网关并向最后活跃的会话发送报告。

如果变基失败，网关中止并重启而不应用更新。

## 更新（从源码）

从仓库检出：

首选：

```bash
clawdbot-cn update
```

手动（等效）：

```bash
git pull
pnpm install
pnpm build
pnpm ui:build # 首次运行时自动安装 UI 依赖项
clawdbot-cn doctor
clawdbot-cn health
```

注意事项：
- 当您运行打包的 `clawdbot` 二进制文件（[`dist/entry.js`](https://github.com/clawdbot/clawdbot/blob/main/dist/entry.js)）或使用 Node 运行 `dist/` 时，`pnpm build` 很重要。
- 如果您在没有全局安装的情况下从仓库检出运行，请对 CLI 命令使用 `pnpm clawdbot ...`。
- 如果您直接从 TypeScript 运行（`pnpm clawdbot ...`），通常不需要重建，但**配置迁移仍然适用** → 运行 doctor。
- 在全局和 git 安装之间切换很容易：安装另一种风格，然后运行 `clawdbot-cn doctor` 以便网关服务入口点重写为当前安装。

## 始终运行：`clawdbot-cn doctor`

Doctor 是"安全更新"命令。它故意平淡：修复 + 迁移 + 警告。

注意：如果您使用**源码安装**（git 检出），`clawdbot-cn doctor` 将首先提供运行 `clawdbot-cn update`。

它通常做的事情：
- 迁移已弃用的配置键 / 旧配置文件位置。
- 审核 DM 策略并对风险"开放"设置发出警告。
- 检查网关健康状况并可以提供重启建议。
- 检测并迁移较旧的网关服务（launchd/systemd；旧 schtasks）到当前 Clawdbot 服务。
- 在 Linux 上，确保 systemd 用户持久化（以便网关在注销后继续运行）。

详细信息：[Doctor](/gateway/doctor)

## 启动 / 停止 / 重启网关

CLI（在任何操作系统上都有效）：

```bash
clawdbot-cn gateway status
clawdbot-cn gateway stop
clawdbot-cn gateway restart
clawdbot-cn gateway --port 18789
clawdbot-cn logs --follow
```

如果您受到监督：
- macOS launchd（应用程序捆绑的 LaunchAgent）：`launchctl kickstart -k gui/$UID/com.clawdbot.gateway`（如果设置了则使用 `com.clawdbot.<profile>`）
- Linux systemd 用户服务：`systemctl --user restart clawdbot-gateway[-<profile>].service`
- Windows（WSL2）：`systemctl --user restart clawdbot-gateway[-<profile>].service`
  - `launchctl`/`systemctl` 仅在服务安装时有效；否则运行 `clawdbot-cn gateway install`。

运行手册 + 精确服务标签：[网关运行手册](/gateway)

## 回滚 / 固定（当出现问题时）

### 固定（全局安装）

安装已知良好版本（将 `<version>` 替换为最后工作的版本）：

```bash
npm i -g clawdbot@<version>
```

```bash
pnpm add -g clawdbot@<version>
```

提示：要查看当前发布的版本，运行 `npm view clawdbot version`。

然后重启 + 重新运行 doctor：

```bash
clawdbot-cn doctor
clawdbot-cn gateway restart
```

### 按日期固定（源码）

从日期选择提交（示例："2026-01-01 的 main 状态"）：

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before="2026-01-01" origin/main)"
```

然后重新安装依赖项 + 重启：

```bash
pnpm install
pnpm build
clawdbot-cn gateway restart
```

如果您稍后想回到最新版本：

```bash
git checkout main
git pull
```

## 如果您卡住了

- 再次运行 `clawdbot-cn doctor` 并仔细阅读输出（它通常告诉您修复方法）。
- 检查：[故障排除](/gateway/troubleshooting)
- 在 Discord 中询问：https://channels.discord.gg/clawd
