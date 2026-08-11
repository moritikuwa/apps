/* ============================================================
   AI星座 / SEIZA   画面
   ============================================================ */
(function (root) {
  'use strict';

  var SZ = root.SZ;
  var store = SZ.store, calc = SZ.calc;
  var app, sheetHost, view;

  function h(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function cOf(id) {
    var c = SZ.CONSTELLATIONS.filter(function (x) { return x.id === id; })[0];
    return c || { name: '', color: '#888', label: '' };
  }
  var TIERNAME = ['', '初級', '中級', '上級'];

  function toast(msg) {
    var t = h('<div class="toast">' + esc(msg) + '</div>');
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('go'); }, 10);
    setTimeout(function () { t.remove(); }, 2200);
  }

  /* ============================================================
     手応え
     星を取った瞬間に、必ず何かが返る。
     数字が静かに変わるだけでは、達成感は出ない。
     ============================================================ */
  var pending = null, pendingTimer = null;

  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  /* 状態を変える窓口。ここを通せば必ず手応えが返る */
  function applyState(id, v) {
    var from = store.state(id);
    var beforeLv = calc.level().lv, beforeRank = calc.rank();
    var openBefore = {};
    SZ.SKILLS.forEach(function (s) { openBefore[s.id] = calc.isOpen(s); });

    store.setState(id, v);
    renderHud();
    if (v <= from) return;                       /* 下げたときは祝わない */

    /* この一手で新しく開いた星 */
    var unlocked = SZ.SKILLS.filter(function (s) {
      return !openBefore[s.id] && calc.isOpen(s) && store.state(s.id) < SZ.OPEN;
    });

    buzz(v >= SZ.OPEN ? [8, 34, 16] : 12);

    if (v >= SZ.OPEN) calc.markDailyDone(id);

    if (!pending) pending = { lv: beforeLv, rank: beforeRank, unlocked: {}, flash: {}, star: 0 };
    unlocked.forEach(function (s) { pending.unlocked[s.id] = s; pending.flash[s.id] = 1; });
    pending.flash[id] = 1;
    if (v === 4) { pending.star++; pending.lastStar = SZ.byId[id]; }

    /* まとめて入力しているときに何度も出さないよう、手が止まってから1回だけ出す */
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(showCheer, 850);
  }

  function showCheer() {
    var p = pending; pending = null;
    if (!p) return;

    if (view === 'map') { SZ.map.draw(); SZ.map.flash(Object.keys(p.flash)); }

    var lv = calc.level(), rank = calc.rank();
    var un = Object.keys(p.unlocked).map(function (k) { return p.unlocked[k]; });

    if (lv.lv > p.lv || rank !== p.rank) {
      cheerOverlay(p, lv, rank, un);
    } else if (un.length) {
      toast('⚡ ' + (un.length === 1 ? '「' + un[0].name + '」' : un.length + 'つの星') + 'が解放された');
    } else if (p.star === 1) {
      toast('🌟 「' + p.lastStar.name + '」を教えられる水準にした');
    } else if (p.star > 1) {
      toast('🌟 ' + p.star + 'つを教えられる水準にした');
    }
    checkBadges();
  }

  function cheerOverlay(p, lv, rank, un) {
    var rankUp = rank !== p.rank;
    var gained = lv.lv - p.lv;
    var nx = calc.nextRank();
    var box = h('<div class="cheer' + (rankUp ? ' rankup' : '') + '">' +
      '<div class="cheer-in">' +
        '<span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>' +
        '<div class="ck">' + (rankUp ? '称号が変わった' : 'LEVEL UP') + '</div>' +
        '<div class="cn">Lv.<b>' + lv.lv + '</b>' +
          (gained > 1 ? '<i>+' + gained + '</i>' : '') + '</div>' +
        (rankUp ? '<div class="cr">' + esc(rank) + '</div>' : '') +
        (un.length ? '<div class="cs">⚡ ' + un.length + 'つの星が解放された</div>' : '') +
        (nx ? '<div class="cnx">次の称号〈' + esc(nx.name) + '〉まで あと' + nx.need + '点</div>' : '') +
      '</div></div>');
    document.body.appendChild(box);
    requestAnimationFrame(function () { box.classList.add('go'); });
    var close = function () { box.classList.remove('go'); setTimeout(function () { box.remove(); }, 260); };
    box.onclick = close;
    setTimeout(close, rankUp ? 3200 : 2400);
    buzz(rankUp ? [10, 50, 10, 50, 10, 50, 30] : [10, 50, 20]);
  }

  /* ── 印（灯った瞬間に出す） ── */
  function checkBadges() {
    var fresh = calc.earnBadges();
    if (!fresh.length) return;
    setTimeout(function () { badgeOverlay(fresh); }, 700);
  }

  function badgeOverlay(list) {
    var one = list.length === 1;
    var body = one
      ? '<div class="bg-ico">' + list[0].icon + '</div>' +
        '<div class="cr">' + esc(list[0].name) + '</div>' +
        '<div class="cnx">' + esc(list[0].desc) + '</div>'
      : '<div class="bg-row">' + list.map(function (b) { return '<span>' + b.icon + '</span>'; }).join('') + '</div>' +
        '<div class="cr">' + list.length + 'つの印が灯った</div>' +
        '<div class="cnx">' + list.map(function (b) { return esc(b.name); }).join('　/　') + '</div>';

    var box = h('<div class="cheer badge">' +
      '<div class="cheer-in">' +
        '<span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>' +
        '<div class="ck">' + (one ? '印が灯った' : '印が灯った') + '</div>' +
        body +
      '</div></div>');
    document.body.appendChild(box);
    requestAnimationFrame(function () { box.classList.add('go'); });
    var close = function () { box.classList.remove('go'); setTimeout(function () { box.remove(); }, 260); };
    box.onclick = close;
    setTimeout(close, one ? 3000 : 3800);
    buzz([10, 50, 10, 50, 30]);
  }

  /* ── 上のバー（レベル・火） ── */
  function renderHud() {
    var lv = calc.level();
    document.getElementById('hud-lv').textContent = 'Lv.' + lv.lv;
    document.getElementById('hud-rank').textContent = calc.rank() + '　' + calc.gradeName();
    document.getElementById('hud-bar').style.width = (lv.into / lv.need * 100) + '%';
    document.getElementById('hud-pct').textContent = calc.percent() + '%';

    var fire = document.getElementById('hud-fire');
    var s = store.data.streak;
    var alive = store.streakAlive();
    fire.innerHTML = '🔥<b>' + (alive ? s.days : 0) + '</b>';
    fire.className = alive ? (store.streakToday() ? 'lit' : 'wait') : 'off';
    fire.title = alive
      ? (store.streakToday() ? s.days + '日つづいています' : '今日まだ実行を記録していません')
      : '実行を記録すると火がつきます';
  }

  /* ── 星図 ── */
  function viewMap() {
    app.className = 'main main-map';
    app.onclick = null;
    app.innerHTML =
      '<div class="maphost" id="maphost"></div>' +
      '<div class="mapctl">' +
        '<button data-z="in">＋</button>' +
        '<button data-z="out">−</button>' +
        '<button data-z="fit">全体</button>' +
      '</div>' +
      '<div class="legend">' +
        '<span><i class="lg ready"></i>今すぐ取れる</span>' +
        '<span><i class="lg locked"></i>まだ早い</span>' +
        '<span><i class="lg done"></i>取得ずみ</span>' +
      '</div>';

    SZ.map.mount(document.getElementById('maphost'), function (id) {
      if (id) openSheet(id); else closeSheet();
    });

    app.querySelector('.mapctl').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var host = document.getElementById('maphost');
      var cx = host.clientWidth / 2, cy = host.clientHeight / 2;
      if (b.dataset.z === 'in') SZ.map.zoomAt(cx, cy, 1.25);
      if (b.dataset.z === 'out') SZ.map.zoomAt(cx, cy, 1 / 1.25);
      if (b.dataset.z === 'fit') SZ.map.fit();
    });
  }

  /* ── 次の一手 ── */
  function viewNext() {
    app.className = 'main';
    var moves = calc.nextMoves(4);
    var almost = calc.almost(3);
    var weak = calc.weakest();

    var html = '';

    /* ── 🆕 後から増えた星。増えたことを損ではなく発見として見せる ── */
    var fresh = calc.newSkills();
    if (fresh.length) {
      html += '<div class="fresh"><div class="fresh-k">🆕 星が' + fresh.length + 'つ増えました</div>' +
        '<p class="note">空が広がったぶん、習得率の分母も増えています。数字が下がっても腕は落ちていません。</p>' +
        '<div class="fresh-l">' + fresh.map(function (s) {
          var c = cOf(s.const);
          return '<button class="chip" data-id="' + s.id + '" style="border-color:' + c.color + '55">' +
            (s.icon || '✦') + ' ' + esc(s.name) + '</button>';
        }).join('') + '</div>' +
        '<div class="btns"><button id="seenall">ぜんぶ見た</button></div></div>';
    }

    /* ── 今日の一手：毎日ひとつだけ。迷う時間をなくす ── */
    var d = calc.daily();
    if (d) {
      var dc = cOf(d.skill.const);
      html += '<div class="today' + (d.done ? ' done' : '') + '">' +
        '<div class="today-k">' + (d.done ? '✔ 今日の一手 — やり切った' : '今日の一手') + '</div>' +
        '<button class="today-b" data-id="' + d.skill.id + '">' +
          '<span class="today-ic" style="border-color:' + dc.color + '">' + (d.skill.icon || '✦') + '</span>' +
          '<span class="today-t"><b>' + esc(d.skill.name) + '</b>' +
            '<i>' + esc(dc.name) + '・' + TIERNAME[d.skill.tier] + '</i></span>' +
          '<span class="go">›</span>' +
        '</button>' +
        '<div class="today-d">' + esc(d.skill.do) + '</div>' +
        (d.done ? '' : '<div class="today-n">これを1回やって記録すると、🔥がつきます</div>') +
        '</div>';
    }

    html += '<p class="lead">今の森さんの星の並びから、<b>いま取りに行くと一番効く星</b>を出しています。' +
      '一番うすいのは <b style="color:' + weak.color + '">' + esc(weak.name) + '</b> です。</p>';

    if (!moves.length) {
      html += '<div class="card"><p>取りに行ける星がありません。星図でどれか一つ「知ってる」まで進めてみてください。</p></div>';
    }

    html += '<h2 class="sec">⚡ 今すぐ取れる</h2>';
    moves.forEach(function (s) {
      var c = cOf(s.const);
      html += '<button class="card move" data-id="' + s.id + '">' +
        '<span class="dot" style="background:' + c.color + '"></span>' +
        '<span class="mv">' +
          '<span class="mv-t">' + esc(s.name) + '</span>' +
          '<span class="mv-m">' + esc(c.name) + '・' + TIERNAME[s.tier] + '</span>' +
          '<span class="mv-w">' + esc(s.why) + '</span>' +
        '</span><span class="go">›</span></button>';
    });

    if (almost.length) {
      html += '<h2 class="sec">🔒 あと一つで開く</h2>';
      almost.forEach(function (s) {
        var miss = calc.missing(s)[0];
        var c = cOf(s.const);
        html += '<button class="card move dim" data-id="' + s.id + '">' +
          '<span class="dot" style="background:' + c.color + ';opacity:.4"></span>' +
          '<span class="mv">' +
            '<span class="mv-t">' + esc(s.name) + '</span>' +
            '<span class="mv-m">先に「' + esc(miss.name) + '」を ★ まで</span>' +
          '</span><span class="go">›</span></button>';
      });
    }

    app.innerHTML = html;

    var sa = document.getElementById('seenall');
    if (sa) sa.onclick = function () {
      store.markSeen(fresh.map(function (s) { return s.id; }));
      if (view === 'map') SZ.map.draw();
      viewNext();
    };

    app.onclick = function (e) {
      var b = e.target.closest('.move, .today-b, .fresh .chip'); if (!b) return;
      openSheet(b.dataset.id);
    };
  }

  /* ── ステータス ── */
  function radar(params) {
    var R = 78, cx = 100, cy = 96, n = params.length;
    function p(i, r) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n;
      return [(cx + Math.cos(a) * r).toFixed(1), (cy + Math.sin(a) * r).toFixed(1)];
    }
    var s = '<svg viewBox="0 0 200 200" class="radar">';
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      var pts = params.map(function (_, i) { return p(i, R * f).join(','); }).join(' ');
      s += '<polygon points="' + pts + '" fill="none" stroke="#8fa0bd" stroke-width=".7" opacity=".18"/>';
    });
    params.forEach(function (_, i) {
      var q = p(i, R);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + q[0] + '" y2="' + q[1] + '" stroke="#8fa0bd" stroke-width=".7" opacity=".18"/>';
    });
    var poly = params.map(function (x, i) { return p(i, Math.max(4, R * x.ratio)).join(','); }).join(' ');
    s += '<polygon points="' + poly + '" fill="#e0b341" fill-opacity=".22" stroke="#e0b341" stroke-width="1.6"/>';
    params.forEach(function (x, i) {
      var q = p(i, Math.max(4, R * x.ratio));
      s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3" fill="' + x.color + '"/>';
      var t = p(i, R + 20);
      s += '<text x="' + t[0] + '" y="' + t[1] + '" text-anchor="middle" dominant-baseline="middle" ' +
           'font-size="11" fill="' + x.color + '" opacity=".9">' + esc(x.name) + '</text>';
    });
    return s + '</svg>';
  }

  function viewStatus() {
    app.className = 'main';
    var params = calc.params();
    var lv = calc.level();

    var nx = calc.nextRank();
    var rem = calc.remaining();
    var lit = calc.litToday();
    var weak = calc.weakest();
    var wc = cOf(weak.id);
    var strong = params.slice().sort(function (a, b) { return b.ratio - a.ratio; })[0];

    /* ── いまのあなた ── */
    var html = '<div class="card me">' +
      '<div class="me-rank">' + esc(calc.rank()) + '</div>' +
      '<div class="me-nums">' +
        '<span><b>Lv.' + lv.lv + '</b></span>' +
        '<span><b>' + calc.percent() + '%</b>習得</span>' +
        '<span><b>🌟' + calc.taught() + '</b>教えられる</span>' +
      '</div>';
    if (nx) {
      /* いまの称号から次の称号までの、どこまで来たか */
      var p = calc.percent(), lo = 0, hi = 100;
      SZ.RANKS.forEach(function (r) { if (p >= r.min) lo = r.min; if (r.name === nx.name) hi = r.min; });
      var prog = hi > lo ? Math.round((p - lo) / (hi - lo) * 100) : 0;
      html += '<div class="me-next">次の称号 <b>〈' + esc(nx.name) + '〉</b> まで あと <b>' + nx.need + '点</b>' +
        '<span class="me-hint">（星' + Math.ceil(nx.need / 4) + 'つ分くらい）</span></div>' +
        '<div class="me-bar"><i style="width:' + prog + '%"></i></div>';
    } else {
      html += '<div class="me-next">すべての称号を取り切りました。</div>';
    }
    if (lit) html += '<div class="me-today">今日、<b>' + lit + '個</b>の星を灯した</div>';
    html += '</div>';

    /* ── 見立て ── */
    html += '<div class="card statcard">' + radar(params) +
      '<div class="statnums">' +
        '<div><b>' + esc(strong.name) + '</b><span>一番強い　' + Math.round(strong.ratio * 100) + '%</span></div>' +
        '<div><b style="color:' + weak.color + '">' + esc(weak.name) + '</b><span>一番うすい　' + Math.round(weak.ratio * 100) + '%</span></div>' +
        '<div><b>' + rem.all + '<i>個</i></b><span>★に届いていない</span></div>' +
      '</div></div>';

    /* ── 印 ── */
    var got = store.data.badges;
    var gotN = SZ.BADGES.filter(function (b) { return got[b.id]; }).length;
    html += '<div class="card"><h2 class="sec2">🏅 印　<small>' + gotN + ' / ' + SZ.BADGES.length + '</small></h2>' +
      '<p class="note">押すだけでは灯りません。<b>実際に手を動かした分だけ</b>灯ります。</p>' +
      '<div class="badges">' + SZ.BADGES.map(function (b) {
        var on = !!got[b.id];
        var secret = b.hidden && !on;
        return '<button class="bdg' + (on ? ' on' : '') + '" data-badge="' + b.id + '">' +
          '<span class="bi">' + (secret ? '？' : b.icon) + '</span>' +
          '<span class="bn">' + (secret ? '？？？' : esc(b.name)) + '</span>' +
          (on ? '<span class="bd2">' + esc(got[b.id]) + '</span>' : '') +
          '</button>';
      }).join('') + '</div>' +
      '<p class="note bhint" id="bhint">印を押すと、灯る条件が出ます。</p></div>';

    html += '<div class="card verdict"><h2 class="sec2">👁 見立て</h2>' +
      '<p>' + esc(wc.advice || '') + '</p>' +
      '<p class="note">★に届いていない星は ' + rem.all + '個（初級' + rem.t[0] + '・中級' + rem.t[1] + '・上級' + rem.t[2] + '）。' +
      'このうち今すぐ取れるのは ' + calc.nextMoves().length + '個です。</p>' +
      '<div class="btns"><button id="gonext">⚡ 次の一手を見る</button></div></div>';

    /* 溜まった「改善」は、そのまま CLAUDE.md や技に書き足す材料になる */
    var fixes = store.allFixes();
    if (fixes.length) {
      html += '<div class="card"><h2 class="sec2">♻️ 改善メモ　<small>' + fixes.length + '件</small></h2>' +
        '<p class="note">やってみて「次はこうする」と気づいたこと。<b>ここに溜まった分だけ、同じ失敗が消えます。</b>' +
        'CLAUDE.md か技に書き足してください。</p>' +
        '<div class="fixes">' + fixes.slice(0, 12).map(function (f) {
          var sk = SZ.byId[f.id];
          return '<div class="fx"><span class="fxd">' + esc(f.at) + '</span>' +
            '<button class="fxn" data-open="' + f.id + '">' + esc(sk ? sk.name : f.id) + '</button>' +
            '<p>' + esc(f.fix) + '</p></div>';
        }).join('') + '</div>' +
        '<div class="btns"><button id="copyfix">まとめてコピー</button></div></div>';
    }

    html += '<p class="lead">下の一覧で、いまの自分に当てはまるものを押してください。<br>' +
      '正直に押すほど「次の一手」が当たります。</p>';

    SZ.CONSTELLATIONS.forEach(function (c) {
      var list = SZ.SKILLS.filter(function (s) { return s.const === c.id; });
      var pm = params.filter(function (x) { return x.id === c.id; })[0];
      html += '<h2 class="sec" style="color:' + c.color + '">' + esc(c.name) +
        ' <small>' + esc(c.desc) + '　' + Math.round(pm.ratio * 100) + '%</small></h2>';
      list.forEach(function (s) {
        var v = store.state(s.id);
        var locked = !calc.isOpen(s);
        html += '<div class="row' + (locked ? ' locked' : '') + '">' +
          '<button class="rname" data-open="' + s.id + '">' + esc(s.name) +
            '<small>' + TIERNAME[s.tier] + (locked ? '・🔒' : '') + '</small></button>' +
          '<span class="picks">' +
            SZ.STATES.map(function (x) {
              return '<button class="pk' + (v === x.v ? ' on' : '') + '" data-set="' + s.id + '" data-v="' + x.v +
                     '" title="' + x.name + '">' + x.mark + '</button>';
            }).join('') +
          '</span></div>';
      });
    });

    app.innerHTML = html;

    var gn = document.getElementById('gonext');
    if (gn) gn.onclick = function () { go('next'); };

    var cf = document.getElementById('copyfix');
    if (cf) cf.onclick = function () {
      copyText(fixes.map(function (f) {
        var sk = SZ.byId[f.id];
        return '- 【' + (sk ? sk.name : f.id) + '】' + f.fix + '（' + f.at + '）';
      }).join('\n'));
    };

    app.onclick = function (e) {
      var bg = e.target.closest('[data-badge]');
      if (bg) {
        var bd = SZ.BADGES.filter(function (x) { return x.id === bg.dataset.badge; })[0];
        var on = !!store.data.badges[bd.id];
        document.getElementById('bhint').innerHTML = (on ? '✔ ' : '') +
          '<b>' + esc(bd.hidden && !on ? '？？？' : bd.name) + '</b>　' +
          esc(bd.hidden && !on ? 'まだ明かせません。進めば出てきます。' : bd.desc);
        return;
      }
      var o = e.target.closest('[data-open]');
      if (o) { openSheet(o.dataset.open); return; }
      var b = e.target.closest('[data-set]');
      if (!b) return;
      var y = app.scrollTop || window.scrollY;
      applyState(b.dataset.set, +b.dataset.v);
      viewStatus();
      window.scrollTo(0, y);
    };
  }

  /* ── 設定 ── */
  function viewSettings() {
    app.className = 'main';
    app.onclick = null;
    app.innerHTML =
      '<div class="card"><h2 class="sec2">このアプリのこと</h2>' +
      '<p class="note">Claude を使いこなす技を星座にして、<b>いま自分に何が抜けているか</b>を見えるようにするための地図です。' +
      '星は5段階で光ります。☆知らない → ✦知ってる → ✧やったことがある → ★一人でできる → 🌟人に教えられる。<br>' +
      '前提の星が★になると、その先の星が「⚡今すぐ取れる」に変わります。' +
      '順番を飛ばして上の技に手を出すと遠回りになるので、⚡から取っていくのが一番速い道です。</p></div>' +

      '<div class="card"><h2 class="sec2">記録の持ち出し</h2>' +
      '<p class="note">記録はこの端末のブラウザの中だけにあります。機種変えのときは、下の文字を全部コピーして新しい端末に貼ってください。</p>' +
      '<textarea id="dump" spellcheck="false"></textarea>' +
      '<div class="btns"><button id="copy">コピーする</button><button id="load">貼ったものを読み込む</button></div></div>' +

      '<div class="card"><h2 class="sec2">最初からやり直す</h2>' +
      '<p class="note">すべての星を☆に戻します。取り消せません。</p>' +
      '<div class="btns"><button id="reset" class="danger">全部消す</button></div></div>';

    var dump = document.getElementById('dump');
    dump.value = store.exportText();

    document.getElementById('copy').onclick = function () {
      dump.select();
      try { document.execCommand('copy'); toast('コピーしました'); }
      catch (e) { toast('うまくいかないときは手で選んでコピーしてください'); }
    };
    document.getElementById('load').onclick = function () {
      try { store.importText(dump.value); renderHud(); toast('読み込みました'); viewSettings(); }
      catch (e) { toast('読み込めませんでした：' + e.message); }
    };
    document.getElementById('reset').onclick = function () {
      if (!confirm('本当に全部消しますか？')) return;
      store.reset(); renderHud(); toast('最初に戻しました'); viewSettings();
    };
  }

  /* ── 星ひとつの中身（下から出るシート） ── */
  function openSheet(id) {
    var s = SZ.byId[id];
    if (!s) return;
    var wasNew = store.isNew(s);
    if (wasNew) store.markSeen(s.id);
    var c = cOf(s.const);
    var v = store.state(s.id);
    var status = calc.status(s);
    var grade = calc.grade();

    var badge = status === 'done' ? '<span class="bd done">★ 取得ずみ</span>'
      : status === 'locked' ? '<span class="bd lock">🔒 まだ早い</span>'
      : status === 'doing' ? '<span class="bd doing">🔥 取りかかり中</span>'
      : '<span class="bd ready">⚡ 今すぐ取れる</span>';

    var html = '<div class="sheet-bg"></div><div class="sheet">' +
      '<div class="sheet-grip"></div>' +
      '<div class="sheet-in">' +
      '<div class="sh-head">' +
        '<span class="sh-const" style="color:' + c.color + '">' + esc(c.name) + '・' + TIERNAME[s.tier] + '</span>' +
        (wasNew ? '<span class="bd fresh-bd">🆕 新しい星</span>' : '') +
        badge +
      '</div>' +
      '<h2 class="sh-title">' + esc(s.name) + '</h2>';

    if (status === 'locked') {
      var chain = calc.prereqChain(s);
      html += '<div class="blk warn"><b>⚠ 先にこれを取ってください</b><div class="chain">' +
        chain.map(function (p) {
          return '<button class="chip" data-jump="' + p.id + '">' + esc(p.name) + '</button>';
        }).join('<span class="arw">→</span>') +
        '</div><p class="note">順番を飛ばすと、たいてい遠回りになります。</p></div>';
    }

    var runs = store.runs(s.id);

    html += '<div class="blk"><b>❶ なぜ今これなのか</b><p>' + esc(s.why) + '</p></div>' +
      '<div class="blk core"><b>❷ 考え方の芯</b><p>' + esc(s.core) + '</p></div>';

    /* ❸ 実行 → 確認 → 改善。ここを回した回数がそのまま身についた量になる */
    html += '<div class="blk try"><b>❸ やってみる' +
      (runs.length ? '　<span class="cnt">' + runs.length + '回まわした</span>' : '') + '</b>' +
      '<p class="todo">' + esc(s.do) + '</p>' +
      '<div class="loop">' +
        '<label><span class="lb run">実行</span>何をやったか' +
          '<textarea data-f="did" rows="2" placeholder="例：見積の依頼文に完成形を先に書いて投げた"></textarea></label>' +
        '<label><span class="lb chk">確認</span>どうなったか' +
          '<textarea data-f="saw" rows="2" placeholder="例：往復が4回から1回に減った。ただし単価の根拠が抜けていた"></textarea></label>' +
        '<label><span class="lb fix">改善</span>次はこう変える' +
          '<textarea data-f="fix" rows="2" placeholder="例：完成形に「単価の根拠を必ず付ける」を足す"></textarea></label>' +
      '</div>' +
      '<button id="run-save" class="wide sub">この1回を記録する</button>';

    if (runs.length) {
      html += '<div class="runs">' + runs.map(function (r, i) {
        return '<div class="runrec"><div class="rh">' + esc(r.at) +
          '<button class="del" data-del="' + i + '" title="消す">×</button></div>' +
          (r.did ? '<p><span class="lb run">実行</span>' + esc(r.did) + '</p>' : '') +
          (r.saw ? '<p><span class="lb chk">確認</span>' + esc(r.saw) + '</p>' : '') +
          (r.fix ? '<p><span class="lb fix">改善</span>' + esc(r.fix) + '</p>' : '') +
          '</div>';
      }).join('') + '</div>';
    }
    html += '</div>';

    html += '<div class="blk say"><b>❹ 自分の言葉で言えたら光る</b><p>' + esc(s.say) + '</p>' +
      '<button id="grade-btn" class="wide">🌟 話して採点してもらう（文をコピー）</button></div>';

    if (s.terms && s.terms.length) {
      var open = grade <= 1 ? ' open' : '';
      html += '<details class="blk terms"' + open + '><summary>ことばの意味</summary>' +
        s.terms.map(function (t) { return '<p><b>' + esc(t.w) + '</b>　' + esc(t.d) + '</p>'; }).join('') +
        '</details>';
    }
    if (s.next) {
      var openN = grade >= 3 ? ' open' : '';
      html += '<details class="blk next"' + openN + '><summary>もう一段上なら</summary><p>' + esc(s.next) + '</p></details>';
    }

    html += '<div class="blk"><b>いまの自分は</b><div class="states">' +
      SZ.STATES.map(function (x) {
        return '<button class="stb' + (v === x.v ? ' on' : '') + '" data-v="' + x.v + '">' +
          '<span class="m">' + x.mark + '</span><span class="n">' + x.name + '</span></button>';
      }).join('') +
      '</div></div>';

    html += '</div></div>';

    sheetHost.innerHTML = html;
    sheetHost.classList.add('open');

    sheetHost.querySelector('.sheet-bg').onclick = closeSheet;
    sheetHost.querySelector('.sheet-grip').onclick = closeSheet;

    sheetHost.querySelectorAll('.stb').forEach(function (b) {
      b.onclick = function () {
        applyState(s.id, +b.dataset.v);
        if (view === 'map') SZ.map.draw();
        if (view === 'next') { closeSheet(); viewNext(); return; }
        if (view === 'status') { closeSheet(); viewStatus(); return; }
        openSheet(s.id);
      };
    });

    sheetHost.querySelectorAll('[data-jump]').forEach(function (b) {
      b.onclick = function () {
        openSheet(b.dataset.jump);
        if (view === 'map') SZ.map.focus(b.dataset.jump);
      };
    });

    document.getElementById('grade-btn').onclick = function () {
      copyGradePrompt(s);
    };

    document.getElementById('run-save').onclick = function () {
      var rec = {};
      sheetHost.querySelectorAll('.loop textarea').forEach(function (t) { rec[t.dataset.f] = t.value.trim(); });
      if (!rec.did && !rec.saw && !rec.fix) { toast('何か1つは書いてください'); return; }
      store.addRun(s.id, rec);
      /* 火が伸びるのはここだけ。実際に手を動かした日にしか灯らない */
      var st = store.touchStreak();
      var daily = calc.markDailyDone(s.id);
      /* 一度でも回したなら、少なくとも「やったことがある」まで進める */
      if (store.state(s.id) < 2) applyState(s.id, 2);
      renderHud();
      if (view === 'map') SZ.map.draw();
      openSheet(s.id);
      toast(daily ? '🎯 今日の一手、やり切りました　🔥' + st.days + '日'
                  : '記録しました　🔥' + st.days + '日つづいています');
      buzz([10, 40, 20]);
      checkBadges();
    };

    sheetHost.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        store.delRun(s.id, +b.dataset.del);
        openSheet(s.id);
      };
    });
  }

  function closeSheet() {
    sheetHost.classList.remove('open');
    sheetHost.innerHTML = '';
  }

  /* 文字をクリップボードへ */
  function copyText(text, msg) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    if (!ok && navigator.clipboard) { navigator.clipboard.writeText(text); ok = true; }
    ta.remove();
    toast(ok ? (msg || 'コピーしました') : 'コピーできませんでした');
    return ok;
  }

  /* 「話して採点してもらう」ための文を作ってコピーする */
  function copyGradePrompt(s) {
    var c = cOf(s.const);
    var runs = store.runs(s.id);
    var text =
      '「' + s.name + '」という技を、私が本当に分かっているか採点してください。\n' +
      '（' + c.name + '／' + TIERNAME[s.tier] + '）\n\n' +
      '■ この技の芯（私が使っているアプリの記述）\n' +
      s.core + '\n\n' +
      '■ 確かめたい問い\n' +
      s.say + '\n\n' +
      '■ 採点してほしいこと\n' +
      '1. 私の説明で合っている所\n' +
      '2. 抜けている所・間違っている所\n' +
      '3. 「人に教えられる」水準（🌟）に届いているか。届いていなければ、あと何が要るか\n' +
      '甘く採点しないでください。分かったつもりのまま先に進むのが一番の遠回りなので。\n\n';

    if (runs.length) {
      text += '■ 私が実際にやった記録（' + runs.length + '回）\n' +
        runs.map(function (r) {
          return '・' + r.at +
            (r.did ? '\n　実行：' + r.did : '') +
            (r.saw ? '\n　確認：' + r.saw : '') +
            (r.fix ? '\n　改善：' + r.fix : '');
        }).join('\n') +
        '\nこの記録も踏まえて、机上の理解で止まっていないかも見てください。\n\n';
    }

    text += '■ 私の説明\n（ここに自分の言葉で書いてから送ってください）\n';

    copyText(text, 'コピーしました。Claudeに貼って、続きに自分の説明を書いてください');
  }

  /* ── 切り替え ── */
  function go(v) {
    view = v;
    store.data.ui.view = v;
    store.save();
    closeSheet();
    document.querySelectorAll('#tabbar button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.view === v);
    });
    if (v === 'map') viewMap();
    else if (v === 'next') viewNext();
    else if (v === 'status') viewStatus();
    else viewSettings();
    renderHud();
  }

  /* ── 起動 ── */
  document.addEventListener('DOMContentLoaded', function () {
    app = document.getElementById('app');
    sheetHost = document.getElementById('sheet-host');
    store.load();

    document.getElementById('tabbar').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      go(b.dataset.view);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheetHost.classList.contains('open')) closeSheet();
    });

    go(store.data.ui.view || 'map');

    /* すでに条件を満たしている印を、開いたときに灯す */
    setTimeout(checkBadges, 600);

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  });

})(window);
