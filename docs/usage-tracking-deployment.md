# Copilot Proxy 部署与使用指南

> 分支: `fix/usage-incremental-tracking`
> 最后更新: 2026-03-24

---

## 目录

- [1. 前置依赖](#1-前置依赖)
- [2. 安装方式](#2-安装方式)
  - [2.1 Linux 源码安装](#21-linux-源码安装)
  - [2.2 Windows 源码安装](#22-windows-源码安装)
  - [2.3 Docker](#23-docker)
  - [2.4 npm 全局安装（上游原版）](#24-npm-全局安装上游原版)
- [3. 服务部署与启动](#3-服务部署与启动)
  - [3.1 Linux — systemd 方式](#31-linux--systemd-方式)
  - [3.2 Linux — 内置 daemon 方式](#32-linux--内置-daemon-方式)
  - [3.3 Windows — 内置 daemon 方式](#33-windows--内置-daemon-方式)
  - [3.4 Windows — 前台运行（调试用）](#34-windows--前台运行调试用)
- [4. Dashboard 使用](#4-dashboard-使用)
  - [4.1 访问地址](#41-访问地址)
  - [4.2 首次配置](#42-首次配置)
  - [4.3 功能概览](#43-功能概览)
  - [4.4 密码重置](#44-密码重置)
  - [4.5 安全机制](#45-安全机制)
  - [4.6 外部访问（反向代理）](#46-外部访问反向代理)
- [5. 多机用量同步](#5-多机用量同步)
  - [5.1 架构](#51-架构)
  - [5.2 配对流程（网页操作）](#52-配对流程网页操作)
  - [5.3 同步机制](#53-同步机制)
- [6. 数据与备份](#6-数据与备份)
  - [6.1 数据存储位置](#61-数据存储位置)
  - [6.2 备份与恢复](#62-备份与恢复)
  - [6.3 自定义定价](#63-自定义定价)
- [7. 运维命令速查](#7-运维命令速查)
  - [7.1 Linux 运维命令](#71-linux-运维命令)
  - [7.2 Windows 运维命令](#72-windows-运维命令)
- [8. 分支专有修复](#8-分支专有修复)
- [9. API 参考](#9-api-参考)
- [10. 常见问题](#10-常见问题)

---

## 1. 前置依赖

| 依赖 | 版本要求 | 安装方式 |
|------|----------|----------|
| **Bun** | >= 1.2.x | Linux: `curl -fsSL https://bun.sh/install \| bash` |
|         |          | Windows: `powershell -c "irm bun.sh/install.ps1 \| iex"` |
| **Git** | 任意     | Linux: `apt install git` / `yum install git` |
|         |          | Windows: [git-scm.com](https://git-scm.com/) |
| **GitHub 账号** | — | 需有 Copilot 订阅 |

---

## 2. 安装方式

### 2.1 Linux 源码安装

```bash
git clone https://github.com/listeven_microsoft/copilot-proxy.git /opt/copilot-proxy
cd /opt/copilot-proxy
git checkout fix/usage-incremental-tracking
bun install && bun run build
```

### 2.2 Windows 源码安装

```powershell
git clone https://github.com/listeven_microsoft/copilot-proxy.git C:\copilot-proxy
cd C:\copilot-proxy
git checkout fix/usage-incremental-tracking
bun install
bun run build
```

> **注意**: Windows 下需确保 `bun` 已加入系统 PATH。安装后可能需要重新打开终端。

### 2.3 Docker

```bash
docker build -t copilot-proxy .
docker run -p 4399:4399 -v $(pwd)/copilot-data:/root/.local/share/copilot-proxy copilot-proxy
```

### 2.4 npm 全局安装（上游原版）

```bash
npm i -g @jer-y/copilot-proxy
copilot-proxy start
```

> **注意**: npm 全局安装为上游原版，**不含本分支功能**（Dashboard、增量计算、用量同步等）。需要完整功能请使用源码安装。

---

## 3. 服务部署与启动

### 3.1 Linux — systemd 方式

#### 创建服务文件

```bash
cat > /etc/systemd/system/copilot-proxy.service << 'EOF'
[Unit]
Description=Copilot API Proxy
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/copilot-proxy
ExecStart=/root/.bun/bin/bun run dist/main.js start --port 4399 --account-type individual
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

> `ExecStart` 中的 bun 路径和 `WorkingDirectory` 需根据实际安装位置调整。

#### 启用并启动

```bash
systemctl daemon-reload
systemctl enable copilot-proxy
systemctl start copilot-proxy
```

### 3.2 Linux — 内置 daemon 方式

适合不使用 systemd 的场景：

```bash
cd /opt/copilot-proxy
bun run dist/main.js start -d            # 后台启动
bun run dist/main.js stop                # 停止
bun run dist/main.js restart             # 重启
bun run dist/main.js status              # 查看状态
bun run dist/main.js logs -f             # 实时日志
bun run dist/main.js enable              # 注册开机自启
bun run dist/main.js disable             # 移除开机自启
```

### 3.3 Windows — 内置 daemon 方式

Windows 没有 systemd，使用项目内置的 daemon 管理命令：

```powershell
cd C:\copilot-proxy

# 后台启动
bun run dist/main.js start -d --port 4399

# 查看状态
bun run dist/main.js status

# 查看日志
bun run dist/main.js logs -f

# 注册开机自启（自动检测 OS）
bun run dist/main.js enable

# 停止服务
bun run dist/main.js stop

# 重启服务
bun run dist/main.js restart
```

> **重要**: Windows 下所有命令都需要先 `cd` 到项目目录（如 `C:\copilot-proxy`）再执行。

### 3.4 Windows — 前台运行（调试用）

```powershell
cd C:\copilot-proxy
bun run dist/main.js start --port 4399
```

前台运行时日志直接输出到终端，关闭终端则服务停止。仅建议调试时使用。

---

## 4. Dashboard 使用

### 4.1 访问地址

```
http://localhost:4399/dashboard
```

如需从其他机器访问，将 `localhost` 替换为服务器 IP 或域名。

### 4.2 首次配置

1. 浏览器打开 Dashboard，系统提示设置密码（最少 4 位）
2. 设置后自动登录，即可看到用量数据
3. **所有配置均可在网页端完成**，无需编辑配置文件

### 4.3 功能概览

| 功能 | 说明 |
|------|------|
| 实时统计 | Token 用量、调用次数、成本估算 |
| 时间过滤 | 1h / 6h / 24h / 7d / 全部 |
| 分维度查看 | 按模型、按来源（Claude Code / OpenClaw 等） |
| 小时图表 | 柱状图展示 Input/Output Token 趋势 |
| 活动记录 | `/dashboard/activity` 完整调用历史，分页浏览 |
| CSV 导出 | 一键导出当前时间段数据 |
| Settings | 同步配置（见[多机用量同步](#5-多机用量同步)） |
| 主题切换 | 浅色 / 深色双主题 |

### 4.4 密码重置

**Linux:**

```bash
# 方法 1: 仅清除密码（保留数据）
sqlite3 ~/.copilot-proxy/usage.db "DELETE FROM auth_config WHERE key='password_hash';"

# 方法 2: 删除整个数据库（丢失历史数据）
rm ~/.copilot-proxy/usage.db

# 然后重启服务
systemctl restart copilot-proxy
```

**Windows (PowerShell):**

```powershell
# 方法 1: 仅清除密码（需安装 sqlite3 命令行工具）
sqlite3 "$env:USERPROFILE\.copilot-proxy\usage.db" "DELETE FROM auth_config WHERE key='password_hash';"

# 方法 2: 删除整个数据库（丢失历史数据）
Remove-Item "$env:USERPROFILE\.copilot-proxy\usage.db"

# 然后重启服务
cd C:\copilot-proxy
bun run dist/main.js restart
```

### 4.5 安全机制

- 密码 bcrypt 加密存储
- Session 有效期 24 小时（HTTP-only Cookie）
- 连续 5 次登录失败锁定 15 分钟

### 4.6 外部访问（反向代理）

Nginx 示例：

```nginx
server {
    listen 443 ssl;
    server_name copilot.example.com;

    location / {
        proxy_pass http://127.0.0.1:4399;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;   # SSE 流式响应需要
        proxy_cache off;
    }
}
```

---

## 5. 多机用量同步

本分支支持多台机器的用量数据自动汇聚到一台中心服务器。

### 5.1 架构

```
远程机器 A ──┐
远程机器 B ──┼── 定时推送 ──→ 中心服务器 Dashboard
远程机器 C ──┘                (汇总查看所有机器数据)
```

> **注意**: 同步目标必须是另一台机器，不能将数据推送到自己（localhost）。

### 5.2 配对流程（网页操作）

#### 第 1 步：中心服务器 — 生成连接配置

1. 打开中心服务器 Dashboard → 点击 **Settings**
2. 在「Server Connection Info」区域：
   - 系统自动生成 Ingest Key（首次打开时生成）
   - 点击 **Copy Connection Config**
   - 剪贴板获得：`{"url":"https://center.example.com","key":"abc123..."}`

#### 第 2 步：远程机器 — 粘贴并启用

1. 打开远程机器 Dashboard → 点击 **Settings**
2. 在「Client Sync Settings」区域：
   - 在「Paste Connection Config」框中粘贴上一步复制的 JSON
   - URL 和 Key 自动填入
   - 设置同步间隔（默认 5 分钟）
   - 打开 **Enabled** 开关
   - 点击 **Save**
3. （可选）点击 **Sync Now** 立即手动同步一次，验证连通性

#### 状态监控

Settings 面板底部显示：
- 最后同步时间 + 同步条数
- 错误信息（网络不通、Key 错误等）

### 5.3 同步机制

- **增量同步**: 基于 `usage_log.id` 水位线，只推送新增记录
- **批量传输**: 每次最多 500 条，自动循环直到全部同步完
- **自动附加 hostname**: 每条记录标注来源机器名
- **断点续传**: 重启后从上次水位线继续
- **服务启动自动开始**: 如果之前配置了 enabled，重启后自动恢复定时同步

---

## 6. 数据与备份

### 6.1 数据存储位置

| 文件 | Linux 路径 | Windows 路径 | 说明 |
|------|-----------|-------------|------|
| SQLite 数据库 | `~/.copilot-proxy/usage.db` | `%USERPROFILE%\.copilot-proxy\usage.db` | 用量日志、认证、同步配置 |
| 自定义定价 | `~/.copilot-proxy/pricing.json` | `%USERPROFILE%\.copilot-proxy\pricing.json` | 可选，覆盖默认模型价格 |
| Daemon 日志 | `~/.copilot-proxy/daemon.log` | `%USERPROFILE%\.copilot-proxy\daemon.log` | daemon 模式日志 |

### 6.2 备份与恢复

**Linux:**

```bash
# 备份
cp ~/.copilot-proxy/usage.db ~/backups/usage-$(date +%Y%m%d).db

# 恢复
cp ~/backups/usage-20260321.db ~/.copilot-proxy/usage.db
systemctl restart copilot-proxy
```

**Windows (PowerShell):**

```powershell
# 备份
$date = Get-Date -Format "yyyyMMdd"
Copy-Item "$env:USERPROFILE\.copilot-proxy\usage.db" "$env:USERPROFILE\backups\usage-$date.db"

# 恢复
Copy-Item "$env:USERPROFILE\backups\usage-20260321.db" "$env:USERPROFILE\.copilot-proxy\usage.db"
cd C:\copilot-proxy
bun run dist/main.js restart
```

### 6.3 自定义定价

创建 `pricing.json`（路径见[数据存储位置](#61-数据存储位置)）：

```json
{
  "gpt-5": { "input": 6.00, "output": 24.00 },
  "claude-opus-4.6": { "input": 18.00, "output": 90.00 }
}
```

保存后立即生效，无需重启。

---

## 7. 运维命令速查

### 7.1 Linux 运维命令

#### systemd 方式

| 操作 | 命令 |
|------|------|
| 启动 | `systemctl start copilot-proxy` |
| 停止 | `systemctl stop copilot-proxy` |
| 重启 | `systemctl restart copilot-proxy` |
| 查看状态 | `systemctl status copilot-proxy` |
| 查看日志 | `journalctl -u copilot-proxy -f` |
| 开机自启 | `systemctl enable copilot-proxy` |
| 取消自启 | `systemctl disable copilot-proxy` |

#### 内置 daemon 方式

```bash
cd /opt/copilot-proxy
bun run dist/main.js start -d      # 后台启动
bun run dist/main.js stop           # 停止
bun run dist/main.js restart        # 重启
bun run dist/main.js status         # 查看状态
bun run dist/main.js logs -f        # 实时日志
bun run dist/main.js enable         # 注册开机自启
bun run dist/main.js disable        # 移除开机自启
```

### 7.2 Windows 运维命令

> 所有命令需先进入项目目录：`cd C:\copilot-proxy`

| 操作 | 命令 |
|------|------|
| 后台启动 | `bun run dist/main.js start -d --port 4399` |
| 前台启动（调试） | `bun run dist/main.js start --port 4399` |
| 停止 | `bun run dist/main.js stop` |
| 重启 | `bun run dist/main.js restart` |
| 查看状态 | `bun run dist/main.js status` |
| 查看实时日志 | `bun run dist/main.js logs -f` |
| 注册开机自启 | `bun run dist/main.js enable` |
| 移除开机自启 | `bun run dist/main.js disable` |
| 手动查看日志文件 | `Get-Content "$env:USERPROFILE\.copilot-proxy\daemon.log" -Tail 50` |
| 检查端口占用 | `netstat -ano \| findstr :4399` |
| 手动触发同步 | `curl -X POST http://localhost:4399/dashboard/api/sync-now -H "Cookie: dashboard_session=YOUR_SESSION"` |

---

## 8. 分支专有修复

以下修复仅存在于 `fix/usage-incremental-tracking` 分支：

### 修复 1: Bun.serve idleTimeout（流式响应断开）

**问题**: Bun 默认 `idleTimeout=10s`，LLM 思考时间超过 10 秒即断开连接。

**修复**: `src/start.ts` 设置 `bun.idleTimeout: 255`（Bun 最大值）。

### 修复 2: fetch 超时（Bun 环境）

**问题**: Bun 的 fetch 不使用 undici，默认超时约 5 分钟，长对话会超时。

**修复**: `create-chat-completions.ts` 和 `create-responses.ts` 加入 `AbortSignal.timeout(10 * 60 * 1000)`。

### 功能对比

| 功能 | npm 全局安装 (上游原版) | 源码安装 (本分支) |
|------|:---:|:---:|
| 代理核心功能 | Yes | Yes |
| Dashboard UI | No | Yes |
| 增量 Token 计算 | No | Yes |
| 远程用量汇聚 | No | Yes |
| Settings 面板 | No | Yes |
| 成本估算 / 图表 | No | Yes |
| idleTimeout 修复 | No | Yes |
| fetch 超时修复 | No | Yes |

---

## 9. API 参考

### 代理端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/v1/chat/completions` | POST | OpenAI Chat 格式 |
| `/v1/messages` | POST | Anthropic Messages 格式 |
| `/v1/responses` | POST | OpenAI Responses 格式 |
| `/v1/models` | GET | 可用模型列表 |
| `/v1/embeddings` | POST | 文本 embedding |

### Dashboard 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/dashboard` | GET | Dashboard 主页 |
| `/dashboard/activity` | GET | 活动记录页 |
| `/dashboard/api/stats` | GET | 用量统计 |
| `/dashboard/api/models` | GET | 按模型统计 |
| `/dashboard/api/sources` | GET | 按来源统计 |
| `/dashboard/api/hourly` | GET | 小时分布 |
| `/dashboard/api/recent` | GET | 最近记录 |
| `/dashboard/api/export` | GET | CSV 导出 |
| `/dashboard/api/pricing` | GET/POST | 定价配置 |
| `/dashboard/api/sync-config` | GET/POST | 同步配置 |
| `/dashboard/api/sync-now` | POST | 手动触发同步 |
| `/dashboard/api/connect-info` | GET | 获取连接配置 |
| `/dashboard/api/ingest` | POST | 接收远程数据 |

所有 `/dashboard/api/*` 端点（除 `ingest`）需要登录 Session。`ingest` 使用 `X-Ingest-Key` 认证。

---

## 10. 常见问题

### Dashboard 显示 "Loading..." 不动

- 确认服务运行中
  - Linux: `systemctl status copilot-proxy`
  - Windows: `cd C:\copilot-proxy && bun run dist/main.js status`
- 检查端口: `curl http://localhost:4399/`
- 查看浏览器控制台错误

### 成本显示 $0.00

- 确认有请求经过代理
- 未知模型使用默认价格 ($2/$8 per 1M tokens)
- 可通过 `pricing.json` 自定义

### 同步失败 (HTTP 404)

- **检查同步目标 URL 是否正确** — 不能是 `localhost`（不能推给自己）
- 检查 Settings 面板底部的错误信息
- 确认中心服务器可达: `curl https://center.example.com/dashboard/api/status`
- 确认 Ingest Key 正确
- 点击 Sync Now 手动测试

### 网页端能完成所有配置吗？

**是的。** Dashboard 密码设置、同步配对、启停同步、手动触发同步均可在网页完成。唯一需要命令行的是：
- 首次安装和构建
- 服务创建（Linux systemd）
- 服务启停

### Windows 下 bun 命令找不到

- 确认已安装 Bun: `bun --version`
- 如果刚安装，需要重新打开终端让 PATH 生效
- 也可使用完整路径: `%USERPROFILE%\.bun\bin\bun.exe`

---

*本文档对应分支 `fix/usage-incremental-tracking`，与上游 main 分支功能有差异。*
