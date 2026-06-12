// Astronomy widget — moon phase, NASA APOD, ISS + CSS live tracking, orbit map

const NASA_KEY = 'ZJoBa6g9yyAwGQlgDT3x7YS3soVhyfDOzhVf0YqI';
const SYNODIC_MS = 29.530588861 * 86400000;

// ── Moon phase ──────────────────────────────────────────────────────────────

function moonPhase(date = new Date()) {
  const JD = date.getTime() / 86400000 + 2440587.5;
  const p = ((JD - 2451550.1) / 29.530588861) % 1;
  return p < 0 ? p + 1 : p;
}

function moonPhaseName(p) {
  if (p < 0.025 || p >= 0.975) return 'New Moon';
  if (p < 0.225) return 'Waxing Crescent';
  if (p < 0.275) return 'First Quarter';
  if (p < 0.475) return 'Waxing Gibbous';
  if (p < 0.525) return 'Full Moon';
  if (p < 0.725) return 'Waning Gibbous';
  if (p < 0.775) return 'Last Quarter';
  return 'Waning Crescent';
}

function moonIllumination(p) {
  return (1 - Math.cos(p * 2 * Math.PI)) / 2;
}

function nextPhase(target, from = new Date()) {
  let diff = target - moonPhase(from);
  if (diff < 0.02) diff += 1;
  return new Date(from.getTime() + diff * SYNODIC_MS);
}

function moonSVG(phase) {
  const r = 44, cx = 50, cy = 50;
  const waxing = phase <= 0.5;
  const p = waxing ? phase / 0.5 : (1 - phase) / 0.5;

  const dark = 'var(--surface-soft)';
  const lit  = 'var(--warm)';
  const glow = 'var(--warm-soft)';

  if (p < 0.01) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dark}"/>`;
  if (p > 0.99) return `
    <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="${glow}" opacity="0.5"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${lit}"/>`;

  const termRx = (r * Math.abs(Math.cos(p * Math.PI))).toFixed(2);
  const outerSweep = waxing ? 1 : 0;
  const termSweep  = p < 0.5 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
  const path = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} A ${termRx} ${r} 0 0 ${termSweep} ${cx} ${cy - r} Z`;

  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dark}"/>
<path d="${path}" fill="${lit}"/>`;
}

function formatDate(d) {
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function daysUntil(d) {
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function initMoon() {
  const phase = moonPhase();
  const illum = moonIllumination(phase);
  const name  = moonPhaseName(phase);

  const svgEl  = document.getElementById('moon-svg');
  const nameEl = document.getElementById('moon-name');
  const illEl  = document.getElementById('moon-illum');
  const fullEl = document.getElementById('next-full');
  const newEl  = document.getElementById('next-new');

  if (svgEl)  svgEl.innerHTML = moonSVG(phase);
  if (nameEl) nameEl.textContent = name;
  if (illEl)  illEl.textContent = `${Math.round(illum * 100)}% illuminated`;

  if (fullEl) {
    const nf = nextPhase(0.5);
    const d  = daysUntil(nf);
    fullEl.textContent = d <= 1
      ? `Full moon tonight — ${formatDate(nf)}`
      : `Full moon in ${d} days — ${formatDate(nf)}`;
  }
  if (newEl) {
    const nn = nextPhase(0.0);
    const d  = daysUntil(nn);
    newEl.textContent = `New moon in ${d} days — ${formatDate(nn)}`;
  }
}

// ── NASA APOD ───────────────────────────────────────────────────────────────

async function initAPOD() {
  const el = document.getElementById('apod-container');
  if (!el) return;

  try {
    const res  = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`);
    if (!res.ok) throw new Error(res.status);
    const apod = await res.json();

    const media = apod.media_type === 'video'
      ? `<div class="apod-video"><iframe src="${apod.url}" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`
      : `<img class="apod-img" src="${apod.url}" alt="${apod.title}" loading="lazy">`;

    const copy = apod.copyright ? ` · © ${apod.copyright.replace(/\n/g, ' ').trim()}` : '';

    el.innerHTML = `
      ${media}
      <div class="apod-body">
        <div class="apod-eyebrow">${apod.date}${copy}</div>
        <h3 class="apod-title">${apod.title}</h3>
        <p class="apod-explanation">${apod.explanation}</p>
      </div>`;
  } catch {
    el.innerHTML = '<p class="astro-error">Could not load today\'s picture — NASA API may be rate-limited. <a href="https://api.nasa.gov/" target="_blank" rel="noopener">Get a free key</a> to increase limits.</p>';
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n, dec = 2) { return Math.abs(n).toFixed(dec); }
function latStr(n)  { return `${fmt(n)}° ${n >= 0 ? 'N' : 'S'}`; }
function lonStr(n)  { return `${fmt(n)}° ${n >= 0 ? 'E' : 'W'}`; }
function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// ── Space station live positions ────────────────────────────────────────────

let issPos = null;

// Fetch CSS static orbital data from CelesTrak catalog (no live position API exists with CORS)
async function initCSS() {
  try {
    const res  = await fetch('https://celestrak.org/satcat/records.php?CATNR=48274&FORMAT=json');
    const data = await res.json();
    const rec  = data[0];
    if (!rec) return;

    const altKm  = Math.round((rec.APOGEE + rec.PERIGEE) / 2);
    const velKmh = Math.round(Math.sqrt(398600.4 / (6371 + altKm)) * 3600);

    setEl('css-alt',    `${altKm.toLocaleString()} km`);
    setEl('css-vel',    `${velKmh.toLocaleString()} km/h`);
    setEl('css-period', `${rec.PERIOD} min`);
    setEl('css-incl',   `${rec.INCLINATION}°`);
  } catch { /* leave as — */ }
}

async function updateStations() {
  const now = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    issPos = await res.json();
    if (issPos.latitude != null) {
      setEl('iss-lat', latStr(issPos.latitude));
      setEl('iss-lon', lonStr(issPos.longitude));
      setEl('iss-alt', `${Math.round(issPos.altitude).toLocaleString()} km`);
      setEl('iss-vel', `${Math.round(issPos.velocity).toLocaleString()} km/h`);
      setEl('iss-vis', issPos.visibility === 'daylight' ? 'Daylight' : 'Eclipse');
      setEl('iss-ts',  now);
      const dot = document.getElementById('iss-dot');
      if (dot) dot.classList.toggle('is-daylight', issPos.visibility === 'daylight');
    }
  } catch { /* keep last values */ }

  const canvas = document.getElementById('orbit-map');
  if (canvas) drawOrbitMap(canvas);
}

// ── Orbit map ────────────────────────────────────────────────────────────────

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json';
const TRACK_STEPS = 30;        // data points per track
const TRACK_STEP_SEC = 180;    // 3 min per step → ~90 min total

let landRings = null;
let issTrack = null;

// Minimal delta-encoded TopoJSON decoder
function decodeTopo(topo, name) {
  const obj = topo.objects[name];
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;

  const decoded = topo.arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => [(x += dx) * sx + tx, (y += dy) * sy + ty]);
  });

  function resolveRing(arcIdxs) {
    return arcIdxs.flatMap(i => i >= 0 ? decoded[i] : decoded[~i].slice().reverse());
  }

  const rings = [];
  function addGeom(g) {
    if (!g) return;
    if (g.type === 'Polygon') {
      rings.push(...g.arcs.map(resolveRing));
    } else if (g.type === 'MultiPolygon') {
      g.arcs.forEach(poly => rings.push(...poly.map(resolveRing)));
    } else if (g.type === 'GeometryCollection') {
      g.geometries.forEach(addGeom);
    }
  }
  obj.geometries.forEach(addGeom);
  return rings;
}

// Sun's sub-solar point (simplified solar position, ~0.01° accuracy)
function sunSubsolar(d = new Date()) {
  const JD = d.getTime() / 86400000 + 2440587.5;
  const n  = JD - 2451545.0;
  const L  = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;
  const g  = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
  const lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;
  const eps = 23.439 * Math.PI / 180;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const RA  = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
  // Greenwich Mean Sidereal Time in degrees
  const GMST = ((280.46061837 + 360.98564736629 * n) % 360 + 360) % 360;
  const sunLon = ((RA * 180 / Math.PI - GMST + 540) % 360) - 180;
  return { lat: dec * 180 / Math.PI, lon: sunLon };
}

// Fetch timestamped ground track (~one orbital period ahead)
async function fetchTrack(noradId) {
  const t0 = Math.floor(Date.now() / 1000);
  const ts = Array.from({ length: TRACK_STEPS }, (_, i) => t0 + i * TRACK_STEP_SEC);
  const res = await fetch(
    `https://api.wheretheiss.at/v1/satellites/${noradId}/positions?timestamps=${ts.join(',')}`
  );
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

async function refreshTracks() {
  try {
    issTrack = await fetchTrack(25544);
  } catch { /* keep last track */ }
}

// CSS orbital track computed from known parameters (no live API available).
// Inclination 41.47°, period 92.27 min. Starting longitude estimated from
// current time — position will drift correctly within each session.
function computeCSSTrack() {
  const inclRad  = 41.47 * Math.PI / 180;
  const periodMs = 92.27 * 60 * 1000;
  const earthRotPerOrbit = 360 * (periodMs / (24 * 60 * 60 * 1000)); // ~22.88°

  // Seed longitude from current time so the track shifts plausibly across sessions,
  // but stays fixed within one page load (stable visual).
  const phaseMs  = Date.now() % periodMs;
  const lon0     = ((Date.now() / 1000 / 3600 * 15) % 360) - 180; // rough GHA

  const track = [];
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const frac  = i / steps;
    const theta = frac * 2 * Math.PI;
    const lat   = Math.asin(Math.sin(inclRad) * Math.sin(theta)) * 180 / Math.PI;
    const lonOrbit   = Math.atan2(Math.cos(inclRad) * Math.sin(theta), Math.cos(theta)) * 180 / Math.PI;
    const earthDrift = frac * earthRotPerOrbit;
    const lon   = ((lon0 + lonOrbit - earthDrift + 540) % 360) - 180;
    track.push({ latitude: lat, longitude: lon });
  }
  return track;
}

// Draw the full orbit map onto the canvas
function drawOrbitMap(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;

  const dpr = window.devicePixelRatio || 1;
  const W = Math.round(rect.width * dpr);
  const H = Math.round(rect.height * dpr);

  if (canvas.width !== W || canvas.height !== H) {
    canvas.width  = W;
    canvas.height = H;
  }

  const ctx = canvas.getContext('2d');
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Equirectangular: [lon, lat] → [px, py]
  function proj([lon, lat]) {
    return [(lon + 180) / 360 * W, (90 - lat) / 180 * H];
  }

  // ── Ocean background
  ctx.fillStyle = isDark ? '#07111f' : '#bdd8f0';
  ctx.fillRect(0, 0, W, H);

  // ── Graticule
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 0.5;
  for (let lon = -150; lon < 180; lon += 30) {
    const [x] = proj([lon, 0]);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (const lat of [-60, -30, 0, 30, 60]) {
    const [, y] = proj([0, lat]);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // ── Land polygons
  if (landRings) {
    ctx.fillStyle   = isDark ? '#182d47' : '#e4dfd4';
    ctx.strokeStyle = isDark ? '#243d5a' : '#c8c0b0';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    for (const ring of landRings) {
      if (ring.length < 2) continue;
      const [x0, y0] = proj(ring[0]);
      ctx.moveTo(x0, y0);
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = proj(ring[i]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    ctx.fill('evenodd');
    ctx.stroke();
  }

  // ── Terminator (day/night boundary)
  const sun    = sunSubsolar();
  const decRad = sun.lat * Math.PI / 180;
  const sinDec = Math.sin(decRad);
  const cosDec = Math.cos(decRad);

  const term = [];
  for (let lon = -180; lon <= 180; lon += 1.5) {
    const HA     = (lon - sun.lon) * Math.PI / 180;
    const tLat   = Math.atan2(-Math.cos(HA) * cosDec, sinDec) * 180 / Math.PI;
    if (isFinite(tLat)) term.push([lon, tLat]);
  }

  if (term.length > 1) {
    // Night-side fill
    ctx.beginPath();
    const [x0, y0] = proj(term[0]);
    ctx.moveTo(x0, y0);
    for (const pt of term) { const [x, y] = proj(pt); ctx.lineTo(x, y); }
    if (sun.lat > 0) { ctx.lineTo(W, H); ctx.lineTo(0, H); }
    else             { ctx.lineTo(W, 0); ctx.lineTo(0, 0); }
    ctx.closePath();
    ctx.fillStyle = isDark ? 'rgba(0,5,30,0.55)' : 'rgba(0,10,70,0.22)';
    ctx.fill();

    // Terminator line (golden glow)
    ctx.beginPath();
    const [tx0, ty0] = proj(term[0]);
    ctx.moveTo(tx0, ty0);
    for (const pt of term) { const [x, y] = proj(pt); ctx.lineTo(x, y); }
    ctx.strokeStyle = isDark ? 'rgba(255,195,50,0.75)' : 'rgba(255,140,0,0.6)';
    ctx.lineWidth   = 1.5 * dpr;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  // ── Ground track helper
  function drawTrack(track, color) {
    if (!track || track.length < 2) return;

    // Split at antimeridian wraps
    const segs = [[]];
    for (const pt of track) {
      const seg = segs[segs.length - 1];
      if (seg.length > 0 && Math.abs(pt.longitude - seg[seg.length - 1].longitude) > 180) {
        segs.push([]);
      }
      segs[segs.length - 1].push(pt);
    }

    ctx.strokeStyle  = color;
    ctx.lineWidth    = 1.5 * dpr;
    ctx.setLineDash([4 * dpr, 3 * dpr]);
    ctx.globalAlpha  = 0.6;

    for (const seg of segs) {
      if (seg.length < 2) continue;
      ctx.beginPath();
      const [sx, sy] = proj([seg[0].longitude, seg[0].latitude]);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < seg.length; i++) {
        const [px, py] = proj([seg[i].longitude, seg[i].latitude]);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  drawTrack(issTrack, '#44aaff');
  drawTrack(computeCSSTrack(), '#ff8844');

  // ── ISS position dot
  if (issPos) {
    const [px, py] = proj([issPos.longitude, issPos.latitude]);
    const grad = ctx.createRadialGradient(px, py, 0, px, py, 14 * dpr);
    grad.addColorStop(0, '#44aaffbb');
    grad.addColorStop(1, '#44aaff00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 14 * dpr, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle   = '#44aaff';
    ctx.strokeStyle = isDark ? '#fff' : '#333';
    ctx.lineWidth   = 1.5 * dpr;
    ctx.beginPath();
    ctx.arc(px, py, 5 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

// ── Hover tooltip ────────────────────────────────────────────────────────────

function setupOrbitHover(canvas) {
  const tooltip = document.getElementById('orbit-tooltip');
  if (!tooltip) return;

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    function screenXY(pos) {
      if (!pos) return null;
      return {
        x: (pos.longitude + 180) / 360 * rect.width,
        y: (90 - pos.latitude) / 180 * rect.height,
      };
    }

    const issS = screenXY(issPos);
    let hov = null;

    if (issS && Math.hypot(mx - issS.x, my - issS.y) < 18) {
      hov = { name: 'ISS', pos: issPos, color: '#44aaff' };
    }

    if (hov) {
      const p = hov.pos;
      tooltip.innerHTML =
        `<strong style="color:${hov.color}">${hov.name}</strong>` +
        `<span>${latStr(p.latitude)} · ${lonStr(p.longitude)}</span>` +
        `<span>${Math.round(p.altitude).toLocaleString()} km altitude</span>` +
        `<span>${Math.round(p.velocity).toLocaleString()} km/h</span>` +
        `<span>${p.visibility === 'daylight' ? 'In daylight' : 'In eclipse'}</span>`;
      tooltip.style.display = 'flex';
      // Keep tooltip inside the card
      const ttW = tooltip.offsetWidth || 160;
      const left = e.offsetX + 14;
      tooltip.style.left = (left + ttW > rect.width ? e.offsetX - ttW - 8 : left) + 'px';
      tooltip.style.top  = Math.max(4, e.offsetY - 24) + 'px';
      canvas.style.cursor = 'crosshair';
    } else {
      tooltip.style.display = 'none';
      canvas.style.cursor = '';
    }
  });

  canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
}

// ── Initialise orbit map ─────────────────────────────────────────────────────

async function initOrbitMap() {
  const canvas = document.getElementById('orbit-map');
  if (!canvas) return;

  // Load world land topology (cached by jsDelivr CDN)
  try {
    const topo = await fetch(WORLD_TOPO_URL).then(r => r.json());
    landRings = decodeTopo(topo, 'land');
  } catch { /* proceed without land outline */ }

  // Fetch initial tracks, then draw
  await refreshTracks();

  setupOrbitHover(canvas);
  window.addEventListener('resize', () => drawOrbitMap(canvas));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => drawOrbitMap(canvas));

  // Station updates refresh the map every 5 s; tracks refresh every 2 min
  setInterval(refreshTracks, 120000);
}

// ── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  initMoon();
  initAPOD();
  initCSS();                // fetch CSS orbital parameters from CelesTrak catalog
  initOrbitMap();           // loads land + ISS tracks, sets up hover
  await updateStations();   // first ISS fetch + initial map draw
  setInterval(updateStations, 5000);
});
