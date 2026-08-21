/* ============================================================
   いっこまえ / IKKOMAE   画面
   ------------------------------------------------------------
   すすみ方
     home ─→ handoff ─→ play(×3) ─→ handoff ─→ play(×3)
          ─→ compare ─→ todo ─→ finish ─→ home
   ひとりで やるときは handoff を とばして 1本だけ 作る。
   ============================================================ */
(function (root) {
  'use strict';

  var IK = root.IK;
  var store = IK.store, game = IK.game;
  var app, view = 'home';
  var run = null;          // いま やっている 1かいぶん
  var themeN = 0;          // 「べつの おだい」を おした 回数
  var hidePromise = false; // この せっしょんの あいだだけ やくそくを ふせる

  function $(id) { return document.getElementById(id); }
  function h(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  function toast(msg) {
    var t = h('<div class="toast">' + esc(msg) + '</div>');
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('go'); }, 10);
    setTimeout(function () { t.remove(); }, 2100);
  }

  function szMark(s) { return (IK.SIZE[s] || { mark: '' }).mark; }

  /* 何日前か */
  function agoText(at) {
    var d = IK.dayDiff(at, IK.today());
    if (d <= 0) return 'きょう';
    if (d === 1) return 'きのう';
    return d + '日まえ';
  }

  /* ============================================================
     上のバー
     ============================================================ */
  function renderHud() {
    var s = store.data.streak, alive = store.streakAlive();
    var f = $('hud-fire');
    f.innerHTML = '🔥<b>' + (alive ? s.days : 0) + '</b>';
    f.className = (alive && s.days > 0) ? '' : 'off';
    var q = $('hud-quit');
    q.style.display = (view === 'play' || view === 'handoff' || view === 'compare' || view === 'todo') ? '' : 'none';
  }

  function setView(v) {
    view = v;
    document.body.classList.toggle('noTab', v !== 'home' && v !== 'log' && v !== 'settings');
    Array.prototype.forEach.call(document.querySelectorAll('#tabbar button'), function (b) {
      b.classList.toggle('on', b.dataset.view === v);
    });
    render();
    root.scrollTo(0, 0);
  }

  /* ============================================================
     ホーム
     ============================================================ */
  function renderHome() {
    var out = [];

    if (!store.data.ui.seenIntro) {
      out.push(
        '<div class="panel">' +
        '<div class="h">はじめての人へ</div>' +
        '<p class="sub">「できるように なりたいこと」を <b>いちばん上</b> に おきます。<br>' +
        'そこから <b>「じゃあ、いっこまえは？」</b> を 3回 くりかえして、下へ おりていきます。<br>' +
        'いちばん下に のこったのが、<b>きょう やること</b> です。</p>' +
        '<button class="big ghost" id="intro-ok">わかった</button>' +
        '</div>'
      );
    }

    var pend = store.pendingTodo();
    if (pend && !hidePromise) {
      var old = IK.dayDiff(pend.at, IK.today()) >= 2;
      out.push(
        '<div class="promise">' +
        '<div class="lab">' + esc(agoText(pend.at)) + ' きめた やくそく</div>' +
        '<div class="t">' + esc(pend.todo.t) + '</div>' +
        '<div class="by">' + esc(store.nameOf(pend.todo.who)) + 'が えらんだ　／　ゴール：' + esc(pend.goal) + '</div>' +
        '<button class="big" id="pr-done">やった！</button>' +
        '<div class="row" style="margin-top:10px">' +
        '<button class="mini" id="pr-later">まだ</button>' +
        (old ? '<button class="mini danger" id="pr-drop">これは やめる</button>' : '') +
        '</div>' +
        '</div>'
      );
    }

    var th = store.pickTheme(themeN);
    var color = IK.TAGS[th.tag] || '#9dabbd';
    out.push(
      '<div class="theme" style="margin-top:' + (out.length ? '14px' : '0') + '">' +
      '<span class="tag" style="color:' + color + '">' + esc(th.tag) + '</span>' +
      '<div class="em">' + esc(th.emoji) + '</div>' +
      '<div class="lab">きょうの ゴール</div>' +
      '<div class="goal">' + esc(th.goal) + '</div>' +
      '</div>'
    );

    out.push(
      '<div class="panel" style="margin-top:14px">' +
      '<div class="h">だれで やる？</div>' +
      '<div class="seg">' +
      '<button data-mode="2" class="' + (store.data.mode === 2 ? 'on' : '') + '">ふたりで<br><span style="font-size:11.5px;font-weight:600;color:var(--muted)">' + esc(store.nameOf('kid')) + ' と ' + esc(store.nameOf('adult')) + '</span></button>' +
      '<button data-mode="1" class="' + (store.data.mode === 1 ? 'on' : '') + '">ひとりで</button>' +
      '</div>' +
      '<button class="big" id="go">はじめる</button>' +
      '<button class="mini" id="another" style="width:100%;margin-top:10px">べつの おだいに する</button>' +
      '</div>'
    );

    app.innerHTML = out.join('');

    if ($('intro-ok')) $('intro-ok').onclick = function () {
      store.data.ui.seenIntro = true; store.save(); render();
    };
    if ($('pr-done')) $('pr-done').onclick = function () {
      store.markDone(pend, true);
      buzz([10, 40, 20]);
      toast('🔥 ' + store.data.streak.days + '日 つづいてるよ');
      renderHud(); render();
    };
    if ($('pr-later')) $('pr-later').onclick = function () { hidePromise = true; render(); };
    if ($('pr-drop')) $('pr-drop').onclick = function () { store.markDone(pend, false); render(); };

    Array.prototype.forEach.call(app.querySelectorAll('[data-mode]'), function (b) {
      b.onclick = function () { store.setMode(+b.dataset.mode); render(); };
    });
    $('another').onclick = function () { themeN++; render(); };
    $('go').onclick = startRun;
  }

  /* ============================================================
     1かいの はじまり
     ============================================================ */
  function startRun() {
    var th = store.pickTheme(themeN);
    var roads = [{ who: 'kid', name: store.nameOf('kid'), steps: [] }];
    if (store.data.mode === 2) roads.push({ who: 'adult', name: store.nameOf('adult'), steps: [] });
    run = { theme: th, seed: game.seedOf(th, themeN), roads: roads, idx: 0, step: 0, todo: null, rec: null };
    setView(store.data.mode === 2 ? 'handoff' : 'play');
  }

  function quitRun() {
    run = null;
    hidePromise = false;
    setView('home');
  }

  /* ============================================================
     ばんの わたし
     ============================================================ */
  function renderHandoff() {
    var r = run.roads[run.idx];
    var first = run.idx === 0;
    app.innerHTML =
      '<div class="handoff">' +
      '<div class="em">' + (first ? '🚀' : '🤝') + '</div>' +
      (first ? '' : '<div class="note">できた！ みちは かくしたよ 🙈</div>') +
      '<div class="who">' + esc(r.name) + ' の ばん</div>' +
      '<div class="note">' + (first ? 'スマホを ' + esc(r.name) + ' に わたしてね' : 'つぎの人に わたしてね。<br>まえの人の こたえは 見えないよ') + '</div>' +
      '</div>' +
      '<div class="theme" style="margin-top:18px">' +
      '<div class="em">' + esc(run.theme.emoji) + '</div>' +
      '<div class="lab">ゴール</div>' +
      '<div class="goal">' + esc(run.theme.goal) + '</div>' +
      '</div>' +
      '<button class="big" id="hstart">はじめる</button>';
    $('hstart').onclick = function () { setView('play'); };
  }

  /* ============================================================
     えらぶ画面
     ============================================================ */
  /* えらんだ ところまでを はしごで 見せる。
     まだの ぶんで 画面を うめると カードが 下に おされて 見えなくなるので、
     のこりは 1行に まとめる。 */
  function roadHtml(steps) {
    var out = ['<div class="rung goal"><span class="n">⭐</span>' + esc(run.theme.goal) + '</div>'];
    steps.forEach(function (c, i) {
      out.push('<div class="arrow">↑</div>');
      out.push('<div class="rung"><span class="n">' + (i + 1) + '</span>' + esc(c.t) + '</div>');
    });
    var rest = game.STEPS - steps.length;
    if (rest > 0) {
      out.push('<div class="arrow">↑</div>');
      out.push('<div class="rung blank"><span class="n">' + (steps.length + 1) + '</span>いま えらんでいる ところ</div>');
    }
    return '<div class="road">' + out.join('') + '</div>';
  }

  function renderPlay() {
    var r = run.roads[run.idx];
    var used = r.steps.map(function (c) { return c.id; });
    var hand = game.deal(run.theme, run.seed, run.step, used);
    var last = r.steps.length ? r.steps[r.steps.length - 1].t : run.theme.goal;

    var head = (store.data.mode === 2)
      ? '<div class="cname ' + r.who + '">' + esc(r.name) + ' の ばん</div>' : '';

    app.innerHTML =
      head +
      roadHtml(r.steps) +
      '<div class="ask">じゃあ、その いっこまえは？' +
      '<small>「' + esc(last) + '」の まえに できていること' +
      '</small></div>' +
      '<div class="count">' + (run.step + 1) + ' / ' + game.STEPS + '</div>' +
      '<div class="hand" id="hand"></div>';

    var host = $('hand');
    hand.forEach(function (c) {
      var b = h('<button class="pick">' + esc(c.t) + '</button>');
      b.onclick = function () {
        if (b.classList.contains('chosen')) return;
        Array.prototype.forEach.call(host.querySelectorAll('.pick'), function (x) { x.disabled = true; });
        b.classList.add('chosen');
        buzz(12);
        setTimeout(function () { choose(c); }, 240);
      };
      host.appendChild(b);
    });
  }

  function choose(card) {
    var r = run.roads[run.idx];
    r.steps.push(card);
    run.step++;
    if (run.step < game.STEPS) { render(); root.scrollTo(0, 0); return; }
    /* この人の みちが できた */
    if (run.idx < run.roads.length - 1) {
      run.idx++; run.step = 0;
      setView('handoff');
    } else {
      run.rec = store.addRun(run.theme, run.roads);
      setView('compare');
    }
  }

  /* ============================================================
     みくらべ
     ============================================================ */
  function renderCompare() {
    var roads = run.roads, two = roads.length === 2;
    var same = two ? game.sameAt(roads[0], roads[1]) : [false, false, false];

    /* 段ごとに 横に ならべる。1つ目・2つ目…が 左右で そろっていないと 見くらべに ならない */
    var cells = roads.map(function (r) {
      return '<div class="cname ' + r.who + '">' + esc(r.name) + '</div>';
    });
    for (var st = 0; st < game.STEPS; st++) {
      roads.forEach(function (r) {
        var c = r.steps[st];
        cells.push('<div class="crung' + (same[st] ? ' same' : '') + '">' +
          '<span class="sz">' + szMark(c.s) + '　' + esc(IK.SIZE[c.s].short) + '</span>' +
          esc(c.t) + '</div>');
      });
    }

    /* ふたりの みちの かたちが おなじなら、おなじ文を 2回 出さない */
    var reads = roads.map(function (r) { return { r: r, s: game.shape(r.steps) }; });
    var merged = (reads.length === 2 && reads[0].s.key === reads[1].s.key);
    var shapes = (merged ? [reads[0]] : reads).map(function (x) {
      var who = merged ? 'ふたりとも' : x.r.name;
      return '<div class="shape"><span class="m">' + x.s.mark + '</span>' +
        '<div class="t">' + esc(who) + '：' + esc(x.s.title) + '</div>' +
        '<div class="b">' + esc(x.s.body) + '</div></div>';
    });

    var sameCount = same.filter(Boolean).length;

    app.innerHTML =
      '<div class="theme"><div class="em">' + esc(run.theme.emoji) + '</div>' +
      '<div class="lab">ゴール</div><div class="goal">' + esc(run.theme.goal) + '</div></div>' +
      '<div class="panel" style="margin-top:14px;padding-bottom:8px">' +
      '<div class="h">ふたりの みち　（上が ゴールに 近いほう）</div>' +
      (two && sameCount ? '<div class="samemark">おなじ カードを ' + sameCount + 'こ えらんだ ✨</div>' : '') +
      '<div class="compare' + (two ? '' : ' one') + '">' + cells.join('') + '</div>' +
      '</div>' +
      shapes.join('') +
      '<div class="panel" style="margin-top:14px">' +
      '<p class="sub">●が 多いほど <b>ゴールに 近い</b>、●が 少ないほど <b>いますぐ できる</b> こと。<br>' +
      'えらんでいる ときは 見えないようにして あります。<br><br>' +
      '<b>おたがいに 聞いてみよう：「なんで それを えらんだの？」</b></p>' +
      '</div>' +
      '<button class="big" id="tonext">きょう やる ことを きめる</button>';

    $('tonext').onclick = function () { setView('todo'); };
  }

  /* ============================================================
     きょう やる ことを 1つ
     ============================================================ */
  function renderTodo() {
    var cands = game.todoCandidates(run.roads);
    app.innerHTML =
      '<div class="rung goal"><span class="n">⭐</span>' + esc(run.theme.goal) + '</div>' +
      '<div class="ask">きょう やるのは どれ？' +
      '<small>1つだけ えらぶ。●が 少ないほど すぐ できる</small></div>' +
      '<div class="hand" id="hand"></div>';

    var host = $('hand');
    cands.forEach(function (c) {
      var who = store.data.mode === 2 ? '<span style="color:var(--dim);font-size:11.5px">（' + esc(store.nameOf(c.who)) + '）</span> ' : '';
      var b = h('<button class="pick"><span style="color:var(--dim);font-size:11px;letter-spacing:.16em">' +
        szMark(c.s) + '</span><br>' + who + esc(c.t) + '</button>');
      b.onclick = function () {
        Array.prototype.forEach.call(host.querySelectorAll('.pick'), function (x) { x.disabled = true; });
        b.classList.add('chosen');
        buzz([8, 30, 14]);
        store.setTodo(run.rec, c, c.who);
        run.todo = c;
        setTimeout(function () { setView('finish'); }, 260);
      };
      host.appendChild(b);
    });
  }

  /* ============================================================
     しあげ
     ============================================================ */
  function renderFinish() {
    var c = run.todo;
    app.innerHTML =
      '<div class="finish"><div class="em">🎉</div><div class="t">みちが できた！</div></div>' +
      '<div class="promise" style="margin-top:10px">' +
      '<div class="lab">きょう やること</div>' +
      '<div class="t">' + esc(c.t) + '</div>' +
      '<div class="by">ゴール：' + esc(run.theme.goal) + '</div>' +
      '</div>' +
      '<div class="panel" style="margin-top:14px">' +
      '<p class="sub">つぎに ひらいたとき、<b>「やった？」</b> と 聞きます。<br>' +
      '🔥は 道を 作った日ではなく、<b>じっさいに やった日</b> だけ のびます。</p>' +
      '</div>' +
      '<button class="big" id="fin">おわり</button>';
    $('fin').onclick = function () { run = null; hidePromise = false; setView('home'); };
  }

  /* ============================================================
     きろく
     ============================================================ */
  function renderLog() {
    var d = store.data, s = d.streak;
    var out = [
      '<div class="stats">' +
      '<div class="stat"><b>' + d.counts.runs + '</b><span>つくった みち</span></div>' +
      '<div class="stat"><b>' + d.counts.dones + '</b><span>やった こと</span></div>' +
      '<div class="stat"><b>' + (store.streakAlive() ? s.days : 0) + '</b><span>つづいた日（さいこう ' + s.best + '）</span></div>' +
      '</div>'
    ];

    if (!d.runs.length) {
      out.push('<div class="panel" style="margin-top:14px"><p class="sub">まだ 何も ありません。<br>「あそぶ」から はじめてみてください。</p></div>');
    } else {
      out.push('<div class="h" style="margin:20px 0 10px">つくった みち</div>');
      d.runs.slice(0, 60).forEach(function (r) {
        var lines = r.roads.map(function (rd) {
          return '<div style="margin-top:8px"><span style="font-size:11.5px;font-weight:800;color:var(--' + rd.who + ')">' +
            esc(rd.name) + '</span><br><span style="font-size:13px;color:var(--muted);line-height:1.7">' +
            rd.steps.map(function (c) { return esc(c.t); }).join(' <span style="color:var(--dim)">←</span> ') +
            '</span></div>';
        }).join('');
        var todo = '';
        if (r.todo) {
          todo = '<div class="todo' + (r.done ? ' ok' : '') + '">' +
            (r.done ? '✅ やった（' + esc(r.doneAt) + '）：' : '🎯 きめた こと：') + esc(r.todo.t) + '</div>';
        }
        out.push(
          '<div class="logitem">' +
          '<div class="top"><span class="em">' + esc(r.emoji || '🎯') + '</span>' +
          '<span class="g">' + esc(r.goal) + '</span>' +
          '<span class="d">' + esc(r.at) + '</span></div>' +
          lines + todo +
          '</div>'
        );
      });
    }
    app.innerHTML = out.join('');
  }

  /* ============================================================
     せってい
     ============================================================ */
  function renderSettings() {
    app.innerHTML =
      '<div class="panel">' +
      '<div class="h">なまえ</div>' +
      '<div class="field"><label>こども</label><input id="n-kid" maxlength="8" value="' + esc(store.nameOf('kid')) + '"></div>' +
      '<div class="field"><label>おとな</label><input id="n-adult" maxlength="8" value="' + esc(store.nameOf('adult')) + '"></div>' +
      '<p class="sub">画面に 出る よび名です。この 端末の 中だけに 入ります。</p>' +
      '</div>' +

      '<div class="panel">' +
      '<div class="h">このアプリの こと</div>' +
      '<p class="sub">おだいは ' + IK.THEMES.length + 'こ 入っています。まだ やっていない ものから 日がわりで 出ます。<br><br>' +
      '正かいは ありません。どの カードを えらんでも みちに なります。<br>' +
      'カードには「ゴールに どれくらい 近いか」の 高さが かくれていて、えらび終わってから 見えます。</p>' +
      '</div>' +

      '<div class="panel">' +
      '<div class="h">きろくの もちだし</div>' +
      '<p class="sub">きろくは この端末の ブラウザの中だけに あります。どこにも 送っていません。<br>' +
      '別の 端末に うつすときは、下の 文を コピーして はりつけてください。</p>' +
      '<textarea class="io" id="io" spellcheck="false">' + esc(store.exportText()) + '</textarea>' +
      '<div class="row" style="margin-top:10px">' +
      '<button class="mini" id="copy">コピーする</button>' +
      '<button class="mini" id="load">はりつけた 文を よみこむ</button>' +
      '</div>' +
      '</div>' +

      '<div class="panel">' +
      '<div class="h">けす</div>' +
      '<button class="mini danger" id="reset" style="width:100%">きろくを ぜんぶ けす</button>' +
      '</div>';

    $('n-kid').onchange = function () { store.setName('kid', this.value); toast('なまえを かえました'); };
    $('n-adult').onchange = function () { store.setName('adult', this.value); toast('なまえを かえました'); };

    $('copy').onclick = function () {
      var ta = $('io');
      ta.select();
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(ta.value);
        else document.execCommand('copy');
        toast('コピーしました');
      } catch (e) { toast('えらべる 状態に しました'); }
    };
    $('load').onclick = function () {
      try {
        store.importText($('io').value);
        toast('よみこみました');
        renderHud(); render();
      } catch (e) { toast('よみこめませんでした'); }
    };
    $('reset').onclick = function () {
      if (!root.confirm('きろくを ぜんぶ けします。もどせません。いいですか？')) return;
      store.reset(); themeN = 0; hidePromise = false;
      renderHud(); setView('home');
      toast('けしました');
    };
  }

  /* ============================================================
     ふりわけ
     ============================================================ */
  function render() {
    if (view === 'play' && !run) view = 'home';
    if (view === 'handoff' && !run) view = 'home';
    if ((view === 'compare' || view === 'todo' || view === 'finish') && !run) view = 'home';

    if (view === 'home') renderHome();
    else if (view === 'handoff') renderHandoff();
    else if (view === 'play') renderPlay();
    else if (view === 'compare') renderCompare();
    else if (view === 'todo') renderTodo();
    else if (view === 'finish') renderFinish();
    else if (view === 'log') renderLog();
    else if (view === 'settings') renderSettings();
    renderHud();
  }

  /* ============================================================
     たちあげ
     ============================================================ */
  function boot() {
    app = $('app');
    store.load();

    Array.prototype.forEach.call(document.querySelectorAll('#tabbar button'), function (b) {
      b.onclick = function () {
        if (run && b.dataset.view !== view) {
          if (!root.confirm('とちゅうです。やめて いいですか？')) return;
          run = null;
        }
        setView(b.dataset.view);
      };
    });
    $('hud-quit').onclick = function () {
      if (!root.confirm('とちゅうです。やめて いいですか？')) return;
      quitRun();
    };

    setView('home');

    /* ここから 圏外用（1ファイル版では build.js が この かたまりを 外します） */
    if ('serviceWorker' in navigator) {
      root.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function () {});
      });
    }
    /* ここまで 圏外用 */
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window);
