/* Globe orthographique en SVG : rotation à la souris ou au doigt, zoom, épingles numérotées,
   carte d'aperçu au survol, à l'appui long ou au clavier. */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = global.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce';
  const coarse = () => global.matchMedia('(pointer: coarse)').matches;

  function make(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function mainPolygon(f) {
    const g = f.geometry;
    if (g && g.type === 'MultiPolygon') {
      let best = null, area = -1;
      for (const poly of g.coordinates) {
        const p = { type: 'Polygon', coordinates: poly };
        const a = d3.geoArea(p);
        if (a > area) { area = a; best = p; }
      }
      return best;
    }
    return f;
  }
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  class Globe {
    constructor(host, opts) {
      this.host = host;
      this.o = Object.assign({ drag: true, wheel: true, spin: 0, onPick: null, start: [-12, -26], meta: null }, opts || {});
      this.rot = this.o.start.slice();
      this.k = 1;
      this.stories = [];
      this.current = 0;
      this.features = [];
      this.byId = new Map();
      this.centroid = new Map();
      this.span = new Map();
      this.hover = null;
      this.anim = null;
      // La rotation automatique attend quelques secondes (spinDelay) : la page s'affiche et se lit d'abord.
      this.idleUntil = performance.now() + (this.o.spinDelay || 0);
      this.visible = true;
      this.lastSpin = 0;
      this.card = null;
      this.proj = d3.geoOrthographic().clipAngle(90).precision(0.4);
      this.path = d3.geoPath(this.proj);

      const box = this.box = document.createElement('div');
      box.className = 'globe' + (this.o.drag ? ' can-drag' : '');
      host.appendChild(box);
      const svg = this.svg = make('svg', { role: 'group', 'aria-label': this.o.label || 'Globe' }, box);
      const defs = make('defs', {}, svg);
      const og = make('radialGradient', { id: 'oceanGrad', cx: '36%', cy: '30%', r: '78%' }, defs);
      make('stop', { offset: '0', style: 'stop-color: var(--ocean-hi)' }, og);
      make('stop', { offset: '1', style: 'stop-color: var(--ocean-lo)' }, og);
      const sg = make('radialGradient', { id: 'shadeGrad', cx: '42%', cy: '38%', r: '62%' }, defs);
      make('stop', { offset: '0.55', 'stop-color': '#030614', 'stop-opacity': '0' }, sg);
      make('stop', { offset: '1', 'stop-color': '#030614', 'stop-opacity': '0.62' }, sg);

      this.gOcean = make('path', { class: 'g-ocean' }, svg);
      this.gGrat = make('path', { class: 'g-grat' }, svg);
      this.gLand = make('g', {}, svg);
      this.gNight = make('path', { class: 'g-night' }, svg);
      this.gShade = make('path', { class: 'g-shade' }, svg);
      this.gArcs = make('g', {}, svg);
      this.gLinks = make('g', { class: 'g-links' }, svg);
      this.gPins = make('g', {}, svg);
      this.gRim = make('path', { class: 'g-rim' }, svg);
      this.grat = d3.geoGraticule10();

      this.tip = document.createElement('div');
      this.tip.className = 'g-tip';
      this.tip.hidden = true;
      box.appendChild(this.tip);

      this.cardEl = document.createElement('div');
      this.cardEl.className = 'g-card';
      this.cardEl.hidden = true;
      this.cardEl.setAttribute('role', 'group');
      box.appendChild(this.cardEl);
      this.cardEl.addEventListener('pointerenter', () => clearTimeout(this.hideT));
      this.cardEl.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this._hideSoon(); });
      this.cardEl.addEventListener('click', (e) => {
        if (e.target.closest('.g-card-x')) { this.hideCard(); return; }
        const go = e.target.closest('.g-card-go');
        if (go && this.o.onPick) { const r = Number(go.dataset.rank); this.hideCard(); this.o.onPick(r); }
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.card) this.hideCard(); });

      this._events();
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(box);
      this.resize();
      // Hors de l'écran ou onglet caché : le globe ne tourne pas (économie de batterie et de processeur).
      if ('IntersectionObserver' in window) new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; }).observe(box);
      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
    }

    load(topo) {
      const fc = topojson.feature(topo, topo.objects.countries);
      this.features = fc.features.filter((f) => f.properties.a3 !== 'ATA');
      this.features.forEach((f) => {
        const id = f.properties.a3;
        const main = mainPolygon(f);
        this.byId.set(id, f);
        this.centroid.set(id, d3.geoCentroid(main));
        this.span.set(id, Math.sqrt(d3.geoArea(main) / Math.PI));
        f._el = make('path', { class: 'g-land' }, this.gLand);
        f._el.__f = f;
      });
      this._buildArcs();
      this.paint();
      this.draw();
    }

    setMeta(meta) { this.o.meta = meta; }
    // Niveaux de chaleur : Map(id → 1..5), ou null pour revenir aux couleurs des sujets.
    setHeat(levels) { this.heat = levels || null; this.paint(); }
    select(id, fly) {
      this.sel = id || null; this.paint();
      if (id && fly !== false) { const c = this.centroid.get(id); if (c) this.flyTo(c, Math.max(this.k, this.zoomFor({ id }))); }
    }
    // Ligne jour/nuit : l'hémisphère opposé au soleil, recalculé chaque minute.
    setNight(on) {
      this.night = !!on;
      clearInterval(this.nightT);
      if (on) this.nightT = setInterval(() => this.draw(), 60000);
      this.draw();
    }
    static antiSun(date) {
      const d = date || new Date();
      const start = Date.UTC(d.getUTCFullYear(), 0, 1);
      const n = Math.floor((d - start) / 864e5) + 1, hrs = d.getUTCHours() + d.getUTCMinutes() / 60;
      const g = 2 * Math.PI / 365 * (n - 1 + (hrs - 12) / 24);
      const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
      const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
      const sunLon = -15 * (hrs - 12 + eq / 60), sunLat = decl * 180 / Math.PI;
      return [((sunLon + 360) % 360) - 180, -sunLat];
    }
    name(id) { const m = this.o.meta && this.o.meta[id]; if (m) return TP.cfield(m, 'name'); const f = this.byId.get(id); return f ? f.properties.fr : id; }
    where(story) { return story.focus || this.centroid.get(story.id) || null; }
    // Zoom qui donne au pays une taille lisible : grand pays, peu de zoom ; petit pays, davantage.
    zoomFor(story) {
      const r = this.span.get(story.id) || 0.12;
      return clamp(0.24 / Math.sin(Math.min(r, 1.2)), 1.15, coarse() ? 1.9 : 2);
    }

    setStories(stories, current) {
      this.stories = stories || [];
      this.current = current || 0;
      this._buildPins();
      this._buildArcs();
      this.paint();
      this.draw();
    }

    setCurrent(rank, fly) {
      this.current = rank;
      this._buildArcs();
      this.paint();
      const s = this.stories.find((x) => x.rank === rank);
      if (s && fly !== false) this.flyTo(this.where(s), this.zoomFor(s));
      this.draw();
    }

    paint() {
      const cur = this.stories.find((s) => s.rank === this.current);
      const main = new Map(this.stories.map((s) => [s.id, s]));
      const inv = new Set(cur ? cur.involved || [] : []);
      const preview = this.card ? this.card.rank : 0;
      const hl = this.hl || null;
      for (const f of this.features) {
        const id = f.properties.a3;
        const s = main.get(id);
        let cls = 'g-land';
        if (this.heat) {
          // Carte de chaleur : cinq niveaux selon le nombre d'apparitions du pays.
          const h = this.heat.get(id);
          if (h) cls += ' heat h' + h;
          if (this.o.onCountry) cls += ' hot';
          if (this.sel === id) cls += ' sel';
          if (this.hover === id) cls += ' hover';
          if (s) cls += ` story c${s.rank}`;
          f._el.setAttribute('class', cls);
          continue;
        }
        if (this.sel === id) cls += ' sel';
        if (hl) {
          if (hl.has(id)) cls += ' hl ' + hl.get(id);
          if (this.hover === id) cls += ' hover';
          f._el.setAttribute('class', cls);
          continue;
        }
        if (s) cls += ` story hot c${s.rank}${this.current && s.rank !== this.current && s.rank !== preview ? ' dim' : ''}`;
        else if (cur && inv.has(id)) cls += ` inv c${cur.rank}`;
        if (this.hover === id || (s && s.rank === preview)) cls += ' hover';
        f._el.setAttribute('class', cls);
      }
      this.gPins.querySelectorAll('.g-pin').forEach((g) => {
        const r = Number(g.dataset.rank);
        g.classList.toggle('on', r === this.current || r === preview);
        g.classList.toggle('off', !!this.current && r !== this.current && r !== preview);
      });
    }

    // Liens entre pays (carte) : [[a, b, poids]] ; un trait par paire, plus épais si la paire revient souvent.
    setLinks(pairs) {
      this.gLinks.textContent = '';
      const max = Math.max(1, ...(pairs || []).map((x) => x[2]));
      this.links = (pairs || []).map(([a, b, w]) => {
        const A = this.centroid.get(a), B = this.centroid.get(b);
        if (!A || !B) return null;
        const el = make('path', { class: 'g-link', 'stroke-width': (0.8 + 2.2 * (w / max)).toFixed(2) }, this.gLinks);
        return { el, geo: { type: 'LineString', coordinates: [A, B] } };
      }).filter(Boolean);
      this.draw();
    }

    // Surligne des groupes de pays (camps, soutiens, médiateurs) et cadre le globe dessus.
    highlight(groups) {
      this.hl = new Map();
      (groups || []).forEach((g) => (g.ids || []).forEach((id) => { if (!this.hl.has(id)) this.hl.set(id, g.cls || 'hl-a'); }));
      this.gArcs.style.display = 'none';
      this.paint();
      const pts = [...this.hl.keys()].map((id) => this.centroid.get(id)).filter(Boolean);
      if (!pts.length) return;
      const c = pts.length === 1 ? pts[0] : d3.geoCentroid({ type: 'MultiPoint', coordinates: pts });
      const far = Math.max(0.12, ...pts.map((p) => d3.geoDistance(c, p)));
      this.flyTo(c, clamp(0.62 / Math.sin(Math.min(far + 0.2, 1.45)), 1, 2));
    }
    // Pose un repère numéroté sur un lieu cité et y amène le globe.
    showPlace(coords, label, n) {
      this.clearPlace();
      const g = this.placePin = make('g', { class: 'g-place', 'aria-hidden': 'true' }, this.gPins);
      if (!reduce) make('circle', { class: 'ring', r: 10 }, g);
      make('circle', { r: 10 }, g);
      const tn = make('text', { class: 'n', y: 1 }, g); tn.textContent = n || '';
      const tl = make('text', { class: 'lab', x: 15, y: 4 }, g); tl.textContent = label;
      this.pins.push({ el: g, ll: coords });
      this.flyTo(coords, Math.max(this.k, 1.8));
      this.draw();
    }
    clearPlace() {
      if (!this.placePin) return;
      this.pins = this.pins.filter((p) => p.el !== this.placePin);
      this.placePin.remove();
      this.placePin = null;
    }
    clearOverlays() {
      this.hl = null;
      this.gArcs.style.display = '';
      this.clearPlace();
      this.paint();
    }

    _buildArcs() {
      const cur = this.stories.find((s) => s.rank === this.current);
      this.gArcs.textContent = '';
      this.arcs = [];
      if (!cur) return;
      const from = this.where(cur);
      (cur.involved || []).forEach((id) => {
        const to = this.centroid.get(id);
        if (from && to) {
          const p = make('path', { class: `g-arc c${cur.rank}` }, this.gArcs);
          this.arcs.push({ el: p, geo: { type: 'LineString', coordinates: [from, to] } });
        }
      });
    }

    _buildPins() {
      this.gPins.textContent = '';
      this.pins = [];
      for (const s of this.stories) {
        const ll = this.where(s);
        if (!ll) continue;
        (s.zones || []).forEach((z) => {
          const g = make('g', { class: `g-zone c${s.rank}`, 'aria-hidden': 'true' }, this.gPins);
          make('rect', { x: -5, y: -5, width: 10, height: 10, transform: 'rotate(45)' }, g);
          const t = make('text', { x: 10, y: 4 }, g);
          t.textContent = z.name;
          this.pins.push({ el: g, ll: z.coords });
        });
        const label = `${s.rank}. ${this.name(s.id)} : ${TP.fr(s.title)}`;
        const g = make('g', { class: `g-pin c${s.rank}`, 'data-rank': s.rank, tabindex: '0', role: 'button', 'aria-label': label }, this.gPins);
        if (!reduce) make('circle', { class: 'ring', r: 12 }, g);
        make('circle', { r: 20, class: 'hit' }, g);
        make('circle', { r: 12 }, g);
        const t = make('text', { y: 1 }, g);
        t.textContent = s.rank;
        g.addEventListener('click', (e) => { e.stopPropagation(); if (this.lp) { this.lp = false; return; } if (this.o.onPick) this.o.onPick(s.rank); });
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.hideCard(); if (this.o.onPick) this.o.onPick(s.rank); }
        });
        g.addEventListener('focus', () => { if (g.matches(':focus-visible')) this.showCard(s.rank, this._pinXY(ll)); });
        g.addEventListener('blur', () => this._hideSoon());
        this.pins.push({ el: g, ll });
      }
    }

    _pinXY(ll) { const xy = this.proj(ll); return xy ? { x: xy[0], y: xy[1] } : null; }

    /* ---------- Carte d'aperçu ---------- */
    showCard(rank, at, sheet) {
      const s = this.stories.find((x) => x.rank === rank);
      if (!s) return;
      clearTimeout(this.hideT);
      const el = this.cardEl;
      const m = this.o.meta && this.o.meta[s.id];
      if (!this.card || this.card.rank !== rank || this.card.sheet !== !!sheet) {
        const first = (s.body && s.body[0]) || s.standfirst || '';
        el.className = `g-card c${rank}${sheet ? ' sheet' : ''}`;
        el.setAttribute('aria-label', TP.L('preview', { x: this.name(s.id) }));
        const go = `<button class="g-card-go" type="button" data-rank="${rank}">${TP.L('read')}${TP.icon('right')}</button>`;
        el.innerHTML = `
          <div class="g-card-k"><span class="rank">${rank}</span>${m ? TP.flag(m) : ''}<span class="g-card-n">${TP.t(this.name(s.id))}</span>${sheet ? go + `<button class="g-card-x" type="button" aria-label="${TP.esc(TP.L('closePreview'))}">${TP.icon('close')}</button>` : ''}</div>
          <p class="g-card-t">${TP.t(s.title)}</p>
          <p class="g-card-s">${TP.t(first)}</p>
          ${sheet ? '' : go}`;
      }
      el.hidden = false;
      this.tip.hidden = true;
      this.card = { rank, sheet: !!sheet };
      if (!sheet && at) this._place(at);
      else { el.style.left = ''; el.style.top = ''; }
      this.paint();
    }

    _place(at) {
      const el = this.cardEl;
      const W = this.box.clientWidth, H = this.box.clientHeight;
      const w = el.offsetWidth, h = el.offsetHeight;
      let x = at.x + 18, y = at.y - h / 2;
      if (x + w > W - 8) x = at.x - w - 18;
      x = clamp(x, 8, Math.max(8, W - w - 8));
      y = clamp(y, 8, Math.max(8, H - h - 8));
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    }

    hideCard() {
      clearTimeout(this.hideT);
      if (!this.card) return;
      this.card = null;
      this.cardEl.hidden = true;
      this.paint();
    }

    _hideSoon() {
      clearTimeout(this.hideT);
      this.hideT = setTimeout(() => {
        if (this.cardEl.matches(':hover') || this.cardEl.contains(document.activeElement)) return;
        if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.g-pin')) return;
        this.hideCard();
      }, 280);
    }

    _storyAt(target) {
      const pin = target.closest && target.closest('.g-pin');
      if (pin) return this.stories.find((x) => x.rank === Number(pin.dataset.rank));
      const f = target.__f;
      return f ? this.stories.find((x) => x.id === f.properties.a3) : null;
    }

    /* ---------- Rendu ---------- */
    resize() {
      const r = this.box.getBoundingClientRect();
      this.W = Math.max(120, r.width);
      this.H = Math.max(120, r.height);
      this.R = Math.min(this.W, this.H) / 2 - 2;
      this.svg.setAttribute('viewBox', `0 0 ${this.W} ${this.H}`);
      this.proj.translate([this.W / 2, this.H / 2]);
      this.draw();
    }

    draw() {
      this.proj.scale(this.R * this.k).rotate([this.rot[0], this.rot[1], 0]);
      const sphere = this.path({ type: 'Sphere' });
      this.gOcean.setAttribute('d', sphere);
      this.gShade.setAttribute('d', sphere);
      this.gRim.setAttribute('d', sphere);
      this.gGrat.setAttribute('d', this.path(this.grat) || '');
      for (const f of this.features) f._el.setAttribute('d', this.path(f) || '');
      this.gNight.setAttribute('d', this.night ? (this.path(d3.geoCircle().center(Globe.antiSun()).radius(90)()) || '') : '');
      (this.arcs || []).forEach((a) => a.el.setAttribute('d', this.path(a.geo) || ''));
      (this.links || []).forEach((a) => a.el.setAttribute('d', this.path(a.geo) || ''));
      const c = [-this.rot[0], -this.rot[1]];
      (this.pins || []).forEach((p) => {
        const vis = d3.geoDistance(p.ll, c) < Math.PI / 2 - 0.06;
        const xy = vis ? this.proj(p.ll) : null;
        if (xy) { p.el.removeAttribute('display'); p.el.setAttribute('transform', `translate(${xy[0].toFixed(1)},${xy[1].toFixed(1)})`); }
        else p.el.setAttribute('display', 'none');
      });
    }

    flyTo(ll, k) {
      if (!ll) return;
      const from = this.rot.slice(), fromK = this.k;
      const to = [-ll[0], clamp(-ll[1], -50, 50)];
      const toK = k || this.k;
      while (to[0] - from[0] > 180) to[0] -= 360;
      while (to[0] - from[0] < -180) to[0] += 360;
      this.idleUntil = performance.now() + 12000;
      if (reduce) { this.rot = to; this.k = toK; this.draw(); return; }
      const t0 = performance.now(), dur = 1100;
      this.anim = (now) => {
        const t = Math.min(1, (now - t0) / dur), e = easeOut(t);
        this.rot = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
        this.k = fromK + (toK - fromK) * e;
        this.draw();
        if (t >= 1) this.anim = null;
      };
    }

    zoomBy(f) { this.k = clamp(this.k * f, 0.9, 5); this.idleUntil = performance.now() + 12000; this.draw(); }

    _loop(now) {
      if (this.anim) this.anim(now);
      else if (this.o.spin && !reduce && !this.drag && !this.card && this.visible && !document.hidden && now > this.idleUntil && now - this.lastSpin > 32) {
        // Rotation à 30 images par seconde, à vitesse constante quel que soit l'écran.
        const dt = this.lastSpin ? Math.min(now - this.lastSpin, 100) : 16;
        this.lastSpin = now;
        this.rot[0] += this.o.spin * dt;
        this.draw();
      }
      requestAnimationFrame(this._loop);
    }

    _events() {
      const svg = this.svg;
      svg.addEventListener('contextmenu', (e) => { if (e.pointerType !== 'mouse') e.preventDefault(); });
      svg.addEventListener('pointerdown', (e) => {
        if (!this.o.drag || e.button !== 0) return;
        this.drag = { x: e.clientX, y: e.clientY, rot: this.rot.slice(), moved: false, id: e.pointerId, target: e.target, type: e.pointerType };
        this.anim = null;
        this.lp = false;
        clearTimeout(this.lpT);
        if (e.pointerType !== 'mouse') {
          // Appui long : aperçu du sujet sans quitter le globe.
          this.lpT = setTimeout(() => {
            const d = this.drag;
            if (!d || d.moved) return;
            const s = this._storyAt(d.target);
            if (!s) return;
            this.lp = true;
            this.showCard(s.rank, null, true);
            // On décale le centrage vers le bas pour que le pays reste visible au-dessus de la carte.
            const k = Math.max(this.k, this.zoomFor(s)), ll = this.where(s);
            const dy = Math.asin(clamp((this.H * 0.2) / (this.R * k), 0, 0.8)) * 180 / Math.PI;
            this.flyTo([ll[0], ll[1] - dy], k);
            if (navigator.vibrate) try { navigator.vibrate(8); } catch (_) {}
          }, 460);
        }
      });
      svg.addEventListener('pointermove', (e) => {
        const d = this.drag;
        if (d && e.pointerId === d.id) {
          const dx = e.clientX - d.x, dy = e.clientY - d.y;
          if (!d.moved && Math.hypot(dx, dy) > 6) {
            d.moved = true; this.box.classList.add('dragging');
            clearTimeout(this.lpT);
            try { svg.setPointerCapture(e.pointerId); } catch (_) {}
            this.tip.hidden = true;
          }
          if (d.moved) {
            const f = 60 / (this.R * this.k);
            this.rot = [d.rot[0] + dx * f, clamp(d.rot[1] - dy * f, -80, 80)];
            this.idleUntil = performance.now() + 12000;
            this.draw();
          }
          return;
        }
        if (e.pointerType === 'mouse') this._hover(e);
      });
      const end = (e) => {
        const d = this.drag;
        clearTimeout(this.lpT);
        if (!d || e.pointerId !== d.id) return;
        this.drag = null; this.box.classList.remove('dragging');
        if (this.lp) return; // l'appui long a ouvert l'aperçu : pas de navigation
        if (!d.moved && e.type === 'pointerup') {
          if (d.target.closest && d.target.closest('.g-pin')) return; // géré par le clic de l'épingle
          const s = this._storyAt(d.target);
          const f = d.target.__f;
          if (this.o.onCountry && f) { this.hideCard(); this.o.onCountry(f.properties.a3); }
          else if (s && this.o.onPick) { this.hideCard(); this.o.onPick(s.rank); }
          else if (this.card && d.type !== 'mouse') this.hideCard();
        }
      };
      svg.addEventListener('pointerup', end);
      svg.addEventListener('pointercancel', end);
      svg.addEventListener('pointerleave', (e) => {
        if (this.drag) return;
        this.tip.hidden = true;
        this._setHover(null);
        if (e.pointerType === 'mouse' && this.card) this._hideSoon();
      });
      svg.addEventListener('wheel', (e) => {
        if (!this.o.wheel) return;
        e.preventDefault();
        this.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
      }, { passive: false });
    }

    _setHover(id) { if (id !== this.hover) { this.hover = id; this.paint(); } }

    _hover(e) {
      const s = this.o.onCountry ? null : this._storyAt(e.target);
      const f = e.target.__f;
      const id = s ? s.id : f ? f.properties.a3 : null;
      this._setHover(id);
      const r = this.box.getBoundingClientRect();
      const at = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (s) {
        this.tip.hidden = true;
        clearTimeout(this.hideT);
        if (!this.card || this.card.rank !== s.rank) {
          clearTimeout(this.showT);
          this.showT = setTimeout(() => this.showCard(s.rank, at), this.card ? 60 : 140);
        }
        return;
      }
      clearTimeout(this.showT);
      if (this.card) this._hideSoon();
      if (!id) { this.tip.hidden = true; return; }
      const m = this.o.meta && this.o.meta[id];
      this.tip.innerHTML = `${m ? TP.flag(m) : ''}<span>${TP.t(this.name(id))}</span>`;
      this.tip.style.left = at.x + 'px';
      this.tip.style.top = at.y + 'px';
      this.tip.hidden = false;
    }
  }

  global.Globe = Globe;
})(window);
