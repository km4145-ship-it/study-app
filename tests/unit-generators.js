'use strict';
// 分離した js/generators.js（問題ジェネレーター）が、実際に各教科の有効な問題を
// 生成できることを検証する（構文だけでなく“挙動”を確認）。
// generators.js は読み込み時に BANK へ登録するため、questions-extra.js を先に読む。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-generators');

const bank = fs.readFileSync(path.join(ROOT, 'js', 'questions-extra.js'), 'utf8');
const gen = fs.readFileSync(path.join(ROOT, 'js', 'generators.js'), 'utf8');
function buildGenQuestion(band) {
  return (new Function('muGradeBand', bank + '\n' + gen + '\nreturn genQuestion;'))(() => band);
}

const gqJhs = buildGenQuestion('jhs');
['math', 'japanese', 'english', 'science', 'social'].forEach((s) => {
  let ok = 0;
  for (let i = 0; i < 40; i++) { const q = gqJhs(s); if (q && typeof q.q === 'string' && q.q.length > 0 && q.ans !== undefined) ok++; }
  c.ok('中学モード ' + s + '：genQuestion 40回すべて有効な問題', ok === 40);
});

const gqElem = buildGenQuestion('elem');
['math', 'japanese'].forEach((s) => {
  let ok = 0;
  for (let i = 0; i < 30; i++) { const q = gqElem(s); if (q && q.q && q.ans !== undefined) ok++; }
  c.ok('小学モード ' + s + '：genQuestion 30回すべて有効', ok === 30);
});

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は genQuestion を再定義しない', html.indexOf('function genQuestion(') < 0);
c.ok('index.html は js/generators.js を読み込む', html.indexOf('<script src="js/generators.js') >= 0);
c.ok('読み込み順: questions-extra が generators の前', html.indexOf('js/questions-extra.js') < html.indexOf('js/generators.js'));
c.done();
