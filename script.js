
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


function mapRange(val, inMin, inMax, outMin, outMax) {
  return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
}


function lerp(start, end, amount) {
  return start + (end - start) * amount;
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function isInViewport(el, offset = 0.15) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  return rect.top < windowHeight * (1 - offset) && rect.bottom > 0;
}


function animateCounter(el, target, duration = 1500, suffix = '') {
  if (!el) return;
  const start = performance.now();
  const startVal = 0;

  function update(time) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out expo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = Math.round(startVal + (target - startVal) * eased);
    el.textContent = current;
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = target;
    }
  }
  requestAnimationFrame(update);
}



const State = {
  isLoaded: false,
  ageVerified: false,
  scrollY: 0,
  scrollProgress: 0,
  mouseX: 0,
  mouseY: 0,
  cursorX: 0,
  cursorY: 0,
  followerX: 0,
  followerY: 0,
  activeTab: 'bio',
  sliderIndex: 0,
  totalSlides: 0,
  countersAnimated: false,
  skillsAnimated: false,
  mobileMenuOpen: false,
  isDesktop: window.innerWidth > 1024,

  set(key, value) {
    this[key] = value;
  }
};


const AgeGate = {
  el: null,
  yesBtn: null,
  noBtn: null,
  storageKey: 'tamer_age_verified',

  init() {
    this.el = $('#ageGate');
    this.yesBtn = $('#ageYes');
    this.noBtn = $('#ageNo');

    if (!this.el) return;


    const verified = sessionStorage.getItem(this.storageKey);
    if (verified === 'true') {
      this.hide();
      return;
    }


    document.body.classList.add('no-scroll');
    this.bindEvents();
  },

  bindEvents() {
    if (this.yesBtn) {
      this.yesBtn.addEventListener('click', () => this.verify());
    }
    if (this.noBtn) {
      this.noBtn.addEventListener('click', () => this.reject());
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
      }
    });
  },

  verify() {
    sessionStorage.setItem(this.storageKey, 'true');
    State.set('ageVerified', true);
    this.hide();
    document.body.classList.remove('no-scroll');
  },

  reject() {
    window.location.href = 'https://www.google.com';
  },

  hide() {
    if (!this.el) return;
    this.el.classList.add('hidden');
    State.set('ageVerified', true);
  }
};


const Loader = {
  el: null,
  progressBar: null,
  percentEl: null,
  progress: 0,
  animFrame: null,

  init() {
    this.el = $('#loader');
    this.progressBar = $('#loaderProgress');
    this.percentEl = $('#loaderPercent');

    if (!this.el) {
      this.onComplete();
      return;
    }

    document.body.classList.add('no-scroll');
    this.animate();
  },

  animate() {
    const targetProgress = State.ageVerified ? 100 : 85;
    const duration = 1800;
    const start = performance.now();

    const update = (time) => {
      const elapsed = time - start;
      const rawProgress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - rawProgress, 3);
      this.progress = Math.round(eased * targetProgress);

      this.updateProgress(this.progress);

      if (rawProgress < 1) {
        this.animFrame = requestAnimationFrame(update);
      } else {
        this.progress = targetProgress;
        this.updateProgress(targetProgress);

        if (targetProgress === 100) {
          setTimeout(() => this.onComplete(), 300);
        } else {
          if (document.readyState === 'complete') {
            this.finishLoading();
          } else {
            window.addEventListener('load', () => this.finishLoading());
          }
        }
      }
    };

    requestAnimationFrame(update);
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

      if (rawProgress < 1) {
        requestAnimationFrame(update);
      } else {
        this.updateProgress(100);
        setTimeout(() => this.onComplete(), 300);
      }
    };

    requestAnimationFrame(update);
  },

  updateProgress(value) {
    if (this.progressBar) {
      this.progressBar.style.width = `${value}%`;
    }
    if (this.percentEl) {
      this.percentEl.textContent = `${value}%`;
    }
  },

  onComplete() {
    if (this.el) {
      this.el.classList.add('loaded');
    }
    document.body.classList.remove('no-scroll');
    State.set('isLoaded', true);
    App.onLoaded();
  }
};


const Cursor = {
  el: null,
  follower: null,
  isVisible: false,
  raf: null,

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


    const hoverTargets = $$('a, button, [data-cursor="hover"]');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });


    const textTargets = $$('input, textarea, select');
    textTargets.forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-text'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-text'));
    });
  },

  loop() {
    State.cursorX = lerp(State.cursorX, State.mouseX, 0.85);
    State.cursorY = lerp(State.cursorY, State.mouseY, 0.85);
    State.followerX = lerp(State.followerX, State.mouseX, 0.12);
    State.followerY = lerp(State.followerY, State.mouseY, 0.12);

    if (this.el) {
      this.el.style.transform = `translate(${State.cursorX}px, ${State.cursorY}px) translate(-50%, -50%)`;
    }
    if (this.follower) {
      this.follower.style.transform = `translate(${State.followerX}px, ${State.followerY}px) translate(-50%, -50%)`;
    }

    this.raf = requestAnimationFrame(() => this.loop());
  },

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
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

    if (this.burger) {
      this.burger.addEventListener('click', () => this.toggleMobile());
    }


    const mobileLinks = $$('.mobile-link');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (State.mobileMenuOpen) this.toggleMobile();
      });
    });
  },

  onScroll() {
    const scrollY = window.scrollY;
    State.set('scrollY', scrollY);


    if (scrollY > 60) {
      this.el.classList.add('scrolled');
    } else {
      this.el.classList.remove('scrolled');
    }

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
      if (rect.top < windowHeight * 0.5 && rect.bottom > 0) {
        activeSection = link;
      }
    });

    this.links.forEach(link => link.classList.remove('active'));
    if (activeSection) {
      activeSection.classList.add('active');
    }
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
    State.set('scrollProgress', progress);
  }
};


const BackToTop = {
  el: null,

  init() {
    this.el = $('#backTop');
    if (!this.el) return;
    this.el.addEventListener('click', () => this.scrollToTop());
  },

  update(scrollY) {
    if (!this.el) return;
    if (scrollY > 400) {
      this.el.classList.add('visible');
    } else {
      this.el.classList.remove('visible');
    }
  },

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};



const RevealAnimations = {
  observer: null,
  elements: [],

  init() {
    this.elements = $$('.reveal-up, .reveal-left, .reveal-right');
    if (this.elements.length === 0) return;

    const options = {
      root: null,
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.05
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          this.observer.unobserve(entry.target);
        }
      });
    }, options);

    this.elements.forEach(el => this.observer.observe(el));
  },

  destroy() {
    if (this.observer) this.observer.disconnect();
  }
};


const Tabs = {
  buttons: [],
  contents: [],

  init() {
    this.buttons = $$('.tab-btn');
    this.contents = $$('.tab-content');

    if (this.buttons.length === 0) return;

    this.buttons.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
  },

  switchTab(tabId) {
    if (!tabId) return;
    State.set('activeTab', tabId);

    this.buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    this.contents.forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    if (tabId === 'skills') {
      setTimeout(() => SkillBars.animate(), 100);
    }
  }
};


const SkillBars = {
  bars: [],
  animated: false,

  init() {
    this.bars = $$('.skill-fill');
  },

  animate() {
    if (this.animated) return;
    this.animated = true;

    this.bars.forEach((bar, index) => {
      const width = bar.dataset.width || '0';
      setTimeout(() => {
        bar.style.width = `${width}%`;
      }, index * 80);
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
    this.els.forEach((el, index) => {
      const target = parseInt(el.dataset.target, 10) || 0;
      setTimeout(() => {
        animateCounter(el, target, 1600);
      }, index * 120);
    });

    this.statBars.forEach((bar, index) => {
      const width = bar.dataset.width || '0';
      setTimeout(() => {
        bar.style.width = `${width}%`;
      }, 300 + index * 100);
    });
  }
};


const TestimonialsSlider = {
  track: null,
  cards: [],
  dotsContainer: null,
  prevBtn: null,
  nextBtn: null,
  currentIndex: 0,
  totalSlides: 0,
  autoPlayInterval: null,
  autoPlayDelay: 6000,
  dots: [],
  isDragging: false,
  startX: 0,
  currentX: 0,
  dragThreshold: 50,

  init() {
    this.track = $('#testimonialTrack');
    this.dotsContainer = $('#sliderDots');
    this.prevBtn = $('#sliderPrev');
    this.nextBtn = $('#sliderNext');

    if (!this.track) return;

    this.cards = $$('.testimonial-card', this.track);
    this.totalSlides = this.cards.length;
    State.set('totalSlides', this.totalSlides);

    if (this.totalSlides < 2) return;

    this.createDots();
    this.bindEvents();
    this.startAutoPlay();
    this.goTo(0);
  },

  createDots() {
    if (!this.dotsContainer) return;
    this.dots = [];

    for (let i = 0; i < this.totalSlides; i++) {
      const dot = document.createElement('div');
      dot.className = 'slider-dot';
      dot.addEventListener('click', () => this.goTo(i));
      this.dotsContainer.appendChild(dot);
      this.dots.push(dot);
    }
  },

  bindEvents() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        this.stopAutoPlay();
        this.prev();
        this.startAutoPlay();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.stopAutoPlay();
        this.next();
        this.startAutoPlay();
      });
    }

    if (this.track) {
      this.track.addEventListener('touchstart', (e) => this.onDragStart(e.touches[0].clientX), { passive: true });
      this.track.addEventListener('touchend', (e) => this.onDragEnd(e.changedTouches[0].clientX));
      this.track.addEventListener('mousedown', (e) => this.onDragStart(e.clientX));
      document.addEventListener('mouseup', (e) => this.onDragEnd(e.clientX));
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });
  },

  onDragStart(x) {
    this.isDragging = true;
    this.startX = x;
  },

  onDragEnd(x) {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.currentX = x;

    const diff = this.startX - this.currentX;
    if (Math.abs(diff) > this.dragThreshold) {
      if (diff > 0) {
        this.next();
      } else {
        this.prev();
      }
    }
  },

  goTo(index) {
    this.currentIndex = clamp(index, 0, this.totalSlides - 1);
    State.set('sliderIndex', this.currentIndex);

    if (this.track) {
      this.track.style.transform = `translateX(-${this.currentIndex * 100}%)`;
    }

    this.updateDots();
    this.updateButtons();
  },

  prev() {
    const newIndex = this.currentIndex === 0 ? this.totalSlides - 1 : this.currentIndex - 1;
    this.goTo(newIndex);
  },

  next() {
    const newIndex = this.currentIndex === this.totalSlides - 1 ? 0 : this.currentIndex + 1;
    this.goTo(newIndex);
  },

  updateDots() {
    this.dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === this.currentIndex);
    });
  },

  updateButtons() {
  },

  startAutoPlay() {
    this.stopAutoPlay();
    this.autoPlayInterval = setInterval(() => this.next(), this.autoPlayDelay);
  },

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  },

  destroy() {
    this.stopAutoPlay();
  }
};

const ContactForm = {
  form: null,
  submitBtn: null,
  btnLoader: null,
  successMsg: null,
  fields: {},

  init() {
    this.form = $('#contactForm');
    if (!this.form) return;

    this.submitBtn = $('#submitBtn');
    this.btnLoader = $('#btnLoader');
    this.successMsg = $('#formSuccess');

    this.fields = {
      fname:    { el: $('#fname'),    error: $('#fnameError'),    validate: (v) => v.trim().length >= 2 ? '' : 'Ce champ est requis (min. 2 caractères).' },
      femail:   { el: $('#femail'),   error: $('#femailError'),   validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Email invalide.' },
      ftype:    { el: $('#ftype'),    error: $('#ftypeError'),    validate: (v) => v !== '' ? '' : 'Veuillez sélectionner un type de demande.' },
      fmessage: { el: $('#fmessage'), error: $('#fmessageError'), validate: (v) => v.trim().length >= 20 ? '' : 'Message trop court (min. 20 caractères).' }
    };

    this.bindEvents();
  },

  bindEvents() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    Object.entries(this.fields).forEach(([key, field]) => {
      if (field.el) {
        field.el.addEventListener('blur', () => this.validateField(key));
        field.el.addEventListener('input', () => {
          if (field.el.classList.contains('error')) {
            this.validateField(key);
          }
        });
      }
    });
  },

  validateField(key) {
    const field = this.fields[key];
    if (!field || !field.el) return true;

    const value = field.el.value;
    const errorMsg = field.validate(value);

    if (errorMsg) {
      field.el.classList.add('error');
      if (field.error) field.error.textContent = errorMsg;
      return false;
    } else {
      field.el.classList.remove('error');
      if (field.error) field.error.textContent = '';
      return true;
    }
  },

  validateAll() {
    let isValid = true;
    Object.keys(this.fields).forEach(key => {
      if (!this.validateField(key)) isValid = false;
    });
    return isValid;
  },

  async handleSubmit() {
    if (!this.validateAll()) {
      const firstError = this.form.querySelector('.error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    this.setLoading(true);

    try {
      await sleep(2000);
      this.onSuccess();
    } catch (err) {
      this.onError();
    } finally {
      this.setLoading(false);
    }
  },

  setLoading(isLoading) {
    if (!this.submitBtn) return;
    this.submitBtn.disabled = isLoading;

    const btnText = this.submitBtn.querySelector('.btn-text');
    if (btnText) btnText.style.opacity = isLoading ? '0' : '1';

    if (this.btnLoader) {
      this.btnLoader.classList.toggle('visible', isLoading);
    }
  },

  onSuccess() {
    if (this.form) this.form.reset();
    if (this.successMsg) this.successMsg.classList.add('visible');
    setTimeout(() => {
      if (this.successMsg) this.successMsg.classList.remove('visible');
    }, 6000);
  },

  onError() {
    alert('Une erreur est survenue. Veuillez réessayer ou contacter directement booking@tamer-official.com');
  }
};



const Availability = {
  container: null,
  months: [
    { name: 'Janv.',  status: 'busy' },
    { name: 'Févr.',  status: 'busy' },
    { name: 'Mars',   status: 'partial' },
    { name: 'Avril',  status: 'available' },
    { name: 'Mai',    status: 'available' },
    { name: 'Juin',   status: 'partial' },
    { name: 'Juil.',  status: 'available' },
    { name: 'Août',   status: 'busy' },
    { name: 'Sept.',  status: 'available' },
    { name: 'Oct.',   status: 'available' },
    { name: 'Nov.',   status: 'partial' },
    { name: 'Déc.',   status: 'busy' }
  ],

  init() {
    this.container = $('#availMonths');
    if (!this.container) return;
    this.render();
  },

  render() {
    const fragment = document.createDocumentFragment();
    this.months.forEach(month => {
      const badge = document.createElement('span');
      badge.className = `month-badge ${month.status}`;
      badge.textContent = month.name;
      badge.title = this.getStatusLabel(month.status);
      fragment.appendChild(badge);
    });
    this.container.appendChild(fragment);
  },

  getStatusLabel(status) {
    const labels = {
      available: 'Disponible',
      busy: 'Complet',
      partial: 'Partiellement disponible'
    };
    return labels[status] || '';
  }
};



const HeroNumber = {
  el: null,
  interval: null,

  init() {
    this.el = $('#heroNumber');
    if (!this.el) return;
    this.animate();
  },

  animate() {
    let count = 1;
    this.interval = setInterval(() => {
      this.el.textContent = String(count).padStart(3, '0');
      count++;
      if (count > 5) {
        clearInterval(this.interval);
        this.el.textContent = '001';
      }
    }, 100);
  }
};


const ParallaxHero = {
  elements: [],
  raf: null,
  active: false,

  init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.elements = [
      { el: $('.hero-gradient'), speed: 0.3 },
      { el: $('.hero-badge'), speed: 0.15 },
      { el: $('.hero-number'), speed: 0.2 }
    ].filter(item => item.el !== null);

    if (this.elements.length === 0) return;

    window.addEventListener('scroll', throttle(() => this.onScroll(), 16));
  },

  onScroll() {
    const scrollY = window.scrollY;
    const heroHeight = window.innerHeight;

    if (scrollY > heroHeight * 1.5) return;

    this.elements.forEach(({ el, speed }) => {
      if (!el) return;
      const translateY = scrollY * speed;
      el.style.transform = `translateY(${translateY}px)`;
    });
  }
};



const ResizeManager = {
  handlers: [],
  debouncedResize: null,

  init() {
    this.debouncedResize = debounce(() => this.onResize(), 200);
    window.addEventListener('resize', this.debouncedResize);
  },

  register(fn) {
    this.handlers.push(fn);
  },

  onResize() {
    const isDesktop = window.innerWidth > 1024;
    State.set('isDesktop', isDesktop);

    // Si on passe en desktop, fermer le menu mobile
    if (isDesktop && State.mobileMenuOpen) {
      Navbar.toggleMobile();
    }

    this.handlers.forEach(fn => fn());
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
        const targetY = target.getBoundingClientRect().top + window.scrollY - navHeight;

        window.scrollTo({
          top: targetY,
          behavior: 'smooth'
        });
      });
    });
  }
};



const SkillsObserver = {
  observer: null,

  init() {
    const skillsSection = $('.about');
    if (!skillsSection) return;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Si l'onglet actif est "skills", animer
          if (State.activeTab === 'skills') {
            SkillBars.animate();
          }
        }
      });
    }, { threshold: 0.3 });

    this.observer.observe(skillsSection);
  }
};


const TypingEffect = {
  el: null,
  phrases: [
    'Le Phénomène',
    'L\'Inégalable',
    'Le GOAT',
    'Fortnite'
  ],
  currentPhraseIndex: 0,
  currentCharIndex: 0,
  isDeleting: false,
  typingSpeed: 100,
  deletingSpeed: 60,
  pauseDuration: 2500,
  timeout: null,

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

    this.timeout = setTimeout(() => this.type(), speed);
  },

  destroy() {
    if (this.timeout) clearTimeout(this.timeout);
  }
};


const ErrorHandler = {
  init() {
    window.addEventListener('error', (e) => {
      console.warn('[Tamer] Script error:', e.message);
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.warn('[Tamer] Unhandled rejection:', e.reason);
    });
  }
};


const Analytics = {
  enabled: false,

  track(event, data = {}) {
    if (!this.enabled) return;
    console.log('[Analytics]', event, data);
  },

  init() {
    $$('.btn-primary').forEach(btn => {
      btn.addEventListener('click', () => {
        this.track('cta_click', { text: btn.textContent.trim() });
      });
    });

    const form = $('#contactForm');
    if (form) {
      form.addEventListener('submit', () => {
        this.track('form_submit', { form: 'contact' });
      });
    }

    const ageYes = $('#ageYes');
    if (ageYes) {
      ageYes.addEventListener('click', () => {
        this.track('age_gate', { action: 'verified' });
      });
    }
  }
};


const LazyLoad = {
  observer: null,

  init() {
    const lazyImages = $$('[data-src]');
    if (lazyImages.length === 0) return;

    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              this.observer.unobserve(img);
            }
          }
        });
      }, { rootMargin: '200px' });

      lazyImages.forEach(img => this.observer.observe(img));
    } else {
      lazyImages.forEach(img => {
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
      });
    }
  }
};


const Accessibility = {
  init() {
    this.addSkipLink();

    this.manageFocusVisible();

    this.createLiveRegion();
  },

  addSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#hero';
    skipLink.className = 'sr-only';
    skipLink.textContent = 'Aller au contenu principal';
    skipLink.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;padding:8px 16px;background:#d4a853;color:#0a0a0f;';
    skipLink.addEventListener('focus', () => {
      skipLink.style.clip = 'auto';
    });
    document.body.insertBefore(skipLink, document.body.firstChild);
  },

  manageFocusVisible() {
    let usingKeyboard = false;

    document.addEventListener('keydown', () => {
      usingKeyboard = true;
      document.body.classList.add('keyboard-nav');
    });

    document.addEventListener('mousedown', () => {
      usingKeyboard = false;
      document.body.classList.remove('keyboard-nav');
    });
  },

  createLiveRegion() {
    const region = document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.id = 'liveRegion';
    document.body.appendChild(region);
  },

  announce(message) {
    const region = $('#liveRegion');
    if (region) {
      region.textContent = message;
      setTimeout(() => { region.textContent = ''; }, 3000);
    }
  }
};



const App = {
  init() {
    ErrorHandler.init();

    Loader.init();

    AgeGate.init();
  },

  onLoaded() {
    this.initModules();

    window.dispatchEvent(new Event('scroll'));
  },

  initModules() {
    Cursor.init();

    Navbar.init();

    ScrollProgress.init();

    BackToTop.init();

    SmoothScroll.init();

    RevealAnimations.init();

    Tabs.init();

    SkillBars.init();

    Counters.init();

    TestimonialsSlider.init();

    ContactForm.init();

    Availability.init();

    HeroNumber.init();

    TypingEffect.init();

    ParallaxHero.init();

    SkillsObserver.init();

    LazyLoad.init();

    Accessibility.init();

    Analytics.init();

    ResizeManager.init();

    this.refreshCursorTargets();
  },

  refreshCursorTargets() {
    const hoverTargets = $$('a, button, .tab-btn, .slider-btn, .slider-dot, .month-badge');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
  }
};



document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
