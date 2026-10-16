// Five-point explicit discretization of u_t = alpha * (u_xx + u_yy).
// The dimensionless step lambda = alpha * dt / dx^2 must not exceed 1/4.
// Fixed, zero-temperature edges let heat leave the plate. No learned model is used.
export function diffuseHeat(source, target, width, height, lambda = 0.22) {
  if (lambda < 0 || lambda > 0.25 || !Number.isFinite(lambda)) {
    throw new RangeError('The heat solver requires 0 <= lambda <= 0.25.');
  }
  target.fill(0);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      target[i] = source[i] + lambda * (
        source[i - 1] + source[i + 1] + source[i - width] + source[i + width] - 4 * source[i]
      );
    }
  }
  return target;
}

function initHeatExperiment(panel) {
  const canvas = panel.querySelector('.heat-canvas');
  const context = canvas.getContext('2d');
  if (!context) return;

  const width = 112;
  const height = 72;
  const texture = document.createElement('canvas');
  texture.width = width;
  texture.height = height;
  const textureContext = texture.getContext('2d');
  if (!textureContext) return;
  const pixels = textureContext.createImageData(width, height);
  let field = new Float32Array(width * height);
  let scratch = new Float32Array(width * height);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !motion.matches;
  let visible = !('IntersectionObserver' in window);
  let animation = 0;
  let lastFrame = 0;
  let stepCredit = 0;
  let activePointer = null;
  let pointerInside = false;
  let keyboardFocus = false;
  let cursor = { x: 0.37, y: 0.46 };
  let displayWidth = 1;
  let displayHeight = 1;
  let palette = [];
  let ink = [0, 0, 0];
  const toggle = panel.querySelector('[data-heat-toggle]');
  const toggleLabel = panel.querySelector('[data-heat-toggle-label]');
  const stateLabel = panel.querySelector('[data-heat-state]');
  const speed = panel.querySelector('[data-heat-speed]');
  const speedLabel = panel.querySelector('[data-heat-speed-value]');

  function addHeat(x, y, amount = 0.52, radius = 5) {
    const cx = 1 + x * (width - 3);
    const cy = 1 + y * (height - 3);
    const reach = Math.ceil(radius * 2.5);
    for (let iy = Math.max(1, Math.floor(cy) - reach); iy < Math.min(height - 1, cy + reach); iy += 1) {
      for (let ix = Math.max(1, Math.floor(cx) - reach); ix < Math.min(width - 1, cx + reach); ix += 1) {
        const distance = (ix - cx) ** 2 + (iy - cy) ** 2;
        const i = iy * width + ix;
        field[i] = Math.min(1, field[i] + amount * Math.exp(-distance / (2 * radius * radius)));
      }
    }
  }

  function seed() {
    field.fill(0);
    scratch.fill(0);
    stepCredit = 0;
    addHeat(0.36, 0.46, 0.98, 5.6);
    addHeat(0.66, 0.58, 0.48, 3.8);
  }

  function rgb(value) {
    const hex = value.trim().replace('#', '');
    if (/^[\da-f]{6}$/i.test(hex)) return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    const parts = value.match(/[\d.]+/g);
    return parts ? parts.slice(0, 3).map(Number) : [100, 100, 100];
  }

  const mix = (a, b, amount) => a.map((v, i) => v + (b[i] - v) * amount);

  function updatePalette() {
    const styles = getComputedStyle(panel);
    const base = rgb(styles.getPropertyValue('--surface-soft'));
    const accent = rgb(styles.getPropertyValue('--accent'));
    const warm = rgb(styles.getPropertyValue('--warm'));
    ink = rgb(styles.getPropertyValue('--text'));
    const stops = [base, mix(base, accent, 0.25), accent, mix(warm, [255, 192, 108], 0.5), [255, 223, 160]];
    palette = Array.from({ length: 256 }, (_, index) => {
      const position = (index / 255) ** 0.68 * (stops.length - 1);
      const start = Math.min(stops.length - 2, Math.floor(position));
      return mix(stops[start], stops[start + 1], position - start).map(Math.round);
    });
    render();
  }

  function drawContours() {
    const scaleX = displayWidth / width;
    const scaleY = displayHeight / height;
    context.lineWidth = 0.65;
    context.strokeStyle = `rgba(${ink.join(',')},0.19)`;
    for (const level of [0.06, 0.13, 0.25, 0.42, 0.65, 0.84]) {
      context.beginPath();
      for (let y = 0; y < height - 1; y += 1) {
        for (let x = 0; x < width - 1; x += 1) {
          const i = y * width + x;
          const a = field[i];
          const b = field[i + 1];
          const c = field[i + width + 1];
          const d = field[i + width];
          if (Math.min(a, b, c, d) >= level || Math.max(a, b, c, d) < level) continue;
          const edges = [];
          if ((a >= level) !== (b >= level)) edges.push([x + (level - a) / (b - a), y]);
          if ((b >= level) !== (c >= level)) edges.push([x + 1, y + (level - b) / (c - b)]);
          if ((d >= level) !== (c >= level)) edges.push([x + (level - d) / (c - d), y + 1]);
          if ((a >= level) !== (d >= level)) edges.push([x, y + (level - a) / (d - a)]);
          // Four intersections form a saddle; either pairing gives two bounded isolines.
          for (let edge = 0; edge + 1 < edges.length; edge += 2) {
            context.moveTo((edges[edge][0] + 0.5) * scaleX, (edges[edge][1] + 0.5) * scaleY);
            context.lineTo((edges[edge + 1][0] + 0.5) * scaleX, (edges[edge + 1][1] + 0.5) * scaleY);
          }
        }
      }
      context.stroke();
    }
  }

  function render() {
    if (!palette.length) return;
    for (let i = 0; i < field.length; i += 1) {
      const color = palette[Math.max(0, Math.min(255, Math.round(field[i] * 255)))];
      const offset = i * 4;
      pixels.data[offset] = color[0];
      pixels.data[offset + 1] = color[1];
      pixels.data[offset + 2] = color[2];
      pixels.data[offset + 3] = 255;
    }
    textureContext.putImageData(pixels, 0, 0);
    context.imageSmoothingEnabled = true;
    context.drawImage(texture, 0, 0, displayWidth, displayHeight);
    // A quiet reference lattice makes the evolving geometry easier to read.
    context.fillStyle = `rgba(${ink.join(',')},0.13)`;
    for (let y = 1; y < 9; y += 1) {
      for (let x = 1; x < 14; x += 1) {
        context.beginPath();
        context.arc(x * displayWidth / 14, y * displayHeight / 9, 0.7, 0, Math.PI * 2);
        context.fill();
      }
    }
    drawContours();
    if (pointerInside || keyboardFocus || activePointer !== null) {
      const x = cursor.x * displayWidth;
      const y = cursor.y * displayHeight;
      context.strokeStyle = `rgba(${ink.join(',')},0.7)`;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(x, y, 11, 0, Math.PI * 2);
      context.moveTo(x - 15, y);
      context.lineTo(x - 8, y);
      context.moveTo(x + 8, y);
      context.lineTo(x + 15, y);
      context.moveTo(x, y - 15);
      context.lineTo(x, y - 8);
      context.moveTo(x, y + 8);
      context.lineTo(x, y + 15);
      context.stroke();
    }
  }

  function canAnimate() { return playing && visible && !document.hidden; }

  function frame(timestamp) {
    animation = 0;
    if (!canAnimate()) { lastFrame = 0; return; }
    const dt = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
    lastFrame = timestamp;
    if (activePointer !== null) addHeat(cursor.x, cursor.y, dt * 2.2);
    // Speed changes the number of stable solver steps, never the stability coefficient.
    stepCredit += dt * 120 * Number(speed.value);
    while (stepCredit >= 1) {
      diffuseHeat(field, scratch, width, height);
      [field, scratch] = [scratch, field];
      stepCredit -= 1;
    }
    render();
    animation = requestAnimationFrame(frame);
  }

  function syncAnimation() {
    if (canAnimate() && !animation) {
      lastFrame = 0;
      animation = requestAnimationFrame(frame);
    } else if (!canAnimate() && animation) {
      cancelAnimationFrame(animation);
      animation = 0;
      lastFrame = 0;
    }
    panel.dataset.playing = String(playing);
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.setAttribute('aria-label', playing ? 'Pause heat diffusion' : 'Play heat diffusion');
    toggleLabel.textContent = playing ? 'Pause' : 'Play';
    stateLabel.textContent = playing ? 'Diffusing' : 'Paused';
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    displayWidth = bounds.width;
    displayHeight = bounds.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);
    context.setTransform(canvas.width / displayWidth, 0, 0, canvas.height / displayHeight, 0, 0);
    render();
  }

  function pointerPosition(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
    };
  }

  canvas.addEventListener('pointerdown', event => {
    if (activePointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    activePointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
    cursor = pointerPosition(event);
    addHeat(cursor.x, cursor.y);
    render();
  });

  canvas.addEventListener('pointermove', event => {
    if (activePointer !== null && activePointer !== event.pointerId) return;
    const next = pointerPosition(event);
    if (activePointer !== null) {
      const distance = Math.hypot((next.x - cursor.x) * width, (next.y - cursor.y) * height);
      const count = Math.max(1, Math.ceil(distance / 2));
      for (let i = 1; i <= count; i += 1) {
        addHeat(cursor.x + (next.x - cursor.x) * i / count, cursor.y + (next.y - cursor.y) * i / count, 0.18);
      }
    }
    cursor = next;
    render();
  });

  function endPointer(event) {
    if (activePointer !== event.pointerId) return;
    activePointer = null;
    pointerInside = event.pointerType === 'mouse';
    render();
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('lostpointercapture', endPointer);
  canvas.addEventListener('pointerenter', () => { pointerInside = true; });
  canvas.addEventListener('pointerleave', () => { pointerInside = false; render(); });
  canvas.addEventListener('focus', () => { keyboardFocus = true; render(); });
  canvas.addEventListener('blur', () => { keyboardFocus = false; render(); });
  canvas.addEventListener('keydown', event => {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (directions[event.key]) {
      event.preventDefault();
      const [dx, dy] = directions[event.key];
      cursor.x = Math.max(0.02, Math.min(0.98, cursor.x + dx * 0.025));
      cursor.y = Math.max(0.03, Math.min(0.97, cursor.y + dy * 0.035));
      render();
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      addHeat(cursor.x, cursor.y);
      render();
    }
  });

  toggle.addEventListener('click', () => { playing = !playing; syncAnimation(); });
  panel.querySelector('[data-heat-reset]').addEventListener('click', () => { seed(); render(); });
  speed.addEventListener('input', () => { speedLabel.value = `${Number(speed.value)}×`; });
  document.addEventListener('visibilitychange', () => {
    activePointer = null;
    syncAnimation();
  });
  motion.addEventListener('change', event => {
    if (event.matches) { playing = false; syncAnimation(); }
  });
  const theme = new MutationObserver(updatePalette);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updatePalette);
  window.addEventListener('resize', resize, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible) activePointer = null;
      syncAnimation();
    }, { threshold: 0 }).observe(canvas);
  }

  panel.hidden = false;
  seed();
  updatePalette();
  resize();
  syncAnimation();
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-heat-experiment]').forEach(initHeatExperiment);
}
