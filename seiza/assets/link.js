/* ============================================================
   AI星座 / SEIZA   接続（任意・読み取り専用）

   ここでやること
     ・GitHub の「公開されているページ」を読みに行くだけ。
     ・ログインなし。鍵なし。Cookie も送らない（credentials:'omit'）。
     ・こちらから出すデータは1件もない。読むだけ。

   ここで絶対にやらないこと
     ・星の記録（seiza.v1）を外へ出すこと
     ・技の一覧（skills.js）を書き換えること
     ・認証トークン・APIキーをこの端末に置くこと

   繋がなければ、このファイルは何もしません。
   繋いだあとでも「接続を切る」を押せば seiza.link.v1 ごと消え、完全に元へ戻ります。
   ============================================================ */
(function (root) {
  'use strict';

  var SZ = root.SZ || (root.SZ = {});
  var KEY = 'seiza.link.v1';

  /* 読みに行く先。公開リポジトリのみ */
  var SRC = { owner: 'moritikuwa', repo: 'apps', branch: 'main' };
  var API = 'https://api.github.com';
  var SKILLS_PATH = 'seiza/assets/skills.js';
  var CAND_PATH = 'seiza/data/candidates.json';

  /* 外へ出す項目。ここが空なら、何も出していない。画面にそのまま並べます */
  var SENDS = [];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var defaults = {
    v: 1,
    on: false,
    consent: { accepted: false, at: '', sends: SENDS },
    sources: {
      github: {
        owner: SRC.owner, repo: SRC.repo, branch: SRC.branch,
        lastSync: '',      // 最後に確認した日
        lastSha: '',       // skills.js の最新コミット
        lastAt: '',        // その日付
        seenSha: ''        // 森さんが「見た」と押したところ
      }
    },
    candidates: [],        // 収集で見つかった候補。星ではない
    local: { lastImportAt: '', sessions: 0, runsImported: 0 },
    status: { at: '', ok: null, msg: '' }
  };

  /* ── 外から来た文字は、ここを通ったものしか画面に出さない ── */
  function clean(s, n) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .slice(0, n).trim();
  }
  function safeUrl(u) {
    u = String(u == null ? '' : u);
    return /^https:\/\/[\w.-]+(\/|$)/.test(u) ? u.slice(0, 300) : '';
  }
  function oneOf(v, list, def) {
    return list.indexOf(v) >= 0 ? v : def;
  }

  /* 候補1件を、決めた形だけに削ぎ落とす */
  function tidy(c, i) {
    var ids = {};
    SZ.SKILLS.forEach(function (s) { ids[s.id] = 1; });
    return {
      id: clean(c.id, 24) || ('c' + i),
      title: clean(c.title, 120),
      url: safeUrl(c.url),
      from: oneOf(clean(c.from, 16), ['youtube', 'x', 'note', 'web'], 'web'),
      foundAt: /^\d{4}-\d{2}-\d{2}$/.test(c.foundAt) ? c.foundAt : '',
      match: oneOf(clean(c.match, 8), ['now', 'early', 'before'], 'now'),
      relatedTo: (Array.isArray(c.relatedTo) ? c.relatedTo : [])
        .map(function (x) { return clean(x, 24); })
        .filter(function (x) { return ids[x]; }).slice(0, 4),
      state: 'new'
    };
  }

  SZ.link = {
    data: clone(defaults),

    load: function () {
      try {
        var raw = root.localStorage && root.localStorage.getItem(KEY);
        if (raw) {
          var p = JSON.parse(raw) || {};
          var d = clone(defaults);
          d.on = !!p.on;
          if (p.consent) d.consent = { accepted: !!p.consent.accepted, at: clean(p.consent.at, 10), sends: SENDS };
          if (p.sources && p.sources.github) {
            Object.keys(d.sources.github).forEach(function (k) {
              if (typeof p.sources.github[k] === 'string') d.sources.github[k] = clean(p.sources.github[k], 60);
            });
            /* 読みに行く先は、こちらで決めたものから動かさない */
            d.sources.github.owner = SRC.owner;
            d.sources.github.repo = SRC.repo;
            d.sources.github.branch = SRC.branch;
          }
          if (Array.isArray(p.candidates)) {
            d.candidates = p.candidates.slice(0, 200).map(function (c, i) {
              var t = tidy(c || {}, i);
              t.state = oneOf(clean((c || {}).state, 8), ['new', 'kept', 'dropped'], 'new');
              return t;
            });
          }
          if (p.local) d.local = { lastImportAt: clean(p.local.lastImportAt, 10), sessions: +p.local.sessions || 0, runsImported: +p.local.runsImported || 0 };
          this.data = d;
        }
      } catch (e) { /* 壊れていたら繋いでいない状態から始める */ }
      return this.data;
    },

    save: function () {
      try { root.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
    },

    isOn: function () { return !!(this.data.on && this.data.consent.accepted); },

    /* 出す項目の一覧。空なら「読むだけ」 */
    sends: function () { return SENDS.slice(); },

    enable: function () {
      this.data.on = true;
      this.data.consent = { accepted: true, at: SZ.today(), sends: SENDS };
      this.save();
    },

    /* 接続を切る。seiza.link.v1 ごと消える。星の記録には触らない */
    disable: function () {
      this.data = clone(defaults);
      try { root.localStorage.removeItem(KEY); } catch (e) {}
    },

    /* 技の一覧に、まだ見ていない更新があるか */
    hasUpdate: function () {
      var g = this.data.sources.github;
      return !!(g.lastSha && g.lastSha !== g.seenSha);
    },

    markUpdateSeen: function () {
      this.data.sources.github.seenSha = this.data.sources.github.lastSha;
      this.save();
    },

    /* まだ決めていない候補 */
    fresh: function () {
      return this.data.candidates.filter(function (c) { return c.state === 'new'; });
    },

    setCandidate: function (id, state) {
      this.data.candidates.forEach(function (c) {
        if (c.id === id) c.state = oneOf(state, ['new', 'kept', 'dropped'], 'new');
      });
      this.save();
    },

    /* ── 読みに行く ──
       GET を2本だけ。認証なし、Cookie なし、送信データなし。 */
    sync: function (done) {
      var self = this;
      if (!this.isOn()) { done({ ok: false, msg: '繋いでいません' }); return; }
      if (!root.fetch) { done({ ok: false, msg: 'この端末のブラウザでは使えません' }); return; }

      var base = API + '/repos/' + SRC.owner + '/' + SRC.repo;

      function get(url, accept) {
        return root.fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',          /* Cookie を送らない */
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
          headers: { 'Accept': accept }
        });
      }

      /* ① 技の一覧が更新されていないか（最新コミットを1件だけ） */
      get(base + '/commits?per_page=1&sha=' + encodeURIComponent(SRC.branch) +
          '&path=' + encodeURIComponent(SKILLS_PATH), 'application/vnd.github+json')
        .then(function (res) {
          if (res.status === 403) throw new Error('しばらく待ってからもう一度（回数の上限）');
          if (!res.ok) throw new Error('読めませんでした（' + res.status + '）');
          return res.json();
        })
        .then(function (list) {
          var c = Array.isArray(list) && list[0];
          var g = self.data.sources.github;
          if (c) {
            g.lastSha = clean(c.sha, 40);
            g.lastAt = clean((c.commit && c.commit.author && c.commit.author.date) || '', 10);
            if (!g.seenSha) g.seenSha = g.lastSha;   /* 初回は「見た」ことにする */
          }

          /* ② 候補ファイル。まだ無ければ 404 でよい */
          return get(base + '/contents/' + CAND_PATH + '?ref=' + encodeURIComponent(SRC.branch),
                     'application/vnd.github.raw')
            .then(function (res2) {
              if (res2.status === 404) return null;
              if (!res2.ok) throw new Error('候補が読めませんでした（' + res2.status + '）');
              return res2.text();
            });
        })
        .then(function (text) {
          if (text) {
            var got;
            try { got = JSON.parse(text); }
            catch (e) { throw new Error('候補ファイルの形が違います'); }
            var list = Array.isArray(got) ? got : (got && got.candidates) || [];
            var was = {};
            self.data.candidates.forEach(function (c) { was[c.id] = c.state; });
            self.data.candidates = list.slice(0, 200).map(function (c, i) {
              var t = tidy(c || {}, i);
              if (was[t.id]) t.state = was[t.id];      /* 決めた分は上書きしない */
              return t;
            });
          }
          self.data.sources.github.lastSync = SZ.today();
          self.data.status = { at: SZ.today(), ok: true, msg: '' };
          self.save();
          done({ ok: true });
        })
        .catch(function (e) {
          self.data.status = { at: SZ.today(), ok: false, msg: clean(e && e.message, 80) };
          self.save();
          done({ ok: false, msg: self.data.status.msg });
        });
    }
  };

})(window);
