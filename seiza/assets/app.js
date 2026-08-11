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

  /* ── 上のバー（レベル） ── */
  function renderHud() {
    var lv = calc.level();
    var pct = calc.percent();
    document.getElementById('hud-lv').textContent = 'Lv.' + lv.lv;
    document.getElementById('hud-rank').textContent = calc.rank() + '　' + calc.gradeName();
    document.getElementById('hud-bar').style.width = (lv.into / lv.need * 100) + '%';
    document.getElementById('hud-pct').textContent = pct + '%';
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

    var html = '<p class="lead">今の森さんの星の並びから、<b>いま取りに行くと一番効く星</b>を出しています。' +
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
    app.onclick = function (e) {
      var b = e.target.closest('.move'); if (!b) return;
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

    var html = '<div class="card statcard">' + radar(params) +
      '<div class="statnums">' +
        '<div><b>Lv.' + lv.lv + '</b><span>' + esc(calc.rank()) + '</span></div>' +
        '<div><b>' + calc.percent() + '%</b><span>習得率</span></div>' +
        '<div><b>' + lv.got + '<i>/' + lv.max + '</i></b><span>星の点</span></div>' +
      '</div></div>';

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

    app.onclick = function (e) {
      var o = e.target.closest('[data-open]');
      if (o) { openSheet(o.dataset.open); return; }
      var b = e.target.closest('[data-set]');
      if (!b) return;
      var y = app.scrollTop || window.scrollY;
      store.setState(b.dataset.set, +b.dataset.v);
      renderHud();
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
    var c = cOf(s.const);
    var v = store.state(s.id);
    var status = calc.status(s);
    var grade = calc.grade();

    var badge = status === 'locked' ? '<span class="bd lock">🔒 まだ早い</span>'
      : status === 'done' ? '<span class="bd done">★ 取得ずみ</span>'
      : '<span class="bd ready">⚡ 今すぐ取れる</span>';

    var html = '<div class="sheet-bg"></div><div class="sheet">' +
      '<div class="sheet-grip"></div>' +
      '<div class="sheet-in">' +
      '<div class="sh-head">' +
        '<span class="sh-const" style="color:' + c.color + '">' + esc(c.name) + '・' + TIERNAME[s.tier] + '</span>' +
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

    html += '<div class="blk"><b>❶ なぜ今これなのか</b><p>' + esc(s.why) + '</p></div>' +
      '<div class="blk core"><b>❷ 考え方の芯</b><p>' + esc(s.core) + '</p></div>' +
      '<div class="blk"><b>❸ 小さく1回やる</b><p>' + esc(s.do) + '</p></div>' +
      '<div class="blk say"><b>❹ 自分の言葉で言えたら光る</b><p>' + esc(s.say) + '</p>' +
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
        store.setState(s.id, +b.dataset.v);
        renderHud();
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
  }

  function closeSheet() {
    sheetHost.classList.remove('open');
    sheetHost.innerHTML = '';
  }

  /* 「話して採点してもらう」ための文を作ってコピーする */
  function copyGradePrompt(s) {
    var c = cOf(s.const);
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
      '甘く採点しないでください。分かったつもりのまま先に進むのが一番の遠回りなので。\n\n' +
      '■ 私の説明\n' +
      '（ここに自分の言葉で書いてから送ってください）\n';

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
    toast(ok ? 'コピーしました。Claudeに貼って、続きに自分の説明を書いてください' : 'コピーできませんでした');
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

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  });

})(window);
