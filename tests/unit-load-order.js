'use strict';
// index.html の <script> 読み込み順の“不変条件”を静的に検証する。
// 過去、モジュール分割で load順を崩すと load時に ReferenceError（例：generators が BANK を先に触る）
// になる事故があったため、依存順を機械的に守る。挙動には一切触れない静的チェック。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-load-order');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// 文書順に <script> を収集（src のパス、または inline を記録）
const scripts = [];
const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html))) {
  const srcM = /src=["']([^"'?]+)/.exec(m[1]);
  scripts.push(srcM ? { src: srcM[1] } : { inline: true, body: m[2] });
}

const order = scripts.map((s) => (s.src ? s.src : '(inline)'));
function idx(src) { return order.indexOf(src); }
const before = (a, b) => idx(a) >= 0 && idx(b) >= 0 && idx(a) < idx(b);

// 期待するモジュールが読み込まれていること
[
  'js/rpg-assets.js', 'js/rpg-world.js', 'js/aibou.js', 'js/chars.js', 'js/areas.js', 'js/cos-data.js',
  'js/subjects.js', 'js/questions-bank.js', 'js/questions-extra.js', 'js/generators.js', 'js/generators-hard.js', 'js/generators-plus.js', 'js/generators-listen.js', 'js/generators-graph.js',
  'js/audio.js', 'js/furigana.js', 'js/reading-ja.js', 'js/content-data.js', 'js/scoring.js',
  'js/ui-data.js', 'js/util.js', 'js/miss-types.js', 'js/coverage.js', 'js/rating.js', 'js/teach.js', 'js/reading-data.js', 'js/duel.js', 'js/family-daily.js', 'js/ranking.js', 'js/gacha-story.js', 'js/three.min.js', 'js/char3d.js', 'cloud-sync.js',
].forEach((f) => c.ok(f + ' を読み込んでいる', idx(f) >= 0));

// gacha-story.js は cos-data.js より後（ピックアップが COS_SETS を参照する）
c.ok('gacha-story.js は cos-data.js より後',
  before('js/cos-data.js', 'js/gacha-story.js'));

// char3d.js は three.min.js より後（THREE を使う）
c.ok('char3d.js は three.min.js より後（THREE を使う）',
  before('js/three.min.js', 'js/char3d.js'));

// 依存順の鉄則
c.ok('generators.js は questions-extra.js より後（load時に BANK を使う）',
  before('js/questions-extra.js', 'js/generators.js'));
c.ok('questions-extra.js は questions-bank.js より後',
  before('js/questions-bank.js', 'js/questions-extra.js'));
c.ok('generators-hard.js は generators.js より後（mathGens へ push する）',
  before('js/generators.js', 'js/generators-hard.js'));

// メインの inline <script>（大きい方）は全 js/ モジュールより後
const firstInline = scripts.findIndex((s) => s.inline && s.body.length > 2000);
const lastModule = Math.max(...scripts.map((s, i) => (s.src && s.src.indexOf('js/') === 0 ? i : -1)));
c.ok('メイン inline スクリプトは全 js/ モジュールより後', firstInline > lastModule);

// cloud-sync.js は（同期なので）js/ モジュール群より後に読む
c.ok('cloud-sync.js は js/generators.js より後', before('js/generators.js', 'cloud-sync.js'));

// cloud-sync.js は defer で読む（DOM構築後に走らせるため）
c.ok('cloud-sync.js は defer 付き', /<script\b[^>]*src=["']cloud-sync\.js[^>]*\bdefer/.test(html));

c.done();
