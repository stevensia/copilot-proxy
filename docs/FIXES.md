# Copilot Proxy — 自定义修复与配置记录

本文档记录我们在 `fix/usage-incremental-tracking` 分支上的所有修复，方便同步到其他机器。

---

## 修复 1: Bun.serve idleTimeout (连接中断)

### 问题
Bun 默认 `idleTimeout = 10s`，当 LLM 流式响应中有较长的思考间隔（>10s 无数据发送），Bun 直接断开连接：
```
[Bun.serve]: request timed out after 10 seconds. Pass `idleTimeout` to configure.
```
导致 OpenClaw 端收到 `error=terminated`，任务反复重试直到超时。

### 修复
`src/start.ts` — srvx serve 配置加入 Bun 专用参数：
```ts
serve({
  fetch: server.fetch as ServerHandler,
  port: options.port,
  bun: {
    idleTimeout: 255, // Bun 最大允许值（秒）
  },
})
```

### 影响评估
- **原因**: Bun 运行时特有问题，Node.js 不受影响
- **上游**: srvx 库没有暴露 `idleTimeout` 配置，但支持 `bun` 透传对象
- **建议**: ✅ **值得提交给上游 (Jerry)**。这是一个通用问题——任何使用 Bun 运行 copilot-proxy 的用户在长时间 LLM 请求时都会遇到。可以作为 PR 或 Issue 提交。

---

## 修复 2: fetch AbortSignal.timeout (上游请求超时)

### 问题
Bun 的 `fetch()` 没有使用 undici（跳过了 `initializeNodeHttpClient`），所以 `proxy.ts` 中配置的 15 分钟 headersTimeout/bodyTimeout **对 Bun 无效**。
Bun 的默认 fetch timeout 约 300s (5分钟)，长对话的 LLM 请求可能超时：
```
ERROR  Error occurred: The operation timed out.
--> POST /v1/chat/completions 500 290s
```

### 修复
`src/services/copilot/create-chat-completions.ts` 和 `src/services/copilot/create-responses.ts`：
```ts
const response = await fetch(`${copilotBaseUrl(state)}/...`, {
  method: 'POST',
  headers,
  body,
  signal: AbortSignal.timeout(10 * 60 * 1000), // 10 分钟
})
```

### 影响评估
- **原因**: Bun 运行时跳过了 undici 的超时配置（`proxy.ts` 第 96 行 `if (typeof Bun !== 'undefined') return`），fetch 走的是 Bun 内置实现
- **上游**: 原作者的 `proxy.ts` 已经为 Node 设置了 15min 超时，但明确跳过了 Bun。**这是上游的疏漏**——Bun 用户同样需要超时配置
- **建议**: ✅ **值得提交给上游**。这是 Bun 兼容性的 gap，原作者可能没意识到 Bun 的 fetch 不受 undici 配置影响。建议作为 Bug Report + Fix PR。

---

## 功能增强（仅我们分支）

以下是定制功能，不适合提交上游：

### Dashboard 用量追踪
- `src/lib/usage-db.ts` — SQLite 用量存储 + 成本估算
- `src/routes/dashboard-ui.ts` — 单文件 Dashboard UI（双主题、双图表）
- `src/routes/dashboard-handler.ts` — Dashboard API 路由

### 增量 Token 计算
- Claude `/v1/messages` 端点的 `prompt_tokens` 是累计值
- 使用 SQL 窗口函数 `LAG()` 计算增量
- 影响: `getStats()`, `getHourlyUsage()`, `getModelUsage()`

### 远程机器用量汇聚
- `hostname` 字段追踪数据来源机器
- `POST /dashboard/api/ingest` — 批量导入远程数据
- `X-Ingest-Key` 认证机制

---

## 新机器部署清单

在新机器上部署 copilot-proxy 时，确保以下配置：

1. **使用我们的分支**:
   ```bash
   git clone https://github.com/listeven_microsoft/copilot-proxy.git
   cd copilot-proxy
   git checkout fix/usage-incremental-tracking
   bun install && bun run build
   ```

2. **systemd 服务** (`/etc/systemd/system/copilot-proxy.service`):
   ```ini
   [Unit]
   Description=Copilot Proxy
   After=network.target

   [Service]
   Type=simple
   WorkingDirectory=/opt/copilot-proxy
   ExecStart=/home/azuser/.bun/bin/bun run dist/main.js start --port 4399 --account-type individual
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

3. **Dashboard 密码**: 首次访问 `http://localhost:4399/dashboard` 设置

4. **远程汇报** (可选): 配置 ingest key 后，使用 cron 定时上报:
   ```bash
   # 每小时同步用量到中心节点
   curl -X POST https://clawbot.listeven.net/dashboard/api/ingest \
     -H "X-Ingest-Key: YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d @/tmp/usage-export.json
   ```

---

*最后更新: 2026-03-20*
