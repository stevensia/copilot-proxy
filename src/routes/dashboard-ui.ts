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
      background: #f5f5f5;
      min-height: 100vh;
      color: #333;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    
    /* Header */
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    header h1 { font-size: 1.5rem; display: flex; align-items: center; gap: 10px; }
    header .actions { display: flex; gap: 10px; }
    
    /* Cards */
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .card-label { font-size: 0.85rem; color: #666; margin-bottom: 5px; }
    .card-value { font-size: 1.8rem; font-weight: 700; color: #333; }
    .card-sub { font-size: 0.75rem; color: #999; margin-top: 5px; }
    
    /* Buttons */
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .btn-primary { background: #667eea; color: white; }
    .btn-primary:hover { background: #5a6fd6; }
    .btn-secondary { background: #e0e0e0; color: #333; }
    .btn-secondary:hover { background: #d0d0d0; }
    .btn-danger { background: #e74c3c; color: white; }
    .btn-danger:hover { background: #c0392b; }
    
    /* Time filter */
    .time-filter {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .time-filter .btn.active { background: #667eea; color: white; }
    
    /* Tables */
    .table-wrap {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      overflow: hidden;
      margin-bottom: 20px;
    }
    .table-header {
      padding: 15px 20px;
      border-bottom: 1px solid #eee;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 20px; text-align: left; }
    th { background: #f8f9fa; font-weight: 600; font-size: 0.85rem; color: #666; }
    td { border-top: 1px solid #eee; }
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
    .bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 150px; }
    .bar {
      flex: 1;
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px 4px 0 0;
      min-width: 8px;
      position: relative;
      transition: all 0.3s;
    }
    .bar:hover { opacity: 0.8; }
    .bar-label {
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.65rem;
      color: #999;
      white-space: nowrap;
    }
    .bar-tooltip {
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    }
    .bar:hover .bar-tooltip { opacity: 1; }
    
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
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 8px;
    }
    
    /* Responsive */
    @media (max-width: 600px) {
      .cards { grid-template-columns: 1fr 1fr; }
      header { flex-direction: column; gap: 15px; }
      .time-filter { justify-content: center; }
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
        const [statsRes, hourly, daily, models, recent] = await Promise.all([
          api('stats?hours=' + state.hours),
          api('hourly?hours=' + state.hours),
          api('daily?hours=' + state.hours),
          api('models?hours=' + state.hours),
          api('recent?limit=20'),
        ]);
        state.stats = statsRes.stats;
        state.today = statsRes.today;
        state.hourly = hourly;
        state.daily = daily;
        state.models = models;
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
          <h1>📊 Copilot Proxy Dashboard</h1>
          <div class="actions">
            <button class="btn btn-secondary" onclick="loadData()">🔄 Refresh</button>
            <button class="btn btn-secondary" onclick="exportCsv()">📥 Export</button>
            <button class="btn btn-danger" onclick="logout()">Logout</button>
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
          <div class="chart-title">📈 Hourly Usage</div>
          <div class="bar-chart">
            \${renderHourlyChart()}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="table-wrap">
            <div class="table-header">📊 By Model</div>
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

          <div class="table-wrap">
            <div class="table-header">📅 Daily</div>
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
        </div>

        <div class="table-wrap">
          <div class="table-header">🕐 Recent Calls</div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Model</th>
                <th class="text-right">Prompt</th>
                <th class="text-right">Completion</th>
                <th class="text-right">Total</th>
                <th class="text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              \${state.recent.map(r => \`
                <tr>
                  <td class="text-muted">\${formatTime(r.timestamp)}</td>
                  <td><span class="model-dot" style="background:\${getModelColor(r.model)}"></span>\${r.model}</td>
                  <td class="text-right">\${formatNumber(r.prompt_tokens)}</td>
                  <td class="text-right">\${formatNumber(r.completion_tokens)}</td>
                  <td class="text-right">\${formatNumber(r.total_tokens)}</td>
                  <td class="text-right text-muted">\${r.duration_ms ? r.duration_ms + 'ms' : '-'}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      \`;
    }

    function renderHourlyChart() {
      if (!state.hourly.length) return '<div class="text-muted">No data</div>';
      
      const maxTokens = Math.max(...state.hourly.map(h => h.tokens), 1);
      
      return state.hourly.map(h => {
        const height = Math.max((h.tokens / maxTokens) * 100, 2);
        const label = h.hour.slice(11, 16); // HH:MM
        return \`
          <div class="bar" style="height: \${height}%">
            <div class="bar-tooltip">\${formatNumber(h.tokens)} tokens / \${h.calls} calls</div>
            <div class="bar-label">\${label}</div>
          </div>
        \`;
      }).join('');
    }

    function render() {
      const app = document.getElementById('app');
      if (!state.authenticated) {
        app.innerHTML = renderLogin();
        setupLoginForm();
      } else {
        app.innerHTML = renderDashboard();
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
