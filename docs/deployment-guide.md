# Copilot Proxy 部署与使用指南

> 分支: `fix/usage-incremental-tracking`
> 最后更新: 2026-03-21

本文档是该分支的完整操作手册，涵盖安装、部署、Dashboard 使用、多机同步配置。

---

## 目录

- [快速开始](#快速开始)
- [安装方式](#安装方式)
- [systemd 服务部署](#systemd-服务部署)
- [Dashboard 使用](#dashboard-使用)
- [多机用量同步](#多机用量同步)
- [分支专有修复](#分支专有修复)
- [数据与备份](#数据与备份)
- [常见问题](#常见问题)
- [API 参考](#api-参考)

---

## 快速开始

```bash
# 1. 克隆并构建
git clone https://github.com/listeven_microsoft/copilot-proxy.git
cd copilot-proxy
git checkout fix/usage-incremental-tracking
bun install && bun run build

# 2. 启动（前台）
bun run dist/main.js start --port 4399

# 3. 打开 Dashboard
# 浏览器访问 http://localhost:4399/dashboard
# 首次访问需设置密码
```

---

## 安装方式

### 方式 A: 从源码安装（推荐，本分支）

```bash
git clone https://github.com/listeven_microsoft/copilot-proxy.git /opt/copilot-proxy
cd /opt/copilot-proxy
git checkout fix/usage-incremental-tracking
bun install && bun run build
```

### 方式 B: npm 全局安装（上游原版，不含本分支功能）

```bash
npm i -g @jer-y/copilot-proxy
copilot-proxy start
```

### 方式 C: Docker

```bash
docker build -t copilot-proxy .
docker run -p 4399:4399 -v $(pwd)/copilot-data:/root/.local/share/copilot-proxy copilot-proxy
```

### 前置依赖

- **Bun** >= 1.2.x (`curl -fsSL https://bun.sh/install | bash`)
- GitHub 账号 + Copilot 订阅

---

## systemd 服务部署

### 1. 创建服务文件

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

> **注意**: `ExecStart` 中的 bun 路径和 `WorkingDirectory` 需根据实际安装位置调整。

### 2. 启用并启动

```bash
systemctl daemon-reload
systemctl enable copilot-proxy
systemctl start copilot-proxy
```

### 3. 常用管理命令

| 操作 | 命令 |
|------|------|
| 启动 | `systemctl start copilot-proxy` |
| 停止 | `systemctl stop copilot-proxy` |
| 重启 | `systemctl restart copilot-proxy` |
| 查看状态 | `systemctl status copilot-proxy` |
| 查看日志 | `journalctl -u copilot-proxy -f` |

### 4. 内置 daemon 命令（替代 systemd）

CLI 自带守护进程管理，适合不使用 systemd 的场景：

```bash
copilot-proxy start -d          # 后台启动
copilot-proxy stop              # 停止
copilot-proxy restart            # 重启
copilot-proxy status             # 查看状态
copilot-proxy logs -f            # 实时日志
copilot-proxy enable             # 注册开机自启（自动检测 OS）
copilot-proxy disable            # 移除开机自启
```

---

## Dashboard 使用

### 访问地址

```
http://<服务器IP>:4399/dashboard
```

### 首次配置

1. 打开 Dashboard，系统提示设置密码（最少 4 位）
2. 设置后自动登录，即可看到用量数据
3. **所有配置均可在网页端完成**，无需编辑配置文件

### 功能概览

| 功能 | 说明 |
|------|------|
| 实时统计 | Token 用量、调用次数、成本估算 |
| 时间过滤 | 1h / 6h / 24h / 7d / 全部 |
| 分维度查看 | 按模型、按来源（Claude Code / OpenClaw 等） |
| 小时图表 | 柱状图展示 Input/Output Token 趋势 |
| 活动记录 | `/dashboard/activity` 完整调用历史，分页浏览 |
| CSV 导出 | 一键导出当前时间段数据 |
| ⚙️ Settings | 同步配置（见下一节） |
| 主题切换 | 浅色 / 深色 双主题 |

### 密码重置

```bash
# 方法 1: 仅清除密码（保留数据）
sqlite3 ~/.copilot-proxy/usage.db "DELETE FROM auth_config WHERE key='password_hash';"

# 方法 2: 删除整个数据库（丢失历史）
rm ~/.copilot-proxy/usage.db

# 然后重启服务
systemctl restart copilot-proxy
```

### 安全机制

- 密码 bcrypt 加密存储
- Session 有效期 24 小时（HTTP-only Cookie）
- 连续 5 次登录失败锁定 15 分钟

### 外部访问（反向代理）

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

## 多机用量同步

本分支支持多台机器的用量数据自动汇聚到一台中心服务器。

### 架构

```
远程机器 A ──┐
远程机器 B ──┼── 定时推送 ──→ 中心服务器 Dashboard
远程机器 C ──┘                (汇总查看所有机器数据)
```

### 配对流程（全程网页操作）

#### 第 1 步：中心服务器 — 生成连接配置

1. 打开中心服务器 Dashboard → 点击 **⚙️ Settings**
2. 在「🖥️ Server Connection Info」区域：
   - 系统自动生成 Ingest Key（首次打开时生成）
   - 点击 **📋 Copy Connection Config**
   - 剪贴板获得：`{"url":"https://center.example.com","key":"abc123..."}`

#### 第 2 步：远程机器 — 粘贴并启用

1. 打开远程机器 Dashboard → 点击 **⚙️ Settings**
2. 在「📤 Client Sync Settings」区域：
   - 在「Paste Connection Config」框中粘贴上一步复制的 JSON
   - URL 和 Key 自动填入
   - 设置同步间隔（默认 5 分钟）
   - 打开 **Enabled** 开关
   - 点击 **💾 Save**
3. （可选）点击 **🔄 Sync Now** 立即手动同步一次，验证连通性

#### 状态监控

Settings 面板底部显示：
- ✅ 最后同步时间 + 同步条数
- ❌ 错误信息（网络不通、Key 错误等）

### 同步机制

- **增量同步**: 基于 `usage_log.id` 水位线，只推送新增记录
- **批量传输**: 每次最多 500 条，自动循环直到全部同步完
- **自动附加 hostname**: 每条记录标注来源机器名
- **断点续传**: 重启后从上次水位线继续
- **服务启动自动开始**: 如果之前配置了 enabled，重启后自动恢复定时同步

### 手动同步（无需网页）

```bash
# 也可通过 API 触发
curl -X POST http://localhost:4399/dashboard/api/sync-now \
  -H "Cookie: dashboard_session=YOUR_SESSION"
```

---

## 分支专有修复

以下修复仅存在于 `fix/usage-incremental-tracking` 分支：

### 修复 1: Bun.serve idleTimeout（流式响应断开）

**问题**: Bun 默认 `idleTimeout=10s`，LLM 思考时间超过 10 秒即断开连接。

**修复**: `src/start.ts` 设置 `bun.idleTimeout: 255`（Bun 最大值）。

### 修复 2: fetch 超时（Bun 环境）

**问题**: Bun 的 fetch 不使用 undici，默认超时约 5 分钟，长对话会超时。

**修复**: `create-chat-completions.ts` 和 `create-responses.ts` 加入 `AbortSignal.timeout(10 * 60 * 1000)`。

### 增强功能

| 功能 | 说明 |
|------|------|
| Dashboard UI | 双主题、图表、成本估算、活动记录 |
| 增量 Token 计算 | Claude `/v1/messages` 的 `prompt_tokens` 用 `LAG()` 窗口函数计算增量 |
| 远程用量汇聚 | hostname 追踪 + ingest API + 自动定时同步 |
| Settings 面板 | 网页端完成所有同步配置，一键复制粘贴配对 |

---

## 数据与备份

### 数据存储位置

| 文件 | 路径 | 说明 |
|------|------|------|
| SQLite 数据库 | `~/.copilot-proxy/usage.db` | 用量日志、认证、同步配置 |
| 自定义定价 | `~/.copilot-proxy/pricing.json` | 可选，覆盖默认模型价格 |
| Daemon 日志 | `~/.copilot-proxy/daemon.log` | daemon 模式日志 |

### 备份与恢复

```bash
# 备份
cp ~/.copilot-proxy/usage.db ~/backups/usage-$(date +%Y%m%d).db

# 恢复
cp ~/backups/usage-20260321.db ~/.copilot-proxy/usage.db
systemctl restart copilot-proxy
```

### 自定义定价

创建 `~/.copilot-proxy/pricing.json`：

```json
{
  "gpt-5": { "input": 6.00, "output": 24.00 },
  "claude-opus-4.6": { "input": 18.00, "output": 90.00 }
}
```

保存后立即生效，无需重启。

---

## 常见问题

### 网页端能完成所有配置吗？

**是的。** Dashboard 密码设置、同步配对、启停同步、手动触发同步均可在网页完成。唯一需要命令行的是：
- 首次安装和构建
- systemd 服务创建
- 服务重启（`systemctl restart copilot-proxy`）

### 网页端能重启服务吗？

**不能。** 服务重启需要通过 `systemctl restart copilot-proxy` 命令。但修改同步配置后保存会自动重载同步定时器，不需要重启服务。

### 有一键安装脚本吗？

目前没有。安装步骤为：

```bash
git clone https://github.com/listeven_microsoft/copilot-proxy.git /opt/copilot-proxy
cd /opt/copilot-proxy && git checkout fix/usage-incremental-tracking
bun install && bun run build
# 然后手动创建 systemd 服务文件（参考上文）
```

### Dashboard 显示 "Loading..." 不动

- 确认服务运行中: `systemctl status copilot-proxy`
- 检查端口: `curl http://localhost:4399/`
- 查看浏览器控制台错误

### 成本显示 $0.00

- 确认有请求经过代理
- 未知模型使用默认价格 ($2/$8 per 1M tokens)
- 可通过 `pricing.json` 自定义

### 同步失败

- 检查 Settings 面板底部的错误信息
- 确认中心服务器可达: `curl https://center.example.com/dashboard/api/status`
- 确认 Ingest Key 正确
- 点击 Sync Now 手动测试

---

## API 参考

### 代理端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `POST /v1/chat/completions` | POST | OpenAI Chat 格式 |
| `POST /v1/messages` | POST | Anthropic Messages 格式 |
| `POST /v1/responses` | POST | OpenAI Responses 格式 |
| `GET /v1/models` | GET | 可用模型列表 |
| `POST /v1/embeddings` | POST | 文本 embedding |

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

*本文档对应分支 `fix/usage-incremental-tracking`，与上游 main 分支功能有差异。*
