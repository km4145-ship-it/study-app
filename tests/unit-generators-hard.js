'use strict';
// js/generators-hard.js（難問★★★/★★★★・手続き生成）を検証。
// 答えは計算で求めるので、各難問を多数生成して「有限整数・選択肢に含まれる・難易度が★★★以上」を確認。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-generators-hard');

const bank = fs.readFileSync(path.join(ROOT, 'js', 'questions-extra.js'), 'utf8');
const gen = fs.readFileSync(path.join(ROOT, 'js', 'generators.js'), 'utf8');
const hard = fs.readFileSync(path.join(ROOT, 'js', 'generators-hard.js'), 'utf8');

const api = (new Function('muGradeBand',
  bank + '\n' + gen + '\nvar _before=mathGens.length;\n' + hard +
  '\nreturn { mathGens, genQuestion, _before };'))(() => 'jhs');

const HARDN = api.mathGens.length - api._before;
c.ok('難問が mathGens に追加された（' + HARDN + '個）', HARDN >= 12);

// 追加された末尾HARDN個（＝難問）を1つずつ多数生成して検証
const hardGens = api.mathGens.slice(api._before);
let allOk = true, examples = [];
hardGens.forEach((g, gi) => {
  for (let i = 0; i < 120; i++) {
    let q;
    try { q = g(); } catch (e) { allOk = false; examples.push('gen#' + gi + ' 例外:' + e.message); break; }
    if (!q || typeof q.q !== 'string' || q.ans === undefined) { allOk = false; examples.push('gen#' + gi + ' 無効'); break; }
    if (q.level !== '★★★' && q.level !== '★★★★') { allOk = false; examples.push('gen#' + gi + ' level=' + q.level); break; }
    // 答えは有限な数
    const n = Number(q.ans);
    if (!isFinite(n)) { allOk = false; examples.push('gen#' + gi + ' ans非数:' + q.ans); break; }
    // 選択肢型は答えが選択肢に含まれ、4択で重複なし
    if (q.type === 'choice') {
      if (!Array.isArray(q.choices) || q.choices.length !== 4) { allOk = false; examples.push('gen#' + gi + ' 選択肢数' + (q.choices || []).length); break; }
      if (new Set(q.choices).size !== 4) { allOk = false; examples.push('gen#' + gi + ' 選択肢重複'); break; }
      if (q.choices.map(String).indexOf(String(q.ans)) < 0) { allOk = false; examples.push('gen#' + gi + ' 答えが選択肢に無い'); break; }
    }
  }
});
c.ok('全難問が有効（有限整数の答え・選択肢に含まれる・★★★以上）' + (allOk ? '' : '：' + examples.slice(0, 4).join(' / ')), allOk);

// genQuestion('math') 経由でも★★★★が実際に出る（難問がプールに入っている）
let hardSeen = 0;
for (let i = 0; i < 600; i++) { const q = api.genQuestion('math'); if (q && q.level === '★★★★') hardSeen++; }
c.ok('genQuestion(math) から難関★★★★が出現する（' + hardSeen + '/600）', hardSeen > 0);

// 読み込み順：generators-hard は generators の後
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は js/generators-hard.js を読み込む', html.indexOf('<script src="js/generators-hard.js') >= 0);
c.ok('読み込み順: generators-hard が generators の後', html.indexOf('js/generators.js') < html.indexOf('js/generators-hard.js'));

c.done();
