/* ============================================================
   酔いログ / YOI-LOG   マスタデータ
   お酒の種類・割り方・カクテル・記録項目・体内知識
   ============================================================ */
(function (root) {
  'use strict';

  var AL = root.AL || (root.AL = {});

  /* ------------------------------------------------------------
     お酒マスタ
     kind: 'ready'  = そのまま飲む（ビール・日本酒・ワイン・缶チューハイ等）
                      → 入力する ml は「飲む量そのもの」
           'spirit' = 原液を割って飲む（焼酎・ウイスキー・ジン等）
                      → 入力する ml は「原液の量」。割り材は別で足す
     abv    : 標準アルコール度数(%)
     sugarKcal100 : そのお酒 100ml のうち、アルコール以外に由来する
                    おおよそのカロリー(kcal)。糖質分。
                    総カロリー = 純アルコールg×7.1 + この分
     ------------------------------------------------------------ */
  AL.DRINKS = [
    { id: 'beer', name: 'ビール', emoji: '🍺', kind: 'ready', abv: 5, sugarKcal100: 12,
      serves: [
        { name: '中ジョッキ 500ml', ml: 500 },
        { name: '小ジョッキ 350ml', ml: 350 },
        { name: '缶 350ml', ml: 350 },
        { name: '缶 500ml', ml: 500 },
        { name: '小瓶 334ml', ml: 334 },
        { name: '中瓶 500ml', ml: 500 },
        { name: '大瓶 633ml', ml: 633 },
        { name: 'ピッチャー 1500ml', ml: 1500 }
      ] },

    { id: 'happoshu', name: '発泡酒・第三のビール', emoji: '🍺', kind: 'ready', abv: 5, sugarKcal100: 10,
      serves: [ { name: '缶 350ml', ml: 350 }, { name: '缶 500ml', ml: 500 }, { name: 'グラス 350ml', ml: 350 } ] },

    { id: 'sake', name: '日本酒', emoji: '🍶', kind: 'ready', abv: 15, sugarKcal100: 18,
      serves: [
        { name: 'おちょこ 30ml', ml: 30 },
        { name: 'グラス 120ml', ml: 120 },
        { name: '一合 180ml', ml: 180 },
        { name: '二合 360ml', ml: 360 },
        { name: '四合瓶 720ml', ml: 720 }
      ] },

    { id: 'shochu', name: '焼酎（乙類・本格）', emoji: '🍶', kind: 'spirit', abv: 25, sugarKcal100: 0,
      serves: [
        { name: '薄め 原液 60ml', ml: 60 },
        { name: 'ふつう 原液 90ml', ml: 90 },
        { name: '濃いめ 原液 120ml', ml: 120 },
        { name: '一合 原液 180ml', ml: 180 }
      ] },

    { id: 'shochu_ko', name: '焼酎（甲類・25度）', emoji: '🍶', kind: 'spirit', abv: 25, sugarKcal100: 0,
      serves: [ { name: '薄め 原液 60ml', ml: 60 }, { name: 'ふつう 原液 90ml', ml: 90 }, { name: '濃いめ 原液 120ml', ml: 120 } ] },

    { id: 'awamori', name: '泡盛', emoji: '🍶', kind: 'spirit', abv: 30, sugarKcal100: 0,
      serves: [ { name: '薄め 原液 60ml', ml: 60 }, { name: 'ふつう 原液 90ml', ml: 90 }, { name: '濃いめ 原液 120ml', ml: 120 } ] },

    { id: 'whisky', name: 'ウイスキー', emoji: '🥃', kind: 'spirit', abv: 40, sugarKcal100: 0,
      serves: [
        { name: 'シングル 30ml', ml: 30 },
        { name: 'ダブル 60ml', ml: 60 },
        { name: 'ハイボール用 45ml', ml: 45 },
        { name: '濃いめ 90ml', ml: 90 }
      ] },

    { id: 'brandy', name: 'ブランデー', emoji: '🥃', kind: 'spirit', abv: 40, sugarKcal100: 0,
      serves: [ { name: 'シングル 30ml', ml: 30 }, { name: 'ダブル 60ml', ml: 60 } ] },

    { id: 'gin', name: 'ジン', emoji: '🍸', kind: 'spirit', abv: 40, sugarKcal100: 0,
      serves: [ { name: 'シングル 30ml', ml: 30 }, { name: 'ダブル 45ml', ml: 45 } ] },

    { id: 'vodka', name: 'ウォッカ', emoji: '🍸', kind: 'spirit', abv: 40, sugarKcal100: 0,
      serves: [ { name: 'シングル 30ml', ml: 30 }, { name: 'ダブル 45ml', ml: 45 } ] },

    { id: 'rum', name: 'ラム', emoji: '🥃', kind: 'spirit', abv: 40, sugarKcal100: 0,
      serves: [ { name: 'シングル 30ml', ml: 30 }, { name: 'ダブル 45ml', ml: 45 } ] },

    { id: 'tequila', name: 'テキーラ', emoji: '🥃', kind: 'spirit', abv: 40, sugarKcal100: 0,
      serves: [ { name: 'ショット 30ml', ml: 30 }, { name: 'ダブル 60ml', ml: 60 } ] },

    { id: 'wine_red', name: 'ワイン（赤）', emoji: '🍷', kind: 'ready', abv: 12, sugarKcal100: 3,
      serves: [ { name: 'グラス 120ml', ml: 120 }, { name: '大きめグラス 180ml', ml: 180 }, { name: 'ハーフ 375ml', ml: 375 }, { name: 'ボトル 750ml', ml: 750 } ] },

    { id: 'wine_white', name: 'ワイン（白・スパークリング）', emoji: '🥂', kind: 'ready', abv: 12, sugarKcal100: 5,
      serves: [ { name: 'グラス 120ml', ml: 120 }, { name: 'フルート 100ml', ml: 100 }, { name: 'ボトル 750ml', ml: 750 } ] },

    { id: 'chuhai', name: '缶チューハイ・サワー', emoji: '🥫', kind: 'ready', abv: 5, sugarKcal100: 22,
      serves: [ { name: '缶 350ml', ml: 350 }, { name: '缶 500ml', ml: 500 } ] },

    { id: 'chuhai_strong', name: 'ストロング系チューハイ', emoji: '⚡', kind: 'ready', abv: 9, sugarKcal100: 18,
      serves: [ { name: '缶 350ml', ml: 350 }, { name: '缶 500ml', ml: 500 } ],
      warn: 'ストロング系500ml 1本＝純アルコール36g。中ジョッキ約2杯分が、たった1本に入っています。' },

    { id: 'lemon_sour', name: 'レモンサワー（店）', emoji: '🍋', kind: 'ready', abv: 6, sugarKcal100: 20,
      serves: [ { name: 'ジョッキ 350ml', ml: 350 }, { name: '大ジョッキ 500ml', ml: 500 }, { name: '濃いめ 350ml', ml: 350 } ] },

    { id: 'umeshu', name: '梅酒', emoji: '🫙', kind: 'ready', abv: 13, sugarKcal100: 82,
      serves: [ { name: 'ロック 60ml', ml: 60 }, { name: 'グラス 90ml', ml: 90 } ],
      warn: '梅酒は「甘い」ぶん糖質のカロリーがビールの数倍。酔いより先に内臓脂肪に効きます。' },

    { id: 'makgeolli', name: 'マッコリ', emoji: '🥛', kind: 'ready', abv: 6, sugarKcal100: 32,
      serves: [ { name: 'グラス 200ml', ml: 200 }, { name: 'ボトル 750ml', ml: 750 } ] },

    { id: 'shaoxing', name: '紹興酒', emoji: '🍶', kind: 'ready', abv: 16, sugarKcal100: 30,
      serves: [ { name: 'グラス 100ml', ml: 100 }, { name: '一合 180ml', ml: 180 } ] },

    { id: 'cocktail', name: 'カクテル（プリセットから）', emoji: '🍹', kind: 'cocktail', abv: 0, sugarKcal100: 0, serves: [] },

    { id: 'nonalc', name: 'ノンアルコール', emoji: '🫧', kind: 'ready', abv: 0, sugarKcal100: 15,
      serves: [ { name: '缶 350ml', ml: 350 }, { name: 'グラス 350ml', ml: 350 } ],
      praise: 'ノンアルは記録して大丈夫。「飲んだ気分」だけ取り出せた日は、肝臓にとっては休肝日です。' },

    { id: 'other', name: 'その他（自分で入力）', emoji: '❓', kind: 'ready', abv: 10, sugarKcal100: 10,
      serves: [ { name: '100ml', ml: 100 }, { name: '200ml', ml: 200 }, { name: '350ml', ml: 350 } ] }
  ];

  /* ------------------------------------------------------------
     割り方マスタ
     absorb : アルコールの吸収の速さの目安（1.0 が水割り基準）
     kcal100: 割り材 100ml あたりのカロリー
     ratio  : 原液1に対する割り材の標準比率
     ------------------------------------------------------------ */
  AL.WARI = [
    { id: 'none',    name: 'そのまま',     kcal100: 0,  ratio: 0, absorb: 1.00, note: '' },
    { id: 'straight',name: 'ストレート',   kcal100: 0,  ratio: 0, absorb: 1.15,
      note: '高い度数のまま胃の粘膜に触れます。粘膜が荒れやすく、吸収も速い飲み方。' },
    { id: 'rock',    name: 'ロック',       kcal100: 0,  ratio: 0.3, absorb: 1.10,
      note: '氷が溶けるまでは、ほぼストレートと同じ濃さです。' },
    { id: 'mizu',    name: '水割り',       kcal100: 0,  ratio: 3, absorb: 1.00,
      note: '一番おだやかな割り方。ただし薄めても、原液の量が同じなら体に入るアルコールは1gも減りません。' },
    { id: 'soda',    name: 'ソーダ割り',   kcal100: 0,  ratio: 3, absorb: 1.20,
      note: '炭酸は胃の動きを速め、アルコールが小腸へ早く送られます。同じ量でも酔いが速く立ち上がります。' },
    { id: 'oyu',     name: 'お湯割り',     kcal100: 0,  ratio: 3, absorb: 1.10,
      note: '温かい液体は胃からの移動が速く、酔いが早く回ります。「体が温まる」の正体は血管拡張で、放熱も進みます。' },
    { id: 'ocha',    name: '緑茶割り',     kcal100: 0,  ratio: 3, absorb: 1.05,
      note: 'カフェインで「酔いが醒めた気」になりますが、血中のアルコールは1mgも減っていません。' },
    { id: 'oolong',  name: 'ウーロン割り', kcal100: 0,  ratio: 3, absorb: 1.00, note: '' },
    { id: 'milk',    name: '牛乳割り',     kcal100: 61, ratio: 3, absorb: 0.80,
      note: '脂質とタンパク質で胃からの移動が遅れ、酔いはゆっくりになります。ただし総量は変わらず、割り材のカロリーが上乗せされます。' },
    { id: 'soymilk', name: '豆乳割り',     kcal100: 46, ratio: 3, absorb: 0.85,
      note: '牛乳割りと同じく吸収はおだやか。「体にいい割り材」でも、アルコールの害は割り引かれません。' },
    { id: 'cola',    name: 'コーラ割り',   kcal100: 45, ratio: 3, absorb: 1.20,
      note: '炭酸＋糖分。吸収は速く、カロリーも乗ります。' },
    { id: 'ginger',  name: 'ジンジャーエール割り', kcal100: 34, ratio: 3, absorb: 1.20, note: '' },
    { id: 'tonic',   name: 'トニック割り', kcal100: 35, ratio: 3, absorb: 1.20, note: '' },
    { id: 'juice',   name: 'ジュース割り', kcal100: 42, ratio: 3, absorb: 1.10,
      note: '甘さでアルコールの角が消え、飲むペースが上がりやすい割り方です。' },
    { id: 'calpis',  name: 'カルピス割り', kcal100: 46, ratio: 3, absorb: 1.10, note: '' },
    { id: 'yogurt',  name: 'ヨーグルト割り', kcal100: 62, ratio: 3, absorb: 0.85, note: '' },
    { id: 'hoji',    name: 'ほうじ茶・麦茶割り', kcal100: 0, ratio: 3, absorb: 1.00, note: '' }
  ];

  AL.RATIOS = [
    { id: 'r1', name: '1 : 1（濃いめ）', ratio: 1 },
    { id: 'r2', name: '1 : 2',           ratio: 2 },
    { id: 'r3', name: '1 : 3（標準）',   ratio: 3 },
    { id: 'r4', name: '1 : 4（薄め）',   ratio: 4 },
    { id: 'r6', name: '1 : 6（かなり薄め）', ratio: 6 }
  ];

  /* ------------------------------------------------------------
     カクテル・プリセット
     base: 使うお酒のid / baseMl: 原液量 / mixKcal: 割り材のカロリー合計
     ------------------------------------------------------------ */
  AL.COCKTAILS = [
    { id: 'highball',   name: 'ハイボール',        base: 'whisky', baseMl: 45, mixKcal: 0,  mixMl: 135, wari: 'soda' },
    { id: 'highball_k', name: 'ハイボール（濃いめ）', base: 'whisky', baseMl: 60, mixKcal: 0,  mixMl: 120, wari: 'soda' },
    { id: 'gintonic',   name: 'ジントニック',      base: 'gin',    baseMl: 45, mixKcal: 42, mixMl: 120, wari: 'tonic' },
    { id: 'moscow',     name: 'モスコミュール',    base: 'vodka',  baseMl: 45, mixKcal: 41, mixMl: 120, wari: 'ginger' },
    { id: 'screw',      name: 'スクリュードライバー', base: 'vodka', baseMl: 45, mixKcal: 50, mixMl: 120, wari: 'juice' },
    { id: 'cassis_or',  name: 'カシスオレンジ',    base: 'other',  baseMl: 45, abv: 20, mixKcal: 50, mixMl: 120, wari: 'juice' },
    { id: 'kahlua',     name: 'カルーアミルク',    base: 'other',  baseMl: 45, abv: 20, mixKcal: 73, mixMl: 120, wari: 'milk' },
    { id: 'cuba',       name: 'キューバリブレ',    base: 'rum',    baseMl: 45, mixKcal: 54, mixMl: 120, wari: 'cola' },
    { id: 'martini',    name: 'マティーニ',        base: 'gin',    baseMl: 60, mixKcal: 8,  mixMl: 15,  wari: 'straight' },
    { id: 'margarita',  name: 'マルガリータ',      base: 'tequila',baseMl: 45, mixKcal: 30, mixMl: 30,  wari: 'straight' },
    { id: 'mojito',     name: 'モヒート',          base: 'rum',    baseMl: 45, mixKcal: 40, mixMl: 120, wari: 'soda' },
    { id: 'longisland', name: 'ロングアイランドアイスティー', base: 'vodka', baseMl: 60, abv: 40, mixKcal: 60, mixMl: 120, wari: 'cola',
      warn: '4〜5種類のスピリッツが入る、見た目に反して最も強いカクテルのひとつです。' },
    { id: 'sours',      name: 'サワー（店の一般的なもの）', base: 'shochu_ko', baseMl: 60, mixKcal: 30, mixMl: 240, wari: 'soda' },
    { id: 'shandy',     name: 'シャンディガフ',    base: 'beer',   baseMl: 200, abv: 5, mixKcal: 60, mixMl: 150, wari: 'ginger' }
  ];

  /* ------------------------------------------------------------
     翌朝のダメージ項目（0〜3で記録）
     ------------------------------------------------------------ */
  AL.DAMAGE_ITEMS = [
    { id: 'headache',    name: '頭痛',            emoji: '🤕', organ: 'brain' },
    { id: 'nausea',      name: '吐き気・胃もたれ', emoji: '🤢', organ: 'stomach' },
    { id: 'fatigue',     name: 'だるさ・疲労感',   emoji: '🥱', organ: 'body' },
    { id: 'thirst',      name: '口の渇き',        emoji: '🏜️', organ: 'body' },
    { id: 'palpitation', name: '動悸・心拍が速い', emoji: '💓', organ: 'heart' },
    { id: 'diarrhea',    name: '下痢・腹の不調',   emoji: '🚽', organ: 'gut' },
    { id: 'blackout',    name: '記憶があいまい',   emoji: '🌀', organ: 'brain' },
    { id: 'motivation',  name: 'やる気が出ない',   emoji: '🪫', organ: 'brain' },
    { id: 'irritated',   name: 'イライラ・不安',   emoji: '😠', organ: 'brain' },
    { id: 'swelling',    name: '顔・脚のむくみ',   emoji: '🎈', organ: 'body' }
  ];

  AL.DAMAGE_LEVELS = ['なし', '少し', 'つらい', 'かなり'];

  /* 飲んだ理由 */
  AL.REASONS = [
    { id: 'habit',   name: '習慣・なんとなく', emoji: '🔁' },
    { id: 'sleep',   name: '寝るため',        emoji: '🌙' },
    { id: 'stress',  name: 'ストレス・嫌なことがあった', emoji: '💢' },
    { id: 'reward',  name: '自分へのご褒美',   emoji: '🎁' },
    { id: 'social',  name: '付き合い・会食',   emoji: '👥' },
    { id: 'happy',   name: '嬉しいことがあった', emoji: '🎉' },
    { id: 'lonely',  name: 'ひとりで手持ち無沙汰', emoji: '🪑' },
    { id: 'food',    name: '食事に合わせて',   emoji: '🍽️' }
  ];

  /* 寝つきの選択肢（分） */
  AL.LATENCY = [
    { v: 5,  name: '横になってすぐ（5分以内）' },
    { v: 15, name: '15分くらい' },
    { v: 30, name: '30分くらい' },
    { v: 60, name: '1時間くらい' },
    { v: 90, name: '1時間以上、なかなか寝つけない' }
  ];

  /* ------------------------------------------------------------
     基準値（厚生労働省「健康に配慮した飲酒に関するガイドライン」2024年2月 ほか）
     ------------------------------------------------------------ */
  AL.GUIDE = {
    moderate: 20,        // 節度ある適度な飲酒：1日平均 純アルコール約20g
    riskMale: 40,        // 生活習慣病のリスクを高める量（男性）40g/日以上
    riskFemale: 20,      // 同（女性）20g/日以上
    fattyLiver: 60,      // これを毎日続けると脂肪肝が進みやすいとされる目安
    colonRisk: 20,       // 大腸がんは1日20g程度から発症リスク上昇が指摘される
    kcalPerGram: 7.1,    // アルコール1gあたりのカロリー
    diuresisMlPerGram: 10 // アルコール1gあたり おおよそ10mlの余分な尿
  };

  /* 危険度バンド（1日の純アルコール量 g） */
  AL.BANDS = [
    { max: 0,   key: 'zero',   label: '休肝日',       color: '#3ba676' },
    { max: 20,  key: 'low',    label: '適量の範囲',   color: '#7cc06a' },
    { max: 40,  key: 'mid',    label: 'やや多い',     color: '#e0b341' },
    { max: 60,  key: 'high',   label: 'リスクを高める量', color: '#e07a3c' },
    { max: 100, key: 'vhigh',  label: '肝臓に負担が大きい', color: '#d94a4a' },
    { max: 1e9, key: 'danger', label: '危険域',       color: '#a02a58' }
  ];

  /* ------------------------------------------------------------
     相談・緊急情報
     ------------------------------------------------------------ */
  AL.HELP = {
    emergency: [
      '揺すっても、大声で呼んでも起きない',
      'いびきをかいて眠り込み、呼吸が浅い・不規則',
      '呼吸が10秒に1回以下、または止まる',
      '体が冷たい、顔が青白い・紫っぽい',
      '吐いたものが口に残ったまま眠っている'
    ],
    emergencyAction: [
      'ひとりにしない。目を離さない',
      '吐いたもので窒息しないよう、必ず横向きに寝かせる',
      '毛布などで保温する',
      '「寝かせておけば醒める」は間違い。迷ったら119番',
      '意識がはっきりしないときは、水も飲ませない'
    ],
    consult: [
      { name: 'お住まいの都道府県・政令市の精神保健福祉センター', note: 'アルコールの相談窓口。無料・匿名でも相談できます' },
      { name: '保健所', note: '本人だけでなく、家族からの相談も受け付けています' },
      { name: '全日本断酒連盟 / AA（アルコホーリクス・アノニマス）', note: '同じ問題を持つ人の集まり。見学だけでも参加できます' },
      { name: 'かかりつけ医・内科', note: 'まず血液検査（γ-GTP、AST/ALT）から。数字は嘘をつきません' }
    ]
  };

  AL.DISCLAIMER =
    'このアプリの数値は、一般に用いられている計算式にもとづく「目安」です。' +
    'アルコールの分解速度や体への影響には、体質（とくにALDH2の働き）・体調・服薬・持病によって大きな個人差があります。' +
    '医学的な診断や治療の代わりにはなりません。体調に不安があるときは、必ず医療機関に相談してください。';

  if (typeof module !== 'undefined' && module.exports) module.exports = AL;
})(typeof window !== 'undefined' ? window : globalThis);
