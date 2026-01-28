---
summary: "安装 Clawdbot（推荐安装器、全局安装或从源码构建）"
read_when:
  - 安装 Clawdbot
  - 从 GitHub 安装
---

# 安装

除非有特殊原因，请使用安装器。它会设置 CLI 并运行引导配置。

## 快速安装（推荐）

```bash
curl -fsSL https://clawd.org.cn/install.sh | bash
```

Windows (PowerShell)：

```powershell
iwr -useb https://clawd.org.cn/install.ps1 | iex
```

下一步（如果跳过了引导配置）：

```bash
clawdbot-cn onboard --install-daemon
```

## 系统要求

- **Node >=22**
- macOS、Linux 或 Windows（通过 WSL2）
- 仅从源码构建时需要 `pnpm`

## 选择安装方式

### 1) 安装脚本（推荐）

通过 npm 全局安装 `clawdbot-cn` 并运行引导配置。

```bash
curl -fsSL https://clawd.org.cn/install.sh | bash
```

安装器参数：

```bash
curl -fsSL https://clawd.org.cn/install.sh | bash -s -- --help
```

详情：[安装器内部机制](/install/installer)。

非交互式（跳过引导配置）：

```bash
curl -fsSL https://clawd.org.cn/install.sh | bash -s -- --no-onboard
```

### 2) 全局安装（手动）

如果已安装 Node：

```bash
npm install -g clawdbot-cn@latest
```

如果全局安装了 libvips（macOS 上通过 Homebrew 安装很常见）且 `sharp` 安装失败，强制使用预构建二进制文件：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g clawdbot-cn@latest
```

如果看到 `sharp: Please add node-gyp to your dependencies`，可以安装构建工具（macOS：Xcode CLT + `npm install -g node-gyp`）或使用上面的 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 变通方案跳过原生构建。

或者：

```bash
pnpm add -g clawdbot-cn@latest
```

然后：

```bash
clawdbot-cn onboard --install-daemon
```

### 3) 从源码构建（贡献者/开发）

```bash
git clone https://github.com/jiulingyun/clawdbot-chinese.git
cd clawdbot-chinese
pnpm install
pnpm ui:build # 首次运行会自动安装 UI 依赖
pnpm build
clawdbot-cn onboard --install-daemon
```

提示：如果还没有全局安装，可以通过 `pnpm clawdbot-cn ...` 运行仓库命令。

### 4) 其他安装选项

- Docker：[Docker](/install/docker)
- Nix：[Nix](/install/nix)
- Ansible：[Ansible](/install/ansible)
- Bun（仅 CLI）：[Bun](/install/bun)

## 安装后

- 运行引导配置：`clawdbot-cn onboard --install-daemon`
- 快速检查：`clawdbot-cn doctor`
- 检查网关健康状态：`clawdbot-cn status` + `clawdbot-cn health`
- 打开仪表盘：`clawdbot-cn dashboard`

## 安装方式：npm vs git（安装器）

安装器支持两种方式：

- `npm`（默认）：`npm install -g clawdbot-cn@latest`
- `git`：从 GitHub 克隆/构建并从源码检出运行

### CLI 参数

```bash
# 明确使用 npm
curl -fsSL https://clawd.org.cn/install.sh | bash -s -- --install-method npm

# 从 GitHub 安装（源码检出）
curl -fsSL https://clawd.org.cn/install.sh | bash -s -- --install-method git
```

常用参数：

- `--install-method npm|git`
- `--git-dir <path>`（默认：`~/clawdbot`）
- `--no-git-update`（使用现有检出时跳过 `git pull`）
- `--no-prompt`（禁用提示；CI/自动化必需）
- `--dry-run`（打印将执行的操作；不做任何更改）
- `--no-onboard`（跳过引导配置）

### 环境变量

等效的环境变量（适用于自动化）：

- `CLAWDBOT_INSTALL_METHOD=git|npm`
- `CLAWDBOT_GIT_DIR=...`
- `CLAWDBOT_GIT_UPDATE=0|1`
- `CLAWDBOT_NO_PROMPT=1`
- `CLAWDBOT_DRY_RUN=1`
- `CLAWDBOT_NO_ONBOARD=1`
- `SHARP_IGNORE_GLOBAL_LIBVIPS=0|1`（默认：`1`；避免 `sharp` 针对系统 libvips 构建）

## 故障排除：找不到 `clawdbot-cn`（PATH）

快速诊断：

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

如果 `$(npm prefix -g)/bin`（macOS/Linux）或 `$(npm prefix -g)`（Windows）**不在** `echo "$PATH"` 输出中，你的 shell 找不到全局 npm 二进制文件（包括 `clawdbot-cn`）。

修复：将其添加到 shell 启动文件（zsh：`~/.zshrc`，bash：`~/.bashrc`）：

```bash
# macOS / Linux
export PATH="$(npm prefix -g)/bin:$PATH"
```

在 Windows 上，将 `npm prefix -g` 的输出添加到 PATH。

然后打开新终端（或在 zsh 中运行 `rehash` / 在 bash 中运行 `hash -r`）。

## 更新 / 卸载

- 更新：[更新](/install/updating)
- 卸载：[卸载](/install/uninstall)
