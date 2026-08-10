/* ============================================================
   酔いログ / YOI-LOG   データ保存
   すべて端末の localStorage に保存。外部には一切送信しません。
   ============================================================ */
(function (root) {
  'use strict';

  var AL = root.AL || (root.AL = {});
  var KEY = 'yoilog.v1';

  var defaults = {
    profile: {
      name: '',
      age: 42,
      sex: 'male',
      weight: 74,
      height: 172,
      waist: 88,
      priceGoal: 0
    },
    days: {},   // 'YYYY-MM-DD' -> { drinks:[], reasons:[], spend, memo, morning:{...} }
    ui: { seenIntro: false }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var Store = AL.store = {
    data: clone(defaults),

    load: function () {
      try {
        var raw = root.localStorage && root.localStorage.getItem(KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          this.data = {
            profile: Object.assign(clone(defaults.profile), parsed.profile || {}),
            days: parsed.days || {},
            ui: Object.assign(clone(defaults.ui), parsed.ui || {})
          };
        }
      } catch (e) {
        console.warn('保存データを読み込めませんでした', e);
      }
      return this.data;
    },

    save: function () {
      try {
        root.localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) {
        alert('保存できませんでした。端末の空き容量やブラウザの設定をご確認ください。');
      }
    },

    /* 指定日のレコードを取得（無ければ空の型を返す） */
    day: function (ymd, create) {
      var d = this.data.days[ymd];
      if (!d && create) {
        d = this.data.days[ymd] = { drinks: [], reasons: [], spend: 0, memo: '', morning: null };
      }
      return d || { drinks: [], reasons: [], spend: 0, memo: '', morning: null };
    },

    setDay: function (ymd, patch) {
      var d = this.day(ymd, true);
      Object.assign(d, patch);
      this.save();
      return d;
    },

    /* 日付順に並べた配列（古い→新しい） */
    sortedDates: function () {
      return Object.keys(this.data.days).sort();
    },

    /* 直近 n 日分の日付（今日を含む・古い→新しい） */
    recentDates: function (n, endYmd) {
      var end = endYmd || AL.calc.today();
      var out = [];
      for (var i = n - 1; i >= 0; i--) out.push(AL.calc.addDays(end, -i));
      return out;
    },

    exportJson: function () {
      return JSON.stringify(this.data, null, 2);
    },

    importJson: function (text) {
      var parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !parsed.days) {
        throw new Error('酔いログのデータ形式ではありません');
      }
      this.data = {
        profile: Object.assign(clone(defaults.profile), parsed.profile || {}),
        days: parsed.days || {},
        ui: Object.assign(clone(defaults.ui), parsed.ui || {})
      };
      this.save();
      return this.data;
    },

    clearAll: function () {
      this.data = clone(defaults);
      this.save();
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AL;
})(typeof window !== 'undefined' ? window : globalThis);
