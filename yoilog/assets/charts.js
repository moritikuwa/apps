/* ============================================================
   酔いログ / YOI-LOG   グラフ（外部ライブラリなしの手描きSVG）
   ============================================================ */
(function (root) {
  'use strict';

  var AL = root.AL || (root.AL = {});
  var G = AL.charts = {};

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  G.esc = esc;

  /* ------------------------------------------------------------
     日別の純アルコール量（棒グラフ）＋ 基準線
     data: [{date, alcohol, color}]
     ------------------------------------------------------------ */
  G.dailyBars = function (data, opts) {
    opts = opts || {};
    var W = 720, H = 220, padL = 34, padR = 10, padT = 14, padB = 26;
    var n = data.length || 1;
    // 目盛りがきれいに割り切れるよう 20g 刻みで上限を決める
    var maxV = Math.max(40, Math.ceil(Math.max.apply(null, data.map(function (d) { return d.alcohol; }).concat([0])) / 20) * 20);
    var iw = W - padL - padR, ih = H - padT - padB;
    var bw = iw / n;

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" preserveAspectRatio="none">';

    // 目盛り
    [0, 0.25, 0.5, 0.75, 1].forEach(function (r) {
      var y = padT + ih * (1 - r);
      s += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="rgba(255,255,255,.07)"/>';
      s += '<text x="' + (padL - 6) + '" y="' + (y + 4) + '" class="ctick" text-anchor="end">' + Math.round(maxV * r) + '</text>';
    });

    // 基準線（適量20g / リスク40g）
    [{ v: AL.GUIDE.moderate, c: '#7cc06a', t: '適量 20g' },
     { v: opts.riskLine || AL.GUIDE.riskMale, c: '#e07a3c', t: 'リスク ' + (opts.riskLine || AL.GUIDE.riskMale) + 'g' }]
      .forEach(function (l) {
        if (l.v > maxV) return;
        var y = padT + ih * (1 - l.v / maxV);
        s += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="' + l.c + '" stroke-dasharray="5 4" stroke-width="1.4" opacity=".8"/>';
        s += '<text x="' + (W - padR - 3) + '" y="' + (y - 5) + '" class="clabel" text-anchor="end" fill="' + l.c + '">' + l.t + '</text>';
      });

    data.forEach(function (d, i) {
      var h = maxV ? (d.alcohol / maxV) * ih : 0;
      var x = padL + i * bw + bw * 0.16;
      var w = Math.max(1.5, bw * 0.68);
      var y = padT + ih - h;
      if (d.alcohol > 0) {
        s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + Math.max(1.5, h) + '" rx="1.5" fill="' + d.color + '">' +
             '<title>' + esc(d.date) + '：' + d.alcohol + 'g</title></rect>';
      } else {
        s += '<rect x="' + x + '" y="' + (padT + ih - 3) + '" width="' + w + '" height="3" rx="1.5" fill="#3ba676" opacity=".9">' +
             '<title>' + esc(d.date) + '：休肝日</title></rect>';
      }
    });

    s += '<line x1="' + padL + '" y1="' + (padT + ih) + '" x2="' + (W - padR) + '" y2="' + (padT + ih) + '" stroke="rgba(255,255,255,.25)"/>';
    s += '</svg>';
    return s;
  };

  /* ------------------------------------------------------------
     散布図＋回帰直線
     ------------------------------------------------------------ */
  G.scatter = function (points, reg, opts) {
    opts = opts || {};
    var W = 720, H = 300, padL = 44, padR = 16, padT = 16, padB = 40;
    var iw = W - padL - padR, ih = H - padT - padB;
    var maxX = Math.max(40, Math.ceil(Math.max.apply(null, points.map(function (p) { return p[0]; }).concat([0])) / 10) * 10);
    var maxY = opts.maxY || 100;

    function px(x) { return padL + (x / maxX) * iw; }
    function py(y) { return padT + ih * (1 - y / maxY); }

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart">';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (r) {
      var y = padT + ih * (1 - r);
      s += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="rgba(255,255,255,.07)"/>';
      s += '<text x="' + (padL - 8) + '" y="' + (y + 4) + '" class="ctick" text-anchor="end">' + Math.round(maxY * r) + '</text>';
    });
    for (var gx = 0; gx <= maxX; gx += Math.max(10, Math.round(maxX / 6 / 10) * 10)) {
      s += '<line x1="' + px(gx) + '" y1="' + padT + '" x2="' + px(gx) + '" y2="' + (padT + ih) + '" stroke="rgba(255,255,255,.05)"/>';
      s += '<text x="' + px(gx) + '" y="' + (padT + ih + 16) + '" class="ctick" text-anchor="middle">' + gx + '</text>';
    }

    if (reg) {
      var x1 = 0, x2 = maxX;
      var y1 = Math.max(0, Math.min(maxY, reg.a + reg.b * x1));
      var y2 = Math.max(0, Math.min(maxY, reg.a + reg.b * x2));
      s += '<line x1="' + px(x1) + '" y1="' + py(y1) + '" x2="' + px(x2) + '" y2="' + py(y2) +
           '" stroke="' + (opts.lineColor || '#e0b341') + '" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>';
    }

    points.forEach(function (p) {
      s += '<circle cx="' + px(p[0]) + '" cy="' + py(p[1]) + '" r="5" fill="' + (opts.dotColor || '#6fb3e0') + '" opacity=".78"/>';
    });

    s += '<text x="' + (padL + iw / 2) + '" y="' + (H - 6) + '" class="clabel" text-anchor="middle">' + esc(opts.xLabel || '前の晩の純アルコール量 (g)') + '</text>';
    s += '<text x="12" y="' + (padT + ih / 2) + '" class="clabel" text-anchor="middle" transform="rotate(-90 12 ' + (padT + ih / 2) + ')">' + esc(opts.yLabel || '睡眠スコア') + '</text>';
    s += '</svg>';
    return s;
  };

  /* ------------------------------------------------------------
     2本比較バー（飲んだ翌朝 vs 飲まなかった翌朝）
     items: [{label, value, color, sub}]
     ------------------------------------------------------------ */
  G.compareBars = function (items, max, unit) {
    var s = '<div class="cmp">';
    items.forEach(function (it) {
      var pct = max > 0 ? Math.max(2, Math.min(100, (it.value / max) * 100)) : 2;
      s += '<div class="cmp-row">' +
             '<div class="cmp-label">' + esc(it.label) + '</div>' +
             '<div class="cmp-track"><div class="cmp-fill" style="width:' + pct + '%;background:' + it.color + '"></div></div>' +
             '<div class="cmp-value">' + (it.value == null ? '—' : (Math.round(it.value * 10) / 10) + (unit || '')) + '</div>' +
           '</div>';
      if (it.sub) s += '<div class="cmp-sub">' + esc(it.sub) + '</div>';
    });
    s += '</div>';
    return s;
  };

  /* 月別トレンドの折れ線 */
  G.trendLine = function (months) {
    var W = 720, H = 180, padL = 40, padR = 14, padT = 14, padB = 28;
    var iw = W - padL - padR, ih = H - padT - padB;
    var vals = months.map(function (m) { return m.avg || 0; });
    var maxV = Math.max(30, Math.ceil(Math.max.apply(null, vals.concat([0])) / 10) * 10);
    var n = months.length;
    function px(i) { return padL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw); }
    function py(v) { return padT + ih * (1 - v / maxV); }

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart">';
    [0, 0.5, 1].forEach(function (r) {
      var y = padT + ih * (1 - r);
      s += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="rgba(255,255,255,.07)"/>';
      s += '<text x="' + (padL - 6) + '" y="' + (y + 4) + '" class="ctick" text-anchor="end">' + Math.round(maxV * r) + '</text>';
    });
    var d = '';
    months.forEach(function (m, i) {
      if (m.avg == null) return;
      d += (d ? ' L' : 'M') + px(i) + ',' + py(m.avg);
    });
    if (d) s += '<path d="' + d + '" fill="none" stroke="#e0b341" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
    months.forEach(function (m, i) {
      if (m.avg != null) {
        s += '<circle cx="' + px(i) + '" cy="' + py(m.avg) + '" r="4.5" fill="#e0b341"/>';
        s += '<text x="' + px(i) + '" y="' + (py(m.avg) - 10) + '" class="ctick" text-anchor="middle">' + m.avg.toFixed(0) + 'g</text>';
      }
      s += '<text x="' + px(i) + '" y="' + (padT + ih + 18) + '" class="ctick" text-anchor="middle">' + esc(m.label) + '</text>';
    });
    s += '</svg>';
    return s;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AL;
})(typeof window !== 'undefined' ? window : globalThis);
