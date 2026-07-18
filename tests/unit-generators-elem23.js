'use strict';
// generators-elem2.js（小1-3 全5教科の大量増量）と generators-elem3.js（中学 基礎★☆☆＋小4-6 理社国）が、
// 実際に各生成器プールへ登録され（const プールへも push できること）、生成物が健全（答えを含む・
// 重複なし・undefined/NaN無し・低学年に★★★★を出さない）であることを、実挙動で検証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-generators-elem23');

const bank  = fs.readFileSync(path.join(ROOT, 'js', 'questions-extra.js'), 'utf8');
const gen   = fs.readFileSync(path.join(ROOT, 'js', 'generators.js'), 'utf8');
const elem  = fs.readFileSync(path.join(ROOT, 'js', 'generators-elem.js'), 'utf8');
const elem2 = fs.readFileSync(path.join(ROOT, 'js', 'generators-elem2.js'), 'utf8');
const elem3 = fs.readFileSync(path.join(ROOT, 'js', 'generators-elem3.js'), 'utf8');

const POOLS = ['g13MathGens','g13JpGens','g13EngGens','g13SciGens','g13SocGens',
               'mathGens','engGens','sciGens','g4SciGens','g4SocGens','g4JpGens'];

// プールのサイズを、指定したスクリプト群を読み込んだ後に測る
function poolSizes(extraSrc) {
  const ret = 'return {' + POOLS.map(p => p + ':(typeof ' + p + "!=='undefined'?" + p + '.length:-1)').join(',') + '};';
  return (new Function('muGradeBand', 'muCurrentGrade', bank + '\n' + gen + '\n' + elem + '\n' + extraSrc + '\n' + ret))(() => 'elem', () => 1);
}

const before = poolSizes('');
const after  = poolSizes(elem2 + '\n' + elem3);

// elem2 は g13*、elem3 は 中学(math/eng/sci)＋小4-6(g4Sci/Soc/Jp) を増やす
const GREW = ['g13MathGens','g13JpGens','g13EngGens','g13SciGens','g13SocGens',
              'mathGens','engGens','sciGens','g4SciGens','g4SocGens','g4JpGens'];
GREW.forEach((p) => {
  c.ok(p + '：elem2/elem3 読み込みで生成器が増える（' + before[p] + '→' + after[p] + '）', after[p] > before[p]);
});

// 追加総数の下限チェック（elem2=149, elem3=180 相当が入る）
const added = POOLS.reduce((s, p) => s + Math.max(0, after[p] - before[p]), 0);
c.ok('追加された生成器の総数が 300 以上（elem2+elem3）', added >= 300);

// 生成物の健全性：全プールから各50回引いて検証
function makeGen(grade) {
  return (new Function('muGradeBand', 'muCurrentGrade',
    bank + '\n' + gen + '\n' + elem + '\n' + elem2 + '\n' + elem3 + '\nreturn genQuestion;'))(
    () => (grade <= 3 ? 'elem' : grade <= 6 ? 'elem' : 'jhs'), () => grade);
}

// 小1-3（elem2 の在庫が混ざる）
[1, 2, 3].forEach((grade) => {
  const gq = makeGen(grade);
  ['math', 'japanese', 'english', 'science', 'social'].forEach((s) => {
    let ok = 0, bad = 0, tooHard = 0;
    for (let i = 0; i < 60; i++) {
      const q = gq(s);
      if (!(q && typeof q.q === 'string' && q.q.length > 0 && q.ans !== undefined)) continue;
      ok++;
      if (q.q.indexOf('undefined') >= 0 || q.q.indexOf('NaN') >= 0) bad++;
      if (q.type === 'choice') {
        const ch = q.choices || [];
        if (ch.length < 2 || ch.indexOf(q.ans) < 0 || new Set(ch).size !== ch.length) bad++;
      } else if (!(q.ans && String(q.ans).length > 0)) bad++;
      if (q.level === '★★★★') tooHard++;
    }
    c.ok('小' + grade + ' ' + s + '：60回すべて有効', ok === 60);
    c.ok('小' + grade + ' ' + s + '：生成物が健全（答え含む・重複/undefined無し）', bad === 0);
    c.ok('小' + grade + ' ' + s + '：低学年に★★★★を出さない', tooHard === 0);
  });
});

// 中学（elem3 の基礎★☆☆が mathGens/engGens/sciGens に混ざる）
{
  const gq = makeGen(7); // 中1相当
  ['math', 'english', 'science'].forEach((s) => {
    let ok = 0, bad = 0;
    for (let i = 0; i < 60; i++) {
      const q = gq(s);
      if (!(q && typeof q.q === 'string' && q.q.length > 0 && q.ans !== undefined)) continue;
      ok++;
      if (q.q.indexOf('undefined') >= 0 || q.q.indexOf('NaN') >= 0) bad++;
      if (q.type === 'choice') {
        const ch = q.choices || [];
        if (ch.length < 2 || ch.indexOf(q.ans) < 0 || new Set(ch).size !== ch.length) bad++;
      } else if (!(q.ans && String(q.ans).length > 0)) bad++;
    }
    c.ok('中学 ' + s + '：60回すべて有効', ok === 60);
    c.ok('中学 ' + s + '：生成物が健全', bad === 0);
  });
}

// index.html が elem2/elem3 を generators.js の後で読むこと
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は js/generators-elem2.js を読む', html.indexOf('js/generators-elem2.js') > html.indexOf('js/generators.js?v='));
c.ok('index.html は js/generators-elem3.js を読む', html.indexOf('js/generators-elem3.js') > html.indexOf('js/generators.js?v='));

c.done();
