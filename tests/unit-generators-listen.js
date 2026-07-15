'use strict';
// js/generators-listen.js（英語リスニング）を検証。
// 単語/文テーブルの健全性と、生成問題の構造（listen付き・4択・答え実在）・模試/紙からの除外を確認。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-generators-listen');

const code = fs.readFileSync(path.join(ROOT, 'js', 'generators-listen.js'), 'utf8');
const engGens = [];
const api = (new Function('engGens', 'shuffleArr', code + '\nreturn { LISTEN_WORDS, LISTEN_SENTENCES, engGens };'))(
  engGens, (a) => a.slice().sort(() => 0.5 - Math.random()));

// ---- テーブルの健全性 ----
c.ok('単語30語以上', api.LISTEN_WORDS.length >= 30);
c.ok('文12本以上', api.LISTEN_SENTENCES.length >= 12);
api.LISTEN_WORDS.forEach((w) => c.ok('単語 ' + w[0] + ' が英語/日本語ペア', /^[a-zA-Z' .-]+$/.test(w[0]) && w[1].length > 0));
api.LISTEN_SENTENCES.forEach((s) => c.ok('文 "' + s[0].slice(0, 18) + '…" が英語/日本語ペア', /^[a-zA-Z' .,?!-]+$/.test(s[0]) && s[1].length > 0));
{
  const ens = api.LISTEN_WORDS.map((w) => w[0]);
  c.ok('単語に重複なし', new Set(ens).size === ens.length);
}

// ---- 生成問題の構造（各ジェネレータを120回）----
c.ok('ジェネレータは2種（単語/文）', engGens.length === 2);
engGens.forEach((gen, gi) => {
  for (let i = 0; i < 120; i++) {
    const q = gen();
    const ok = q && q.listen && q.type === 'choice' && Array.isArray(q.choices) && q.choices.length === 4
      && new Set(q.choices).size === 4 && q.choices.includes(q.ans)
      && /リスニング/.test(q.sub) && ['★★☆', '★★★'].includes(q.level)
      && q.explain.indexOf(q.listen) >= 0;
    if (!ok) { c.ok('gen' + gi + ' 生成が不正: ' + JSON.stringify(q).slice(0, 120), false); break; }
    if (i === 119) c.ok('gen' + gi + ' 120回生成すべて健全（listen付き4択・答え実在）', true);
  }
});

// ---- index.html 統合：再生UI・模試/紙からの除外 ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('読込タグ（generators-plusの後）', html.indexOf('js/generators-listen.js') > html.indexOf('js/generators-plus.js') && html.indexOf('js/generators-listen.js') >= 0);
c.ok('showQuestionに🔊再生UI', html.indexOf("speakListen()") >= 0 && html.indexOf('listen-area') >= 0);
c.ok('speakEnはen-US指定', html.indexOf("u.lang='en-US'") >= 0);
c.ok('模試はリスニング除外', html.indexOf('||q.listen) return false;') >= 0);
c.ok('紙プリントはリスニング除外', html.indexOf('!g.listen') >= 0);
c.done();
