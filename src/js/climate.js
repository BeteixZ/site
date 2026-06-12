// Climate data widget — Mauna Loa CO₂ from NOAA GML

// GitHub-mirrored NOAA Mauna Loa data (raw.githubusercontent.com has CORS headers)
const CO2_URL = 'https://raw.githubusercontent.com/datasets/co2-ppm/main/data/co2-mm-mlo.csv';
const PREINDUSTRIAL = 280;

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Data fetching ───────────────────────────────────────────────────────────

async function fetchCO2() {
  const res = await fetch(CO2_URL);
  if (!res.ok) throw new Error(res.status);
  const text = await res.text();
  return parseCO2(text);
}

function parseCO2(text) {
  // Format: Date,Decimal Date,Average,Interpolated,Number of Days,...
  // e.g.   2026-04,2026.2917,431.12,428.70,23,...
  return text.split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('Date'))
    .map(l => {
      const p = l.trim().split(',');
      if (p.length < 3) return null;
      const [yearStr, monthStr] = p[0].split('-');
      const year  = parseInt(yearStr);
      const month = parseInt(monthStr);
      const avg   = parseFloat(p[2]); // col 2 = monthly average ppm
      return (year > 0 && month > 0 && avg > 300) ? { year, month, avg } : null;
    })
    .filter(Boolean);
}

// ── Chart rendering ─────────────────────────────────────────────────────────

function renderChart(data, container) {
  if (!container || data.length === 0) return;

  const recent = data.slice(-36); // last 3 years
  const min = Math.min(...recent.map(d => d.avg)) - 1;
  const max = Math.max(...recent.map(d => d.avg));
  const range = max - min;

  container.innerHTML = recent.map((d, i) => {
    const h = ((d.avg - min) / range * 100).toFixed(1);
    const label = `${MONTH_SHORT[d.month - 1]} ${d.year}: ${d.avg} ppm`;
    const isJan = d.month === 1;
    return `<span
      style="height:${h}%"
      title="${label}"
      aria-label="${label}"
      ${isJan ? 'data-year="' + d.year + '"' : ''}
    ></span>`;
  }).join('');
}

// ── Milestone timeline ──────────────────────────────────────────────────────

const MILESTONES = [
  { ppm: 280, label: 'Pre-industrial baseline', year: '~1750' },
  { ppm: 315, label: 'Mauna Loa record begins', year: '1958' },
  { ppm: 350, label: 'Safe climate boundary (Hansen)', year: '1988' },
  { ppm: 400, label: 'First 400 ppm recorded', year: '2013' },
  { ppm: 420, label: 'Recent range', year: '2023–' },
];

function renderMilestones(current, container) {
  if (!container) return;
  container.innerHTML = MILESTONES.map(m => {
    const passed = current >= m.ppm;
    return `<div class="milestone ${passed ? 'milestone-passed' : ''}">
      <span class="milestone-ppm">${m.ppm}</span>
      <span class="milestone-label">${m.label}</span>
      <span class="milestone-year">${m.year}</span>
    </div>`;
  }).join('');
}

// ── Rate of change ──────────────────────────────────────────────────────────

function annualRate(data) {
  // Average year-over-year increase over last 5 years
  const recent = data.slice(-5 * 12);
  if (recent.length < 13) return null;
  let total = 0, count = 0;
  for (let i = 12; i < recent.length; i++) {
    total += recent[i].avg - recent[i - 12].avg;
    count++;
  }
  return (total / count).toFixed(2);
}

// ── DOM update ──────────────────────────────────────────────────────────────

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

async function init() {
  const errorEl = document.getElementById('climate-error');

  try {
    const data   = await fetchCO2();
    const latest = data[data.length - 1];
    const yAgo   = data[data.length - 13]; // same month last year

    set('co2-value', latest.avg.toFixed(2));
    set('co2-date',  `${MONTH_LONG[latest.month - 1]} ${latest.year}`);
    set('co2-unit',  'ppm CO₂');

    if (yAgo) {
      const diff = (latest.avg - yAgo.avg).toFixed(2);
      set('co2-yoy', `+${diff} ppm vs last year`);
      const sep = document.getElementById('co2-sep');
      if (sep) sep.style.display = '';
    }

    const above = (latest.avg - PREINDUSTRIAL).toFixed(0);
    const pct   = ((latest.avg / PREINDUSTRIAL - 1) * 100).toFixed(0);
    set('co2-above', `+${above} ppm · +${pct}% above pre-industrial`);

    const rate = annualRate(data);
    if (rate) set('co2-rate', `+${rate} ppm/year (5-yr avg)`);

    renderChart(data, document.getElementById('co2-chart'));
    renderMilestones(latest.avg, document.getElementById('co2-milestones'));

    document.querySelectorAll('.climate-loading').forEach(el => el.remove());
  } catch (err) {
    console.error('Climate data error:', err);
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.textContent = 'Could not load climate data from NOAA — check your connection or try again later.';
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
