/* ============================================================
   酔いログ / YOI-LOG   画面
   ============================================================ */
(function (root) {
  'use strict';

  var AL = root.AL;
  var C = AL.calc, S = AL.stats, B = AL.body, G = AL.charts, Store = AL.store;
  var esc = G.esc;

  var app = document.getElementById('app');
  var sheetHost = document.getElementById('sheet-host');

  var state = {
    view: 'home',
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    editDate: null,
    editTab: 'drink',
    builder: null,
    showOrgans: true
  };

  /* ============================================================
     共通の部品
     ============================================================ */
  function bandBadge(g) {
    var b = C.band(g);
    return '<span class="badge" style="background:' + b.color + '22;color:' + b.color + '">' + b.label + '</span>';
  }

  function fmt(n, d) {
    if (n == null || isNaN(n)) return '—';
    var p = Math.pow(10, d || 0);
    return String(Math.round(n * p) / p);
  }

  function jpDate(ymd) {
    var d = C.parseYmd(ymd);
    var dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return (d.getMonth() + 1) + '月' + d.getDate() + '日(' + dow + ')';
  }

  function profile() { return Store.data.profile; }

  function riskLine() {
    return profile().sex === 'female' ? AL.GUIDE.riskFemale : AL.GUIDE.riskMale;
  }

  /* ============================================================
     ホーム
     ============================================================ */
  function viewHome() {
    var today = C.today();
    var day = Store.day(today);
    var t = C.dayTotals(day.drinks);
    var f = C.forecast(t.alcohol, profile(), profile().drinkStart || 20);
    var streak = S.currentStreak();
    var rest = S.lastRestDay();
    var p30 = S.period(30);
    var damage = B.recentDamage();

    var h = '';

    if (C.isLateNight()) {
      h += '<div class="verdict" style="margin-top:14px"><b>🌙 いまは深夜です</b>' +
        '日付が変わってからの一杯も「その晩の酒」として数え、これから迎える朝と突き合わせます。' +
        'いまの記録先は <b>' + jpDate(today) + ' の夜</b>です。</div>';
    }

    /* --- 今日の数字 --- */
    h += '<div class="card hero">';
    h += '<div class="dim">' + jpDate(today) + ' の純アルコール量</div>';
    h += '<div class="big" style="color:' + f.band.color + '">' + fmt(t.alcohol, 1) + '<small>g</small></div>';
    h += '<div style="margin-top:6px">' + bandBadge(t.alcohol) + '</div>';

    if (t.alcohol > 0) {
      h += '<div class="kpis">' +
        '<div class="kpi"><div class="v">' + fmt(f.hours, 1) + '<small style="font-size:11px">時間</small></div><div class="l">肝臓が働く時間</div></div>' +
        '<div class="kpi"><div class="v">' + f.soberLabel + '</div><div class="l">抜けきる目安</div></div>' +
        '<div class="kpi"><div class="v">' + fmt(t.kcal) + '<small style="font-size:11px">kcal</small></div><div class="l">お酒だけで</div></div>' +
        '</div>';
      h += '<p class="small muted" style="margin-top:10px">' +
        '中ジョッキ換算 <b>' + fmt(f.eq.beer, 1) + '杯</b>ぶん。' +
        '体から余分に出ていく水分は約 <b>' + f.water + 'ml</b>。</p>';
    } else {
      h += '<p class="small muted" style="margin-top:8px">まだ記録がありません。飲んだら下のボタンから足していってください。' +
           'このまま0gで一日を終えれば、それが休肝日です。</p>';
    }
    h += '<div class="btn-row" style="margin-top:12px">' +
      '<button class="btn primary" data-act="open-day" data-date="' + today + '" data-tab="drink">🍶 今夜の分を記録</button>' +
      '<button class="btn" data-act="open-day" data-date="' + today + '" data-tab="morning">🌅 今朝のからだ</button>' +
      '</div>';
    h += '</div>';

    /* --- 主人公 --- */
    var belly = B.bellyLevel();
    h += '<div class="card"><div class="avatar-wrap">';
    h += B.avatar({ belly: belly, damage: damage, showOrgans: false });
    h += '<div class="avatar-note">';
    h += '<b>' + esc(profile().name || 'あなた') + '</b>' +
         '<span class="dim"> ' + (profile().age || '') + '歳・' + (profile().weight || '') + 'kg</span>';
    h += '<div class="dim" style="margin-top:8px">お腹まわりの目安</div>';
    h += '<div class="belly-meter"><i style="width:' + Math.round(belly / 5 * 100) + '%"></i></div>';
    h += '<p class="small muted" style="margin-top:8px">' + bellyComment(belly) + '</p>';
    if (damage > 0) {
      h += '<p class="small dim">直近のダメージ平均 ' + fmt(damage) + ' / 100</p>';
    }
    h += '</div></div></div>';

    /* --- 連続日数 --- */
    h += '<div class="card flat">';
    h += '<div class="kpis">' +
      '<div class="kpi"><div class="v" style="color:' + (streak >= 7 ? 'var(--red)' : 'var(--text)') + '">' + streak + '</div><div class="l">連続で飲んだ日数</div></div>' +
      '<div class="kpi"><div class="v">' + (rest ? rest.ago + '日前' : '—') + '</div><div class="l">最後の休肝日</div></div>' +
      '<div class="kpi"><div class="v">' + p30.restDays + '</div><div class="l">30日間の休肝日</div></div>' +
      '</div>';
    if (p30.recorded >= 5) {
      h += '<p class="small muted" style="margin-top:10px">この30日の1日平均は <b style="color:' +
        C.band(p30.dailyAvg).color + '">' + fmt(p30.dailyAvg, 1) + 'g</b>。' +
        '（適量の目安 20g／リスクが高まる量 ' + riskLine() + 'g）</p>';
    }
    h += '</div>';

    /* --- 今夜これから体で起きること --- */
    if (t.alcohol > 0) {
      var tl = B.timeline(t.alcohol, profile(), profile().drinkStart || 20);
      h += '<div class="section-title">今夜、からだの中で起きること</div>';
      h += '<div class="card"><div class="tl">';
      tl.items.slice(0, 4).forEach(function (it) {
        h += tlItem(it);
      });
      h += '</div>';
      h += '<button class="btn block ghost sm" data-act="go" data-view="body">続きを全部みる →</button>';
      h += '</div>';
    }

    /* --- 気をつけたいサイン --- */
    var warns = S.warnings();
    if (warns.length) {
      h += '<div class="section-title">気をつけたいサイン</div>';
      warns.forEach(function (w) {
        h += '<div class="warn ' + (w.level === 'high' ? 'high' : '') + '"><b>' + esc(w.title) + '</b><p>' + esc(w.body) + '</p></div>';
      });
    }

    h += footer();
    app.innerHTML = h;
  }

  function bellyComment(b) {
    if (b < 1) return 'いまのところ、腹まわりに酒のカロリーは積み上がっていません。';
    if (b < 2) return '少しずつ内臓脂肪が乗り始める段階。まだ簡単に戻せます。';
    if (b < 3) return 'お腹が前に出てきています。内臓脂肪は皮下脂肪と違い、肝臓に直接つながる場所につきます。';
    if (b < 4) return '腹まわりの脂肪が肝臓を圧迫する段階。アルコール＋内臓脂肪は、脂肪肝の二重の原因になります。';
    return 'かなり出ています。ここまで来ると血圧・血糖・尿酸も一緒に上がっていることが多い。健診の数字を一度見てください。';
  }

  function tlItem(it) {
    return '<div class="tl-item lv' + it.level + '">' +
      '<div class="tl-t">' + esc(it.t) + ' <span class="tl-organ">' + (B.organEmoji[it.organ] || '') + ' ' + (B.organLabel[it.organ] || '') + '</span></div>' +
      '<div class="tl-h">' + esc(it.title) + '</div>' +
      '<div class="tl-b">' + esc(it.body) + '</div>' +
      '</div>';
  }

  /* ============================================================
     カレンダー
     ============================================================ */
  function viewCalendar() {
    var y = state.calYear, m = state.calMonth;
    var first = new Date(y, m, 1);
    var days = new Date(y, m + 1, 0).getDate();
    var lead = first.getDay();
    var today = C.today();

    var h = '';
    h += '<div class="card">';
    h += '<div class="cal-head">' +
      '<button class="btn sm ghost" data-act="cal" data-d="-1">‹ 前月</button>' +
      '<div class="cal-title">' + y + '年 ' + (m + 1) + '月</div>' +
      '<button class="btn sm ghost" data-act="cal" data-d="1">翌月 ›</button>' +
      '</div>';

    h += '<div class="cal-grid">';
    ['日', '月', '火', '水', '木', '金', '土'].forEach(function (d, i) {
      h += '<div class="cal-dow ' + (i === 0 ? 'sun' : i === 6 ? 'sat' : '') + '">' + d + '</div>';
    });
    for (var i = 0; i < lead; i++) h += '<div class="cal-cell empty"></div>';

    var monthTotal = 0, monthDrink = 0, monthRest = 0;
    for (var d = 1; d <= days; d++) {
      var ymd = y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + d).slice(-2);
      var s = S.daySummary(ymd);
      var cls = 'cal-cell' + (ymd === today ? ' today' : '');
      var mark = '';
      if (s.morning) {
        var ds = s.damageScore;
        mark = ds == null ? '·' : ds >= 45 ? '😖' : ds >= 20 ? '😕' : '🙂';
      }
      if (s.hasRecord) {
        monthTotal += s.alcohol;
        if (s.alcohol > 0) monthDrink++; else monthRest++;
      }
      h += '<div class="' + cls + '" data-act="open-day" data-date="' + ymd + '">' +
        '<div class="d">' + d + '</div>' +
        '<div class="mk">' + mark + '</div>' +
        '<div class="g" style="color:' + (s.alcohol > 0 ? s.band.color : 'var(--dim)') + '">' +
          (s.hasRecord ? (s.alcohol > 0 ? fmt(s.alcohol, 0) : '休') : '') + '</div>' +
        (s.alcohol > 0 ? '<div class="bar" style="background:' + s.band.color + '"></div>' : '') +
        '</div>';
    }
    h += '</div>';

    h += '<div class="cal-legend">';
    h += '<span><i style="background:#3ba676"></i>休（休肝日）</span>';
    var lo = 0;
    AL.BANDS.forEach(function (b) {
      if (b.key === 'zero') return;
      var span = b.max > 1000 ? (lo + 'g〜') : (lo + '〜' + b.max + 'g');
      lo = b.max;
      h += '<span><i style="background:' + b.color + '"></i>' + b.label + '（' + span + '）</span>';
    });
    h += '<span>🙂😕😖 翌朝のダメージ</span>';
    h += '</div>';
    h += '</div>';

    h += '<div class="card flat"><h2>' + (m + 1) + '月のまとめ</h2>';
    h += '<div class="kpis">' +
      '<div class="kpi"><div class="v">' + fmt(monthTotal, 0) + '<small style="font-size:11px">g</small></div><div class="l">純アルコール合計</div></div>' +
      '<div class="kpi"><div class="v">' + monthDrink + '</div><div class="l">飲んだ日</div></div>' +
      '<div class="kpi"><div class="v" style="color:var(--green)">' + monthRest + '</div><div class="l">休肝日</div></div>' +
      '</div>';
    if (monthTotal > 0) {
      var eq = C.equivalents(monthTotal);
      h += '<p class="small muted" style="margin-top:10px">この月に体を通ったアルコールは、' +
        '中ジョッキ <b>' + fmt(eq.beer, 0) + '杯</b>／日本酒 <b>' + fmt(eq.sake, 0) + '合</b>／' +
        '焼酎（25度）ボトル <b>' + fmt(eq.shochuBottle, 1) + '本</b>ぶんに相当します。</p>';
    }
    h += '</div>';

    h += '<p class="dim center small">日付をタップすると、その日のお酒と翌朝のからだを記録できます。</p>';
    h += footer();
    app.innerHTML = h;
  }

  /* ============================================================
     からだ
     ============================================================ */
  function viewBody() {
    var today = C.today();
    var day = Store.day(today);
    var t = C.dayTotals(day.drinks);
    var tl = B.timeline(t.alcohol, profile(), profile().drinkStart || 20);
    var damage = B.recentDamage();
    var belly = B.bellyLevel();

    // どの臓器が今いちばん負担を受けているか
    var organs = { liver: t.alcohol > 0, stomach: t.alcohol > 0, brain: t.alcohol >= 15, heart: t.alcohol >= 30, gut: t.alcohol >= 40 };

    var h = '';
    h += '<div class="card">';
    h += '<div class="avatar-wrap">';
    h += B.avatar({ belly: belly, damage: damage, showOrgans: true, organs: organs });
    h += '<div class="avatar-note">';
    h += '<b>今夜、負担がかかっている場所</b>';
    h += '<ul style="margin:8px 0 0;padding-left:18px;font-size:13px">';
    if (t.alcohol <= 0) {
      h += '<li class="muted">今日はまだアルコールが入っていません。臓器は通常運転です。</li>';
    } else {
      h += '<li>🫀 <b>肝臓</b> ' + fmt(tl.forecast.hours, 1) + '時間の残業</li>';
      h += '<li>🫃 <b>胃</b> 粘膜が直接アルコールに接触</li>';
      if (organs.brain) h += '<li>🧠 <b>脳</b> 前頭葉から順に麻痺／眠りが分断</li>';
      if (organs.heart) h += '<li>💓 <b>心臓</b> 心拍が上がったまま就寝</li>';
      if (organs.gut) h += '<li>🌀 <b>腸</b> 水分吸収が乱れる</li>';
    }
    h += '</ul></div></div>';
    h += '<p class="small dim" style="margin-top:10px">色が濃い臓器ほど、今夜の量で負担が大きい場所です。</p>';
    h += '</div>';

    h += '<div class="section-title">今夜のからだの中・時間割</div>';
    h += '<div class="card"><div class="tl">';
    tl.items.forEach(function (it) { h += tlItem(it); });
    h += '</div></div>';

    /* 累積 */
    var p30 = S.period(30), p365 = S.period(365);
    if (p30.recorded > 0) {
      var eq30 = C.equivalents(p30.totalAlcohol);
      var ke = C.kcalEquivalents(p30.kcal);
      h += '<div class="section-title">この30日で、体を通った量</div>';
      h += '<div class="card">';
      h += '<div class="big" style="font-size:34px;color:var(--amber)">' + fmt(p30.totalAlcohol, 0) + '<small>g</small></div>';
      h += '<p class="small muted">中ジョッキ <b>' + fmt(eq30.beer, 0) + '杯</b>／' +
           '焼酎（25度）900mlボトル <b>' + fmt(eq30.shochuBottle, 1) + '本</b>／' +
           'ストロング缶500ml <b>' + fmt(eq30.strong, 0) + '本</b>ぶん。</p>';
      h += '<hr class="sep">';
      h += '<p class="small">お酒から取ったカロリーは <b>' + fmt(p30.kcal) + ' kcal</b>。' +
           'ご飯茶碗 <b>' + fmt(ke.rice, 0) + '杯</b>ぶんで、歩いて消費するには <b>' + fmt(ke.walkMin / 60, 1) + '時間</b>かかります。' +
           'すべて脂肪に回ったと仮定すると <b>約' + fmt(ke.bodyFatG / 1000, 2) + 'kg</b>ぶんです。</p>';
      if (p30.spend > 0) {
        h += '<p class="small muted">この30日のお酒代は <b>' + p30.spend.toLocaleString() + '円</b>。1年続けると約 ' +
             Math.round(p30.spend * 12.17).toLocaleString() + '円。</p>';
      }
      if (p365.recorded >= 60) {
        h += '<hr class="sep"><p class="small muted">記録のある' + p365.recorded + '日間の合計は <b>' + fmt(p365.totalAlcohol, 0) + 'g</b>。' +
             '中ジョッキ <b>' + fmt(C.equivalents(p365.totalAlcohol).beer, 0) + '杯</b>ぶんが、この体を通っていきました。</p>';
      }
      h += '</div>';
    }

    /* 知っておくこと */
    h += '<div class="section-title">数字の意味</div>';
    h += '<div class="card flat small">';
    h += '<p><b>純アルコール量</b>＝ 量(ml) × 度数(%) ÷ 100 × 0.8。' +
         '「何杯飲んだか」ではなく、この g で数えるのが世界共通のものさしです。</p>';
    h += '<p><b>20g</b>＝ 節度ある適度な飲酒の目安（1日平均）。中ジョッキ1杯、日本酒1合弱、ハイボール1.4杯にあたります。</p>';
    h += '<p><b>' + riskLine() + 'g</b>＝ 厚生労働省「健康に配慮した飲酒に関するガイドライン」（2024年2月）で、' +
         '生活習慣病のリスクを高めるとされる1日あたりの量（' + (profile().sex === 'female' ? '女性' : '男性') + '）。</p>';
    h += '<p><b>60g</b>＝ 毎日続けると、数週間で脂肪肝が進みやすいとされる目安。</p>';
    h += '<p class="dim">なお、大腸がんについては1日20g程度から発症リスクの上昇が指摘されており、' +
         '「ここまでなら完全に安全」という量は、健康リスクの観点では存在しないというのが現在の国際的な見方です。</p>';
    h += '</div>';

    h += footer();
    app.innerHTML = h;
  }

  /* ============================================================
     ふりかえり（分析）
     ============================================================ */
  function viewStats() {
    var h = '';
    var cmp = S.drinkVsSober(120);
    var p30 = S.period(30);

    /* --- 核心：飲んだ翌朝 vs 飲まなかった翌朝 --- */
    h += '<div class="section-title">「酒がないと眠れない」を、あなたのデータで確かめる</div>';
    h += '<div class="card">';
    if (cmp.drank.n < 3 || cmp.sober.n < 3) {
      h += '<p class="muted">飲んだ翌朝が <b>' + cmp.drank.n + '日</b>、飲まなかった翌朝が <b>' + cmp.sober.n + '日</b>ぶん記録されています。</p>';
      h += '<p class="small dim">両方が3日ぶんたまると、ここに「飲んだ夜」と「飲まなかった夜」の眠りの比較が出ます。' +
           '休肝日の翌朝を数日記録するだけで、答えは自分のデータで出せます。</p>';
    } else {
      var better = (cmp.sober.sleepScore || 0) - (cmp.drank.sleepScore || 0);
      h += G.compareBars([
        { label: '飲んだ翌朝', value: cmp.drank.sleepScore, color: '#d94a4a' },
        { label: '飲まない翌朝', value: cmp.sober.sleepScore, color: '#3ba676' }
      ], 100, '点');
      h += '<p class="small dim">睡眠スコア（睡眠時間・寝つき・中途覚醒・夜間のトイレ・起きたときのスッキリ感から算出／100点満点）</p>';

      h += '<div class="verdict ' + (better > 3 ? 'good' : better < -3 ? 'bad' : '') + '">';
      if (better > 3) {
        h += '<b>飲まなかった翌朝のほうが、' + fmt(better, 1) + '点よく眠れています。</b>' +
             '「飲まないと眠れない」は、少なくともあなたの記録の上では成り立っていません。' +
             '寝つきが早くなった感覚は本物ですが、眠りの後半で取り返されています。';
      } else if (better < -3) {
        h += '<b>いまの記録では、飲んだ翌朝のほうが ' + fmt(-better, 1) + '点高く出ています。</b>' +
             'ただし休肝日の記録がまだ ' + cmp.sober.n + '日と少ないこと、' +
             '飲まない日は「眠れなくて不安な日」に偏りやすいことに注意してください。休肝日を続けて記録すると、数字は変わっていきます。';
      } else {
        h += '<b>飲んでも飲まなくても、眠りの質はほとんど変わっていません。</b>' +
             '差がないのなら、眠るために飲む理由もありません。';
      }
      h += '</div>';

      h += '<h3>内訳</h3>';
      h += statRow('寝つくまでの時間', cmp.drank.latency, cmp.sober.latency, '分', true);
      h += statRow('夜中に目が覚めた回数', cmp.drank.awake, cmp.sober.awake, '回', true);
      h += statRow('夜間のトイレ', cmp.drank.toilet, cmp.sober.toilet, '回', true);
      h += statRow('起きたときのスッキリ感', cmp.drank.refresh, cmp.sober.refresh, '／5', false);
      h += statRow('睡眠時間', cmp.drank.hours, cmp.sober.hours, '時間', null);
      h += '<p class="small dim" style="margin-top:10px">' +
           '寝つきだけが速くなり、中途覚醒とトイレが増え、朝のスッキリ感が落ちる ―― ' +
           'これがアルコールで眠ったときの典型的な形です。あなたの数字はどうでしょうか。</p>';
    }
    h += '</div>';

    /* --- 寝酒の検証 --- */
    var nc = S.nightcapCheck(120);
    if (nc) {
      h += '<div class="section-title">「寝るために飲んだ夜」だけを取り出すと</div>';
      h += '<div class="card">';
      h += '<p class="small muted">寝酒として記録した夜：<b>' + nc.n + '日</b></p>';
      h += G.compareBars([
        { label: '寝酒あり', value: nc.scoreYes, color: '#e07a3c' },
        { label: 'それ以外', value: nc.scoreNo, color: '#6fb3e0' }
      ], 100, '点');
      var latDiff = (nc.latencyNo || 0) - (nc.latencyYes || 0);
      var awDiff = (nc.awakeYes || 0) - (nc.awakeNo || 0);
      h += '<p class="small">寝つきは <b>' + (latDiff > 0 ? fmt(latDiff, 0) + '分ぶん速く' : fmt(-latDiff, 0) + '分ぶん遅く') + '</b>、' +
           '夜中に目が覚めた回数は <b>' + (awDiff > 0 ? fmt(awDiff, 1) + '回ぶん多く' : fmt(-awDiff, 1) + '回ぶん少なく') + '</b>なっています。</p>';
      if (latDiff > 0 && awDiff > 0) {
        h += '<div class="verdict bad"><b>寝酒の効果は「前半だけ」です。</b>' +
             '寝つきは確かに速い。けれど夜中に起きる回数は増えている。' +
             'これはアルコールが分解され切ったあと、抑えられていたREM睡眠が後半に押し寄せるためです。' +
             '眠りを買ったのではなく、前半に借りて後半に返しているだけです。</div>';
      }
      h += '</div>';
    }

    /* --- 相関 --- */
    var corr = S.alcoholSleepCorrelation(180);
    if (corr.points.length >= 5) {
      h += '<div class="section-title">飲んだ量 と 翌朝の眠りの質</div>';
      h += '<div class="card"><div class="chart-scroll">' +
           G.scatter(corr.points, corr.reg, { yLabel: '睡眠スコア', dotColor: '#6fb3e0' }) + '</div>';
      if (corr.reg) {
        var slope20 = corr.reg.b * 20;
        h += '<p class="small">この線は、あなたの ' + corr.reg.n + '日ぶんの記録から引いたものです。' +
             '純アルコールが20g（中ジョッキ1杯）増えるごとに、睡眠スコアは平均 <b>' +
             (slope20 < 0 ? fmt(-slope20, 1) + '点さがる' : fmt(slope20, 1) + '点あがる') + '</b>傾向。' +
             '（相関係数 r = ' + fmt(corr.reg.r, 2) + '）</p>';
      }
      h += '</div>';
    }

    var dcorr = S.alcoholDamageCorrelation(180);
    if (dcorr.points.length >= 5) {
      h += '<div class="section-title">飲んだ量 と 翌朝のダメージ</div>';
      h += '<div class="card"><div class="chart-scroll">' +
           G.scatter(dcorr.points, dcorr.reg, { yLabel: 'ダメージ', dotColor: '#e07a3c', lineColor: '#d94a4a' }) + '</div>';
      if (dcorr.reg) {
        var x = dcorr.reg.b > 0 ? (40 - dcorr.reg.a) / dcorr.reg.b : null;
        if (x != null && x > 0 && x < 200) {
          h += '<p class="small">この傾きでいくと、純アルコール <b>約' + fmt(x, 0) + 'g</b>を超えたあたりから、' +
               '翌朝のダメージがはっきり出はじめる計算になります。あなたの「これ以上はきつい」ラインです。</p>';
        }
      }
      h += '</div>';
    }

    /* --- 日別グラフ --- */
    var dates = S.range(30);
    var bars = dates.map(function (d) {
      var s = S.daySummary(d);
      return { date: d, alcohol: s.alcohol, color: s.band.color };
    });
    h += '<div class="section-title">この30日</div>';
    h += '<div class="card"><div class="chart-scroll">' + G.dailyBars(bars, { riskLine: riskLine() }) + '</div>';
    h += '<div class="kpis">' +
      '<div class="kpi"><div class="v">' + fmt(p30.dailyAvg, 1) + '<small style="font-size:11px">g</small></div><div class="l">1日平均</div></div>' +
      '<div class="kpi"><div class="v" style="color:var(--green)">' + p30.restDays + '</div><div class="l">休肝日</div></div>' +
      '<div class="kpi"><div class="v" style="color:var(--red)">' + p30.overRisk + '</div><div class="l">' + riskLine() + 'g超えの日</div></div>' +
      '</div>';
    if (p30.maxDate) {
      h += '<p class="small dim" style="margin-top:8px">いちばん飲んだのは ' + jpDate(p30.maxDate) + ' の ' + fmt(p30.maxDay, 1) + 'g。</p>';
    }
    h += '</div>';

    /* --- 月別トレンド --- */
    var trend = S.monthlyTrend(6);
    if (trend.filter(function (m) { return m.avg != null; }).length >= 2) {
      h += '<div class="section-title">月ごとの1日平均（量は増えていないか）</div>';
      h += '<div class="card"><div class="chart-scroll">' + G.trendLine(trend) + '</div>';
      h += '<p class="small dim">同じ酔いを得るのに必要な量が増えていくのが「耐性」です。' +
           '線が右上がりなら、体が慣れてきているサインかもしれません。</p></div>';
    }

    /* --- 飲んだ理由 --- */
    var reasons = {};
    S.range(90).forEach(function (d) {
      (Store.day(d).reasons || []).forEach(function (r) { reasons[r] = (reasons[r] || 0) + 1; });
    });
    var rkeys = Object.keys(reasons).sort(function (a, b) { return reasons[b] - reasons[a]; });
    if (rkeys.length) {
      h += '<div class="section-title">この90日、なぜ飲んだか</div>';
      h += '<div class="card">';
      var maxR = reasons[rkeys[0]];
      h += G.compareBars(rkeys.map(function (k) {
        var r = AL.REASONS.filter(function (x) { return x.id === k; })[0];
        return { label: (r ? r.emoji + ' ' + r.name : k), value: reasons[k], color: k === 'sleep' ? '#e07a3c' : k === 'stress' ? '#d94a4a' : '#6fb3e0' };
      }), maxR, '日');
      if (reasons.sleep >= 3 || reasons.stress >= 3) {
        h += '<p class="small muted" style="margin-top:8px">' +
             '「寝るため」「ストレス」で飲む回数が多いときは、お酒が楽しみではなく<b>対処法</b>になっています。' +
             'ここが増えていくと、量は自然に増えていきます。</p>';
      }
      h += '</div>';
    }

    h += footer();
    app.innerHTML = h;
  }

  function statRow(label, drank, sober, unit, lowerBetter) {
    if (drank == null && sober == null) return '';
    var diff = (drank != null && sober != null) ? drank - sober : null;
    var judge = '', color = 'var(--dim)';
    if (diff != null && Math.abs(diff) > 0.05 && lowerBetter !== null) {
      var worse = lowerBetter ? diff > 0 : diff < 0;
      color = worse ? 'var(--red)' : 'var(--green)';
      judge = worse ? '飲んだ翌朝のほうが悪い' : '飲んだ翌朝のほうが良い';
    }
    return '<div class="stat-row">' +
      '<div class="sr-label">' + esc(label) + '</div>' +
      '<div class="sr-vals">' +
        '<span><i>飲んだ翌朝</i> <b>' + fmt(drank, 1) + unit + '</b></span>' +
        '<span><i>飲まない翌朝</i> <b>' + fmt(sober, 1) + unit + '</b></span>' +
      '</div>' +
      (judge ? '<div class="sr-judge" style="color:' + color + '">' + judge + '</div>' : '') +
      '</div>';
  }

  /* ============================================================
     設定
     ============================================================ */
  function viewSettings() {
    var p = profile();
    var h = '';

    h += '<div class="card"><h2>あなたのこと</h2>';
    h += '<p class="small dim">体重と性別は、分解にかかる時間と血中濃度の計算に使います。</p>';
    h += '<label class="field"><span>呼び名</span><input id="p-name" value="' + esc(p.name || '') + '" placeholder="（任意）"></label>';
    h += '<div class="grid2">' +
      '<label class="field"><span>年齢</span><input id="p-age" type="number" inputmode="numeric" value="' + (p.age || '') + '"></label>' +
      '<label class="field"><span>性別</span><select id="p-sex">' +
        '<option value="male"' + (p.sex === 'male' ? ' selected' : '') + '>男性</option>' +
        '<option value="female"' + (p.sex === 'female' ? ' selected' : '') + '>女性</option>' +
      '</select></label>' +
      '</div>';
    h += '<div class="grid3">' +
      '<label class="field"><span>体重(kg)</span><input id="p-weight" type="number" inputmode="decimal" value="' + (p.weight || '') + '"></label>' +
      '<label class="field"><span>身長(cm)</span><input id="p-height" type="number" inputmode="numeric" value="' + (p.height || '') + '"></label>' +
      '<label class="field"><span>腹囲(cm)</span><input id="p-waist" type="number" inputmode="numeric" value="' + (p.waist || '') + '"></label>' +
      '</div>';
    h += '<label class="field"><span>いつも飲み始める時刻</span><select id="p-start">';
    for (var hh = 15; hh <= 26; hh++) {
      var v = hh % 24;
      h += '<option value="' + v + '"' + ((p.drinkStart || 20) === v ? ' selected' : '') + '>' + ('0' + v).slice(-2) + ':00</option>';
    }
    h += '</select></label>';
    h += '<div class="btn-row" style="margin-top:14px"><button class="btn primary" data-act="save-profile">保存する</button></div>';
    h += '</div>';

    h += '<div class="card"><h2>データ</h2>';
    h += '<p class="small dim">記録はこの端末の中だけに保存されます。どこにも送信されません。' +
         'ブラウザのデータを消すと記録も消えるので、ときどき書き出して保管してください。</p>';
    h += '<div class="btn-row">' +
      '<button class="btn" data-act="export">書き出す（JSON）</button>' +
      '<button class="btn" data-act="import">読み込む</button>' +
      '<button class="btn" data-act="sample">お試しデータを入れる</button>' +
      '</div>';
    h += '<div class="btn-row" style="margin-top:10px"><button class="btn danger" data-act="clear">すべて消す</button></div>';
    h += '<input type="file" id="import-file" accept="application/json,.json" style="display:none">';
    h += '</div>';

    /* 緊急時 */
    h += '<div class="section-title">もしものとき</div>';
    h += '<div class="card sos"><h2>🚑 急性アルコール中毒のサイン</h2>';
    h += '<ul>';
    AL.HELP.emergency.forEach(function (x) { h += '<li>' + esc(x) + '</li>'; });
    h += '</ul>';
    h += '<p class="small"><b>ひとつでも当てはまったら、迷わず119番。</b></p>';
    h += '<ul>';
    AL.HELP.emergencyAction.forEach(function (x) { h += '<li>' + esc(x) + '</li>'; });
    h += '</ul>';
    h += '</div>';

    h += '<div class="card"><h2>相談できるところ</h2>';
    h += '<p class="small muted">アルコールの問題は、意志の強さの問題ではなく、体と脳に起きる変化です。' +
         '「量を減らしたいのに減らせない」と感じたら、早いほど戻りやすいことがわかっています。</p>';
    AL.HELP.consult.forEach(function (c) {
      h += '<p class="small" style="margin:10px 0"><b>' + esc(c.name) + '</b><br><span class="dim">' + esc(c.note) + '</span></p>';
    });
    h += '</div>';

    h += '<div class="card flat"><h2>このアプリについて</h2>';
    h += '<p class="small muted">' + esc(AL.DISCLAIMER) + '</p>';
    h += '<p class="small dim">計算の根拠：純アルコール量＝量(ml)×度数(%)÷100×0.8。' +
         '分解速度＝体重(kg)×0.1 g/時。血中濃度はWidmark式（体内分布係数 男性0.68／女性0.55、下降 0.15‰/時）。' +
         '基準値は厚生労働省「健康に配慮した飲酒に関するガイドライン」（2024年2月）ほか。いずれも目安であり、個人差があります。</p>';
    h += '</div>';

    h += footer();
    app.innerHTML = h;
  }

  function footer() {
    return '<div class="foot">記録は端末内（localStorage）にのみ保存されます。' +
      'このアプリは医療機器ではなく、表示される数値はすべて一般的な計算式による目安です。<br>' +
      '体調に不安があるとき、量を減らせないと感じたときは、医療機関や精神保健福祉センターにご相談ください。</div>';
  }

  /* ============================================================
     日別シート
     ============================================================ */
  function openDay(ymd, tab) {
    state.editDate = ymd;
    state.editTab = tab || 'drink';
    state.builder = defaultBuilder();
    renderSheet();
  }

  function defaultBuilder() {
    return { typeId: 'beer', serveIdx: 0, abv: null, wariId: 'soda', ratio: 3, count: 1, cocktailId: 'highball', customMl: null };
  }

  function closeSheet() {
    captureSheetInputs();
    pruneDay(state.editDate);
    state.editDate = null;
    sheetHost.innerHTML = '';
    render();
  }

  /* 開いただけ・見ただけでできた空っぽの記録は残さない */
  function pruneDay(ymd) {
    var d = Store.data.days[ymd];
    if (!d) return;
    if (S.isEmptyMorning(d.morning)) d.morning = null;
    if (!S.hasContent(d)) delete Store.data.days[ymd];
    Store.save();
  }

  /* テキスト入力の内容を、再描画の前に取り込む */
  function captureSheetInputs() {
    if (!state.editDate) return;
    var d = Store.day(state.editDate, true);
    var spend = document.getElementById('d-spend');
    var memo = document.getElementById('d-memo');
    if (spend) d.spend = Number(spend.value) || 0;
    if (memo) d.memo = memo.value;

    var wn = document.getElementById('m-worrynote');
    var mm = document.getElementById('m-memo');
    var bed = document.getElementById('m-bed');
    var wake = document.getElementById('m-wake');
    if (wn || mm || bed || wake) {
      var m = d.morning || emptyMorning();
      if (bed) m.sleep.bed = bed.value;
      if (wake) m.sleep.wake = wake.value;
      if (wn) m.sleep.worryNote = wn.value;
      if (mm) m.memo = mm.value;
      // 何も入力されていないなら、朝の記録そのものを作らない
      // （タブを開いただけの日が「休肝日」として数えられてしまうため）
      d.morning = S.isEmptyMorning(m) ? null : m;
    }
    Store.save();
  }

  function emptyMorning() {
    return { sleep: { bed: '', wake: '', latency: null, awake: null, refresh: null, toilet: null, worry: 0, worryNote: '', nightcap: false }, damage: {}, memo: '' };
  }

  function renderSheet() {
    var ymd = state.editDate;
    if (!ymd) { sheetHost.innerHTML = ''; return; }
    var d = Store.day(ymd, true);
    var t = C.dayTotals(d.drinks);

    var h = '<div class="sheet-bg" data-act="sheet-bg"><div class="sheet" data-stop="1">';
    h += '<div class="sheet-head"><h2>' + jpDate(ymd) + '</h2>' +
         '<button class="x" data-act="close-sheet">×</button></div>';

    h += '<div class="tabs">' +
      '<button data-act="tab" data-tab="drink" class="' + (state.editTab === 'drink' ? 'on' : '') + '">🍶 この夜のお酒</button>' +
      '<button data-act="tab" data-tab="morning" class="' + (state.editTab === 'morning' ? 'on' : '') + '">🌅 この朝のからだ</button>' +
      '</div>';

    if (state.editTab === 'drink') {
      h += sheetDrinks(ymd, d, t);
    } else {
      h += sheetMorning(ymd, d);
    }

    h += '</div></div>';
    sheetHost.innerHTML = h;
  }

  function sheetDrinks(ymd, d, t) {
    var h = '';
    var f = C.forecast(t.alcohol, profile(), profile().drinkStart || 20);

    h += '<div class="card hero" style="margin:10px 0">' +
      '<div class="dim">この日の純アルコール量</div>' +
      '<div class="big" style="font-size:38px;color:' + f.band.color + '">' + fmt(t.alcohol, 1) + '<small>g</small></div>' +
      '<div>' + bandBadge(t.alcohol) + '</div>';
    if (t.alcohol > 0) {
      h += '<p class="small muted" style="margin-top:8px">' +
        '肝臓の残業 <b>' + fmt(f.hours, 1) + '時間</b>（' + f.soberLabel + 'ごろまで）／' +
        '最高血中濃度 <b>' + fmt(f.peakBac, 2) + '‰</b>（' + f.stage.name + '）／' +
        '<b>' + fmt(t.kcal) + 'kcal</b></p>';
    }
    h += '</div>';

    /* 記録済みリスト */
    if (d.drinks.length) {
      d.drinks.forEach(function (e, i) {
        var dr = C.drink(e.typeId);
        var w = C.wari(e.wariId);
        var sub = [];
        sub.push(e.baseMl + 'ml');
        sub.push(e.abv + '%');
        if (w && w.id !== 'none' && w.id !== 'straight') sub.push(w.name);
        if (e.count > 1) sub.push('×' + e.count);
        h += '<div class="drink-item">' +
          '<div class="em">' + (dr ? dr.emoji : '🥃') + '</div>' +
          '<div class="tx"><b>' + esc(e.label || (dr ? dr.name : '')) + '</b>' +
            '<div class="s">' + esc(sub.join(' ／ ')) + '</div></div>' +
          '<div class="g">' + fmt(C.pureAlcohol(e), 1) + 'g</div>' +
          '<button class="x" data-act="del-drink" data-i="' + i + '" aria-label="削除">×</button>' +
          '</div>';
      });
    } else {
      h += '<p class="dim small center" style="padding:8px 0">まだ1杯も記録がありません。</p>';
    }

    /* 追加フォーム */
    h += '<hr class="sep"><h3 style="margin-top:0">1杯たす</h3>';
    h += drinkBuilder();

    /* 理由・金額・メモ */
    h += '<hr class="sep"><h3 style="margin-top:0">なぜ飲んだか（いくつでも）</h3>';
    h += '<div class="chips">';
    AL.REASONS.forEach(function (r) {
      var on = (d.reasons || []).indexOf(r.id) >= 0;
      h += '<button class="chip ' + (on ? 'on' : '') + '" data-act="reason" data-id="' + r.id + '">' + r.emoji + ' ' + r.name + '</button>';
    });
    h += '</div>';

    h += '<label class="field"><span>この日のお酒代（円・任意）</span>' +
      '<input id="d-spend" type="number" inputmode="numeric" value="' + (d.spend || '') + '" placeholder="0"></label>';
    h += '<label class="field"><span>メモ（任意）</span>' +
      '<textarea id="d-memo" placeholder="誰と・どこで・どんな気分だったか">' + esc(d.memo || '') + '</textarea></label>';

    h += '<div class="btn-row" style="margin-top:14px">' +
      '<button class="btn primary block" data-act="save-close">保存してとじる</button></div>';
    return h;
  }

  function drinkBuilder() {
    var b = state.builder || (state.builder = defaultBuilder());
    var dr = C.drink(b.typeId);
    var h = '';

    h += '<label class="field"><span>種類</span><select data-act="b-type">';
    AL.DRINKS.forEach(function (x) {
      h += '<option value="' + x.id + '"' + (x.id === b.typeId ? ' selected' : '') + '>' + x.emoji + ' ' + x.name + '</option>';
    });
    h += '</select></label>';

    if (!dr) return h;

    if (dr.kind === 'cocktail') {
      h += '<label class="field"><span>カクテル</span><select data-act="b-cocktail">';
      AL.COCKTAILS.forEach(function (c) {
        h += '<option value="' + c.id + '"' + (c.id === b.cocktailId ? ' selected' : '') + '>' + c.name + '</option>';
      });
      h += '</select></label>';
      var ck = C.cocktail(b.cocktailId);
      if (ck) {
        var base = C.drink(ck.base);
        var abv = ck.abv != null ? ck.abv : (base ? base.abv : 20);
        h += '<p class="small dim">' + esc((base ? base.name : '') + ' ' + ck.baseMl + 'ml（' + abv + '%）＋ 割り材 ' + ck.mixMl + 'ml') + '</p>';
        if (ck.warn) h += '<p class="small" style="color:var(--amber)">⚠️ ' + esc(ck.warn) + '</p>';
      }
    } else {
      var isSpirit = dr.kind === 'spirit';
      h += '<label class="field"><span>' + (isSpirit ? '原液の量（割る前）' : '飲む量') + '</span><select data-act="b-serve">';
      dr.serves.forEach(function (s, i) {
        h += '<option value="' + i + '"' + (i === b.serveIdx ? ' selected' : '') + '>' + s.name + '</option>';
      });
      h += '<option value="custom"' + (b.serveIdx === 'custom' ? ' selected' : '') + '>自分で入力…</option>';
      h += '</select></label>';

      if (b.serveIdx === 'custom') {
        h += '<label class="field"><span>' + (isSpirit ? '原液' : '') + 'ml</span>' +
          '<input type="number" inputmode="numeric" data-act="b-ml" value="' + (b.customMl || 100) + '"></label>';
      }

      h += '<label class="field"><span>度数（%）</span>' +
        '<input type="number" inputmode="decimal" step="0.5" data-act="b-abv" value="' + (b.abv != null ? b.abv : dr.abv) + '"></label>';

      if (isSpirit) {
        h += '<label class="field"><span>割り方</span><select data-act="b-wari">';
        AL.WARI.forEach(function (w) {
          h += '<option value="' + w.id + '"' + (w.id === b.wariId ? ' selected' : '') + '>' + w.name + '</option>';
        });
        h += '</select></label>';
        var w = C.wari(b.wariId);
        if (w && w.ratio > 0) {
          h += '<label class="field"><span>濃さ（原液 : 割り材）</span><select data-act="b-ratio">';
          AL.RATIOS.forEach(function (r) {
            h += '<option value="' + r.ratio + '"' + (r.ratio === b.ratio ? ' selected' : '') + '>' + r.name + '</option>';
          });
          h += '</select></label>';
        }
        if (w && w.note) h += '<p class="small" style="color:var(--muted);margin-top:8px">💡 ' + esc(w.note) + '</p>';
      }
      if (dr.warn) h += '<p class="small" style="color:var(--amber)">⚠️ ' + esc(dr.warn) + '</p>';
      if (dr.praise) h += '<p class="small" style="color:var(--green)">🌱 ' + esc(dr.praise) + '</p>';
    }

    h += '<label class="field"><span>杯数</span><select data-act="b-count">';
    for (var i = 1; i <= 12; i++) h += '<option value="' + i + '"' + (i === b.count ? ' selected' : '') + '>' + i + ' 杯</option>';
    h += '</select></label>';

    var preview = buildEntry();
    if (preview) {
      var g = C.pureAlcohol(preview);
      h += '<div class="card flat" style="margin:12px 0 6px;padding:12px">' +
        '<div class="small dim">これを足すと</div>' +
        '<div style="font-size:22px;font-weight:800;color:var(--amber)">＋ ' + fmt(g, 1) + ' g' +
        '<span class="small dim" style="font-weight:400"> ／ ' + fmt(C.kcal(preview)) + ' kcal</span></div>' +
        '<div class="small muted">肝臓の残業が <b>' + fmt(g / C.metabolicRate(profile().weight), 1) + '時間</b>増えます</div>' +
        '</div>';
    }
    h += '<button class="btn primary block" data-act="add-drink">この1杯を記録する</button>';
    return h;
  }

  /* ビルダーの状態から drink エントリを作る */
  function buildEntry() {
    var b = state.builder;
    if (!b) return null;
    var dr = C.drink(b.typeId);
    if (!dr) return null;

    if (dr.kind === 'cocktail') {
      var ck = C.cocktail(b.cocktailId);
      if (!ck) return null;
      var base = C.drink(ck.base);
      var abv = ck.abv != null ? ck.abv : (base ? base.abv : 20);
      return {
        typeId: ck.base, label: ck.name, abv: abv, baseMl: ck.baseMl,
        wariId: ck.wari, wariMl: ck.mixMl, mixKcal: ck.mixKcal,
        sugarKcal100: base ? base.sugarKcal100 : 0, count: b.count
      };
    }

    var ml;
    if (b.serveIdx === 'custom') ml = Number(b.customMl) || 0;
    else ml = (dr.serves[b.serveIdx] || dr.serves[0] || { ml: 0 }).ml;

    var isSpirit = dr.kind === 'spirit';
    var wariId = isSpirit ? b.wariId : 'none';
    var w = C.wari(wariId);
    var wariMl = (isSpirit && w && w.ratio > 0) ? C.wariMlFor(ml, b.ratio) : 0;

    // 「焼酎（乙類・本格）」→「焼酎」。割り方は一覧の2行目に出すので名前には入れない
    var label = dr.name.replace(/（.*?）/g, '').trim();

    return {
      typeId: dr.id, label: label,
      abv: b.abv != null ? Number(b.abv) : dr.abv,
      baseMl: ml, wariId: wariId, wariMl: wariMl,
      sugarKcal100: dr.sugarKcal100, count: b.count
    };
  }

  /* --- 翌朝タブ --- */
  function sheetMorning(ymd, d) {
    var m = d.morning || emptyMorning();
    var prev = Store.day(C.addDays(ymd, -1));
    var prevT = C.dayTotals(prev.drinks);
    var score = C.sleepScore(m.sleep);
    var dscore = C.damageScore(m.damage);

    var h = '';
    h += '<p class="small dim" style="margin:10px 0 0">ここに書くのは <b>' + jpDate(ymd) + ' の朝</b>の状態です。' +
         'つまり <b>' + jpDate(C.addDays(ymd, -1)) + ' の夜</b>に飲んだお酒（純アルコール ' + fmt(prevT.alcohol, 1) + 'g）の結果として記録されます。</p>';

    if (score != null || dscore != null) {
      h += '<div class="card flat" style="margin:10px 0"><div class="kpis">' +
        '<div class="kpi"><div class="v" style="color:' + (score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--amber)' : 'var(--red)') + '">' +
          (score == null ? '—' : score) + '</div><div class="l">睡眠スコア</div></div>' +
        '<div class="kpi"><div class="v" style="color:' + (dscore >= 45 ? 'var(--red)' : dscore >= 20 ? 'var(--amber)' : 'var(--green)') + '">' +
          (dscore == null ? '—' : dscore) + '</div><div class="l">ダメージ</div></div>' +
        '<div class="kpi"><div class="v">' + (C.sleepHours(m.sleep) == null ? '—' : fmt(C.sleepHours(m.sleep), 1)) + '</div><div class="l">睡眠時間(h)</div></div>' +
        '</div></div>';
    }

    h += '<h3>眠り</h3>';
    h += '<div class="grid2">' +
      '<label class="field"><span>寝た時刻</span><input id="m-bed" type="time" value="' + esc(m.sleep.bed || '') + '"></label>' +
      '<label class="field"><span>起きた時刻</span><input id="m-wake" type="time" value="' + esc(m.sleep.wake || '') + '"></label>' +
      '</div>';

    h += '<label class="field"><span>布団に入ってから眠るまで</span><select data-act="m-latency">';
    h += '<option value="">—</option>';
    AL.LATENCY.forEach(function (l) {
      h += '<option value="' + l.v + '"' + (String(m.sleep.latency) === String(l.v) ? ' selected' : '') + '>' + l.name + '</option>';
    });
    h += '</select></label>';

    h += '<div class="grid2">';
    h += '<label class="field"><span>夜中に目が覚めた回数</span><select data-act="m-awake"><option value="">—</option>';
    for (var i = 0; i <= 6; i++) h += '<option value="' + i + '"' + (String(m.sleep.awake) === String(i) ? ' selected' : '') + '>' + i + '回</option>';
    h += '</select></label>';
    h += '<label class="field"><span>夜中のトイレ</span><select data-act="m-toilet"><option value="">—</option>';
    for (var j = 0; j <= 5; j++) h += '<option value="' + j + '"' + (String(m.sleep.toilet) === String(j) ? ' selected' : '') + '>' + j + '回</option>';
    h += '</select></label>';
    h += '</div>';

    h += '<label class="field"><span>起きたときのスッキリ感</span></label>';
    h += '<div class="levels" style="margin-top:-6px">';
    ['最悪', 'だるい', 'ふつう', '軽い', 'スッキリ'].forEach(function (nm, k) {
      var v = k + 1;
      h += '<button data-act="m-refresh" data-v="' + v + '" class="' + (Number(m.sleep.refresh) === v ? 'on' : '') + '" ' +
           'style="' + (Number(m.sleep.refresh) === v ? 'background:var(--amber);color:#241c04;border-color:transparent' : '') + '">' + nm + '</button>';
    });
    h += '</div>';

    h += '<label class="field" style="margin-top:14px"><span>考え事・不安はあったか</span></label>';
    h += '<div class="levels" style="margin-top:-6px">';
    ['なかった', '少し', 'けっこう', '頭から離れない'].forEach(function (nm, k) {
      h += '<button data-act="m-worry" data-v="' + k + '" class="' + (Number(m.sleep.worry || 0) === k ? 'on' : '') + '">' + nm + '</button>';
    });
    h += '</div>';
    h += '<label class="field"><span>何を考えていたか（任意）</span>' +
      '<input id="m-worrynote" value="' + esc(m.sleep.worryNote || '') + '" placeholder="仕事のこと／お金のこと など"></label>';

    h += '<label class="field"><span></span></label>';
    h += '<div class="chips" style="margin-top:-10px">' +
      '<button class="chip ' + (m.sleep.nightcap ? 'on' : '') + '" data-act="m-nightcap">🌙 前の晩は「寝るため」に飲んだ</button>' +
      '</div>';

    h += '<hr class="sep"><h3 style="margin-top:0">からだのダメージ</h3>';
    AL.DAMAGE_ITEMS.forEach(function (it) {
      h += '<div class="dmg-row"><div class="nm">' + it.emoji + ' ' + it.name + '</div><div class="levels">';
      AL.DAMAGE_LEVELS.forEach(function (nm, v) {
        var on = Number(m.damage[it.id] || 0) === v && m.damage[it.id] != null;
        h += '<button data-act="m-dmg" data-id="' + it.id + '" data-v="' + v + '" class="' + (on ? 'on' : '') + '">' + nm + '</button>';
      });
      h += '</div></div>';
    });

    h += '<label class="field"><span>朝のメモ（任意）</span>' +
      '<textarea id="m-memo" placeholder="どんな朝だったか">' + esc(m.memo || '') + '</textarea></label>';

    h += '<div class="btn-row" style="margin-top:14px">' +
      '<button class="btn primary block" data-act="save-close">保存してとじる</button></div>';
    if (d.morning) {
      h += '<div class="btn-row" style="margin-top:8px"><button class="btn danger block" data-act="del-morning">この朝の記録を消す</button></div>';
    }
    return h;
  }

  /* ============================================================
     イベント
     ============================================================ */
  function setMorning(fn) {
    captureSheetInputs();
    var d = Store.day(state.editDate, true);
    d.morning = d.morning || emptyMorning();
    fn(d.morning);
    Store.save();
    renderSheet();
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');

    switch (act) {
      case 'go':
        state.view = el.getAttribute('data-view'); render(); break;

      case 'open-day':
        openDay(el.getAttribute('data-date'), el.getAttribute('data-tab')); break;

      case 'close-sheet':
        closeSheet(); break;

      case 'sheet-bg':
        if (ev.target === el) closeSheet(); break;

      case 'tab':
        captureSheetInputs();
        state.editTab = el.getAttribute('data-tab');
        renderSheet(); break;

      case 'cal': {
        var dm = Number(el.getAttribute('data-d'));
        var nd = new Date(state.calYear, state.calMonth + dm, 1);
        state.calYear = nd.getFullYear(); state.calMonth = nd.getMonth();
        render(); break;
      }

      case 'add-drink': {
        captureSheetInputs();
        var entry = buildEntry();
        if (entry && C.pureAlcohol(entry) >= 0) {
          var d = Store.day(state.editDate, true);
          d.drinks.push(entry);
          Store.save();
          renderSheet();
        }
        break;
      }

      case 'del-drink': {
        captureSheetInputs();
        var i = Number(el.getAttribute('data-i'));
        var dd = Store.day(state.editDate, true);
        dd.drinks.splice(i, 1);
        Store.save();
        renderSheet(); break;
      }

      case 'reason': {
        captureSheetInputs();
        var day = Store.day(state.editDate, true);
        var id = el.getAttribute('data-id');
        day.reasons = day.reasons || [];
        var ix = day.reasons.indexOf(id);
        if (ix >= 0) day.reasons.splice(ix, 1); else day.reasons.push(id);
        Store.save(); renderSheet(); break;
      }

      case 'm-refresh': setMorning(function (m) { m.sleep.refresh = Number(el.getAttribute('data-v')); }); break;
      case 'm-worry':   setMorning(function (m) { m.sleep.worry = Number(el.getAttribute('data-v')); }); break;
      case 'm-nightcap':setMorning(function (m) { m.sleep.nightcap = !m.sleep.nightcap; }); break;
      case 'm-dmg':     setMorning(function (m) { m.damage[el.getAttribute('data-id')] = Number(el.getAttribute('data-v')); }); break;

      case 'del-morning':
        if (confirm('この朝の記録を消します。よろしいですか？')) {
          Store.day(state.editDate, true).morning = null;
          Store.save(); renderSheet();
        }
        break;

      case 'save-close': closeSheet(); break;

      case 'save-profile': {
        var p = profile();
        p.name = document.getElementById('p-name').value.trim();
        p.age = Number(document.getElementById('p-age').value) || null;
        p.sex = document.getElementById('p-sex').value;
        p.weight = Number(document.getElementById('p-weight').value) || 70;
        p.height = Number(document.getElementById('p-height').value) || null;
        p.waist = Number(document.getElementById('p-waist').value) || null;
        p.drinkStart = Number(document.getElementById('p-start').value);
        Store.save();
        render();
        alert('保存しました。');
        break;
      }

      case 'export': {
        var blob = new Blob([Store.exportJson()], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'yoilog-' + C.today() + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        break;
      }

      case 'import': document.getElementById('import-file').click(); break;

      case 'sample':
        if (confirm('お試し用のサンプル記録を入れます（今あるデータは消えます）。よろしいですか？')) {
          makeSample(); render();
        }
        break;

      case 'clear':
        if (confirm('すべての記録を消します。元に戻せません。よろしいですか？')) {
          Store.clearAll(); render();
        }
        break;
    }
  });

  document.addEventListener('change', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (el) {
      var act = el.getAttribute('data-act');
      var b = state.builder;
      switch (act) {
        case 'b-type':
          b.typeId = el.value; b.serveIdx = 0; b.abv = null; b.customMl = null;
          renderSheet(); return;
        case 'b-cocktail': b.cocktailId = el.value; renderSheet(); return;
        case 'b-serve': b.serveIdx = el.value === 'custom' ? 'custom' : Number(el.value); renderSheet(); return;
        case 'b-ml': b.customMl = Number(el.value) || 0; renderSheet(); return;
        case 'b-abv': b.abv = Number(el.value); renderSheet(); return;
        case 'b-wari': b.wariId = el.value; renderSheet(); return;
        case 'b-ratio': b.ratio = Number(el.value); renderSheet(); return;
        case 'b-count': b.count = Number(el.value); renderSheet(); return;
        case 'm-latency': setMorning(function (m) { m.sleep.latency = el.value === '' ? null : Number(el.value); }); return;
        case 'm-awake': setMorning(function (m) { m.sleep.awake = el.value === '' ? null : Number(el.value); }); return;
        case 'm-toilet': setMorning(function (m) { m.sleep.toilet = el.value === '' ? null : Number(el.value); }); return;
      }
    }
    if (ev.target.id === 'import-file' && ev.target.files && ev.target.files[0]) {
      var fr = new FileReader();
      fr.onload = function () {
        try { Store.importJson(fr.result); alert('読み込みました。'); render(); }
        catch (e) { alert('読み込めませんでした：' + e.message); }
      };
      fr.readAsText(ev.target.files[0]);
    }
  });

  document.getElementById('tabbar').addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-view]');
    if (!b) return;
    state.view = b.getAttribute('data-view');
    window.scrollTo(0, 0);
    render();
  });

  /* ============================================================
     サンプルデータ（アプリの見え方を確かめる用）
     ============================================================ */
  function makeSample() {
    Store.clearAll();
    var p = Store.data.profile;
    p.name = 'たかし'; p.age = 43; p.sex = 'male'; p.weight = 76; p.height = 171; p.waist = 91; p.drinkStart = 20;

    // 疑似乱数（毎回同じサンプルが出るように）
    var seed = 20260809;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }

    for (var i = 45; i >= 0; i--) {
      var ymd = C.addDays(C.today(), -i);
      var dow = C.parseYmd(ymd).getDay();
      var day = Store.day(ymd, true);

      var rest = rnd() < 0.17;                         // たまに休肝日
      var heavy = (dow === 5 || dow === 6) && rnd() < 0.7;

      if (!rest) {
        var beers = heavy ? 2 : 1;
        day.drinks.push({ typeId: 'beer', label: 'ビール', abv: 5, baseMl: 500, wariId: 'none', wariMl: 0, sugarKcal100: 12, count: beers });
        if (rnd() < 0.8) {
          var wid = rnd() < 0.5 ? 'soda' : 'oyu';
          day.drinks.push({
            typeId: 'shochu', label: '焼酎', abv: 25,
            baseMl: 90, wariId: wid, wariMl: 270, sugarKcal100: 0,
            count: heavy ? 2 : 1 + Math.floor(rnd() * 2)
          });
        }
        if (heavy && rnd() < 0.4) {
          day.drinks.push({ typeId: 'whisky', label: 'ハイボール', abv: 40, baseMl: 45, wariId: 'soda', wariMl: 135, sugarKcal100: 0, count: 2 });
        }
        day.spend = 800 + Math.floor(rnd() * 2200);
        day.reasons = [];
        if (rnd() < 0.7) day.reasons.push('habit');
        if (rnd() < 0.4) day.reasons.push('sleep');
        if (rnd() < 0.35) day.reasons.push('stress');
        if (heavy) day.reasons.push('social');
      } else {
        day.spend = 0;
        day.reasons = [];
      }

      // 翌朝（この日の朝＝前日の夜の結果）
      var prev = Store.day(C.addDays(ymd, -1));
      var prevG = C.dayTotals(prev.drinks).alcohol;
      var nightcap = (prev.reasons || []).indexOf('sleep') >= 0;

      var latency = prevG > 0 ? (nightcap ? 5 : 15) : (rnd() < 0.5 ? 30 : 60);
      var awake = prevG > 40 ? 2 + Math.round(rnd()) : prevG > 15 ? 1 + Math.round(rnd() * 0.6) : Math.round(rnd() * 0.5);
      var toilet = prevG > 40 ? 2 : prevG > 15 ? 1 : Math.round(rnd() * 0.4);
      var refresh = prevG > 60 ? 1 : prevG > 35 ? 2 : prevG > 10 ? 3 : 4;
      if (rnd() < 0.25) refresh = Math.max(1, Math.min(5, refresh + (rnd() < 0.5 ? -1 : 1)));

      var bedH = 23 + (rnd() < 0.4 ? 1 : 0);
      day.morning = {
        sleep: {
          bed: ('0' + (bedH % 24)).slice(-2) + ':' + (rnd() < 0.5 ? '00' : '30'),
          wake: (rnd() < 0.5 ? '06:30' : '07:00'),
          latency: latency, awake: awake, refresh: refresh, toilet: toilet,
          worry: prevG === 0 ? 2 : 1, worryNote: '', nightcap: nightcap
        },
        damage: {
          headache: prevG > 55 ? 2 : prevG > 30 ? 1 : 0,
          nausea: prevG > 65 ? 2 : prevG > 40 ? 1 : 0,
          fatigue: prevG > 45 ? 2 : prevG > 20 ? 1 : 0,
          thirst: prevG > 35 ? 2 : prevG > 12 ? 1 : 0,
          palpitation: prevG > 55 ? 1 : 0,
          diarrhea: prevG > 60 ? 1 : 0,
          blackout: prevG > 85 ? 2 : prevG > 70 ? 1 : 0,
          motivation: prevG > 45 ? 1 : 0,
          irritated: prevG > 50 ? 1 : 0,
          swelling: prevG > 40 ? 1 : 0
        },
        memo: ''
      };
    }
    Store.data.ui.seenIntro = true;
    Store.save();
  }

  /* ============================================================
     起動
     ============================================================ */
  function render() {
    document.querySelectorAll('#tabbar button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-view') === state.view);
    });
    var p30 = S.period(30);
    document.getElementById('appbar-sub').innerHTML =
      '30日平均 <b style="color:' + C.band(p30.dailyAvg).color + '">' + fmt(p30.dailyAvg, 1) + 'g</b>／日<br>休肝日 ' + p30.restDays + '日';

    if (state.view === 'home') viewHome();
    else if (state.view === 'calendar') viewCalendar();
    else if (state.view === 'body') viewBody();
    else if (state.view === 'stats') viewStats();
    else viewSettings();
  }

  Store.load();
  render();

  if (!Store.data.ui.seenIntro && !Object.keys(Store.data.days).length) {
    Store.data.ui.seenIntro = true;
    Store.save();
    setTimeout(function () {
      var ok = confirm(
        'はじめまして。\n\n' +
        'このアプリは、飲んだお酒と翌朝のからだを突き合わせて、' +
        '「お酒が自分に何をしているか」を数字で見るための記録帳です。\n\n' +
        '動きを先に見たい場合は、45日ぶんのサンプル記録を入れられます。入れますか？\n' +
        '（設定画面からいつでも消せます）');
      if (ok) { makeSample(); render(); }
    }, 400);
  }

  root.YOILOG = { state: state, render: render };
})(typeof window !== 'undefined' ? window : globalThis);
