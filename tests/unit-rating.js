'use strict';
// js/rating.js（れんしゅう偏差値＝Math Garden方式のElo変種）を検証。
// 期待正答率・K減衰・更新の性質（難問正解は大きく上がる／簡単正解はほぼ動かない）と、
// 決定的な乱数での収束シミュレーション（真の実力に寄っていくか）を確認する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-rating');

const code = fs.readFileSync(path.join(ROOT, 'js', 'rating.js'), 'utf8');
try { new Function(code)(); c.ok('rating.js 単体loadで例外なし', true); }
catch (e) { c.ok('rating.js 単体loadで例外なし: ' + e.message, false); }
const api = (new Function(code +
  '\nreturn { ratingItemDiff, ratingGuess, ratingExpected, ratingK, ratingStep, ratingOverallOf, ratingDelta7, ratingTier, ratingFuzzTier, RATING_START, hensaDispStep, HENSA_FIRST_N, HENSA_BATCH_N, HENSA_STEP_MAX };'))();

// ---- 難易度・当て推量 ----
c.eq('★=42', api.ratingItemDiff('★☆☆'), 42);
c.eq('★★=50', api.ratingItemDiff('★★☆'), 50);
c.eq('★★★=58', api.ratingItemDiff('★★★'), 58);
c.eq('★★★★=66', api.ratingItemDiff('★★★★'), 66);
c.eq('level無し=50', api.ratingItemDiff(''), 50);
c.eq('選択式の当て推量=0.25', api.ratingGuess('choice'), 0.25);
c.eq('記述式の当て推量=0', api.ratingGuess('free'), 0);

// ---- 期待正答率（IRT 1PL＋guessing）----
c.ok('同レベルなら5割（guess 0）', Math.abs(api.ratingExpected(50, 50, 0) - 0.5) < 1e-9);
c.ok('同レベル・4択なら6割強（0.25+0.75×0.5）', Math.abs(api.ratingExpected(50, 50, 0.25) - 0.625) < 1e-9);
c.ok('自分より12下の問題は約9割', api.ratingExpected(62, 50, 0) > 0.88 && api.ratingExpected(62, 50, 0) < 0.92);
c.ok('自分より12上の問題は約1割', api.ratingExpected(50, 62, 0) < 0.12);
c.ok('E は r について単調増加', api.ratingExpected(60, 50, 0) > api.ratingExpected(55, 50, 0));

// ---- K 減衰（最初は大きく、下限あり）----
c.ok('K は回答数で減る', api.ratingK(0) > api.ratingK(50) && api.ratingK(50) > api.ratingK(500));
c.ok('K の下限は 1.5（ずっと変動し続ける）', api.ratingK(100000) >= 1.5 && api.ratingK(100000) < 1.6);
c.ok('K の初期値は 6', Math.abs(api.ratingK(0) - 6) < 1e-9);

// ---- 更新の性質 ----
{
  const easyGain = api.ratingStep(60, 30, 42, true, 0.25) - 60;   // 格下★を正解
  const hardGain = api.ratingStep(60, 30, 66, true, 0.25) - 60;   // 格上★★★★を正解
  c.ok('難問正解のほうが大きく上がる', hardGain > easyGain * 3);
  c.ok('簡単問題の正解はほぼ動かない（+0.5未満）', easyGain >= 0 && easyGain < 0.5);
  const easyLoss = api.ratingStep(60, 30, 42, false, 0.25) - 60;  // 格下を間違える
  const hardLoss = api.ratingStep(60, 30, 66, false, 0.25) - 60;  // 格上を間違える
  c.ok('格下を落とすと大きく下がる', easyLoss < hardLoss && easyLoss < -1);
  c.ok('上下にクランプ（25〜80）', api.ratingStep(80, 0, 66, true, 0) <= 80 && api.ratingStep(25, 0, 42, false, 0) >= 25);
}

// ---- 収束シミュレーション（決定的LCG乱数・真の実力62の生徒）----
{
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const TRUE_R = 62;
  let r = 50, n = 0;
  const diffs = [42, 50, 58, 66];
  for (let i = 0; i < 300; i++) {
    const b = diffs[Math.floor(rnd() * 4)];
    const pTrue = api.ratingExpected(TRUE_R, b, 0.25);   // 真の実力での正答確率（4択）
    const correct = rnd() < pTrue;
    r = api.ratingStep(r, n, b, correct, 0.25); n++;
  }
  c.ok('300問で真の実力62±4に収束（実測 ' + r.toFixed(1) + '）', Math.abs(r - TRUE_R) <= 4);
  // 実力が落ちた場合（真の実力52に低下）にも追従して下がる
  const rBefore = r;
  for (let i = 0; i < 200; i++) {
    const b = diffs[Math.floor(rnd() * 4)];
    const correct = rnd() < api.ratingExpected(52, b, 0.25);
    r = api.ratingStep(r, n, b, correct, 0.25); n++;
  }
  c.ok('実力低下にも追従して下がる（' + rBefore.toFixed(1) + '→' + r.toFixed(1) + '）', r < rBefore - 3);
}

// ---- 全体値・7日差・ティア ----
c.eq('データ無しの全体値は50', api.ratingOverallOf({}), 50);
c.ok('全体値は回答数の重み付き平均', Math.abs(api.ratingOverallOf({ math: { r: 60, n: 100 }, english: { r: 50, n: 100 } }) - 55) < 0.01);
c.eq('7日差：履歴1件はnull', api.ratingDelta7({ '2026-7-14': 55 }, '2026-7-14'), null);
c.ok('7日差：上昇を検出', api.ratingDelta7({ '2026-7-7': 52, '2026-7-14': 55.5 }, '2026-7-14') === 3.5);
c.eq('ティア：46→基礎', api.ratingTier(46), 'basic');
c.eq('ティア：50→標準', api.ratingTier(50), 'std');
c.eq('ティア：58→応用', api.ratingTier(58), 'adv');
c.eq('ティア：65→難関', api.ratingTier(65), 'hard');

// ---- index.html 統合 ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は js/rating.js を読み込む', html.indexOf('<script src="js/rating.js') >= 0);
c.ok('onAnswered で更新（模試・家族もんだいは除外）', /if\(!isExam && !_familyDaily\)\{ try\{ if\(typeof ratingRecord/.test(html));
c.ok('MU_PER_USER に practice_rating 登録（ユーザー別保存・同期）', html.indexOf('practice_rating:1') >= 0);
c.ok('結果画面に変動表示', html.indexOf("id='result-rating'") >= 0 || html.indexOf('result-rating') >= 0);
c.ok('記録画面に実力メーターカード', html.indexOf('_practiceRatingHtml') >= 0);
c.ok('おまかせがレーティング連動', html.indexOf('ratingTier(ratingAreaR(area))') >= 0);
c.ok('適応出題ヘルパー(pickLeveled/adaptiveWant)がある', html.indexOf('function pickLeveled')>=0 && html.indexOf('function adaptiveWant')>=0);
c.ok('小学生の主練習が適応出題', html.indexOf('pickLeveled(function(){return genQuestion(area);}, adaptiveWant(_ar))')>=0);
c.ok('buildMixLeveledが適応出題', html.indexOf('pickLeveled(function(){return genFrom(gens);}, adaptiveWant(_ar))')>=0);
c.ok('模試は適応化しない（固定枠を維持）', html.indexOf('const quota=_examQuota(area)')>=0);
// ---- 確定偏差値（表示用バッチ更新）----
{
  c.eq('初回は20問で確定', api.HENSA_FIRST_N, 20);
  c.eq('以降は10問ごと', api.HENSA_BATCH_N, 10);
  // 19問目までは未確定（計測中）
  let d = { val:null, pend:0 };
  for(let i=0;i<19;i++){ const r=api.hensaDispStep(d, 55); c.ok('途中は未確定 '+(i+1)+'問目', !r.updated || i===19); d=r.disp; }
  c.ok('19問では まだ確定しない', d.val===null && d.pend===19);
  // 20問目で仮確定（初回はクランプなし＝そのままの値）
  const first = api.hensaDispStep(d, 58.4);
  c.ok('20問目で確定する', first.updated===true && first.disp.val===58.4 && first.disp.pend===0);
  c.ok('初回の prev は null', first.prev===null);
  // 以降は10問ごと・変動は±3まで
  d = first.disp;
  for(let i=0;i<9;i++){ const r=api.hensaDispStep(d, 70); c.ok('9問までは動かない', !r.updated); d=r.disp; }
  const up = api.hensaDispStep(d, 70);
  c.ok('10問目で更新・上げ幅は+3まで', up.updated===true && up.disp.val===58.4+3);
  const down = api.hensaDispStep({ val:50, pend:9 }, 30);
  c.ok('下げ幅も-3まで', down.updated===true && down.disp.val===47);
  const small = api.hensaDispStep({ val:50, pend:9 }, 51.23);
  c.ok('±3以内なら そのまま（丸めは0.1）', small.disp.val===51.2);
  c.ok('残り問数を返す', api.hensaDispStep({ val:50, pend:0 }, 50).left===9);
}

// ---- 確定偏差値の配線（HTML側）----
c.ok('MU_PER_USER に hensa_disp 登録', html.indexOf('hensa_disp:1') >= 0);
c.ok('解答時に hensaOnAnswer が呼ばれる', html.indexOf('hensaOnAnswer();') >= 0);
c.ok('上部バーが確定値を表示', html.indexOf('hd.val.toFixed(1)') >= 0);
const srpgUi = fs.readFileSync(path.join(ROOT, 'js', 'srpg-ui.js'), 'utf8');
c.ok('タクトの解答も実績にカウント', srpgUi.indexOf('hensaOnAnswer') >= 0);
// ---- 適応出題：実力→目標難易度（±1段ゆらぎ）----
{
  // rnd>=0.4 は ゆらぎなし＝素のtier
  c.eq('低実力(42)→basic（ゆらぎ無し）', api.ratingFuzzTier(42, 0.9), 'basic');
  c.eq('標準(50)→std（ゆらぎ無し）', api.ratingFuzzTier(50, 0.9), 'std');
  c.eq('やや上(60)→adv（ゆらぎ無し）', api.ratingFuzzTier(60, 0.9), 'adv');
  c.eq('高実力(66)→hard（ゆらぎ無し）', api.ratingFuzzTier(66, 0.9), 'hard');
  // rnd<0.2 は1段下、0.2<=rnd<0.4 は1段上
  c.eq('std から下ゆらぎ→basic', api.ratingFuzzTier(50, 0.1), 'basic');
  c.eq('std から上ゆらぎ→adv', api.ratingFuzzTier(50, 0.3), 'adv');
  // 端はクランプ（basicの下・hardの上は はみ出さない）
  c.eq('basicの下ゆらぎはbasicにクランプ', api.ratingFuzzTier(40, 0.1), 'basic');
  c.eq('hardの上ゆらぎはhardにクランプ', api.ratingFuzzTier(70, 0.3), 'hard');
}

c.done();
