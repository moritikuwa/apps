/* ============================================================
   酔いログ / YOI-LOG   計算エンジン
   純アルコール量・カロリー・分解時間・血中濃度・睡眠スコア
   ============================================================ */
(function (root) {
  'use strict';

  var AL = root.AL || (root.AL = {});
  var C = AL.calc = {};

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  C.drink = function (id) { return find(AL.DRINKS, id); };
  C.wari = function (id) { return find(AL.WARI, id); };
  C.cocktail = function (id) { return find(AL.COCKTAILS, id); };

  /* ------------------------------------------------------------
     純アルコール量(g) = 量(ml) × 度数(%) / 100 × 0.8（アルコールの比重）

     entry = {
       typeId, abv, baseMl, wariId, wariMl, count, label
     }
     ・kind:'ready'  の場合 baseMl は「飲む量そのもの」
     ・kind:'spirit' の場合 baseMl は「原液の量」（割り材はアルコールを含まない）
     どちらも「アルコールを含む液体の量 × 度数」で計算できるので式は共通。
     ------------------------------------------------------------ */
  C.pureAlcohol = function (entry) {
    var ml = Number(entry.baseMl) || 0;
    var abv = Number(entry.abv) || 0;
    var n = Number(entry.count) || 1;
    return ml * (abv / 100) * 0.8 * n;
  };

  /* 1杯あたりのカロリー(kcal)。アルコール由来 + 酒の糖質 + 割り材 */
  C.kcal = function (entry) {
    var n = Number(entry.count) || 1;
    var d = C.drink(entry.typeId);
    var sugar100 = entry.sugarKcal100 != null ? entry.sugarKcal100 : (d ? d.sugarKcal100 : 0);
    var alcKcal = C.pureAlcohol(entry) * AL.GUIDE.kcalPerGram;
    var sugarKcal = (Number(entry.baseMl) || 0) * (sugar100 / 100) * n;
    var mixKcal = 0;
    if (entry.mixKcal != null) {
      mixKcal = Number(entry.mixKcal) * n;              // カクテル・プリセット
    } else {
      var w = C.wari(entry.wariId);
      if (w) mixKcal = (Number(entry.wariMl) || 0) * (w.kcal100 / 100) * n;
    }
    return alcKcal + sugarKcal + mixKcal;
  };

  /* 割り材の量。原液 × 比率 */
  C.wariMlFor = function (baseMl, ratio) {
    return Math.round((Number(baseMl) || 0) * (Number(ratio) || 0));
  };

  /* その日の合計 */
  C.dayTotals = function (drinks) {
    var t = { alcohol: 0, kcal: 0, volume: 0, cups: 0, absorbMax: 1 };
    (drinks || []).forEach(function (e) {
      var n = Number(e.count) || 1;
      t.alcohol += C.pureAlcohol(e);
      t.kcal += C.kcal(e);
      t.volume += ((Number(e.baseMl) || 0) + (Number(e.wariMl) || 0)) * n;
      t.cups += n;
      var w = C.wari(e.wariId);
      if (w && w.absorb > t.absorbMax) t.absorbMax = w.absorb;
    });
    t.alcohol = Math.round(t.alcohol * 10) / 10;
    t.kcal = Math.round(t.kcal);
    t.volume = Math.round(t.volume);
    return t;
  };

  /* ------------------------------------------------------------
     分解にかかる時間
     1時間に分解できる純アルコール量 ≒ 体重(kg) × 0.1 g
     ------------------------------------------------------------ */
  C.metabolicRate = function (weightKg) {
    return Math.max(3, (Number(weightKg) || 65) * 0.1);
  };

  C.hoursToSober = function (grams, weightKg) {
    var r = C.metabolicRate(weightKg);
    if (grams <= 0) return 0;
    return grams / r + 0.5; // +0.5h は吸収にかかる時間の目安
  };

  /* 血中アルコール濃度（Widmark式）
     BAC(‰ = mg/mL) = A(g) / (体重kg × r)     r: 男 0.68 / 女 0.55 */
  C.bodyFactor = function (sex) { return sex === 'female' ? 0.55 : 0.68; };

  C.peakBac = function (grams, weightKg, sex) {
    var w = Number(weightKg) || 65;
    if (grams <= 0) return 0;
    return grams / (w * C.bodyFactor(sex));
  };

  /* 血中濃度が1時間に下がる幅。
     分解速度（体重×0.1 g/時）を濃度に直したもので、一般に言われる約0.15‰/時と一致します。
     「抜けきる時刻」と同じ式から出すことで、2つの表示がずれないようにしています。 */
  C.bacDeclineRate = function (sex) { return 0.1 / C.bodyFactor(sex); };

  C.bacAfter = function (grams, weightKg, sex, hours) {
    var peak = C.peakBac(grams, weightKg, sex);
    // 最初の0.5時間は吸収にあてる（hoursToSober と同じ扱い）
    var elapsed = Math.max(0, (Number(hours) || 0) - 0.5);
    return Math.max(0, peak - C.bacDeclineRate(sex) * elapsed);
  };

  /* 血中濃度から「酔いの段階」を返す */
  C.drunkStage = function (bac) {
    if (bac < 0.2) return { name: 'しらふに近い', desc: 'ほとんど影響のない範囲です。', level: 0 };
    if (bac < 0.5) return { name: '爽快期', desc: '陽気になり、皮膚が赤くなる。判断力はもう落ち始めています。', level: 1 };
    if (bac < 1.0) return { name: 'ほろ酔い期', desc: '手の動きが大ざっぱになり、抑制がゆるむ。理性をつかさどる前頭葉から麻痺していきます。', level: 2 };
    if (bac < 1.5) return { name: '酩酊初期', desc: '気が大きくなり、立てばふらつく。小脳がやられています。', level: 3 };
    if (bac < 2.5) return { name: '酩酊期', desc: '千鳥足、同じ話の繰り返し、吐き気。記憶が飛び始める領域です。', level: 4 };
    if (bac < 3.5) return { name: '泥酔期', desc: 'まともに立てず、意識がはっきりしない。記憶はほぼ残りません。', level: 5 };
    return { name: '昏睡期', desc: '揺すっても起きない。呼吸が抑制され、命に関わる状態です。ためらわず119番。', level: 6 };
  };

  /* 危険度バンド */
  C.band = function (grams) {
    for (var i = 0; i < AL.BANDS.length; i++) if (grams <= AL.BANDS[i].max) return AL.BANDS[i];
    return AL.BANDS[AL.BANDS.length - 1];
  };

  /* ------------------------------------------------------------
     ダメージスコア（翌朝の記録から 0〜100）
     ------------------------------------------------------------ */
  C.damageScore = function (damage) {
    if (!damage) return null;
    var sum = 0, n = 0;
    AL.DAMAGE_ITEMS.forEach(function (it) {
      var v = damage[it.id];
      if (v != null) { sum += Number(v); n++; }
    });
    if (!n) return null;
    var max = AL.DAMAGE_ITEMS.length * 3;
    return Math.round((sum / max) * 100);
  };

  /* ------------------------------------------------------------
     睡眠スコア（0〜100・高いほど良い）
     sleep = { bed:'23:30', wake:'06:30', latency:30, awake:2,
               refresh:1..5, toilet:1, worry:0..3, nightcap:bool }
     ------------------------------------------------------------ */
  C.sleepHours = function (sleep) {
    if (!sleep || !sleep.bed || !sleep.wake) return null;
    var b = C.hhmmToMin(sleep.bed), w = C.hhmmToMin(sleep.wake);
    if (b == null || w == null) return null;
    var diff = w - b;
    if (diff <= 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  };

  C.hhmmToMin = function (s) {
    if (!s || typeof s !== 'string') return null;
    var m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };

  C.sleepScore = function (sleep) {
    if (!sleep) return null;
    var has = sleep.refresh != null || sleep.latency != null || sleep.awake != null || (sleep.bed && sleep.wake);
    if (!has) return null;

    var score = 100;

    // 睡眠時間：7時間前後を最良とし、離れるほど減点
    var h = C.sleepHours(sleep);
    if (h != null) {
      var diff = Math.abs(h - 7);
      score -= Math.min(30, diff * 8);
    }
    // 寝つき：30分を超えるぶんを減点
    if (sleep.latency != null) {
      score -= Math.min(15, Math.max(0, (Number(sleep.latency) - 15)) * 0.2);
    }
    // 中途覚醒：1回につき7点、最大25点
    if (sleep.awake != null) score -= Math.min(25, Number(sleep.awake) * 7);
    // 夜間のトイレ：1回につき4点
    if (sleep.toilet != null) score -= Math.min(12, Number(sleep.toilet) * 4);
    // 起きたときのスッキリ感（1〜5）：これが体感の主役なので重みを大きく
    if (sleep.refresh != null) score -= (5 - Number(sleep.refresh)) * 7;

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  /* ------------------------------------------------------------
     統計まわり
     ------------------------------------------------------------ */
  C.mean = function (arr) {
    var v = arr.filter(function (x) { return typeof x === 'number' && !isNaN(x); });
    if (!v.length) return null;
    return v.reduce(function (a, b) { return a + b; }, 0) / v.length;
  };

  /* 単回帰 y = a + bx と相関係数 r */
  C.regression = function (pairs) {
    var pts = pairs.filter(function (p) {
      return typeof p[0] === 'number' && typeof p[1] === 'number' && !isNaN(p[0]) && !isNaN(p[1]);
    });
    if (pts.length < 3) return null;
    var n = pts.length;
    var mx = C.mean(pts.map(function (p) { return p[0]; }));
    var my = C.mean(pts.map(function (p) { return p[1]; }));
    var sxy = 0, sxx = 0, syy = 0;
    pts.forEach(function (p) {
      var dx = p[0] - mx, dy = p[1] - my;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    });
    if (sxx === 0 || syy === 0) return null;
    var b = sxy / sxx;
    return { a: my - b * mx, b: b, r: sxy / Math.sqrt(sxx * syy), n: n, meanX: mx, meanY: my };
  };

  /* ------------------------------------------------------------
     わかりやすい換算
     ------------------------------------------------------------ */
  C.equivalents = function (grams) {
    return {
      beer: grams / 20,                 // 中ジョッキ500ml(5%) = 20g
      sake: grams / 21.6,               // 日本酒1合180ml(15%) = 21.6g
      highball: grams / 14.4,           // ウイスキー45ml(40%) = 14.4g
      strong: grams / 36,               // ストロング500ml(9%) = 36g
      shochuBottle: grams / 180         // 焼酎900ml(25%) = 180g
    };
  };

  /* カロリーの換算 */
  C.kcalEquivalents = function (kcal) {
    return {
      rice: kcal / 234,        // ご飯茶碗1杯(150g) ≒ 234kcal
      walkMin: kcal / 4,       // 体重70kgの人が歩いて消費するのは 約4kcal/分
      bodyFatG: kcal / 7.2     // 体脂肪1g を増やすのに必要なのは 約7.2kcal
    };
  };

  /* ------------------------------------------------------------
     「今夜の見積り」：これから飲む量に対する体の反応
     ------------------------------------------------------------ */
  C.forecast = function (grams, profile, startHour) {
    var w = (profile && profile.weight) || 70;
    var sex = (profile && profile.sex) || 'male';
    var hours = C.hoursToSober(grams, w);
    var start = startHour != null ? startHour : 20;
    var soberAt = (start + hours) % 24;

    var eq = C.equivalents(grams);
    var risk = sex === 'female' ? AL.GUIDE.riskFemale : AL.GUIDE.riskMale;

    return {
      grams: Math.round(grams * 10) / 10,
      hours: Math.round(hours * 10) / 10,
      soberAt: soberAt,
      soberLabel: C.fmtHour(soberAt),
      peakBac: Math.round(C.peakBac(grams, w, sex) * 100) / 100,
      stage: C.drunkStage(C.peakBac(grams, w, sex)),
      bacAt7: Math.round(C.bacAfter(grams, w, sex, ((7 + 24) - start) % 24) * 100) / 100,
      water: Math.round(grams * AL.GUIDE.diuresisMlPerGram),
      riskRatio: risk > 0 ? grams / risk : 0,
      eq: eq,
      band: C.band(grams)
    };
  };

  C.fmtHour = function (h) {
    var hh = Math.floor(h) % 24;
    var mm = Math.round((h - Math.floor(h)) * 60);
    if (mm === 60) { mm = 0; hh = (hh + 1) % 24; }
    return ('0' + hh).slice(-2) + ':' + ('0' + mm).slice(-2);
  };

  /* ------------------------------------------------------------
     日付ユーティリティ
     ------------------------------------------------------------ */
  C.ymd = function (d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  };
  C.parseYmd = function (s) {
    var p = String(s).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  };
  C.addDays = function (s, n) {
    var d = C.parseYmd(s);
    d.setDate(d.getDate() + n);
    return C.ymd(d);
  };

  /* 「その日」の区切りは朝5時。
     深夜1時に飲んだ一杯は、カレンダー上は翌日でも「前の晩の酒」として数えます。
     こうしないと、日付をまたいで飲む人の「その夜の酒」と「翌朝のからだ」がずれます。 */
  C.DAY_START_HOUR = 5;

  C.today = function () {
    var d = new Date();
    if (d.getHours() < C.DAY_START_HOUR) d.setDate(d.getDate() - 1);
    return C.ymd(d);
  };

  /* いま深夜（0時〜5時）で、記録先が前日になっているか */
  C.isLateNight = function () { return new Date().getHours() < C.DAY_START_HOUR; };

  if (typeof module !== 'undefined' && module.exports) module.exports = AL;
})(typeof window !== 'undefined' ? window : globalThis);
