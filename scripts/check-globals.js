'use strict';
/* dist/ の健全性検証：
   本番ビルド(esbuild)は「空白/構文だけ圧縮・識別子はリネームしない」設定で、
   onclick 等のインラインハンドラから呼ぶグローバル関数名がそのまま残ることが“命綱”。
   もし将来 --minify-identifiers を付けたり、関数が結合から漏れたりすると、
   本番だけボタンが無反応になる（テストは緑のまま）＝最悪の事故。
   このスクリプトは dist/index.html のハンドラ属性から関数名を機械的に集め、
   dist/app.min.js に定義として残っているかを検証する。CIのビルドジョブで実行する。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const htmlPath = path.join(DIST, 'index.html');
const jsPath = path.join(DIST, 'app.min.js');

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }

if (!fs.existsSync(htmlPath) || !fs.existsSync(jsPath)) {
  fail('dist/ が見つからない。先に `npm run build` を実行すること。');
}

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

// 1) 単一バンドルが構文的に妥当か
try { new Function(js); } catch (e) { fail('app.min.js が構文エラー: ' + e.message); }

// 2) index.html は単一の app.min.js を1つだけ読み込む（他の<script src>が残っていない）
const srcTags = (html.match(/<script\b[^>]*\bsrc=/g) || []).length;
if (srcTags !== 1) fail('dist/index.html の <script src> が ' + srcTags + ' 個（期待は1）。ビルドの結合が壊れている可能性。');
if (!/<script\b[^>]*src="app\.min\.js/.test(html)) fail('dist/index.html が app.min.js を読み込んでいない。');

// 2b) キャッシュ破棄の ?v がバンドル内容ハッシュと一致すること。
//     SW無効環境では ?v が唯一のキャッシュ制御。ここが固定化すると「配信したのに古い版が
//     ブラウザに残り続ける」＝修正が永久に届かない最悪事故になる（過去に発生）。内容ハッシュを強制する。
const crypto = require('crypto');
const expectHash = 'h' + crypto.createHash('sha1').update(js).digest('hex').slice(0, 12);
const verM = html.match(/app\.min\.js\?([A-Za-z0-9]+)/);
if (!verM) fail('dist/index.html に app.min.js?<version> が無い。');
if (verM[1] !== expectHash) {
  fail('キャッシュ破棄バージョンがバンドル内容ハッシュと一致しない（実際=' + verM[1] + ' / 期待=' + expectHash +
    '）。build.js のバージョン付与が内容ハッシュでない可能性＝キャッシュが効かず古い版が配信され続ける。');
}

// 3) インラインイベントハンドラから呼ばれる識別子を機械的に収集
//    ※ ハンドラは静的HTMLだけでなく、JSのテンプレートリテラル内で動的生成される
//      もの（例：`<button onclick="rpgGachaDraw()">`）も多い。それらは dist/index.html には
//      現れず app.min.js の文字列として入る。取りこぼさないよう“ソース側”から集める。
const BUILTINS = new Set([
  'alert', 'confirm', 'prompt', 'if', 'for', 'while', 'do', 'return', 'function', 'event', 'this',
  'typeof', 'new', 'switch', 'catch', 'try', 'else', 'void', 'delete', 'in', 'of', 'yield', 'await',
  'console', 'window', 'document', 'parseInt', 'parseFloat', 'isNaN', 'Number', 'String', 'Boolean',
  'Array', 'Object', 'JSON', 'Math', 'Date', 'RegExp', 'Map', 'Set', 'Promise', 'setTimeout',
  'setInterval', 'clearTimeout', 'clearInterval', 'requestAnimationFrame', 'encodeURIComponent',
  'decodeURIComponent', 'localStorage', 'sessionStorage', 'navigator', 'location', 'history',
  'reload', 'getElementById', 'preventDefault', 'stopPropagation',
]);

const srcFiles = [path.join(ROOT, 'index.html')]
  .concat(fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js')).map((f) => path.join(ROOT, 'js', f)))
  .concat(fs.existsSync(path.join(ROOT, 'cloud-sync.js')) ? [path.join(ROOT, 'cloud-sync.js')] : []);

const names = new Set();
const attrDq = /\bon[a-z]+\s*=\s*"([^"]*)"/gi;   // ダブルクォート属性（テンプレ内含む）
const attrSq = /\bon[a-z]+\s*=\s*'([^']*)'/gi;    // シングルクォート属性（念のため）
const jsHref = /href\s*=\s*"javascript:([^"]*)"/gi;
const callRe = /([A-Za-z_$][\w$]*)\s*\(/g;
function harvest(text, re) {
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(text))) {
    let cm;
    callRe.lastIndex = 0;
    while ((cm = callRe.exec(m[1]))) names.add(cm[1]);
  }
}
for (const f of srcFiles) {
  const text = fs.readFileSync(f, 'utf8');
  harvest(text, attrDq);
  harvest(text, attrSq);
  harvest(text, jsHref);
}

// 4) 各名がバンドルに“定義として”残っているか（検証対象は build 出力の app.min.js）
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function isDefined(n) {
  const e = esc(n);
  return new RegExp('function ' + e + ' *\\(').test(js) ||        // function NAME(
    new RegExp('\\b' + e + '=(function|async|\\()').test(js) ||   // NAME=function / NAME=async / NAME=(
    new RegExp('\\b' + e + '=[A-Za-z_$]').test(js) ||             // NAME=expr（アロー代入など）
    new RegExp('(var|let|const|,) *' + e + '\\b').test(js) ||     // var/let/const NAME
    new RegExp('window\\.' + e + '\\b').test(js);                 // window.NAME=
}

const checked = [];
const missing = [];
for (const n of [...names].sort()) {
  if (BUILTINS.has(n)) continue;
  checked.push(n);
  if (!isDefined(n)) missing.push(n);
}

if (missing.length) {
  fail('圧縮後バンドルに定義が見つからないハンドラ関数（' + missing.length + '個）: ' + missing.join(', ') +
    '\n  → esbuild が識別子をリネームしていないか（--minify-identifiers を付けていないか）、' +
    'または該当関数が結合から漏れていないか確認すること。');
}

console.log('✅ dist健全性OK：ハンドラ関数 ' + checked.length + '個すべてが圧縮後も定義として生存 / バンドル構文OK / <script src>1本');
