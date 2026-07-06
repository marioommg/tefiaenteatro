// Mantener velocidad constante en px/s, con ajustes para móvil.
function initCredits(){
  const getBaseSpeed = () => {
    const w = window.innerWidth || 1024;
    if (w < 480) return 35;
    if (w < 768) return 35;
    if (w < 1200) return 35;
    return 28;
  };

  let lastWidth = -1;
  let lastMeasuredHeight = -1;
  
  function parseMs(val) {
    if (!val) return 0;
    if (val.endsWith('ms')) return parseFloat(val);
    if (val.endsWith('s')) return parseFloat(val) * 1000;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }

  function setDurations(force = false, preserveProgress = true) {
    const currentW = window.innerWidth || 0;
    if (!force && lastWidth !== -1 && Math.abs(currentW - lastWidth) < 8) return;
    lastWidth = currentW;

    const base = getBaseSpeed();
    const tracks = document.querySelectorAll('.track');
    tracks.forEach((track) => {
      let progress = 0;
      let oldMs = 0;
      if (preserveProgress && track.getAnimations) {
        try {
          const cs = getComputedStyle(track);
          const durs = (cs.animationDuration || '').split(',');
          oldMs = parseMs((durs[0] || '').trim());
          const anim = track.getAnimations().find((a) => {
            const name = (a.animationName || '').toString();
            return name === 'scroll-left' || name === 'scroll-right' || true;
          }) || track.getAnimations()[0];
          if (anim && typeof anim.currentTime === 'number' && oldMs > 0) {
            progress = (anim.currentTime % oldMs) / oldMs;
          }
        } catch {}
      }

      const factor = parseFloat(track.getAttribute('data-speed') || '1');
      const distancePx = track.scrollWidth / 2;
      const durationSec = distancePx / (base * factor);
      track.style.setProperty('--dist', `${distancePx}px`);
      track.style.animationDuration = `${durationSec}s`;

      if (preserveProgress && track.getAnimations) {
        try {
          const anim = track.getAnimations()[0];
          if (anim && !isNaN(progress)) {
            const newMs = durationSec * 1000;
            requestAnimationFrame(() => {
              try { anim.currentTime = progress * newMs; } catch {}
            });
          }
        } catch {}
      }
    });

    tracks.forEach((track) => {
      track.style.animationPlayState = 'running';
    });
  }

  function getTargetRowHeight() {
    const w = window.innerWidth || 1024;
    if (w < 480) return 54;
    if (w < 768) return 60;
    if (w < 1200) return 66;
    return 72;
  }

  function getOverscan() {
    return 0;
  }

  function fillRowsToCover() {
    const rowsEl = document.getElementById('rows');
    if (!rowsEl) return;
    const current = Array.from(rowsEl.querySelectorAll('.row'));
    if (current.length === 0) return;

    const containerHeight = rowsEl.clientHeight || rowsEl.getBoundingClientRect().height || 0;
    const targetH = getTargetRowHeight();
    const overscan = getOverscan();
    const needed = Math.max(current.length, Math.ceil(containerHeight / Math.max(1, targetH)) + overscan);

    if (needed <= current.length) {
      rowsEl.style.setProperty('--rows', `${current.length}`);
      return;
    }

    function getTailRunInfo() {
      const items = rowsEl.querySelectorAll('.row');
      let streakDir = null;
      let streak = 0;
      for (let k = items.length - 1; k >= 0; k--) {
        const t = items[k].querySelector('.track');
        if (!t) break;
        const dir = t.classList.contains('reverse');
        if (streakDir === null) { streakDir = dir; streak = 1; }
        else if (dir === streakDir) { streak++; }
        else { break; }
      }
      return { streakDir, streak };
    }

    let { streakDir, streak } = getTailRunInfo();
    const MAX_RUN = 3;

    for (let i = current.length; i < needed; i++) {
      const src = current[i % current.length];
      const clone = src.cloneNode(true);
      let track = null;
      if (clone && typeof clone.querySelector === 'function') {
        track = clone.querySelector('.track');
      }
      if (track) {
        let dirReverse = Math.random() < 0.5;
        if (streakDir !== null && dirReverse === streakDir) {
          streak += 1;
          if (streak > MAX_RUN) { dirReverse = !streakDir; streak = 1; }
        } else {
          streakDir = dirReverse; streak = 1;
        }
        track.classList.toggle('reverse', !!dirReverse);

        const base = parseFloat(track.getAttribute('data-speed') || '1') || 1;
        const jitter = 1 + (Math.random() * 0.4 - 0.2);
        const newSpeed = Math.max(0.7, Math.min(1.3, base * jitter));
        track.setAttribute('data-speed', newSpeed.toFixed(2));
        track.style.animationPlayState = 'paused';
      }
      rowsEl.appendChild(clone);
    }

    rowsEl.style.setProperty('--rows', `${needed}`);
  }

  const init = () => {
    fillRowsToCover();
    setDurations(true, false);
  };

  // If already initialized once in this session, just refresh calculations and resume animations.
  // This handles navigating away and returning via bfcache or Astro client-side swaps.
  if (window.__creditsRowsInitDone) {
    try {
      init();
      setDurations(true, true);
    } catch {}
    return;
  }
  window.__creditsRowsInitDone = true;

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    requestAnimationFrame(init);
  } else {
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(init));
  }

  window.addEventListener('load', () => {
    fillRowsToCover();
    setDurations(true, true);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { fillRowsToCover(); setDurations(true, true); }).catch(() => {});
  }

  const isTouchDevice = matchMedia('(hover: none) and (pointer: coarse)').matches;

  let resizeRaf = 0;
  let resizeTimer = 0;
  function handleResize() {
    const rowsEl = document.getElementById('rows');
    const h = rowsEl ? (rowsEl.clientHeight || rowsEl.getBoundingClientRect().height || 0) : 0;
    const w = window.innerWidth || 0;
    const heightChanged = lastMeasuredHeight < 0 || Math.abs(h - lastMeasuredHeight) > 12;
    const widthChanged = lastWidth < 0 || Math.abs(w - lastWidth) > 8;
    if (!heightChanged && !widthChanged) return;
    lastMeasuredHeight = h;
    lastWidth = w;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeRaf = requestAnimationFrame(() => {
        fillRowsToCover();
        setDurations(false, true);
      });
    }, 180);
  }

  window.addEventListener('resize', handleResize, { passive: true });

  window.addEventListener('orientationchange', () => {
    const tracks = document.querySelectorAll('.track');
    tracks.forEach((t) => (t.style.animationPlayState = 'paused'));
    setTimeout(() => { fillRowsToCover(); setDurations(true, false); }, 150);
  });
}

if (document.readyState !== "loading") initCredits();
else document.addEventListener("DOMContentLoaded", initCredits);

// Ensure animations resume after back/forward cache restores
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    initCredits();
  }
});

// Cooperate with Astro client-side navigations (if enabled)
document.addEventListener('astro:page-load', () => {
  initCredits();
});
document.addEventListener('astro:before-swap', () => {
  // Pause during swap to avoid jank, will be resumed on page-load/init
  const tracks = document.querySelectorAll('.track');
  tracks.forEach((t) => (t.style.animationPlayState = 'paused'));
});

// Resume when tab becomes visible again (some browsers pause CSS animations in background)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    initCredits();
  }
});
