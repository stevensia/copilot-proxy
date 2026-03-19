/**
 * Dashboard UI - Single-file HTML/CSS/JS
 * No external dependencies, embedded in binary
 */

export function dashboardHtml(isAuthenticated: boolean, needsSetup: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Copilot Proxy Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fafafa;
      min-height: 100vh;
      color: #333;
    }
    .container { max-width: 1000px; margin: 0 auto; padding: 15px; }
    
    /* Header - minimal */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid #eee;
      margin-bottom: 20px;
    }
    header h1 { font-size: 1.1rem; font-weight: 600; color: #333; }
    header .actions { display: flex; gap: 8px; }
    
    /* Cards - compact for mobile */
    .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; }
    .card {
      background: white;
      border-radius: 10px;
      padding: 12px 15px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .card-label { font-size: 0.75rem; color: #666; margin-bottom: 3px; }
    .card-value { font-size: 1.4rem; font-weight: 700; color: #333; }
    .card-sub { font-size: 0.7rem; color: #999; margin-top: 3px; }
    
    /* Buttons */
    .btn {
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      background: white;
      color: #666;
      transition: all 0.2s;
    }
    .btn:hover { border-color: #999; color: #333; }
    .btn-primary { background: #333; color: white; border-color: #333; }
    .btn-primary:hover { background: #555; }
    .btn-secondary { background: white; color: #666; }
    .btn-secondary:hover { background: #f5f5f5; }
    .btn-danger { background: white; color: #e74c3c; border-color: #e74c3c; }
    .btn-danger:hover { background: #fef2f2; }
    
    /* Time filter */
    .time-filter {
      display: flex;
      gap: 6px;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }
    .time-filter .btn.active { background: #333; color: white; border-color: #333; }
    
    /* Tables - scrollable on mobile */
    .table-wrap {
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin-bottom: 15px;
    }
    .table-header {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
      font-weight: 600;
      font-size: 0.9rem;
      position: sticky;
      left: 0;
      background: white;
    }
    table { width: 100%; border-collapse: collapse; min-width: 500px; }
    th, td { padding: 10px 12px; text-align: left; white-space: nowrap; }
    th { background: #f8f9fa; font-weight: 600; font-size: 0.8rem; color: #666; }
    td { border-top: 1px solid #eee; font-size: 0.85rem; }
    tr:hover td { background: #f8f9fa; }
    .text-right { text-align: right; }
    .text-muted { color: #999; }
    
    /* Chart placeholder */
    .chart-container {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      margin-bottom: 20px;
      min-height: 200px;
    }
    .chart-title { font-weight: 600; margin-bottom: 15px; }
    
    /* Line chart - minimal */
    .line-chart { height: 60px; position: relative; }
    .line-chart svg { width: 100%; height: 100%; }
    .line-path { fill: none; stroke: #999; stroke-width: 1.5; }
    .area-path { fill: #e5e5e5; opacity: 0.5; }
    .chart-dot { fill: #666; cursor: pointer; r: 2; }
    .chart-dot:hover { fill: #333; r: 4; }
    .chart-labels { display: flex; justify-content: space-between; margin-top: 4px; }
    .chart-labels span { font-size: 0.65rem; color: #999; }
    .chart-tooltip {
      position: absolute;
      background: #333;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 10;
    }
    .chart-container {
      background: white;
      border-radius: 8px;
      padding: 12px 15px;
      margin-bottom: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .chart-title { font-size: 0.8rem; color: #666; margin-bottom: 10px; }
    
    /* Login form */
    .login-container {
      max-width: 400px;
      margin: 100px auto;
      padding: 40px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .login-container h2 { text-align: center; margin-bottom: 30px; color: #667eea; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
    .form-group input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }
    .form-group input:focus { outline: none; border-color: #667eea; }
    .error-msg { color: #e74c3c; font-size: 0.85rem; margin-top: 10px; text-align: center; }
    .success-msg { color: #27ae60; font-size: 0.85rem; margin-top: 10px; text-align: center; }
    
    /* Loading */
    .loading { text-align: center; padding: 40px; color: #999; }
    
    /* Model colors */
    .model-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    
    /* Source badges */
    .source-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.7rem;
      font-weight: 500;
      background: #f0f0f0;
      color: #666;
    }
    .source-cc { background: #fef3c7; color: #92400e; }
    .source-oc { background: #e0e7ff; color: #3730a3; }
    
    /* Two column layout */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    @media (max-width: 700px) {
      .two-col { grid-template-columns: 1fr; }
    }
    
    /* Responsive - mobile first */
    @media (max-width: 600px) {
      .container { padding: 10px; }
      header { padding: 10px 0; }
      header h1 { font-size: 1rem; }
      .cards { gap: 8px; }
      .card { padding: 10px 12px; }
      .card-value { font-size: 1.2rem; }
      .time-filter { gap: 4px; }
      .time-filter .btn { padding: 5px 8px; font-size: 0.75rem; }
      .chart-container { padding: 10px; }
      .line-chart { height: 50px; }
    }
    @media (min-width: 601px) {
      .cards { grid-template-columns: repeat(4, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container" id="app">
    <div class="loading">Loading...</div>
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

    const MODEL_COLORS = {
      'gpt-4.1': '#8b5cf6',
      'gpt-4o': '#10b981',
      'gpt-4o-mini': '#06b6d4',
      'claude-sonnet-4': '#f59e0b',
      'claude-opus-4': '#ef4444',
      'o3-mini': '#ec4899',
      'o4-mini': '#6366f1',
    };

    function getModelColor(model) {
      return MODEL_COLORS[model] || '#94a3b8';
    }

    function formatNumber(n) {
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return String(n);
    }

    function formatTime(ts) {
      return new Date(ts).toLocaleString();
    }

    async function api(endpoint, options = {}) {
      const res = await fetch('/dashboard/api/' + endpoint, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
      }
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
          api('recent?limit=20'),
        ]);
        state.stats = statsRes.stats;
        state.today = statsRes.today;
        state.hourly = hourly;
        state.daily = daily;
        state.models = models;
        state.sources = sources;
        state.recent = recent;
        render();
      } catch (e) {
        console.error('Failed to load data:', e);
      }
    }

    function renderLogin() {
      return \`
        <div class="login-container">
          <h2>🔐 \${state.needsSetup ? 'Setup Dashboard' : 'Login'}</h2>
          <form id="loginForm">
            <div class="form-group">
              <label>\${state.needsSetup ? 'Create Password' : 'Password'}</label>
              <input type="password" id="password" required minlength="8" 
                placeholder="\${state.needsSetup ? 'Min 8 characters' : 'Enter password'}">
            </div>
            \${state.needsSetup ? \`
              <div class="form-group">
                <label>Confirm Password</label>
                <input type="password" id="confirmPassword" required>
              </div>
            \` : ''}
            <button type="submit" class="btn btn-primary" style="width:100%">
              \${state.needsSetup ? 'Setup' : 'Login'}
            </button>
            <div id="loginError" class="error-msg"></div>
          </form>
        </div>
      \`;
    }

    function renderDashboard() {
      const s = state.stats || { total_calls: 0, total_tokens: 0 };
      const t = state.today || { total_calls: 0, total_tokens: 0 };
      
      return \`
        <header>
          <h1>Copilot Proxy</h1>
          <div class="actions">
            <button class="btn" onclick="loadData()">Refresh</button>
            <button class="btn" onclick="exportCsv()">Export</button>
            <button class="btn" onclick="logout()">Logout</button>
          </div>
        </header>

        <div class="time-filter">
          <button class="btn \${state.hours === 1 ? 'active' : 'btn-secondary'}" onclick="setHours(1)">1h</button>
          <button class="btn \${state.hours === 6 ? 'active' : 'btn-secondary'}" onclick="setHours(6)">6h</button>
          <button class="btn \${state.hours === 24 ? 'active' : 'btn-secondary'}" onclick="setHours(24)">24h</button>
          <button class="btn \${state.hours === 168 ? 'active' : 'btn-secondary'}" onclick="setHours(168)">7d</button>
          <button class="btn \${state.hours === 720 ? 'active' : 'btn-secondary'}" onclick="setHours(720)">30d</button>
          <button class="btn \${state.hours === 0 ? 'active' : 'btn-secondary'}" onclick="setHours(0)">All</button>
        </div>

        <div class="cards">
          <div class="card">
            <div class="card-label">Total Calls</div>
            <div class="card-value">\${formatNumber(s.total_calls)}</div>
            <div class="card-sub">Period: \${state.hours ? state.hours + 'h' : 'All time'}</div>
          </div>
          <div class="card">
            <div class="card-label">Total Tokens</div>
            <div class="card-value">\${formatNumber(s.total_tokens)}</div>
            <div class="card-sub">In + Out</div>
          </div>
          <div class="card">
            <div class="card-label">Today Calls</div>
            <div class="card-value">\${formatNumber(t.total_calls)}</div>
          </div>
          <div class="card">
            <div class="card-label">Today Tokens</div>
            <div class="card-value">\${formatNumber(t.total_tokens)}</div>
          </div>
        </div>

        <div class="chart-container">
          <div class="chart-title">Hourly</div>
          \${renderHourlyChart()}
        </div>

        <div class="two-col">
          <div class="table-wrap">
            <div class="table-header">Source</div>
            <table>
              <thead><tr><th>Source</th><th class="text-right">Calls</th><th class="text-right">Output</th></tr></thead>
              <tbody>
                \${state.sources.map(s => \`
                  <tr>
                    <td><span class="source-badge \${s.source === 'Claude Code' ? 'source-cc' : s.source === 'OpenClaw' ? 'source-oc' : ''}">\${s.source}</span></td>
                    <td class="text-right">\${formatNumber(s.calls)}</td>
                    <td class="text-right">\${formatNumber(s.tokens)}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>

          <div class="table-wrap">
            <div class="table-header">Model</div>
            <table>
              <thead><tr><th>Model</th><th class="text-right">Calls</th><th class="text-right">Tokens</th></tr></thead>
              <tbody>
                \${state.models.map(m => \`
                  <tr>
                    <td><span class="model-dot" style="background:\${getModelColor(m.model)}"></span>\${m.model}</td>
                    <td class="text-right">\${formatNumber(m.calls)}</td>
                    <td class="text-right">\${formatNumber(m.tokens)}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="table-wrap" style="margin-top: 15px;">
          <div class="table-header">Daily</div>
          <table>
            <thead><tr><th>Date</th><th class="text-right">Calls</th><th class="text-right">Tokens</th></tr></thead>
            <tbody>
              \${state.daily.slice(0, 7).map(d => \`
                <tr>
                  <td>\${d.date}</td>
                  <td class="text-right">\${formatNumber(d.calls)}</td>
                  <td class="text-right">\${formatNumber(d.tokens)}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>

        <div class="table-wrap">
          <div class="table-header">Recent</div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Source</th>
                <th>Model</th>
                <th class="text-right">Prompt</th>
                <th class="text-right">Compl</th>
                <th class="text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              \${state.recent.map(r => \`
                <tr>
                  <td class="text-muted">\${formatTime(r.timestamp)}</td>
                  <td><span class="source-badge \${r.source === 'Claude Code' ? 'source-cc' : r.source === 'OpenClaw' ? 'source-oc' : ''}">\${r.source || '-'}</span></td>
                  <td><span class="model-dot" style="background:\${getModelColor(r.model)}"></span>\${r.model}</td>
                  <td class="text-right">\${formatNumber(r.prompt_tokens)}</td>
                  <td class="text-right">\${formatNumber(r.completion_tokens)}</td>
                  <td class="text-right text-muted">\${r.duration_ms ? (r.duration_ms / 1000).toFixed(1) + 's' : '-'}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      \`;
    }

    function renderHourlyChart() {
      if (!state.hourly.length) return '<div class="text-muted">No data</div>';
      
      const data = state.hourly;
      const maxTokens = Math.max(...data.map(h => h.tokens), 1);
      const width = 100;
      const height = 100;
      const padding = 5;
      
      // Generate path points
      const points = data.map((h, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - (h.tokens / maxTokens) * (height - padding * 2);
        return { x, y, data: h };
      });
      
      // Create line path
      const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join(' ');
      
      // Create area path (for gradient fill)
      const areaPath = linePath + ' L' + points[points.length-1].x + ',' + (height-padding) + ' L' + points[0].x + ',' + (height-padding) + ' Z';
      
      // Get first, middle, and last labels
      const labels = [data[0]?.hour?.slice(11,16), data[Math.floor(data.length/2)]?.hour?.slice(11,16), data[data.length-1]?.hour?.slice(11,16)];
      
      return \`
        <div class="line-chart" id="hourlyChart">
          <svg viewBox="0 0 \${width} \${height}" preserveAspectRatio="none">
            <path class="area-path" d="\${areaPath}"/>
            <path class="line-path" d="\${linePath}"/>
            \${points.map((p, i) => \`<circle class="chart-dot" cx="\${p.x}" cy="\${p.y}" data-idx="\${i}"/>\`).join('')}
          </svg>
          <div class="chart-tooltip" id="chartTooltip"></div>
        </div>
        <div class="chart-labels">
          <span>\${labels[0] || ''}</span>
          <span>\${labels[2] || ''}</span>
        </div>
      \`;
    }
    
    // Setup tooltip for chart
    function setupChartTooltip() {
      const chart = document.getElementById('hourlyChart');
      const tooltip = document.getElementById('chartTooltip');
      if (!chart || !tooltip) return;
      
      chart.querySelectorAll('.chart-dot').forEach(dot => {
        dot.addEventListener('mouseenter', (e) => {
          const idx = parseInt(e.target.dataset.idx);
          const h = state.hourly[idx];
          if (!h) return;
          tooltip.textContent = h.hour.slice(11,16) + ': ' + formatNumber(h.tokens) + ' tokens';
          tooltip.style.opacity = '1';
          const rect = e.target.getBoundingClientRect();
          const chartRect = chart.getBoundingClientRect();
          tooltip.style.left = (rect.left - chartRect.left + rect.width/2) + 'px';
          tooltip.style.top = (rect.top - chartRect.top - 25) + 'px';
          tooltip.style.transform = 'translateX(-50%)';
        });
        dot.addEventListener('mouseleave', () => {
          tooltip.style.opacity = '0';
        });
      });
    }

    function render() {
      const app = document.getElementById('app');
      if (!state.authenticated) {
        app.innerHTML = renderLogin();
        setupLoginForm();
      } else {
        app.innerHTML = renderDashboard();
        setupChartTooltip();
      }
    }

    function setupLoginForm() {
      const form = document.getElementById('loginForm');
      if (!form) return;
      
      form.onsubmit = async (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('loginError');
        
        if (state.needsSetup) {
          const confirm = document.getElementById('confirmPassword').value;
          if (password !== confirm) {
            errorEl.textContent = 'Passwords do not match';
            return;
          }
        }
        
        try {
          const endpoint = state.needsSetup ? 'setup' : 'login';
          await api(endpoint, {
            method: 'POST',
            body: JSON.stringify({ password }),
          });
          state.authenticated = true;
          state.needsSetup = false;
          render();
          loadData();
        } catch (e) {
          errorEl.textContent = e.message;
        }
      };
    }

    function setHours(h) {
      state.hours = h;
      loadData();
    }

    async function logout() {
      await api('logout', { method: 'POST' });
      state.authenticated = false;
      render();
    }

    function exportCsv() {
      window.location.href = '/dashboard/api/export?hours=' + state.hours;
    }

    // Initial render
    render();
    if (state.authenticated) {
      loadData();
    }
  </script>
</body>
</html>`;
}
