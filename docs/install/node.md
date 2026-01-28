---
summary: "Node.js + npm 安装指南：版本、PATH 和全局安装"
read_when:
  - 安装了 Clawdbot 但 `clawdbot-cn` 显示"命令未找到"
  - 在新机器上设置 Node.js/npm
  - `npm install -g ...` 因权限或 PATH 问题失败
---

# Node.js + npm（PATH 检查）

Clawdbot 的运行时基准是 **Node 22+**。

如果你能运行 `npm install -g clawdbot-cn@latest` 但之后看到 `clawdbot-cn: command not found`，几乎总是 **PATH** 问题：npm 放置全局二进制文件的目录不在你的 shell PATH 中。

## 快速诊断

运行：

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

如果 `$(npm prefix -g)/bin`（macOS/Linux）或 `$(npm prefix -g)`（Windows）**不在** `echo "$PATH"` 输出中，你的 shell 找不到全局 npm 二进制文件（包括 `clawdbot-cn`）。

## 修复：将 npm 的全局 bin 目录添加到 PATH

1) 找到你的全局 npm 前缀：

```bash
npm prefix -g
```

2) 将全局 npm bin 目录添加到你的 shell 启动文件：

- zsh：`~/.zshrc`
- bash：`~/.bashrc`

示例（将路径替换为你的 `npm prefix -g` 输出）：

```bash
# macOS / Linux
export PATH="/path/from/npm/prefix/bin:$PATH"
```

然后打开**新终端**（或在 zsh 中运行 `rehash` / 在 bash 中运行 `hash -r`）。

在 Windows 上，将 `npm prefix -g` 的输出添加到 PATH。

## 修复：避免 `sudo npm install -g` / 权限错误（Linux）

如果 `npm install -g ...` 因 `EACCES` 失败，将 npm 的全局前缀切换到用户可写目录：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

在你的 shell 启动文件中持久化 `export PATH=...` 行。

## 推荐的 Node 安装选项

如果 Node/npm 以以下方式安装，你会遇到最少的问题：

- 保持 Node 更新（22+）
- 使全局 npm bin 目录稳定并在新 shell 中位于 PATH 中

常见选择：

- macOS：Homebrew（`brew install node`）或版本管理器
- Linux：你首选的版本管理器，或提供 Node 22+ 的发行版支持的安装
- Windows：官方 Node 安装程序、`winget` 或 Windows Node 版本管理器

如果你使用版本管理器（nvm/fnm/asdf/等），确保它在你日常使用的 shell（zsh vs bash）中初始化，以便运行安装器时它设置的 PATH 存在。
