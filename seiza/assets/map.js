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

    /* 最初に開いたとき：魔法陣ぜんぶが見える大きさで */
    initial: function () { this.fit(); },

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

    /* ── 背景（魔法陣） ── */
    drawBackdrop: function () {
      var g = this.gBack;
      g.innerHTML = '';
      var C = SZ.CENTER, i;
      var rnd = seeded(20260811);

      /* 飾りの星 */
      for (i = 0; i < 260; i++) {
        g.appendChild(el('circle', {
          cx: (rnd() * SZ.MAP.w).toFixed(1),
          cy: (rnd() * SZ.MAP.h).toFixed(1),
          r: (rnd() * 1.4 + 0.4).toFixed(2),
          fill: '#ffffff',
          opacity: (rnd() * 0.32 + 0.05).toFixed(2)
        }));
      }

      /* 星座ごとの扇（うっすら色を敷く） */
      var span = 360 / SZ.CONSTELLATIONS.length;
      SZ.CONSTELLATIONS.forEach(function (c, si) {
        var a0 = (-90 + si * span - span / 2) * Math.PI / 180;
        var a1 = (-90 + si * span + span / 2) * Math.PI / 180;
        var R = SZ.OUTER;
        var d = 'M' + C.x + ' ' + C.y +
          ' L' + (C.x + Math.cos(a0) * R) + ' ' + (C.y + Math.sin(a0) * R) +
          ' A' + R + ' ' + R + ' 0 0 1 ' + (C.x + Math.cos(a1) * R) + ' ' + (C.y + Math.sin(a1) * R) + ' Z';
        g.appendChild(el('path', { d: d, fill: c.color, opacity: 0.045 }));
        g.appendChild(el('line', {
          x1: C.x, y1: C.y, x2: C.x + Math.cos(a0) * R, y2: C.y + Math.sin(a0) * R,
          stroke: '#c8b183', 'stroke-width': 0.8, opacity: 0.16
        }));
      });

      /* 輪 */
      [74, SZ.OUTER, SZ.OUTER - 12].forEach(function (r) {
        g.appendChild(el('circle', { cx: C.x, cy: C.y, r: r, fill: 'none', stroke: '#c8b183', 'stroke-width': 1, opacity: 0.25 }));
      });
      SZ.RING.forEach(function (r) {
        g.appendChild(el('circle', {
          cx: C.x, cy: C.y, r: r, fill: 'none', stroke: '#c8b183',
          'stroke-width': 0.8, 'stroke-dasharray': '3 7', opacity: 0.2
        }));
      });

      /* 目盛りと記号 */
      var runes = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
      for (i = 0; i < 12; i++) {
        var a = (-90 + i * 30) * Math.PI / 180;
        g.appendChild(el('line', {
          x1: C.x + Math.cos(a) * (SZ.OUTER - 12), y1: C.y + Math.sin(a) * (SZ.OUTER - 12),
          x2: C.x + Math.cos(a) * SZ.OUTER, y2: C.y + Math.sin(a) * SZ.OUTER,
          stroke: '#c8b183', 'stroke-width': 1, opacity: 0.3
        }));
        var t = el('text', {
          x: C.x + Math.cos(a) * (SZ.OUTER - 25), y: C.y + Math.sin(a) * (SZ.OUTER - 25),
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          fill: '#c8b183', opacity: 0.22, 'font-size': 11
        });
        t.textContent = runes[i];
        g.appendChild(t);
      }

      /* 段の名前（星のない、扇の境目に置く） */
      var la = (-90 - span / 2) * Math.PI / 180;
      ['初級', '中級', '上級'].forEach(function (nm, ti) {
        var t = el('text', {
          x: C.x + Math.cos(la) * (SZ.RING[ti] - 26), y: C.y + Math.sin(la) * (SZ.RING[ti] - 26),
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          fill: '#c8b183', opacity: 0.32, 'font-size': 10, 'letter-spacing': '.2em'
        });
        t.textContent = nm;
        g.appendChild(t);
      });
    },

    /* 段ごとの札のかたち（丸・ひし形・六角） */
    badge: function (x, y, r, tier) {
      if (tier === 1) return el('circle', { cx: x, cy: y, r: r });
      if (tier === 2) {
        return el('path', { d: 'M' + x + ' ' + (y - r) + 'L' + (x + r) + ' ' + y + 'L' + x + ' ' + (y + r) + 'L' + (x - r) + ' ' + y + 'Z' });
      }
      var p = [];
      for (var i = 0; i < 6; i++) {
        var a = (-90 + i * 60) * Math.PI / 180;
        p.push((x + Math.cos(a) * r).toFixed(1) + ' ' + (y + Math.sin(a) * r).toFixed(1));
      }
      return el('path', { d: 'M' + p.join('L') + 'Z' });
    },

    /* ── 星と線 ── */
    draw: function () {
      var g = this.g, self = this;
      g.innerHTML = '';
      var st = SZ.store, calc = SZ.calc, C = SZ.CENTER;

      /* 線（前提 → 技） */
      SZ.SKILLS.forEach(function (s) {
        (s.req || []).forEach(function (rid) {
          var p = SZ.byId[rid];
          if (!p) return;
          var lit = Math.min(st.state(p.id), st.state(s.id));
          var cross = p.const !== s.const;
          g.appendChild(el('line', {
            x1: p.x, y1: p.y, x2: s.x, y2: s.y,
            stroke: lit >= SZ.OPEN ? colorOf[s.const] : '#9fb0cc',
            'stroke-width': lit >= SZ.OPEN ? 1.8 : 1,
            'stroke-dasharray': cross ? '4 6' : '',
            opacity: (0.12 + Math.min(lit, 3) * 0.17).toFixed(2)
          }));
        });
      });

      /* 星座名（輪の外側） */
      var params = calc.params();
      SZ.CONSTELLATIONS.forEach(function (c) {
        var pm = params.filter(function (x) { return x.id === c.id; })[0];
        var a = c.angle * Math.PI / 180;
        var x = C.x + Math.cos(a) * SZ.RING_LABEL_R;
        var y = C.y + Math.sin(a) * SZ.RING_LABEL_R;
        var t = el('text', {
          x: x, y: y, 'text-anchor': 'middle', 'dominant-baseline': 'central',
          class: 'cname', fill: c.color, opacity: 0.72
        });
        t.textContent = c.name;
        g.appendChild(t);
        var t2 = el('text', {
          x: x, y: y + 15, 'text-anchor': 'middle', 'dominant-baseline': 'central',
          class: 'cpct', fill: c.color, opacity: 0.5
        });
        t2.textContent = Math.round(pm.ratio * 100) + '%';
        g.appendChild(t2);
      });

      /* 中心（いまのレベル） */
      var lv = calc.level();
      g.appendChild(el('circle', { cx: C.x, cy: C.y, r: 62, fill: '#0d111c', stroke: '#c8b183', 'stroke-width': 1.2, opacity: 0.95 }));
      g.appendChild(el('circle', { cx: C.x, cy: C.y, r: 54, fill: 'none', stroke: '#e0b341', 'stroke-width': 0.8, opacity: 0.4 }));
      var lvt = el('text', { x: C.x, y: C.y - 6, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'clv', fill: '#ffd979' });
      lvt.textContent = 'Lv.' + lv.lv;
      g.appendChild(lvt);
      var rkt = el('text', { x: C.x, y: C.y + 16, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'crank', fill: '#c8b183' });
      rkt.textContent = calc.rank();
      g.appendChild(rkt);
      var pct = el('text', { x: C.x, y: C.y + 33, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'cpct', fill: '#8794ab' });
      pct.textContent = calc.percent() + '%　' + lv.got + '/' + lv.max;
      g.appendChild(pct);

      /* 名前を出すのは「次の一手」の上位3つだけ。陣を文字で埋めない */
      var featured = {}, labels = [];
      calc.nextMoves(3).forEach(function (s) { featured[s.id] = 1; });

      /* 星（アイコンの札） */
      SZ.SKILLS.forEach(function (s) {
        var v = st.state(s.id);
        var status = calc.status(s);
        var col = colorOf[s.const];
        var r = SZ.BADGE[s.tier - 1];
        var node = el('g', { class: 'star st' + v + ' ' + status, 'data-id': s.id, tabindex: '0' });

        node.appendChild(el('circle', { cx: s.x, cy: s.y, r: r + 8, fill: 'transparent' }));

        if (v >= 2) {
          node.appendChild(el('circle', {
            cx: s.x, cy: s.y, r: r * (1.5 + v * 0.28), fill: col,
            opacity: (0.05 + v * 0.05).toFixed(3), filter: 'url(#softglow)'
          }));
        }

        if (status === 'ready') {
          var ring = self.badge(s.x, s.y, r + 7, s.tier);
          ring.setAttribute('fill', 'none');
          ring.setAttribute('stroke', '#ffd979');
          ring.setAttribute('stroke-width', 1.6);
          ring.setAttribute('class', 'pulse');
          node.appendChild(ring);
        }
        if (status === 'locked') {
          var lk = self.badge(s.x, s.y, r + 6, s.tier);
          lk.setAttribute('fill', 'none');
          lk.setAttribute('stroke', '#7c88a0');
          lk.setAttribute('stroke-width', 1);
          lk.setAttribute('stroke-dasharray', '2 5');
          lk.setAttribute('opacity', 0.6);
          node.appendChild(lk);
        }

        var plate = self.badge(s.x, s.y, r, s.tier);
        plate.setAttribute('fill', v === 0 ? '#161c2a' : col);
        plate.setAttribute('fill-opacity', v === 0 ? 0.85 : (0.14 + v * 0.11).toFixed(2));
        plate.setAttribute('stroke', v === 4 ? '#ffe9a8' : col);
        plate.setAttribute('stroke-width', v === 4 ? 2.4 : 1.3);
        plate.setAttribute('stroke-opacity', v === 0 ? (status === 'locked' ? 0.3 : 0.6) : (0.45 + v * 0.14).toFixed(2));
        if (v >= 3) plate.setAttribute('filter', 'url(#glow)');
        node.appendChild(plate);

        var ico = el('text', {
          x: s.x, y: s.y, 'text-anchor': 'middle', 'dominant-baseline': 'central',
          class: 'sicon', 'font-size': r * 1.12,
          opacity: v === 0 ? (status === 'locked' ? 0.32 : 0.62) : 1
        });
        ico.textContent = s.icon || '✦';
        node.appendChild(ico);

        var mk = el('text', {
          x: s.x, y: s.y + r + 11, 'text-anchor': 'middle', 'dominant-baseline': 'central',
          class: 'smark', fill: v === 4 ? '#ffd979' : (v >= 1 ? col : '#7c88a0'),
          opacity: v === 0 ? 0.5 : 1
        });
        mk.textContent = SZ.STATES[v].mark;
        node.appendChild(mk);

        /* いま一番効く星だけ、名前を出す。
           隣の札に隠れないよう、名前はぜんぶ描き終えてから上に載せる */
        if (featured[s.id]) {
          var label = el('text', {
            x: s.x, y: s.y + r + 26, 'text-anchor': 'middle', class: 'slabel', fill: '#ffe9a8', opacity: 0.95
          });
          label.textContent = s.name;
          labels.push(label);
        }

        g.appendChild(node);
      });

      labels.forEach(function (t) { g.appendChild(t); });
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
