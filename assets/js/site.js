/* ==========================================================================
   Morsal Mubarak — site behaviors + Viz (dependency-free SVG charts)
   ========================================================================== */
(function () {
  'use strict';
  const root = document.documentElement;
  root.classList.remove('no-js');

  /* ---------- Theme ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };
  function effectiveTheme() {
    const t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store.set('theme', next);
      btn.setAttribute('aria-label', next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  });

  /* ---------- Header ---------- */
  const header = document.querySelector('.site-header');
  const onScroll = () => header && header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.querySelector('.nav');
  if (menuBtn && nav) {
    const close = () => { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); };
    menuBtn.addEventListener('click', () => {
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  /* Active section highlighting (same-page anchors only) */
  const navLinks = Array.from(document.querySelectorAll('.nav a[href*="#"]')).filter(a => {
    const id = a.getAttribute('href').split('#')[1];
    return id && document.getElementById(id) && (a.pathname === location.pathname || a.getAttribute('href').startsWith('#'));
  });
  if (navLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(navLinks.map(a => [a.getAttribute('href').split('#')[1], a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          navLinks.forEach(a => a.removeAttribute('aria-current'));
          const a = map.get(en.target.id);
          if (a) a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((a, id) => io.observe(document.getElementById(id)));
    const top = document.getElementById('top'); // the hero has no nav entry: clear the highlight there
    if (top && !map.has('top')) io.observe(top);
  }

  /* TOC highlighting (detail pages) */
  const tocLinks = Array.from(document.querySelectorAll('.toc a[href^="#"]'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          tocLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    tocLinks.forEach(a => { const t = document.getElementById(a.getAttribute('href').slice(1)); if (t) io.observe(t); });
  }

  /* ---------- Reveal + count-up ---------- */
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function countUp(el) {
    const to = parseFloat(el.dataset.countTo);
    if (isNaN(to)) return;
    const dec = parseInt(el.dataset.countDecimals || '0', 10);
    const pre = el.dataset.countPrefix || '', suf = el.dataset.countSuffix || '';
    const fmt = v => pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
    if (reduce) { el.textContent = fmt(to); return; }
    const dur = 1400, t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(to * e);
      if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
    };
    requestAnimationFrame(step);
  }
  const revealEls = document.querySelectorAll('.reveal, [data-count-to]');
  const revealAll = () => revealEls.forEach(el => {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    if (el.dataset.countTo && !el.dataset.counted) { el.dataset.counted = '1'; countUp(el); }
  });
  if ('IntersectionObserver' in window) {
    let fired = false;
    setTimeout(() => { if (!fired) revealAll(); }, 2000); // safety net if the observer never reports
    const io = new IntersectionObserver((entries, obs) => {
      fired = true;
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        if (en.target.dataset.countTo) countUp(en.target);
        en.target.querySelectorAll && en.target.querySelectorAll('[data-count-to]').forEach(c => { if (!c.dataset.counted) { c.dataset.counted = '1'; countUp(c); } });
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => { el.classList.add('in'); if (el.dataset.countTo) countUp(el); });
  }

  /* ---------- Copy buttons ---------- */
  document.querySelectorAll('[data-copy-target], [data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sel = btn.getAttribute('data-copy-target');
      const text = sel ? (document.querySelector(sel) || {}).innerText : btn.getAttribute('data-copy');
      if (!text) return;
      const label = btn.querySelector('.label') || btn;
      const old = label.textContent;
      try { await navigator.clipboard.writeText(text.trim()); label.textContent = 'Copied'; }
      catch (e) { label.textContent = 'Press ⌘/Ctrl+C'; }
      setTimeout(() => { label.textContent = old; }, 1600);
    });
  });

  /* ---------- Tabs ---------- */
  document.querySelectorAll('[data-tabs]').forEach(list => {
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    const select = tab => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      document.dispatchEvent(new CustomEvent('tabchange', { detail: { tab } }));
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        n.focus(); select(n);
      });
    });
  });

  /* ---------- Lightbox (pan + zoom) ---------- */
  let lb;
  function openLightbox(src, alt) {
    if (!lb) {
      lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-modal', 'true');
      lb.innerHTML = '<div class="lb-bar"><span class="lb-title"></span><div class="btn-row">' +
        '<button class="btn btn-sm" data-z="-1" aria-label="Zoom out">−</button>' +
        '<button class="btn btn-sm" data-z="0">Fit</button>' +
        '<button class="btn btn-sm" data-z="1" aria-label="Zoom in">+</button>' +
        '<button class="btn btn-sm" data-close>Close ✕</button></div></div>' +
        '<div class="lb-stage"><img alt=""></div>';
      document.body.appendChild(lb);
      const stage = lb.querySelector('.lb-stage'), img = lb.querySelector('img');
      let scale = 1;
      const fit = () => {
        const s = Math.min(stage.clientWidth / img.naturalWidth, stage.clientHeight / img.naturalHeight, 1);
        setScale(s);
      };
      const setScale = s => { scale = Math.max(.1, Math.min(4, s)); img.style.width = (img.naturalWidth * scale) + 'px'; };
      lb._fit = fit;
      img.addEventListener('load', fit);
      lb.querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', () => {
        const z = +b.dataset.z; if (z === 0) fit(); else setScale(scale * (z > 0 ? 1.4 : 1 / 1.4));
      }));
      const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; if (lb._opener) lb._opener.focus(); };
      lb.querySelector('[data-close]').addEventListener('click', close);
      lb.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
      stage.addEventListener('click', e => { if (e.target === stage) close(); });
      let drag = null;
      stage.addEventListener('pointerdown', e => { if (e.target === img) { drag = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop }; stage.setPointerCapture(e.pointerId); } });
      stage.addEventListener('pointermove', e => { if (drag) { stage.scrollLeft = drag.l - (e.clientX - drag.x); stage.scrollTop = drag.t - (e.clientY - drag.y); } });
      stage.addEventListener('pointerup', () => { drag = null; });
    }
    lb._opener = document.activeElement;
    const img = lb.querySelector('img');
    img.alt = alt || '';
    lb.querySelector('.lb-title').textContent = alt || '';
    if (img.getAttribute('src') !== src) img.src = src; else lb._fit();
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    lb.querySelector('[data-close]').focus();
  }
  document.querySelectorAll('img.zoomable').forEach(img => {
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    const go = () => openLightbox(img.dataset.full || img.currentSrc || img.src, img.alt);
    img.addEventListener('click', go);
    img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });

  /* ---------- Misc ---------- */
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* Pre-warm a sleeping free-tier app server (Render spins down after 15 idle minutes),
     so it is awake by the time a visitor clicks "Launch". Fire-and-forget, no data sent. */
  const prewarm = document.body && document.body.dataset.prewarm;
  if (prewarm) {
    const go = () => { try { fetch(prewarm, { mode: 'no-cors', cache: 'no-store', credentials: 'omit' }).catch(() => {}); } catch (e) { /* offline */ } };
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 3000 }); else setTimeout(go, 1500);
  }
})();

/* ==========================================================================
   Viz — small, dependency-free SVG chart kit (follows the site's chart spec)
   Fixed categorical order via --series-N; text in ink tokens; 2px gaps;
   4px rounded data-ends; hover tooltips; keyboard focus; table view.
   ========================================================================== */
window.Viz = (function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const SERIES = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5', '--series-6'];
  const RAMP = ['--ramp-250', '--ramp-350', '--ramp-450', '--ramp-550', '--ramp-650'];
  const seriesVar = i => `var(${SERIES[Math.min(i, SERIES.length - 1)]})`;
  const fmt = {
    int: v => Math.round(v).toLocaleString('en-US'),
    dec: (d = 2) => v => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }),
    pct: (d = 0) => v => Number(v).toFixed(d) + '%',
    compact: v => {
      const a = Math.abs(v);
      if (a >= 1e9) return (v / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
      if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
      if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
      return String(Math.round(v * 100) / 100);
    },
    money: v => '$' + Math.round(v).toLocaleString('en-US'),
  };

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, str, cls, anchor, extra) {
    const t = el('text', Object.assign({ x, y, class: cls || '', 'text-anchor': anchor || 'start', 'dominant-baseline': 'middle' }, extra || {}), parent);
    t.textContent = str;
    return t;
  }
  let measurer;
  function textWidth(str, size, weight) {
    if (!measurer) measurer = document.createElement('canvas').getContext('2d');
    const fam = getComputedStyle(document.body).fontFamily || 'system-ui';
    measurer.font = `${weight || 400} ${size || 12}px ${fam}`;
    return measurer.measureText(String(str)).width;
  }
  function niceTicks(min, max, count) {
    const span = max - min || 1;
    const step0 = span / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const err = step0 / mag;
    const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
    const t = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) t.push(+v.toFixed(10));
    return t;
  }
  function logTicks(min, max) {
    const t = [];
    for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
      [1, 2, 5].forEach(m => { const v = m * Math.pow(10, e); if (v >= min * 0.999 && v <= max * 1.001) t.push(v); });
    }
    return t;
  }
  // Bar path with 4px rounded data-end, square at the baseline. Horizontal.
  function hbarPath(x0, x1, y, h) {
    const dir = x1 >= x0 ? 1 : -1;
    const len = Math.abs(x1 - x0);
    const r = Math.min(4, h / 2, len);
    if (len < 0.5) return `M${x0},${y}h0.5v${h}h-0.5Z`;
    const xe = x1 - dir * r;
    const sweep = dir > 0 ? 1 : 0;
    return `M${x0},${y}H${xe}A${r},${r} 0 0 ${sweep} ${x1},${y + r}V${y + h - r}A${r},${r} 0 0 ${sweep} ${xe},${y + h}H${x0}Z`;
  }
  function vbarPath(x, w, yb, yt) {
    const len = Math.abs(yb - yt);
    const r = Math.min(4, w / 2, len);
    if (len < 0.5) return `M${x},${yb}h${w}v-0.5h-${w}Z`;
    return `M${x},${yb}V${yt + r}A${r},${r} 0 0 1 ${x + r},${yt}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${yt + r}V${yb}Z`;
  }

  /* Shared shell: card wrapper, legend, tooltip, table toggle, resize */
  function shell(container, opts, draw) {
    const host = typeof container === 'string' ? document.querySelector(container) : container;
    if (!host) return null;
    host.classList.add('viz');
    host.innerHTML = '';
    const svgWrap = document.createElement('div');
    svgWrap.style.position = 'relative';
    host.appendChild(svgWrap);
    const tip = document.createElement('div');
    tip.className = 'viz-tip';
    tip.setAttribute('role', 'status');
    tip.setAttribute('aria-live', 'polite');
    svgWrap.appendChild(tip);
    if (opts.legend && opts.legend.length > 1) {
      const ul = document.createElement('ul');
      ul.className = 'viz-legend';
      opts.legend.forEach(l => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="key ${l.line ? 'line' : ''}" style="background:${l.color}"></span>${escapeHtml(l.name)}`;
        ul.appendChild(li);
      });
      host.insertBefore(ul, svgWrap);
    }
    let tableWrap = null;
    if (opts.table) {
      const tools = document.createElement('div');
      tools.className = 'viz-tools';
      tools.style.marginTop = '10px';
      const b = document.createElement('button');
      b.className = 'btn btn-sm btn-ghost';
      b.type = 'button';
      b.setAttribute('aria-expanded', 'false');
      b.innerHTML = '<span class="label">Show data table</span>';
      tools.appendChild(b);
      host.appendChild(tools);
      tableWrap = document.createElement('div');
      tableWrap.className = 'viz-table-wrap';
      tableWrap.hidden = true;
      tableWrap.innerHTML = buildTable(opts.table);
      host.appendChild(tableWrap);
      b.addEventListener('click', () => {
        tableWrap.hidden = !tableWrap.hidden;
        b.setAttribute('aria-expanded', String(!tableWrap.hidden));
        b.querySelector('.label').textContent = tableWrap.hidden ? 'Show data table' : 'Hide data table';
      });
    }
    if (opts.source) {
      const s = document.createElement('p');
      s.className = 'source-note';
      s.textContent = opts.source;
      host.appendChild(s);
    }
    const api = {
      host, tip,
      showTip(html, x, y) {
        tip.innerHTML = html;
        tip.classList.add('show');
        const W = svgWrap.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
        let left = x + 14, top = y - th - 12;
        if (left + tw > W) left = Math.max(0, x - tw - 14);
        if (top < 0) top = y + 16;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
      },
      hideTip() { tip.classList.remove('show'); },
    };
    let lastW = 0;
    const render = () => {
      const w = Math.round(svgWrap.clientWidth || host.clientWidth || 600);
      if (w === lastW) return;
      lastW = w;
      svgWrap.querySelectorAll('svg').forEach(s => s.remove());
      const svg = draw(w, api);
      if (svg) {
        svg.setAttribute('role', 'img');
        if (opts.ariaLabel) svg.setAttribute('aria-label', opts.ariaLabel);
        svgWrap.insertBefore(svg, tip);
      }
    };
    render();
    if ('ResizeObserver' in window) new ResizeObserver(() => render()).observe(svgWrap);
    else window.addEventListener('resize', render);
    document.addEventListener('themechange', () => { lastW = 0; render(); });
    return api;
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function buildTable(t) {
    const head = '<tr>' + t.columns.map(c => `<th scope="col">${escapeHtml(c)}</th>`).join('') + '</tr>';
    const body = t.rows.map(r => '<tr>' + r.map((c, i) => i === 0 ? `<th scope="row" style="font-weight:500;background:none">${escapeHtml(c)}</th>` : `<td>${escapeHtml(c)}</td>`).join('') + '</tr>').join('');
    return `<table class="viz-table">${t.caption ? `<caption class="visually-hidden">${escapeHtml(t.caption)}</caption>` : ''}<thead>${head}</thead><tbody>${body}</tbody></table>`;
  }
  function bindHover(api, svg, mark, html, anchorFn) {
    const hit = mark;
    const on = (evt) => {
      svg.parentNode.parentNode.classList.add('has-hover');
      (mark._group || [mark]).forEach(m => m.classList.add('hot'));
      let x, y;
      if (evt && evt.clientX !== undefined && evt.type !== 'focus') {
        const r = svg.getBoundingClientRect();
        x = evt.clientX - r.left; y = evt.clientY - r.top;
      } else { const a = anchorFn(); x = a[0]; y = a[1]; }
      api.showTip(html, x, y);
    };
    const off = () => {
      svg.parentNode.parentNode.classList.remove('has-hover');
      (mark._group || [mark]).forEach(m => m.classList.remove('hot'));
      api.hideTip();
    };
    hit.addEventListener('pointermove', on);
    hit.addEventListener('pointerleave', off);
    hit.addEventListener('focus', on);
    hit.addEventListener('blur', off);
  }

  /* ---------- Horizontal bars / dot (forest) plot ----------
     opts: { data:[{label, value, lo?, hi?, note?, series?:index}], format, xLabel,
             domain?:[min,max], log?:bool, ref?:{value,label}, mark?:'bar'|'dot',
             baseline?:number, legend?, table?, source?, ariaLabel?, valueLabels?:true } */
  function hbar(container, opts) {
    const data = opts.data;
    const f = opts.format || (v => String(v));
    const isDot = opts.mark === 'dot';
    return shell(container, opts, (W, api) => {
      const narrow = W < 520;
      const labelW = narrow ? 0 : Math.min(W * 0.4, Math.max(...data.map(d => textWidth(d.label, 12.5, 500))) + 14);
      const valueW = opts.valueLabels === false ? 8 : Math.max(...data.map(d => textWidth(f(d.value), 12, 600))) + 12;
      const rowH = narrow ? 52 : 38;
      const top = 8, axisH = 36;
      const H = top + data.length * rowH + axisH;
      const x0 = labelW, x1 = W - valueW - 4;
      let min, max;
      const vals = data.flatMap(d => [d.value, d.lo, d.hi]).filter(v => v !== undefined && v !== null);
      if (opts.domain) [min, max] = opts.domain;
      else { min = Math.min(isDot || opts.log ? Math.min(...vals) : 0, ...vals); max = Math.max(...vals); if (opts.ref) { min = Math.min(min, opts.ref.value); max = Math.max(max, opts.ref.value); } }
      if (opts.log) { min = Math.max(min, 1e-9); }
      const pad = (max - min) * 0.04;
      if (!opts.domain && (isDot) && !opts.log) { min -= pad; max += pad; }
      const sx = opts.log
        ? v => x0 + (Math.log10(Math.max(v, min)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min) || 1) * (x1 - x0)
        : v => x0 + (v - min) / (max - min || 1) * (x1 - x0);
      const base = opts.baseline !== undefined ? opts.baseline : (opts.log ? min : Math.max(min, Math.min(0, max)));
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
      const g = el('g', { class: 'grid' }, svg);
      const ticks = opts.log ? logTicks(min, max) : niceTicks(min, max, narrow ? 4 : 6);
      const axis = el('g', { class: 'axis' }, svg);
      ticks.forEach(t => {
        const x = sx(t);
        if (x < x0 - 0.5 || x > x1 + 0.5) return;
        el('line', { x1: x, x2: x, y1: top, y2: top + data.length * rowH }, g);
        text(axis, x, top + data.length * rowH + 14, (opts.tickFormat || fmt.compact)(t), 'tick', 'middle');
      });
      if (opts.xLabel) text(axis, (x0 + x1) / 2, H - 6, opts.xLabel, 'axis-label', 'middle');
      if (!isDot) el('line', { x1: sx(base), x2: sx(base), y1: top, y2: top + data.length * rowH }, axis);
      if (opts.ref) {
        const rg = el('g', { class: 'ref' }, svg);
        const rx = sx(opts.ref.value);
        el('line', { x1: rx, x2: rx, y1: top - 4, y2: top + data.length * rowH }, rg);
        if (opts.ref.label) text(rg, rx + 4, top + data.length * rowH + 26, opts.ref.label, '', 'start');
      }
      data.forEach((d, i) => {
        const yMid = top + i * rowH + (narrow ? 32 : rowH / 2);
        const h = Math.min(narrow ? 16 : 18, rowH * 0.5);
        const color = d.color || seriesVar(d.series || 0);
        if (narrow) text(svg, 0, top + i * rowH + 11, d.label, 'cat', 'start');
        else text(svg, labelW - 12, yMid, d.label, 'cat', 'end');
        const grp = el('g', { class: 'mark' }, svg);
        let endX;
        if (isDot) {
          if (d.lo !== undefined && d.hi !== undefined) {
            const ci = el('g', { class: 'ci' }, grp);
            el('line', { x1: sx(d.lo), x2: sx(d.hi), y1: yMid, y2: yMid }, ci);
            el('line', { x1: sx(d.lo), x2: sx(d.lo), y1: yMid - 5, y2: yMid + 5 }, ci);
            el('line', { x1: sx(d.hi), x2: sx(d.hi), y1: yMid - 5, y2: yMid + 5 }, ci);
          }
          el('circle', { cx: sx(d.value), cy: yMid, r: 6, style: `fill:${color};stroke:var(--chart-surface);stroke-width:2` }, grp);
          endX = Math.max(sx(d.value) + 8, d.hi !== undefined ? sx(d.hi) : 0);
        } else {
          el('path', { d: hbarPath(sx(base), sx(d.value), yMid - h / 2, h), style: `fill:${color}` }, grp);
          endX = sx(d.value);
          if (d.lo !== undefined && d.hi !== undefined) {
            const ci = el('g', { class: 'ci' }, grp);
            el('line', { x1: sx(d.lo), x2: sx(d.hi), y1: yMid, y2: yMid }, ci);
            el('line', { x1: sx(d.lo), x2: sx(d.lo), y1: yMid - 4, y2: yMid + 4 }, ci);
            el('line', { x1: sx(d.hi), x2: sx(d.hi), y1: yMid - 4, y2: yMid + 4 }, ci);
            endX = Math.max(endX, sx(d.hi));
          }
        }
        if (opts.valueLabels !== false) text(svg, endX + 8, yMid, f(d.value), 'val', 'start');
        const hit = el('rect', { class: 'hit', x: 0, y: top + i * rowH, width: W, height: rowH, tabindex: 0, 'aria-label': `${d.label}: ${f(d.value)}` }, svg);
        hit._group = [grp];
        let html = `<div class="t">${escapeHtml(d.label)}</div><div class="r"><span>${escapeHtml(opts.valueName || 'Value')}</span><b>${escapeHtml(f(d.value))}</b></div>`;
        if (d.lo !== undefined && d.hi !== undefined) html += `<div class="r"><span>95% CI</span><b>${escapeHtml(f(d.lo))} – ${escapeHtml(f(d.hi))}</b></div>`;
        if (d.note) html += `<div class="note">${escapeHtml(d.note)}</div>`;
        bindHover(api, svg, hit, html, () => [Math.min(endX, W - 160), yMid]);
      });
      return svg;
    });
  }

  /* ---------- Grouped horizontal bars ----------
     opts: { categories:[...], series:[{name, values:[...], lo?:[], hi?:[], notes?:[]}], format, xLabel, domain?, ref?, mark?, table?, source? } */
  function groupedHbar(container, opts) {
    const cats = opts.categories, ser = opts.series;
    const f = opts.format || (v => String(v));
    const isDot = opts.mark === 'dot';
    opts.legend = ser.map((s, i) => ({ name: s.name, color: seriesVar(i) }));
    return shell(container, opts, (W, api) => {
      const narrow = W < 520;
      const allVals = ser.flatMap(s => s.values.concat(s.lo || [], s.hi || [])).filter(v => v !== undefined && v !== null);
      const labelW = narrow ? 0 : Math.min(W * 0.36, Math.max(...cats.map(c => textWidth(c, 12.5, 500))) + 14);
      const valueW = Math.max(...allVals.map(v => textWidth(f(v), 12, 600))) + 14;
      const barH = 16, gap = 2, catPad = narrow ? 34 : 20;
      const groupH = ser.length * barH + (ser.length - 1) * gap;
      const rowH = groupH + catPad;
      const top = 8, axisH = 36;
      const H = top + cats.length * rowH + axisH;
      const x0 = labelW, x1 = W - valueW;
      let [min, max] = opts.domain || [Math.min(0, ...allVals), Math.max(...allVals)];
      if (opts.ref && !opts.domain) { min = Math.min(min, opts.ref.value); max = Math.max(max, opts.ref.value); }
      const sx = v => x0 + (v - min) / (max - min || 1) * (x1 - x0);
      const base = Math.max(min, Math.min(0, max));
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
      const g = el('g', { class: 'grid' }, svg), axis = el('g', { class: 'axis' }, svg);
      niceTicks(min, max, narrow ? 4 : 6).forEach(t => {
        const x = sx(t);
        if (x < x0 - .5 || x > x1 + .5) return;
        el('line', { x1: x, x2: x, y1: top, y2: top + cats.length * rowH - catPad / 2 }, g);
        text(axis, x, top + cats.length * rowH - catPad / 2 + 14, (opts.tickFormat || fmt.compact)(t), 'tick', 'middle');
      });
      if (opts.xLabel) text(axis, (x0 + x1) / 2, H - 6, opts.xLabel, 'axis-label', 'middle');
      if (!isDot) el('line', { x1: sx(base), x2: sx(base), y1: top, y2: top + cats.length * rowH - catPad / 2 }, axis);
      if (opts.ref) {
        const rg = el('g', { class: 'ref' }, svg);
        el('line', { x1: sx(opts.ref.value), x2: sx(opts.ref.value), y1: top - 4, y2: top + cats.length * rowH - catPad / 2 }, rg);
        if (opts.ref.label) text(rg, sx(opts.ref.value) + 4, H - 20, opts.ref.label, '', 'start');
      }
      cats.forEach((c, ci) => {
        const gy = top + ci * rowH + (narrow ? 22 : catPad / 2);
        if (narrow) text(svg, 0, top + ci * rowH + 9, c, 'cat', 'start');
        else text(svg, labelW - 12, gy + groupH / 2, c, 'cat', 'end');
        const marks = [];
        ser.forEach((s, si) => {
          const v = s.values[ci];
          if (v === undefined || v === null) return;
          const y = gy + si * (barH + gap);
          const grp = el('g', { class: 'mark' }, svg);
          let endX;
          if (isDot) {
            if (s.lo && s.hi && s.lo[ci] !== undefined) {
              const cg = el('g', { class: 'ci' }, grp);
              el('line', { x1: sx(s.lo[ci]), x2: sx(s.hi[ci]), y1: y + barH / 2, y2: y + barH / 2 }, cg);
            }
            el('circle', { cx: sx(v), cy: y + barH / 2, r: 5.5, style: `fill:${seriesVar(si)};stroke:var(--chart-surface);stroke-width:2` }, grp);
            endX = Math.max(sx(v) + 7, s.hi && s.hi[ci] !== undefined ? sx(s.hi[ci]) : 0);
          } else {
            el('path', { d: hbarPath(sx(base), sx(v), y, barH), style: `fill:${seriesVar(si)}` }, grp);
            endX = sx(v);
            if (s.lo && s.hi && s.lo[ci] !== undefined) {
              const cg = el('g', { class: 'ci' }, grp);
              el('line', { x1: sx(s.lo[ci]), x2: sx(s.hi[ci]), y1: y + barH / 2, y2: y + barH / 2 }, cg);
              el('line', { x1: sx(s.hi[ci]), x2: sx(s.hi[ci]), y1: y + barH / 2 - 4, y2: y + barH / 2 + 4 }, cg);
              endX = Math.max(endX, sx(s.hi[ci]));
            }
          }
          text(svg, endX + 6, y + barH / 2, f(v), 'val', 'start');
          marks.push({ grp, s, si, v, endX, y });
        });
        const hit = el('rect', { class: 'hit', x: 0, y: top + ci * rowH, width: W, height: rowH, tabindex: 0, 'aria-label': c + ': ' + marks.map(m => `${m.s.name} ${f(m.v)}`).join(', ') }, svg);
        hit._group = marks.map(m => m.grp);
        let html = `<div class="t">${escapeHtml(c)}</div>`;
        marks.forEach(m => {
          html += `<div class="r"><span><i class="sw" style="background:${seriesVar(m.si)}"></i>${escapeHtml(m.s.name)}</span><b>${escapeHtml(f(m.v))}${m.s.lo && m.s.lo[ci] !== undefined ? ` <span style="font-weight:400;color:var(--ink-3)">(${escapeHtml(f(m.s.lo[ci]))}–${escapeHtml(f(m.s.hi[ci]))})</span>` : ''}</b></div>`;
          if (m.s.notes && m.s.notes[ci]) html += `<div class="note">${escapeHtml(m.s.notes[ci])}</div>`;
        });
        bindHover(api, svg, hit, html, () => [Math.min(Math.max(...marks.map(m => m.endX)), W - 180), gy]);
      });
      return svg;
    });
  }

  /* ---------- Line chart ----------
     opts: { series:[{name, points:[{x, y, lo?, hi?}]}], format, xFormat, yLabel, xLabel, yDomain?, table?, source? } */
  function line(container, opts) {
    const ser = opts.series;
    const f = opts.format || (v => String(v));
    const xf = opts.xFormat || (v => String(v));
    opts.legend = ser.length > 1 ? ser.map((s, i) => ({ name: s.name, color: seriesVar(s.seriesIndex !== undefined ? s.seriesIndex : i), line: true })) : null;
    return shell(container, opts, (W, api) => {
      const narrow = W < 520;
      const H = opts.height || (narrow ? 260 : 320);
      const xs = Array.from(new Set(ser.flatMap(s => s.points.map(p => p.x)))).sort((a, b) => a - b);
      const ys = ser.flatMap(s => s.points.flatMap(p => [p.y, p.lo, p.hi])).filter(v => v !== undefined && v !== null);
      let [ymin, ymax] = opts.yDomain || [Math.min(...ys), Math.max(...ys)];
      if (!opts.yDomain) { const p = (ymax - ymin) * 0.12 || 1; ymin = Math.max(opts.zeroBased ? 0 : -Infinity, ymin - p); ymax += p; if (opts.zeroBased) ymin = 0; }
      const ticks = niceTicks(ymin, ymax, narrow ? 4 : 5);
      ymin = Math.min(ymin, ticks[0]); ymax = Math.max(ymax, ticks[ticks.length - 1]);
      const leftW = Math.max(...ticks.map(t => textWidth((opts.tickFormat || f)(t), 11.5))) + 12;
      const endLabels = ser.length <= 4 && !narrow;
      const rightW = endLabels ? Math.max(...ser.map(s => textWidth(s.name, 12, 600))) + 22 : 14;
      const top = 14, bottom = opts.xLabel ? 44 : 30;
      const x0 = leftW, x1 = W - rightW, y0 = H - bottom, y1 = top;
      const sx = x => x0 + (xs.length > 1 ? (x - xs[0]) / (xs[xs.length - 1] - xs[0]) : 0.5) * (x1 - x0);
      const sy = y => y0 - (y - ymin) / (ymax - ymin || 1) * (y0 - y1);
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
      const g = el('g', { class: 'grid' }, svg), axis = el('g', { class: 'axis' }, svg);
      ticks.forEach(t => { el('line', { x1: x0, x2: x1, y1: sy(t), y2: sy(t) }, g); text(axis, x0 - 8, sy(t), (opts.tickFormat || f)(t), 'tick', 'end'); });
      el('line', { x1: x0, x2: x1, y1: y0, y2: y0 }, axis);
      const every = Math.ceil(xs.length / (narrow ? 5 : 10));
      xs.forEach((x, i) => { if (i % every === 0 || i === xs.length - 1) text(axis, sx(x), y0 + 14, xf(x), 'tick', 'middle'); });
      if (opts.xLabel) text(axis, (x0 + x1) / 2, H - 6, opts.xLabel, 'axis-label', 'middle');
      if (opts.yLabel) text(axis, x0, 4, opts.yLabel, 'axis-label', 'start');
      const marks = [];
      ser.forEach((s, si) => {
        const idx = s.seriesIndex !== undefined ? s.seriesIndex : si;
        const color = seriesVar(idx);
        const pts = s.points.slice().sort((a, b) => a.x - b.x);
        const grp = el('g', { class: 'mark' }, svg);
        if (pts.some(p => p.lo !== undefined)) {
          const up = pts.map(p => `${sx(p.x)},${sy(p.hi)}`), dn = pts.slice().reverse().map(p => `${sx(p.x)},${sy(p.lo)}`);
          el('path', { d: 'M' + up.join('L') + 'L' + dn.join('L') + 'Z', style: `fill:${color};opacity:.12` }, grp);
        }
        el('path', { d: 'M' + pts.map(p => `${sx(p.x)},${sy(p.y)}`).join('L'), style: `fill:none;stroke:${color};stroke-width:2;stroke-linejoin:round;stroke-linecap:round` }, grp);
        const last = pts[pts.length - 1];
        el('circle', { cx: sx(last.x), cy: sy(last.y), r: 4.5, style: `fill:${color};stroke:var(--chart-surface);stroke-width:2` }, grp);
        if (endLabels) text(svg, sx(last.x) + 10, sy(last.y), s.name, 'val', 'start');
        marks.push({ grp, s, pts, color });
      });
      if (endLabels) {
        // de-collide end labels with leader-free minimal nudge only when lines are well separated
        const labels = Array.from(svg.querySelectorAll('text.val'));
        labels.sort((a, b) => +a.getAttribute('y') - +b.getAttribute('y'));
        for (let i = 1; i < labels.length; i++) {
          const py = +labels[i - 1].getAttribute('y'), cy = +labels[i].getAttribute('y');
          if (cy - py < 14) labels[i].setAttribute('y', py + 14);
        }
      }
      const cross = el('line', { class: 'crosshair', x1: 0, x2: 0, y1: y1, y2: y0, style: 'opacity:0' }, svg);
      const dots = marks.map(m => el('circle', { r: 4.5, style: `fill:${m.color};stroke:var(--chart-surface);stroke-width:2;opacity:0` }, svg));
      const hit = el('rect', { class: 'hit', x: x0, y: y1, width: x1 - x0, height: y0 - y1, tabindex: 0, 'aria-label': opts.ariaLabel || 'Line chart; use arrow keys to step through points' }, svg);
      let ki = xs.length - 1;
      const show = (xi, px, py) => {
        const xv = xs[xi];
        cross.setAttribute('x1', sx(xv)); cross.setAttribute('x2', sx(xv)); cross.style.opacity = 1;
        let html = `<div class="t">${escapeHtml(xf(xv))}</div>`;
        marks.forEach((m, mi) => {
          const p = m.pts.find(q => q.x === xv);
          if (!p) { dots[mi].style.opacity = 0; return; }
          dots[mi].setAttribute('cx', sx(xv)); dots[mi].setAttribute('cy', sy(p.y)); dots[mi].style.opacity = 1;
          html += `<div class="r"><span><i class="sw" style="background:${m.color}"></i>${escapeHtml(m.s.name)}</span><b>${escapeHtml(f(p.y))}</b></div>`;
          if (p.lo !== undefined) html += `<div class="note">95% CI ${escapeHtml(f(p.lo))} – ${escapeHtml(f(p.hi))}</div>`;
          if (p.note) html += `<div class="note">${escapeHtml(p.note)}</div>`;
        });
        api.showTip(html, px !== undefined ? px : sx(xv), py !== undefined ? py : y1 + 20);
      };
      const hide = () => { cross.style.opacity = 0; dots.forEach(d => { d.style.opacity = 0; }); api.hideTip(); };
      hit.addEventListener('pointermove', e => {
        const r = svg.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
        let best = 0, bd = Infinity;
        xs.forEach((x, i) => { const d = Math.abs(sx(x) - px); if (d < bd) { bd = d; best = i; } });
        ki = best; show(best, px, py);
      });
      hit.addEventListener('pointerleave', hide);
      hit.addEventListener('focus', () => show(ki));
      hit.addEventListener('blur', hide);
      hit.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') { ki = Math.min(xs.length - 1, ki + 1); show(ki); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { ki = Math.max(0, ki - 1); show(ki); e.preventDefault(); }
      });
      return svg;
    });
  }

  /* ---------- 100% stacked bar (part-to-whole, 2–5 parts) ----------
     opts: { segments:[{label, value, note?}], format, total?, unit? } */
  function stack(container, opts) {
    const segs = opts.segments;
    const total = opts.total || segs.reduce((a, s) => a + s.value, 0);
    const f = opts.format || (v => fmt.pct(1)(v / total * 100));
    opts.legend = segs.map((s, i) => ({ name: s.label, color: s.color || seriesVar(s.series !== undefined ? s.series : i) }));
    return shell(container, opts, (W, api) => {
      const h = 40, H = h + 8;
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
      let x = 0;
      const gap = 2, usable = W - gap * (segs.length - 1);
      segs.forEach((s, i) => {
        const w = Math.max(1, usable * s.value / total);
        const color = s.color || seriesVar(s.series !== undefined ? s.series : i);
        const grp = el('g', { class: 'mark' }, svg);
        const r = 6;
        const left = i === 0, right = i === segs.length - 1;
        const d = `M${x + (left ? r : 0)},4H${x + w - (right ? r : 0)}${right ? `A${r},${r} 0 0 1 ${x + w},${4 + r}V${4 + h - r}A${r},${r} 0 0 1 ${x + w - r},${4 + h}` : `V${4 + h}`}H${x + (left ? r : 0)}${left ? `A${r},${r} 0 0 1 ${x},${4 + h - r}V${4 + r}A${r},${r} 0 0 1 ${x + r},4` : `V4`}Z`;
        el('path', { d, style: `fill:${color}` }, grp);
        const lab = f(s.value);
        const ink = (opts.darkInk || []).includes(i) ? '#0b0b0b' : '#ffffff';
        if (textWidth(lab, 12, 600) + 16 < w) text(grp, x + w / 2, 4 + h / 2, lab, 'inside', 'middle', { style: `fill:${ink}` });
        const hit = el('rect', { class: 'hit', x, y: 0, width: w, height: H, tabindex: 0, 'aria-label': `${s.label}: ${lab}` }, svg);
        hit._group = [grp];
        let html = `<div class="t">${escapeHtml(s.label)}</div><div class="r"><span>Share</span><b>${escapeHtml(lab)}</b></div>`;
        if (opts.valueFormat) html += `<div class="r"><span>${escapeHtml(opts.valueName || 'Value')}</span><b>${escapeHtml(opts.valueFormat(s.value))}</b></div>`;
        if (s.note) html += `<div class="note">${escapeHtml(s.note)}</div>`;
        const cx = x + w / 2;
        bindHover(api, svg, hit, html, () => [cx, 4]);
        x += w + gap;
      });
      return svg;
    });
  }

  /* ---------- Funnel / pipeline (ordinal ramp, labeled) ----------
     opts: { steps:[{label, value, note?}], format, log? } */
  function funnel(container, opts) {
    const steps = opts.steps;
    const f = opts.format || fmt.int;
    if (opts.log) opts.source = 'Bar lengths on a log scale so small counts stay visible; labels show exact values.' + (opts.source ? ' ' + opts.source : '');
    return shell(container, opts, (W, api) => {
      const narrow = W < 560;
      const rowH = narrow ? 54 : 44, top = 4;
      const H = top + steps.length * rowH;
      const labelW = narrow ? 0 : Math.min(W * 0.42, Math.max(...steps.map(s => textWidth(s.label, 12.5, 500))) + 16);
      const valueW = Math.max(...steps.map(s => textWidth(f(s.value), 12, 600))) + 14;
      const x0 = labelW, x1 = W - valueW;
      const maxV = Math.max(...steps.map(s => s.value));
      const minV = Math.min(...steps.map(s => s.value));
      const sw = opts.log
        ? v => Math.max(2, (Math.log10(v) - Math.log10(minV) * 0.98) / (Math.log10(maxV) - Math.log10(minV) * 0.98) * (x1 - x0))
        : v => Math.max(2, v / maxV * (x1 - x0));
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
      steps.forEach((s, i) => {
        const y = top + i * rowH + (narrow ? 24 : 10);
        const h = 22;
        const color = `var(${RAMP[Math.min(RAMP.length - 1, Math.round(i * (RAMP.length - 1) / Math.max(1, steps.length - 1)))]})`;
        if (narrow) text(svg, 0, top + i * rowH + 11, s.label, 'cat', 'start');
        else text(svg, labelW - 12, y + h / 2, s.label, 'cat', 'end');
        const grp = el('g', { class: 'mark' }, svg);
        const w = sw(s.value);
        el('path', { d: hbarPath(x0, x0 + w, y, h), style: `fill:${color}` }, grp);
        text(svg, x0 + w + 8, y + h / 2, f(s.value), 'val', 'start');
        const hit = el('rect', { class: 'hit', x: 0, y: top + i * rowH, width: W, height: rowH, tabindex: 0, 'aria-label': `${s.label}: ${f(s.value)}` }, svg);
        hit._group = [grp];
        let html = `<div class="t">${escapeHtml(s.label)}</div><div class="r"><span>Count</span><b>${escapeHtml(f(s.value))}</b></div>`;
        if (i > 0) html += `<div class="r"><span>vs. previous step</span><b>${(s.value / steps[i - 1].value * 100).toFixed(1)}%</b></div>`;
        if (s.note) html += `<div class="note">${escapeHtml(s.note)}</div>`;
        bindHover(api, svg, hit, html, () => [Math.min(x0 + w, W - 180), y]);
      });
      return svg;
    });
  }

  /* ---------- Vertical columns (single or grouped) ----------
     opts: { categories:[...], series:[{name, values:[...]}], format, yLabel, yDomain?, table?, source? } */
  function columns(container, opts) {
    const cats = opts.categories, ser = opts.series;
    const f = opts.format || (v => String(v));
    opts.legend = ser.length > 1 ? ser.map((s, i) => ({ name: s.name, color: seriesVar(i) })) : null;
    return shell(container, opts, (W, api) => {
      const narrow = W < 520;
      const H = opts.height || (narrow ? 260 : 300);
      const vals = ser.flatMap(s => s.values).filter(v => v !== undefined && v !== null);
      let [ymin, ymax] = opts.yDomain || [Math.min(0, ...vals), Math.max(...vals) * 1.12];
      const ticks = niceTicks(ymin, ymax, 4);
      ymax = Math.max(ymax, ticks[ticks.length - 1]);
      const leftW = Math.max(...ticks.map(t => textWidth((opts.tickFormat || f)(t), 11.5))) + 12;
      const top = 18, bottom = 46;
      const x0 = leftW, x1 = W - 6, y0 = H - bottom, y1 = top;
      const sy = v => y0 - (v - ymin) / (ymax - ymin || 1) * (y0 - y1);
      const band = (x1 - x0) / cats.length;
      const bw = Math.min(24, (band * 0.7 - (ser.length - 1) * 2) / ser.length);
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
      const g = el('g', { class: 'grid' }, svg), axis = el('g', { class: 'axis' }, svg);
      ticks.forEach(t => { el('line', { x1: x0, x2: x1, y1: sy(t), y2: sy(t) }, g); text(axis, x0 - 8, sy(t), (opts.tickFormat || f)(t), 'tick', 'end'); });
      el('line', { x1: x0, x2: x1, y1: sy(Math.max(0, ymin)), y2: sy(Math.max(0, ymin)) }, axis);
      if (opts.yLabel) text(axis, x0, 4, opts.yLabel, 'axis-label', 'start');
      cats.forEach((c, ci) => {
        const cx = x0 + band * ci + band / 2;
        const groupW = ser.length * bw + (ser.length - 1) * 2;
        const words = String(c).split(' ');
        if (narrow && words.length > 1) { text(axis, cx, y0 + 14, words[0], 'tick', 'middle'); text(axis, cx, y0 + 28, words.slice(1).join(' '), 'tick', 'middle'); }
        else text(axis, cx, y0 + 16, c, 'tick', 'middle');
        const marks = [];
        ser.forEach((s, si) => {
          const v = s.values[ci];
          if (v === undefined || v === null) return;
          const x = cx - groupW / 2 + si * (bw + 2);
          const grp = el('g', { class: 'mark' }, svg);
          el('path', { d: vbarPath(x, bw, sy(Math.max(0, ymin)), sy(v)), style: `fill:${seriesVar(si)}` }, grp);
          if (ser.length === 1 || opts.valueLabels) text(svg, x + bw / 2, sy(v) - 9, f(v), 'val', 'middle');
          marks.push({ grp, s, si, v });
        });
        const hit = el('rect', { class: 'hit', x: x0 + band * ci, y: y1, width: band, height: y0 - y1, tabindex: 0, 'aria-label': c + ': ' + marks.map(m => `${m.s.name} ${f(m.v)}`).join(', ') }, svg);
        hit._group = marks.map(m => m.grp);
        let html = `<div class="t">${escapeHtml(c)}</div>`;
        marks.forEach(m => { html += `<div class="r"><span>${ser.length > 1 ? `<i class="sw" style="background:${seriesVar(m.si)}"></i>` : ''}${escapeHtml(m.s.name)}</span><b>${escapeHtml(f(m.v))}</b></div>`; });
        bindHover(api, svg, hit, html, () => [cx, sy(Math.max(...marks.map(m => m.v)))]);
      });
      return svg;
    });
  }

  return { hbar, groupedHbar, line, stack, funnel, columns, fmt, seriesVar };
})();

/* Honors filter (home page) */
(function () {
  var btns = document.querySelectorAll('[data-hon]');
  if (!btns.length) return;
  var items = document.querySelectorAll('.hon-list .hon');
  Array.prototype.forEach.call(btns, function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-hon');
      Array.prototype.forEach.call(btns, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      Array.prototype.forEach.call(items, function (li) { li.hidden = f !== 'all' && li.getAttribute('data-cat') !== f; });
    });
  });
})();
