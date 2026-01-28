---
summary: "安装脚本工作原理（install.sh + install-cli.sh）、参数和自动化"
read_when:
  - 了解 `clawd.org.cn/install.sh`
  - 自动化安装（CI / 无头环境）
  - 从 GitHub 检出安装
---

# 安装器内部机制

Clawdbot 提供两个安装脚本（从 `clawd.org.cn` 提供）：

- `https://clawd.org.cn/install.sh` — "推荐"安装器（默认全局 npm 安装；也可从 GitHub 检出安装）
- `https://clawd.org.cn/install-cli.sh` — 非 root 友好的 CLI 安装器（安装到带有独立 Node 的前缀目录）
- `https://clawd.org.cn/install.ps1` — Windows PowerShell 安装器（默认 npm；可选 git 安装）

查看当前参数/行为，运行：

```bash
curl -fsSL https://clawd.org.cn/install.sh | bash -s -- --help
```

Windows (PowerShell) 帮助：

```powershell
& ([scriptblock]::Create((iwr -useb https://clawd.org.cn/install.ps1))) -?
```

如果安装器完成但在新终端中找不到 `clawdbot-cn`，通常是 Node/npm PATH 问题。参见：[安装](/install#nodejs--npm-path-sanity)。

## install.sh（推荐）

主要功能：

- 检测操作系统（macOS / Linux / WSL）。
- 确保 Node.js **22+**（macOS 通过 Homebrew；Linux 通过 NodeSource）。
- 选择安装方式：
  - `npm`（默认）：`npm install -g clawdbot-cn@latest`
  - `git`：克隆/构建源码检出并安装包装脚本
- 在 Linux 上：通过将 npm 前缀切换到 `~/.npm-global` 来避免全局 npm 权限错误。
- 如果升级现有安装：运行 `clawdbot-cn doctor --non-interactive`（尽力而为）。
- 对于 git 安装：安装/更新后运行 `clawdbot-cn doctor --non-interactive`（尽力而为）。
- 通过默认 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 缓解 `sharp` 原生安装问题（避免针对系统 libvips 构建）。

如果你*想要* `sharp` 链接到全局安装的 libvips（或正在调试），设置：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL https://clawd.org.cn/install.sh | bash
```

### 可发现性 / "git 安装"提示

如果在**已有的 Clawdbot 源码检出目录内**运行安装器（通过 `package.json` + `pnpm-workspace.yaml` 检测），会提示：

- 更新并使用此检出（`git`）
- 或迁移到全局 npm 安装（`npm`）

在非交互式上下文中（无 TTY / `--no-prompt`），必须传递 `--install-method git|npm`（或设置 `CLAWDBOT_INSTALL_METHOD`），否则脚本以代码 `2` 退出。

### 为什么需要 Git

Git 对于 `--install-method git` 路径（克隆 / 拉取）是必需的。

对于 `npm` 安装，Git *通常*不是必需的，但某些环境仍然需要它（例如当包或依赖项通过 git URL 获取时）。安装器当前确保 Git 存在以避免在新安装的发行版上出现 `spawn git ENOENT` 意外。

### 为什么 npm 在新 Linux 上遇到 `EACCES`

在某些 Linux 设置中（特别是通过系统包管理器或 NodeSource 安装 Node 后），npm 的全局前缀指向 root 拥有的位置。然后 `npm install -g ...` 会因 `EACCES` / `mkdir` 权限错误而失败。

`install.sh` 通过将前缀切换到以下位置来缓解此问题：

- `~/.npm-global`（并在存在时将其添加到 `~/.bashrc` / `~/.zshrc` 的 `PATH` 中）

## install-cli.sh（非 root CLI 安装器）

此脚本将 `clawdbot-cn` 安装到前缀目录（默认：`~/.clawdbot`），并在该前缀下安装专用的 Node 运行时，因此可以在不想触及系统 Node/npm 的机器上工作。

帮助：

```bash
curl -fsSL https://clawd.org.cn/install-cli.sh | bash -s -- --help
```

## install.ps1（Windows PowerShell）

主要功能：

- 确保 Node.js **22+**（winget/Chocolatey/Scoop 或手动）。
- 选择安装方式：
  - `npm`（默认）：`npm install -g clawdbot-cn@latest`
  - `git`：克隆/构建源码检出并安装包装脚本
- 在升级和 git 安装时运行 `clawdbot-cn doctor --non-interactive`（尽力而为）。

示例：

```powershell
iwr -useb https://clawd.org.cn/install.ps1 | iex
```

```powershell
iwr -useb https://clawd.org.cn/install.ps1 | iex -InstallMethod git
```

```powershell
iwr -useb https://clawd.org.cn/install.ps1 | iex -InstallMethod git -GitDir "C:\\clawdbot"
```

环境变量：

- `CLAWDBOT_INSTALL_METHOD=git|npm`
- `CLAWDBOT_GIT_DIR=...`

Git 要求：

如果选择 `-InstallMethod git` 且缺少 Git，安装器会打印 Git for Windows 链接（`https://git-scm.com/download/win`）并退出。

常见 Windows 问题：

- **npm error spawn git / ENOENT**：安装 Git for Windows 并重新打开 PowerShell，然后重新运行安装器。
- **"clawdbot-cn" 无法识别**：你的 npm 全局 bin 文件夹不在 PATH 中。大多数系统使用 `%AppData%\\npm`。你也可以运行 `npm config get prefix` 并将 `\\bin` 添加到 PATH，然后重新打开 PowerShell。
