'use strict';
// js/generators-plus.js（穴埋め増量ジェネレータ）を検証。
// 各ジェネレータを直接150回まわし、答えの妥当性（choice型は必ず選択肢に含まれる・重複なし）と
// sub 名がカバレッジ単元マスターに割り当たること（＝穴が埋まること）を確認する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-generators-plus');

const code = fs.readFileSync(path.join(ROOT, 'js', 'generators-plus.js'), 'utf8');

// 最小ヘルパー（generators.js と同じ契約）で単体ロード → push された関数を直接テスト
function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffleArr(arr) { return arr.slice().sort(() => Math.random() - 0.5); }
function numChoices(ans, opt) {
  const set = new Set([String(ans)]);
  let d = 1;
  while (set.size < 4) {
    let w = ans + ((d % 2) ? d : -d);
    if (opt && opt.positive && w <= 0) w = ans + d + 7;   // 正の値しばりでも必ず新候補が作れる（無限ループ防止）
    if (!set.has(String(w))) set.add(String(w));
    d++;
  }
  return { choices: shuffleArr([...set]), ans: String(ans) };
}
const gens = { mathGens: [], engGens: [], sciGens: [], socGens: [] };
(new Function('mathGens', 'engGens', 'sciGens', 'socGens', 'rint', 'pick', 'numChoices', 'shuffleArr', code))(
  gens.mathGens, gens.engGens, gens.sciGens, gens.socGens, rint, pick, numChoices, shuffleArr);

c.eq('数学に14種追加', gens.mathGens.length, 14);
c.eq('英語に9種追加', gens.engGens.length, 9);
c.eq('理科に9種追加', gens.sciGens.length, 9);
c.eq('社会に8種追加', gens.socGens.length, 8);

// 全ジェネレータ×150回：構造と答えの妥当性
const seenSubs = new Set();
Object.keys(gens).forEach((k) => {
  gens[k].forEach((g, idx) => {
    let ok = true, msg = '';
    for (let i = 0; i < 150; i++) {
      let q = null;
      try { q = g(); } catch (e) { ok = false; msg = '例外: ' + e.message; break; }
      if (!q || !q.q || q.ans == null || !q.sub || !q.level) { ok = false; msg = '欠落: ' + JSON.stringify(q).slice(0, 80); break; }
      if (!/^★+$/.test(q.level.replace(/☆/g, ''))) { ok = false; msg = 'level形式: ' + q.level; break; }
      seenSubs.add(q.sub);
      if (q.type === 'choice') {
        if (!Array.isArray(q.choices) || q.choices.length < 3) { ok = false; msg = 'choices不足'; break; }
        if (q.choices.indexOf(q.ans) < 0) { ok = false; msg = '正解が選択肢に無い: ' + q.ans + ' / ' + JSON.stringify(q.choices); break; }
        if (new Set(q.choices).size !== q.choices.length) { ok = false; msg = '選択肢重複: ' + JSON.stringify(q.choices); break; }
      }
    }
    c.ok(k + '[' + idx + '] 150回生成OK' + (msg ? '（' + msg + '）' : ''), ok);
  });
});

// 数学の計算問題の答えが数式どおりか（代表2種を決め打ち検証）
{
  // 三平方: choices の正解は必ず三平方の組
  const triples = ['5', '13', '17', '25', '10', '15', '29', '3', '4', '6', '8', '9', '12', '20', '21', '24'];
  let ok = true;
  for (let i = 0; i < 100; i++) { const q = gens.mathGens[10](); if (triples.indexOf(q.ans) < 0) { ok = false; break; } }
  c.ok('三平方（斜辺）の答えはピタゴラス数', ok);
}

// カバレッジ照合：新subが対象単元に割り当たり、狙った穴が埋まる
const cov = fs.readFileSync(path.join(ROOT, 'js', 'coverage.js'), 'utf8');
const covApi = (new Function(cov + '\nreturn { COV_CURRICULUM, covMatchUnit };'))();
const EXPECT = [
  ['math', '三平方の定理（斜辺）', '三平方の定理'],
  ['math', '二次関数（変化の割合）', '二次関数(y=ax²)'],
  ['math', '相似（面積比）', '相似'],
  ['math', '円周角（中心角との関係）', '円周角'],
  ['english', '未来表現（will）', '未来表現'],
  ['english', '不定詞・動名詞（使い分け）', '不定詞・動名詞'],
  ['english', '受動態（現在）', '受動態'],
  ['english', '現在完了（have/has）', '現在完了'],
  ['english', '現在完了（過去分詞）', '現在完了'],
  ['english', '受動態（過去）', '受動態'],
  ['english', '関係代名詞（who/which）', '関係代名詞'],
  ['science', '人体（消化のはたらき）', '動物・人体'],
  ['science', '遺伝の規則性（分離の法則）', '遺伝・生殖'],
  ['science', '天気（湿度の計算）', '天気'],
  ['social', '歴史・江戸時代（年号）', '歴史（近世）'],
  ['social', '歴史・明治以降（出来事）', '歴史（近現代）'],
  ['social', '公民・経済（税金）', '公民（経済）']
];
EXPECT.forEach((e) => {
  const units = covApi.COV_CURRICULUM[e[0]];
  const i = covApi.covMatchUnit(units, e[1]);
  c.ok(e[1] + ' → ' + e[2] + ' に分類（穴が埋まる）', i >= 0 && units[i].u === e[2]);
});

// index.html 統合
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html が generators-plus.js を読み込む', html.indexOf('<script src="js/generators-plus.js') >= 0);
c.ok('generators-hard.js より後に読み込む', html.indexOf('js/generators-hard.js') < html.indexOf('js/generators-plus.js'));
c.done();
