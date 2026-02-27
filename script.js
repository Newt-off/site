'use strict';

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

function debounce(fn, delay = 100) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

function throttle(fn, limit = 16) {
  let inThrottle = false;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function animateCounter(el, target, duration = 1500) {
  if (!el) return;
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const start = performance.now();
  function update(time) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = Math.round(target * eased);
    el.textContent = prefix + current + suffix;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = prefix + target + suffix;
  }
  requestAnimationFrame(update);
}

const State = {
  isLoaded: false,
  scrollY: 0,
  mouseX: 0,
  mouseY: 0,
  cursorX: 0,
  cursorY: 0,
  followerX: 0,
  followerY: 0,
  activeTab: 'bio',
  mobileMenuOpen: false,
  isDesktop: window.innerWidth > 1024,
  set(key, value) { this[key] = value; }
};

const Loader = {
  el: null,
  progressBar: null,
  percentEl: null,
  progress: 0,

  init() {
    this.el = $('#loader');
    this.progressBar = $('#loaderProgress');
    this.percentEl = $('#loaderPercent');
    if (!this.el) { this.onComplete(); return; }
    document.body.classList.add('no-scroll');

    // Bouton passer
    const skipBtn = $('#loaderSkip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.updateProgress(100);
        setTimeout(() => this.onComplete(), 200);
      });
    }

    this.animate();
  },

  animate() {
    const duration = 1800;
    const start = performance.now();
    const update = (time) => {
      const elapsed = time - start;
      const rawProgress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - rawProgress, 3);
      this.progress = Math.round(eased * 85);
      this.updateProgress(this.progress);
      if (rawProgress < 1) {
        this.animFrame = requestAnimationFrame(update);
      } else {
        if (document.readyState === 'complete') this.finishLoading();
        else window.addEventListener('load', () => this.finishLoading());
      }
    };
    this.animFrame = requestAnimationFrame(update);
  },

  finishLoading() {
    if (this.progress >= 100) return;
    const remaining = 100 - this.progress;
    const duration = 400;
    const start = performance.now();
    const startProgress = this.progress;
    const update = (time) => {
      const elapsed = time - start;
      const rawProgress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - rawProgress, 2);
      const newProgress = Math.round(startProgress + remaining * eased);
      this.progress = newProgress;
      this.updateProgress(newProgress);
      if (rawProgress < 1) requestAnimationFrame(update);
      else { this.updateProgress(100); setTimeout(() => this.onComplete(), 300); }
    };
    requestAnimationFrame(update);
  },

  updateProgress(value) {
    if (this.progressBar) this.progressBar.style.width = `${value}%`;
    if (this.percentEl) this.percentEl.textContent = `${value}%`;
  },

  onComplete() {
    if (this.el) this.el.classList.add('loaded');
    document.body.classList.remove('no-scroll');
    document.body.classList.add('site-loaded');
    State.set('isLoaded', true);
    App.onLoaded();
  }
};

const Cursor = {
  el: null,
  follower: null,
  isVisible: false,

  init() {
    this.el = $('#cursor');
    this.follower = $('#cursorFollower');
    if (!this.el || !this.follower) return;
    if (window.matchMedia('(hover: none)').matches) {
      this.el.style.display = 'none';
      this.follower.style.display = 'none';
      return;
    }
    this.bindEvents();
    this.loop();
  },

  bindEvents() {
    document.addEventListener('mousemove', (e) => {
      State.set('mouseX', e.clientX);
      State.set('mouseY', e.clientY);
      if (!this.isVisible) {
        this.isVisible = true;
        this.el.style.opacity = '1';
        this.follower.style.opacity = '1';
      }
    });
    document.addEventListener('mouseleave', () => {
      this.isVisible = false;
      this.el.style.opacity = '0';
      this.follower.style.opacity = '0';
    });
    $$('a, button, [data-cursor="hover"]').forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
  },

  loop() {
    State.cursorX = lerp(State.cursorX, State.mouseX, 0.85);
    State.cursorY = lerp(State.cursorY, State.mouseY, 0.85);
    State.followerX = lerp(State.followerX, State.mouseX, 0.12);
    State.followerY = lerp(State.followerY, State.mouseY, 0.12);
    if (this.el) this.el.style.transform = `translate(${State.cursorX}px, ${State.cursorY}px) translate(-50%, -50%)`;
    if (this.follower) this.follower.style.transform = `translate(${State.followerX}px, ${State.followerY}px) translate(-50%, -50%)`;
    requestAnimationFrame(() => this.loop());
  }
};

const Navbar = {
  el: null,
  burger: null,
  mobileMenu: null,
  links: null,
  sections: [],

  init() {
    this.el = $('#navbar');
    this.burger = $('#navBurger');
    this.mobileMenu = $('#mobileMenu');
    this.links = $$('.nav-link');
    if (!this.el) return;
    this.collectSections();
    this.bindEvents();
    this.onScroll();
  },

  collectSections() {
    this.sections = this.links
      .map(link => {
        const id = link.dataset.section;
        return id ? { link, el: $(`#${id}`) } : null;
      })
      .filter(Boolean);
  },

  bindEvents() {
    window.addEventListener('scroll', throttle(() => this.onScroll(), 50));
    if (this.burger) this.burger.addEventListener('click', () => this.toggleMobile());
    $$('.mobile-link').forEach(link => {
      link.addEventListener('click', () => { if (State.mobileMenuOpen) this.toggleMobile(); });
    });
  },

  onScroll() {
    const scrollY = window.scrollY;
    State.set('scrollY', scrollY);
    if (scrollY > 60) this.el.classList.add('scrolled');
    else this.el.classList.remove('scrolled');
    this.updateActiveLink(scrollY);
    BackToTop.update(scrollY);
    ScrollProgress.update();
  },

  updateActiveLink(scrollY) {
    const windowHeight = window.innerHeight;
    let activeSection = null;
    this.sections.forEach(({ link, el }) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < windowHeight * 0.5 && rect.bottom > 0) activeSection = link;
    });
    this.links.forEach(link => link.classList.remove('active'));
    if (activeSection) activeSection.classList.add('active');
  },

  toggleMobile() {
    State.set('mobileMenuOpen', !State.mobileMenuOpen);
    if (State.mobileMenuOpen) {
      this.burger.classList.add('open');
      this.mobileMenu.classList.add('open');
      document.body.classList.add('no-scroll');
    } else {
      this.burger.classList.remove('open');
      this.mobileMenu.classList.remove('open');
      document.body.classList.remove('no-scroll');
    }
  }
};

const ScrollProgress = {
  el: null,
  init() {
    this.el = document.createElement('div');
    this.el.className = 'scroll-progress';
    document.body.appendChild(this.el);
  },
  update() {
    if (!this.el) return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    this.el.style.width = `${clamp(progress, 0, 100)}%`;
  }
};

const BackToTop = {
  el: null,
  init() {
    this.el = $('#backTop');
    if (!this.el) return;
    this.el.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  },
  update(scrollY) {
    if (!this.el) return;
    if (scrollY > 400) this.el.classList.add('visible');
    else this.el.classList.remove('visible');
  }
};

const RevealAnimations = {
  observer: null,
  init() {
    const elements = $$('.reveal-up, .reveal-left, .reveal-right');
    if (elements.length === 0) return;
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          this.observer.unobserve(entry.target);
        }
      });
    }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    elements.forEach(el => this.observer.observe(el));
  }
};

const Tabs = {
  init() {
    const buttons = $$('.tab-btn');
    const contents = $$('.tab-content');
    if (buttons.length === 0) return;
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        State.set('activeTab', tabId);
        buttons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
        contents.forEach(c => c.classList.toggle('active', c.id === `tab-${tabId}`));
        if (tabId === 'skills') setTimeout(() => SkillBars.animate(), 100);
      });
    });
  }
};

const SkillBars = {
  bars: [],
  animated: false,
  init() { this.bars = $$('.skill-fill'); },
  animate() {
    if (this.animated) return;
    this.animated = true;
    this.bars.forEach((bar, i) => {
      const width = bar.dataset.width || '0';
      setTimeout(() => { bar.style.width = `${width}%`; }, i * 80);
    });
  }
};

const Counters = {
  els: [],
  statBars: [],
  observer: null,
  animated: false,

  init() {
    this.els = $$('.stat-number[data-target]');
    this.statBars = $$('.stat-bar-fill[data-width]');
    if (this.els.length === 0) return;
    const statsSection = $('#stats');
    if (!statsSection) return;
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.animated) {
          this.animated = true;
          this.runAnimations();
          this.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    this.observer.observe(statsSection);
  },

  runAnimations() {
    this.els.forEach((el, i) => {
      const target = parseInt(el.dataset.target, 10) || 0;
      const duration = target >= 1000 ? 2200 : target >= 100 ? 1800 : 1400;
      setTimeout(() => animateCounter(el, target, duration), i * 120);
    });
    this.statBars.forEach((bar, i) => {
      const width = bar.dataset.width || '0';
      setTimeout(() => { bar.style.width = `${width}%`; }, 300 + i * 100);
    });
  }
};

const HeroNumber = {
  el: null,
  init() {
    this.el = $('#heroNumber');
    if (!this.el) return;
    let count = 1;
    const interval = setInterval(() => {
      this.el.textContent = String(count).padStart(3, '0');
      count++;
      if (count > 5) { clearInterval(interval); this.el.textContent = '001'; }
    }, 100);
  }
};

const TypingEffect = {
  el: null,
  phrases: ['Le Phénomène', "L'Inégalable", 'Le GOAT', 'Fortnite'],
  currentPhraseIndex: 0,
  currentCharIndex: 0,
  isDeleting: false,
  typingSpeed: 100,
  deletingSpeed: 60,
  pauseDuration: 2500,

  init() {
    this.el = $('.title-sub');
    if (!this.el) return;
    setTimeout(() => this.type(), 3000);
  },

  type() {
    const currentPhrase = this.phrases[this.currentPhraseIndex];
    if (this.isDeleting) {
      this.currentCharIndex--;
      this.el.textContent = currentPhrase.substring(0, this.currentCharIndex);
    } else {
      this.currentCharIndex++;
      this.el.textContent = currentPhrase.substring(0, this.currentCharIndex);
    }
    let speed = this.isDeleting ? this.deletingSpeed : this.typingSpeed;
    if (!this.isDeleting && this.currentCharIndex === currentPhrase.length) {
      speed = this.pauseDuration;
      this.isDeleting = true;
    } else if (this.isDeleting && this.currentCharIndex === 0) {
      this.isDeleting = false;
      this.currentPhraseIndex = (this.currentPhraseIndex + 1) % this.phrases.length;
      speed = 400;
    }
    setTimeout(() => this.type(), speed);
  }
};

const ParallaxHero = {
  init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const elements = [
      { el: $('.hero-gradient'), speed: 0.3 },
      { el: $('.hero-badge'), speed: 0.15 },
      { el: $('.hero-number'), speed: 0.2 }
    ].filter(item => item.el !== null);
    if (elements.length === 0) return;
    window.addEventListener('scroll', throttle(() => {
      const scrollY = window.scrollY;
      if (scrollY > window.innerHeight * 1.5) return;
      elements.forEach(({ el, speed }) => {
        if (el) el.style.transform = `translateY(${scrollY * speed}px)`;
      });
    }, 16));
  }
};

const SmoothScroll = {
  init() {
    $$('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#') return;
        const target = $(href);
        if (!target) return;
        e.preventDefault();
        const navHeight = Navbar.el ? Navbar.el.offsetHeight : 72;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navHeight, behavior: 'smooth' });
      });
    });
  }
};

const ResizeManager = {
  init() {
    window.addEventListener('resize', debounce(() => {
      const isDesktop = window.innerWidth > 1024;
      State.set('isDesktop', isDesktop);
      if (isDesktop && State.mobileMenuOpen) Navbar.toggleMobile();
    }, 200));
  }
};

const Accessibility = {
  init() {
    const region = document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.id = 'liveRegion';
    document.body.appendChild(region);

    document.addEventListener('keydown', () => document.body.classList.add('keyboard-nav'));
    document.addEventListener('mousedown', () => document.body.classList.remove('keyboard-nav'));
  }
};

const App = {
  init() {
    Loader.init();
  },

  onLoaded() {
    Cursor.init();
    Navbar.init();
    ScrollProgress.init();
    BackToTop.init();
    SmoothScroll.init();
    RevealAnimations.init();
    Tabs.init();
    SkillBars.init();
    Counters.init();
    HeroNumber.init();
    TypingEffect.init();
    ParallaxHero.init();
    Accessibility.init();
    ResizeManager.init();

    // Refresh cursor targets
    $$('a, button, .tab-btn').forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    window.dispatchEvent(new Event('scroll'));
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

/* ============================
   FAQ ACCORDION
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Ferme tous les autres
      faqItems.forEach(i => {
        i.classList.remove('open');
        const b = i.querySelector('.faq-question');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      // Toggle celui cliqué
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
});

/* ============================
   NAV DROPDOWN
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  const dropdown = document.querySelector('.nav-dropdown');
  if (!dropdown) return;

  // Ferme au clic sur un lien du dropdown
  document.querySelectorAll('.nav-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      dropdown.classList.remove('open');
    });
  });

  // Ferme si on clique ailleurs
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });

  // Toggle au clic sur le bouton
  const btn = dropdown.querySelector('.nav-more-btn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
  }
});

/* ============================
   HERO PARTICLES
   ============================ */
(function() {
  const canvas = document.getElementById('heroParticles');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animFrame;
  let W, H;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function randomBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  function createParticle() {
    return {
      x: randomBetween(0, W),
      y: randomBetween(0, H),
      r: randomBetween(0.8, 2.2),
      alpha: randomBetween(0.1, 0.55),
      speedX: randomBetween(-0.18, 0.18),
      speedY: randomBetween(-0.35, -0.08),
      pulse: randomBetween(0, Math.PI * 2),
      pulseSpeed: randomBetween(0.008, 0.022),
    };
  }

  function init() {
    resize();
    const count = Math.min(Math.floor((W * H) / 9000), 100);
    particles = Array.from({ length: count }, createParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    particles.forEach(p => {
      p.pulse += p.pulseSpeed;
      const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 168, 83, ${currentAlpha})`;
      ctx.fill();

      p.x += p.speedX;
      p.y += p.speedY;

      // Reboucle en bas si sorti en haut
      if (p.y < -5) { p.y = H + 5; p.x = randomBetween(0, W); }
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
    });

    animFrame = requestAnimationFrame(draw);
  }

  // Démarrage après chargement
  window.addEventListener('load', () => {
    init();
    draw();
  });

  window.addEventListener('resize', () => {
    resize();
  });
})();

/* ============================
   THEME TOGGLE (clair/sombre)
   ============================ */
(function() {
  const btn    = document.getElementById('themeToggle');
  const icon   = document.getElementById('themeIcon');
  if (!btn) return;

  // Récupère la préférence sauvegardée
  const saved = localStorage.getItem('newt_theme');
  if (saved === 'light') {
    document.body.classList.add('light-mode');
    icon.className = 'fa-solid fa-moon';
  }

  btn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    icon.className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    localStorage.setItem('newt_theme', isLight ? 'light' : 'dark');

    // Petite animation du bouton
    btn.style.transform = 'rotate(360deg) scale(1.2)';
    setTimeout(() => { btn.style.transform = ''; }, 400);
  });
})();

/* FIN */
