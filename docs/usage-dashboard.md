# Usage Dashboard & Cost Tracking

A built-in web dashboard for monitoring your Copilot API usage, viewing statistics, and estimating costs.

## Quick Start

1. **Start the proxy**:
   ```bash
   copilot-proxy start --port 4399
   ```

2. **Open dashboard**:
   Visit `http://localhost:4399/dashboard`

3. **First-time setup**:
   Set a password on first visit. This protects your usage data.

## Features

### Real-time Statistics
- **Total Calls**: Number of API requests in the selected time period
- **Output Tokens**: Completion tokens generated
- **Estimated Cost**: Cost calculation based on model pricing
- **Today's Stats**: Current day's usage summary

### Usage Breakdown
- **By Source**: Distinguish between Claude Code, OpenClaw, curl, etc.
- **By Model**: Token usage and cost per model
- **Recent Activity**: Last requests with timing and cost details

### Time Filters
- 1 hour / 6 hours / 24 hours / 7 days / All time

### Export
- Download usage data as CSV for external analysis

## Cost Estimation

### How It Works

The dashboard estimates costs based on public API pricing from:
- **OpenAI**: https://openai.com/api/pricing/
- **Anthropic**: https://www.anthropic.com/pricing  
- **Google**: https://ai.google.dev/pricing

**Note**: This is for reference only. GitHub Copilot subscription includes API access, so your actual billing depends on your subscription tier, not per-token charges.

### Default Pricing (USD per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| gpt-4o | $2.50 | $10.00 |
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-5 / gpt-5.1 / gpt-5.2 | $5.00 | $20.00 |
| gpt-5-mini | $0.80 | $3.20 |
| claude-sonnet-4.x | $3.00 | $15.00 |
| claude-opus-4.x | $15.00 | $75.00 |
| claude-haiku-4.5 | $0.80 | $4.00 |
| gemini-2.5-pro | $1.25 | $5.00 |

### Custom Pricing

Override default prices by creating `~/.copilot-proxy/pricing.json`:

```json
{
  "gpt-5": { "input": 6.00, "output": 24.00 },
  "claude-opus-4.6": { "input": 18.00, "output": 90.00 },
  "my-custom-model": { "input": 1.00, "output": 4.00 }
}
```

Changes take effect immediately after saving. Custom prices merge with defaults (your values override).

## Deployment

### Linux (systemd)

1. **Create service file** `/etc/systemd/system/copilot-proxy.service`:

```ini
[Unit]
Description=GitHub Copilot Proxy
After=network.target

[Service]
Type=simple
User=your-username
Environment="PATH=/home/your-username/.bun/bin:/usr/local/bin:/usr/bin:/bin"
WorkingDirectory=/usr/lib/node_modules/@jer-y/copilot-proxy
ExecStart=/home/your-username/.bun/bin/bun run dist/main.js start --port 4399 --account-type individual
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

2. **Enable and start**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable copilot-proxy
sudo systemctl start copilot-proxy
```

3. **Check status**:
```bash
sudo systemctl status copilot-proxy
sudo journalctl -u copilot-proxy -f  # View logs
```

### macOS (launchd)

1. **Create plist** `~/Library/LaunchAgents/com.copilot-proxy.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.copilot-proxy</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/your-username/.bun/bin/bun</string>
        <string>run</string>
        <string>/usr/local/lib/node_modules/@jer-y/copilot-proxy/dist/main.js</string>
        <string>start</string>
        <string>--port</string>
        <string>4399</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/copilot-proxy.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/copilot-proxy.err</string>
</dict>
</plist>
```

2. **Load service**:
```bash
launchctl load ~/Library/LaunchAgents/com.copilot-proxy.plist
```

3. **Manage**:
```bash
launchctl start com.copilot-proxy
launchctl stop com.copilot-proxy
launchctl unload ~/Library/LaunchAgents/com.copilot-proxy.plist  # Disable
```

### Windows (Task Scheduler)

1. **Create batch file** `C:\copilot-proxy\start.bat`:
```batch
@echo off
cd /d C:\Users\your-username\.bun\bin
bun run C:\Users\your-username\AppData\Roaming\npm\node_modules\@jer-y\copilot-proxy\dist\main.js start --port 4399
```

2. **Create scheduled task** (run as Administrator):
```powershell
$action = New-ScheduledTaskAction -Execute "C:\copilot-proxy\start.bat"
$trigger = New-ScheduledTaskTrigger -AtLogon
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName "CopilotProxy" -Action $action -Trigger $trigger -Principal $principal -Settings $settings
```

3. **Manage**:
```powershell
Start-ScheduledTask -TaskName "CopilotProxy"
Stop-ScheduledTask -TaskName "CopilotProxy"
Unregister-ScheduledTask -TaskName "CopilotProxy" -Confirm:$false  # Remove
```

### Built-in Auto-Start Commands

The CLI has built-in auto-start management:

```bash
# Enable auto-start (detects OS automatically)
copilot-proxy enable

# Disable auto-start
copilot-proxy disable

# Start as daemon
copilot-proxy start -d

# View daemon logs
copilot-proxy logs

# Check status
copilot-proxy status
```

## Dashboard Access Control

### Password Protection

The dashboard requires a password. Set it on first visit.

**Password requirements**:
- Minimum 6 characters
- Stored securely (bcrypt hashed) in `~/.copilot-proxy/usage.db`

### Reset Password

If you forget your password:

```bash
# Method 1: Delete the auth config (will prompt for new password)
sqlite3 ~/.copilot-proxy/usage.db "DELETE FROM auth_config WHERE key='password_hash';"

# Method 2: Delete the entire database (loses usage history)
rm ~/.copilot-proxy/usage.db

# Then restart the proxy and visit /dashboard to set a new password
```

### Session Management

- Sessions last 24 hours
- HTTP-only cookies (secure against XSS)
- Automatic lockout after 5 failed login attempts (15 minutes)

### External Access

To expose the dashboard externally (e.g., via reverse proxy):

1. **Nginx example**:
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
        
        # For SSE streaming
        proxy_buffering off;
        proxy_cache off;
    }
}
```

2. **Caddy example**:
```caddyfile
copilot.example.com {
    reverse_proxy localhost:4399
}
```

**Security recommendations**:
- Always use HTTPS for external access
- Consider IP whitelisting or VPN
- Use a strong dashboard password

## Data Storage

All data is stored in `~/.copilot-proxy/`:

| File | Purpose |
|------|---------|
| `usage.db` | SQLite database with usage logs and auth |
| `pricing.json` | Custom pricing overrides (optional) |
| `daemon.log` | Daemon mode logs |

### Backup

```bash
# Backup usage data
cp ~/.copilot-proxy/usage.db ~/backups/usage-$(date +%Y%m%d).db

# Restore
cp ~/backups/usage-20240319.db ~/.copilot-proxy/usage.db
```

## API Endpoints

The dashboard exposes JSON APIs for programmatic access:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dashboard/api/status` | GET | Auth status, lockout info |
| `/dashboard/api/stats?hours=24` | GET | Usage statistics |
| `/dashboard/api/models?hours=24` | GET | Usage by model |
| `/dashboard/api/sources?hours=24` | GET | Usage by source |
| `/dashboard/api/recent?limit=50` | GET | Recent requests |
| `/dashboard/api/hourly?hours=24` | GET | Hourly breakdown |
| `/dashboard/api/export?hours=0` | GET | CSV export |
| `/dashboard/api/pricing` | GET | Current pricing config |
| `/dashboard/api/pricing` | POST | Update custom pricing |

All endpoints except `/status` require authentication (session cookie).

## Troubleshooting

### Dashboard shows "Loading..."
- Check if proxy is running: `curl http://localhost:4399/`
- Check browser console for errors

### Cost shows $0.00
- Ensure requests have been made through the proxy
- Check if the model is in the pricing config
- Unknown models use default pricing ($2.00 input / $8.00 output per 1M tokens)

### Login fails repeatedly
- Wait 15 minutes if locked out
- Reset password (see above)
- Check if cookies are enabled in browser

### Data not persisting
- Check `~/.copilot-proxy/` directory permissions
- Ensure SQLite can write to the directory

### Windows: Bun not found
- Ensure Bun is installed: `bun --version`
- Add Bun to PATH or use full path in scheduled task
