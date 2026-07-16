'use strict';
// generators-pack.js（ワークフロー生成→検証済みの問題データ）の構造健全性を最終ゲートで検証。
// factの正誤は生成時の検証エージェントが担保。ここでは schema/選択肢/重複/文言の穴を機械的に確認する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-generators-pack');

const src = fs.readFileSync(path.join(ROOT, 'js', 'generators-pack.js'), 'utf8');
// GEN_PACK 定義だけを安全に取り出して評価（push処理IIFEは走らせない）
const m = src.match(/var GEN_PACK=(\{[\s\S]*?\});\n\(function/);
c.ok('GEN_PACK 定義が取り出せる', !!m);
const PACK = m ? (new Function('return ' + m[1]))() : {};

const STARS = ['★☆☆', '★★☆', '★★★', '★★★★'];
const POOLS = ['jpGens', 'socGens', 'sciGens', 'engGens', 'g4MathGens'];
let total = 0, bad = 0;
const seen = new Set();
POOLS.forEach((pn) => {
  const arr = PACK[pn] || [];
  arr.forEach((it) => {
    total++;
    let ok = it && typeof it.q === 'string' && it.q.trim().length > 0
      && it.q.indexOf('undefined') < 0 && it.q.indexOf('NaN') < 0
      && STARS.indexOf(it.level) >= 0
      && it.ans !== undefined && String(it.ans).trim().length > 0
      && typeof it.hint === 'string' && typeof it.explain === 'string' && it.explain.length > 0;
    if (it && it.type === 'choice') {
      const ch = it.choices || [];
      if (ch.length !== 4 || ch.indexOf(String(it.ans)) < 0 || new Set(ch).size !== ch.length) ok = false;
    } else if (!it || it.type !== 'free') ok = false;
    const key = it && it.q ? it.q.replace(/\s+/g, '') : ('x' + total);
    if (seen.has(key)) ok = false; seen.add(key);
    if (!ok) bad++;
  });
});
c.ok('全問が構造的に健全（4択・答え内包・重複なし・文言の穴なし）', bad === 0);
c.ok('十分な量がある（100問以上）', total >= 100);
c.ok('国語が最も厚い（文法/古文/敬語ほか・30問以上）', (PACK.jpGens || []).length >= 30);
c.ok('社会も拡充（20問以上）', (PACK.socGens || []).length >= 20);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は generators-pack を generators.js の後で読む',
  html.indexOf('js/generators-pack.js') > html.indexOf('js/generators.js?v='));
c.done();
