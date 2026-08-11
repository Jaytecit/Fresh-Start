import type { ServerShareOk } from './validateShare';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function taskLabel(task: string): string {
  return task
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export type SharePageState =
  | { kind: 'ok'; summary: ServerShareOk['summary']; preview: ServerShareOk['preview'] }
  | { kind: 'not_found' }
  | { kind: 'invalid' }
  | { kind: 'unsupported_version' };

export function renderSharePageHtml(opts: {
  origin: string;
  id: string;
  state: SharePageState;
}): string {
  const { origin, id, state } = opts;
  const openUrl = `${origin}/?share=${encodeURIComponent(id)}`;
  const shareUrl = `${origin}/share/${encodeURIComponent(id)}`;
  const apiUrl = `${origin}/api/share/${encodeURIComponent(id)}`;

  if (state.kind !== 'ok') {
    const title = 'Shared creature — Solemn Sandbox';
    const message =
      state.kind === 'not_found'
        ? 'This shared creature could not be found.'
        : state.kind === 'unsupported_version'
          ? 'This creature was created with an incompatible version of Solemn Sandbox.'
          : 'This shared file is not a valid Solemn Sandbox creature.';
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(message)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(message)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta name="twitter:card" content="summary" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@0,9..40,400;0,9..40,500;0,9..40,650&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet" />
  <style>${sharePageCss()}</style>
</head>
<body>
  <main class="share-page">
    <p class="eyebrow">Solemn Sandbox</p>
    <h1>Shared creature</h1>
    <p class="error-msg">${escapeHtml(message)}</p>
    <p class="actions"><a class="btn" href="${escapeHtml(origin)}/">Open Solemn Sandbox</a></p>
  </main>
</body>
</html>`;
  }

  const s = state.summary;
  const name = s.name.trim() || 'Creature';
  const title = `${name} — Solemn Sandbox`;
  const description = `A shared Solemn Sandbox creature trained for ${taskLabel(s.task)}. Fitness: ${s.fitness.toFixed(2)}.`;
  const previewJson = JSON.stringify(state.preview);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:site_name" content="Solemn Sandbox" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@0,9..40,400;0,9..40,500;0,9..40,650&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet" />
  <style>${sharePageCss()}</style>
</head>
<body>
  <main class="share-page">
    <p class="eyebrow">Solemn Sandbox</p>
    <p class="kicker">Shared creature</p>
    <canvas id="preview" width="420" height="260" aria-label="Creature preview"></canvas>
    <h1>${escapeHtml(name)}</h1>
    <dl class="stats">
      <div><dt>Task</dt><dd>${escapeHtml(taskLabel(s.task))}</dd></div>
      <div><dt>Fitness</dt><dd>${escapeHtml(s.fitness.toFixed(2))}</dd></div>
      <div><dt>Joints</dt><dd>${s.joints}</dd></div>
      <div><dt>Bones</dt><dd>${s.bones}</dd></div>
      <div><dt>Muscles</dt><dd>${s.muscles}</dd></div>
      <div><dt>Neural controller</dt><dd>${s.inputCount} inputs · ${s.hiddenCount} hidden · ${s.outputCount} outputs</dd></div>
      <div><dt>Save version</dt><dd>${s.version}</dd></div>
    </dl>
    <p class="actions">
      <a class="btn primary" href="${escapeHtml(openUrl)}">Open in Solemn Sandbox</a>
      <button type="button" class="btn" id="download">Download JSON</button>
    </p>
    <p class="hint">Shared creatures contain their saved design and trained controller. Opening does not delete your own saved creatures.</p>
    <p id="status" class="status" hidden></p>
  </main>
  <script>
    window.__SHARE__ = {
      id: ${JSON.stringify(id)},
      apiUrl: ${JSON.stringify(apiUrl)},
      preview: ${previewJson}
    };
  </script>
  <script>${sharePageClientJs()}</script>
</body>
</html>`;
}

function sharePageCss(): string {
  return `
:root {
  color-scheme: dark;
  --bg: #0d121a;
  --panel: #151c27;
  --panel-border: #2a3545;
  --text: #e6ebf2;
  --muted: #8a96a8;
  --accent: #d4a04a;
  --btn: #1e2836;
  --btn-hover: #273244;
  --font-display: "Fraunces", "Segoe UI", Georgia, serif;
  --font-ui: "DM Sans", "Segoe UI", system-ui, sans-serif;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(1200px 600px at 20% -10%, rgba(212,160,74,0.12), transparent 55%),
    radial-gradient(900px 500px at 90% 10%, rgba(70,110,160,0.14), transparent 50%),
    var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
}
.share-page {
  max-width: 520px;
  margin: 0 auto;
  padding: 2.25rem 1.25rem 3rem;
}
.eyebrow {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
}
.kicker {
  margin: 0.35rem 0 1rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
}
h1 {
  margin: 0.85rem 0 1rem;
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.15;
}
#preview {
  display: block;
  width: 100%;
  max-width: 420px;
  height: auto;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  background: #0c121c;
}
.stats { margin: 0; display: grid; gap: 0.55rem; }
.stats > div {
  display: grid;
  grid-template-columns: 9.5rem 1fr;
  gap: 0.75rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid rgba(42,53,69,0.85);
}
dt { margin: 0; color: var(--muted); font-size: 0.85rem; }
dd { margin: 0; font-size: 0.95rem; }
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin: 1.35rem 0 0.85rem;
}
.btn {
  appearance: none;
  border: 1px solid var(--panel-border);
  background: var(--btn);
  color: var(--text);
  border-radius: 8px;
  padding: 0.65rem 1rem;
  font: inherit;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
}
.btn:hover { background: var(--btn-hover); }
.btn.primary {
  border-color: rgba(212,160,74,0.65);
  background: rgba(212,160,74,0.16);
}
.hint, .error-msg, .status {
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.45;
}
.error-msg { color: #e2a0a0; }
.status[data-kind="error"] { color: #e2a0a0; }
`;
}

function sharePageClientJs(): string {
  return `
(function () {
  var boot = window.__SHARE__;
  if (!boot) return;
  var canvas = document.getElementById('preview');
  var status = document.getElementById('status');
  var downloadBtn = document.getElementById('download');
  function showStatus(msg, kind) {
    if (!status) return;
    status.hidden = !msg;
    status.textContent = msg || '';
    status.setAttribute('data-kind', kind || '');
  }
  function paint(design) {
    if (!canvas || !design) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var width = canvas.width, height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(12, 18, 28, 0.95)';
    ctx.fillRect(0, 0, width, height);
    var joints = design.joints || [];
    if (!joints.length) return;
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < joints.length; i++) {
      var j = joints[i];
      minX = Math.min(minX, j.x); maxX = Math.max(maxX, j.x);
      minY = Math.min(minY, j.y); maxY = Math.max(maxY, j.y);
    }
    var pad = 18;
    var spanX = Math.max(0.5, maxX - minX);
    var spanY = Math.max(0.5, maxY - minY);
    var scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
    var ox = (width - spanX * scale) / 2;
    var oy = (height - spanY * scale) / 2;
    function mapX(x) { return ox + (x - minX) * scale; }
    function mapY(y) { return height - (oy + (y - minY) * scale); }
    function jointAt(id) {
      for (var k = 0; k < joints.length; k++) if (joints[k].id === id) return joints[k];
      return null;
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var muscles = design.muscles || [];
    var bones = design.bones || [];
    for (var m = 0; m < muscles.length; m++) {
      var muscle = muscles[m], a = null, b = null;
      for (var bi = 0; bi < bones.length; bi++) {
        if (bones[bi].id === muscle.startBoneId) a = bones[bi];
        if (bones[bi].id === muscle.endBoneId) b = bones[bi];
      }
      if (!a || !b) continue;
      var aj0 = jointAt(a.startJointId), aj1 = jointAt(a.endJointId);
      var bj0 = jointAt(b.startJointId), bj1 = jointAt(b.endJointId);
      if (!aj0 || !aj1 || !bj0 || !bj1) continue;
      ctx.strokeStyle = 'rgba(220, 90, 110, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(mapX((aj0.x + aj1.x) / 2), mapY((aj0.y + aj1.y) / 2));
      ctx.lineTo(mapX((bj0.x + bj1.x) / 2), mapY((bj0.y + bj1.y) / 2));
      ctx.stroke();
    }
    for (var n = 0; n < bones.length; n++) {
      var bone = bones[n];
      var p0 = jointAt(bone.startJointId), p1 = jointAt(bone.endJointId);
      if (!p0 || !p1) continue;
      ctx.strokeStyle = bone.rigid ? 'rgba(180, 200, 220, 0.95)' : 'rgba(120, 160, 200, 0.9)';
      ctx.lineWidth = bone.rigid ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(mapX(p0.x), mapY(p0.y));
      ctx.lineTo(mapX(p1.x), mapY(p1.y));
      ctx.stroke();
    }
    for (var t = 0; t < joints.length; t++) {
      var jj = joints[t];
      var r = jj.isWheel ? 5.5 : jj.isFoot ? 5 : 4;
      ctx.beginPath();
      ctx.arc(mapX(jj.x), mapY(jj.y), r, 0, Math.PI * 2);
      ctx.fillStyle = jj.isFoot ? 'rgba(90, 200, 140, 0.95)'
        : jj.isHead ? 'rgba(230, 200, 90, 0.95)'
        : jj.isWheel ? 'rgba(210, 160, 80, 0.95)'
        : 'rgba(210, 220, 235, 0.95)';
      ctx.fill();
    }
  }
  paint(boot.preview);
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
      showStatus('Preparing download…', '');
      fetch(boot.apiUrl)
        .then(function (res) {
          if (res.status === 404) throw new Error('not_found');
          if (!res.ok) throw new Error('network');
          return res.text();
        })
        .then(function (text) {
          var parsed = JSON.parse(text);
          var name = (parsed && parsed.name) ? String(parsed.name) : 'creature';
          var filename = name.replace(/\\s+/g, '_') + '_shared.json';
          var blob = new Blob([text], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = filename; a.click();
          URL.revokeObjectURL(url);
          showStatus('', '');
        })
        .catch(function () {
          showStatus('The creature could not be loaded. Check your connection and try again.', 'error');
        });
    });
  }
})();
`;
}
