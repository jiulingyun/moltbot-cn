---
summary: "完全卸载 Clawdbot（CLI、服务、状态、工作区）"
read_when:
  - 想从机器上删除 Clawdbot
  - 卸载后 gateway 服务仍在运行
---

# 卸载

两种方式：
- **简单方式**：如果 `clawdbot-cn` 仍然安装。
- **手动服务删除**：如果 CLI 已删除但服务仍在运行。

## 简单方式（CLI 仍然安装）

推荐：使用内置卸载器：

```bash
clawdbot-cn uninstall
```

非交互式（自动化 / npx）：

```bash
clawdbot-cn uninstall --all --yes --non-interactive
npx -y clawdbot-cn uninstall --all --yes --non-interactive
```

手动步骤（相同效果）：

1) 停止 gateway 服务：

```bash
clawdbot-cn gateway stop
```

2) 卸载 gateway 服务（launchd/systemd/schtasks）：

```bash
clawdbot-cn gateway uninstall
```

3) 删除状态 + 配置：

```bash
rm -rf "${CLAWDBOT_STATE_DIR:-$HOME/.clawdbot}"
```

如果你将 `CLAWDBOT_CONFIG_PATH` 设置为状态目录之外的自定义位置，也删除该文件。

4) 删除工作区（可选，删除 agent 文件）：

```bash
rm -rf ~/clawd
```

5) 删除 CLI 安装（选择你使用的那个）：

```bash
npm rm -g clawdbot-cn
pnpm remove -g clawdbot-cn
bun remove -g clawdbot-cn
```

6) 如果你安装了 macOS 应用：

```bash
rm -rf /Applications/Clawdbot.app
```

注意：
- 如果你使用了配置文件（`--profile` / `CLAWDBOT_PROFILE`），对每个状态目录重复步骤 3（默认是 `~/.clawdbot-<profile>`）。
- 在远程模式下，状态目录在 **gateway 主机**上，所以在那里也运行步骤 1-4。

## 手动服务删除（CLI 未安装）

如果 gateway 服务持续运行但 `clawdbot-cn` 丢失，使用此方法。

### macOS（launchd）

默认标签是 `com.clawdbot.gateway`（或 `com.clawdbot.<profile>`）：

```bash
launchctl bootout gui/$UID/com.clawdbot.gateway
rm -f ~/Library/LaunchAgents/com.clawdbot.gateway.plist
```

如果你使用了配置文件，将标签和 plist 名称替换为 `com.clawdbot.<profile>`。

### Linux（systemd 用户单元）

默认单元名称是 `clawdbot-gateway.service`（或 `clawdbot-gateway-<profile>.service`）：

```bash
systemctl --user disable --now clawdbot-gateway.service
rm -f ~/.config/systemd/user/clawdbot-gateway.service
systemctl --user daemon-reload
```

### Windows（计划任务）

默认任务名称是 `Clawdbot Gateway`（或 `Clawdbot Gateway (<profile>)`）。
任务脚本在你的状态目录下。

```powershell
schtasks /Delete /F /TN "Clawdbot Gateway"
Remove-Item -Force "$env:USERPROFILE\.clawdbot\gateway.cmd"
```

如果你使用了配置文件，删除匹配的任务名称和 `~\.clawdbot-<profile>\gateway.cmd`。

## 普通安装 vs 源码检出

### 普通安装（install.sh / npm / pnpm / bun）

如果你使用了 `https://clawd.org.cn/install.sh` 或 `install.ps1`，CLI 是用 `npm install -g clawdbot-cn@latest` 安装的。
用 `npm rm -g clawdbot-cn`（或 `pnpm remove -g clawdbot-cn` / `bun remove -g clawdbot-cn`，如果你用那种方式安装的话）删除它。

### 源码检出（git clone）

如果你从仓库检出运行（`git clone` + `clawdbot-cn ...` / `bun run clawdbot-cn ...`）：

1) 在删除仓库**之前**卸载 gateway 服务（使用上面的简单方式或手动服务删除）。
2) 删除仓库目录。
3) 如上所示删除状态 + 工作区。
