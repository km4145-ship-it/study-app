'use strict';
// generators-elem.js（小1〜3の学年スケール＋小学国/英/理/社の増量）が、学年1〜3で
// 全5教科の有効な問題を作れること、選択肢が健全（答えを含む・重複なし）で、
// 低学年に★★★★を出さないことを挙動で検証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-generators-elem');

const bank = fs.readFileSync(path.join(ROOT, 'js', 'questions-extra.js'), 'utf8');
const gen  = fs.readFileSync(path.join(ROOT, 'js', 'generators.js'), 'utf8');
const elem = fs.readFileSync(path.join(ROOT, 'js', 'generators-elem.js'), 'utf8');

function buildGQ(grade) {
  return (new Function('muGradeBand', 'muCurrentGrade',
    bank + '\n' + gen + '\n' + elem + '\nreturn genQuestion;'))(() => 'elem', () => grade);
}

const SUBS = ['math', 'japanese', 'english', 'science', 'social'];
[1, 2, 3].forEach((grade) => {
  const gq = buildGQ(grade);
  SUBS.forEach((s) => {
    let ok = 0, badChoice = 0, badFree = 0, tooHard = 0;
    for (let i = 0; i < 80; i++) {
      const q = gq(s);
      if (!(q && typeof q.q === 'string' && q.q.length > 0 && q.ans !== undefined)) continue;
      ok++;
      if (q.q.indexOf('undefined') >= 0 || q.q.indexOf('NaN') >= 0) badFree++;   // 文字列組み立ての穴
      if (q.type === 'choice') {
        const ch = q.choices || [];
        if (ch.length < 2 || ch.indexOf(q.ans) < 0 || new Set(ch).size !== ch.length) badChoice++;
      } else {
        if (!(q.ans && String(q.ans).length > 0)) badFree++;
      }
      if (q.level === '★★★★') tooHard++;
    }
    c.ok('小' + grade + ' ' + s + '：80回すべて有効な問題', ok === 80);
    c.ok('小' + grade + ' ' + s + '：選択肢が健全（答えを含む・重複なし・2択以上）', badChoice === 0);
    c.ok('小' + grade + ' ' + s + '：free/文言が健全（空答え・undefined/NaN無し）', badFree === 0);
    c.ok('小' + grade + ' ' + s + '：低学年に★★★★を出さない', tooHard === 0);
  });
});

// 学年4以上（elem上位）は従来 g4 プールにフォールバックし、依然有効
{
  const gq6 = buildGQ(6);
  let ok = 0; for (let i = 0; i < 40; i++) { const q = gq6('math'); if (q && q.q && q.ans !== undefined) ok++; }
  c.ok('小6 math：g4 フォールバックでも 40回有効', ok === 40);
}

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は js/generators-elem.js を generators.js の後で読む',
  html.indexOf('js/generators-elem.js') > html.indexOf('js/generators.js?v='));
c.done();
