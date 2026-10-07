/* ==========================================================================
   Shahed Nazzal — portfolio
   Modules: Split · Preloader · Header · Menu · Reveal · Parallax · Pointer
            Demo viewer · Tabs · Sound (ambient pad) · Stage (3D)
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   *  CONFIG — the only things you need to edit (demo videos: see index.html)
   * ------------------------------------------------------------------ */
  const CONFIG = {
    email: '',            // e.g. 'name@example.com' — adds an email link in Contact
    threeUrl: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  };

  /* ------------------------------------------------------------------ *
   *  Helpers & shared state
   * ------------------------------------------------------------------ */
  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');

  const state = {
    reduced: mqReduced.matches,
    fine: mqFine.matches,
    ready: false,
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  };
  mqReduced.addEventListener?.('change', (e) => { state.reduced = e.matches; });
  mqFine.addEventListener?.('change', (e) => { state.fine = e.matches; });

  const frameCallbacks = [];
  const onFrame = (fn) => frameCallbacks.push(fn);

  /* ------------------------------------------------------------------ *
   *  Text splitting (words for headings, characters for the hero name)
   * ------------------------------------------------------------------ */
  function splitWords(el) {
    let index = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const outer = document.createElement('span');
            outer.className = 'w';
            const inner = document.createElement('span');
            inner.className = 'w__i';
            inner.style.setProperty('--i', index++);
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
  }

  function splitChars(el) {
    const text = el.textContent.trim();
    el.textContent = '';
    Array.from(text).forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'c';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--i', i);
      span.textContent = ch;
      el.appendChild(span);
    });
  }

  /* ------------------------------------------------------------------ *
   *  Content injected from CONFIG
   * ------------------------------------------------------------------ */
  function applyConfig() {
    if (CONFIG.email) {
      const list = $('.contact__links');
      const li = document.createElement('li');
      li.setAttribute('data-reveal', '');
      li.dataset.delay = '200';
      const a = document.createElement('a');
      a.href = `mailto:${CONFIG.email}`;
      a.innerHTML = '<span>Email</span><i aria-hidden="true">↗</i>';
      li.appendChild(a);
      list.appendChild(li);
    }
  }

  /* ------------------------------------------------------------------ *
   *  Preloader
   * ------------------------------------------------------------------ */
  function initPreloader() {
    const counter = $('[data-count]');
    const finish = () => {
      if (state.ready) return;
      state.ready = true;
      root.classList.add('is-ready');
      document.body.classList.remove('is-locked');
    };

    if (state.reduced || !counter) { finish(); return; }

    document.body.classList.add('is-locked');
    const duration = 1500;
    const start = performance.now();
    let fontsDone = false;
    (document.fonts?.ready ?? Promise.resolve()).then(() => { fontsDone = true; });

    const step = (now) => {
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      counter.textContent = Math.round(eased * 100);
      if (p < 1 || (!fontsDone && now - start < 4000)) requestAnimationFrame(step);
      else setTimeout(finish, 150);
    };
    requestAnimationFrame(step);
    setTimeout(finish, 6000); // failsafe
  }

  /* ------------------------------------------------------------------ *
   *  Header: theme switching + active nav link
   * ------------------------------------------------------------------ */
  function initHeader() {
    const header = $('.site-header');
    const themed = $$('[data-theme]').filter((el) => el !== header);
    const links = $$('.nav a');
    const linkTargets = links.map((a) => $(a.getAttribute('href')));
    let ticking = false;

    const update = () => {
      ticking = false;
      const probe = 48;
      let theme = 'dark';
      for (const el of themed) {
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) { theme = el.dataset.theme; break; }
      }
      header.dataset.theme = theme;

      const mid = window.innerHeight * 0.5;
      links.forEach((a, i) => {
        const t = linkTargets[i];
        if (!t) return;
        const r = t.getBoundingClientRect();
        a.classList.toggle('is-active', r.top <= mid && r.bottom > mid);
      });
    };

    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
  }

  /* ------------------------------------------------------------------ *
   *  Mobile menu
   * ------------------------------------------------------------------ */
  function initMenu() {
    const toggle = $('.menu-toggle');
    const menu = $('#menu');
    const header = $('.site-header');
    const text = $('[data-menu-text]');

    const set = (open) => {
      menu.classList.toggle('is-open', open);
      menu.inert = !open;
      toggle.setAttribute('aria-expanded', String(open));
      text.textContent = open ? 'Close' : 'Menu';
      document.body.classList.toggle('is-locked', open);
      if (open) header.setAttribute('data-menu-open', ''); else header.removeAttribute('data-menu-open');
      Sound.swell(open ? 1 : -1);
    };

    toggle.addEventListener('click', () => set(!menu.classList.contains('is-open')));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { set(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 861px)').addEventListener?.('change', (e) => {
      if (e.matches && menu.classList.contains('is-open')) set(false);
    });
  }

  /* ------------------------------------------------------------------ *
   *  Scroll reveal
   * ------------------------------------------------------------------ */
  function initReveal() {
    $$('[data-delay]').forEach((el) => el.style.setProperty('--delay', `${el.dataset.delay}ms`));
    const targets = $$('[data-reveal], [data-split]');

    if (!('IntersectionObserver' in window) || state.reduced) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------ *
   *  Parallax for [data-parallax] elements
   * ------------------------------------------------------------------ */
  function initParallax() {
    const items = $$('[data-parallax]');
    if (!items.length || state.reduced) return;
    onFrame(() => {
      const vh = window.innerHeight;
      items.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const speed = parseFloat(el.dataset.speed || '0.05');
        const offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      });
    });
  }

  /* ------------------------------------------------------------------ *
   *  Pointer: track the mouse (the 3D sculpture leans toward it)
   * ------------------------------------------------------------------ */
  function initPointer() {
    window.addEventListener('pointermove', (e) => {
      state.mouse.x = e.clientX;
      state.mouse.y = e.clientY;
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   *  Demo viewer — each project's "View demo" opens its video in a
   *  dialog. The YouTube ID lives on the project (<li data-video="…">).
   * ------------------------------------------------------------------ */
  function initDemos() {
    const dialog = $('#demo');
    const triggers = $$('[data-demo]');
    if (!dialog || !triggers.length) return;

    const frame = $('.demo__frame', dialog);
    const title = $('.demo__title', dialog);
    const ext = $('.demo__ext', dialog);
    let opener = null;

    const open = (trigger) => {
      const item = trigger.closest('[data-video]');
      const id = item && item.dataset.video;
      if (!id) return;
      const name = item.dataset.title || 'Project';
      opener = trigger;

      title.textContent = `${name} — demo`;
      ext.href = `https://youtu.be/${id}`;

      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
      iframe.title = `${name} demo video`;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.replaceChildren(iframe);

      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      document.body.classList.add('is-locked');
      Sound.duck(true);
    };

    const close = () => {
      if (typeof dialog.close === 'function') dialog.close();
      else { dialog.removeAttribute('open'); dialog.dispatchEvent(new Event('close')); }
    };

    dialog.addEventListener('close', () => {
      frame.replaceChildren();               // stops playback
      document.body.classList.remove('is-locked');
      Sound.duck(false);
      if (opener) opener.focus();
      opener = null;
    });

    triggers.forEach((t) => t.addEventListener('click', () => open(t)));
    $('.demo__close', dialog).addEventListener('click', close);
    // Click on the dim area around the player closes it.
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  }

  /* ------------------------------------------------------------------ *
   *  Capability tabs (accessible tablist)
   * ------------------------------------------------------------------ */
  function initTabs() {
    const tabs = $$('[role="tab"]');
    if (!tabs.length) return;

    const activate = (tab, focus = false) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).classList.toggle('is-active', on);
      });
      if (focus) tab.focus();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', (e) => {
        const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        if (e.key in keys) {
          e.preventDefault();
          activate(tabs[(i + keys[e.key] + tabs.length) % tabs.length], true);
        } else if (e.key === 'Home') { e.preventDefault(); activate(tabs[0], true); }
        else if (e.key === 'End') { e.preventDefault(); activate(tabs[tabs.length - 1], true); }
      });
    });
  }

  /* ------------------------------------------------------------------ *
   *  Sound — a slow, quiet ambient pad synthesised with the Web Audio API
   *  (no audio files). Soft sine voices drift through four open chords
   *  (Dmaj9 → Bm7 → Gmaj7 → Dsus2), washed in a long reverb, with a very
   *  low master level. Off by default; starts only after the visitor
   *  clicks the toggle, and fades in over a few seconds.
   * ------------------------------------------------------------------ */
  const Sound = (() => {
    let ctx = null;
    let master = null;
    let fx = null;
    let noise = null;
    let built = false;
    let on = false;
    let ducked = false;
    let timer = 0;
    let step = 0;
    let suspendTimer = 0;
    const voices = [];

    const LEVEL = 0.045;        // overall loudness of the pad — intentionally very low
    const CHORD_EVERY = 32000;  // ms between chord changes
    const GLIDE = 6;          // seconds-ish for notes to drift to the next chord
    const CHORDS = [
      [73.42, 220.0, 329.63, 369.99],   // Dmaj9   D2 A3 E4 F#4
      [61.74, 246.94, 293.66, 369.99],  // Bm7     B1 B3 D4 F#4
      [98.0, 246.94, 293.66, 369.99],   // Gmaj7   G2 B3 D4 F#4
      [73.42, 220.0, 293.66, 329.63],   // Dsus2   D2 A3 D4 E4
    ];
    const VOICE_GAIN = [0.62, 0.3, 0.14, 0.07];

    const btn = $('.sound-toggle');
    const label = $('[data-sound-text]');

    function impulse(seconds, decay) {
      const len = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    function build() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();

      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      const verb = ctx.createConvolver();
      verb.buffer = impulse(7, 2.6);
      const wet = ctx.createGain();
      wet.gain.value = 0.85;
      verb.connect(wet);
      wet.connect(master);

      const dry = ctx.createGain();
      dry.gain.value = 0.5;
      dry.connect(master);

      // Everything the pad plays goes through a soft low-pass.
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 340;
      lowpass.Q.value = 0.4;
      lowpass.connect(dry);
      lowpass.connect(verb);

      // Chimes and swells join the reverb too, bypassing the low-pass.
      fx = ctx.createGain();
      fx.gain.value = 1;
      fx.connect(dry);
      fx.connect(verb);

      // Slow "breathing" of the filter
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.04;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 70;
      lfo.connect(lfoGain);
      lfoGain.connect(lowpass.frequency);
      lfo.start();

      // Four voices, each a detuned pair of sines with its own gentle swell.
      CHORDS[0].forEach((freq, i) => {
        const vg = ctx.createGain();
        vg.gain.value = VOICE_GAIN[i];
        vg.connect(lowpass);

        const swellLfo = ctx.createOscillator();
        swellLfo.frequency.value = 0.045 + i * 0.017;
        const swellDepth = ctx.createGain();
        swellDepth.gain.value = VOICE_GAIN[i] * 0.25;
        swellLfo.connect(swellDepth);
        swellDepth.connect(vg.gain);
        swellLfo.start();

        const pair = [-6, 6].map((detune) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.detune.value = detune;
          osc.connect(vg);
          osc.start();
          return osc;
        });
        voices.push(pair);
      });

      // Reusable noise buffer for the soft swells
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      return true;
    }

    function nextChord() {
      if (!ctx) return;
      step = (step + 1) % CHORDS.length;
      const t = ctx.currentTime;
      voices.forEach((pair, i) => pair.forEach((osc) => osc.frequency.setTargetAtTime(CHORDS[step][i], t, GLIDE)));
    }

    function level(tc) {
      if (!ctx) return;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(on && !ducked ? LEVEL : 0, t, tc);
    }

    async function set(next) {
      if (next && !built) { built = build(); if (!built) return; }
      on = next;
      clearTimeout(suspendTimer);
      clearInterval(timer);
      if (ctx) {
        if (next) {
          try { await ctx.resume(); } catch (_) { /* ignore */ }
          timer = setInterval(nextChord, CHORD_EVERY);
          level(4);                         // very slow fade-in
        } else {
          level(1.2);                       // slow fade-out
          suspendTimer = setTimeout(() => { if (!on && ctx.state === 'running') ctx.suspend(); }, 4500);
        }
      }
      btn.classList.toggle('is-on', next);
      btn.setAttribute('aria-pressed', String(next));
      label.textContent = next ? 'Sound on' : 'Sound off';
      if (next) chime();
    }

    // One soft, distant bell note.
    function chime(freq = 523.25, vol = 0.08) {
      if (!on || !ctx) return;
      const t = ctx.currentTime + 0.3;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
      osc.connect(g);
      g.connect(fx);
      osc.start(t);
      osc.stop(t + 4.7);
    }

    // A breath of filtered air (menu open / close).
    function swell(dir = 1) {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 0.7;
      band.frequency.setValueAtTime(dir > 0 ? 220 : 640, t);
      band.frequency.exponentialRampToValueAtTime(dir > 0 ? 640 : 220, t + 1.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      src.connect(band);
      band.connect(g);
      g.connect(fx);
      src.start(t);
      src.stop(t + 1.6);
    }

    // Lower the pad while a demo video is playing, then bring it back.
    function duck(flag) {
      ducked = flag;
      if (ctx && on) level(flag ? 0.35 : 1.8);
    }

    function init() {
      btn.addEventListener('click', () => set(!on));
      document.addEventListener('visibilitychange', () => {
        if (!ctx || !on) return;
        if (document.hidden) ctx.suspend(); else ctx.resume();
      });
    }

    return { init, swell, chime, duck };
  })();

  /* ------------------------------------------------------------------ *
   *  Stage — the 3D sculpture (Three.js, loaded on demand)
   *  A noise-folded form drawn with fine contour lines, like a
   *  topographic map of something that doesn't exist yet.
   * ------------------------------------------------------------------ */
  const VERTEX = /* glsl */ `
    uniform float uTime;
    uniform vec2 uMouse;
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vDisp;

    vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    float displace(vec3 n){
      float t = uTime * 0.12;
      vec3 q = n * 1.15 + vec3(uMouse * 0.35, 0.0);
      float a = snoise(q + vec3(0.0, t, 0.0));
      float b = snoise(q * 2.3 - vec3(t * 1.3, 0.0, 0.0));
      float r = 1.0 - abs(snoise(q * 1.6 + vec3(5.2, 1.3, t)));
      return a * 0.34 + b * 0.08 + r * r * 0.22;
    }

    void main(){
      vec3 n0 = normalize(position);
      float d = displace(n0);
      vec3 p = n0 * (1.0 + d);

      vec3 up = abs(n0.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
      vec3 t = normalize(cross(up, n0));
      vec3 bt = normalize(cross(n0, t));
      float e = 0.012;
      vec3 n1 = normalize(n0 + t * e);
      vec3 n2 = normalize(n0 + bt * e);
      vec3 p1 = n1 * (1.0 + displace(n1));
      vec3 p2 = n2 * (1.0 + displace(n2));
      vec3 nrm = normalize(cross(p1 - p, p2 - p));

      vNormal = normalize(normalMatrix * nrm);
      vDisp = d;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vView = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }
  `;

  const FRAGMENT = /* glsl */ `
    precision highp float;
    uniform vec3 uInk;
    uniform vec3 uWine;
    uniform vec3 uBone;
    uniform vec3 uRose;
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vDisp;

    void main(){
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vView);
      vec3 L1 = normalize(vec3(-0.6, 0.8, 0.7));
      vec3 L2 = normalize(vec3(0.8, -0.2, 0.5));
      float d1 = max(dot(N, L1), 0.0);
      float d2 = max(dot(N, L2), 0.0);
      float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      vec3 H = normalize(L1 + V);
      float spec = pow(max(dot(N, H), 0.0), 48.0);

      vec3 col = mix(uInk, uWine, smoothstep(0.0, 0.9, d1));
      col += uWine * 0.55 * d2;
      col = mix(col, uRose, fres * 0.55);
      col += uBone * spec * 0.5;

      // contour lines
      float h = vDisp * 16.0;
      float g = abs(fract(h - 0.5) - 0.5) / max(fwidth(h), 0.0001);
      float line = 1.0 - min(g * 0.9, 1.0);
      col = mix(col, uBone, line * 0.22 * (0.35 + d1));

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // Where the sculpture lives as you move through the page.
  // x / y are fractions of the half-viewport; s = scale; a = opacity.
  const POSES = {
    top:       { d: { x: 0.46, y: -0.02, s: 1.35, a: 1 },    m: { x: 0, y: 0.12, s: 0.82, a: 1 } },
    about:     { d: { x: -0.5, y: 0, s: 0.7, a: 0 },         m: { x: 0, y: 0, s: 0.5, a: 0 } },
    work:      { d: { x: 0.62, y: 0.02, s: 0.6, a: 0.14 },   m: { x: 0.3, y: 0.1, s: 0.45, a: 0.08 } },
    skills:    { d: { x: 0.55, y: 0.05, s: 0.85, a: 0.34 },  m: { x: 0.25, y: 0.2, s: 0.55, a: 0.16 } },
    education: { d: { x: 0, y: 0, s: 0.6, a: 0 },            m: { x: 0, y: 0, s: 0.4, a: 0 } },
    contact:   { d: { x: 0, y: -0.05, s: 1.2, a: 0.5 },      m: { x: 0, y: 0, s: 0.85, a: 0.34 } },
  };

  function webglAvailable() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (_) { return false; }
  }

  async function initStage() {
    const canvas = $('#stage');
    const fallback = () => root.classList.add('no-3d');

    const saveData = navigator.connection?.saveData;
    const weak = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
      (window.innerWidth < 760 && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    if (!canvas || saveData || weak || !webglAvailable()) { fallback(); return; }

    let THREE;
    try { THREE = await import(CONFIG.threeUrl); } catch (_) { fallback(); return; }

    const small = window.innerWidth < 760;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
    } catch (_) { fallback(); return; }

    const maxDpr = small ? 1.5 : 2;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.z = 6;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;

    const rgb = (r, g, b) => new THREE.Vector3(r / 255, g / 255, b / 255);
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
      uInk: { value: rgb(13, 11, 11) },
      uWine: { value: rgb(140, 29, 55) },
      uBone: { value: rgb(241, 235, 226) },
      uRose: { value: rgb(217, 142, 160) },
    };

    const detail = small ? 22 : 40;
    const body = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, detail),
      new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms }),
    );

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.004, 8, 220),
      new THREE.MeshBasicMaterial({ color: 0xf1ebe2, transparent: true, opacity: 0.22 }),
    );
    ring.rotation.x = 1.15;

    const group = new THREE.Group();
    group.add(body, ring);
    scene.add(group);

    // ---- sizing
    let aspect = 1;
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      renderer.setSize(w, h, false);
      aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', () => { resize(); if (state.reduced) draw(0, true); });

    // ---- pose tracking
    const ids = Object.keys(POSES);
    const sectionEls = ids.map((id) => document.getElementById(id));
    const currentPoseKey = () => {
      const vh = window.innerHeight;
      for (let i = 0; i < ids.length; i++) {
        const el = sectionEls[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.55 && r.bottom > vh * 0.45) return ids[i];
      }
      return 'top';
    };
    const targetPose = () => {
      const p = POSES[currentPoseKey()];
      return aspect < 0.8 ? p.m : p.d;
    };

    const cur = { x: 0, y: 0, s: 1, a: 0 };
    const start = targetPose();
    Object.assign(cur, start, { a: 0 });
    const mouse = { x: 0, y: 0 };
    let last = performance.now();

    function draw(dt, snap = false) {
      const target = targetPose();
      const k = snap || state.reduced ? 1 : Math.min(1, dt * 3.2);
      cur.x = lerp(cur.x, target.x, k);
      cur.y = lerp(cur.y, target.y, k);
      cur.s = lerp(cur.s, target.s, k);
      cur.a = lerp(cur.a, state.ready ? target.a : 0, snap ? 1 : Math.min(1, dt * 2.4));

      canvas.style.opacity = cur.a.toFixed(3);
      if (cur.a < 0.01) return;

      const nx = state.reduced ? 0 : (state.mouse.x / window.innerWidth - 0.5) * 2;
      const ny = state.reduced ? 0 : (state.mouse.y / window.innerHeight - 0.5) * 2;
      mouse.x = lerp(mouse.x, nx, 0.05);
      mouse.y = lerp(mouse.y, ny, 0.05);

      if (!state.reduced) uniforms.uTime.value += dt;
      uniforms.uMouse.value.set(mouse.x, -mouse.y);

      group.position.set(cur.x * halfH * aspect, cur.y * halfH, 0);
      group.scale.setScalar(cur.s);
      group.rotation.y = uniforms.uTime.value * 0.08 + mouse.x * 0.35;
      group.rotation.x = mouse.y * 0.2;
      group.rotation.z = window.scrollY * 0.0003;
      ring.rotation.z = uniforms.uTime.value * 0.05;

      renderer.render(scene, camera);
    }

    if (state.reduced) {
      const redraw = () => requestAnimationFrame(() => draw(0, true));
      window.addEventListener('scroll', redraw, { passive: true });
      window.addEventListener('pointermove', () => {}, { passive: true });
      draw(0, true);
      // draw once more when the preloader is skipped / fonts settle
      setTimeout(() => draw(0, true), 300);
    } else {
      onFrame(() => {
        if (document.hidden) { last = performance.now(); return; }
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        draw(dt);
      });
    }

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fallback(); canvas.style.display = 'none'; });
  }

  /* ------------------------------------------------------------------ *
   *  Main loop
   * ------------------------------------------------------------------ */
  function startLoop() {
    const loop = () => {
      for (let i = 0; i < frameCallbacks.length; i++) frameCallbacks[i]();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------ *
   *  Init
   * ------------------------------------------------------------------ */
  function init() {
    $$('[data-chars]').forEach(splitChars);
    $$('[data-split]').forEach(splitWords);

    applyConfig();
    initPreloader();
    initHeader();
    Sound.init();
    initMenu();
    initReveal();
    initParallax();
    initPointer();
    initDemos();
    initTabs();
    initStage();
    startLoop();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
