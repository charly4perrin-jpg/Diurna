/* Globe orthographique en SVG : rotation à la souris ou au doigt, zoom, épingles numérotées. */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function make(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function mainCentroid(f) {
    const g = f.geometry;
    if (g && g.type === 'MultiPolygon') {
      let best = null, area = -1;
      for (const poly of g.coordinates) {
        const p = { type: 'Polygon', coordinates: poly };
        const a = d3.geoArea(p);
        if (a > area) { area = a; best = p; }
      }
      return d3.geoCentroid(best);
    }
    return d3.geoCentroid(f);
  }
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  class Globe {
    constructor(host, opts) {
      this.host = host;
      this.o = Object.assign({ drag: true, wheel: true, spin: 0, onPick: null, start: [-12, -26] }, opts || {});
      this.rot = this.o.start.slice();
      this.k = 1;
      this.stories = [];
      this.current = 0;
      this.features = [];
      this.byId = new Map();
      this.centroid = new Map();
      this.hover = null;
      this.anim = null;
      this.idleUntil = 0;
      this.proj = d3.geoOrthographic().clipAngle(90).precision(0.4);
      this.path = d3.geoPath(this.proj);

      const box = this.box = document.createElement('div');
      box.className = 'globe' + (this.o.drag ? ' can-drag' : '');
      host.appendChild(box);
      const svg = this.svg = make('svg', { role: 'img', 'aria-label': this.o.label || 'Globe' }, box);
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
      this.gShade = make('path', { class: 'g-shade' }, svg);
      this.gArcs = make('g', {}, svg);
      this.gPins = make('g', {}, svg);
      this.gRim = make('path', { class: 'g-rim' }, svg);
      this.grat = d3.geoGraticule10();

      this.tip = document.createElement('div');
      this.tip.className = 'g-tip';
      this.tip.hidden = true;
      box.appendChild(this.tip);

      this._events();
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(box);
      this.resize();
      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
    }

    load(topo) {
      const fc = topojson.feature(topo, topo.objects.countries);
      this.features = fc.features.filter((f) => f.properties.a3 !== 'ATA');
      this.features.forEach((f) => {
        const id = f.properties.a3;
        this.byId.set(id, f);
        this.centroid.set(id, mainCentroid(f));
        f._el = make('path', { class: 'g-land' }, this.gLand);
        f._el.__f = f;
      });
      this._buildArcs();
      this.paint();
      this.draw();
    }

    name(id) { const f = this.byId.get(id); return f ? f.properties.fr : id; }
    where(story) { return story.focus || this.centroid.get(story.id) || null; }

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
      if (s && fly !== false) this.flyTo(this.where(s), this.o.focusZoom || 1.25);
      this.draw();
    }

    paint() {
      const cur = this.stories.find((s) => s.rank === this.current);
      const main = new Map(this.stories.map((s) => [s.id, s]));
      const inv = new Set(cur ? cur.involved || [] : []);
      for (const f of this.features) {
        const id = f.properties.a3;
        const s = main.get(id);
        let cls = 'g-land';
        if (s) cls += ` story hot c${s.rank}${this.current && s.rank !== this.current ? ' dim' : ''}`;
        else if (cur && inv.has(id)) cls += ` inv c${cur.rank}`;
        if (this.hover === id) cls += ' hover';
        f._el.setAttribute('class', cls);
      }
      this.gPins.querySelectorAll('.g-pin').forEach((g) => {
        const r = Number(g.dataset.rank);
        g.classList.toggle('on', r === this.current);
        g.classList.toggle('off', !!this.current && r !== this.current);
      });
    }

    _buildArcs() {
      // arcs du sujet courant vers les pays concernés
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
          const g = make('g', { class: `g-zone c${s.rank}` }, this.gPins);
          make('rect', { x: -5, y: -5, width: 10, height: 10, transform: 'rotate(45)' }, g);
          const t = make('text', { x: 10, y: 4 }, g);
          t.textContent = z.name;
          this.pins.push({ el: g, ll: z.coords });
        });
        const g = make('g', { class: `g-pin c${s.rank}`, 'data-rank': s.rank, tabindex: '-1' }, this.gPins);
        if (!reduce) make('circle', { class: 'ring', r: 12 }, g);
        make('circle', { r: 12 }, g);
        const t = make('text', { y: 1 }, g);
        t.textContent = s.rank;
        g.addEventListener('click', (e) => { e.stopPropagation(); if (this.o.onPick) this.o.onPick(s.rank); });
        this.pins.push({ el: g, ll });
      }
    }

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
      (this.arcs || []).forEach((a) => a.el.setAttribute('d', this.path(a.geo) || ''));
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
      const to = [-ll[0], Math.max(-50, Math.min(50, -ll[1]))];
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

    zoomBy(f) { this.k = Math.max(0.9, Math.min(5, this.k * f)); this.idleUntil = performance.now() + 12000; this.draw(); }

    _loop(now) {
      if (this.anim) this.anim(now);
      else if (this.o.spin && !reduce && !this.drag && now > this.idleUntil) {
        this.rot[0] += this.o.spin * 16;
        this.draw();
      }
      requestAnimationFrame(this._loop);
    }

    _events() {
      const svg = this.svg;
      svg.addEventListener('pointerdown', (e) => {
        if (!this.o.drag || e.button !== 0) return;
        this.drag = { x: e.clientX, y: e.clientY, rot: this.rot.slice(), moved: false, id: e.pointerId, target: e.target };
        this.anim = null;
      });
      svg.addEventListener('pointermove', (e) => {
        const d = this.drag;
        if (d && e.pointerId === d.id) {
          const dx = e.clientX - d.x, dy = e.clientY - d.y;
          if (!d.moved && Math.hypot(dx, dy) > 4) {
            d.moved = true; this.box.classList.add('dragging');
            try { svg.setPointerCapture(e.pointerId); } catch (_) {}
            this.tip.hidden = true;
          }
          if (d.moved) {
            const f = 60 / (this.R * this.k);
            this.rot = [d.rot[0] + dx * f, Math.max(-80, Math.min(80, d.rot[1] - dy * f))];
            this.idleUntil = performance.now() + 12000;
            this.draw();
          }
          return;
        }
        if (e.pointerType === 'mouse') this._hover(e);
      });
      const end = (e) => {
        const d = this.drag;
        if (!d || e.pointerId !== d.id) return;
        this.drag = null; this.box.classList.remove('dragging');
        if (!d.moved && e.type === 'pointerup') {
          const f = d.target && d.target.__f;
          if (f && this.o.onPick) {
            const s = this.stories.find((x) => x.id === f.properties.a3);
            if (s) this.o.onPick(s.rank);
          }
        }
      };
      svg.addEventListener('pointerup', end);
      svg.addEventListener('pointercancel', end);
      svg.addEventListener('pointerleave', () => { if (!this.drag) { this.tip.hidden = true; this._setHover(null); } });
      svg.addEventListener('wheel', (e) => {
        if (!this.o.wheel) return;
        e.preventDefault();
        this.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
      }, { passive: false });
    }

    _setHover(id) { if (id !== this.hover) { this.hover = id; this.paint(); } }

    _hover(e) {
      const f = e.target.__f;
      const id = f ? f.properties.a3 : null;
      this._setHover(id);
      if (!id) { this.tip.hidden = true; return; }
      const s = this.stories.find((x) => x.id === id);
      this.tip.textContent = s ? `${s.rank} · ${s.place}` : f.properties.fr;
      const r = this.box.getBoundingClientRect();
      this.tip.style.left = (e.clientX - r.left) + 'px';
      this.tip.style.top = (e.clientY - r.top) + 'px';
      this.tip.hidden = false;
    }
  }

  global.Globe = Globe;
})(window);
