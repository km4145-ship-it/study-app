'use strict';
// generators-pack2.js（第2弾ワークフロー生成→検証済み）の構造健全性を最終ゲートで検証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-generators-pack2');

function loadPack(file, varName) {
  const src = fs.readFileSync(path.join(ROOT, 'js', file), 'utf8');
  const m = src.match(new RegExp('var ' + varName + '=(\\{[\\s\\S]*?\\});\\n\\(function'));
  return m ? (new Function('return ' + m[1]))() : null;
}
const PACK = loadPack('generators-pack2.js', 'GEN_PACK2');
c.ok('GEN_PACK2 定義が取り出せる', !!PACK);

const STARS = ['★☆☆', '★★☆', '★★★', '★★★★'];
const POOLS = ['mathGens', 'sciGens', 'socGens', 'engGens', 'jpGens', 'g4MathGens'];
let total = 0, bad = 0;
const seen = new Set();
POOLS.forEach((pn) => {
  ((PACK || {})[pn] || []).forEach((it) => {
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
c.ok('十分な量がある（120問以上）', total >= 120);
c.ok('理科が最も厚い（物化生地・60問以上）', ((PACK || {}).sciGens || []).length >= 60);
c.ok('中学数学の応用も含む（mathGensに追加あり）', ((PACK || {}).mathGens || []).length >= 5);

// pack1 と問題文が重複しないこと（同じ問題の二重採用を防ぐ）
const PACK1 = loadPack('generators-pack.js', 'GEN_PACK');
if (PACK1) {
  const q1 = new Set();
  Object.keys(PACK1).forEach((k) => (PACK1[k] || []).forEach((it) => q1.add((it.q || '').replace(/\s+/g, ''))));
  let dup = 0;
  POOLS.forEach((pn) => ((PACK || {})[pn] || []).forEach((it) => { if (q1.has((it.q || '').replace(/\s+/g, ''))) dup++; }));
  c.ok('pack1 と問題文が重複しない', dup === 0);
}

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は generators-pack2 を pack の後で読む',
  html.indexOf('js/generators-pack2.js') > html.indexOf('js/generators-pack.js?v='));
c.done();
