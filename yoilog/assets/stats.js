/* ============================================================
   酔いログ / YOI-LOG   分析エンジン
   「酒を飲まないと眠れない」を、本人のデータで検証する
   ============================================================ */
(function (root) {
  'use strict';

  var AL = root.AL || (root.AL = {});
  var C = AL.calc;
  var S = AL.stats = {};

  /* 指定期間の日付配列（古い→新しい） */
  S.range = function (days, endYmd) {
    var end = endYmd || C.today();
    var out = [];
    for (var i = days - 1; i >= 0; i--) out.push(C.addDays(end, -i));
    return out;
  };

  /* ------------------------------------------------------------
     1日分の要約
     ------------------------------------------------------------ */
  S.daySummary = function (ymd) {
    var d = AL.store.day(ymd);
    var t = C.dayTotals(d.drinks);
    return {
      date: ymd,
      alcohol: t.alcohol,
      kcal: t.kcal,
      cups: t.cups,
      spend: Number(d.spend) || 0,
      hasRecord: S.hasContent(d),
      drank: t.alcohol > 0,
      reasons: d.reasons || [],
      morning: d.morning || null,
      sleepScore: d.morning ? C.sleepScore(d.morning.sleep) : null,
      damageScore: d.morning ? C.damageScore(d.morning.damage) : null,
      band: C.band(t.alcohol)
    };
  };

  /* ------------------------------------------------------------
     「前の晩の酒」と「翌朝の状態」を突き合わせたペア
     morning は その日の朝の記録 ＝ 前日の夜の結果
     ------------------------------------------------------------ */
  S.pairs = function (days, endYmd) {
    var dates = S.range(days, endYmd);
    var out = [];
    dates.forEach(function (ymd) {
      var morningDay = AL.store.day(ymd);
      if (S.isEmptyMorning(morningDay.morning)) return;
      var prev = AL.store.day(C.addDays(ymd, -1));
      var t = C.dayTotals(prev.drinks);
      out.push({
        date: ymd,
        alcohol: t.alcohol,
        drank: t.alcohol > 0,
        nightcap: !!(morningDay.morning.sleep && morningDay.morning.sleep.nightcap),
        sleep: morningDay.morning.sleep || {},
        sleepScore: C.sleepScore(morningDay.morning.sleep),
        damageScore: C.damageScore(morningDay.morning.damage),
        hours: C.sleepHours(morningDay.morning.sleep)
      });
    });
    return out;
  };

  function avg(arr, pick) {
    var v = [];
    arr.forEach(function (x) {
      var n = pick(x);
      if (typeof n === 'number' && !isNaN(n)) v.push(n);
    });
    if (!v.length) return null;
    return v.reduce(function (a, b) { return a + b; }, 0) / v.length;
  }
  S.avg = avg;

  /* ------------------------------------------------------------
     核心の検証：飲んだ翌朝 vs 飲まなかった翌朝
     ------------------------------------------------------------ */
  S.drinkVsSober = function (days, endYmd) {
    var p = S.pairs(days || 90, endYmd);
    var drank = p.filter(function (x) { return x.drank; });
    var sober = p.filter(function (x) { return !x.drank; });

    function pack(list) {
      return {
        n: list.length,
        sleepScore: avg(list, function (x) { return x.sleepScore; }),
        hours: avg(list, function (x) { return x.hours; }),
        latency: avg(list, function (x) { return x.sleep.latency; }),
        awake: avg(list, function (x) { return x.sleep.awake; }),
        refresh: avg(list, function (x) { return x.sleep.refresh; }),
        toilet: avg(list, function (x) { return x.sleep.toilet; }),
        damage: avg(list, function (x) { return x.damageScore; })
      };
    }
    return { drank: pack(drank), sober: pack(sober), total: p.length };
  };

  /* 寝酒（寝るために飲んだ）の検証 */
  S.nightcapCheck = function (days, endYmd) {
    var p = S.pairs(days || 90, endYmd);
    var yes = p.filter(function (x) { return x.nightcap; });
    var no = p.filter(function (x) { return !x.nightcap; });
    if (yes.length < 2) return null;
    return {
      n: yes.length,
      latencyYes: avg(yes, function (x) { return x.sleep.latency; }),
      latencyNo: avg(no, function (x) { return x.sleep.latency; }),
      awakeYes: avg(yes, function (x) { return x.sleep.awake; }),
      awakeNo: avg(no, function (x) { return x.sleep.awake; }),
      refreshYes: avg(yes, function (x) { return x.sleep.refresh; }),
      refreshNo: avg(no, function (x) { return x.sleep.refresh; }),
      scoreYes: avg(yes, function (x) { return x.sleepScore; }),
      scoreNo: avg(no, function (x) { return x.sleepScore; })
    };
  };

  /* 飲酒量と睡眠スコアの相関 */
  S.alcoholSleepCorrelation = function (days, endYmd) {
    var p = S.pairs(days || 90, endYmd);
    var pts = p.filter(function (x) { return x.sleepScore != null; })
               .map(function (x) { return [x.alcohol, x.sleepScore]; });
    var reg = C.regression(pts);
    return { points: pts, reg: reg };
  };

  /* 飲酒量とダメージの相関 */
  S.alcoholDamageCorrelation = function (days, endYmd) {
    var p = S.pairs(days || 90, endYmd);
    var pts = p.filter(function (x) { return x.damageScore != null; })
               .map(function (x) { return [x.alcohol, x.damageScore]; });
    return { points: pts, reg: C.regression(pts) };
  };

  /* ------------------------------------------------------------
     期間サマリー
     ------------------------------------------------------------ */
  S.period = function (days, endYmd) {
    var dates = S.range(days, endYmd);
    var total = 0, kcal = 0, spend = 0, drinkDays = 0, restDays = 0, recorded = 0;
    var overRisk = 0, maxDay = 0, maxDate = null;
    var profile = AL.store.data.profile;
    var risk = profile.sex === 'female' ? AL.GUIDE.riskFemale : AL.GUIDE.riskMale;

    dates.forEach(function (ymd) {
      var s = S.daySummary(ymd);
      if (!s.hasRecord) return;
      recorded++;
      total += s.alcohol;
      kcal += s.kcal;
      spend += s.spend;
      if (s.alcohol > 0) drinkDays++; else restDays++;
      if (s.alcohol >= risk) overRisk++;
      if (s.alcohol > maxDay) { maxDay = s.alcohol; maxDate = ymd; }
    });

    return {
      days: days,
      recorded: recorded,
      totalAlcohol: Math.round(total * 10) / 10,
      dailyAvg: recorded ? Math.round((total / recorded) * 10) / 10 : 0,
      kcal: Math.round(kcal),
      spend: Math.round(spend),
      drinkDays: drinkDays,
      restDays: restDays,
      overRisk: overRisk,
      maxDay: Math.round(maxDay * 10) / 10,
      maxDate: maxDate,
      riskLine: risk
    };
  };

  /* 連続で飲んでいる日数（今日から遡る）
     今日はまだ途中なので、今日がまだ0gでも連続は切らない。
     （朝の記録だけ先に入れた日で連続が0に戻ってしまわないように） */
  S.currentStreak = function (endYmd) {
    var end = endYmd || C.today();
    var n = 0;
    for (var i = 0; i < 400; i++) {
      var g = C.dayTotals(AL.store.day(C.addDays(end, -i)).drinks).alcohol;
      if (i === 0 && g === 0) continue;
      if (g > 0) n++; else break;
    }
    return n;
  };

  /* 最後の休肝日。今日はまだ終わっていないので数えない */
  S.lastRestDay = function (endYmd) {
    var end = endYmd || C.today();
    for (var i = 1; i < 400; i++) {
      var ymd = C.addDays(end, -i);
      var d = AL.store.day(ymd);
      if (!S.hasContent(d)) continue;
      if (C.dayTotals(d.drinks).alcohol === 0) return { date: ymd, ago: i };
    }
    return null;
  };

  /* その日に「中身のある記録」があるか。
     画面を開いただけでできた空っぽの記録を、休肝日として数えないための判定。 */
  S.hasContent = function (d) {
    if (!d) return false;
    if (d.drinks && d.drinks.length) return true;
    if (d.reasons && d.reasons.length) return true;
    if (Number(d.spend) > 0 || d.memo) return true;
    return !S.isEmptyMorning(d.morning);
  };

  S.isEmptyMorning = function (m) {
    if (!m) return true;
    var s = m.sleep || {};
    if (s.bed || s.wake || s.worryNote || s.nightcap) return false;
    if (s.latency != null || s.awake != null || s.refresh != null || s.toilet != null) return false;
    if (Number(s.worry) > 0) return false;
    if (m.memo) return false;
    for (var k in (m.damage || {})) if (m.damage[k] != null) return false;
    return true;
  };

  /* 月別の平均（耐性がついて量が増えていないか） */
  S.monthlyTrend = function (months) {
    var out = [];
    var now = new Date();
    for (var i = (months || 6) - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
      var sum = 0, n = 0;
      Object.keys(AL.store.data.days).forEach(function (ymd) {
        if (ymd.indexOf(key) !== 0) return;
        var day = AL.store.data.days[ymd];
        if (!S.hasContent(day)) return;
        sum += C.dayTotals(day.drinks).alcohol;
        n++;
      });
      out.push({ key: key, label: (d.getMonth() + 1) + '月', avg: n ? sum / n : null, days: n });
    }
    return out;
  };

  /* ------------------------------------------------------------
     気をつけたいサイン
     責めるためではなく、早めに気づくためのチェック
     ------------------------------------------------------------ */
  S.warnings = function () {
    var w = [];
    var p90 = S.period(90);
    var streak = S.currentStreak();
    var pairs = S.pairs(90);

    if (streak >= 14) {
      w.push({ level: 'high', title: '休肝日が' + streak + '日ありません',
        body: '肝臓の細胞が回復するには時間が必要です。まずは週に2日、続けて休む日をつくることが、量を減らすより先に効きます。' });
    } else if (streak >= 7) {
      w.push({ level: 'mid', title: streak + '日連続で飲んでいます',
        body: '「毎日飲む」が習慣として固まると、飲まない日のほうが落ち着かなくなります。' });
    }

    if (p90.recorded >= 7 && p90.dailyAvg >= p90.riskLine) {
      w.push({ level: 'high', title: '1日平均' + p90.dailyAvg + 'g（生活習慣病のリスクを高める量）',
        body: '厚生労働省のガイドラインでは、生活習慣病のリスクを高める量は1日あたり純アルコール' + p90.riskLine + 'g以上とされています。' });
    } else if (p90.recorded >= 7 && p90.dailyAvg >= AL.GUIDE.moderate) {
      w.push({ level: 'mid', title: '1日平均' + p90.dailyAvg + 'g',
        body: '「節度ある適度な飲酒」の目安は1日平均約20gです。今の量はそれを上回っています。' });
    }

    var nightcaps = pairs.filter(function (x) { return x.nightcap; }).length;
    if (nightcaps >= 5) {
      w.push({ level: 'high', title: '「寝るため」に飲んだ日が' + nightcaps + '日',
        body: '寝酒は数週間で効かなくなり（耐性）、同じだけ眠るのに量が増えていきます。眠りの問題は、酒ではなく睡眠の相談として医師に話すのが近道です。' });
    }

    var blackouts = 0;
    Object.keys(AL.store.data.days).forEach(function (ymd) {
      var m = AL.store.data.days[ymd].morning;
      if (m && m.damage && Number(m.damage.blackout) >= 2) blackouts++;
    });
    if (blackouts >= 3) {
      w.push({ level: 'high', title: '記憶があいまいな朝が' + blackouts + '回',
        body: 'いわゆるブラックアウトは、脳の海馬が記憶を書き込めなくなった状態です。回数が増えるほど、脳への影響が心配される段階に入ります。' });
    }

    var trend = S.monthlyTrend(4).filter(function (m) { return m.avg != null && m.days >= 5; });
    if (trend.length >= 2) {
      var first = trend[0].avg, last = trend[trend.length - 1].avg;
      if (last > first * 1.25) {
        w.push({ level: 'mid', title: '飲む量が増えてきています',
          body: trend[0].label + 'は1日平均' + first.toFixed(1) + 'g、' + trend[trend.length - 1].label + 'は' + last.toFixed(1) + 'g。' +
                '同じ酔いを得るのに量が増えるのは、体に耐性がついたサインです。' });
      }
    }

    return w;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AL;
})(typeof window !== 'undefined' ? window : globalThis);
