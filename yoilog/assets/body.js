/* ============================================================
   酔いログ / YOI-LOG   からだ表現
   ・主人公アバター（SVG）
   ・体の中で今夜なにが起きるかのタイムライン
   ============================================================ */
(function (root) {
  'use strict';

  var AL = root.AL || (root.AL = {});
  var C = AL.calc;
  var B = AL.body = {};

  /* ------------------------------------------------------------
     お腹の出っぷり 0〜5
     直近30日の平均純アルコール量と、酒由来のカロリーから決める
     ------------------------------------------------------------ */
  B.bellyLevel = function () {
    var p = AL.stats.period(30);
    if (!p.recorded) {
      // 記録がないうちは、設定した腹囲から推定（40代前半・ちょっと出ている想定）
      var waist = (AL.store.data.profile.waist || 88);
      return Math.max(0, Math.min(5, (waist - 76) / 6));
    }
    var byAlcohol = p.dailyAvg / 20;                       // 20gごとに +1
    var byKcal = (p.kcal / Math.max(1, p.recorded)) / 250; // 1日250kcalごとに +1
    return Math.max(0.4, Math.min(5, byAlcohol * 0.6 + byKcal * 0.6));
  };

  /* 直近のダメージ（0〜100）。顔色と表情に使う */
  B.recentDamage = function () {
    var pairs = AL.stats.pairs(14);
    var v = pairs.map(function (x) { return x.damageScore; }).filter(function (x) { return x != null; });
    if (!v.length) return 0;
    return v.slice(-5).reduce(function (a, b) { return a + b; }, 0) / Math.min(5, v.length);
  };

  /* ------------------------------------------------------------
     アバター描画
     opts = { belly, damage, organs:{brain,liver,heart,stomach,gut}, showOrgans, label }
     ------------------------------------------------------------ */
  B.avatar = function (opts) {
    opts = opts || {};
    var belly = opts.belly != null ? opts.belly : B.bellyLevel();
    var damage = opts.damage != null ? opts.damage : B.recentDamage();
    var organs = opts.organs || {};
    var showOrgans = !!opts.showOrgans;

    var sx = 40;                        // 肩幅の半分
    var wx = 25 + belly * 6.6;          // 腹まわりの半分
    var hx = 33;                        // 腰幅の半分

    // 顔色：ダメージが強いほど 赤み → くすみ
    var skin = damage > 60 ? '#c9a288' : damage > 30 ? '#dcae90' : '#e6b795';
    var flush = Math.min(0.55, damage / 140 + belly / 22);

    function torsoPath() {
      return 'M ' + (100 - sx) + ',92' +
        ' C ' + (100 - 30) + ',80 ' + (100 - 13) + ',79 ' + (100 - 11) + ',74' +
        ' L ' + (100 + 11) + ',74' +
        ' C ' + (100 + 13) + ',79 ' + (100 + 30) + ',80 ' + (100 + sx) + ',92' +
        ' C ' + (100 + sx + 2) + ',120 ' + (100 + wx + 5) + ',148 ' + (100 + wx) + ',176' +
        ' C ' + (100 + wx - 1) + ',196 ' + (100 + hx) + ',200 ' + (100 + hx) + ',212' +
        ' L ' + (100 - hx) + ',212' +
        ' C ' + (100 - hx) + ',200 ' + (100 - wx + 1) + ',196 ' + (100 - wx) + ',176' +
        ' C ' + (100 - wx - 5) + ',148 ' + (100 - sx - 2) + ',120 ' + (100 - sx) + ',92 Z';
    }

    function face() {
      var s = '';
      // 眉
      if (damage > 55) {
        s += '<path d="M78,36 L90,41" stroke="#4a3728" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
             '<path d="M122,36 L110,41" stroke="#4a3728" stroke-width="2.6" stroke-linecap="round" fill="none"/>';
      } else if (damage > 25) {
        s += '<path d="M79,38 L90,39" stroke="#4a3728" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
             '<path d="M121,38 L110,39" stroke="#4a3728" stroke-width="2.6" stroke-linecap="round" fill="none"/>';
      } else {
        s += '<path d="M79,37 Q84.5,34 90,37" stroke="#4a3728" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
             '<path d="M121,37 Q115.5,34 110,37" stroke="#4a3728" stroke-width="2.6" stroke-linecap="round" fill="none"/>';
      }
      // 目
      if (damage > 70) {
        s += '<path d="M81,45 L89,51 M89,45 L81,51" stroke="#3a2c22" stroke-width="2.2" stroke-linecap="round"/>' +
             '<path d="M111,45 L119,51 M119,45 L111,51" stroke="#3a2c22" stroke-width="2.2" stroke-linecap="round"/>';
      } else if (damage > 40) {
        s += '<path d="M80,48 Q85,44 90,48" stroke="#3a2c22" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
             '<path d="M110,48 Q115,44 120,48" stroke="#3a2c22" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
      } else {
        s += '<ellipse cx="85" cy="47" rx="3.1" ry="3.4" fill="#3a2c22"/>' +
             '<ellipse cx="115" cy="47" rx="3.1" ry="3.4" fill="#3a2c22"/>';
      }
      // 目の下のクマ
      if (damage > 30) {
        var op = Math.min(0.5, damage / 180);
        s += '<path d="M79,53 Q85,57 91,53" stroke="#8a6a72" stroke-width="1.8" fill="none" opacity="' + op + '"/>' +
             '<path d="M109,53 Q115,57 121,53" stroke="#8a6a72" stroke-width="1.8" fill="none" opacity="' + op + '"/>';
      }
      // 鼻
      s += '<path d="M100,50 L100,57 Q102.5,58.5 104,57" stroke="#b98a6d" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
      // 口
      if (damage > 55) s += '<path d="M91,64 Q100,58 109,64" stroke="#8c4a44" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
      else if (damage > 25) s += '<path d="M91,63 L109,63" stroke="#8c4a44" stroke-width="2.4" stroke-linecap="round"/>';
      else s += '<path d="M91,61 Q100,67 109,61" stroke="#8c4a44" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
      // 赤ら顔
      s += '<ellipse cx="79" cy="55" rx="8" ry="5" fill="#e06a5a" opacity="' + flush + '"/>' +
           '<ellipse cx="121" cy="55" rx="8" ry="5" fill="#e06a5a" opacity="' + flush + '"/>';
      // 無精ひげ（40代らしさ）
      s += '<path d="M84,62 Q100,76 116,62 Q116,72 100,74 Q84,72 84,62 Z" fill="#5a4636" opacity="0.16"/>';
      return s;
    }

    function organOverlay() {
      if (!showOrgans) return '';
      function glow(on) { return on ? '1' : '0.28'; }
      var s = '<g class="organs">';
      // 肝臓（正面から見て左側＝本人の右側）
      s += '<path d="M' + (100 - wx * 0.82) + ',140 Q' + (100 - wx * 0.2) + ',132 ' + (100 + wx * 0.28) + ',144' +
           ' Q' + (100 + wx * 0.1) + ',163 ' + (100 - wx * 0.5) + ',162' +
           ' Q' + (100 - wx * 0.9) + ',158 ' + (100 - wx * 0.82) + ',140 Z"' +
           ' fill="#9b3b2e" opacity="' + glow(organs.liver) + '" class="organ organ-liver"/>';
      // 胃
      s += '<path d="M' + (100 + wx * 0.15) + ',146 q14,-4 16,10 q2,14 -12,17 q-12,2 -12,-10 q0,-11 8,-17 z"' +
           ' fill="#c46a5a" opacity="' + glow(organs.stomach) + '" class="organ organ-stomach"/>';
      // 腸
      s += '<ellipse cx="100" cy="188" rx="' + (wx * 0.75) + '" ry="13" fill="#b9705f" opacity="' + glow(organs.gut) + '" class="organ organ-gut"/>';
      // 心臓
      s += '<path d="M104,112 q6,-8 12,0 q6,9 -12,20 q-18,-11 -12,-20 q6,-8 12,0 z" fill="#d1453f" opacity="' + glow(organs.heart) + '" class="organ organ-heart"/>';
      // 脳
      s += '<ellipse cx="100" cy="40" rx="20" ry="16" fill="#c98aa8" opacity="' + glow(organs.brain) + '" class="organ organ-brain"/>';
      s += '</g>';
      return s;
    }

    var svg =
      '<svg viewBox="0 0 200 320" class="avatar-svg" role="img" aria-label="主人公のからだ">' +
      '<defs>' +
        '<linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#5c6f86"/><stop offset="100%" stop-color="#42536a"/>' +
        '</linearGradient>' +
      '</defs>' +
      // 脚
      '<path d="M' + (100 - hx + 3) + ',208 L' + (100 - 4) + ',208 L' + (100 - 6) + ',296 L' + (100 - hx + 5) + ',296 Z" fill="#3a4759"/>' +
      '<path d="M' + (100 + 4) + ',208 L' + (100 + hx - 3) + ',208 L' + (100 + hx - 5) + ',296 L' + (100 + 6) + ',296 Z" fill="#3a4759"/>' +
      '<rect x="' + (100 - hx + 2) + '" y="296" width="20" height="8" rx="4" fill="#26313f"/>' +
      '<rect x="' + (100 + hx - 22) + '" y="296" width="20" height="8" rx="4" fill="#26313f"/>' +
      // 腕
      '<path d="M' + (100 - sx + 2) + ',96 Q' + (100 - sx - 10) + ',140 ' + (100 - wx - 6) + ',186" stroke="' + skin + '" stroke-width="13" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + (100 + sx - 2) + ',96 Q' + (100 + sx + 10) + ',140 ' + (100 + wx + 6) + ',186" stroke="' + skin + '" stroke-width="13" fill="none" stroke-linecap="round"/>' +
      // 胴
      '<path d="' + torsoPath() + '" fill="url(#shirt)"/>' +
      // 内臓脂肪のふくらみ
      '<ellipse cx="100" cy="170" rx="' + (wx * 0.78) + '" ry="' + (16 + belly * 2.4) + '" fill="#000" opacity="' + (0.05 + belly * 0.022) + '"/>' +
      organOverlay() +
      // 首
      '<rect x="92" y="62" width="16" height="16" fill="' + skin + '"/>' +
      // 頭
      '<ellipse cx="100" cy="46" rx="24" ry="27" fill="' + skin + '"/>' +
      // 髪（生え際は少し後退）
      '<path d="M77,40 Q80,20 100,19 Q120,20 123,40 Q118,29 100,28 Q82,29 77,40 Z" fill="#3b2f27"/>' +
      '<path d="M76,46 Q74,34 78,30 L79,44 Z" fill="#3b2f27"/>' +
      '<path d="M124,46 Q126,34 122,30 L121,44 Z" fill="#3b2f27"/>' +
      face() +
      '</svg>';

    return svg;
  };

  /* ------------------------------------------------------------
     今夜これだけ飲んだら、体の中で何が起きるか
     ------------------------------------------------------------ */
  B.timeline = function (grams, profile, startHour) {
    var f = C.forecast(grams, profile, startHour);
    var w = (profile && profile.weight) || 70;
    var rate = C.metabolicRate(w);
    var start = startHour != null ? startHour : 20;
    var out = [];

    if (grams <= 0) {
      out.push({
        t: '今夜', organ: 'liver', level: 0, title: '肝臓が、ようやく本来の仕事に戻れます',
        body: 'アルコールが入っていない夜、肝臓はアルコールの解毒を最優先する状態から解放され、' +
              '脂肪やタンパク質の代謝、糖の貯蔵といった本来の仕事に戻ります。' +
              '睡眠も、麻酔で落とされるのではなく、自分の力で深いノンレム睡眠に入っていきます。'
      });
      return { forecast: f, items: out };
    }

    out.push({
      t: '飲み始めて 5〜10分', organ: 'stomach', level: 1,
      title: '胃の粘膜が、直接アルコールに触れています',
      body: '飲んだアルコールの約20%は胃から、残り約80%は小腸から吸収されます。' +
            '胃の粘膜はアルコールに直接さらされ、荒れやすい状態になります。空腹で飲めば、これが数倍速く進みます。'
    });

    out.push({
      t: '30分〜2時間後', organ: 'brain', level: 2,
      title: '血中アルコール濃度が最高 ' + f.peakBac.toFixed(2) + ' ‰ ／「' + f.stage.name + '」',
      body: f.stage.desc + ' 酔いは、脳が麻痺していく順番そのものです。' +
            'まず理性をつかさどる前頭葉、次に運動を司る小脳、最後に呼吸を司る脳幹。' +
            '「気持ちよく酔う」とは、脳の表面から順に麻酔がかかっていくということです。'
    });

    out.push({
      t: '一晩じゅう', organ: 'liver', level: 3,
      title: '肝臓が ' + f.hours.toFixed(1) + ' 時間、休みなく働きます',
      body: '体重' + w + 'kgのあなたの肝臓が1時間に分解できる純アルコールは、およそ ' + rate.toFixed(1) + 'g。' +
            '今夜の ' + f.grams + 'g を処理し終えるのは、' + f.soberLabel + 'ごろの見込みです。' +
            (f.hours > 8 ? 'つまり、朝起きた時点でもまだ、体の中にアルコールが残っています。' : '')
    });

    out.push({
      t: '分解の途中', organ: 'liver', level: 4,
      title: f.grams + 'g のアルコールは、すべて一度「アセトアルデヒド」に変わります',
      body: 'アルコールは、そのまま消えるのではありません。肝臓でまずアセトアルデヒドという物質に変えられます。' +
            'これは顔を赤くし、頭痛と吐き気を起こす原因物質であり、国際がん研究機関（IARC）が' +
            '「ヒトに対して発がん性がある（グループ1）」に分類している物質です。' +
            '日本人の約4割は、これを分解する酵素（ALDH2）の働きが生まれつき弱く、体内にとどまる時間が長くなります。'
    });

    out.push({
      t: '飲んでいる間ずっと', organ: 'body', level: 2,
      title: '水がおよそ ' + f.water + 'ml、体から余分に抜けていきます',
      body: 'アルコールは、腎臓に「水を再吸収しろ」と指示するホルモン（バソプレシン）を抑えます。' +
            '結果、飲んだ量より多くの水分が尿として出ていきます。今夜の見込みはコップ約' +
            Math.max(1, Math.round(f.water / 200)) + '杯分。' +
            '朝の頭痛と口の渇きの正体の、かなりの部分がこれです。'
    });

    if (grams >= 15) {
      out.push({
        t: '寝ついた 3〜4時間後', organ: 'brain', level: 4,
        title: '眠りが、いちばん深くなるはずの時間に分断されます',
        body: 'アルコールは寝つきを早くします。ここは事実です。しかし前半でアルコールが分解され切ると、' +
              '抑えられていたREM睡眠が後半に押し寄せ（反跳）、浅い眠りと中途覚醒が増えます。' +
              '深いノンレム睡眠は減り、成長ホルモンの分泌も落ちます。' +
              '「寝つきの良さ」と引き換えに、眠りの後半を丸ごと差し出しているのが寝酒です。'
      });
      out.push({
        t: '深夜 2〜4時ごろ', organ: 'heart', level: 3,
        title: '心拍が上がったまま、目が覚めます',
        body: 'アルコールは交感神経を優位にし、安静時の心拍数を数〜十数拍/分ほど押し上げます。' +
              '同時に利尿でトイレに起き、血糖も下がりやすい時間帯。' +
              '動悸と不安で目が覚めるのは、意志の弱さではなく、体に起きている生理現象です。'
      });
    }

    if (f.bacAt7 > 0.05) {
      out.push({
        t: '翌朝 7時の時点', organ: 'brain', level: 5,
        title: 'まだ血液の中に ' + f.bacAt7.toFixed(2) + ' ‰ 残っています',
        body: '眠っている間も、アルコールは決まった速さでしか分解されません。' +
          (f.bacAt7 >= 0.3
            ? 'この計算上の濃度は、呼気に換算すると酒気帯び運転の基準（呼気1Lあたり0.15mg）に達しうる水準です。朝の運転はやめてください。'
            : '量としては多くありませんが、判断の速さや距離感は完全には戻っていません。') +
          ' あくまで平均的な分解速度で計算した目安ですが、「ひと晩寝たから抜けた」は体の中では成り立ちません。'
      });
    }

    if (grams >= 40) {
      out.push({
        t: '翌朝', organ: 'body', level: 5,
        title: '二日酔いは、3つのダメージの合計です',
        body: '① 残ったアセトアルデヒドの毒性 ② 脱水と電解質の乱れ ③ 分断された睡眠。' +
              'この3つが重なって、頭痛・吐き気・だるさになります。' +
              '「迎え酒」はアセトアルデヒドの生成を先送りするだけで、①を悪化させます。'
      });
    }

    if (grams >= 60) {
      out.push({
        t: 'これが続くと', organ: 'liver', level: 5,
        title: '1日60g以上を続けると、数週間で脂肪肝が進みます',
        body: '肝臓はアルコールの解毒を最優先するため、脂肪の代謝が後回しになり、肝細胞に中性脂肪がたまります。' +
              '脂肪肝そのものに自覚症状はほとんどありません。気づくのは、健康診断のγ-GTPやALTの数字か、' +
              'さらに進んで肝炎・肝硬変になってからです。'
      });
    }

    if (f.eq) {
      out.push({
        t: '体重計の上で', organ: 'body', level: 2,
        title: '純アルコール ' + f.grams + 'g だけで ' + Math.round(f.grams * AL.GUIDE.kcalPerGram) + 'kcal',
        body: 'アルコールは1gあたり7.1kcal。糖質やタンパク質のほぼ2倍です。' +
              'しかも体はこのカロリーを最優先で燃やすため、そのぶん脂肪が後回しになって蓄えられます。' +
              'つまみのカロリーは、この上に乗ります。'
      });
    }

    return { forecast: f, items: out };
  };

  /* 体の中の位置ラベル */
  B.organLabel = {
    brain: '脳', liver: '肝臓', heart: '心臓', stomach: '胃', gut: '腸', body: '全身'
  };
  B.organEmoji = {
    brain: '🧠', liver: '🫀', heart: '💓', stomach: '🫃', gut: '🌀', body: '🧍'
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AL;
})(typeof window !== 'undefined' ? window : globalThis);
