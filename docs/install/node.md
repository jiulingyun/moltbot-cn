---
summary: "Node.js + npm 安装检查：版本、PATH 和全局安装"
read_when:
  - 您安装了 Clawdbot 但 `clawdbot` 显示“命令未找到”
  - 您正在新机器上设置 Node.js/npm
  - `npm install -g ...` 因权限或 PATH 问题而失败
---

# Node.js + npm（PATH 检查）

Clawdbot 的运行时基础是 **Node 22+**。

如果您可以运行 `npm install -g clawdbot@latest` 但稍后看到 `clawdbot: command not found`，几乎总是一个 **PATH** 问题：npm 放置全局二进制文件的目录不在您的 shell 的 PATH 中。

## 快速诊断

运行：

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

如果 `$(npm prefix -g)/bin`（macOS/Linux）或 `$(npm prefix -g)`（Windows）**不存在**于 `echo "$PATH"` 中，您的 shell 找不到全局 npm 二进制文件（包括 `clawdbot`）。

## 修复：将 npm 的全局 bin 目录添加到 PATH

1) 查找您的全局 npm 前缀：

```bash
npm prefix -g
```

2) 将全局 npm bin 目录添加到您的 shell 启动文件：

- zsh: `~/.zshrc`
- bash: `~/.bashrc`

示例（用您的 `npm prefix -g` 输出替换路径）：

```bash
# macOS / Linux
export PATH="/path/from/npm/prefix/bin:$PATH"
```

然后打开一个**新终端**（或在 zsh 中运行 `rehash` / 在 bash 中运行 `hash -r`）。

在 Windows 上，将 `npm prefix -g` 的输出添加到您的 PATH 中。

## 修复：避免 `sudo npm install -g` / 权限错误（Linux）

如果 `npm install -g ...` 因 `EACCES` 失败，将 npm 的全局前缀切换到用户可写的目录：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

在您的 shell 启动文件中保留 `export PATH=...` 行。

## 推荐的 Node 安装选项

如果以以下方式安装 Node/npm，您将遇到最少的问题：

- 保持 Node 更新（22+）
- 使全局 npm bin 目录在新 shell 中稳定并位于 PATH 中

常见选择：

- macOS: Homebrew（`brew install node`）或版本管理器
- Linux: 您首选的版本管理器，或提供 Node 22+ 的发行版支持的安装
- Windows: 官方 Node 安装程序、`winget` 或 Windows Node 版本管理器

如果您使用版本管理器（nvm/fnm/asdf/等），请确保它在您日常使用的 shell 中初始化（zsh vs bash），这样在运行安装程序时设置的 PATH 就存在。
