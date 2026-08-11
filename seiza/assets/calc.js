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

  /* ============================================================
     魔法陣の並べ方
     星座＝扇（6等分）、段＝輪（内から 初級・中級・上級）。
     技を足せば自動でその位置に入ります。座標を書く必要はありません。
     ============================================================ */
  SZ.RING = [142, 230, 306];        // 初級・中級・上級 の半径
  SZ.OUTER = 336;                   // 一番外の輪
  SZ.RING_LABEL_R = 372;            // 星座名を置く半径
  SZ.CENTER = { x: SZ.MAP.w / 2, y: SZ.MAP.h / 2 };

  SZ.BADGE = [24, 25.5, 27];              // 段ごとの札の大きさ（半径）

  SZ.layout = function () {
    var C = SZ.CENTER, sectors = SZ.CONSTELLATIONS.length;
    var span = 360 / sectors;
    SZ.CONSTELLATIONS.forEach(function (c, si) {
      var mid = -90 + si * span;          // 扇の中心角（上を起点に時計回り）
      c.angle = mid;
      [1, 2, 3].forEach(function (tier) {
        var list = SZ.SKILLS.filter(function (s) { return s.const === c.id && s.tier === tier; });
        var R = SZ.RING[tier - 1];
        /* 札がぶつからない間隔を、札の大きさと半径から逆算する。
           技が増えても勝手に詰まらないよう、ここは固定値にしない。 */
        var step = (SZ.BADGE[tier - 1] * 2 + 12) / R * 180 / Math.PI;
        var use = list.length > 1
          ? Math.max(span * 0.30, Math.min(span * 0.88, step * (list.length - 1)))
          : 0;
        list.forEach(function (s, i) {
          var a = list.length === 1 ? mid : mid - use / 2 + use * i / (list.length - 1);
          /* 3つ以上並ぶ段は、内外に互い違いにずらして間を稼ぐ */
          var r = R + (list.length > 2 ? (i % 2 ? 17 : -17) : 0);
          var rad = a * Math.PI / 180;
          s.x = C.x + Math.cos(rad) * r;
          s.y = C.y + Math.sin(rad) * r;
          s.angle = a;
        });
      });
    });
  };
  SZ.layout();

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

    /* 次の称号まであと何点か（ここが一番の燃料になる） */
    nextRank: function () {
      var p = this.percent(), t = this.total(), nxt = null;
      SZ.RANKS.forEach(function (x) { if (x.min > p && !nxt) nxt = x; });
      if (!nxt) return null;
      return { name: nxt.name, need: Math.max(1, Math.ceil(nxt.min / 100 * t.max) - t.got) };
    },

    /* ★に届いていない星の数（段ごと） */
    remaining: function () {
      var out = { all: 0, t: [0, 0, 0] };
      SZ.SKILLS.forEach(function (s) {
        if (SZ.store.state(s.id) < OPEN) { out.all++; out.t[s.tier - 1]++; }
      });
      return out;
    },

    /* 今日★以上にした星の数 */
    litToday: function () {
      var t = SZ.today(), seen = {};
      SZ.store.data.log.forEach(function (e) {
        if (e.at === t && SZ.store.state(e.id) >= OPEN) seen[e.id] = 1;
      });
      return Object.keys(seen).length;
    },

    /* 🌟 人に教えられる星の数 */
    taught: function () {
      return SZ.SKILLS.filter(function (s) { return SZ.store.state(s.id) === 4; }).length;
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

    /* ── 今日の一手 ──
       毎日ひとつだけ選ばれる。その日のうちは変わらない（迷う余地をなくすため）。 */
    daily: function () {
      var t = SZ.today(), d = SZ.store.data.daily;
      if (d.at === t && d.id && SZ.byId[d.id]) return { skill: SZ.byId[d.id], done: !!d.done };

      /* 効く順の上位から選ぶ。毎日ちがう星が来るが、必ず今の自分に効く星 */
      var list = this.nextMoves(8);
      if (!list.length) return null;
      var n = 0;
      for (var i = 0; i < t.length; i++) n = (n * 131 + t.charCodeAt(i)) % 1000003;
      var pick = list[n % list.length];
      SZ.store.data.daily = { at: t, id: pick.id, done: false };
      SZ.store.save();
      return { skill: pick, done: false };
    },

    /* 今日の一手をやり切った（実行を記録した、または★以上にした） */
    markDailyDone: function (id) {
      var d = SZ.store.data.daily;
      if (d.at !== SZ.today() || d.id !== id || d.done) return false;
      d.done = true;
      SZ.store.data.dailyDone = (SZ.store.data.dailyDone || 0) + 1;
      SZ.store.save();
      return true;
    },

    /* ── 印の判定に渡す値 ── */
    badgeCtx: function () {
      var runs = 0, fixes = 0, R = SZ.store.data.runs;
      Object.keys(R).forEach(function (k) {
        R[k].forEach(function (r) { runs++; if (r.fix) fixes++; });
      });
      var complete = 0, lit = 0;
      SZ.CONSTELLATIONS.forEach(function (c) {
        var list = SZ.SKILLS.filter(function (s) { return s.const === c.id; });
        var done = list.filter(function (s) { return SZ.store.state(s.id) >= OPEN; }).length;
        if (list.length && done === list.length) complete++;
        if (done > 0) lit++;
      });
      return {
        runs: runs, fixes: fixes, streak: SZ.store.data.streak.days,
        daily: SZ.store.data.dailyDone || 0, taught: this.taught(),
        complete: complete, lit: lit, remaining: this.remaining().all
      };
    },

    /* 新しく灯った印を返す（同時に保存する） */
    earnBadges: function () {
      var ctx = this.badgeCtx(), got = SZ.store.data.badges, fresh = [];
      SZ.BADGES.forEach(function (b) {
        if (got[b.id]) return;
        var ok = false;
        try { ok = b.check(ctx); } catch (e) { ok = false; }
        if (ok) { got[b.id] = SZ.today(); fresh.push(b); }
      });
      if (fresh.length) SZ.store.save();
      return fresh;
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
