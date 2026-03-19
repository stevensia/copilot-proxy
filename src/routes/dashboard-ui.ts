/**
 * Dashboard UI - Single-file HTML/CSS/JS
 * Clean, minimal design inspired by Linear/Vercel
 */

export function dashboardHtml(isAuthenticated: boolean, needsSetup: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Usage Dashboard</title>
  <style>
    :root {
      --bg: #0a0a0a;
      --bg-card: #141414;
      --bg-hover: #1a1a1a;
      --border: #262626;
      --text: #fafafa;
      --text-muted: #737373;
      --text-dim: #525252;
      --accent: #3b82f6;
      --accent-dim: #1d4ed8;
      --green: #22c55e;
      --amber: #f59e0b;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    
    .container { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
    
    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .logo {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      letter-spacing: -0.01em;
    }
    .header-actions { display: flex; gap: 8px; }
    
    /* Buttons */
    .btn {
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn:hover { background: var(--bg-hover); color: var(--text); border-color: #404040; }
    .btn.active { background: var(--text); color: var(--bg); border-color: var(--text); }
    
    /* Stats Grid */
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .stat-label { font-size: 12px; color: var(--text-dim); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 24px; font-weight: 600; color: var(--text); font-variant-numeric: tabular-nums; }
    .stat-sub { font-size: 11px; color: var(--text-dim); margin-top: 4px; }
    
    /* Time Filter */
    .filters { display: flex; gap: 6px; margin-bottom: 24px; }
    
    /* Sparkline */
    .sparkline-wrap {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .sparkline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .sparkline-title { font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
    .sparkline-value { font-size: 13px; color: var(--text-muted); }
    .sparkline { height: 48px; position: relative; }
    .sparkline svg { width: 100%; height: 100%; }
    .spark-line { fill: none; stroke: var(--accent); stroke-width: 1.5; }
    .spark-area { fill: var(--accent); opacity: 0.1; }
    .spark-dot { fill: var(--accent); opacity: 0; transition: opacity 0.15s; }
    .sparkline:hover .spark-dot { opacity: 1; }
    .spark-tooltip {
      position: absolute;
      background: var(--text);
      color: var(--bg);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
      white-space: nowrap;
    }
    .sparkline-labels { display: flex; justify-content: space-between; margin-top: 8px; }
    .sparkline-labels span { font-size: 11px; color: var(--text-dim); }
    
    /* Tables */
    .section { margin-bottom: 24px; }
    .section-title { font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .table-wrap {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    th { 
      text-align: left; 
      padding: 10px 16px; 
      font-size: 11px; 
      font-weight: 500;
      color: var(--text-dim); 
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }
    td { 
      padding: 10px 16px; 
      font-size: 13px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--bg-hover); }
    .text-right { text-align: right; }
    .mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
    
    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }
    .badge-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .badge-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .badge-gray { background: rgba(115, 115, 115, 0.15); color: #a3a3a3; }
    
    /* Model dot */
    .dot { 
      display: inline-block; 
      width: 6px; 
      height: 6px; 
      border-radius: 50%; 
      margin-right: 8px;
    }
    
    /* Two columns */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    
    /* Login */
    .login-wrap {
      max-width: 320px;
      margin: 120px auto;
    }
    .login-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 32px;
    }
    .login-title { font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 24px; }
    .form-input {
      width: 100%;
      padding: 10px 12px;
      font-size: 14px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      margin-bottom: 16px;
    }
    .form-input:focus { outline: none; border-color: var(--accent); }
    .form-input::placeholder { color: var(--text-dim); }
    .btn-submit {
      width: 100%;
      padding: 10px;
      font-size: 14px;
      font-weight: 500;
      background: var(--text);
      color: var(--bg);
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-submit:hover { opacity: 0.9; }
    .error-msg { color: #ef4444; font-size: 13px; text-align: center; margin-top: 12px; }
    
    /* Responsive */
    @media (max-width: 640px) {
      .stats { grid-template-columns: repeat(2, 1fr); }
      .grid-2 { grid-template-columns: 1fr; }
      .stat-value { font-size: 20px; }
      .container { padding: 16px 12px; }
    }
  </style>
</head>
<body>
  <div class="container" id="app">
    <div style="text-align:center;padding:60px;color:var(--text-dim)">Loading...</div>
  </div>

  <script>
    const state = {
      authenticated: ${isAuthenticated},
      needsSetup: ${needsSetup},
      hours: 24,
      stats: null,
      today: null,
      hourly: [],
      daily: [],
      models: [],
      sources: [],
      recent: [],
    };

    const COLORS = {
      'claude-opus-4.5': '#a855f7',
      'claude-opus-4.6': '#8b5cf6',
      'claude-sonnet-4.5': '#6366f1',
      'gpt-5.1': '#22c55e',
      'gpt-5.1-codex': '#10b981',
    };
    
    function getColor(model) {
      return COLORS[model] || '#737373';
    }

    function fmt(n) {
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return n.toString();
    }

    async function api(endpoint) {
      const res = await fetch('/dashboard/api/' + endpoint, { credentials: 'include' });
      if (res.status === 401) { state.authenticated = false; render(); throw new Error('Unauthorized'); }
      return res.json();
    }

    async function loadData() {
      try {
        const [statsRes, hourly, daily, models, sources, recent] = await Promise.all([
          api('stats?hours=' + state.hours),
          api('hourly?hours=' + state.hours),
          api('daily?hours=' + state.hours),
          api('models?hours=' + state.hours),
          api('sources?hours=' + state.hours),
          api('recent?limit=15'),
        ]);
        Object.assign(state, { stats: statsRes.stats, today: statsRes.today, hourly, daily, models, sources, recent });
        render();
      } catch (e) { console.error(e); }
    }

    function renderSparkline() {
      const data = state.hourly;
      if (!data.length) return '<div style="color:var(--text-dim);padding:20px">No data</div>';
      
      const max = Math.max(...data.map(d => d.tokens), 1);
      const w = 100, h = 100, pad = 2;
      const pts = data.map((d, i) => ({
        x: pad + (i / (data.length - 1 || 1)) * (w - pad * 2),
        y: h - pad - (d.tokens / max) * (h - pad * 2),
        d
      }));
      
      const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join(' ');
      const area = line + ' L' + pts[pts.length-1].x + ',' + (h-pad) + ' L' + pts[0].x + ',' + (h-pad) + ' Z';
      const total = data.reduce((s, d) => s + d.tokens, 0);
      
      return \`
        <div class="sparkline-wrap">
          <div class="sparkline-header">
            <span class="sparkline-title">Hourly output</span>
            <span class="sparkline-value">\${fmt(total)} tokens</span>
          </div>
          <div class="sparkline" id="spark">
            <svg viewBox="0 0 \${w} \${h}" preserveAspectRatio="none">
              <path class="spark-area" d="\${area}"/>
              <path class="spark-line" d="\${line}"/>
              \${pts.map((p, i) => \`<circle class="spark-dot" cx="\${p.x}" cy="\${p.y}" r="3" data-i="\${i}"/>\`).join('')}
            </svg>
            <div class="spark-tooltip" id="sparkTip"></div>
          </div>
          <div class="sparkline-labels">
            <span>\${data[0]?.hour?.slice(11,16) || ''}</span>
            <span>\${data[data.length-1]?.hour?.slice(11,16) || ''}</span>
          </div>
        </div>
      \`;
    }

    function renderDashboard() {
      const s = state.stats || {};
      const t = state.today || {};
      
      return \`
        <header>
          <div class="logo">Copilot Proxy</div>
          <div class="header-actions">
            <button class="btn" onclick="loadData()">Refresh</button>
            <button class="btn" onclick="exportCsv()">Export</button>
            <button class="btn" onclick="logout()">Logout</button>
          </div>
        </header>
        
        <div class="filters">
          \${[1, 6, 24, 168, 0].map(h => \`
            <button class="btn \${state.hours === h ? 'active' : ''}" onclick="setHours(\${h})">
              \${h === 0 ? 'All' : h === 168 ? '7d' : h + 'h'}
            </button>
          \`).join('')}
        </div>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-label">Calls</div>
            <div class="stat-value">\${fmt(s.total_calls || 0)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Output</div>
            <div class="stat-value">\${fmt(s.total_completion_tokens || 0)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Input</div>
            <div class="stat-value">\${fmt(s.total_prompt_tokens || 0)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Today</div>
            <div class="stat-value">\${fmt(t.total_calls || 0)}</div>
            <div class="stat-sub">\${fmt(t.total_completion_tokens || 0)} output</div>
          </div>
        </div>
        
        \${renderSparkline()}
        
        <div class="grid-2">
          <div class="section">
            <div class="section-title">By Source</div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Source</th><th class="text-right">Calls</th><th class="text-right">Output</th></tr></thead>
                <tbody>
                  \${state.sources.map(s => \`
                    <tr>
                      <td><span class="badge \${s.source === 'Claude Code' ? 'badge-amber' : s.source === 'OpenClaw' ? 'badge-blue' : 'badge-gray'}">\${s.source}</span></td>
                      <td class="text-right mono">\${fmt(s.calls)}</td>
                      <td class="text-right mono">\${fmt(s.tokens)}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">By Model</div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Model</th><th class="text-right">Calls</th><th class="text-right">Output</th></tr></thead>
                <tbody>
                  \${state.models.map(m => \`
                    <tr>
                      <td><span class="dot" style="background:\${getColor(m.model)}"></span>\${m.model}</td>
                      <td class="text-right mono">\${fmt(m.calls)}</td>
                      <td class="text-right mono">\${fmt(m.tokens)}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Recent</div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Source</th>
                  <th>Model</th>
                  <th class="text-right">In</th>
                  <th class="text-right">Out</th>
                  <th class="text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                \${state.recent.map(r => \`
                  <tr>
                    <td class="mono" style="color:var(--text-dim)">\${r.timestamp?.slice(11,16) || ''}</td>
                    <td><span class="badge \${r.source === 'Claude Code' ? 'badge-amber' : r.source === 'OpenClaw' ? 'badge-blue' : 'badge-gray'}">\${r.source || '-'}</span></td>
                    <td><span class="dot" style="background:\${getColor(r.model)}"></span>\${r.model}</td>
                    <td class="text-right mono">\${fmt(r.prompt_tokens)}</td>
                    <td class="text-right mono">\${fmt(r.completion_tokens)}</td>
                    <td class="text-right mono" style="color:var(--text-dim)">\${r.duration_ms ? (r.duration_ms/1000).toFixed(1) + 's' : '-'}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      \`;
    }

    function renderLogin() {
      return \`
        <div class="login-wrap">
          <div class="login-card">
            <div class="login-title">\${state.needsSetup ? 'Set Password' : 'Login'}</div>
            <form id="loginForm">
              <input type="password" class="form-input" id="password" placeholder="\${state.needsSetup ? 'Choose a password' : 'Password'}" autocomplete="current-password">
              \${state.needsSetup ? '<input type="password" class="form-input" id="confirmPassword" placeholder="Confirm password">' : ''}
              <button type="submit" class="btn-submit">\${state.needsSetup ? 'Set Password' : 'Login'}</button>
              <div id="loginError" class="error-msg"></div>
            </form>
          </div>
        </div>
      \`;
    }

    function render() {
      const app = document.getElementById('app');
      app.innerHTML = state.authenticated ? renderDashboard() : renderLogin();
      if (state.authenticated) setupSparkTooltip();
      else setupLoginForm();
    }

    function setupSparkTooltip() {
      const spark = document.getElementById('spark');
      const tip = document.getElementById('sparkTip');
      if (!spark || !tip) return;
      
      spark.querySelectorAll('.spark-dot').forEach(dot => {
        dot.addEventListener('mouseenter', e => {
          const i = parseInt(e.target.dataset.i);
          const d = state.hourly[i];
          if (!d) return;
          tip.textContent = d.hour?.slice(11,16) + ': ' + fmt(d.tokens);
          tip.style.opacity = '1';
          const rect = e.target.getBoundingClientRect();
          const sparkRect = spark.getBoundingClientRect();
          tip.style.left = (rect.left - sparkRect.left) + 'px';
          tip.style.top = (rect.top - sparkRect.top - 24) + 'px';
        });
        dot.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
      });
    }

    function setupLoginForm() {
      const form = document.getElementById('loginForm');
      if (!form) return;
      
      form.onsubmit = async (e) => {
        e.preventDefault();
        const pw = document.getElementById('password').value;
        const err = document.getElementById('loginError');
        
        if (state.needsSetup) {
          const confirm = document.getElementById('confirmPassword').value;
          if (pw !== confirm) { err.textContent = 'Passwords do not match'; return; }
          if (pw.length < 4) { err.textContent = 'Password too short'; return; }
        }
        
        try {
          const res = await fetch('/dashboard/api/' + (state.needsSetup ? 'setup' : 'login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw }),
            credentials: 'include'
          });
          const data = await res.json();
          if (data.success) { state.authenticated = true; state.needsSetup = false; loadData(); }
          else err.textContent = data.error || 'Login failed';
        } catch (e) { err.textContent = 'Network error'; }
      };
    }

    function setHours(h) { state.hours = h; loadData(); }
    
    async function logout() {
      await fetch('/dashboard/api/logout', { method: 'POST', credentials: 'include' });
      state.authenticated = false;
      render();
    }
    
    async function exportCsv() {
      window.open('/dashboard/api/export?hours=' + state.hours, '_blank');
    }

    if (state.authenticated) loadData();
    else render();
  </script>
</body>
</html>`;
}
