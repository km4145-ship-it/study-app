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
  '\nreturn { ratingItemDiff, ratingGuess, ratingExpected, ratingK, ratingStep, ratingOverallOf, ratingDelta7, ratingTier, RATING_START };'))();

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
c.ok('onAnswered で更新（模試は除外）', /if\(!isExam\)\{ try\{ if\(typeof ratingRecord/.test(html));
c.ok('MU_PER_USER に practice_rating 登録（ユーザー別保存・同期）', html.indexOf('practice_rating:1') >= 0);
c.ok('結果画面に変動表示', html.indexOf("id='result-rating'") >= 0 || html.indexOf('result-rating') >= 0);
c.ok('記録画面に実力メーターカード', html.indexOf('_practiceRatingHtml') >= 0);
c.ok('おまかせがレーティング連動', html.indexOf('ratingTier(ratingAreaR(area))') >= 0);
c.done();
