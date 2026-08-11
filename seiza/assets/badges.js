/* ============================================================
   AI星座 / SEIZA   印（しるし）

   集めるためのもの。ただし「押しただけ」では絶対に灯りません。
   条件はすべて、実際に手を動かした量か、本当に取り切った数に紐づいています。

     id     : 他とかぶらない名前
     icon   : 印の絵
     name   : 印の名前
     desc   : 灯る条件（灯る前から見える。目標として働く）
     hidden : true にすると、灯るまで名前も条件も伏せられる（？？？）
     check  : 灯る条件の判定。calc.badgeCtx() の値を受け取る
   ============================================================ */
(function (root) {
  'use strict';

  var SZ = root.SZ;

  SZ.BADGES = [
    { id: 'run1', icon: '👣', name: 'はじめの一歩',
      desc: '実行をはじめて記録した',
      check: function (c) { return c.runs >= 1; } },

    { id: 'fire3', icon: '🔥', name: '三日つづいた',
      desc: '実行を3日つづけて記録した',
      check: function (c) { return c.streak >= 3; } },

    { id: 'daily5', icon: '🎯', name: '今日の一手・五度',
      desc: '「今日の一手」を5回やり切った',
      check: function (c) { return c.daily >= 5; } },

    { id: 'run10', icon: '⚙️', name: '十回まわした',
      desc: '実行→確認→改善を10回まわした',
      check: function (c) { return c.runs >= 10; } },

    { id: 'fire7', icon: '🔥', name: '七日つづいた',
      desc: '実行を7日つづけて記録した',
      check: function (c) { return c.streak >= 7; } },

    { id: 'fix10', icon: '♻️', name: '自分の失敗表',
      desc: '改善を10件書き残した',
      check: function (c) { return c.fixes >= 10; } },

    { id: 'const1', icon: '🎓', name: 'ひとつ極めた',
      desc: 'ひとつの星座を、すべて★以上にした',
      check: function (c) { return c.complete >= 1; } },

    { id: 'teach10', icon: '🌟', name: '十を教えられる',
      desc: '🌟（人に教えられる）の星が10個になった',
      check: function (c) { return c.taught >= 10; } },

    { id: 'allfire', icon: '🌌', name: '全天に灯を',
      desc: 'すべての星座に、★をひとつ以上ともした',
      check: function (c) { return c.lit >= SZ.CONSTELLATIONS.length; } },

    { id: 'run50', icon: '🛠', name: '五十回まわした', hidden: true,
      desc: '実行→確認→改善を50回まわした',
      check: function (c) { return c.runs >= 50; } },

    { id: 'fire30', icon: '🔥', name: 'ひと月つづいた', hidden: true,
      desc: '実行を30日つづけて記録した',
      check: function (c) { return c.streak >= 30; } },

    { id: 'const3', icon: '🏛', name: '三つ極めた', hidden: true,
      desc: '三つの星座を、すべて★以上にした',
      check: function (c) { return c.complete >= 3; } },

    { id: 'crown', icon: '👑', name: '空をすべて灯した', hidden: true,
      desc: 'すべての星を★以上にした',
      check: function (c) { return c.remaining === 0; } }
  ];

})(window);
