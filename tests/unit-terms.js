'use strict';
// 用語・通貨の統一（②）を固定する回帰テスト。
// ・報酬の単位はユーザー可視で「ポイント」に統一（'pt' 表記を使わない）
// ・クイズ報酬＝ポイント（⭐）／ガチャ通貨＝コイン（🪙）の役割は保つ
// ・タクトの主画面は「なかま」で統一（あいぼう/仲間の同一面混在をしない）
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-terms');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const srpgUi = fs.readFileSync(path.join(ROOT, 'js', 'srpg-ui.js'), 'utf8');

// ---- ユーザー可視の 'pt' 表記が残っていない（表示文脈のみ・rb-pt等のidや変数は対象外）----
const ptDisplayPatterns = ["'pt で ", "+'pt'", "'pt もらった", "+'pt ・", "＋30pt", "}pt<", "+'pt<", "pt🌺", "+'pt！", "}pt！"];
ptDisplayPatterns.forEach(function(p){
  c.ok("表示上の pt が消えている: " + p, html.indexOf(p) < 0 && srpgUi.indexOf(p) < 0);
});

// ---- 主要な報酬表示が「ポイント」になっている ----
c.ok('ログインボーナスはポイント表記', html.indexOf("+pts+'ポイント もらった！") >= 0);
c.ok('ミッション達成はポイント表記', html.indexOf("+m.pts+'ポイント ・ 🪙+12") >= 0);
c.ok('クエスト達成はポイント表記', html.indexOf("qd.pts+'ポイント'") >= 0);
c.ok('正解ふきだしはポイント表記', html.indexOf('${bonus}ポイント') >= 0);

// ---- 二重通貨の役割は保つ（ポイント＝学習報酬 ／ コイン＝ガチャ）----
c.ok('コイン通貨は健在（ガチャ用）', html.indexOf('コイン') >= 0 && srpgUi.indexOf('コイン') >= 0);

// ---- タクト主画面は「なかま」で統一（同一面のあいぼう/仲間混在を解消）----
c.ok('タクト編成は「なかま最大4」', srpgUi.indexOf('勇者＋なかま最大4') >= 0);
c.ok('タクト編成の空状態は「なかま」', srpgUi.indexOf('まだ なかまが いないよ') >= 0);
c.ok('なかまずかんの説明が「なかまにした」', srpgUi.indexOf('これまでに なかまにした モンスターの きろく') >= 0);
c.ok('タクト編成に「あいぼう最大4」の混在が無い', srpgUi.indexOf('勇者＋あいぼう最大4') < 0);

// ---- 偏差値の正直化（③B）：常時表示のElo＝「じつりょく」／本物の偏差値＝模試 ----
c.ok('クイズの常時表示は「じつりょく」', html.indexOf('<span class="qh-l">⚡じつりょく</span>') >= 0);
c.ok('クイズ常時表示に「偏差値」ラベルを使わない', html.indexOf('<span class="qh-l">⚡偏差値</span>') < 0);
c.ok('ハブチップは「じつりょく」', html.indexOf('📈 じつりょく <b>') >= 0);
c.ok('確定トーストは「じつりょく」', html.indexOf('じつりょくメーターが こうしん！') >= 0);
c.ok('結果画面は「じつりょくメーター」', html.indexOf('⚡ じつりょくメーター ') >= 0);
c.ok('練習メーターカードは「じつりょくメーター」', html.indexOf('⚡ じつりょくメーター <b class="pr-big">') >= 0);
// 本物の偏差値（模試ベース）は維持されている
c.ok('模試の偏差値（校正）は維持', html.indexOf('偏差値の校正') >= 0 && html.indexOf('calibOffset') >= 0);
c.ok('実模試入力の校正CTAがある', html.indexOf('function _calibCtaHtml') >= 0 && html.indexOf('本物の偏差値') >= 0);
c.ok('records偏差値65への道は模試ベース(rmHensachi/exam)を使う', html.indexOf("e.mode==='exam'&&typeof e.hensachi==='number'") >= 0);

c.done();
