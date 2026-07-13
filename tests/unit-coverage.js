'use strict';
// js/coverage.js（もんだいカバレッジ・A2）を検証。
// - 単元マスターの整合（5教科・キーワード非空・単元名ユニーク）
// - covLevel / covMatchUnit / covAnalyze（純関数）
// - 実データ smoke：実バンク＋実ジェネレータで未分類が少なく、集計が回ること
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-coverage');

const code = fs.readFileSync(path.join(ROOT, 'js', 'coverage.js'), 'utf8');
try { new Function(code)(); c.ok('coverage.js 単体loadで例外なし', true); }
catch (e) { c.ok('coverage.js 単体loadで例外なし: ' + e.message, false); }
const api = (new Function(code + '\nreturn { COV_CURRICULUM, covLevel, covMatchUnit, covAnalyze };'))();

// ---- 単元マスターの整合 ----
const AREAS = ['math', 'japanese', 'english', 'science', 'social'];
AREAS.forEach((a) => {
  const us = api.COV_CURRICULUM[a];
  c.ok(a + ' のマスターがある（8単元以上）', Array.isArray(us) && us.length >= 8);
  const names = new Set(us.map((u) => u.u));
  c.ok(a + ' の単元名がユニーク', names.size === us.length);
  c.ok(a + ' の全単元にキーワードがある', us.every((u) => Array.isArray(u.k) && u.k.length > 0 && u.k.every((k) => typeof k === 'string' && k.length > 0)));
});

// ---- covLevel ----
c.eq('★☆☆→1', api.covLevel('★☆☆'), 1);
c.eq('★★☆→2', api.covLevel('★★☆'), 2);
c.eq('★★★★→4', api.covLevel('★★★★'), 4);
c.eq('空→0', api.covLevel(''), 0);
c.eq('null→0', api.covLevel(null), 0);

// ---- covMatchUnit（先に書いた単元が勝つ）----
{
  const units = [ { u:'A', k:['りんご'] }, { u:'B', k:['ご'] } ];
  c.eq('部分一致で分類', api.covMatchUnit(units, 'りんごの問題'), 0);
  c.eq('先勝ち（Bにも合うがAが先）', api.covMatchUnit(units, 'りんご'), 0);
  c.eq('後の単元にだけ合う', api.covMatchUnit(units, 'いちご'), 1);
  c.eq('どれにも合わない→-1', api.covMatchUnit(units, 'バナナ'), -1);
  c.eq('空sub→-1', api.covMatchUnit(units, ''), -1);
}
c.eq('実マスター：二次方程式（平方根）は二次方程式に入る（順序が命）',
  api.COV_CURRICULUM.math[api.covMatchUnit(api.COV_CURRICULUM.math, '二次方程式（平方根）')].u, '二次方程式');

// ---- covAnalyze（合成データ）----
{
  const units = [ { u:'たし算', k:['たし'] }, { u:'ひき算', k:['ひき'] }, { u:'かけ算', k:['かけ'] } ];
  const items = [
    { sub:'たし算（基礎）', level:'★☆☆' }, { sub:'たし算（応用）', level:'★★★' },
    { sub:'ひき算', level:'★★☆' },
    { sub:'なぞの単元', level:'★☆☆' }
  ];
  const r = api.covAnalyze(items, units);
  c.eq('total は全件', r.total, 4);
  c.eq('たし算=2件', r.units[0].count, 2);
  c.eq('レベル内訳（★1が1件）', r.units[0].byLevel[1], 1);
  c.eq('レベル内訳（★3が1件）', r.units[0].byLevel[3], 1);
  c.eq('穴＝かけ算', JSON.stringify(r.holes), '["かけ算"]');
  c.eq('うすい＝5件未満の2単元', JSON.stringify(r.thin.sort()), JSON.stringify(['たし算','ひき算'].sort()));
  c.eq('未分類を記録', r.unmatched['なぞの単元'], 1);
  c.eq('covered は穴以外', r.covered, 2);
  c.ok('空itemsでも例外なし', api.covAnalyze([], units).total === 0);
  c.ok('null itemsでも例外なし', api.covAnalyze(null, units).total === 0);
}

// ---- 実データ smoke（バンク＋ジェネレータ200回/教科）----
{
  const mods = ['js/subjects.js', 'js/questions-bank.js', 'js/questions-extra.js', 'js/generators.js', 'js/generators-hard.js']
    .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  const real = (new Function('muGradeBand', 'var currentArea="math";\n' + mods
    + '\nreturn { genQuestion: genQuestion, BANK: BANK, QUESTIONS: QUESTIONS };'))(() => 'jhs');
  AREAS.forEach((area) => {
    const items = [];
    try { const b = real.BANK[area]; if (b) [b.practice || [], b.exam || []].forEach((arr) => arr.forEach((q) => { if (q && q.sub) items.push({ sub: q.sub, level: q.level }); })); } catch (e) {}
    if (area === 'math') Object.keys(real.QUESTIONS).forEach((k) => { const u = real.QUESTIONS[k]; const arr = Array.isArray(u) ? u : ((u && u.questions) || []); arr.forEach((q) => { if (q && q.sub) items.push({ sub: q.sub, level: q.level }); }); });
    for (let i = 0; i < 200; i++) { try { const q = real.genQuestion(area); if (q && q.sub) items.push({ sub: q.sub, level: q.level }); } catch (e) { break; } }
    const r = api.covAnalyze(items, api.COV_CURRICULUM[area]);
    const unN = Object.keys(r.unmatched).reduce((s, k) => s + r.unmatched[k], 0);
    c.ok(area + '：100件以上を集計（実測 ' + r.total + '）', r.total >= 100);
    c.ok(area + '：半数以上の単元をカバー（実測 ' + r.covered + '/' + r.units.length + '）', r.covered >= r.units.length / 2);
    c.ok(area + '：未分類は10%以下（実測 ' + Math.round(unN / r.total * 100) + '%）', unN / r.total <= 0.10);
  });
}

// ---- index.html 統合 ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は js/coverage.js を読み込む', html.indexOf('<script src="js/coverage.js') >= 0);
c.ok('設定にカバレッジボタンがある', html.indexOf('showCoverage()') >= 0);
c.ok('showCoverage の実装がある', html.indexOf('function showCoverage()') >= 0);
c.done();
