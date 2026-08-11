/* ============================================================
   AI星座 / SEIZA   計算
   星の状態から、レベル・パラメーター・「次の一手」を出す。
   ============================================================ */
(function (root) {
  'use strict';

  var SZ = root.SZ;
  var MAXS = 4;               // 星ひとつの満点
  var OPEN = 3;               // 前提として認める状態（★=一人でできる）

  var byId = {};
  SZ.SKILLS.forEach(function (s) { byId[s.id] = s; });
  SZ.byId = byId;

  var C = SZ.calc = {

    /* 前提がすべて★以上なら取りに行ける */
    isOpen: function (s) {
      if (!s.req || !s.req.length) return true;
      return s.req.every(function (r) { return SZ.store.state(r) >= OPEN; });
    },

    /* 足りていない前提の星 */
    missing: function (s) {
      if (!s.req) return [];
      return s.req.filter(function (r) { return SZ.store.state(r) < OPEN; }).map(function (r) { return byId[r]; });
    },

    /* ⚡ 今すぐ取れる / 🔒 まだ早い / 🌟 取得済み */
    status: function (s) {
      var v = SZ.store.state(s.id);
      if (v >= OPEN) return 'done';
      if (!this.isOpen(s)) return 'locked';
      return v > 0 ? 'doing' : 'ready';
    },

    /* 総合 */
    total: function () {
      var got = 0;
      SZ.SKILLS.forEach(function (s) { got += SZ.store.state(s.id); });
      return { got: got, max: SZ.SKILLS.length * MAXS };
    },

    percent: function () {
      var t = this.total();
      return t.max ? Math.round(t.got / t.max * 100) : 0;
    },

    /* レベル（星7つ分の習得で1つ上がる） */
    level: function () {
      var t = this.total();
      var lv = 1 + Math.floor(t.got / 7);
      var into = t.got % 7;
      return { lv: lv, into: into, need: 7, got: t.got, max: t.max };
    },

    rank: function () {
      var p = this.percent(), r = SZ.RANKS[0];
      SZ.RANKS.forEach(function (x) { if (p >= x.min) r = x; });
      return r.name;
    },

    /* 自分の段（初級/中級/上級）— 説明をどこまで出すかの判断に使う */
    grade: function () {
      var p = this.percent();
      if (p >= 45) return 3;
      if (p >= 15) return 2;
      return 1;
    },

    gradeName: function () {
      return ['', '初級', '中級', '上級'][this.grade()];
    },

    /* 星座ごとの伸び（0〜1） */
    params: function () {
      return SZ.CONSTELLATIONS.map(function (c) {
        var list = SZ.SKILLS.filter(function (s) { return s.const === c.id; });
        var got = 0;
        list.forEach(function (s) { got += SZ.store.state(s.id); });
        var max = list.length * MAXS;
        return { id: c.id, name: c.label, color: c.color, got: got, max: max, ratio: max ? got / max : 0 };
      });
    },

    /* 一番遅れている星座 */
    weakest: function () {
      var ps = this.params().slice().sort(function (a, b) { return a.ratio - b.ratio; });
      return ps[0];
    },

    /* ⚡ 次の一手：取りに行ける未取得の星を、効きそうな順に */
    nextMoves: function (n) {
      var self = this;
      var weak = this.weakest();
      var open = SZ.SKILLS.filter(function (s) {
        return SZ.store.state(s.id) < OPEN && self.isOpen(s);
      });
      open.sort(function (a, b) {
        /* ① 遅れている星座を優先 ② 段が低い順 ③ 途中まで進んでいるものを優先 */
        var wa = (a.const === weak.id ? 0 : 1), wb = (b.const === weak.id ? 0 : 1);
        if (wa !== wb) return wa - wb;
        if (a.tier !== b.tier) return a.tier - b.tier;
        return SZ.store.state(b.id) - SZ.store.state(a.id);
      });
      return n ? open.slice(0, n) : open;
    },

    /* 🔒 まだ早い星のうち、あと1つで開くもの */
    almost: function (n) {
      var self = this;
      var list = SZ.SKILLS.filter(function (s) {
        return !self.isOpen(s) && self.missing(s).length === 1;
      });
      list.sort(function (a, b) { return a.tier - b.tier; });
      return n ? list.slice(0, n) : list;
    },

    /* この星を開けるために先に取るべきもの（前提を深くたどる） */
    prereqChain: function (s) {
      var out = [], seen = {};
      (function walk(x) {
        (x.req || []).forEach(function (r) {
          if (seen[r]) return;
          seen[r] = 1;
          var p = byId[r];
          if (!p) return;
          walk(p);
          if (SZ.store.state(r) < OPEN) out.push(p);
        });
      })(s);
      return out;
    }
  };

  SZ.OPEN = OPEN;
  SZ.MAXS = MAXS;

})(window);
