// Scripts for the home page (index.astro)
// - Fade-in animation on scroll for sections
// - Making-of video: restore poster after end
// - Fireflies animation in Ángeles section

// Fade-in sections when entering viewport
const initFadeSections = () => {
  const sections = Array.from(document.querySelectorAll('.fade-section'));
  if (!sections.length) {
    return () => {};
  }

  // Initial state
  sections.forEach((section) => {
    if (section.hasAttribute('data-initial-visible') || section.classList.contains('fade-init')) {
      return;
    }
    section.classList.add('fade-init');
  });

  if ('IntersectionObserver' in window) {
    const observer = new window.IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );
    sections.forEach((section) => {
      if (section.hasAttribute('data-manual-reveal')) return;
      observer.observe(section);
    });
    return () => observer.disconnect();
  }

  // Fallback: reveal immediately if IO not supported
  sections.forEach((section) => {
    if (section.hasAttribute('data-manual-reveal')) return;
    section.classList.add('fade-in');
  });
  return () => {};
};

// Ensure the elenco hero stays hidden until the visitor starts scrolling toward it
const initElencoHeroScrollReveal = () => {
  const hero = document.querySelector('#elenco.fade-section');
  if (!hero) return () => {};

  const revealIfNeeded = () => {
    if (hero.classList.contains('fade-in')) return true;
    if (window.scrollY <= 0) return false;

    const rect = hero.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.9) {
      hero.classList.add('fade-in');
      return true;
    }
    return false;
  };

  const immediateReveal = revealIfNeeded();
  if (immediateReveal) return () => {};

  const onScroll = () => {
    if (hero.classList.contains('fade-in')) {
      window.removeEventListener('scroll', onScroll);
      return;
    }

    if (revealIfNeeded()) {
      window.removeEventListener('scroll', onScroll);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
};

// Restore poster on the making-of video after it ends
const initMakingOfPosterReset = () => {
  const video = document.querySelector('.makingof-video');
  if (!(video instanceof HTMLVideoElement)) {
    return () => {};
  }

  const onEnded = () => {
    video.pause();
    video.currentTime = 0;
    // Reload to show poster again
    video.load();
  };

  video.addEventListener('ended', onEnded);
  return () => video.removeEventListener('ended', onEnded);
};

// Fireflies: smooth, continuous movement with mild repulsion
const initFireflies = () => {
  const reduce =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = document.querySelector('#angeles-del-proyecto');
  if (!container) return () => {};

  // Use existing elements; if missing, create up to 6
  const baseSizes = [10, 8, 7, 6, 5, 4];
  const els = Array.from(container.querySelectorAll('.libelula'));
  for (let i = 0; i < baseSizes.length; i++) {
    let el = els[i];
    if (!el) {
      el = document.createElement('span');
      el.className = 'libelula';
      container.appendChild(el);
      els[i] = el;
    }
    el.style.width = baseSizes[i] + 'px';
    el.style.height = baseSizes[i] + 'px';
  }

  // Helpers
  const rand = (min, max) => Math.random() * (max - min) + min;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const fireflies = els.map((el) => {
    return {
      el,
      speed: rand(0.18, 0.45),
      // incommensurable frequencies to avoid visible cycles
      w1: rand(0.55, 1.0),
      w2: rand(0.75, 1.25),
      w3: rand(0.6, 1.15),
      w4: rand(0.8, 1.4),
      p1: rand(0, Math.PI * 2),
      p2: rand(0, Math.PI * 2),
      p3: rand(0, Math.PI * 2),
      p4: rand(0, Math.PI * 2),
      ax1: rand(40, 58),
      ax2: rand(10, 22),
      ay1: rand(32, 48),
      ay2: rand(8, 20),
      cx: rand(48, 52),
      cy: rand(48, 52),
      driftx: rand(-0.02, 0.02),
      drifty: rand(-0.02, 0.02),
      t0: rand(0, 1000),
      x: 0,
      y: 0,
    };
  });

  // Static positioning if reduced motion
  if (reduce) {
    fireflies.forEach((f) => {
      const x = clamp(f.cx + f.ax1 * Math.sin(f.p1) + f.ax2 * Math.sin(f.p2), 3, 97);
      const y = clamp(f.cy + f.ay1 * Math.cos(f.p3) + f.ay2 * Math.sin(f.p4), 3, 97);
      f.el.style.left = x + '%';
      f.el.style.top = y + '%';
    });
    return () => {};
  }

  const minDist = 7; // minimum separation between fireflies (% of container)

  let start = performance.now();
  let running = true;
  let rafId = 0;

  function frame(now) {
    if (!running) return;
    const tsec = (now - start) / 1000;

    // base positions
    fireflies.forEach((f) => {
      const t = (tsec + f.t0) * f.speed;
      let x =
        f.cx +
        f.ax1 * Math.sin(t * f.w1 + f.p1) +
        f.ax2 * Math.sin(t * f.w2 + f.p2) +
        t * f.driftx;
      let y =
        f.cy +
        f.ay1 * Math.cos(t * f.w3 + f.p3) +
        f.ay2 * Math.sin(t * f.w4 + f.p4) +
        t * f.drifty;
      f.x = x;
      f.y = y;
    });

    // mild repulsion to keep them apart
    for (let i = 0; i < fireflies.length; i++) {
      for (let j = i + 1; j < fireflies.length; j++) {
        const a = fireflies[i];
        const b = fireflies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const d = Math.sqrt(d2) || 0.0001;
        if (d < minDist) {
          const push = ((minDist - d) / minDist) * 0.6;
          const ux = dx / d;
          const uy = dy / d;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }

    const minB = -12,
      maxB = 112; // allow entering/leaving slightly
    fireflies.forEach((f) => {
      const x = clamp(f.x, minB, maxB);
      const y = clamp(f.y, minB, maxB);
      f.el.style.left = x + '%';
      f.el.style.top = y + '%';
    });

    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  return () => {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
  };
};

// Purple glitter sparkles that follow the cursor over the elenco hero gallery
const initHeroSparkles = () => {
  const gallery = document.querySelector('.home-hero-gallery');
  if (!gallery) return () => {};

  const reduce =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return () => {};

  let lastTime = 0;
  const maxParticles = 120;

  const spawn = (x, y) => {
    const count = 2 + Math.floor(Math.random() * 2); // 2-3 sparkles per event
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'hero-sparkle';
      const size = 3 + Math.random() * 6; // 3-9px
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.left = x + 'px';
      s.style.top = y + 'px';

      // initial state
      s.style.opacity = '0.9';
      s.style.transform = 'translate(-50%, -50%) scale(1)';
      // transition
      const dur = 550 + Math.random() * 500; // 550-1050ms
      s.style.transition = `transform ${dur}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity ${dur}ms ease-out`;

      // insert above cards
      gallery.appendChild(s);

      // drift values
      const angle = Math.random() * Math.PI * 2;
      const radius = 16 + Math.random() * 28; // px drift
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius - (10 + Math.random() * 20); // bias upward

      // run on next frame
      requestAnimationFrame(() => {
        s.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${0.6 + Math.random() * 0.2})`;
        s.style.opacity = '0';
      });

      // cleanup
      window.setTimeout(() => {
        s.remove();
      }, dur + 60);
    }

    // cap number of particles
    const all = gallery.querySelectorAll('.hero-sparkle');
    if (all.length > maxParticles) {
      const excess = all.length - maxParticles;
      for (let i = 0; i < excess; i++) all[i].remove();
    }
  };

  const onMove = (e) => {
    const rect = gallery.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();
    if (now - lastTime < 24) return; // throttle ~40fps
    lastTime = now;
    spawn(x, y);
  };

  const onEnter = () => gallery.classList.add('sparkle-active');
  const onLeave = () => {
    gallery.classList.remove('sparkle-active');
  };

  gallery.addEventListener('pointermove', onMove);
  gallery.addEventListener('pointerenter', onEnter);
  gallery.addEventListener('pointerleave', onLeave);

  return () => {
    gallery.removeEventListener('pointermove', onMove);
    gallery.removeEventListener('pointerenter', onEnter);
    gallery.removeEventListener('pointerleave', onLeave);
  };
};

const teardowns = new Set();

const register = (fn) => {
  if (typeof fn === 'function') {
    teardowns.add(fn);
  }
};

const destroy = () => {
  teardowns.forEach((fn) => {
    try {
      fn();
    } catch (_) {
      // noop
    }
  });
  teardowns.clear();
};

const boot = () => {
  destroy();
  register(initFadeSections());
  register(initElencoHeroScrollReveal());
  register(initMakingOfPosterReset());
  register(initFireflies());
  register(initHeroSparkles());
};

// Boot once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

// Handle client-side transitions and bfcache restores
document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', destroy);

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    boot();
  }
});

window.addEventListener('pagehide', destroy);
