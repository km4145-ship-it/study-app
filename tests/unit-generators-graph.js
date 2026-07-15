'use strict';
// js/generators-graph.js（図表・グラフ読み取り）を検証。
// 各ジェネレータを120回まわし、有限値・答えが選択肢内・figureが正しいSVGであることを実測する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-generators-graph');

const code = fs.readFileSync(path.join(ROOT, 'js', 'generators-graph.js'), 'utf8');
const mathGens = [], sciGens = [], socGens = [];
(new Function('mathGens', 'sciGens', 'socGens', 'shuffleArr', code))(
  mathGens, sciGens, socGens, (a) => a.slice().sort(() => 0.5 - Math.random()));

c.ok('mathに2種・sciに2種・socに1種', mathGens.length === 2 && sciGens.length === 2 && socGens.length === 1);

function validSVG(fig) {
  return typeof fig === 'string' && fig.indexOf('<svg') === 0 && fig.lastIndexOf('</svg>') === fig.length - 6
    && fig.indexOf('#67e8f9') >= 0 && fig.indexOf('#f59e0b') >= 0;   // 既存の図つき問題と同じ配色
}
[['math', mathGens], ['sci', sciGens], ['soc', socGens]].forEach(([name, gens]) => {
  gens.forEach((gen, gi) => {
    for (let i = 0; i < 120; i++) {
      const q = gen();
      const ok = q && q.q && validSVG(q.figure)
        && Array.isArray(q.choices) && q.choices.length === 4 && new Set(q.choices).size === 4
        && q.choices.includes(q.ans)
        && /グラフ|資料/.test(q.sub) && ['★★☆', '★★★'].includes(q.level) && !!q.explain;
      if (!ok) { c.ok(name + '#' + gi + ' 生成が不正: ' + JSON.stringify(q && { q: q.q, ans: q.ans, choices: q.choices }).slice(0, 160), false); break; }
      if (i === 119) c.ok(name + '#' + gi + ' 120回生成すべて健全（SVG図・4択・答え実在）', true);
    }
  });
});

// 差の計算問題：答えが実際に図中の値の差になっているか（値ラベルから逆算して検証）
{
  for (let i = 0; i < 60; i++) {
    const q = mathGens[1]();
    const nums = (q.figure.match(/>(\d+)(?:人|さつ|こ)</g) || []).map((s) => parseInt(s.slice(1), 10));
    const m = q.q.match(/「(.+?)」と「(.+?)」/);
    const labels = (q.figure.match(/fill="#64748b">([^<]+)</g) || []).map((s) => s.replace(/.*>/, '').replace('<', ''));
    if (nums.length === 4 && m) {
      const li = labels.indexOf(m[1]), lj = labels.indexOf(m[2]);
      if (li >= 0 && lj >= 0) {
        const expect = Math.abs(nums[li] - nums[lj]);
        if (String(expect) !== q.ans) { c.ok('差の答えが図と一致しない: ' + q.q + ' ans=' + q.ans + ' 図=' + expect, false); break; }
      }
    }
    if (i === 59) c.ok('差の計算60回：答えが図中の値の差と一致', true);
  }
}

// index.html 統合
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('読込タグ（generators.jsの後）', html.indexOf('js/generators-graph.js') > html.indexOf('js/generators.js'));
c.done();
