---
summary: "可选的基于 Docker 的 Clawdbot 设置和引导"
read_when:
  - 您想要容器化网关而非本地安装
  - 您正在验证 Docker 流程
---

# Docker（可选）

Docker 是 **可选的**。仅在您想要容器化网关或验证 Docker 流程时使用。

## Docker 适合我吗？

- **是**：您想要隔离的、可丢弃的网关环境，或在没有本地安装的主机上运行 Clawdbot。
- **否**：您在自己的机器上运行，只想要最快的开发循环。请改用正常安装流程。
- **沙箱说明**：代理沙箱也使用 Docker，但它 **不** 要求完整网关在 Docker 中运行。详见 [沙箱](/gateway/sandboxing)。

本指南涵盖：
- 容器化网关（完整 Clawdbot 在 Docker 中）
- 每会话代理沙箱（主机网关 + Docker 隔离的代理工具）

沙箱详情：[沙箱](/gateway/sandboxing)

## 要求

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 足够的磁盘空间用于镜像和日志

## 容器化网关（Docker Compose）

### 快速开始（推荐）

从仓库根目录：

```bash
./docker-setup.sh
```

此脚本：
- 构建网关镜像
- 运行引导向导
- 打印可选的提供商设置提示
- 通过 Docker Compose 启动网关
- 生成网关令牌并写入 `.env`

可选环境变量：
- `CLAWDBOT_DOCKER_APT_PACKAGES` — 在构建期间安装额外的 apt 包
- `CLAWDBOT_EXTRA_MOUNTS` — 添加额外的主机绑定挂载
- `CLAWDBOT_HOME_VOLUME` — 在命名卷中持久化 `/home/node`

完成后：
- 在浏览器中打开 `http://127.0.0.1:18789/`。
- 将令牌粘贴到控制 UI（设置 → 令牌）。

它在主机上写入配置/工作空间：
- `~/.clawdbot/`
- `~/clawd`

在 VPS 上运行？详见 [Hetzner (Docker VPS)](/platforms/hetzner)。

### 手动流程（compose）

```bash
docker build -t clawdbot:local -f Dockerfile .
docker compose run --rm clawdbot-cli onboard
docker compose up -d clawdbot-gateway
```

### 额外挂载（可选）

如果您想将额外的主机目录挂载到容器中，在运行 `docker-setup.sh` 之前设置
`CLAWDBOT_EXTRA_MOUNTS`。这接受逗号分隔的 Docker 绑定挂载列表，并通过生成
`docker-compose.extra.yml` 将它们应用到 `clawdbot-gateway` 和 `clawdbot-cli`。

示例：

```bash
export CLAWDBOT_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

注意：
- 在 macOS/Windows 上，路径必须与 Docker Desktop 共享。
- 如果您编辑 `CLAWDBOT_EXTRA_MOUNTS`，重新运行 `docker-setup.sh` 以重新生成额外的 compose 文件。
- `docker-compose.extra.yml` 是生成的。不要手动编辑它。

### 持久化整个容器 home（可选）

如果您希望 `/home/node` 在容器重建后持久化，通过 `CLAWDBOT_HOME_VOLUME` 设置命名卷。
这会创建一个 Docker 卷并将其挂载到 `/home/node`，同时保留标准的配置/工作空间绑定挂载。
这里使用命名卷（不是绑定路径）；对于绑定挂载，使用 `CLAWDBOT_EXTRA_MOUNTS`。

示例：

```bash
export CLAWDBOT_HOME_VOLUME="clawdbot_home"
./docker-setup.sh
```

您可以将其与额外挂载结合：

```bash
export CLAWDBOT_HOME_VOLUME="clawdbot_home"
export CLAWDBOT_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

注意：
- 如果您更改 `CLAWDBOT_HOME_VOLUME`，重新运行 `docker-setup.sh` 以重新生成额外的 compose 文件。
- 命名卷会持久化，直到使用 `docker volume rm <name>` 删除。

### 安装额外的 apt 包（可选）

如果您需要镜像内的系统包（例如，构建工具或媒体库），在运行 `docker-setup.sh` 之前
设置 `CLAWDBOT_DOCKER_APT_PACKAGES`。这会在镜像构建期间安装这些包，因此即使容器被删除
它们也会持久化。

示例：

```bash
export CLAWDBOT_DOCKER_APT_PACKAGES="ffmpeg build-essential"
./docker-setup.sh
```

注意：
- 这接受空格分隔的 apt 包名列表。
- 如果您更改 `CLAWDBOT_DOCKER_APT_PACKAGES`，重新运行 `docker-setup.sh` 以重建镜像。

### 更快的重建（推荐）

要加速重建，调整 Dockerfile 顺序使依赖层被缓存。
这避免了除非锁文件更改否则重新运行 `pnpm install`：

```dockerfile
FROM node:22-bookworm

# 安装 Bun（构建脚本需要）
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

# 除非包元数据更改否则缓存依赖
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

### 渠道设置（可选）

使用 CLI 容器配置渠道，然后根据需要重启网关。

WhatsApp（QR）：
```bash
docker compose run --rm clawdbot-cli channels login
```

Telegram（机器人令牌）：
```bash
docker compose run --rm clawdbot-cli channels add --channel telegram --token "<token>"
```

Discord（机器人令牌）：
```bash
docker compose run --rm clawdbot-cli channels add --channel discord --token "<token>"
```

文档：[WhatsApp](/channels/whatsapp)、[Telegram](/channels/telegram)、[Discord](/channels/discord)

### 健康检查

```bash
docker compose exec clawdbot-gateway node dist/index.js health --token "$CLAWDBOT_GATEWAY_TOKEN"
```

### E2E 冒烟测试（Docker）

```bash
scripts/e2e/onboard-docker.sh
```

### QR 导入冒烟测试（Docker）

```bash
pnpm test:docker:qr
```

### 注意

- 网关绑定默认为 `lan` 用于容器使用。
- 网关容器是会话的权威来源（`~/.clawdbot/agents/<agentId>/sessions/`）。

## 代理沙箱（主机网关 + Docker 工具）

深入了解：[沙箱](/gateway/sandboxing)

### 功能说明

当 `agents.defaults.sandbox` 启用时，**非主会话** 在 Docker 容器内运行工具。
网关保持在您的主机上，但工具执行是隔离的：
- scope：默认为 `"agent"`（每个代理一个容器 + 工作空间）
- scope：`"session"` 用于每会话隔离
- 每范围的工作空间文件夹挂载在 `/workspace`
- 可选的代理工作空间访问（`agents.defaults.sandbox.workspaceAccess`）
- 允许/拒绝工具策略（拒绝优先）
- 入站媒体被复制到活动沙箱工作空间（`media/inbound/*`）以便工具可以读取（使用 `workspaceAccess: "rw"` 时，这会落在代理工作空间中）

警告：`scope: "shared"` 禁用跨会话隔离。所有会话共享一个容器和一个工作空间。

### 每代理沙箱配置文件（多代理）

如果您使用多代理路由，每个代理可以覆盖沙箱 + 工具设置：
`agents.list[].sandbox` 和 `agents.list[].tools`（加上 `agents.list[].tools.sandbox.tools`）。
这让您可以在一个网关中运行混合访问级别：
- 完全访问（个人代理）
- 只读工具 + 只读工作空间（家庭/工作代理）
- 无文件系统/shell 工具（公共代理）

详见 [多代理沙箱与工具](/multi-agent-sandbox-tools) 了解示例、优先级和故障排除。

### 默认行为

- 镜像：`clawdbot-sandbox:bookworm-slim`
- 每个代理一个容器
- 代理工作空间访问：`workspaceAccess: "none"`（默认）使用 `~/.clawdbot/sandboxes`
  - `"ro"` 保持沙箱工作空间在 `/workspace` 并以只读方式挂载代理工作空间在 `/agent`（禁用 `write`/`edit`/`apply_patch`）
  - `"rw"` 以读写方式挂载代理工作空间在 `/workspace`
- 自动清理：空闲 > 24 小时 或 存在时间 > 7 天
- 网络：默认为 `none`（如需出站访问请明确启用）
- 默认允许：`exec`、`process`、`read`、`write`、`edit`、`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- 默认拒绝：`browser`、`canvas`、`nodes`、`cron`、`discord`、`gateway`

### 启用沙箱

如果您计划在 `setupCommand` 中安装包，请注意：
- 默认 `docker.network` 是 `"none"`（无出站）。
- `readOnlyRoot: true` 阻止包安装。
- `user` 必须是 root 才能运行 `apt-get`（省略 `user` 或设置 `user: "0:0"`）。
Clawdbot 在 `setupCommand`（或 docker 配置）更改时自动重建容器，除非容器 **最近使用过**
（约 5 分钟内）。热容器会记录警告，带有确切的 `clawdbot sandbox recreate ...` 命令。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared（默认为 agent）
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.clawdbot/sandboxes",
        docker: {
          image: "clawdbot-sandbox:bookworm-slim",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "clawdbot-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"]
        },
        prune: {
          idleHours: 24, // 0 禁用空闲清理
          maxAgeDays: 7  // 0 禁用最大存在时间清理
        }
      }
    }
  },
  tools: {
    sandbox: {
      tools: {
        allow: ["exec", "process", "read", "write", "edit", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"]
      }
    }
  }
}
```

加固选项位于 `agents.defaults.sandbox.docker` 下：
`network`、`user`、`pidsLimit`、`memory`、`memorySwap`、`cpus`、`ulimits`、
`seccompProfile`、`apparmorProfile`、`dns`、`extraHosts`。

多代理：通过 `agents.list[].sandbox.{docker,browser,prune}.*` 覆盖每个代理的
`agents.defaults.sandbox.{docker,browser,prune}.*`
（当 `agents.defaults.sandbox.scope` / `agents.list[].sandbox.scope` 为 `"shared"` 时忽略）。

### 构建默认沙箱镜像

```bash
scripts/sandbox-setup.sh
```

这使用 `Dockerfile.sandbox` 构建 `clawdbot-sandbox:bookworm-slim`。

### 沙箱通用镜像（可选）
如果您想要带有通用构建工具（Node、Go、Rust 等）的沙箱镜像，构建通用镜像：

```bash
scripts/sandbox-common-setup.sh
```

这构建 `clawdbot-sandbox-common:bookworm-slim`。要使用它：

```json5
{
  agents: { defaults: { sandbox: { docker: { image: "clawdbot-sandbox-common:bookworm-slim" } } } }
}
```

### 沙箱浏览器镜像

要在沙箱内运行浏览器工具，构建浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

这使用 `Dockerfile.sandbox-browser` 构建 `clawdbot-sandbox-browser:bookworm-slim`。
容器运行启用 CDP 的 Chromium 和可选的 noVNC 观察器（通过 Xvfb 实现有头模式）。

注意：
- 有头模式（Xvfb）比无头模式减少机器人封锁。
- 仍可通过设置 `agents.defaults.sandbox.browser.headless=true` 使用无头模式。
- 不需要完整桌面环境（GNOME）；Xvfb 提供显示。

使用配置：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: { enabled: true }
      }
    }
  }
}
```

自定义浏览器镜像：

```json5
{
  agents: {
    defaults: {
      sandbox: { browser: { image: "my-clawdbot-browser" } }
    }
  }
}
```

启用后，代理会收到：
- 沙箱浏览器控制 URL（用于 `browser` 工具）
- noVNC URL（如果启用且 headless=false）

记住：如果您使用工具允许列表，添加 `browser`（并从拒绝中删除）否则工具仍被阻止。
清理规则（`agents.defaults.sandbox.prune`）也适用于浏览器容器。

### 自定义沙箱镜像

构建您自己的镜像并将配置指向它：

```bash
docker build -t my-clawdbot-sbx -f Dockerfile.sandbox .
```

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "my-clawdbot-sbx" } }
    }
  }
}
```

### 工具策略（允许/拒绝）

- `deny` 优先于 `allow`。
- 如果 `allow` 为空：所有工具（除了 deny）都可用。
- 如果 `allow` 非空：只有 `allow` 中的工具可用（减去 deny）。

### 清理策略

两个选项：
- `prune.idleHours`：移除 X 小时未使用的容器（0 = 禁用）
- `prune.maxAgeDays`：移除超过 X 天的容器（0 = 禁用）

示例：
- 保留忙碌会话但限制生命周期：
  `idleHours: 24`，`maxAgeDays: 7`
- 永不清理：
  `idleHours: 0`，`maxAgeDays: 0`

### 安全说明

- 硬墙仅适用于 **工具**（exec/read/write/edit/apply_patch）。
- 仅主机工具如 browser/camera/canvas 默认被阻止。
- 在沙箱中允许 `browser` **会破坏隔离**（浏览器在主机上运行）。

## 故障排除

- 镜像缺失：使用 [`scripts/sandbox-setup.sh`](https://github.com/jiulingyun/clawdbot-chinese/blob/main/scripts/sandbox-setup.sh) 构建或设置 `agents.defaults.sandbox.docker.image`。
- 容器未运行：它会按需自动创建每个会话。
- 沙箱中的权限错误：将 `docker.user` 设置为与挂载的工作空间所有权匹配的 UID:GID（或 chown 工作空间文件夹）。
- 找不到自定义工具：Clawdbot 使用 `sh -lc`（登录 shell）运行命令，这会 source `/etc/profile` 并可能重置 PATH。设置 `docker.env.PATH` 以在前面添加您的自定义工具路径（例如，`/custom/bin:/usr/local/share/npm-global/bin`），或在 Dockerfile 中的 `/etc/profile.d/` 下添加脚本。
