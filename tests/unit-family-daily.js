'use strict';
// js/family-daily.js（きょうの家族もんだい）を検証：
// 固定プールの健全性・日付シード選出の決定性・成績の取り出し・cloud-syncマージ・index統合。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-family-daily');

const code = fs.readFileSync(path.join(ROOT, 'js', 'family-daily.js'), 'utf8');
const api = (new Function(code + '\nreturn { FD_POOL, fdQuestions, fdResultFor };'))();

// ---- プール健全性 ----
c.ok('プールは40問', api.FD_POOL.length === 40);
['math', 'japanese', 'english', 'science', 'social'].forEach((a) => {
  c.ok(a + ' が8問', api.FD_POOL.filter((q) => q.area === a).length === 8);
});
api.FD_POOL.forEach((q, i) => {
  c.ok('#' + i + ' 4択で答え実在・重複なし', q.choices.length === 4 && new Set(q.choices).size === 4 && q.choices.includes(q.ans));
  c.ok('#' + i + ' 音声/図/本文なし（全端末・全学年で成立）', !q.listen && !q.figure && !q.passage);
  c.ok('#' + i + ' explainあり', !!q.explain);
});
{
  const qs = api.FD_POOL.map((q) => q.q);
  c.ok('問題文に重複なし', new Set(qs).size === qs.length);
}

// ---- 日付シード選出：決定的・5問・重複なし・コピー（元データを汚さない）----
{
  const a = api.fdQuestions('2026-07-16');
  const b = api.fdQuestions('2026-07-16');
  c.ok('同じ日は同じ5問', JSON.stringify(a.map((q) => q.q)) === JSON.stringify(b.map((q) => q.q)));
  c.ok('5問・重複なし', a.length === 5 && new Set(a.map((q) => q.q)).size === 5);
  const d2 = api.fdQuestions('2026-07-17');
  c.ok('日が変われば変わりうる（別日で非同一）', JSON.stringify(a.map((q) => q.q)) !== JSON.stringify(d2.map((q) => q.q)));
  a[0].q = '書きかえテスト';
  c.ok('返り値はコピー（プールを汚さない）', api.fdQuestions('2026-07-16')[0].q !== '書きかえテスト');
  c.ok('type=choiceが付与される', b.every((q) => q.type === 'choice'));
}

// ---- 成績の取り出し ----
c.ok('当日の成績を取り出せる', JSON.stringify(api.fdResultFor('{"date":"2026-07-16","correct":4,"total":5}', '2026-07-16')) === '{"correct":4,"total":5}');
c.ok('別の日はnull', api.fdResultFor('{"date":"2026-07-15","correct":4,"total":5}', '2026-07-16') === null);
c.ok('壊れたJSONはnull', api.fdResultFor('{bad', '2026-07-16') === null);
c.ok('未挑戦(null)はnull', api.fdResultFor(null, '2026-07-16') === null);

// ---- cloud-sync の mergeDailyFamily ----
{
  const cs = fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8');
  const s = cs.indexOf('function mergeDailyFamily(');
  const endMarker = "}catch(e){ return b||a; } }";
  const merge = (new Function(cs.slice(s, cs.indexOf(endMarker, s) + endMarker.length) + '\nreturn mergeDailyFamily;'))();
  const A = JSON.stringify({ date: '2026-07-16', correct: 3, total: 5 });
  const B = JSON.stringify({ date: '2026-07-16', correct: 5, total: 5 });
  c.ok('同じ日はベスト（max）', JSON.parse(merge(A, B)).correct === 5);
  const old = JSON.stringify({ date: '2026-07-15', correct: 5, total: 5 });
  c.ok('別の日は新しい日付が勝つ', JSON.parse(merge(old, A)).date === '2026-07-16');
  c.ok('cloud-syncがdaily_familyを振り分け', cs.indexOf("/:daily_family$/") >= 0);
}

// ---- index.html 統合 ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('読込タグあり', html.indexOf('<script src="js/family-daily.js') >= 0);
c.ok('家族画面にカード（startFamilyDaily）', html.indexOf('startFamilyDaily()') >= 0);
c.ok('結果記録フック（_familyDailyRecord）', html.indexOf('_familyDailyRecord()') >= 0);
c.ok('MU_PER_USERにdaily_family登録', /var MU_PER_USER = \{[^}]*daily_family:1/.test(html));
c.ok('教科混合＝レートを汚さないガード', html.indexOf('!isExam && !_familyDaily') >= 0);
c.done();
