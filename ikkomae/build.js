/* ============================================================
   1ファイル完結版をつくる
     node build.js
   → ikkomae-standalone.html （CSSもJSも全部埋め込んだ1枚）

   スマホやPCに1ファイル置くだけで使いたいとき用。
   （通常版の index.html と中身は同じで、サービスワーカーだけ外してあります）

   --fragment <出力先> をつけると、<html>や<head>のない
   本文だけのかたまりを書き出します（ページに埋めこむとき用）。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const css = read('assets/style.css');
const scripts = ['themes', 'store', 'game', 'app'].map((n) => read('assets/' + n + '.js'));

let html = read('index.html');

// CSS を埋め込む
html = html.replace(
  /<link rel="stylesheet" href="assets\/style\.css">/,
  '<style>\n' + css + '\n</style>'
);

// 1ファイルでは使えないものを外す
html = html
  .replace(/\s*<link rel="manifest"[^>]*>/g, '')
  .replace(/\s*<link rel="icon"[^>]*>/g, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, '');

// アイコンはデータURIで入れておく（タブに表示される）
const icon = read('assets/icon.svg').replace(/\s+/g, ' ').trim();
html = html.replace(
  '<style>',
  '<link rel="icon" href="data:image/svg+xml,' + encodeURIComponent(icon) + '">\n<style>'
);

// JS を順番どおりに埋め込む
html = html.replace(
  /<script src="assets\/themes\.js"><\/script>[\s\S]*?<script src="assets\/app\.js"><\/script>/,
  scripts.map((s) => '<script>\n' + s + '\n</script>').join('\n')
);

// サービスワーカーは 1ファイルでは使えないので外す
html = html.replace(
  /\n\s*\/\* ここから 圏外用[\s\S]*?\/\* ここまで 圏外用 \*\//,
  ''
);

// タブに出る名前は短く
html = html.replace(/<title>[^<]*<\/title>/, '<title>いっこまえ</title>');

const fi = process.argv.indexOf('--fragment');
if (fi >= 0 && process.argv[fi + 1]) {
  // <html>/<head>/<body> を外して 中身だけにする
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  const keep = head
    .split('\n')
    .filter((l) => /<title>|<style>|<\/style>|<link rel="icon"/.test(l) || !/^\s*<(meta|link|\/?head)/.test(l))
    .join('\n');
  fs.writeFileSync(process.argv[fi + 1], keep.trim() + '\n' + body.trim() + '\n');
  console.log('→', process.argv[fi + 1]);
} else {
  const out = path.join(root, 'ikkomae-standalone.html');
  fs.writeFileSync(out, html);
  console.log('→ ikkomae-standalone.html  ' + Math.round(html.length / 1024) + 'KB');
}
