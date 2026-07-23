//
// Self-contained HTML for the watcher's read-only status dashboard. Served at
// GET / on the status port; it polls GET /status.json and re-renders. No
// external assets so it works on an isolated LAN with no internet.
//
export const STATUS_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Photodirs Watcher — Queue Status</title>
<style>
  :root {
    --bg: #0f1216; --panel: #181d24; --panel2: #1f262f; --line: #2a323c;
    --fg: #e6ebf1; --muted: #8a95a3; --accent: #4aa3ff;
    --run: #3ecf8e; --queue: #f0b429; --ok: #3ecf8e; --fail: #ff5c5c;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--fg);
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  header {
    display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--line); background: var(--panel);
  }
  header h1 { font-size: 1.05rem; margin: 0; font-weight: 600; }
  header .sub { color: var(--muted); font-size: 0.85rem; }
  #conn { margin-left: auto; font-size: 0.8rem; color: var(--muted); }
  #conn.stale { color: var(--fail); }
  main { padding: 1.25rem; max-width: 1100px; margin: 0 auto; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 0.9rem 1rem; }
  .card h2 { margin: 0 0 0.5rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
  .card .nums { display: flex; gap: 1.1rem; align-items: baseline; }
  .card .n { font-size: 1.6rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .card .lbl { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; vertical-align: 1px; }
  .dot.run { background: var(--run); } .dot.queue { background: var(--queue); }
  h3 { margin: 1.75rem 0 0.6rem; font-size: 0.9rem; }
  .scan { color: var(--muted); font-size: 0.85rem; }
  table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; }
  th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--muted); font-weight: 600; }
  tr:last-child td { border-bottom: none; }
  td.file { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.82rem; word-break: break-all; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.03em; background: var(--panel2); color: var(--muted); }
  .badge.transcode { color: #a78bfa; } .badge.poster { color: #4aa3ff; }
  .badge.raw { color: #f0b429; } .badge.resize { color: #3ecf8e; }
  .st-ok { color: var(--ok); } .st-fail { color: var(--fail); }
  .empty { color: var(--muted); padding: 0.9rem 0.25rem; font-style: italic; }
  .err { color: var(--fail); font-size: 0.78rem; }
</style>
</head>
<body>
<header>
  <h1>Photodirs Watcher</h1>
  <span class="sub">queue &amp; job status</span>
  <span id="conn">connecting…</span>
</header>
<main>
  <div class="cards" id="cards"></div>
  <h3>Active jobs <span class="scan" id="scan"></span></h3>
  <div id="active"></div>
  <h3>Recent jobs</h3>
  <div id="recent"></div>
</main>
<script>
  const QUEUES = ['transcode', 'poster', 'raw', 'resize'];
  const esc = s => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const dur = ms => {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    return m > 0 ? m + 'm' + String(s % 60).padStart(2, '0') + 's' : s + 's';
  };
  const ago = (ms, now) => {
    const s = Math.round((now - ms) / 1000);
    if (s < 60) return s + 's ago';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    return Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0') + 'm ago';
  };
  const badge = t => '<span class="badge ' + t + '">' + t + '</span>';

  function render(d) {
    const now = d.now;
    document.getElementById('cards').innerHTML = QUEUES.map(q => {
      const c = d.queues[q] || { running: 0, queued: 0 };
      return '<div class="card"><h2>' + q + '</h2><div class="nums">'
        + '<div><div class="n">' + c.running + '</div><div class="lbl"><span class="dot run"></span>running</div></div>'
        + '<div><div class="n">' + c.queued + '</div><div class="lbl"><span class="dot queue"></span>queued</div></div>'
        + '</div></div>';
    }).join('');

    document.getElementById('scan').textContent =
      d.scanQueue > 0 ? '· scan queue: ' + d.scanQueue : '';

    const active = d.active || [];
    document.getElementById('active').innerHTML = active.length === 0
      ? '<div class="empty">nothing running</div>'
      : '<table><thead><tr><th>Type</th><th>File</th><th>Elapsed</th></tr></thead><tbody>'
        + active.map(j => '<tr><td>' + badge(j.type) + '</td><td class="file">'
          + esc(j.file) + '</td><td>' + dur(now - j.startedAt) + '</td></tr>').join('')
        + '</tbody></table>';

    const recent = d.recent || [];
    document.getElementById('recent').innerHTML = recent.length === 0
      ? '<div class="empty">no completed jobs yet</div>'
      : '<table><thead><tr><th>Status</th><th>Type</th><th>File</th><th>Took</th><th>When</th></tr></thead><tbody>'
        + recent.map(j => {
            const ok = j.status === 'done';
            return '<tr><td class="' + (ok ? 'st-ok' : 'st-fail') + '">' + (ok ? '✓ done' : '✗ failed')
              + (j.error ? '<div class="err">' + esc(j.error) + '</div>' : '')
              + '</td><td>' + badge(j.type) + '</td><td class="file">' + esc(j.file)
              + '</td><td>' + dur(j.endedAt - j.startedAt) + '</td><td>' + ago(j.endedAt, now) + '</td></tr>';
          }).join('')
        + '</tbody></table>';
  }

  async function tick() {
    const conn = document.getElementById('conn');
    try {
      const r = await fetch('status.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      render(await r.json());
      conn.textContent = 'live · updated ' + new Date().toLocaleTimeString();
      conn.classList.remove('stale');
    } catch (e) {
      conn.textContent = 'disconnected (' + e.message + ')';
      conn.classList.add('stale');
    }
  }
  tick();
  setInterval(tick, 2000);
</script>
</body>
</html>`
