/**
 * Dashboard UI - Single-file HTML/CSS/JS
 * Light (Azure Blue) / Dark theme toggle
 */

export function dashboardHtml(isAuthenticated: boolean, needsSetup: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Usage Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      transition: background 0.2s ease, color 0.2s ease;
    }
    
    /* Light Theme (Azure Blue Tint) */
    body.theme-light {
      --bg: #f0f4f8;
      --bg-card: #ffffff;
      --bg-hover: #e8eef4;
      --border: #cdd7e1;
      --text: #0d2137;
      --text-muted: #4a5568;
      --text-dim: #8696a7;
      --accent: #0078d4;
      --accent-hover: #106ebe;
      --green: #107c10;
      --amber: #ca5010;
      --shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    
    /* Dark Theme (Slate) */
    body.theme-dark {
      --bg: #0f172a;
      --bg-card: #1e293b;
      --bg-hover: #334155;
      --border: #334155;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --accent: #38bdf8;
      --accent-hover: #7dd3fc;
      --green: #4ade80;
      --amber: #fbbf24;
      --shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    
    body { background: var(--bg); color: var(--text); }
    
    .container { max-width: 900px; margin: 0 auto; padding: 24px 20px; }
    
    /* Theme Toggle */
    .theme-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: var(--shadow);
      transition: all 0.15s ease;
      z-index: 100;
    }
    .theme-toggle:hover { background: var(--bg-hover); color: var(--text); }
    
    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .logo { font-size: 15px; font-weight: 600; color: var(--text); }
    .header-actions { display: flex; gap: 8px; }
    
    /* Buttons */
    .btn {
      padding: 7px 14px;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg-card);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn:hover { background: var(--bg-hover); color: var(--text); }
    .btn.active { background: var(--accent); color: white; border-color: var(--accent); }
    
    /* Stats Grid */
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
    .stat {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px;
      box-shadow: var(--shadow);
    }
    .stat-label { font-size: 12px; color: var(--text-dim); margin-bottom: 6px; font-weight: 500; }
    .stat-value { font-size: 26px; font-weight: 600; color: var(--text); font-variant-numeric: tabular-nums; }
    .stat-sub { font-size: 12px; color: var(--text-dim); margin-top: 4px; }
    
    /* Time Filter */
    .filters { display: flex; gap: 6px; margin-bottom: 24px; }
    
    /* Bar Chart */
    .chart-wrap {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
    }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .chart-title { font-size: 13px; color: var(--text-muted); font-weight: 500; }
    .chart-value { font-size: 13px; color: var(--text-dim); }
    .chart-bars { display: flex; align-items: flex-end; gap: 2px; height: 100px; position: relative; }
    .chart-bar {
      flex: 1; display: flex; flex-direction: column; justify-content: flex-end;
      min-width: 0; height: 100%; position: relative; cursor: pointer;
    }
    .bar-seg-out { background: var(--accent); border-radius: 3px 3px 0 0; min-height: 0; transition: opacity 0.15s; }
    .bar-seg-in { background: var(--amber); min-height: 0; transition: opacity 0.15s; }
    .chart-bar:first-child .bar-seg-in { border-radius: 0 0 3px 3px; }
    .bar-seg-in { border-radius: 0 0 3px 3px; }
    .chart-bar:hover .bar-seg-out, .chart-bar:hover .bar-seg-in { opacity: 0.8; }
    .chart-labels { display: flex; justify-content: space-between; margin-top: 8px; }
    .chart-labels span { font-size: 11px; color: var(--text-dim); }
    .chart-legend { display: flex; gap: 16px; align-items: center; margin-top: 10px; }
    .chart-legend-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-dim); }
    .chart-legend-dot { width: 8px; height: 8px; border-radius: 2px; }
    .chart-tooltip {
      position: absolute; top: -36px; left: 50%; transform: translateX(-50%);
      background: var(--text); color: var(--bg-card);
      padding: 4px 8px; border-radius: 5px;
      font-size: 11px; font-weight: 500;
      pointer-events: none; opacity: 0; transition: opacity 0.15s;
      white-space: nowrap; z-index: 10;
    }
    .chart-bar:hover .chart-tooltip { opacity: 1; }
    
    /* Tables */
    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; color: var(--text-muted); font-weight: 600; margin-bottom: 12px; }
    .table-wrap {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      box-shadow: var(--shadow);
    }
    table { width: 100%; border-collapse: collapse; min-width: 480px; }
    th { 
      text-align: left; 
      padding: 12px 16px; 
      font-size: 12px; 
      font-weight: 600;
      color: var(--text-dim);
      background: var(--bg-hover);
      border-bottom: 1px solid var(--border);
    }
    td { 
      padding: 11px 16px; 
      font-size: 13px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--bg-hover); }
    .text-right { text-align: right; }
    .mono { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 12px; }
    
    /* Badges */
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-accent { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); }
    .badge-amber { background: color-mix(in srgb, var(--amber) 15%, transparent); color: var(--amber); }
    .badge-gray { background: var(--bg-hover); color: var(--text-dim); }
    
    /* Model dot */
    .dot { 
      display: inline-block; 
      width: 8px; 
      height: 8px; 
      border-radius: 50%; 
      margin-right: 8px;
    }
    
    /* Two columns */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    
    /* Login */
    .login-wrap { max-width: 340px; margin: 100px auto; }
    .login-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 36px;
      box-shadow: var(--shadow);
    }
    .login-title { font-size: 18px; font-weight: 600; text-align: center; margin-bottom: 28px; color: var(--text); }
    .form-input {
      width: 100%;
      padding: 11px 14px;
      font-size: 14px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      margin-bottom: 14px;
    }
    .form-input:focus { outline: none; border-color: var(--accent); }
    .form-input::placeholder { color: var(--text-dim); }
    .btn-submit {
      width: 100%;
      padding: 11px;
      font-size: 14px;
      font-weight: 600;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn-submit:hover { background: var(--accent-hover); }
    .error-msg { color: #dc2626; font-size: 13px; text-align: center; margin-top: 14px; }
    
    /* Responsive */
    @media (max-width: 640px) {
      .stats { grid-template-columns: repeat(2, 1fr); }
      .grid-2 { grid-template-columns: 1fr; }
      .stat-value { font-size: 22px; }
      .container { padding: 16px 14px; }
      .theme-toggle { top: 12px; right: 12px; width: 36px; height: 36px; font-size: 16px; }
    }
  </style>
</head>
<body class="theme-light">
  <button class="theme-toggle" id="themeToggle" title="Toggle theme">☀️</button>
  
  <div class="container" id="app">
    <div style="text-align:center;padding:60px;color:var(--text-dim)">Loading...</div>
  </div>

  <script>
    // Theme toggle
    function setTheme(dark) {
      document.body.className = dark ? 'theme-dark' : 'theme-light';
      document.getElementById('themeToggle').textContent = dark ? '🌙' : '☀️';
      localStorage.setItem('dashboard-theme', dark ? 'dark' : 'light');
    }
    
    document.getElementById('themeToggle').addEventListener('click', () => {
      setTheme(document.body.classList.contains('theme-light'));
    });
    
    // Load saved theme or use system preference
    const saved = localStorage.getItem('dashboard-theme');
    if (saved) {
      setTheme(saved === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme(true);
    }

    const state = {
      authenticated: ${isAuthenticated},
      needsSetup: ${needsSetup},
      hours: 24,
      stats: null,
      today: null,
      totalCost: 0,
      yesterdayCost: 0,
      periodDays: null,
      hourly: [],
      daily: [],
      models: [],
      sources: [],
      recent: [],
    };

    const COLORS = {
      'claude-opus-4.5': '#8b5cf6',
      'claude-opus-4.6': '#7c3aed',
      'claude-sonnet-4.5': '#6366f1',
      'gpt-5.1': '#10b981',
      'gpt-5.1-codex': '#059669',
    };
    
    function getColor(model) { return COLORS[model] || '#9ca3af'; }
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
          api('recent?limit=5'),
        ]);
        Object.assign(state, {
          stats: statsRes.stats,
          today: statsRes.today,
          totalCost: statsRes.totalCost,
          yesterdayCost: statsRes.yesterdayCost,
          periodDays: statsRes.periodDays,
          hourly, daily, models, sources, recent
        });
        render();
      } catch (e) { console.error(e); }
    }

    function renderSparkline() {
      const data = state.hourly;
      if (!data.length) return '<div style="color:var(--text-dim);padding:24px;text-align:center">No data available</div>';

      const inData = data.map(d => d.prompt_tokens || 0);
      const outData = data.map(d => d.completion_tokens || 0);
      const totalIn = inData.reduce((s, v) => s + v, 0);
      const totalOut = outData.reduce((s, v) => s + v, 0);
      const maxVal = Math.max(...data.map((d, i) => inData[i] + outData[i]), 1);

      // Pick ~6 labels evenly spaced
      const labelEvery = Math.max(1, Math.floor(data.length / 6));

      const bars = data.map((d, i) => {
        const inH = (inData[i] / maxVal) * 100;
        const outH = (outData[i] / maxVal) * 100;
        const hour = d.hour?.slice(11, 16) || '';
        return \`<div class="chart-bar">
          <div class="chart-tooltip">\${hour} · in: \${fmt(inData[i])} · out: \${fmt(outData[i])}</div>
          <div class="bar-seg-out" style="height:\${outH}%"></div>
          <div class="bar-seg-in" style="height:\${inH}%"></div>
        </div>\`;
      }).join('');

      const labels = data.map((d, i) => {
        if (i % labelEvery !== 0 && i !== data.length - 1) return '';
        return d.hour?.slice(11, 16) || '';
      });
      // Build label spans: show first, evenly-spaced, and last
      const labelHtml = labels.map(l => l ? \`<span>\${l}</span>\` : '<span></span>').join('');

      return \`
        <div class="chart-wrap">
          <div class="chart-header">
            <span class="chart-title">📊 Hourly Token Usage</span>
            <span class="chart-value">\${fmt(totalIn + totalOut)} total</span>
          </div>
          <div class="chart-bars">\${bars}</div>
          <div class="chart-labels">\${labelHtml}</div>
          <div class="chart-legend">
            <div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--amber)"></div>Input \${fmt(totalIn)}</div>
            <div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--accent)"></div>Output \${fmt(totalOut)}</div>
          </div>
        </div>
      \`;
    }

    function renderDashboard() {
      const s = state.stats || {};
      const t = state.today || {};
      const totalCost = state.totalCost || 0;
      const yesterdayCost = state.yesterdayCost || 0;
      const periodDays = state.periodDays || 1;

      function fmtCost(c) {
        if (c >= 1) return '$' + c.toFixed(2);
        if (c >= 0.01) return '$' + c.toFixed(3);
        return '$' + c.toFixed(4);
      }

      // Today vs yesterday percentage
      const todayCost = t.cost || 0;
      let todayDelta = '';
      if (yesterdayCost > 0) {
        const pct = ((todayCost - yesterdayCost) / yesterdayCost * 100).toFixed(0);
        const arrow = todayCost >= yesterdayCost ? '↑' : '↓';
        todayDelta = arrow + Math.abs(pct) + '% vs yesterday';
      } else if (todayCost > 0) {
        todayDelta = 'no data yesterday';
      }

      // Period avg
      const avgPerDay = periodDays > 0 ? totalCost / periodDays : totalCost;
      const periodLabel = state.hours > 0 ? periodDays + ' day' + (periodDays > 1 ? 's' : '') : 'all time';

      // Today calls + avg per hour
      const todayCalls = t.total_calls || 0;
      const nowHour = new Date().getHours() || 1;
      const avgPerHr = Math.round(todayCalls / nowHour);

      // Tokens
      const totalTokens = (s.total_prompt_tokens || 0) + (s.total_completion_tokens || 0);

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
            <div class="stat-label">⚡ Tokens Used</div>
            <div class="stat-value">\${fmt(totalTokens)}</div>
            <div class="stat-sub">\${fmt(s.total_prompt_tokens || 0)} in · \${fmt(s.total_completion_tokens || 0)} out</div>
          </div>
          <div class="stat">
            <div class="stat-label">📞 Total Calls</div>
            <div class="stat-value">\${fmt(s.total_calls || 0)}</div>
            <div class="stat-sub">\${fmt(todayCalls)} today · avg \${fmt(avgPerHr)}/hr</div>
          </div>
          <div class="stat">
            <div class="stat-label">📊 Period Cost</div>
            <div class="stat-value">\${fmtCost(totalCost)}</div>
            <div class="stat-sub">avg \${fmtCost(avgPerDay)}/day · \${periodLabel}</div>
          </div>
          <div class="stat">
            <div class="stat-label">💰 Today's Cost</div>
            <div class="stat-value">\${fmtCost(todayCost)}</div>
            <div class="stat-sub">\${todayDelta}\${todayDelta ? ' · ' : ''}\${fmt(todayCalls)} calls</div>
          </div>
        </div>

        \${renderSparkline()}

        <div class="section">
          <div class="section-title">By Source · By Model</div>
          <div class="table-wrap">
            <div style="display:flex;flex-direction:column;min-width:max-content">
              <table>
                <thead><tr><th>Source</th><th class="text-right">Calls</th><th class="text-right">Tokens (in/out)</th><th class="text-right">Cost</th></tr></thead>
                <tbody>
                  \${state.sources.map(s => \`
                    <tr>
                      <td><span class="badge \${s.source === 'Claude Code' ? 'badge-amber' : s.source === 'OpenClaw' ? 'badge-accent' : 'badge-gray'}">\${s.source}</span></td>
                      <td class="text-right mono">\${fmt(s.calls)}</td>
                      <td class="text-right mono">\${fmt(s.prompt_tokens || 0)} / \${fmt(s.completion_tokens || 0)}</td>
                      <td class="text-right mono" style="color:var(--green)">\${fmtCost(s.cost || 0)}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
              <div style="height:1px;background:var(--border);margin:8px 0"></div>
              <table>
                <thead><tr><th>Model</th><th class="text-right">Calls</th><th class="text-right">Tokens (in/out)</th><th class="text-right">Cost</th></tr></thead>
                <tbody>
                  \${state.models.map(m => \`
                    <tr>
                      <td><span class="dot" style="background:\${getColor(m.model)}"></span>\${m.model}</td>
                      <td class="text-right mono">\${fmt(m.calls)}</td>
                      <td class="text-right mono">\${fmt(m.prompt_tokens || 0)} / \${fmt(m.completion_tokens || 0)}</td>
                      <td class="text-right mono" style="color:var(--green)">\${fmtCost(m.cost || 0)}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title" style="display:flex;justify-content:space-between;align-items:center">
            Recent Activity
            <a href="/dashboard/activity" class="btn" style="text-decoration:none;font-weight:500;font-size:12px">View All Activity →</a>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Model</th>
                  <th class="text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                \${state.recent.map(r => \`
                  <tr>
                    <td class="mono">\${r.timestamp?.slice(11,16) || ''}</td>
                    <td><span class="dot" style="background:\${getColor(r.model)}"></span>\${r.model}</td>
                    <td class="text-right mono" style="color:var(--green)">\${fmtCost(r.cost || 0)}</td>
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
            <div class="login-title">\${state.needsSetup ? 'Set Password' : 'Dashboard Login'}</div>
            <form id="loginForm">
              <input type="password" class="form-input" id="password" placeholder="\${state.needsSetup ? 'Choose a password' : 'Enter password'}" autocomplete="current-password">
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
      if (!state.authenticated) setupLoginForm();
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
</html>`
}

/**
 * Activity page - standalone page for browsing all call records
 */
export function activityPageHtml(isAuthenticated: boolean, needsSetup: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activity - Usage Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      transition: background 0.2s ease, color 0.2s ease;
    }

    body.theme-light {
      --bg: #f0f4f8;
      --bg-card: #ffffff;
      --bg-hover: #e8eef4;
      --border: #cdd7e1;
      --text: #0d2137;
      --text-muted: #4a5568;
      --text-dim: #8696a7;
      --accent: #0078d4;
      --accent-hover: #106ebe;
      --green: #107c10;
      --amber: #ca5010;
      --shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    body.theme-dark {
      --bg: #0f172a;
      --bg-card: #1e293b;
      --bg-hover: #334155;
      --border: #334155;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --accent: #38bdf8;
      --accent-hover: #7dd3fc;
      --green: #4ade80;
      --amber: #fbbf24;
      --shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    body { background: var(--bg); color: var(--text); }

    .container { max-width: 700px; margin: 0 auto; padding: 24px 20px; }

    .theme-toggle {
      position: fixed; top: 20px; right: 20px;
      width: 40px; height: 40px; border-radius: 10px;
      border: 1px solid var(--border); background: var(--bg-card);
      color: var(--text-muted); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; box-shadow: var(--shadow); z-index: 100;
    }
    .theme-toggle:hover { background: var(--bg-hover); color: var(--text); }

    header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border);
    }
    .logo { font-size: 15px; font-weight: 600; color: var(--text); }
    .logo a { color: var(--text); text-decoration: none; }
    .logo a:hover { color: var(--accent); }

    .btn {
      padding: 7px 14px; font-size: 13px; font-weight: 500;
      border: 1px solid var(--border); border-radius: 6px;
      background: var(--bg-card); color: var(--text-muted); cursor: pointer;
    }
    .btn:hover { background: var(--bg-hover); color: var(--text); }
    .btn.active { background: var(--accent); color: white; border-color: var(--accent); }

    /* Metrics bar - horizontal scroll on mobile */
    .metrics-bar {
      display: flex; gap: 10px; margin-bottom: 20px;
      overflow-x: auto; -webkit-overflow-scrolling: touch;
      padding-bottom: 4px;
    }
    .metrics-bar::-webkit-scrollbar { height: 0; }
    .metric-card {
      flex: 0 0 auto; min-width: 130px;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 10px; padding: 14px 16px; box-shadow: var(--shadow);
    }
    .metric-label { font-size: 11px; color: var(--text-dim); font-weight: 500; margin-bottom: 4px; }
    .metric-value { font-size: 18px; font-weight: 600; color: var(--text); font-variant-numeric: tabular-nums; }

    .filters { display: flex; gap: 6px; margin-bottom: 20px; }

    /* Card list */
    .call-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .call-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 10px; padding: 14px 16px; box-shadow: var(--shadow);
    }
    .call-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .call-model { font-weight: 600; font-size: 13px; color: var(--text); }
    .call-cost { font-weight: 600; font-size: 13px; color: var(--green); font-family: 'SF Mono', monospace; }
    .call-meta { display: flex; gap: 14px; font-size: 12px; color: var(--text-dim); flex-wrap: wrap; }
    .call-time { font-size: 12px; color: var(--text-dim); margin-top: 4px; }

    .load-more-wrap { text-align: center; margin-bottom: 24px; }
    .btn-load {
      padding: 10px 32px; font-size: 14px; font-weight: 500;
      border: 1px solid var(--border); border-radius: 8px;
      background: var(--bg-card); color: var(--text-muted); cursor: pointer;
    }
    .btn-load:hover { background: var(--bg-hover); color: var(--text); }
    .btn-load:disabled { opacity: 0.5; cursor: default; }

    .empty { text-align: center; padding: 40px; color: var(--text-dim); }

    /* Login */
    .login-wrap { max-width: 340px; margin: 100px auto; }
    .login-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 12px; padding: 36px; box-shadow: var(--shadow);
    }
    .login-title { font-size: 18px; font-weight: 600; text-align: center; margin-bottom: 28px; color: var(--text); }
    .form-input {
      width: 100%; padding: 11px 14px; font-size: 14px;
      background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
      color: var(--text); margin-bottom: 14px;
    }
    .form-input:focus { outline: none; border-color: var(--accent); }
    .form-input::placeholder { color: var(--text-dim); }
    .btn-submit {
      width: 100%; padding: 11px; font-size: 14px; font-weight: 600;
      background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer;
    }
    .btn-submit:hover { background: var(--accent-hover); }
    .error-msg { color: #dc2626; font-size: 13px; text-align: center; margin-top: 14px; }

    @media (max-width: 640px) {
      .container { padding: 16px 14px; }
      .metric-card { min-width: 110px; padding: 10px 12px; }
      .metric-value { font-size: 16px; }
      .theme-toggle { top: 12px; right: 12px; width: 36px; height: 36px; font-size: 16px; }
    }
  </style>
</head>
<body class="theme-light">
  <button class="theme-toggle" id="themeToggle" title="Toggle theme">☀️</button>

  <div class="container" id="app">
    <div style="text-align:center;padding:60px;color:var(--text-dim)">Loading...</div>
  </div>

  <script>
    function setTheme(dark) {
      document.body.className = dark ? 'theme-dark' : 'theme-light';
      document.getElementById('themeToggle').textContent = dark ? '🌙' : '☀️';
      localStorage.setItem('dashboard-theme', dark ? 'dark' : 'light');
    }

    document.getElementById('themeToggle').addEventListener('click', () => {
      setTheme(document.body.classList.contains('theme-light'));
    });

    const saved = localStorage.getItem('dashboard-theme');
    if (saved) setTheme(saved === 'dark');
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme(true);

    const state = {
      authenticated: ${isAuthenticated},
      needsSetup: ${needsSetup},
      hours: 24,
      metrics: null,
      records: [],
      offset: 0,
      loading: false,
      hasMore: true,
    };

    const PAGE_SIZE = 50;

    function fmt(n) {
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return n.toString();
    }

    function fmtCost(c) {
      if (c >= 1) return '$' + c.toFixed(2);
      if (c >= 0.01) return '$' + c.toFixed(3);
      return '$' + c.toFixed(4);
    }

    function fmtDuration(ms) {
      if (!ms) return '-';
      if (ms < 1000) return ms + 'ms';
      return (ms / 1000).toFixed(1) + 's';
    }

    async function api(endpoint) {
      const res = await fetch('/dashboard/api/' + endpoint, { credentials: 'include' });
      if (res.status === 401) { state.authenticated = false; render(); throw new Error('Unauthorized'); }
      return res.json();
    }

    async function loadMetrics() {
      try {
        state.metrics = await api('activity-metrics?hours=' + state.hours);
      } catch (e) { console.error(e); }
    }

    async function loadRecords(append) {
      if (state.loading) return;
      state.loading = true;
      render();
      try {
        const offset = append ? state.offset : 0;
        const data = await api('recent?limit=' + PAGE_SIZE + '&offset=' + offset);
        if (append) {
          state.records = state.records.concat(data);
        } else {
          state.records = data;
        }
        state.offset = (append ? state.offset : 0) + data.length;
        state.hasMore = data.length === PAGE_SIZE;
      } catch (e) { console.error(e); }
      state.loading = false;
      render();
    }

    async function loadAll() {
      state.offset = 0;
      state.hasMore = true;
      await Promise.all([loadMetrics(), loadRecords(false)]);
      render();
    }

    function setHours(h) {
      state.hours = h;
      loadAll();
    }

    function renderActivity() {
      const m = state.metrics || {};

      return \`
        <header>
          <div class="logo"><a href="/dashboard">← Dashboard</a> / Activity</div>
        </header>

        <div class="metrics-bar">
          <div class="metric-card">
            <div class="metric-label">📊 Total Calls</div>
            <div class="metric-value">\${fmt(m.totalCalls || 0)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">💰 Total Cost</div>
            <div class="metric-value">\${fmtCost(m.totalCost || 0)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">⏱️ Avg Response</div>
            <div class="metric-value">\${fmtDuration(m.avgDurationMs)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">🏷️ Top Model</div>
            <div class="metric-value" style="font-size:13px">\${m.topModel || '-'}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">📈 Peak Hour</div>
            <div class="metric-value">\${m.peakHour || '-'}</div>
          </div>
        </div>

        <div class="filters">
          \${[1, 6, 24, 168, 0].map(h => \`
            <button class="btn \${state.hours === h ? 'active' : ''}" onclick="setHours(\${h})">
              \${h === 0 ? 'All' : h === 168 ? '7d' : h + 'h'}
            </button>
          \`).join('')}
        </div>

        \${state.records.length === 0 && !state.loading ? '<div class="empty">No activity records</div>' : ''}

        <div class="call-list">
          \${state.records.map(r => \`
            <div class="call-card">
              <div class="call-top">
                <span class="call-model">\${r.model}</span>
                <span class="call-cost">\${fmtCost(r.cost || 0)}</span>
              </div>
              <div class="call-meta">
                \${r.source ? '<span>🏷 ' + r.source + '</span>' : ''}
                \${r.duration_ms ? '<span>⏱ ' + fmtDuration(r.duration_ms) + '</span>' : ''}
                <span>📥 \${fmt(r.prompt_tokens)} in</span>
                <span>📤 \${fmt(r.completion_tokens)} out</span>
              </div>
              <div class="call-time">\${r.timestamp?.slice(0, 16).replace('T', ' ') || ''}</div>
            </div>
          \`).join('')}
        </div>

        \${state.hasMore ? '<div class="load-more-wrap"><button class="btn-load" onclick="loadMore()" ' + (state.loading ? 'disabled' : '') + '>' + (state.loading ? 'Loading...' : 'Load More') + '</button></div>' : ''}
      \`;
    }

    function renderLogin() {
      return \`
        <div class="login-wrap">
          <div class="login-card">
            <div class="login-title">\${state.needsSetup ? 'Set Password' : 'Dashboard Login'}</div>
            <form id="loginForm">
              <input type="password" class="form-input" id="password" placeholder="\${state.needsSetup ? 'Choose a password' : 'Enter password'}" autocomplete="current-password">
              \${state.needsSetup ? '<input type="password" class="form-input" id="confirmPassword" placeholder="Confirm password">' : ''}
              <button type="submit" class="btn-submit">\${state.needsSetup ? 'Set Password' : 'Login'}</button>
              <div id="loginError" class="error-msg"></div>
            </form>
          </div>
        </div>
      \`;
    }

    function render() {
      document.getElementById('app').innerHTML = state.authenticated ? renderActivity() : renderLogin();
      if (!state.authenticated) setupLoginForm();
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
          if (data.success) { state.authenticated = true; state.needsSetup = false; loadAll(); }
          else err.textContent = data.error || 'Login failed';
        } catch (e) { err.textContent = 'Network error'; }
      };
    }

    function loadMore() { loadRecords(true); }

    if (state.authenticated) loadAll();
    else render();
  </script>
</body>
</html>`
}
