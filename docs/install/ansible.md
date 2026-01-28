---
summary: "使用 Ansible、Tailscale VPN 和防火墙隔离的自动化、加固的 Clawdbot 安装"
read_when:
  - 您想要带有安全加固的自动化服务器部署
  - 您需要带 VPN 访问的防火墙隔离设置
  - 您正在部署到远程 Debian/Ubuntu 服务器
---

# Ansible 安装

将 Clawdbot 部署到生产服务器的推荐方式是通过 **[clawdbot-ansible](https://github.com/clawdbot/clawdbot-ansible)** — 一个以安全优先架构的自动化安装程序。

## 快速开始

单命令安装：

```bash
curl -fsSL https://raw.githubusercontent.com/clawdbot/clawdbot-ansible/main/install.sh | bash
```

> **📦 完整指南: [github.com/clawdbot/clawdbot-ansible](https://github.com/clawdbot/clawdbot-ansible)**
>
> clawdbot-ansible 仓库是 Ansible 部署的真实来源。本页是快速概览。

## 您将获得

- 🔒 **防火墙优先安全**: UFW + Docker 隔离（仅 SSH + Tailscale 可访问）
- 🔐 **Tailscale VPN**: 安全的远程访问，不公开暴露服务
- 🐳 **Docker**: 隔离沙箱容器，仅本地主机绑定
- 🛡️ **深度防御**: 4 层安全架构
- 🚀 **单命令设置**: 数分钟内完成完整部署
- 🔧 **Systemd 集成**: 开机自动启动并加固

## 要求

- **操作系统**: Debian 11+ 或 Ubuntu 20.04+
- **访问权限**: Root 或 sudo 权限
- **网络**: 用于包安装的互联网连接
- **Ansible**: 2.14+（由快速开始脚本自动安装）

## 安装内容

Ansible playbook 安装并配置：

1. **Tailscale**（用于安全远程访问的网格 VPN）
2. **UFW 防火墙**（仅 SSH + Tailscale 端口）
3. **Docker CE + Compose V2**（用于代理沙箱）
4. **Node.js 22.x + pnpm**（运行时依赖）
5. **Clawdbot**（基于主机，非容器化）
6. **Systemd 服务**（开机自动启动并安全加固）

注意：网关在**主机上直接运行**（不在 Docker 中），但代理沙箱使用 Docker 进行隔离。详情请参阅 [沙箱](/gateway/sandboxing)。

## 安装后设置

安装完成后，切换到 clawdbot 用户：

```bash
sudo -i -u clawdbot
```

安装后脚本将引导您完成：

1. **入门向导**: 配置 Clawdbot 设置
2. **提供商登录**: 连接 WhatsApp/Telegram/Discord/Signal
3. **网关测试**: 验证安装
4. **Tailscale 设置**: 连接到您的 VPN 网格

### 快速命令

```bash
# 检查服务状态
sudo systemctl status clawdbot

# 查看实时日志
sudo journalctl -u clawdbot -f

# 重启网关
sudo systemctl restart clawdbot

# 提供商登录（以 clawdbot 用户身份运行）
sudo -i -u clawdbot
clawdbot-cn channels login
```

## 安全架构

### 4 层防护

1. **防火墙 (UFW)**: 仅 SSH (22) + Tailscale (41641/udp) 对外公开
2. **VPN (Tailscale)**: 网关仅可通过 VPN 网格访问
3. **Docker 隔离**: DOCKER-USER iptables 链防止外部端口暴露
4. **Systemd 加固**: NoNewPrivileges, PrivateTmp, 非特权用户

### 验证

测试外部攻击面：

```bash
nmap -p- YOUR_SERVER_IP
```

应该只显示 **端口 22** (SSH) 开放。所有其他服务（网关、Docker）都被锁定。

### Docker 可用性

Docker 是为**代理沙箱**（隔离工具执行）安装的，而不是为了运行网关本身。网关仅绑定到本地主机并通过 Tailscale VPN 访问。

沙箱配置请参阅 [多代理沙箱和工具](/multi-agent-sandbox-tools)。

## 手动安装

如果您更喜欢手动控制自动化：

```bash
# 1. 安装先决条件
sudo apt update && sudo apt install -y ansible git

# 2. 克隆仓库
git clone https://github.com/clawdbot/clawdbot-ansible.git
cd clawdbot-ansible

# 3. 安装 Ansible 集合
ansible-galaxy collection install -r requirements.yml

# 4. 运行 playbook
./run-playbook.sh

# 或直接运行（然后手动执行 /tmp/clawdbot-setup.sh）
# ansible-playbook playbook.yml --ask-become-pass
```

## 更新 Clawdbot

Ansible 安装程序为手动更新设置了 Clawdbot。标准更新流程请参阅 [更新](/install/updating)。

要重新运行 Ansible playbook（例如，用于配置更改）：

```bash
cd clawdbot-ansible
./run-playbook.sh
```

注意：这是幂等的，可以安全地多次运行。

## 故障排除

### 防火墙阻止我的连接

如果您被锁定：
- 首先确保可以通过 Tailscale VPN 访问
- SSH 访问（端口 22）始终允许
- 网关**仅**可通过 Tailscale 访问，这是设计如此

### 服务无法启动

```bash
# 检查日志
sudo journalctl -u clawdbot -n 100

# 验证权限
sudo ls -la /opt/clawdbot

# 测试手动启动
sudo -i -u clawdbot
cd ~/clawdbot
pnpm start
```

### Docker 沙箱问题

```bash
# 验证 Docker 是否正在运行
sudo systemctl status docker

# 检查沙箱镜像
sudo docker images | grep clawdbot-sandbox

# 如缺少则构建沙箱镜像
cd /opt/clawdbot/clawdbot
sudo -u clawdbot ./scripts/sandbox-setup.sh
```

### 提供商登录失败

确保您以 `clawdbot` 用户身份运行：

```bash
sudo -i -u clawdbot
clawdbot-cn channels login
```

## 高级配置

有关详细的安全架构和故障排除：
- [安全架构](https://github.com/clawdbot/clawdbot-ansible/blob/main/docs/security.md)
- [技术详情](https://github.com/clawdbot/clawdbot-ansible/blob/main/docs/architecture.md)
- [故障排除指南](https://github.com/clawdbot/clawdbot-ansible/blob/main/docs/troubleshooting.md)

## 相关

- [clawdbot-ansible](https://github.com/clawdbot/clawdbot-ansible) — 完整部署指南
- [Docker](/install/docker) — 容器化网关设置
- [沙箱](/gateway/sandboxing) — 代理沙箱配置
- [多代理沙箱和工具](/multi-agent-sandbox-tools) — 每个代理隔离