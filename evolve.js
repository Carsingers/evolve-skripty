/* EVOLVE · interakce webu (Webflow, Client-First).
   Port skriptu z návrhu redesign/evolve-homepage.html na třídy ve Webflow.
   Každý blok se sám ověří, jestli na stránce má co dělat, takže skript
   jde vložit na libovolnou stránku webu. Styly k němu jsou v komponentě
   Global Styles (webflow/global-styles.html). */
(function () {
  'use strict';
  var D = document, R = D.documentElement;
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IO = 'IntersectionObserver' in window;
  function $$(s, r) { return [].slice.call((r || D).querySelectorAll(s)); }
  function el(tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  R.classList.add('ev-js');

  // Tmavá sekce = podklad s nízkým jasem. Čte se ze stylu, ne z varianty
  // komponenty, aby to fungovalo pro každou tmavou sekci na webu.
  function tmava(x) {
    var c = getComputedStyle(x).backgroundColor.match(/[\d.]+/g);
    if (!c || (c.length > 3 && +c[3] === 0)) return false;
    return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 < 0.35;
  }
  // Pojistka pro pozorovatele: co je v okně nebo nad ním, se dokončí,
  // co je ještě pod ohybem, počká na svou animaci.
  function pojistka(items, hotovo, udelej, ms) {
    var t = setInterval(function () {
      var zbyva = 0;
      items.forEach(function (x) {
        if (hotovo(x)) return;
        if (x.getBoundingClientRect().top < innerHeight) udelej(x); else zbyva++;
      });
      if (!zbyva) clearInterval(t);
    }, ms || 500);
  }

  /* 1. Sloupce na tmavých sekcích: svislé pruhy, kterými projíždí světlá
     vlna, kurzor pod sebou rozsvítí modravý nádech. */
  (function () {
    if (REDUCED) return;
    var secs = $$('.section_hero, .section_layout, .footer_component').filter(tmava);
    if (!secs.length) return;
    var canvases = secs.map(function (sec, i) {
      var c = el('canvas', 'cols');
      c.setAttribute('aria-hidden', 'true');
      c.dataset.seed = (i * 1.55).toFixed(2);
      sec.classList.add('has-cols');
      sec.insertBefore(c, sec.firstChild);
      return c;
    });
    var grainPat = null;
    function grain(x) {
      if (grainPat) return grainPat;
      var g = D.createElement('canvas'); g.width = g.height = 160;
      var gx = g.getContext('2d'), im = gx.createImageData(160, 160), d = im.data;
      for (var i = 0; i < d.length; i += 4) { var v = 90 + Math.random() * 130; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      gx.putImageData(im, 0, 0); grainPat = x.createPattern(g, 'repeat'); return grainPat;
    }
    function fit(c) {
      var dpr = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      return [x, w, h];
    }
    var state = canvases.map(function (c) {
      return { c: c, seed: parseFloat(c.dataset.seed) || 0, x: 0, y: 0, tx: 0, ty: 0, mx: 0, my: 0, k: 0, on: false, init: false, vis: false };
    });
    canvases.forEach(function (c, i) {
      var sec = c.parentElement, P = state[i];
      sec.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = sec.getBoundingClientRect();
        P.mx = e.clientX - r.left; P.my = e.clientY - r.top; P.on = true; probud();
      });
      sec.addEventListener('pointerleave', function () { P.on = false; probud(); });
    });
    if (IO) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          state.forEach(function (P) { if (P.c.parentElement === e.target) { P.vis = e.isIntersecting; if (P.vis) probud(); } });
        });
      }, { rootMargin: '120px' });
      state.forEach(function (P) { io.observe(P.c.parentElement); });
    } else state.forEach(function (P) { P.vis = true; });

    function draw(P) {
      var c = P.c; if (!c.clientWidth || !P.vis) return;
      var f = fit(c), x = f[0], w = f[1], h = f[2];
      x.clearRect(0, 0, w, h);
      var sd = P.seed, t = performance.now() / 1000;
      if (P.on) { P.tx = P.mx; P.ty = P.my; }
      else {
        // dvě nesouměřitelné periody, 38 s a 29 s: dráha se neopakuje
        P.tx = w * (0.5 + 0.30 * Math.sin(t * 0.165 + sd * 2.3));
        P.ty = h * (0.42 + 0.18 * Math.cos(t * 0.217 + sd * 1.7));
      }
      if (!P.init) { P.x = P.tx; P.y = P.ty; P.init = true; }
      var lp = P.on ? 0.14 : 0.07;
      P.x += (P.tx - P.x) * lp; P.y += (P.ty - P.y) * lp; P.k += (1 - P.k) * 0.05;
      var cw = w < 700 ? 36 : 52, n = Math.ceil(w / cw), S = 9;
      var base = '245,246,248', amp = 0.13, glow = '150,180,230', gamp = 0.12;
      var ph = 0.35 + 0.5 * Math.sin(P.seed * 1.9);
      var sx = Math.max(140, w * 0.14), sy = Math.max(160, h * 0.32);
      for (var i = 0; i < n; i++) {
        var cx = (i + 0.5) * cw;
        var g = x.createLinearGradient(0, 0, 0, h), o = x.createLinearGradient(0, 0, 0, h), near = false;
        for (var s = 0; s <= S; s++) {
          var y = s / S * h, d = cx / w * 0.75 + (y / h) * 0.45 - ph;
          var v = Math.exp(-d * d / 0.02) * 0.75;
          var dx = (cx - P.x) / sx, dy = (y - P.y) / sy, pg = Math.exp(-(dx * dx + dy * dy) / 2) * P.k;
          v = Math.min(1, v + pg);
          g.addColorStop(s / S, 'rgba(' + base + ',' + (v * amp).toFixed(3) + ')');
          var og = Math.exp(-(dx * dx * 1.8 + dy * dy * 1.6) / 2) * P.k; if (og > 0.01) near = true;
          o.addColorStop(s / S, 'rgba(' + glow + ',' + (og * gamp).toFixed(3) + ')');
        }
        x.fillStyle = g; x.fillRect(i * cw, 0, cw - 2, h);
        if (near) { x.fillStyle = o; x.fillRect(i * cw, 0, cw - 2, h); }
      }
      x.globalAlpha = 0.08; x.globalCompositeOperation = 'screen';
      x.fillStyle = grain(x); x.fillRect(0, 0, w, h);
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    }
    // kreslí se jen to, co je vidět; bez kurzoru stačí 30 snímků za vteřinu
    var bezi = false, minuly = 0;
    function loop(ts) {
      var i, hover = false;
      for (i = 0; i < state.length; i++) if (state[i].on) hover = true;
      if (!hover && ts - minuly < 32) { requestAnimationFrame(loop); return; }
      minuly = ts;
      var prace = false;
      for (i = 0; i < state.length; i++) {
        if (!state[i].vis || !state[i].c.clientWidth) continue;
        draw(state[i]); prace = true;
      }
      if (prace) requestAnimationFrame(loop); else bezi = false;
    }
    function probud() { if (!bezi) { bezi = true; requestAnimationFrame(loop); } }
    probud();
    addEventListener('resize', probud);
  })();

  /* 2. Sloupcová osnova a svislý štítek ve světlých sekcích. */
  (function () {
    var STITEK = { 'poznavate-se': 'Situace', 'vychozi-stav': 'Zjištění', 'jak-pracujeme': 'Jak pracujeme', 'roviny': 'Co řešíme', 'kdo-jsme': 'Kdo jsme', 'prvni-kroky': 'První kroky', 'reference': 'Reference', 'otazky': 'Otázky' };
    var sekce = $$('.section_layout').filter(function (s) { return !tmava(s); });
    if (!sekce.length) return;
    sekce.forEach(function (sec) {
      sec.classList.add('ruled');
      // mřížky dostanou podklad sekce, aby jimi osnova neprosvítala
      sec.style.setProperty('--ev-bg', getComputedStyle(sec).backgroundColor);
      var o = el('div', 'osnova'); o.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < 6; i++) { var l = el('i'); l.style.setProperty('--d', (i * 0.075).toFixed(3) + 's'); o.appendChild(l); }
      sec.insertBefore(o, sec.firstChild);
      var k = sec.querySelector('.text-style-kicker');
      var txt = STITEK[sec.id] || (k ? k.textContent.split('·')[0].trim() : '');
      if (txt) { var t = el('span', 'stitek'); t.setAttribute('aria-hidden', 'true'); t.textContent = txt; sec.insertBefore(t, sec.firstChild); }
    });
    if (REDUCED || !IO) { sekce.forEach(function (x) { x.classList.add('kresleno'); }); return; }
    var io = new IntersectionObserver(function (es, obs) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('kresleno'); obs.unobserve(e.target); } });
    }, { rootMargin: '-8% 0px -18% 0px' });
    sekce.forEach(function (x) { io.observe(x); });
    pojistka(sekce, function (x) { return x.classList.contains('kresleno'); }, function (x) { x.classList.add('kresleno'); }, 800);
  })();

  /* Rozpočet kreslení mřížky: vodorovná linka řádku je složená ze spodních
     hran buněk, svislá z pravých. Každý úsek dostane zpoždění podle polohy,
     takže linka jde přes celou šířku jedním tahem. */
  function kresliLinky(m, bunky) {
    var W = m.offsetWidth, H = m.offsetHeight;
    if (!W || !H) return;
    var SIRKA = 0.55, VYSKA = 0.62, RADEK = 0.09, PO = 0.3, radky = [];
    bunky.forEach(function (b) {
      var t = b.offsetTop, je = false;
      radky.forEach(function (r) { if (Math.abs(r - t) < 2) je = true; });
      if (!je) radky.push(t);
    });
    radky.sort(function (a, b) { return a - b; });
    bunky.forEach(function (b) {
      var t = b.offsetTop, ri = 0;
      radky.forEach(function (r, i) { if (Math.abs(r - t) < 2) ri = i; });
      var x = b.offsetLeft, w = b.offsetWidth, h = b.offsetHeight;
      b.style.setProperty('--dh', (0.18 + ri * RADEK + (x / W) * SIRKA).toFixed(3) + 's');
      b.style.setProperty('--th', Math.max(0.08, (w / W) * SIRKA).toFixed(3) + 's');
      b.style.setProperty('--dv', (PO + ri * RADEK + ((x + w) / W) * SIRKA * 0.5).toFixed(3) + 's');
      b.style.setProperty('--tv', Math.max(0.1, (h / H) * VYSKA).toFixed(3) + 's');
      b.style.setProperty('--dt', (0.95 + ri * RADEK + (x / W) * SIRKA).toFixed(3) + 's');
    });
  }
  // Strana, od které se vyroluje výplň buňky: ta, ke které měl kurzor
  // při vjezdu nejblíž. Bez souřadnic zleva, po směru čtení.
  function odkud(b, e) {
    var r = b.getBoundingClientRect(); if (!r.width) return;
    var fo = 'left center', vx = 0, vy = 1;
    if (e) {
      var x = e.clientX - r.left, y = e.clientY - r.top;
      var d = [x, r.width - x, y, r.height - y], m = Math.min(d[0], d[1], d[2], d[3]);
      if (m === d[1]) fo = 'right center';
      else if (m === d[2]) { fo = 'center top'; vx = 1; vy = 0; }
      else if (m === d[3]) { fo = 'center bottom'; vx = 1; vy = 0; }
    }
    b.style.setProperty('--fo', fo); b.style.setProperty('--vx', vx); b.style.setProperty('--vy', vy);
  }
  function vloziVypln(b) {
    var v = el('span', 'ev-fill', '<i></i>'); v.setAttribute('aria-hidden', 'true'); b.appendChild(v);
  }

  /* 3. Fotky: roleta při příjezdu, pak drobný posun uvnitř rámu. */
  (function () {
    var fotky = $$('.rov_image-wrapper, .cells_item.is-who-photo-large, .cells_item.is-who-photo, .steps_image, .team_photo');
    if (!fotky.length || REDUCED) return;
    fotky.forEach(function (f) { f.classList.add('ev-foto'); });
    R.classList.add('js-foto');
    function odkryj(f) { f.classList.add('odkryta'); }
    if (IO) {
      var io = new IntersectionObserver(function (es, o) {
        es.forEach(function (e) { if (e.isIntersecting) { odkryj(e.target); o.unobserve(e.target); } });
      }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
      fotky.forEach(function (f) { io.observe(f); });
      pojistka(fotky, function (f) { return f.classList.contains('odkryta'); }, odkryj);
    } else fotky.forEach(odkryj);
    var ceka = false;
    function posun() {
      ceka = false;
      fotky.forEach(function (f) {
        var r = f.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight || !r.height) return;
        var p = (innerHeight - r.top) / (innerHeight + r.height);
        var d = ((p - 0.5) * r.height * 0.13).toFixed(1) + 'px';
        $$('img', f).forEach(function (i) { i.style.setProperty('--par', d); });
      });
    }
    function tik() { if (!ceka) { ceka = true; requestAnimationFrame(posun); } }
    addEventListener('scroll', tik, { passive: true });
    addEventListener('resize', tik);
    posun();
  })();

  /* 4. Mřížky: rám, vnitřní linky a obsah se nakreslí, až na ně dojde řada. */
  (function () {
    var bloky = $$('.cells_component');
    if (!bloky.length) return;
    function bunky(m) { return $$(':scope > .cells_item, :scope > .faq_item', m); }
    bloky.forEach(function (m) { bunky(m).forEach(function (b) { b.classList.add('ev-cell'); }); });
    function rozpocitej(m) { kresliLinky(m, bunky(m)); }
    bloky.forEach(rozpocitej);
    addEventListener('resize', function () { bloky.forEach(function (m) { if (!m.classList.contains('nakresleno')) rozpocitej(m); }); });
    function nakresli(m) { m.classList.add('nakresleno'); }
    if (REDUCED || !IO) { bloky.forEach(nakresli); return; }
    R.classList.add('js-mrizka');
    var io = new IntersectionObserver(function (es, o) {
      es.forEach(function (e) { if (e.isIntersecting) { nakresli(e.target); o.unobserve(e.target); } });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    bloky.forEach(function (m) { io.observe(m); });
    pojistka(bloky, function (m) { return m.classList.contains('nakresleno'); }, nakresli);
  })();

  /* 5. Situace: po nakreslení mřížky se střídá zvýraznění. Dokud návštěvník
     nesáhne na myš nebo klávesnici, jede to samo. */
  (function () {
    var m = D.querySelector('.cells_component.is-situations');
    if (!m) return;
    var bunky = $$(':scope > .cells_item', m);
    if (!bunky.length) return;
    m.classList.add('ev-sit');
    bunky.forEach(function (b, k) {
      var card = b.querySelector('.situation_card');
      var txt = card && card.querySelector(':scope > .margin-top');
      if (txt) {
        var o = el('div', 'ev-open'), inn = el('div');
        txt.parentNode.insertBefore(o, txt); inn.appendChild(txt); o.appendChild(inn);
        var m2 = el('div', 'ev-mezera2'); m2.setAttribute('aria-hidden', 'true');
        o.parentNode.insertBefore(m2, o.nextSibling);
      }
      var poc = el('div', 'ev-poc', '<span>' + (k + 1) + '/' + bunky.length + '</span><i></i>');
      poc.setAttribute('aria-hidden', 'true');
      b.appendChild(poc);
      vloziVypln(b);
    });
    m.classList.add('ma-vypln');
    var i = 0, timer = null, rozjeto = false;
    function ukaz(n, e) {
      i = n;
      bunky.forEach(function (b, k) {
        if (k === n && !b.classList.contains('je-aktivni')) odkud(b, e);
        b.classList.toggle('je-aktivni', k === n);
        b.classList.toggle('bez-svisle', n % 2 === 1 && k === n - 1);
        b.classList.toggle('bez-vodorovne', n >= 2 && k === n - 2);
        b.classList.remove('odpocita');
      });
      void bunky[n].offsetWidth;
      bunky[n].classList.add('odpocita');
    }
    function dal() { ukaz((i + 1) % bunky.length); }
    function start() { if (REDUCED || timer) return; timer = setInterval(dal, 5200); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    bunky.forEach(function (b, k) {
      b.setAttribute('tabindex', '0');
      function vem(e) { stop(); m.classList.add('pauza'); if (i !== k || !b.classList.contains('je-aktivni')) ukaz(k, e && e.clientX != null ? e : null); }
      function pust(e) { m.classList.remove('pauza'); if (e && e.clientX != null) odkud(b, e); if (rozjeto) { ukaz(i); start(); } }
      b.addEventListener('mouseenter', vem); b.addEventListener('mouseleave', pust);
      b.addEventListener('focus', vem); b.addEventListener('blur', pust);
    });
    if (REDUCED) return;
    function spust() { if (rozjeto) return; rozjeto = true; setTimeout(function () { ukaz(0); start(); }, 2400); }
    if (IO) {
      var io = new IntersectionObserver(function (es, o) { es.forEach(function (e) { if (e.isIntersecting) { spust(); o.unobserve(e.target); } }); }, { threshold: 0.25 });
      io.observe(m);
    } else spust();
  })();

  /* 6. Jak pracujeme: rozbalovací sled kroků. Otevřený je vždy právě jeden,
     panel roste a zaniká výškou, aby nadpis nad ním vyjel, ne poskočil. */
  (function () {
    var row = D.querySelector('.cells_component.is-flow');
    if (!row) return;
    var cards = $$(':scope > .cells_item.is-flow', row);
    if (!cards.length) return;
    row.classList.add('ev-flow');
    var DOBA = 1100;
    cards.forEach(function (c, k) {
      var txt = c.querySelector(':scope > .margin-top'), fig = c.querySelector(':scope > .flow_fig');
      var pan = el('div', 'ev-panel'), inn = el('div'); pan.id = 'ev-krok-' + (k + 1); pan.appendChild(inn);
      var ref = txt || fig;
      if (ref) { ref.parentNode.insertBefore(pan, ref); if (txt) inn.appendChild(txt); if (fig) inn.appendChild(fig); }
      var h = c.querySelector(':scope > h3');
      if (h) { h.setAttribute('role', 'button'); h.tabIndex = 0; h.setAttribute('aria-controls', pan.id); }
      var poc = el('div', 'ev-poc', '<span>' + (k + 1) + '/' + cards.length + '</span><i></i>');
      poc.setAttribute('aria-hidden', 'true');
      c.appendChild(poc);
    });
    function panel(c) { return c.querySelector('.ev-panel'); }
    function stav(c, on) {
      c.classList.toggle('is-active', on);
      var n = c.querySelector('.flow_number'); if (n) n.classList.toggle('is-small', on);
      var h = c.querySelector(':scope > h3'); if (h) h.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    function otevri(c, pan) {
      pan.style.width = '';
      if (pan.hidden) { pan.hidden = false; void pan.offsetWidth; }
      pan.style.height = '';
      c.classList.remove('roste');
      stav(c, true);
      var cil = pan.offsetHeight;
      c.classList.add('roste');
      pan.style.height = '0px'; void pan.offsetHeight; pan.style.height = cil + 'px';
      pan._cas = setTimeout(function () { pan.style.height = ''; c.classList.remove('roste'); }, DOBA + 60);
    }
    function zavri(c, pan) {
      if (pan.hidden || !c.classList.contains('is-active')) { stav(c, false); return; }
      pan.style.width = pan.offsetWidth + 'px';
      pan.style.height = pan.offsetHeight + 'px';
      c.classList.add('roste'); void pan.offsetHeight;
      stav(c, false);
      pan.style.height = '0px';
      pan._cas = setTimeout(function () { pan.hidden = true; pan.style.width = ''; pan.style.height = ''; c.classList.remove('roste'); }, DOBA + 60);
    }
    var i = 0, timer = null, rozjeto = false;
    function odpocet(c) { if (REDUCED) return; c.classList.remove('odpocita'); void c.offsetWidth; c.classList.add('odpocita'); }
    function open(card) {
      cards.forEach(function (c) {
        var pan = panel(c); if (!pan) return;
        clearTimeout(pan._cas);
        if (c === card) otevri(c, pan); else zavri(c, pan);
        c.classList.remove('odpocita');
      });
      i = cards.indexOf(card); odpocet(card);
    }
    function dal() { open(cards[(i + 1) % cards.length]); }
    function start() { if (REDUCED || timer) return; timer = setInterval(dal, 5200); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    if (!REDUCED) {
      // se skriptem se první krok zavře a otevře až animací
      cards.forEach(function (c) { var pan = panel(c); stav(c, false); if (pan) pan.hidden = true; });
      var spust = function () { if (rozjeto) return; rozjeto = true; setTimeout(function () { open(cards[0]); start(); }, 2400); };
      if (IO) {
        var io = new IntersectionObserver(function (es, o) { es.forEach(function (e) { if (e.isIntersecting) { spust(); o.unobserve(e.target); } }); }, { threshold: 0.25 });
        io.observe(row);
      } else spust();
      row.addEventListener('mouseenter', function () { stop(); row.classList.add('pauza'); });
      row.addEventListener('mouseleave', function () { row.classList.remove('pauza'); if (rozjeto) { odpocet(cards[i]); start(); } });
    } else cards.forEach(function (c, k) { stav(c, k === 0); var pan = panel(c); if (pan) pan.hidden = k !== 0; });
    var t = null;
    cards.forEach(function (c) {
      var h = c.querySelector(':scope > h3');
      function hned() { clearTimeout(t); if (!c.classList.contains('is-active')) open(c); }
      c.addEventListener('click', hned);
      if (h) {
        h.addEventListener('focus', hned);
        h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hned(); } });
      }
      c.addEventListener('mouseenter', function () { clearTimeout(t); t = setTimeout(function () { if (!c.classList.contains('is-active')) open(c); }, 110); });
      c.addEventListener('mouseleave', function () { clearTimeout(t); });
    });
  })();

  /* 7. První kroky: řádek se při najetí podloží výplní zleva. */
  (function () {
    $$('.cells_component.is-list').forEach(function (list) {
      if (!list.querySelector('.steps_row')) return;
      list.classList.add('ev-steps');
      $$(':scope > .cells_item', list).forEach(function (b) {
        vloziVypln(b);
        b.addEventListener('mouseenter', function () { b.classList.add('je-aktivni'); });
        b.addEventListener('mouseleave', function () { b.classList.remove('je-aktivni'); });
      });
    });
  })();

  /* 8. Náběh bloků při scrollu. Nadpisové bloky se hýbou po částech. */
  (function () {
    var CASTI = '.section-header_component, .faq_grid > div:first-child, .section_layout .max-width-large';
    var CELE = '.cells_component, .quote_component, .rov_component, .finding_grid, .footer_grid';
    var els = $$(CASTI + ', ' + CELE).filter(function (e) { return !e.closest('.section_hero'); });
    if (!els.length) return;
    els.forEach(function (b) {
      b.classList.add('ev-reveal');
      if (!b.matches(CASTI)) return;
      var casti = [];
      [].forEach.call(b.children, function (d) {
        if (d.tagName === 'DIV' && d.children.length) [].forEach.call(d.children, function (x) { casti.push(x); });
        else casti.push(d);
      });
      if (casti.length < 2) return;
      b.classList.add('ma-casti');
      casti.forEach(function (x, i) { x.classList.add('cast'); x.style.setProperty('--dp', (i * 0.1).toFixed(2) + 's'); });
    });
    function in_(e) { e.classList.add('in'); }
    if (REDUCED || !IO) { els.forEach(in_); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { in_(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    els.forEach(function (e) { io.observe(e); });
    pojistka(els, function (e) { return e.classList.contains('in'); }, in_, 600);
  })();

  /* 9. Kdo jsme: dvě místa pomalu prostřídají víc záběrů (data-fotky,
     adresy oddělené svislítkem). Běží jen když je na ně vidět. */
  (function () {
    var sloty = $$('[data-fotky]');
    if (!sloty.length || REDUCED || !IO) return;
    sloty.forEach(function (slot, idx) {
      var zdroje = slot.getAttribute('data-fotky').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
      var a = slot.querySelector('img');
      if (zdroje.length < 2 || !a) return;
      slot.classList.add('ev-strida');
      var b = a.cloneNode(false);
      b.removeAttribute('srcset'); b.removeAttribute('sizes');
      b.alt = ''; b.setAttribute('aria-hidden', 'true'); b.style.opacity = '0'; b.loading = 'lazy';
      slot.appendChild(b);
      var vrstvy = [a, b], horni = 1, i = 0, vidim = false;
      new IntersectionObserver(function (es) { vidim = es[0].isIntersecting; }).observe(slot);
      setInterval(function () {
        if (!vidim) return;
        i = (i + 1) % zdroje.length;
        var nova = vrstvy[horni];
        nova.removeAttribute('srcset'); nova.removeAttribute('sizes');
        var hotovo = function () { nova.style.opacity = '1'; vrstvy[1 - horni].style.opacity = '0'; horni = 1 - horni; };
        nova.onload = hotovo; nova.src = zdroje[i];
        if (nova.complete) { nova.onload = null; hotovo(); }
      }, 7000 + idx * 2300);
    });
  })();

  /* 10. Čísla přejedou z původní hodnoty na tu po analýze. */
  (function () {
    $$('.finding_big').forEach(function (p) {
      if (p.querySelector('[data-do]')) return;
      p.innerHTML = p.textContent.replace(/(\d+)/, '<b data-od="0" data-do="$1">$1</b>');
    });
    var cisla = $$('[data-do]');
    if (!cisla.length) return;
    function rozpocitej(e) {
      var od = parseFloat(e.dataset.od), na = parseFloat(e.dataset.do);
      if (isNaN(od) || isNaN(na)) return;
      if (REDUCED) { e.textContent = na; return; }
      var t0 = null, T = 1500;
      function dojezd(u) { var c = 0.9, s = c + 1, x = u - 1; return 1 + s * x * x * x + c * x * x; }
      function krok(t) {
        if (!t0) t0 = t;
        var u = Math.min((t - t0) / T, 1);
        e.textContent = Math.round(od + (na - od) * dojezd(u));
        if (u < 1) requestAnimationFrame(krok); else e.textContent = na;
      }
      requestAnimationFrame(krok);
    }
    if (REDUCED || !IO) { cisla.forEach(function (e) { e.textContent = e.dataset.do; }); return; }
    cisla.forEach(function (e) { e.textContent = e.dataset.od; });
    var io = new IntersectionObserver(function (es, o) {
      es.forEach(function (en) {
        if (!en.isIntersecting || en.target.dataset.hotovo) return;
        o.unobserve(en.target); en.target.dataset.hotovo = '1';
        setTimeout(function () { rozpocitej(en.target); }, 700);
      });
    }, { threshold: 0.4 });
    cisla.forEach(function (e) { io.observe(e); });
    var tik = setInterval(function () {
      var zbyva = 0;
      cisla.forEach(function (e) {
        if (e.dataset.hotovo) return;
        var r = e.getBoundingClientRect();
        if (r.bottom <= 0) { e.dataset.hotovo = '1'; e.textContent = e.dataset.do; }
        else if (r.top < innerHeight && r.height) { e.dataset.hotovo = '1'; rozpocitej(e); }
        else zbyva++;
      });
      if (!zbyva) clearInterval(tik);
    }, 600);
  })();

  /* 11. Hero: ruka přisune žárovku, pak se vlákno rozžhaví. Dlaždice
     naběhnou jedna po druhé. */
  (function () {
    var hero = D.querySelector('.section_hero');
    if (!hero) return;
    var vis = hero.querySelector('.hero_visual');
    if (vis && !vis.querySelector('.hero_glow')) { var g = el('span', 'hero_glow'); g.setAttribute('aria-hidden', 'true'); vis.appendChild(g); }
    var hotovo = false;
    function spust() {
      if (hotovo) return; hotovo = true;
      hero.classList.add('prisunuto');
      $$('[data-rise]', hero).forEach(function (e) { e.classList.add('in'); });
      if (REDUCED) { hero.classList.add('sviti'); return; }
      setTimeout(function () { hero.classList.add('sviti'); }, 1150);
    }
    requestAnimationFrame(function () { requestAnimationFrame(spust); });
    setTimeout(spust, 1500);
  })();

  /* 12. Datové widgety v heru: ručička zralosti a graf systémů. */
  (function () {
    var INK = '#16243A', OCH = '#FFC24A';
    var widgets = $$('.w-gauge, .w-chart');
    if (!widgets.length) return;
    function fit(c) {
      var dpr = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
      if (!w || !h) return null;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
      return [x, w, h];
    }
    function onScreen(c) { var r = c.getBoundingClientRect(); return r.bottom > -120 && r.top < innerHeight + 120 && r.width > 0; }
    var gaugeV = REDUCED ? 0.42 : 0, gaugeT = 0.42;
    function drawGauge(c) {
      var f = fit(c); if (!f) return; var x = f[0], w = f[1], h = f[2];
      gaugeV += (gaugeT - gaugeV) * 0.08;
      var cx = w / 2, cy = h - 4, Rr = Math.min(w / 2 - 4, h - 8), N = 32;
      for (var i = 0; i <= N; i++) {
        var a = Math.PI + Math.PI * i / N, on = i / N <= gaugeV, len = i % 4 === 0 ? 11 : 7;
        x.strokeStyle = on ? (i / N > 0.66 ? INK : '#9DB4DC') : '#CBD0D9';
        x.lineWidth = on ? 1.6 : 1;
        x.beginPath();
        x.moveTo(cx + Math.cos(a) * (Rr - len), cy + Math.sin(a) * (Rr - len));
        x.lineTo(cx + Math.cos(a) * Rr, cy + Math.sin(a) * Rr);
        x.stroke();
      }
      var a2 = Math.PI + Math.PI * gaugeV;
      x.strokeStyle = OCH; x.lineWidth = 1.8; x.beginPath();
      x.moveTo(cx + Math.cos(a2) * (Rr - 16), cy + Math.sin(a2) * (Rr - 16));
      x.lineTo(cx + Math.cos(a2) * (Rr + 1), cy + Math.sin(a2) * (Rr + 1)); x.stroke();
      x.fillStyle = OCH; x.beginPath(); x.arc(cx + Math.cos(a2) * (Rr + 1), cy + Math.sin(a2) * (Rr + 1), 3, 0, 7); x.fill();
    }
    function drawChart(c) {
      var f = fit(c); if (!f) return; var x = f[0], w = f[1], h = f[2];
      var Dd = [23, 23, 22, 22, 21, 19, 18, 16, 15, 14, 14], pad = 6, top = 8;
      var px = function (i) { return pad + i * (w - pad * 2) / (Dd.length - 1); };
      var py = function (v) { return top + (23 - v) / 10 * (h - top - 10); };
      x.strokeStyle = 'rgba(22,36,58,.07)'; x.lineWidth = 1;
      [0, 1].forEach(function (fr) { var y = top + fr * (h - top - 10); x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); });
      x.beginPath(); Dd.forEach(function (v, i) { if (i) x.lineTo(px(i), py(v)); else x.moveTo(px(i), py(v)); });
      x.strokeStyle = INK; x.lineWidth = 1.4; x.lineJoin = 'round'; x.lineCap = 'round'; x.stroke();
      x.setLineDash([2, 3]); x.strokeStyle = 'rgba(200,154,60,.9)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(px(4), top - 4); x.lineTo(px(4), h); x.stroke(); x.setLineDash([]);
      x.fillStyle = OCH; x.beginPath(); x.arc(px(Dd.length - 1), py(14), 3.5, 0, 7); x.fill();
    }
    var bezi = false, hotovo = [];
    function usazeno() { return Math.abs(gaugeT - gaugeV) < 0.0005; }
    function loop() {
      var prace = false;
      widgets.forEach(function (c, k) {
        if (!onScreen(c)) { hotovo[k] = false; return; }
        if (c.classList.contains('w-gauge')) {
          if (!usazeno() || !hotovo[k]) { drawGauge(c); hotovo[k] = true; }
          if (!usazeno()) prace = true;
        } else if (!hotovo[k]) { drawChart(c); hotovo[k] = true; }
      });
      if (prace) requestAnimationFrame(loop); else bezi = false;
    }
    function probud() { if (!bezi) { bezi = true; requestAnimationFrame(loop); } }
    setTimeout(probud, REDUCED ? 0 : 900);
    addEventListener('scroll', probud, { passive: true });
    addEventListener('resize', function () { hotovo = []; probud(); });
  })();

  /* 13. Dlaždice v heru si návštěvník přeskládá: úchyt je přesune, druhé
     tlačítko je složí do pruhu, odkaz nad nimi vrátí všechno zpátky. */
  (function () {
    var art = D.querySelector('.heroArt');
    if (!art) return;
    var hero = art.closest('.section_hero') || art.parentElement;
    var karty = $$('.dcard', art);
    if (!karty.length) return;
    var vrch = 3, vraceni = [];
    var SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">';
    var IK = {
      uchyt: SVG + '<path d="M12 4.5v15M4.5 12h15"/><path d="m9.6 7 2.4-2.5L14.4 7M9.6 17l2.4 2.5L14.4 17M7 9.6 4.5 12 7 14.4M17 9.6l2.5 2.4L17 14.4"/></svg>',
      slozit: SVG + '<path d="M5.5 12h13"/></svg>',
      rozlozit: SVG + '<path d="M5.5 12h13M12 5.5v13"/></svg>',
      zpet: SVG + '<path d="M4 12a8 8 0 1 1 2.6 5.9"/><path d="M4 7.5v5h5"/></svg>'
    };
    function cti(k, sel) {
      var e = k.querySelector(sel); if (!e) return '';
      var kopie = e.cloneNode(true);
      $$('[data-do]', kopie).forEach(function (b) { b.textContent = b.getAttribute('data-do'); });
      return kopie.textContent.replace(/\s+/g, ' ').trim();
    }
    function titulek(k) {
      var e = k.querySelector('.dcT'), t = ''; if (!e) return '';
      [].forEach.call(e.childNodes, function (n) { if (n.nodeType === 3) t += n.nodeValue; });
      return t.replace(/\s+/g, ' ').trim();
    }
    function stav() {
      art.classList.toggle('ma-zmeny', karty.some(function (k) { return k.classList.contains('je-posunuta') || k.classList.contains('je-pruh'); }));
    }
    function mez(a, min, max) { return a < min ? min : (a > max ? max : a); }
    karty.forEach(function (k, n) {
      var telo = el('div', 'dcBody'); telo.id = 'dlazdice-telo-' + (n + 1);
      while (k.firstChild) telo.appendChild(k.firstChild);
      k.appendChild(telo);
      var pruh = el('div', 'dcPruh', '<span class="t"></span><span class="v"></span>'); pruh.setAttribute('aria-hidden', 'true');
      var pt = pruh.firstChild, pv = pruh.lastChild;
      k.appendChild(pruh);
      var ctl = el('div', 'dcCtl');
      var uchyt = el('button', 'dcBtn dcBtn--uchyt', IK.uchyt); uchyt.type = 'button';
      uchyt.title = 'Přesunout dlaždici';
      uchyt.setAttribute('aria-label', 'Přesunout dlaždici, kurzorovými klávesami po 16 pixelech');
      var sklad = el('button', 'dcBtn dcBtn--sklad'); sklad.type = 'button'; sklad.setAttribute('aria-controls', telo.id);
      ctl.appendChild(uchyt); ctl.appendChild(sklad); k.appendChild(ctl);
      var dx = 0, dy = 0, cas = null;
      function posun() { k.style.setProperty('--dx', dx.toFixed(1) + 'px'); k.style.setProperty('--dy', dy.toFixed(1) + 'px'); k.classList.add('je-posunuta'); stav(); }
      function meze() {
        var r = k.getBoundingClientRect(), h = hero.getBoundingClientRect(), p = 8, zx = r.left - dx, zy = r.top - dy;
        return { x0: h.left + p - zx, x1: h.right - p - r.width - zx, y0: h.top + p - zy, y1: h.bottom - p - r.height - zy };
      }
      function prevzit() {
        if (k.classList.contains('je-posunuta')) return;
        var t = getComputedStyle(k).transform;
        if (t && t.indexOf('matrix(') === 0) { var c = t.slice(7, -1).split(','); if (c.length === 6) { dx = parseFloat(c[4]) || 0; dy = parseFloat(c[5]) || 0; } }
        posun();
      }
      uchyt.addEventListener('pointerdown', function (e) {
        if (e.button) return;
        e.preventDefault(); prevzit();
        var x0 = e.clientX, y0 = e.clientY, zx = dx, zy = dy, m = meze();
        k.classList.add('je-drzena'); k.style.zIndex = ++vrch;
        try { uchyt.setPointerCapture(e.pointerId); } catch (err) {}
        function tahni(ev) { dx = mez(zx + ev.clientX - x0, m.x0, m.x1); dy = mez(zy + ev.clientY - y0, m.y0, m.y1); posun(); }
        function pust() {
          uchyt.removeEventListener('pointermove', tahni); uchyt.removeEventListener('pointerup', pust); uchyt.removeEventListener('pointercancel', pust);
          k.classList.remove('je-drzena');
        }
        uchyt.addEventListener('pointermove', tahni); uchyt.addEventListener('pointerup', pust); uchyt.addEventListener('pointercancel', pust);
      });
      uchyt.addEventListener('keydown', function (e) {
        var kx = e.key === 'ArrowLeft' ? -1 : (e.key === 'ArrowRight' ? 1 : 0), ky = e.key === 'ArrowUp' ? -1 : (e.key === 'ArrowDown' ? 1 : 0);
        if (!kx && !ky) return;
        e.preventDefault(); prevzit();
        var m = meze(); dx = mez(dx + kx * 16, m.x0, m.x1); dy = mez(dy + ky * 16, m.y0, m.y1); posun();
      });
      function popis(slozeno) {
        sklad.innerHTML = slozeno ? IK.rozlozit : IK.slozit;
        sklad.setAttribute('aria-expanded', slozeno ? 'false' : 'true');
        var p = slozeno ? 'Rozložit dlaždici' : 'Složit dlaždici do pruhu';
        sklad.title = p; sklad.setAttribute('aria-label', p);
      }
      function slozit(slozeno) {
        clearTimeout(cas);
        if (slozeno) {
          pt.textContent = titulek(k); pv.textContent = cti(k, '.wFig,.fig,.gv');
          telo.style.height = telo.scrollHeight + 'px'; void telo.offsetHeight;
          k.classList.add('je-pruh'); telo.style.height = '0px';
        } else {
          k.classList.remove('je-pruh'); telo.style.height = telo.scrollHeight + 'px';
          cas = setTimeout(function () { telo.style.height = ''; }, 560);
        }
        popis(slozeno); stav();
      }
      popis(false);
      sklad.addEventListener('click', function () { slozit(!k.classList.contains('je-pruh')); });
      vraceni.push(function () {
        dx = 0; dy = 0;
        k.style.removeProperty('--dx'); k.style.removeProperty('--dy'); k.style.removeProperty('z-index');
        k.classList.remove('je-posunuta'); k.classList.remove('je-drzena');
        if (k.classList.contains('je-pruh')) slozit(false);
      });
    });
    var vrat = el('button', 'heroReset', IK.zpet + '<span>Vrátit dlaždice</span>'); vrat.type = 'button';
    art.appendChild(vrat);
    vrat.addEventListener('click', function () {
      var bylFokus = D.activeElement === vrat;
      vraceni.forEach(function (f) { f(); }); stav();
      var dal = art.querySelector('.dcBtn--sklad'); if (bylFokus && dal) dal.focus();
    });
  })();

  /* 14. FAQ: zavření otázky počká na animaci, otevření jede z nulové výšky. */
  (function () {
    var polozky = $$('details.faq_item');
    if (!polozky.length) return;
    polozky.forEach(function (d) {
      var sum = d.querySelector('summary'), a = d.querySelector('.faq_answer');
      if (!sum || !a) return;
      var box = el('div', 'faq_open'), inn = el('div');
      a.parentNode.insertBefore(box, a); inn.appendChild(a); box.appendChild(inn);
      sum.addEventListener('click', function (e) {
        e.preventDefault();
        if (REDUCED) { d.open = !d.open; return; }
        if (!d.open) {
          d.classList.remove('zavira'); d.classList.add('otvira');
          d.open = true; void box.offsetHeight; d.classList.remove('otvira');
          return;
        }
        d.classList.add('zavira');
        var konec = function (ev) {
          if (ev.propertyName !== 'grid-template-rows') return;
          box.removeEventListener('transitionend', konec);
          d.classList.remove('zavira'); d.open = false;
        };
        box.addEventListener('transitionend', konec);
        setTimeout(function () { if (d.classList.contains('zavira')) { box.removeEventListener('transitionend', konec); d.classList.remove('zavira'); d.open = false; } }, 700);
      });
    });
  })();

  /* 15. Tři roviny: záložky s jezdcem. Samy se posouvají dál, zlatá linka
     odpočítává do přepnutí. Najetí, fokus i klik předají řízení člověku. */
  (function () {
    var nav = D.querySelector('.rov_nav');
    if (!nav) return;
    var tabs = $$('[role="tab"]', nav);
    if (!tabs.length) return;
    var box = nav.closest('.rov_component') || nav,
        count = nav.querySelector('.rov_foot p'),
        DWELL = 6500, timer = null, rucne = false, cur = 0;
    tabs.forEach(function (t) { t.setAttribute('type', 'button'); if (!t.querySelector('.ev-bar')) { var b = el('span', 'ev-bar'); b.setAttribute('aria-hidden', 'true'); t.appendChild(b); } });
    var jezdec = el('span', 'ev-jezdec'); jezdec.setAttribute('aria-hidden', 'true');
    nav.insertBefore(jezdec, nav.firstChild);
    nav.classList.add('ma-jezdce');
    var linky = tabs.map(function () { var l = el('span', 'ev-linka'); l.setAttribute('aria-hidden', 'true'); nav.insertBefore(l, jezdec); return l; });
    function posunLinky() {
      var vodorovne = getComputedStyle(nav).flexDirection === 'row';
      tabs.forEach(function (t, k) {
        var l = linky[k];
        l.className = 'ev-linka' + (vodorovne ? ' ev-linka--svisla' : '');
        l.style.top = vodorovne ? '' : (t.offsetTop + t.offsetHeight - 1) + 'px';
        l.style.left = vodorovne ? (t.offsetLeft + t.offsetWidth - 1) + 'px' : '';
      });
    }
    function posunJezdce(bez) {
      var t = tabs[cur]; if (!t) return;
      if (bez) jezdec.style.transition = 'none';
      jezdec.style.width = t.offsetWidth + 'px'; jezdec.style.height = t.offsetHeight + 'px';
      jezdec.style.transform = 'translate(' + t.offsetLeft + 'px,' + t.offsetTop + 'px)';
      if (bez) { void jezdec.offsetWidth; jezdec.style.transition = ''; }
    }
    function show(i, auto) {
      cur = i;
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        t.classList.remove('run');
        var p = D.getElementById(t.getAttribute('aria-controls')); if (p) p.hidden = !on;
      });
      if (count) count.innerHTML = '<b>' + ('0' + (i + 1)).slice(-2) + '</b> / ' + ('0' + tabs.length).slice(-2);
      posunJezdce();
      if (auto && !REDUCED) { void tabs[i].offsetWidth; tabs[i].classList.add('run'); }
    }
    function start() { if (rucne || REDUCED) return; stop(); show(cur, true); timer = setInterval(function () { show((cur + 1) % tabs.length, true); }, DWELL); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    var start0 = tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; });
    show(start0 < 0 ? 0 : start0, false);
    posunLinky(); posunJezdce(true);
    addEventListener('resize', function () { posunLinky(); posunJezdce(true); });
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { rucne = true; stop(); show(i, false); });
      t.addEventListener('mouseenter', function () { stop(); show(i, false); });
      t.addEventListener('focus', function () { rucne = true; stop(); show(i, false); });
      t.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
        if (n === null) return;
        e.preventDefault(); rucne = true; stop(); n = (n + tabs.length) % tabs.length; show(n, false); tabs[n].focus();
      });
    });
    box.addEventListener('mouseleave', function () { if (!rucne) start(); });
    if (IO) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !rucne) start(); else stop(); }); }, { threshold: 0.35 }).observe(box);
    }
  })();

  /* 16. Patičku odhalí obsah, který po ní sjede. */
  (function () {
    var pat = D.querySelector('.footer_component'), hlavni = D.querySelector('.main-wrapper');
    if (!pat || !hlavni || REDUCED) return;
    var cas = null;
    function prepocti() {
      R.classList.remove('odhaluje-paticku');
      var v = pat.offsetHeight;
      if (v && v <= innerHeight * 0.85) { R.style.setProperty('--vyska-paticky', v + 'px'); R.classList.add('odhaluje-paticku'); }
    }
    function naplanuj() { clearTimeout(cas); cas = setTimeout(prepocti, 120); }
    prepocti();
    addEventListener('resize', naplanuj);
    if (window.ResizeObserver) new ResizeObserver(naplanuj).observe(pat);
  })();

  /* 17. Navigace: aktivní položka podle sekce na obrazovce. */
  (function () {
    if (!IO) return;
    var links = $$('.navbar_link').filter(function (a) { var h = a.getAttribute('href') || ''; return h.indexOf('#') > -1; });
    var map = {};
    links.forEach(function (a) { var id = a.getAttribute('href').split('#')[1]; var s = id && D.getElementById(id); if (s) map[id] = a; });
    var ids = Object.keys(map); if (!ids.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var a = map[en.target.id]; if (!a || !en.isIntersecting) return;
        links.forEach(function (l) { l.removeAttribute('aria-current'); });
        a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    ids.forEach(function (id) { io.observe(D.getElementById(id)); });
  })();

  /* 18. Video jako popup. Přehrávač vyroste ze spouštěče (FLIP), iframe
     vzniká až při otevření a při zavření se ruší. */
  (function () {
    var spousteci = $$('a.video-button_component').filter(function (a) { return /youtu/.test(a.href); });
    if (!spousteci.length || !window.HTMLDialogElement) return;
    var EASE = 'cubic-bezier(.87,0,.13,1)', TRVANI = 700;
    var d = el('dialog', 'vdlg');
    d.setAttribute('aria-labelledby', 'vdlg-t');
    d.innerHTML = '<button class="vdlgX" type="button" aria-label="Zavřít přehrávač"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<div class="vdlgFrame"><span>Načítám přehrávač&hellip;</span></div><p class="vdlgCap" id="vdlg-t"></p>';
    D.body.appendChild(d);
    var frame = d.querySelector('.vdlgFrame'), cap = d.querySelector('.vdlgCap');
    function vid(href) { var m = href.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : null; }
    function pust(id, t) {
      var u = new URL('https://www.youtube-nocookie.com/embed/' + id);
      u.searchParams.set('autoplay', '1'); u.searchParams.set('rel', '0'); u.searchParams.set('modestbranding', '1'); u.searchParams.set('playsinline', '1');
      var i = el('iframe'); i.src = u.toString(); i.title = t || 'Video';
      i.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'; i.allowFullscreen = true;
      frame.textContent = ''; frame.appendChild(i);
    }
    function zastav() { frame.innerHTML = '<span>Načítám přehrávač&hellip;</span>'; }
    function morf(z, zpet, hotovo) {
      var k = d.getBoundingClientRect();
      if (REDUCED || !d.animate || !k.width || !z || !z.width) { if (hotovo) hotovo(); return; }
      var dx = z.left - k.left, dy = z.top - k.top, sx = Math.max(z.width / k.width, 0.05), sy = Math.max(z.height / k.height, 0.05);
      var od = { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')', opacity: zpet ? 0.2 : 0.35, borderRadius: '40px' },
          na = { transform: 'none', opacity: 1, borderRadius: '14px' };
      var a = d.animate(zpet ? [na, od] : [od, na], { duration: TRVANI, easing: EASE, fill: zpet ? 'forwards' : 'none' });
      if (hotovo) a.onfinish = function () { hotovo(); a.cancel(); };
    }
    spousteci.forEach(function (b) {
      b.addEventListener('click', function (e) {
        var id = vid(b.href); if (!id) return;
        e.preventDefault();
        var t = b.querySelector('.video-button_title'), s = b.querySelector('.video-button_subtitle');
        cap.innerHTML = ''; var bb = el('b'); bb.textContent = t ? t.textContent : ''; cap.appendChild(bb);
        if (s) cap.appendChild(D.createTextNode('. ' + s.textContent.charAt(0).toUpperCase() + s.textContent.slice(1) + '.'));
        d._zpet = b;
        var z = b.getBoundingClientRect();
        d.showModal(); pust(id, t ? t.textContent : ''); morf(z, false);
      });
    });
    function zavri() {
      zastav();
      var b = d._zpet;
      morf(b && b.getBoundingClientRect(), true, function () { d.close(); });
    }
    d.querySelector('.vdlgX').addEventListener('click', zavri);
    d.addEventListener('click', function (e) { if (e.target === d) zavri(); });
    d.addEventListener('cancel', zastav);
    d.addEventListener('close', function () { zastav(); if (d._zpet) d._zpet.focus(); });
  })();
})();
