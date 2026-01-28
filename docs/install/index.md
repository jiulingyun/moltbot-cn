---
summary: "安装 Clawdbot（推荐安装程序、全局安装或从源码安装）"
read_when:
  - 安装 Clawdbot
  - 您想从 GitHub 安装
---

# 安装

除非您有特殊原因，否则请使用安装程序。它会设置 CLI 并运行入门引导。

## 快速安装（推荐）

```bash
curl -fsSL https://clawd.bot/install.sh | bash
```

Windows (PowerShell):

```powershell
iwr -useb https://clawd.bot/install.ps1 | iex
```

下一步（如果您跳过了入门引导）：

```bash
clawdbot-cn onboard --install-daemon
```

## 系统要求

- **Node >=22**
- macOS, Linux, 或 Windows（通过 WSL2）
- 只有从源码构建时才需要 `pnpm`

## 选择您的安装路径

### 1) 安装程序脚本（推荐）

通过 npm 全局安装 `clawdbot` 并运行入门引导。

```bash
curl -fsSL https://clawd.bot/install.sh | bash
```

安装程序标志：

```bash
curl -fsSL https://clawd.bot/install.sh | bash -s -- --help
```

详细信息：[安装程序内部机制](/install/installer)。

非交互式（跳过入门引导）：

```bash
curl -fsSL https://clawd.bot/install.sh | bash -s -- --no-onboard
```

### 2) 全局安装（手动）

如果您已经有 Node：

```bash
npm install -g clawdbot@latest
```

如果您全局安装了 libvips（通过 Homebrew 在 macOS 上很常见）且 `sharp` 安装失败，请强制使用预编译二进制文件：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g clawdbot@latest
```

如果您看到 `sharp: Please add node-gyp to your dependencies`，请安装构建工具（macOS: Xcode CLT + `npm install -g node-gyp`）或使用上面的 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 解决方法来跳过本地构建。

或者：

```bash
pnpm add -g clawdbot@latest
```

然后：

```bash
clawdbot-cn onboard --install-daemon
```

### 3) 从源码安装（贡献者/开发者）

```bash
git clone https://github.com/clawdbot/clawdbot.git
cd clawdbot
pnpm install
pnpm ui:build # 首次运行时自动安装 UI 依赖项
pnpm build
clawdbot-cn onboard --install-daemon
```

提示：如果您还没有全局安装，请通过 `pnpm clawdbot ...` 运行仓库命令。

### 4) 其他安装选项

- Docker: [Docker](/install/docker)
- Nix: [Nix](/install/nix)
- Ansible: [Ansible](/install/ansible)
- Bun (仅 CLI): [Bun](/install/bun)

## 安装后

- 运行入门引导: `clawdbot-cn onboard --install-daemon`
- 快速检查: `clawdbot-cn doctor`
- 检查网关健康状况: `clawdbot-cn status` + `clawdbot-cn health`
- 打开仪表板: `clawdbot-cn dashboard`

## 安装方法：npm 与 git（安装程序）

安装程序支持两种方法：

- `npm` (默认): `npm install -g clawdbot@latest`
- `git`: 从 GitHub 克隆/构建并从源码检出运行

### CLI 标志

```bash
# 明确使用 npm
curl -fsSL https://clawd.bot/install.sh | bash -s -- --install-method npm

# 从 GitHub 安装（源码检出）
curl -fsSL https://clawd.bot/install.sh | bash -s -- --install-method git
```

常用标志：

- `--install-method npm|git`
- `--git-dir <path>` (默认: `~/clawdbot`)
- `--no-git-update` (使用现有检出时跳过 `git pull`)
- `--no-prompt` (禁用提示；CI/自动化中必需)
- `--dry-run` (打印将发生什么；不进行更改)
- `--no-onboard` (跳过入门引导)

### 环境变量

等效环境变量（对自动化有用）：

- `CLAWDBOT_INSTALL_METHOD=git|npm`
- `CLAWDBOT_GIT_DIR=...`
- `CLAWDBOT_GIT_UPDATE=0|1`
- `CLAWDBOT_NO_PROMPT=1`
- `CLAWDBOT_DRY_RUN=1`
- `CLAWDBOT_NO_ONBOARD=1`
- `SHARP_IGNORE_GLOBAL_LIBVIPS=0|1` (默认: `1`；避免 `sharp` 与系统 libvips 构建)

## 故障排除：找不到 `clawdbot` (PATH)

快速诊断：

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

如果 `$(npm prefix -g)/bin` (macOS/Linux) 或 `$(npm prefix -g)` (Windows) **没有** 出现在 `echo "$PATH"` 中，则您的 shell 找不到全局 npm 二进制文件（包括 `clawdbot`）。

修复：将其添加到您的 shell 启动文件中 (zsh: `~/.zshrc`, bash: `~/.bashrc`)：

```bash
# macOS / Linux
export PATH="$(npm prefix -g)/bin:$PATH"
```

在 Windows 上，将 `npm prefix -g` 的输出添加到您的 PATH 中。

然后打开一个新的终端（或在 zsh 中 `rehash` / 在 bash 中 `hash -r`）。

## 更新 / 卸载

- 更新: [更新](/install/updating)
- 卸载: [卸载](/install/uninstall)
