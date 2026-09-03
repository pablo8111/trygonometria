/* ============================================================
   Trygonometria — wspólna warstwa: nawigacja, postęp, rysowanie
   Wszystko wisi na globalnym obiekcie TR (bez modułów, bez CDN).
   ============================================================ */

const TR = (function () {
  'use strict';

  /* ---------------- moduły witryny ---------------- */

  const MODULES = [
    { id: 'katy', file: 'katy.html', n: '01', title: 'Kąty i miara łukowa', short: 'Kąty',
      desc: 'Stopnie, radiany, kąt skierowany. Długość łuku i pole wycinka.' },
    { id: 'trojkat', file: 'trojkat.html', n: '02', title: 'Trójkąt prostokątny', short: 'Trójkąt',
      desc: 'Skąd biorą się sinus, cosinus i tangens. Definicje przez stosunki boków.' },
    { id: 'kolo', file: 'kolo.html', n: '03', title: 'Koło jednostkowe', short: 'Koło',
      desc: 'Rozszerzenie definicji na dowolny kąt. Znaki w ćwiartkach, wartości szczególne.' },
    { id: 'wykresy', file: 'wykresy.html', n: '04', title: 'Wykresy funkcji', short: 'Wykresy',
      desc: 'Sinusoida, cosinusoida, tangensoida. Amplituda, okres, przesunięcia.' },
    { id: 'tozsamosci', file: 'tozsamosci.html', n: '05', title: 'Tożsamości i wzory', short: 'Tożsamości',
      desc: 'Jedynka trygonometryczna, wzory redukcyjne, sumy kątów, kąt podwojony.' },
    { id: 'rownania', file: 'rownania.html', n: '06', title: 'Równania trygonometryczne', short: 'Równania',
      desc: 'Rozwiązania na kole, wzory ogólne z parametrem k, nierówności.' },
    { id: 'twierdzenia', file: 'twierdzenia.html', n: '07', title: 'Twierdzenia sinusów i cosinusów', short: 'Twierdzenia',
      desc: 'Trygonometria w dowolnym trójkącie. Pole trójkąta, promień okręgu opisanego.' },
    { id: 'trening', file: 'trening.html', n: '08', title: 'Trening', short: 'Trening',
      desc: 'Losowe zadania z całego działu, poziomy trudności, statystyki.' },
    { id: 'sciagawka', file: 'sciagawka.html', n: '09', title: 'Ściągawka', short: 'Ściągawka',
      desc: 'Wszystkie wzory na jednej stronie. Gotowa do wydruku.' }
  ];

  /* ---------------- drobne narzędzia ---------------- */

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;

  /** Liczba po polsku: przecinek zamiast kropki, bez zbędnych zer. */
  function fmt(v, d) {
    if (!isFinite(v)) return '—';
    d = d === undefined ? 3 : d;
    let s = Math.abs(v) < 5e-13 ? '0' : v.toFixed(d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s.replace('.', ',').replace('-', '−');
  }

  /** Normalizacja kąta do [0, 360). */
  function norm360(d) { return ((d % 360) + 360) % 360; }

  /** Największy wspólny dzielnik — do skracania wielokrotności π. */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a; }

  /**
   * Kąt w stopniach → zapis w radianach jako wielokrotność π (tekst).
   * 135 → "3π/4", 180 → "π", 0 → "0". Gdy nie wychodzi ładnie: null.
   */
  function radPiText(deg) {
    const p = deg * 6, q = 1080;              // deg/180 = (deg*6)/1080
    if (Math.abs(p - Math.round(p)) > 1e-9) return null;
    let num = Math.round(p), den = q;
    const g = gcd(num, den) || 1;
    num /= g; den /= g;
    if (num === 0) return '0';
    const sign = num < 0 ? '−' : '';
    num = Math.abs(num);
    const top = num === 1 ? 'π' : num + 'π';
    return den === 1 ? sign + top : sign + top + '/' + den;
  }

  /** "−√3/2" → HTML z ładną kreską ułamkową. */
  function fracHTML(text) {
    if (text == null) return '—';
    const m = /^(−|-)?(.+?)\/(.+)$/.exec(String(text));
    if (!m) return String(text);
    return (m[1] ? '−' : '') +
      '<span class="frac"><span>' + m[2] + '</span><span>' + m[3] + '</span></span>';
  }

  /* ---------------- wartości szczególne ---------------- */

  // stopnie → [sin, cos, tg] w postaci dokładnej (null = nie istnieje)
  const EXACT = {
    0:   ['0', '1', '0'],
    30:  ['1/2', '√3/2', '√3/3'],
    45:  ['√2/2', '√2/2', '1'],
    60:  ['√3/2', '1/2', '√3'],
    90:  ['1', '0', null],
    120: ['√3/2', '−1/2', '−√3'],
    135: ['√2/2', '−√2/2', '−1'],
    150: ['1/2', '−√3/2', '−√3/3'],
    180: ['0', '−1', '0'],
    210: ['−1/2', '−√3/2', '√3/3'],
    225: ['−√2/2', '−√2/2', '1'],
    240: ['−√3/2', '−1/2', '√3'],
    270: ['−1', '0', null],
    300: ['−√3/2', '1/2', '−√3'],
    315: ['−√2/2', '√2/2', '−1'],
    330: ['−1/2', '√3/2', '−√3/3']
  };
  const FN_IDX = { sin: 0, cos: 1, tg: 2 };

  /** Dokładna wartość funkcji dla kąta szczególnego albo null. */
  function exact(fn, deg) {
    const row = EXACT[norm360(Math.round(deg * 1e6) / 1e6)];
    if (!row) return undefined;                 // kąt nieszczególny
    return row[FN_IDX[fn]];                     // null = nie istnieje
  }
  function exactHTML(fn, deg) {
    const e = exact(fn, deg);
    if (e === undefined) return null;
    if (e === null) return '<span class="muted">nie istnieje</span>';
    return fracHTML(e);
  }
  const SPECIAL_DEGS = Object.keys(EXACT).map(Number).sort((a, b) => a - b);

  /** Najbliższy kąt szczególny, jeśli w promieniu tol stopni. */
  function snapSpecial(deg, tol) {
    const d = norm360(deg);
    let best = null, bd = Infinity;
    for (const s of SPECIAL_DEGS.concat([360])) {
      const dist = Math.abs(d - s);
      if (dist < bd) { bd = dist; best = s; }
    }
    return bd <= (tol === undefined ? 4 : tol) ? norm360(best) : null;
  }

  /* ---------------- postęp nauki (localStorage) ---------------- */

  const KEY = 'tryg.v1';

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function saveState(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* tryb prywatny — trudno */ }
  }

  const progress = {
    all() { return loadState(); },
    visit(id) {
      const s = loadState();
      s[id] = s[id] || {};
      s[id].visited = true;
      saveState(s);
    },
    /** Oznacz moduł jako opanowany (po zaliczonym zestawie zadań). */
    done(id) {
      const s = loadState();
      s[id] = s[id] || {};
      if (!s[id].done) { s[id].done = true; saveState(s); }
    },
    isDone(id) { const s = loadState(); return !!(s[id] && s[id].done); },
    /** Zapisz najlepszy wynik quizu (0–1). */
    score(id, value) {
      const s = loadState();
      s[id] = s[id] || {};
      if (!(s[id].best >= value)) s[id].best = value;
      saveState(s);
    },
    reset() { try { localStorage.removeItem(KEY); } catch (e) {} }
  };

  /* ---------------- motyw ---------------- */

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('tryg.theme'); } catch (e) {}
    if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
  }
  function toggleTheme() {
    const el = document.documentElement;
    const isDark = el.dataset.theme
      ? el.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    el.dataset.theme = isDark ? 'light' : 'dark';
    try { localStorage.setItem('tryg.theme', el.dataset.theme); } catch (e) {}
    colorCache = null;
    window.dispatchEvent(new Event('tr:theme'));
  }

  /* ---------------- kolory z CSS ---------------- */


  /** Kolor z przezroczystością: "#5b4bd6" + 0.14 → "rgba(91,75,214,0.14)". */
  function alpha(col, a) {
    if (typeof col !== 'string') return col;
    const c = col.trim();
    let r, g, b;
    if (/^#[0-9a-f]{3}$/i.test(c)) {
      r = parseInt(c[1] + c[1], 16); g = parseInt(c[2] + c[2], 16); b = parseInt(c[3] + c[3], 16);
    } else if (/^#[0-9a-f]{6}$/i.test(c)) {
      r = parseInt(c.slice(1, 3), 16); g = parseInt(c.slice(3, 5), 16); b = parseInt(c.slice(5, 7), 16);
    } else {
      const m = /^rgba?\(([^)]+)\)$/i.exec(c);
      if (!m) return c;
      const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      [r, g, b] = parts;
    }
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  let colorCache = null;
  function colors() {
    if (colorCache) return colorCache;
    const cs = getComputedStyle(document.documentElement);
    const g = (n, fb) => (cs.getPropertyValue(n).trim() || fb);
    colorCache = {
      ink:  g('--ink', '#1c2230'),
      ink2: g('--ink-2', '#4a5568'),
      ink3: g('--ink-3', '#7b8494'),
      line: g('--line', '#e2ded4'),
      line2: g('--line-2', '#cfcabc'),
      surface: g('--surface', '#fff'),
      bgSoft: g('--bg-soft', '#efece4'),
      sin: g('--sin', '#d4453c'),
      cos: g('--cos', '#2563c9'),
      tan: g('--tan', '#12866b'),
      accent: g('--accent', '#5b4bd6'),
      gold: g('--gold', '#b8860b'),
      ok: g('--ok', '#157f45'),
      bad: g('--bad', '#c0392b')
    };
    return colorCache;
  }
  window.addEventListener('tr:theme', () => { colorCache = null; });
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', () => { colorCache = null; });
  }

  /* ============================================================
     Plot — cienka warstwa nad <canvas>: układ współrzędnych,
     siatka, osie, wykresy funkcji, przeciąganie punktów.
     ============================================================ */

  function Plot(canvas, o) {
    o = o || {};
    const ctx = canvas.getContext('2d');
    const base = {
      xmin: o.xmin === undefined ? -1.4 : o.xmin,
      xmax: o.xmax === undefined ? 1.4 : o.xmax,
      ymin: o.ymin === undefined ? -1.4 : o.ymin,
      ymax: o.ymax === undefined ? 1.4 : o.ymax
    };

    const p = {
      canvas, ctx,
      equal: !!o.equal,
      ratio: o.ratio || 0.62,
      maxH: o.maxH || 520,
      win: Object.assign({}, base),
      w: 0, h: 0, sx: 1, sy: 1,
      draw: o.draw || function () {}
    };

    p.setWindow = function (win) { Object.assign(base, win); p.layout(); };

    p.layout = function () {
      const cssW = Math.max(160, canvas.clientWidth || canvas.parentNode.clientWidth || 600);
      const cssH = Math.min(p.maxH, Math.round(cssW * p.ratio));
      canvas.style.height = cssH + 'px';
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      p.w = cssW; p.h = cssH;

      let { xmin, xmax, ymin, ymax } = base;
      if (p.equal) {
        const want = (xmax - xmin) / (ymax - ymin);
        const have = cssW / cssH;
        if (have > want) {
          const nw = (ymax - ymin) * have, cx = (xmin + xmax) / 2;
          xmin = cx - nw / 2; xmax = cx + nw / 2;
        } else {
          const nh = (xmax - xmin) / have, cy = (ymin + ymax) / 2;
          ymin = cy - nh / 2; ymax = cy + nh / 2;
        }
      }
      p.win = { xmin, xmax, ymin, ymax };
      p.sx = cssW / (xmax - xmin);
      p.sy = cssH / (ymax - ymin);
    };

    p.X = (x) => (x - p.win.xmin) * p.sx;
    p.Y = (y) => p.h - (y - p.win.ymin) * p.sy;
    p.ix = (px) => p.win.xmin + px / p.sx;
    p.iy = (py) => p.win.ymin + (p.h - py) / p.sy;
    p.unit = () => p.sx;                       // px na jednostkę osi X

    p.clear = function () {
      ctx.clearRect(0, 0, p.w, p.h);
    };

    /** Siatka o zadanym kroku. */
    p.grid = function (stepX, stepY, opt) {
      opt = opt || {};
      const c = colors();
      ctx.save();
      ctx.strokeStyle = opt.color || c.line;
      ctx.lineWidth = opt.width || 1;
      ctx.beginPath();
      if (stepX) {
        const from = Math.ceil(p.win.xmin / stepX) * stepX;
        for (let x = from; x <= p.win.xmax + 1e-9; x += stepX) {
          const px = Math.round(p.X(x)) + .5;
          ctx.moveTo(px, 0); ctx.lineTo(px, p.h);
        }
      }
      if (stepY) {
        const from = Math.ceil(p.win.ymin / stepY) * stepY;
        for (let y = from; y <= p.win.ymax + 1e-9; y += stepY) {
          const py = Math.round(p.Y(y)) + .5;
          ctx.moveTo(0, py); ctx.lineTo(p.w, py);
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    /** Osie z grotami i podpisami. opt.labelX(x) / opt.labelY(y) zwracają tekst albo null. */
    p.axes = function (opt) {
      opt = opt || {};
      const c = colors();
      const x0 = p.X(0), y0 = p.Y(0);
      ctx.save();
      ctx.strokeStyle = c.ink3;
      ctx.fillStyle = c.ink3;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y0) + .5); ctx.lineTo(p.w, Math.round(y0) + .5);
      ctx.moveTo(Math.round(x0) + .5, p.h); ctx.lineTo(Math.round(x0) + .5, 0);
      ctx.stroke();
      // groty
      ctx.beginPath();
      ctx.moveTo(p.w - 9, y0 - 4.5); ctx.lineTo(p.w - 1, y0); ctx.lineTo(p.w - 9, y0 + 4.5);
      ctx.moveTo(x0 - 4.5, 9); ctx.lineTo(x0, 1); ctx.lineTo(x0 + 4.5, 9);
      ctx.fill();
      // podpisy
      ctx.font = '11px ui-monospace, monospace';
      ctx.fillStyle = c.ink3;
      if (opt.tickX) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const from = Math.ceil(p.win.xmin / opt.tickX) * opt.tickX;
        for (let x = from; x <= p.win.xmax + 1e-9; x += opt.tickX) {
          if (Math.abs(x) < 1e-9) continue;
          const t = opt.labelX ? opt.labelX(x) : fmt(x, 2);
          if (t == null) continue;
          const px = p.X(x);
          ctx.beginPath(); ctx.strokeStyle = c.ink3;
          ctx.moveTo(px, y0 - 3); ctx.lineTo(px, y0 + 3); ctx.stroke();
          ctx.fillText(t, px, y0 + 6);
        }
      }
      if (opt.tickY) {
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        const from = Math.ceil(p.win.ymin / opt.tickY) * opt.tickY;
        for (let y = from; y <= p.win.ymax + 1e-9; y += opt.tickY) {
          if (Math.abs(y) < 1e-9) continue;
          const t = opt.labelY ? opt.labelY(y) : fmt(y, 2);
          if (t == null) continue;
          const py = p.Y(y);
          ctx.beginPath(); ctx.strokeStyle = c.ink3;
          ctx.moveTo(x0 - 3, py); ctx.lineTo(x0 + 3, py); ctx.stroke();
          ctx.fillText(t, x0 - 6, py);
        }
      }
      ctx.restore();
    };

    /** Odcinek w układzie świata. */
    p.seg = function (x1, y1, x2, y2, style) {
      style = style || {};
      ctx.save();
      ctx.strokeStyle = style.color || colors().ink;
      ctx.lineWidth = style.width || 2;
      ctx.lineCap = 'round';
      if (style.dash) ctx.setLineDash(style.dash);
      ctx.beginPath();
      ctx.moveTo(p.X(x1), p.Y(y1));
      ctx.lineTo(p.X(x2), p.Y(y2));
      ctx.stroke();
      ctx.restore();
    };

    /** Łamana / krzywa z tablicy [[x,y],...]. */
    p.path = function (pts, style) {
      style = style || {};
      if (!pts.length) return;
      ctx.save();
      ctx.strokeStyle = style.color || colors().ink;
      ctx.lineWidth = style.width || 2.2;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (style.dash) ctx.setLineDash(style.dash);
      ctx.beginPath();
      let pen = false;
      for (const q of pts) {
        if (!q) { pen = false; continue; }            // null = przerwa (asymptota)
        const px = p.X(q[0]), py = p.Y(q[1]);
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
      }
      if (style.fill) { ctx.closePath(); ctx.fillStyle = style.fill; ctx.fill(); }
      if (style.color !== null) ctx.stroke();        // color: null → tylko wypełnienie
      ctx.restore();
    };

    /**
     * Wykres funkcji f(x) z obcinaniem skoków (dla tangensa).
     * style.clip — maksymalna |y| brana pod uwagę.
     */
    p.fn = function (f, style) {
      style = style || {};
      const clip = style.clip === undefined ? 1e4 : style.clip;
      const n = style.samples || Math.max(300, Math.round(p.w * 2));
      const pts = [];
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const x = p.win.xmin + (p.win.xmax - p.win.xmin) * i / n;
        const y = f(x);
        if (!isFinite(y) || Math.abs(y) > clip) { pts.push(null); prev = null; continue; }
        // duży skok przy przejściu przez asymptotę → przerwij linię
        if (prev !== null && Math.abs(y - prev) > (p.win.ymax - p.win.ymin) * 1.2) pts.push(null);
        pts.push([x, y]);
        prev = y;
      }
      p.path(pts, style);
    };

    /** Punkt. */
    p.dot = function (x, y, style) {
      style = style || {};
      const c = colors();
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.X(x), p.Y(y), style.r || 5, 0, 2 * Math.PI);
      ctx.fillStyle = style.color || c.accent;
      ctx.fill();
      if (style.ring !== false) {
        ctx.lineWidth = style.ringWidth || 2;
        ctx.strokeStyle = style.ringColor || c.surface;
        ctx.stroke();
      }
      ctx.restore();
    };

    /** Okrąg o środku (cx,cy) i promieniu r w jednostkach świata. */
    p.circle = function (cx, cy, r, style) {
      style = style || {};
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(p.X(cx), p.Y(cy), r * p.sx, r * p.sy, 0, 0, 2 * Math.PI);
      if (style.fill) { ctx.fillStyle = style.fill; ctx.fill(); }
      if (style.color !== null) {
        ctx.strokeStyle = style.color || colors().ink2;
        ctx.lineWidth = style.width || 2;
        if (style.dash) ctx.setLineDash(style.dash);
        ctx.stroke();
      }
      ctx.restore();
    };

    /** Wycinek kąta: łuk od 0 do a (radiany) o promieniu r [jednostki świata]. */
    p.angleArc = function (cx, cy, r, a0, a1, style) {
      style = style || {};
      ctx.save();
      ctx.beginPath();
      // Na kanwie kąt rośnie w stronę dodatniego y, czyli na ekranie zgodnie z ruchem
      // wskazówek zegara. Kąt matematyczny a to kąt kanwy −a, a kierunek się odwraca.
      ctx.ellipse(p.X(cx), p.Y(cy), r * p.sx, r * p.sy, 0, -a0, -a1, a1 > a0);
      if (style.sector) {
        ctx.lineTo(p.X(cx), p.Y(cy));
        ctx.closePath();
      }
      if (style.fill) { ctx.fillStyle = style.fill; ctx.fill(); }
      if (style.color) {
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.width || 2;
        if (style.dash) ctx.setLineDash(style.dash);
        ctx.stroke();
      }
      ctx.restore();
    };

    /** Znacznik kąta prostego w wierzchołku (vx,vy), ramiona w kierunkach d1,d2 [wektory]. */
    p.rightAngle = function (vx, vy, d1, d2, size, style) {
      style = style || {};
      const n1 = Math.hypot(d1[0], d1[1]), n2 = Math.hypot(d2[0], d2[1]);
      const u1 = [d1[0] / n1, d1[1] / n1], u2 = [d2[0] / n2, d2[1] / n2];
      const A = [vx + u1[0] * size, vy + u1[1] * size];
      const B = [vx + u1[0] * size + u2[0] * size, vy + u1[1] * size + u2[1] * size];
      const C = [vx + u2[0] * size, vy + u2[1] * size];
      p.path([A, B, C], { color: style.color || colors().ink3, width: 1.4 });
    };

    /** Tekst pozycjonowany w jednostkach świata, z przesunięciem w pikselach. */
    p.text = function (str, x, y, style) {
      style = style || {};
      const c = colors();
      ctx.save();
      ctx.font = style.font || '13px system-ui, sans-serif';
      ctx.fillStyle = style.color || c.ink2;
      ctx.textAlign = style.align || 'left';
      ctx.textBaseline = style.baseline || 'alphabetic';
      const px = p.X(x) + (style.dx || 0), py = p.Y(y) + (style.dy || 0);
      if (style.bg) {
        const m = ctx.measureText(str);
        const pad = 3, hh = 13;
        let bx = px;
        if (ctx.textAlign === 'center') bx = px - m.width / 2;
        if (ctx.textAlign === 'right') bx = px - m.width;
        ctx.fillStyle = style.bg === true ? c.surface : style.bg;
        ctx.globalAlpha = .82;
        ctx.fillRect(bx - pad, py - hh, m.width + 2 * pad, hh + 5);
        ctx.globalAlpha = 1;
        ctx.fillStyle = style.color || c.ink2;
      }
      ctx.fillText(str, px, py);
      ctx.restore();
    };

    /** Przerysowanie. */
    p.render = function () {
      if (!p.w) p.layout();
      p.clear();
      p.draw(p);
    };

    /**
     * Obsługa wskaźnika (mysz + palec).
     * cb(state) gdzie state = {x, y, px, py, phase:'down'|'move'|'up'}
     */
    p.onPointer = function (cb) {
      let active = false;
      const pos = (ev) => {
        const r = canvas.getBoundingClientRect();
        const px = ev.clientX - r.left, py = ev.clientY - r.top;
        return { px, py, x: p.ix(px), y: p.iy(py) };
      };
      canvas.addEventListener('pointerdown', (ev) => {
        active = true;
        canvas.classList.add('dragging');
        if (canvas.setPointerCapture) canvas.setPointerCapture(ev.pointerId);
        cb(Object.assign(pos(ev), { phase: 'down' }));
        ev.preventDefault();
      });
      canvas.addEventListener('pointermove', (ev) => {
        if (!active) return;
        cb(Object.assign(pos(ev), { phase: 'move' }));
        ev.preventDefault();
      });
      const end = (ev) => {
        if (!active) return;
        active = false;
        canvas.classList.remove('dragging');
        cb(Object.assign(pos(ev), { phase: 'up' }));
      };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
      // klawiatura: strzałki zmieniają wartość, gdy kanwa ma fokus
      canvas.tabIndex = 0;
    };

    /* auto-layout przy zmianie rozmiaru i motywu */
    const relayout = () => { p.layout(); p.render(); };
    if (window.ResizeObserver) {
      let first = true;
      new ResizeObserver(() => { if (first) { first = false; return; } relayout(); })
        .observe(canvas.parentNode || canvas);
    }
    window.addEventListener('resize', relayout);
    window.addEventListener('tr:theme', () => p.render());

    p.layout();
    return p;
  }

  /* ---------------- animacja ---------------- */

  function ticker(step) {
    let raf = null, last = 0, running = false;
    const frame = (t) => {
      if (!running) return;
      const dt = last ? Math.min(.05, (t - last) / 1000) : 0;
      last = t;
      step(dt);
      raf = requestAnimationFrame(frame);
    };
    return {
      start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
      stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; },
      get running() { return running; },
      toggle() { running ? this.stop() : this.start(); }
    };
  }

  /* ---------------- suwak z podglądem wartości ---------------- */

  /**
   * Buduje kontrolkę suwaka wewnątrz kontenera.
   * opts: {label, min, max, step, value, format(v), onInput(v)}
   */
  function slider(host, opts) {
    const wrap = document.createElement('div');
    wrap.className = 'ctrl';
    const lab = document.createElement('label');
    lab.innerHTML = opts.label + ' <span class="now"></span>';
    const inp = document.createElement('input');
    inp.type = 'range';
    inp.min = opts.min; inp.max = opts.max; inp.step = opts.step;
    inp.value = opts.value;
    const now = lab.querySelector('.now');
    const show = () => { now.innerHTML = opts.format ? opts.format(+inp.value) : fmt(+inp.value, 2); };
    inp.addEventListener('input', () => { show(); opts.onInput(+inp.value); });
    wrap.appendChild(lab); wrap.appendChild(inp);
    host.appendChild(wrap);
    show();
    return {
      input: inp,
      get value() { return +inp.value; },
      set value(v) { inp.value = v; show(); }
    };
  }

  /* ---------------- losowanie ---------------- */

  const rnd = {
    int(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
  };

  /* ---------------- porównywanie odpowiedzi liczbowych ---------------- */

  /**
   * Zamienia to, co wpisał uczeń, na liczbę.
   * Akceptuje: przecinek, minus typograficzny, √ i sqrt, π i pi, ułamki,
   * mnożenie niejawne (2π, 3√2). Wszystko inne — w tym litery — daje NaN.
   */
  function parseAnswer(str) {
    if (str == null) return NaN;
    let s = String(str).trim().toLowerCase()
      .replace(/\s+/g, '')
      .replace(/,/g, '.')
      .replace(/[−–—]/g, '-')
      .replace(/[·×]/g, '*')
      .replace(/:/g, '/')
      .replace(/sqrt/g, '√')
      .replace(/pi/g, 'π');

    // dopuszczamy wyłącznie cyfry, cztery działania, nawiasy, kropkę, √ i π
    if (s === '' || !/^[-+*/().0-9√π]+$/.test(s)) return NaN;

    // mnożenie niejawne: 3π → 3*π, 2√3 → 2*√3, (1+1)π → (1+1)*π
    s = s.replace(/(\d|\))(?=[√π(])/g, '$1*');
    // π obok √ i vice versa: √π*, π√ → π*√
    s = s.replace(/π(?=√)/g, 'π*');
    // pierwiastek: √3 → Math.sqrt(3), √(2+1) zostaje z nawiasem
    s = s.replace(/√/g, 'Math.sqrt');
    s = s.replace(/Math\.sqrt(\d+(?:\.\d+)?)/g, 'Math.sqrt($1)');
    s = s.replace(/π/g, '(' + Math.PI + ')');

    try {
      // eslint-disable-next-line no-new-func
      const v = Function('"use strict";return (' + s + ')')();
      return typeof v === 'number' && isFinite(v) ? v : NaN;
    } catch (e) { return NaN; }
  }

  function near(a, b, tol) { return isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 0.01 : tol); }


  /* ============================================================
     Quiz — wspólny silnik zestawów zadań.
     generator() zwraca obiekt:
       { q, why, kind:'input'|'choice',
         input:  answer (liczba), tol, unit, show,
         choice: choices [HTML], correct (indeks) }
     ============================================================ */

  function quiz(host, generator, opts) {
    opts = opts || {};
    const count = opts.count || 6;
    const pass = opts.pass === undefined ? 0.8 : opts.pass;

    let i = 0, good = 0, cur = null, answered = false;

    host.innerHTML =
      '<div class="task">' +
        '<div class="score-bar" style="margin-bottom:14px">' +
          '<span class="muted" id="q-count"></span>' +
          '<div class="progress"><i id="q-bar"></i></div>' +
          '<span id="q-score" class="muted"></span>' +
        '</div>' +
        '<div class="q" id="q-text"></div>' +
        '<div id="q-area"></div>' +
        '<div class="verdict" id="q-verdict"></div>' +
        '<div class="btn-row">' +
          '<button class="btn" id="q-check">Sprawdź</button>' +
          '<button class="btn ghost" id="q-next" style="display:none">Następne →</button>' +
          '<button class="btn ghost small" id="q-skip">Pomiń</button>' +
        '</div>' +
      '</div>';

    const el = {
      count: host.querySelector('#q-count'),
      bar: host.querySelector('#q-bar'),
      score: host.querySelector('#q-score'),
      text: host.querySelector('#q-text'),
      area: host.querySelector('#q-area'),
      verdict: host.querySelector('#q-verdict'),
      check: host.querySelector('#q-check'),
      next: host.querySelector('#q-next'),
      skip: host.querySelector('#q-skip')
    };

    function head() {
      el.count.textContent = 'Zadanie ' + Math.min(i + 1, count) + ' z ' + count;
      el.bar.style.width = (100 * i / count) + '%';
      el.score.innerHTML = 'poprawnie: <b>' + good + '</b>';
    }

    function ask() {
      answered = false;
      cur = generator();
      head();
      el.text.innerHTML = cur.q;
      el.verdict.className = 'verdict';
      el.verdict.innerHTML = '';
      el.check.style.display = '';
      el.check.disabled = false;
      el.next.style.display = 'none';
      el.skip.style.display = '';

      if (cur.kind === 'choice') {
        el.area.innerHTML = '<div class="answers">' + cur.choices.map(function (ch, k) {
          return '<button type="button" data-k="' + k + '">' + ch + '</button>';
        }).join('') + '</div>';
        el.check.style.display = 'none';
        Array.prototype.forEach.call(el.area.querySelectorAll('button'), function (b) {
          b.addEventListener('click', function () { judge(+b.dataset.k); });
        });
      } else {
        el.area.innerHTML =
          '<div class="row"><input type="text" id="q-in" inputmode="text" autocomplete="off" ' +
          'placeholder="' + (cur.placeholder || 'wpisz wynik') + '" style="width:190px">' +
          (cur.unit ? '<span class="math">' + cur.unit + '</span>' : '') + '</div>' +
          (opts.inputHint === false ? '' :
            '<p style="margin:.7em 0 0"><small>Możesz pisać <code>pi</code> lub <code>π</code>, ' +
            '<code>sqrt(3)</code> lub <code>√3</code>, ułamki jak <code>3pi/4</code>, ' +
            'przecinek lub kropkę.</small></p>');
        const inp = el.area.querySelector('#q-in');
        inp.focus();
        inp.addEventListener('keydown', function (ev) {
          if (ev.key !== 'Enter') return;
          ev.preventDefault();
          answered ? ask() : judge();
        });
      }
    }

    function judge(pick) {
      if (answered) return;
      answered = true;
      let ok, given = '';

      if (cur.kind === 'choice') {
        ok = pick === cur.correct;
        Array.prototype.forEach.call(el.area.querySelectorAll('button'), function (b) {
          b.disabled = true;
          const k = +b.dataset.k;
          if (k === pick) b.className = ok ? 'picked-ok' : 'picked-bad';
          if (!ok && k === cur.correct) b.className = 'reveal';
        });
      } else {
        const inp = el.area.querySelector('#q-in');
        given = inp.value;
        const v = parseAnswer(given);
        ok = cur.accept ? cur.accept(v, given) : near(v, cur.answer, cur.tol);
        inp.className = ok ? 'ok' : 'bad';
        inp.disabled = true;
      }

      if (ok) good++;
      if (opts.onAnswer) opts.onAnswer(ok, cur);
      el.verdict.className = 'verdict ' + (ok ? 'good' : 'bad');
      el.verdict.innerHTML =
        (ok ? '✓ Dobrze.' : '✗ Nie tym razem.' +
          (cur.show ? ' Poprawna odpowiedź: <b>' + cur.show + '</b>.' : '')) +
        (cur.why ? '<span class="why">' + cur.why + '</span>' : '');

      el.check.style.display = 'none';
      el.skip.style.display = 'none';
      el.next.style.display = '';
      el.next.textContent = (i + 1 >= count) ? 'Podsumowanie →' : 'Następne →';
      el.next.focus();
      head();
    }

    function advance() {
      i++;
      if (i >= count) return finish();
      ask();
    }

    function finish() {
      const frac = good / count;
      el.bar.style.width = '100%';
      const great = frac >= pass;
      if (opts.moduleId) {
        progress.score(opts.moduleId, frac);
        if (great) progress.done(opts.moduleId);
      }
      host.innerHTML =
        '<div class="task center">' +
          '<h3 style="margin-top:0">' + (great ? 'Zaliczone ✓' : 'Zestaw skończony') + '</h3>' +
          '<p style="font-size:1.6rem;font-weight:700;font-family:var(--mono);margin:.2em 0">' +
            good + ' / ' + count + '</p>' +
          '<p style="color:var(--ink-2)">' +
            (great
              ? (opts.moduleId ? 'Moduł oznaczony jako opanowany. ' : '') + 'Możesz iść dalej.'
              : 'Do zaliczenia trzeba ' + Math.ceil(pass * count) + ' / ' + count +
                '. Przejrzyj wyjaśnienia powyżej i spróbuj jeszcze raz — zadania losują się na nowo.') +
          '</p>' +
          '<div class="btn-row" style="justify-content:center">' +
            '<button class="btn" id="q-again">Jeszcze raz</button>' +
          '</div>' +
        '</div>';
      host.querySelector('#q-again').addEventListener('click', function () {
        quiz(host, generator, opts);
      });
    }

    el.check.addEventListener('click', function () { judge(); });
    el.next.addEventListener('click', advance);
    el.skip.addEventListener('click', function () {
      if (answered) return;
      answered = true;
      if (opts.onAnswer) opts.onAnswer(false, cur);
      el.verdict.className = 'verdict bad';
      el.verdict.innerHTML = 'Pominięte.' + (cur.show ? ' Odpowiedź: <b>' + cur.show + '</b>.' : '') +
        (cur.why ? '<span class="why">' + cur.why + '</span>' : '');
      if (cur.kind === 'choice') {
        Array.prototype.forEach.call(el.area.querySelectorAll('button'), function (b) {
          b.disabled = true;
          if (+b.dataset.k === cur.correct) b.className = 'reveal';
        });
      } else {
        const inp = el.area.querySelector('#q-in');
        if (inp) inp.disabled = true;
      }
      el.check.style.display = 'none';
      el.skip.style.display = 'none';
      el.next.style.display = '';
      el.next.textContent = (i + 1 >= count) ? 'Podsumowanie →' : 'Następne →';
    });

    ask();
  }

  /* ---------------- szkielet strony: pasek, stopka, nawigacja ---------------- */

  function chrome(currentId) {
    initTheme();

    const idx = MODULES.findIndex((m) => m.id === currentId);

    const navLinks = ['<a href="./"' + (currentId === 'home' ? ' aria-current="page"' : '') + '>Start</a>']
      .concat(MODULES.map((m) =>
        '<a href="' + m.file + '"' + (m.id === currentId ? ' aria-current="page"' : '') + '>' +
        m.n + '. ' + m.short + '</a>'))
      .join('');

    const bar = document.createElement('header');
    bar.className = 'topbar';
    bar.innerHTML =
      '<div class="topbar-in">' +
        '<a class="brand" href="./">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">' +
            '<circle cx="12" cy="12" r="9.2" fill="none" stroke="var(--line-2)" stroke-width="1.6"/>' +
            '<path d="M3 12h18" stroke="var(--line-2)" stroke-width="1.2"/>' +
            '<path d="M12 12 L18.5 5.5" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>' +
            '<path d="M12 12 L18.5 12" stroke="var(--cos)" stroke-width="2" stroke-linecap="round"/>' +
            '<path d="M18.5 12 L18.5 5.5" stroke="var(--sin)" stroke-width="2" stroke-linecap="round"/>' +
          '</svg>' +
          'Trygonometria' +
        '</a>' +
        '<button class="nav-toggle" type="button" aria-expanded="false">Menu</button>' +
        '<nav class="nav">' + navLinks +
          '<button class="theme-btn" type="button" title="Jasny / ciemny">◐</button>' +
        '</nav>' +
      '</div>';
    document.body.insertBefore(bar, document.body.firstChild);

    const toggle = bar.querySelector('.nav-toggle');
    const nav = bar.querySelector('.nav');
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    bar.querySelector('.theme-btn').addEventListener('click', toggleTheme);

    // nawigacja poprzedni / następny
    if (idx >= 0) {
      const main = document.querySelector('main');
      if (main) {
        const prev = idx > 0 ? MODULES[idx - 1] : null;
        const next = idx < MODULES.length - 1 ? MODULES[idx + 1] : null;
        const pager = document.createElement('div');
        pager.className = 'pager wrap';
        pager.innerHTML =
          (prev ? '<a href="' + prev.file + '">← ' + prev.n + '. ' + prev.title + '</a>'
                : '<a href="./">← Strona główna</a>') +
          (next ? '<a href="' + next.file + '">' + next.n + '. ' + next.title + ' →</a>' : '');
        main.appendChild(pager);
      }
    }

    const foot = document.createElement('footer');
    foot.innerHTML =
      '<div class="wrap-wide">' +
        '<span>Trygonometria — materiał na I klasę liceum, profil matematyczno-fizyczny.</span>' +
        '<span style="margin-left:auto"><a href="sciagawka.html">Ściągawka</a> · ' +
        '<a href="trening.html">Trening</a></span>' +
      '</div>';
    document.body.appendChild(foot);

    if (currentId && currentId !== 'home') progress.visit(currentId);
  }

  /* ---------------- eksport ---------------- */

  return {
    MODULES, $, $$, clamp, D2R, R2D, fmt, norm360, radPiText, fracHTML,
    exact, exactHTML, SPECIAL_DEGS, snapSpecial,
    progress, colors, alpha, Plot, ticker, slider, rnd, parseAnswer, near, quiz, chrome, toggleTheme
  };
})();
