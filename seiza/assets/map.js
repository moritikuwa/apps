/* ============================================================
   AI星座 / SEIZA   星図
   技を星として描き、前提を線で結ぶ。
   取得した星ほど明るく光る。
   ============================================================ */
(function (root) {
  'use strict';

  var SZ = root.SZ;
  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  var colorOf = {};
  SZ.CONSTELLATIONS.forEach(function (c) { colorOf[c.id] = c.color; });

  /* 背景の飾り星（毎回同じ配置になるよう簡易乱数を使う） */
  function seeded(seed) {
    var s = seed;
    return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  }

  var Map = SZ.map = {
    svg: null, g: null, host: null,
    k: 1, tx: 0, ty: 0,
    onPick: null,

    mount: function (host, onPick) {
      this.host = host;
      this.onPick = onPick;
      host.innerHTML = '';

      var svg = this.svg = el('svg', { class: 'starmap', xmlns: NS });
      var defs = el('defs');
      defs.innerHTML =
        '<filter id="glow" x="-120%" y="-120%" width="340%" height="340%">' +
        '<feGaussianBlur stdDeviation="5" result="b"/>' +
        '<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
        '</filter>' +
        '<filter id="softglow" x="-120%" y="-120%" width="340%" height="340%">' +
        '<feGaussianBlur stdDeviation="12"/>' +
        '</filter>';
      svg.appendChild(defs);

      this.gBack = el('g');
      this.g = el('g');
      svg.appendChild(this.gBack);
      svg.appendChild(this.g);
      host.appendChild(svg);

      this.drawBackdrop();
      this.draw();
      this.bind();

      var self = this;
      this.resize();
      window.addEventListener('resize', function () { self.resize(); });
    },

    resize: function () {
      if (!this.host) return;
      var w = this.host.clientWidth, h = this.host.clientHeight;
      if (!w || !h) return;
      this.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      if (!this._fitted) { this.initial(); this._fitted = true; }
      else this.apply();
    },

    /* 最初に開いたとき：星の名前が読める大きさで、一番上（たいわ座）から */
    initial: function () {
      var w = this.host.clientWidth;
      this.k = Math.max(0.7, Math.min(1.15, w / SZ.MAP.w));
      this.tx = (w - SZ.MAP.w * this.k) / 2;
      this.ty = 8;
      this.apply();
    },

    /* 全体表示：星座ぜんぶの並びを一目で見る */
    fit: function () {
      var w = this.host.clientWidth, h = this.host.clientHeight;
      var k = Math.min(w / SZ.MAP.w, h / SZ.MAP.h) * 0.96;
      this.k = k;
      this.tx = (w - SZ.MAP.w * k) / 2;
      this.ty = (h - SZ.MAP.h * k) / 2;
      this.apply();
    },

    apply: function () {
      /* 星図を画面の外まで飛ばしてしまわないように、動ける範囲を抑える */
      var w = this.host.clientWidth, h = this.host.clientHeight;
      var mw = SZ.MAP.w * this.k, mh = SZ.MAP.h * this.k;
      if (mw <= w) this.tx = (w - mw) / 2;
      else this.tx = Math.min(20, Math.max(w - mw - 20, this.tx));
      if (mh <= h) this.ty = (h - mh) / 2;
      else this.ty = Math.min(20, Math.max(h - mh - 20, this.ty));

      var t = 'translate(' + this.tx + ',' + this.ty + ') scale(' + this.k + ')';
      this.g.setAttribute('transform', t);
      this.gBack.setAttribute('transform', t);
    },

    zoomAt: function (cx, cy, factor) {
      var k2 = Math.max(0.35, Math.min(3.2, this.k * factor));
      var f = k2 / this.k;
      this.tx = cx - (cx - this.tx) * f;
      this.ty = cy - (cy - this.ty) * f;
      this.k = k2;
      this.apply();
    },

    /* ── 背景（飾り星・星雲） ── */
    drawBackdrop: function () {
      var g = this.gBack;
      g.innerHTML = '';
      var rnd = seeded(20260811);
      var i;
      for (i = 0; i < 300; i++) {
        var r = rnd() * 1.5 + 0.4;
        g.appendChild(el('circle', {
          cx: (rnd() * SZ.MAP.w).toFixed(1),
          cy: (rnd() * SZ.MAP.h).toFixed(1),
          r: r.toFixed(2),
          fill: '#ffffff',
          opacity: (rnd() * 0.35 + 0.06).toFixed(2)
        }));
      }
      /* 星座ごとのぼんやりした光 */
      SZ.CONSTELLATIONS.forEach(function (c) {
        var list = SZ.SKILLS.filter(function (s) { return s.const === c.id; });
        if (!list.length) return;
        var cx = 0, cy = 0;
        list.forEach(function (s) { cx += s.x; cy += s.y; });
        cx /= list.length; cy /= list.length;
        g.appendChild(el('circle', {
          cx: cx, cy: cy, r: 150, fill: c.color, opacity: 0.06, filter: 'url(#softglow)'
        }));
      });
    },

    /* ── 星と線 ── */
    draw: function () {
      var g = this.g;
      g.innerHTML = '';
      var st = SZ.store, calc = SZ.calc;

      /* 星座名 */
      SZ.CONSTELLATIONS.forEach(function (c) {
        var list = SZ.SKILLS.filter(function (s) { return s.const === c.id; });
        if (!list.length) return;
        var minY = Math.min.apply(null, list.map(function (s) { return s.y; }));
        var cx = 0;
        list.forEach(function (s) { cx += s.x; });
        cx /= list.length;
        var p = calc.params().filter(function (x) { return x.id === c.id; })[0];
        var t = el('text', {
          x: cx, y: minY - 46, 'text-anchor': 'middle',
          class: 'cname', fill: c.color, opacity: 0.5
        });
        t.textContent = c.name + '  ' + Math.round(p.ratio * 100) + '%';
        g.appendChild(t);
      });

      /* 線（前提 → 技） */
      SZ.SKILLS.forEach(function (s) {
        (s.req || []).forEach(function (rid) {
          var p = SZ.byId[rid];
          if (!p) return;
          var lit = Math.min(st.state(p.id), st.state(s.id));
          var cross = p.const !== s.const;
          g.appendChild(el('line', {
            x1: p.x, y1: p.y, x2: s.x, y2: s.y,
            stroke: lit >= SZ.OPEN ? colorOf[s.const] : '#8fa0bd',
            'stroke-width': lit >= SZ.OPEN ? 1.6 : 1,
            'stroke-dasharray': cross ? '5 6' : '',
            opacity: (0.1 + Math.min(lit, 3) * 0.16).toFixed(2)
          }));
        });
      });

      /* 星 */
      SZ.SKILLS.forEach(function (s) {
        var v = st.state(s.id);
        var status = calc.status(s);
        var col = colorOf[s.const];
        var base = [7, 8.6, 10][s.tier - 1];
        var node = el('g', { class: 'star st' + v + ' ' + status, 'data-id': s.id, tabindex: '0' });

        /* 当たり判定を広めに */
        node.appendChild(el('circle', { cx: s.x, cy: s.y, r: 26, fill: 'transparent' }));

        if (v >= 2) {
          node.appendChild(el('circle', {
            cx: s.x, cy: s.y, r: base * (1.9 + v * 0.5), fill: col,
            opacity: (0.05 + v * 0.045).toFixed(3), filter: 'url(#softglow)'
          }));
        }

        if (status === 'ready') {
          node.appendChild(el('circle', {
            cx: s.x, cy: s.y, r: base + 9, fill: 'none',
            stroke: '#ffd979', 'stroke-width': 1.4, opacity: 0.85, class: 'pulse'
          }));
        }
        if (status === 'locked') {
          node.appendChild(el('circle', {
            cx: s.x, cy: s.y, r: base + 7, fill: 'none',
            stroke: '#7c88a0', 'stroke-width': 1, 'stroke-dasharray': '2 5', opacity: 0.55
          }));
        }

        var core = el('circle', {
          cx: s.x, cy: s.y, r: base,
          fill: v === 0 ? '#1b2231' : col,
          stroke: v === 4 ? '#fff8e2' : col,
          'stroke-width': v === 4 ? 2.4 : 1.2,
          opacity: v === 0 ? (status === 'locked' ? 0.3 : 0.55) : (0.35 + v * 0.165).toFixed(2)
        });
        if (v >= 3) core.setAttribute('filter', 'url(#glow)');
        node.appendChild(core);

        if (v === 4) {
          node.appendChild(el('circle', { cx: s.x, cy: s.y, r: base * 0.42, fill: '#fffdf5', opacity: 0.95 }));
          var ray = 'M' + s.x + ' ' + (s.y - base - 9) + 'v6M' + s.x + ' ' + (s.y + base + 3) + 'v6' +
                    'M' + (s.x - base - 9) + ' ' + s.y + 'h6M' + (s.x + base + 3) + ' ' + s.y + 'h6';
          node.appendChild(el('path', { d: ray, stroke: '#ffe9a8', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.9 }));
        }

        var label = el('text', {
          x: s.x, y: s.y + base + 19, 'text-anchor': 'middle', class: 'slabel',
          fill: v === 0 ? '#8794ab' : '#e9edf3',
          opacity: v === 0 ? (status === 'locked' ? 0.4 : 0.72) : 0.95
        });
        label.textContent = s.name;
        node.appendChild(label);

        g.appendChild(node);
      });
    },

    /* ── 操作（引っぱって動かす・つまんで拡大） ── */
    bind: function () {
      var self = this, svg = this.svg;
      var drag = null, pinch = null;

      function pt(e) {
        var r = svg.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      }

      svg.addEventListener('pointerdown', function (e) {
        if (pinch) return;
        var p = pt(e);
        drag = { x: p.x, y: p.y, tx: self.tx, ty: self.ty, moved: 0, t: Date.now(), target: e.target };
        svg.setPointerCapture(e.pointerId);
      });

      svg.addEventListener('pointermove', function (e) {
        if (!drag || pinch) return;
        var p = pt(e);
        var dx = p.x - drag.x, dy = p.y - drag.y;
        drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
        self.tx = drag.tx + dx;
        self.ty = drag.ty + dy;
        self.apply();
      });

      function endDrag(e) {
        if (!drag) return;
        var quick = drag.moved < 8 && Date.now() - drag.t < 600;
        if (quick) {
          var hit = drag.target && drag.target.closest ? drag.target.closest('[data-id]') : null;
          if (hit && self.onPick) self.onPick(hit.getAttribute('data-id'));
          else if (self.onPick) self.onPick(null);
        }
        drag = null;
      }
      svg.addEventListener('pointerup', endDrag);
      svg.addEventListener('pointercancel', function () { drag = null; });

      /* ホイールは縦に動かす。Ctrl（Macは⌘/ピンチ）を押しながらで拡大縮小 */
      svg.addEventListener('wheel', function (e) {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          var p = pt(e);
          self.zoomAt(p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12);
        } else {
          self.tx -= e.deltaX;
          self.ty -= e.deltaY;
          self.apply();
        }
      }, { passive: false });

      svg.addEventListener('touchstart', function (e) {
        if (e.touches.length === 2) {
          drag = null;
          var r = svg.getBoundingClientRect();
          var a = e.touches[0], b = e.touches[1];
          pinch = {
            d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
            cx: (a.clientX + b.clientX) / 2 - r.left,
            cy: (a.clientY + b.clientY) / 2 - r.top
          };
        }
      }, { passive: true });

      svg.addEventListener('touchmove', function (e) {
        if (pinch && e.touches.length === 2) {
          e.preventDefault();
          var a = e.touches[0], b = e.touches[1];
          var d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          if (pinch.d > 0) self.zoomAt(pinch.cx, pinch.cy, d / pinch.d);
          pinch.d = d;
        }
      }, { passive: false });

      svg.addEventListener('touchend', function (e) {
        if (e.touches.length < 2) pinch = null;
      });

      svg.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var hit = e.target.closest ? e.target.closest('[data-id]') : null;
        if (hit && self.onPick) { e.preventDefault(); self.onPick(hit.getAttribute('data-id')); }
      });
    },

    /* 特定の星を画面の中央に寄せる */
    focus: function (id) {
      var s = SZ.byId[id];
      if (!s || !this.host) return;
      var w = this.host.clientWidth, h = this.host.clientHeight;
      this.k = Math.max(this.k, 1.05);
      this.tx = w / 2 - s.x * this.k;
      this.ty = h * 0.38 - s.y * this.k;
      this.apply();
    }
  };

})(window);
