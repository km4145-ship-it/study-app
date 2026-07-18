'use strict';
// 採点・進行の“頭脳”にあたる純粋関数（js/scoring.js）の特性テスト（characterization test）。
// ゴールデン値は分離前の index.html 実装から捕捉したもの＝分離で挙動が1文字も変わらないことを保証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-scoring');

const code = fs.readFileSync(path.join(ROOT, 'js', 'scoring.js'), 'utf8');
const api = (new Function(code +
  '\nreturn {_seedOf,withSeed,calcHensachiRaw,judgeOf,rpgXpForLevel,rpgLevelForXp,masteryTier,masterySummary,MASTERY_TIERS};'))();

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

// ===== 単元マスター度（Familiar→Proficient→Mastered）=====
c.eq('masteryTier：0回はnull', api.masteryTier(0, 0), null);
c.eq('masteryTier：1/1(100%)はまだ練習中（母数不足）', api.masteryTier(1, 1).key, 'learning');
c.eq('masteryTier：3/5(60%)はなじみ', api.masteryTier(3, 5).key, 'familiar');
c.eq('masteryTier：4/5(80%)はとくい', api.masteryTier(4, 5).key, 'proficient');
c.eq('masteryTier：7/8(87.5%)はマスター', api.masteryTier(7, 8).key, 'mastered');
c.eq('masteryTier：6回でも8割未満はマスターにしない(5/6)', api.masteryTier(5, 6).key, 'proficient');
c.eq('masteryTier：低正答は回数多くても練習中(2/10)', api.masteryTier(2, 10).key, 'learning');
c.ok('order は 練習中<なじみ<とくい<マスター',
  api.MASTERY_TIERS.learning.order < api.MASTERY_TIERS.familiar.order &&
  api.MASTERY_TIERS.familiar.order < api.MASTERY_TIERS.proficient.order &&
  api.MASTERY_TIERS.proficient.order < api.MASTERY_TIERS.mastered.order);
{
  const rows = [
    { correct:7, attempts:8 },   // mastered
    { correct:4, attempts:5 },   // proficient
    { correct:3, attempts:5 },   // familiar
    { correct:1, attempts:3 },   // learning
    { correct:0, attempts:0 },   // 無視（null）
  ];
  const s = api.masterySummary(rows);
  c.eq('masterySummary：total は挑戦済みのみ', s.total, 4);
  c.eq('masterySummary：mastered=1', s.mastered, 1);
  c.eq('masterySummary：proficient=1', s.proficient, 1);
  c.eq('masterySummary：familiar=1', s.familiar, 1);
  c.eq('masterySummary：learning=1', s.learning, 1);
  c.eq('masterySummary：習得率=とくい以上/total=2/4=50%', s.pct, 50);
  c.eq('masterySummary：空配列は0%', api.masterySummary([]).pct, 0);
}

// index.html 側は再定義せず、モジュールを読み込む
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は calcHensachiRaw を再定義しない', html.indexOf('function calcHensachiRaw(') < 0);
c.ok('index.html は withSeed を再定義しない', html.indexOf('function withSeed(') < 0);
c.ok('index.html は js/scoring.js を読み込む', html.indexOf('<script src="js/scoring.js') >= 0);
c.ok('index.html は masteryTier を再定義しない（scoring.js に集約）', html.indexOf('function masteryTier(') < 0);
c.ok('renderMastery は masteryTier/masterySummary を使う', html.indexOf('masteryTier(') >= 0 && html.indexOf('masterySummary(') >= 0);

c.done();
