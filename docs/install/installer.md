---
summary: "安装程序脚本的工作原理（install.sh + install-cli.sh）、标志和自动化"
read_when:
  - 您想了解 `clawd.bot/install.sh`
  - 您想自动化安装（CI / 无人值守）
  - 您想从 GitHub 检出安装
---

# 安装程序内部机制

Clawdbot 提供两个安装程序脚本（从 `clawd.bot` 提供）：

- `https://clawd.bot/install.sh` — “推荐”安装程序（默认全局 npm 安装；也可以从 GitHub 检出安装）
- `https://clawd.bot/install-cli.sh` — 非 root 友好的 CLI 安装程序（安装到前缀中并带有自己的 Node）
- `https://clawd.bot/install.ps1` — Windows PowerShell 安装程序（默认 npm；可选 git 安装）

要查看当前的标志/行为，请运行：

```bash
curl -fsSL https://clawd.bot/install.sh | bash -s -- --help
```

Windows（PowerShell）帮助：

```powershell
& ([scriptblock]::Create((iwr -useb https://clawd.bot/install.ps1))) -?
```

如果安装程序完成但在新终端中找不到 `clawdbot`，通常是 Node/npm PATH 问题。参见：[安装](/install#nodejs--npm-path-sanity)。

## install.sh（推荐）

它的作用（高级别）：

- 检测操作系统（macOS / Linux / WSL）。
- 确保 Node.js **22+**（macOS 通过 Homebrew；Linux 通过 NodeSource）。
- 选择安装方法：
  - `npm`（默认）：`npm install -g clawdbot@latest`
  - `git`：克隆/构建源代码检出并安装包装脚本
- 在 Linux 上：通过在需要时将 npm 的前缀切换到 `~/.npm-global` 来避免全局 npm 权限错误。
- 如果升级现有安装：运行 `clawdbot-cn doctor --non-interactive`（尽力而为）。
- 对于 git 安装：在安装/更新后运行 `clawdbot-cn doctor --non-interactive`（尽力而为）。
- 通过默认设置 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 来缓解 `sharp` 本地安装问题（避免针对系统 libvips 构建）。

如果您*想要* `sharp` 链接到全局安装的 libvips（或您正在调试），请设置：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL https://clawd.bot/install.sh | bash
```

### 可发现性 / “git 安装”提示

如果您在**已经在 Clawdbot 源代码检出内**时运行安装程序（通过 `package.json` + `pnpm-workspace.yaml` 检测），它会提示：

- 更新并使用此检出（`git`）
- 或迁移到全局 npm 安装（`npm`）

在非交互式环境中（无 TTY / `--no-prompt`），您必须传递 `--install-method git|npm`（或设置 `CLAWDBOT_INSTALL_METHOD`），否则脚本将以代码 `2` 退出。

### 为什么需要 Git

`--install-method git` 路径（克隆 / 拉取）需要 Git。

对于 `npm` 安装，通常不需要 Git，但某些环境仍然需要它（例如，当包或依赖项通过 git URL 获取时）。安装程序当前确保 Git 存在，以避免在新发行版上出现 `spawn git ENOENT` 意外。

### 为什么 npm 在新 Linux 上遇到 `EACCES`

在某些 Linux 设置中（尤其是在通过系统包管理器或 NodeSource 安装 Node 后），npm 的全局前缀指向 root 拥有的位置。然后 `npm install -g ...` 因 `EACCES` / `mkdir` 权限错误而失败。

`install.sh` 通过将前缀切换到以下位置来缓解此问题：

- `~/.npm-global`（并在存在时将其添加到 `~/.bashrc` / `~/.zshrc` 中的 `PATH`）

## install-cli.sh（非 root CLI 安装程序）

此脚本将 `clawdbot` 安装到前缀中（默认：`~/.clawdbot`）并也在该前缀下安装专用的 Node 运行时，因此它可以在您不想触摸系统 Node/npm 的机器上工作。

帮助：

```bash
curl -fsSL https://clawd.bot/install-cli.sh | bash -s -- --help
```

## install.ps1（Windows PowerShell）

它的作用（高级别）：

- 确保 Node.js **22+**（winget/Chocolatey/Scoop 或手动）。
- 选择安装方法：
  - `npm`（默认）：`npm install -g clawdbot@latest`
  - `git`：克隆/构建源代码检出并安装包装脚本
- 在升级和 git 安装时运行 `clawdbot-cn doctor --non-interactive`（尽力而为）。

示例：

```powershell
iwr -useb https://clawd.bot/install.ps1 | iex
```

```powershell
iwr -useb https://clawd.bot/install.ps1 | iex -InstallMethod git
```

```powershell
iwr -useb https://clawd.bot/install.ps1 | iex -InstallMethod git -GitDir "C:\\clawdbot"
```

环境变量：

- `CLAWDBOT_INSTALL_METHOD=git|npm`
- `CLAWDBOT_GIT_DIR=...`

Git 要求：

如果您选择 `-InstallMethod git` 且 Git 缺失，安装程序将打印
Git for Windows 链接（`https://git-scm.com/download/win`）并退出。

常见的 Windows 问题：

- **npm error spawn git / ENOENT**：安装 Git for Windows 并重新打开 PowerShell，然后重新运行安装程序。
- **"clawdbot" is not recognized**：您的 npm 全局 bin 文件夹不在 PATH 上。大多数系统使用
  `%AppData%\\npm`。您也可以运行 `npm config get prefix` 并将 `\\bin` 添加到 PATH，然后重新打开 PowerShell。