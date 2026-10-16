(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;

  const darkPreference = window.matchMedia('(prefers-color-scheme: dark)');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let desiredTheme;
  let origin;
  let running = false;
  let activeTransition = null;
  let activeAnimation = null;

  function currentTheme() {
    const theme = root.getAttribute('data-theme');
    return theme === 'dark' || theme === 'light'
      ? theme
      : darkPreference.matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    try {
      window.localStorage.setItem('theme', theme);
    } catch (_) {
      // Private browsing and storage restrictions must not disable the toggle.
    }
  }

  function finishActiveTransition() {
    if (activeTransition) activeTransition.skipTransition();
    if (activeAnimation) activeAnimation.cancel();
  }

  async function revealTheme(theme, center) {
    if (motionPreference.matches ||
        typeof document.startViewTransition !== 'function' ||
        typeof root.animate !== 'function') {
      applyTheme(theme);
      return;
    }

    const radius = Math.hypot(
      Math.max(center.x, window.innerWidth - center.x),
      Math.max(center.y, window.innerHeight - center.y)
    );
    let transition;
    root.classList.add('theme-transition');

    try {
      transition = document.startViewTransition(() => applyTheme(theme));
      activeTransition = transition;
      await transition.ready;

      if (desiredTheme !== theme || motionPreference.matches) {
        transition.skipTransition();
      } else {
        activeAnimation = root.animate(
          {
            clipPath: [
              `circle(0px at ${center.x}px ${center.y}px)`,
              `circle(${radius}px at ${center.x}px ${center.y}px)`
            ]
          },
          {
            duration: 640,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
            fill: 'both'
          }
        );
        await activeAnimation.finished;
      }
    } catch (_) {
      // A skipped snapshot or unsupported animation still applies the theme.
      if (transition) transition.skipTransition();
      applyTheme(theme);
    } finally {
      if (transition) await transition.finished.catch(() => {});
      if (activeAnimation) activeAnimation.cancel();
      activeAnimation = null;
      activeTransition = null;
      root.classList.remove('theme-transition');
    }
  }

  async function updateTheme() {
    running = true;
    try {
      // Keep rapid clicks in order without overlapping document snapshots.
      while (currentTheme() !== desiredTheme) {
        await revealTheme(desiredTheme, origin);
      }
    } finally {
      running = false;
    }
  }

  toggle.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
  toggle.addEventListener('click', () => {
    const previous = running ? desiredTheme : currentTheme();
    desiredTheme = previous === 'dark' ? 'light' : 'dark';
    const bounds = toggle.getBoundingClientRect();
    origin = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };

    if (running) {
      finishActiveTransition();
    } else {
      void updateTheme();
    }
  });

  darkPreference.addEventListener('change', () => {
    if (!root.hasAttribute('data-theme')) {
      toggle.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
    }
  });
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) finishActiveTransition();
  });
})();
