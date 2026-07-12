'use strict';
// 採点・進行の“頭脳”にあたる純粋関数（js/scoring.js）の特性テスト（characterization test）。
// ゴールデン値は分離前の index.html 実装から捕捉したもの＝分離で挙動が1文字も変わらないことを保証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-scoring');

const code = fs.readFileSync(path.join(ROOT, 'js', 'scoring.js'), 'utf8');
const api = (new Function(code +
  '\nreturn {_seedOf,withSeed,calcHensachiRaw,judgeOf,rpgXpForLevel,rpgLevelForXp};'))();

['_seedOf', 'withSeed', 'calcHensachiRaw', 'judgeOf', 'rpgXpForLevel', 'rpgLevelForXp']
  .forEach((f) => c.ok(f + ' が関数', typeof api[f] === 'function'));

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

// index.html 側は再定義せず、モジュールを読み込む
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は calcHensachiRaw を再定義しない', html.indexOf('function calcHensachiRaw(') < 0);
c.ok('index.html は withSeed を再定義しない', html.indexOf('function withSeed(') < 0);
c.ok('index.html は js/scoring.js を読み込む', html.indexOf('<script src="js/scoring.js') >= 0);

c.done();
