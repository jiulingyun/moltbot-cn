---
summary: "稳定版、测试版和开发版渠道：语义、切换和标记"
read_when:
  - 您想在稳定版/测试版/开发版之间切换
  - 您正在标记或发布预发布版本
---

# 开发渠道

最后更新：2026-01-21

Clawdbot 发布三个更新渠道：

- **stable**：npm 分发标签 `latest`。
- **beta**：npm 分发标签 `beta`（正在测试的构建）。
- **dev**：`main` 的移动头部（git）。npm 分发标签：`dev`（发布时）。

我们将构建发布到 **beta**，测试它们，然后将 **经过验证的构建提升到 `latest`**
而不改变版本号 —— 分发标签是 npm 安装的真实来源。

## 切换渠道

Git 检出：

```bash
clawdbot-cn update --channel stable
clawdbot-cn update --channel beta
clawdbot-cn update --channel dev
```

- `stable`/`beta` 检出最新的匹配标签（通常是相同标签）。
- `dev` 切换到 `main` 并对上游进行变基。

npm/pnpm 全局安装：

```bash
clawdbot-cn update --channel stable
clawdbot-cn update --channel beta
clawdbot-cn update --channel dev
```

这通过相应的 npm 分发标签（`latest`，`beta`，`dev`）进行更新。

当您使用 `--channel` **显式**切换渠道时，Clawdbot 还会调整
安装方法：

- `dev` 确保 git 检出（默认 `~/clawdbot`，用 `CLAWDBOT_GIT_DIR` 覆盖），
  更新它，并从该检出安装全局 CLI。
- `stable`/`beta` 使用匹配的分发标签从 npm 安装。

提示：如果您想并行使用稳定版 + 开发版，请保留两个克隆并将您的网关指向稳定版。

## 插件和渠道

当您使用 `clawdbot update` 切换渠道时，Clawdbot 还会同步插件源：

- `dev` 优先使用来自 git 检出的捆绑插件。
- `stable` 和 `beta` 恢复 npm 安装的插件包。

## 标记最佳实践

- 标记您希望 git 检出的目标发布（`vYYYY.M.D` 或 `vYYYY.M.D-<patch>`）。
- 保持标签不可变：永远不要移动或重用标签。
- npm 分发标签仍然是 npm 安装的真实来源：
  - `latest` → 稳定版
  - `beta` → 候选构建
  - `dev` → 主快照（可选）

## macOS 应用可用性

测试版和开发版构建可能 **不** 包含 macOS 应用发布。这没问题：

- git 标签和 npm 分发标签仍可发布。
- 在发布说明或变更日志中指出 "此测试版没有 macOS 构建"。