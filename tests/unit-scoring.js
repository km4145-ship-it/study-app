'use strict';
// 採点・進行の“頭脳”にあたる純粋関数の特性テスト（characterization test）。
// index.html は変更せず、テスト時に関数を「名前でブレース対応抽出」して評価する（行移動に強い）。
// 目的：将来これらを触る/モジュールへ切り出す際に、挙動が1文字も変わらないことを保証する土台。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-scoring');

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// 名前から function / const{...} 本体をブレース対応で切り出す
function grab(name, kind) {
  const re = kind === 'fn'
    ? new RegExp('function\\s+' + name + '\\s*\\(')
    : new RegExp('(const|let|var)\\s+' + name + '\\s*=\\s*\\{');
  const m = re.exec(src);
  if (!m) throw new Error('not found: ' + name);
  const open = src.indexOf('{', m.index);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(m.index, j + 1) + (kind === 'fn' ? '' : ';'); }
  }
  throw new Error('unbalanced: ' + name);
}

let api;
try {
  const pieces = [
    grab('EXAM_STATS', 'const'), grab('_seedOf', 'fn'), grab('withSeed', 'fn'),
    grab('calcHensachiRaw', 'fn'), grab('judgeOf', 'fn'),
    grab('rpgXpForLevel', 'fn'), grab('rpgLevelForXp', 'fn'),
  ].join('\n');
  api = (new Function(pieces +
    '\nreturn {_seedOf,withSeed,calcHensachiRaw,judgeOf,rpgXpForLevel,rpgLevelForXp};'))();
} catch (e) {
  c.ok('純関数を index.html から抽出できる（' + e.message + '）', false);
  c.done();
  return;
}

const r6 = (x) => Math.round(x * 1e6) / 1e6;

// _seedOf：FNV-1a 決定的ハッシュ
c.eq('_seedOf("")', api._seedOf(''), 2166136261);
c.eq('_seedOf("abc")', api._seedOf('abc'), 440920331);
c.eq('_seedOf("exam_math")', api._seedOf('exam_math'), 202290137);

// withSeed：同じ seed は同じ乱数列（決定論）／終了後に Math.random を元へ戻す
const origRandom = Math.random;
c.eq('withSeed(123) の乱数列', JSON.stringify(api.withSeed(123, () => [r6(Math.random()), r6(Math.random()), r6(Math.random())])),
  JSON.stringify([0.787252, 0.178544, 0.495316]));
c.eq('withSeed(123) は再現する', JSON.stringify(api.withSeed(123, () => [r6(Math.random())])), JSON.stringify([0.787252]));
c.eq('withSeed(1) の乱数列', JSON.stringify(api.withSeed(1, () => [r6(Math.random()), r6(Math.random())])), JSON.stringify([0.627074, 0.002736]));
c.ok('withSeed 終了後に Math.random が元に戻る', Math.random === origRandom);

// calcHensachiRaw：50 + 10*(ratio-mu)/sigma（math mu=0.57 sigma=0.19）
c.eq('calcHensachiRaw(math,0.57)=50', r6(api.calcHensachiRaw('math', 0.57)), 50);
c.eq('calcHensachiRaw(math,0.76)=60', r6(api.calcHensachiRaw('math', 0.76)), 60);
c.eq('calcHensachiRaw(japanese,0.60)=50', r6(api.calcHensachiRaw('japanese', 0.60)), 50);
c.eq('未知エリアは既定(mu=0.6)で計算', r6(api.calcHensachiRaw('nope', 0.6)), 50);

// judgeOf：偏差値→A〜E判定
c.eq('judgeOf(70)=A', api.judgeOf(70).band, 'A');
c.eq('judgeOf(62)=B', api.judgeOf(62).band, 'B');
c.eq('judgeOf(55)=C', api.judgeOf(55).band, 'C');
c.eq('judgeOf(50)=D', api.judgeOf(50).band, 'D');
c.eq('judgeOf(30)=E', api.judgeOf(30).band, 'E');

// RPG 経験値カーブ：xp=pow(lv-1,2)*40 と、その逆関数
c.eq('rpgXpForLevel[1,2,3,5,10]', [1, 2, 3, 5, 10].map(api.rpgXpForLevel).join(','), '0,40,160,640,3240');
c.eq('rpgLevelForXp[0,40,160,360,1440]', [0, 40, 160, 360, 1440].map(api.rpgLevelForXp).join(','), '1,2,3,4,7');

c.done();
