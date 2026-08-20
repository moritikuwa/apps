/* ============================================================
   いっこまえ / IKKOMAE   1かいぶんの すすめ方
   ------------------------------------------------------------
   ゴールから 3回 くだる。1回ごとに カードを 6まい 配る。
   6まいには かならず 3つの 高さ（すぐ手前・とちゅう・いますぐ）を
   まぜて 入れる。ここを かたよらせると
   「いま これを えらぶと 大きすぎないか」を はかる練習に ならない。
   ============================================================ */
(function (root) {
  'use strict';

  var IK = root.IK || (root.IK = {});
  var STEPS = 3;              // 何回 「いっこまえは？」と 聞くか
  var HAND = 6;               // 1回に 配る まい数
  var PER_SIZE = 2;           // 高さごとに さいてい 何まい 出すか

  /* たねから おなじ ならびを 作る（開きなおしても 同じ手札が 出るように） */
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function shuffled(arr, seed) {
    var a = arr.slice(), r = rng(seed);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }

  var Game = IK.game = {
    STEPS: STEPS,

    /* おだいと まわし番号から、そのおだい 用の たねを 作る */
    seedOf: function (theme, n) {
      return (IK.daySeed() * 131 + hash(theme.id) + (n || 0) * 7919) >>> 0;
    },

    /* 高さごとに ならべ直した ふだの 山。ふたりとも 同じ山から ひく */
    piles: function (theme, seed) {
      var p = { 1: [], 2: [], 3: [] };
      theme.cards.forEach(function (c) { p[c.s].push(c); });
      [1, 2, 3].forEach(function (s) { p[s] = shuffled(p[s], seed + s * 977); });
      return p;
    },

    /* step 回目（0..2）に 配る 6まい。
       used は その人が すでに つかった カードの id */
    deal: function (theme, seed, step, used) {
      var piles = this.piles(theme, seed), hand = [];
      var taken = {};
      [3, 2, 1].forEach(function (s) {
        var n = 0;
        piles[s].forEach(function (c) {
          if (n >= PER_SIZE) return;
          if (used.indexOf(c.id) >= 0 || taken[c.id]) return;
          hand.push(c); taken[c.id] = 1; n++;
        });
      });
      /* 高さが かたよって 6まいに とどかないときは 残りから 足す */
      if (hand.length < HAND) {
        [3, 2, 1].forEach(function (s) {
          piles[s].forEach(function (c) {
            if (hand.length >= HAND) return;
            if (used.indexOf(c.id) >= 0 || taken[c.id]) return;
            hand.push(c); taken[c.id] = 1;
          });
        });
      }
      /* 画面での ならびは 毎回 まぜる。高さの じゅんに ならんでいると 見た目で わかってしまう */
      return shuffled(hand, seed + step * 4093 + used.length * 17);
    },

    /* できた みちの かたちを 読む。○×は つけない。
       steps[0] が ゴールの いっこ前、steps[2] が いちばん下（きょうやる）。 */
    shape: function (steps) {
      var v = steps.map(function (c) { return c.s; });
      var allSame = v[0] === v[1] && v[1] === v[2];
      var down = v[0] >= v[1] && v[1] >= v[2];
      var strict = v[0] > v[1] && v[1] > v[2];

      if (strict) return {
        key: 'straight', mark: '🪜',
        title: 'きれいな はしごに なった',
        body: 'ゴールの すぐ手前 → とちゅう → いますぐ できること。大きい ところから 小さい ところへ、ちゃんと おりてきたね。'
      };
      if (allSame && v[0] === 3) return {
        key: 'allbig', mark: '🏔',
        title: 'ぜんぶ ゴールの すぐ手前だね',
        body: 'どれも もう ほとんど できている ところ。ここから 下に、もう ひとつ 小さく わけられないかな？'
      };
      if (allSame && v[0] === 1) return {
        key: 'allsmall', mark: '🐜',
        title: 'ぜんぶ いますぐ できる ことだね',
        body: 'すぐ 手が うごくのは つよい。この 3つで ゴールまで とどくか、上から もう一回 見てみよう。'
      };
      if (allSame) return {
        key: 'allmid', mark: '🌫',
        title: 'ぜんぶ とちゅうの ことだね',
        body: 'ゴールの すぐ手前と、いますぐ できることを さがすと、道が もっと はっきりするかも。'
      };
      if (down) return {
        key: 'down', mark: '↘️',
        title: 'だんだん 小さく なっていったね',
        body: '上から 下へ、ちゃんと 近づいてきている。おなじ 高さが つづいた ところは、もう一つ 分けられるかも。'
      };
      return {
        key: 'up', mark: '🔀',
        title: 'とちゅうで また 大きく なったね',
        body: '下に いくほど 小さく なるのが 「いっこまえ」。じゅんばんを 入れかえたら、どんな みちに なるかな？'
      };
    },

    /* ふたりの みちで、おなじ カードを えらんだ ところ */
    sameAt: function (a, b) {
      var out = [];
      for (var i = 0; i < STEPS; i++) {
        out.push(!!(a && b && a.steps[i] && b.steps[i] && a.steps[i].id === b.steps[i].id));
      }
      return out;
    },

    /* 「きょうやる」の こうほ。ふたりの みちの カードを 小さい じゅんに */
    todoCandidates: function (roads) {
      var seen = {}, out = [];
      roads.forEach(function (r) {
        r.steps.forEach(function (c, i) {
          if (seen[c.id]) return;
          seen[c.id] = 1;
          out.push({ id: c.id, t: c.t, s: c.s, who: r.who, bottom: i === STEPS - 1 });
        });
      });
      out.sort(function (x, y) {
        if (x.s !== y.s) return x.s - y.s;                 /* 小さい ものが 上 */
        return (y.bottom ? 1 : 0) - (x.bottom ? 1 : 0);    /* いちばん下だった ものを 先に */
      });
      return out;
    }
  };

})(window);
