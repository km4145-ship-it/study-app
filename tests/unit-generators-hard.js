'use strict';
// js/generators-hard.js（難問★★★/★★★★・手続き生成／検証済み事実テーブル）を検証。
// 各難問を多数生成して「有効・答えが正しい形式・難易度が★★★以上」を確認。答えの計算/テーブルは
// 生成器内で確定するので、選択肢型は答えが選択肢に含まれ、記述型は空でないことを保証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-generators-hard');

const bank = fs.readFileSync(path.join(ROOT, 'js', 'questions-extra.js'), 'utf8');
const gen = fs.readFileSync(path.join(ROOT, 'js', 'generators.js'), 'utf8');
const hard = fs.readFileSync(path.join(ROOT, 'js', 'generators-hard.js'), 'utf8');

const api = (new Function('muGradeBand',
  bank + '\n' + gen +
  '\nvar _b={math:mathGens.length,science:sciGens.length,social:socGens.length,english:engGens.length,japanese:jpGens.length};\n' +
  hard +
  '\nreturn { gens:{math:mathGens,science:sciGens,social:socGens,english:engGens,japanese:jpGens}, before:_b, genQuestion };'))(() => 'jhs');

const subjects = ['math', 'science', 'social', 'english', 'japanese'];
subjects.forEach((sub) => {
  const arr = api.gens[sub], added = arr.length - api.before[sub];
  c.ok(sub + ' に難問が追加された（' + added + '個）', added >= 3);
  const hardGens = arr.slice(api.before[sub]);
  let ok = true, why = '';
  hardGens.forEach((g, gi) => {
    for (let i = 0; i < 120; i++) {
      let q;
      try { q = g(); } catch (e) { ok = false; why = 'gen#' + gi + ' 例外:' + e.message; break; }
      if (!q || typeof q.q !== 'string' || q.ans === undefined || q.ans === '') { ok = false; why = 'gen#' + gi + ' 無効'; break; }
      if (q.level !== '★★★' && q.level !== '★★★★') { ok = false; why = 'gen#' + gi + ' level=' + q.level; break; }
      if (q.type === 'choice') {
        if (!Array.isArray(q.choices) || q.choices.length !== 4 || new Set(q.choices).size !== 4) { ok = false; why = 'gen#' + gi + ' 選択肢不正'; break; }
        if (q.choices.map(String).indexOf(String(q.ans)) < 0) { ok = false; why = 'gen#' + gi + ' 答えが選択肢に無い'; break; }
      } else { // free
        if (typeof q.ans !== 'string' && typeof q.ans !== 'number') { ok = false; why = 'gen#' + gi + ' 記述の答え不正'; break; }
      }
      // 図(figure)があるなら正しいSVG文字列
      if (q.figure !== undefined && q.figure !== null) {
        if (typeof q.figure !== 'string' || q.figure.indexOf('<svg') !== 0 || q.figure.indexOf('</svg>') < 0) { ok = false; why = 'gen#' + gi + ' 図が不正SVG'; break; }
      }
    }
  });
  c.ok(sub + ' の難問がすべて有効（答えの形式・★★★以上）' + (ok ? '' : '：' + why), ok);
});

// genQuestion 経由で各教科から難関★★★★が実際に出る
subjects.forEach((sub) => {
  let seen = 0;
  for (let i = 0; i < 800; i++) { const q = api.genQuestion(sub); if (q && q.level === '★★★★') seen++; }
  c.ok(sub + '：genQuestion から★★★★が出現（' + seen + '/800）', seen > 0);
});

// 読み込み順
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は js/generators-hard.js を読み込む', html.indexOf('<script src="js/generators-hard.js') >= 0);
c.ok('読み込み順: generators-hard が generators の後', html.indexOf('js/generators.js') < html.indexOf('js/generators-hard.js'));

c.done();
