/* ============================================================
   いっこまえ / IKKOMAE   きろくの ほぞん
   すべて この端末の localStorage に保存します。外には一切送りません。
   ============================================================ */
(function (root) {
  'use strict';

  var IK = root.IK || (root.IK = {});
  var KEY = 'ikkomae.v1';

  var defaults = {
    names: { kid: 'こども', adult: 'おとな' },
    mode: 2,                 // 1 = ひとりでやる / 2 = ふたりでやる
    runs: [],                // 新しい順。{ at, theme, goal, emoji, roads[], todo, done, doneAt }
    seen: {},                // themeId -> やった回数。おなじお題ばかり出さないため
    streak: { days: 0, best: 0, last: '' },   // 「やった」を記録した日の連続
    counts: { runs: 0, dones: 0 },
    ui: { seenIntro: false }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* 'YYYY-MM-DD' 同士の日数の差 */
  function dayDiff(a, b) {
    var pa = a.split('-'), pb = b.split('-');
    return Math.round((Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 86400000);
  }

  /* 日づけを 数に する。おだいを 日がわりで えらぶのに つかう */
  function daySeed(d) {
    var p = (d || today()).split('-');
    return (+p[0]) * 372 + (+p[1]) * 31 + (+p[2]);
  }

  var Store = IK.store = {
    data: clone(defaults),

    load: function () {
      try {
        var raw = root.localStorage && root.localStorage.getItem(KEY);
        if (raw) {
          var p = JSON.parse(raw) || {};
          this.data = {
            names: Object.assign(clone(defaults.names), p.names || {}),
            mode: p.mode === 1 ? 1 : 2,
            runs: p.runs || [],
            seen: p.seen || {},
            streak: Object.assign(clone(defaults.streak), p.streak || {}),
            counts: Object.assign(clone(defaults.counts), p.counts || {}),
            ui: Object.assign(clone(defaults.ui), p.ui || {})
          };
        }
      } catch (e) { /* こわれていたら はじめから */ }
      return this.data;
    },

    save: function () {
      try { root.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
    },

    /* ── なまえ・にんずう ── */
    setName: function (who, name) {
      name = String(name || '').trim().slice(0, 8);
      if (!name) return;
      this.data.names[who] = name;
      this.save();
    },
    setMode: function (n) { this.data.mode = (n === 1 ? 1 : 2); this.save(); },
    nameOf: function (who) { return this.data.names[who] || (who === 'kid' ? 'こども' : 'おとな'); },

    /* ── みちを 1本 記録する ──
       roads は [{ who, name, steps:[{id,t,s}, x3] }] */
    addRun: function (theme, roads) {
      var rec = {
        at: today(),
        theme: theme.id,
        goal: theme.goal,
        emoji: theme.emoji,
        roads: roads.map(function (r) {
          return {
            who: r.who,
            name: r.name,
            steps: r.steps.map(function (c) { return { id: c.id, t: c.t, s: c.s }; })
          };
        }),
        todo: null,
        done: false,
        doneAt: ''
      };
      this.data.runs.unshift(rec);
      if (this.data.runs.length > 300) this.data.runs.length = 300;
      this.data.seen[theme.id] = (this.data.seen[theme.id] || 0) + 1;
      this.data.counts.runs++;
      this.save();
      return rec;
    },

    /* ── きょうやる 一手を きめる ── */
    setTodo: function (rec, card, who) {
      rec.todo = { id: card.id, t: card.t, s: card.s, who: who };
      rec.done = false;
      rec.doneAt = '';
      this.save();
    },

    /* まだ「やった？」を 聞いていない やくそく（新しい順に さがす） */
    pendingTodo: function () {
      var runs = this.data.runs;
      for (var i = 0; i < runs.length; i++) {
        if (runs[i].todo && !runs[i].done) return runs[i];
      }
      return null;
    },

    /* やった と 答えたとき。ここでだけ 火が のびる */
    markDone: function (rec, ok) {
      if (!rec || !rec.todo) return;
      if (!ok) {                       /* まだ、なら やくそくを といて 次に すすむ */
        rec.todo = null;
        this.save();
        return;
      }
      rec.done = true;
      rec.doneAt = today();
      this.data.counts.dones++;
      this.touchStreak();
      this.save();
    },

    /* ── 火（つづいた日数） ──
       のびるのは「やった」と 答えた日だけ。道を 作っただけでは のびない。
       1日の ぬけは ゆるす。1日 できなかっただけで 全部 消えるのは、つづける敵なので。 */
    touchStreak: function () {
      var t = today(), s = this.data.streak;
      if (s.last === t) return s;
      var gap = s.last ? dayDiff(s.last, t) : 999;
      s.days = (gap <= 2) ? s.days + 1 : 1;
      s.last = t;
      if (s.days > s.best) s.best = s.days;
      this.save();
      return s;
    },
    streakAlive: function () {
      var s = this.data.streak;
      return s.last ? dayDiff(s.last, today()) <= 2 : false;
    },

    /* ── おだいを えらぶ ──
       まだ やっていない ものを 先に。ぜんぶ やったら 回数の 少ない ものから。
       おなじ日に 何度 ひらいても おなじ おだいが 出る（n を ずらすと 次のおだい）。 */
    pickTheme: function (n) {
      var seen = this.data.seen, list = IK.THEMES.slice();
      list.sort(function (a, b) {
        var d = (seen[a.id] || 0) - (seen[b.id] || 0);
        if (d) return d;
        return a.id < b.id ? -1 : 1;
      });
      var least = seen[list[0].id] || 0;
      var pool = list.filter(function (t) { return (seen[t.id] || 0) === least; });
      var i = (daySeed() + (n || 0)) % pool.length;
      return pool[i];
    },

    /* ── かきだし・よみこみ ── */
    exportText: function () {
      return JSON.stringify({ v: 1, savedAt: today(), data: this.data }, null, 2);
    },
    importText: function (text) {
      var p = JSON.parse(text), d = (p && p.data) ? p.data : p;
      if (!d || typeof d !== 'object' || !d.runs) throw new Error('かたちが ちがいます');
      this.data = {
        names: Object.assign(clone(defaults.names), d.names || {}),
        mode: d.mode === 1 ? 1 : 2,
        runs: d.runs || [],
        seen: d.seen || {},
        streak: Object.assign(clone(defaults.streak), d.streak || {}),
        counts: Object.assign(clone(defaults.counts), d.counts || {}),
        ui: Object.assign(clone(defaults.ui), d.ui || {})
      };
      this.save();
    },
    reset: function () { this.data = clone(defaults); this.save(); }
  };

  IK.today = today;
  IK.dayDiff = dayDiff;
  IK.daySeed = daySeed;

})(window);
