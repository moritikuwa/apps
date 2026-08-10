/* ============================================================
   1ファイル完結版をつくる
     node build.js
   → yoilog-standalone.html （CSSもJSも全部埋め込んだ1枚）

   スマホやPCに1ファイル置くだけで使いたいとき用。
   （通常版の index.html と中身は同じで、サービスワーカーだけ外してあります）
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const css = read('assets/style.css');
const scripts = ['data', 'calc', 'store', 'stats', 'body', 'charts', 'app']
  .map((n) => read('assets/' + n + '.js'));

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
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, '')
  .replace(/\s*<script>\s*\/\/ ファイルを直接開いたとき[\s\S]*?<\/script>/, '');

// アイコンはデータURIで入れておく（タブに表示される）
const icon = read('assets/icon.svg').replace(/\s+/g, ' ').trim();
html = html.replace(
  '<link rel="stylesheet"',
  '<link rel="icon" href="data:image/svg+xml,' + encodeURIComponent(icon) + '">\n<link rel="stylesheet"'
);

// JS を埋め込む
html = html.replace(
  /(\s*<script src="assets\/\w+\.js"><\/script>)+/,
  '\n' + scripts.map((s) => '<script>\n' + s + '\n</script>').join('\n') + '\n'
);

const out = path.join(root, 'yoilog-standalone.html');
fs.writeFileSync(out, html);
console.log('できました:', out, '(' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
