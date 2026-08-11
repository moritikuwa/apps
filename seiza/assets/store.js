/* ============================================================
   AI星座 / SEIZA   データ保存
   すべて端末の localStorage に保存。外部には一切送信しません。
   ============================================================ */
(function (root) {
  'use strict';

  var SZ = root.SZ || (root.SZ = {});
  var KEY = 'seiza.v1';

  var defaults = {
    states: {},          // skillId -> 0..4
    log: [],             // { at:'YYYY-MM-DD', id, from, to }   状態が変わった記録
    runs: {},            // skillId -> [{ at, did, saw, fix }]  実行→確認→改善の記録
    ui: { seenIntro: false, view: 'map' }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  var Store = SZ.store = {
    data: clone(defaults),

    load: function () {
      try {
        var raw = root.localStorage && root.localStorage.getItem(KEY);
        if (raw) {
          var p = JSON.parse(raw);
          this.data = {
            states: p.states || {},
            log: p.log || [],
            runs: p.runs || {},
            ui: Object.assign(clone(defaults.ui), p.ui || {})
          };
        }
      } catch (e) { /* 壊れていたら初期値のまま使う */ }
      return this.data;
    },

    save: function () {
      try {
        root.localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) { /* 保存できない環境でも動きは止めない */ }
    },

    /* ── 星の状態 ── */
    state: function (id) {
      var v = this.data.states[id];
      return typeof v === 'number' ? v : 0;
    },

    setState: function (id, v) {
      v = Math.max(0, Math.min(4, v | 0));
      var from = this.state(id);
      if (from === v) return;
      this.data.states[id] = v;
      this.data.log.unshift({ at: today(), id: id, from: from, to: v });
      if (this.data.log.length > 400) this.data.log.length = 400;
      this.save();
    },

    /* ── 実行→確認→改善の記録 ── */
    runs: function (id) { return this.data.runs[id] || []; },

    addRun: function (id, rec) {
      if (!this.data.runs[id]) this.data.runs[id] = [];
      this.data.runs[id].unshift({
        at: today(),
        did: (rec.did || '').slice(0, 600),
        saw: (rec.saw || '').slice(0, 600),
        fix: (rec.fix || '').slice(0, 600)
      });
      this.save();
    },

    delRun: function (id, i) {
      var a = this.data.runs[id];
      if (!a || !a[i]) return;
      a.splice(i, 1);
      if (!a.length) delete this.data.runs[id];
      this.save();
    },

    /* 改善だけを新しい順に集める（何を学び直したかの一覧） */
    allFixes: function () {
      var out = [], self = this;
      Object.keys(this.data.runs).forEach(function (id) {
        self.data.runs[id].forEach(function (r) {
          if (r.fix) out.push({ id: id, at: r.at, fix: r.fix });
        });
      });
      return out.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    },

    /* ── 書き出し・読み込み ── */
    exportText: function () {
      return JSON.stringify({ v: 1, savedAt: today(), data: this.data }, null, 2);
    },

    importText: function (text) {
      var p = JSON.parse(text);
      var d = p && p.data ? p.data : p;
      if (!d || typeof d !== 'object' || !d.states) throw new Error('形式が違います');
      this.data = {
        states: d.states || {},
        log: d.log || [],
        runs: d.runs || {},
        ui: Object.assign(clone(defaults.ui), d.ui || {})
      };
      this.save();
    },

    reset: function () {
      this.data = clone(defaults);
      this.save();
    }
  };

  SZ.today = today;

})(window);
