'use strict';
/* 本番用ビルド：index.html の全スクリプト(js/*.js＋インライン＋cloud-sync.js)を
   “読み込み順どおり結合”し、空白/構文だけ圧縮（識別子はリネームしない＝onclickの
   グローバル関数名を壊さない）。CSSも圧縮。出力は dist/。挙動は現状と同一。 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ESB = path.join(ROOT, 'node_modules', '.bin', 'esbuild');
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
const STYLE_RE = /<style\b([^>]*)>([\s\S]*?)<\/style>/g;

function minifyJs(src) {
  const tmp = path.join(DIST, '_tmp.js');
  fs.writeFileSync(tmp, src);
  const out = path.join(DIST, '_tmp.min.js');
  // --minify-whitespace/--minify-syntax のみ（--minify-identifiers はしない＝グローバル名を保全）
  execFileSync(ESB, [tmp, '--minify-whitespace', '--minify-syntax', '--charset=utf8', '--legal-comments=none', '--outfile=' + out]);
  const min = fs.readFileSync(out, 'utf8');
  fs.unlinkSync(tmp); fs.unlinkSync(out);
  return min;
}
function minifyCss(src) {
  const tmp = path.join(DIST, '_tmp.css');
  fs.writeFileSync(tmp, src);
  const min = execFileSync(ESB, [tmp, '--minify', '--charset=utf8'], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  return min.trim();
}
function assertParses(label, code) {
  try { new Function(code); } catch (e) { console.error('✗ ' + label + ' が構文エラー: ' + e.message); process.exit(1); }
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// 1) スクリプトを文書順に集める
//    ★ js/three.min.js（約700KB・更新されない）はバンドルに入れず“別チャンク”にする。
//      デプロイのたびに変わるのは app.min.js だけになり、three はブラウザキャッシュが効き続ける
//      ＝更新後の再ダウンロード量が半分以下になる（子供の端末・回線ほど効く）。
const parts = [];
let threeSrc = null;
let m;
SCRIPT_RE.lastIndex = 0;
while ((m = SCRIPT_RE.exec(html))) {
  const srcM = /src=["']([^"']+)["']/.exec(m[1]);
  if (srcM) {
    const src = srcM[1].split('?')[0];
    if (src === 'js/three.min.js') { threeSrc = fs.readFileSync(path.join(ROOT, src), 'utf8'); continue; }
    parts.push('/* ' + src + ' */\n' + fs.readFileSync(path.join(ROOT, src), 'utf8'));
  }
  else { parts.push('/* inline */\n' + m[2]); }
}
const bundle = parts.join('\n;\n');
assertParses('結合バンドル', bundle);
const minJs = minifyJs(bundle);
assertParses('圧縮後バンドル', minJs);
fs.writeFileSync(path.join(DIST, 'app.min.js'), minJs);

// 2) CSS を圧縮して差し替え
html = html.replace(STYLE_RE, (full, attrs, css) => '<style' + attrs + '>' + minifyCss(css) + '</style>');

// 3) 全<script>を除去し、末尾に単一バンドルを1つだけ挿入
//    ★キャッシュ破棄の ?v は「バンドルの内容ハッシュ」にする。
//      SWは無効なので ?v が唯一のキャッシュ制御。内容が1バイトでも変われば必ず新URLになり、
//      端末は確実に新版を読む（＝「配信したのに古いまま」を根絶）。内容不変なら同一URLで無駄DLなし。
html = html.replace(SCRIPT_RE, '');
const crypto = require('crypto');
const sha12 = (s) => 'h' + crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const ver = sha12(minJs);
// 🔄 自動更新用：配信版のハッシュを version.json に出力。アプリが no-store で照合し、
//    実行中の app.min.js?<ver> と違えば「新版あり」→キャッシュ回避で自動リロードする。
fs.writeFileSync(path.join(DIST, 'version.json'), JSON.stringify({ v: ver }));
// three チャンク（app.min.js より先に読む＝バンドル内の char3d が実行時に THREE を使う）
let threeTag = '';
if (threeSrc) {
  fs.writeFileSync(path.join(DIST, 'three.min.js'), threeSrc);
  threeTag = '  <script src="three.min.js?' + sha12(threeSrc) + '"></script>\n';
}
html = html.replace('</body>', threeTag + '  <script src="app.min.js?' + ver + '"></script>\n</body>');
fs.writeFileSync(path.join(DIST, 'index.html'), html);

// 4) 静的アセットをコピー
['manifest.webmanifest', 'sw.js'].forEach((f) => { const p = path.join(ROOT, f); if (fs.existsSync(p)) fs.copyFileSync(p, path.join(DIST, f)); });
if (fs.existsSync(path.join(ROOT, 'icons'))) {
  fs.mkdirSync(path.join(DIST, 'icons'), { recursive: true });
  for (const f of fs.readdirSync(path.join(ROOT, 'icons'))) fs.copyFileSync(path.join(ROOT, 'icons', f), path.join(DIST, 'icons', f));
}
// assets/（BGM音源など、実行時にパス参照される静的ファイル）を丸ごとコピー
if (fs.existsSync(path.join(ROOT, 'assets'))) fs.cpSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
// legal/（プライバシーポリシー・利用規約・特商法・サポート。公開URLで参照＝ストア審査に必須）
if (fs.existsSync(path.join(ROOT, 'legal'))) fs.cpSync(path.join(ROOT, 'legal'), path.join(DIST, 'legal'), { recursive: true });
// js/vendor/（vendor化したFirebase Compat SDK。three.min.jsと同じく素通しコピー・バンドル非対象）
if (fs.existsSync(path.join(ROOT, 'js', 'vendor'))) fs.cpSync(path.join(ROOT, 'js', 'vendor'), path.join(DIST, 'js', 'vendor'), { recursive: true });

const kb = (n) => (n / 1024).toFixed(0) + 'KB';
console.log('✅ ビルド完了 dist/');
console.log('   スクリプト結合: ' + parts.length + '本 → app.min.js ' + kb(Buffer.byteLength(minJs)) + '（元 ' + kb(Buffer.byteLength(bundle)) + '）');
if (threeSrc) console.log('   別チャンク: three.min.js ' + kb(Buffer.byteLength(threeSrc)) + '（内容不変＝キャッシュ永続）');
console.log('   index.html: ' + kb(fs.statSync(path.join(DIST, 'index.html')).size));
