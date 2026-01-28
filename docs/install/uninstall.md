---
summary: "完全卸载 Clawdbot（CLI、服务、状态、工作区）"
read_when:
  - 您想从机器中移除 Clawdbot
  - 卸载后网关服务仍在运行
---

# 卸载

两条路径：
- 如果 `clawdbot` 仍已安装，则使用**简单路径**。
- 如果 CLI 已消失但服务仍在运行，则使用**手动服务移除**。

## 简单路径（CLI 仍已安装）

推荐：使用内置卸载程序：

```bash
clawdbot-cn uninstall
```

非交互式（自动化 / npx）：

```bash
clawdbot-cn uninstall --all --yes --non-interactive
npx -y clawdbot-cn uninstall --all --yes --non-interactive
```

手动步骤（相同结果）：

1) 停止网关服务：

```bash
clawdbot-cn gateway stop
```

2) 卸载网关服务（launchd/systemd/schtasks）：

```bash
clawdbot-cn gateway uninstall
```

3) 删除状态 + 配置：

```bash
rm -rf "${CLAWDBOT_STATE_DIR:-$HOME/.clawdbot}"
```

如果您将 `CLAWDBOT_CONFIG_PATH` 设置为状态目录外的自定义位置，也删除该文件。

4) 删除您的工作区（可选，移除代理文件）：

```bash
rm -rf ~/clawd
```

5) 移除 CLI 安装（选择您使用的）：

```bash
npm rm -g clawdbot
pnpm remove -g clawdbot
bun remove -g clawdbot
```

6) 如果您安装了 macOS 应用：

```bash
rm -rf /Applications/Clawdbot.app
```

注意事项：
- 如果您使用了配置文件（`--profile` / `CLAWDBOT_PROFILE`），对每个状态目录重复步骤 3（默认为 `~/.clawdbot-<profile>`）。
- 在远程模式下，状态目录位于**网关主机**上，因此也要在那里运行步骤 1-4。

## 手动服务移除（CLI 未安装）

如果网关服务持续运行但 `clawdbot` 缺失，请使用此方法。

### macOS（launchd）

默认标签是 `com.clawdbot.gateway`（或 `com.clawdbot.<profile>`）：

```bash
launchctl bootout gui/$UID/com.clawdbot.gateway
rm -f ~/Library/LaunchAgents/com.clawdbot.gateway.plist
```

如果您使用了配置文件，将标签和 plist 名称替换为 `com.clawdbot.<profile>`。

### Linux（systemd 用户单元）

默认单元名称是 `clawdbot-gateway.service`（或 `clawdbot-gateway-<profile>.service`）：

```bash
systemctl --user disable --now clawdbot-gateway.service
rm -f ~/.config/systemd/user/clawdbot-gateway.service
systemctl --user daemon-reload
```

### Windows（计划任务）

默认任务名称是 `Clawdbot Gateway`（或 `Clawdbot Gateway (<profile>)`）。
任务脚本位于您的状态目录下。

```powershell
schtasks /Delete /F /TN "Clawdbot Gateway"
Remove-Item -Force "$env:USERPROFILE\.clawdbot\gateway.cmd"
```

如果您使用了配置文件，删除匹配的任务名称和 `~\.clawdbot-<profile>\gateway.cmd`。

## 正常安装与源码检出

### 正常安装（install.sh / npm / pnpm / bun）

如果您使用了 `https://clawd.bot/install.sh` 或 `install.ps1`，CLI 是用 `npm install -g clawdbot@latest` 安装的。
用 `npm rm -g clawdbot`（或 `pnpm remove -g` / `bun remove -g`，如果您那样安装的话）移除它。

### 源码检出（git clone）

如果您从仓库检出运行（`git clone` + `clawdbot ...` / `bun run clawdbot ...`）：

1) 在删除仓库**之前**卸载网关服务（使用上面的简单路径或手动服务移除）。
2) 删除仓库目录。
3) 按上述方式移除状态 + 工作区。
