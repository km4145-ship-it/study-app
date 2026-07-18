'use strict';
// 採点・進行の“頭脳”にあたる純粋関数（js/scoring.js）の特性テスト（characterization test）。
// ゴールデン値は分離前の index.html 実装から捕捉したもの＝分離で挙動が1文字も変わらないことを保証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-scoring');

const code = fs.readFileSync(path.join(ROOT, 'js', 'scoring.js'), 'utf8');
const api = (new Function(code +
  '\nreturn {_seedOf,withSeed,calcHensachiRaw,judgeOf,rpgXpForLevel,rpgLevelForXp,masteryTier,masterySummary,MASTERY_TIERS,loginStreakUpdate,srsInterval};'))();

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

// ===== SRS間隔の簡易HLR（反応速度×誤答回数で伸縮）=====
{
  c.eq('SRS：秒数不明・初回は基本間隔のまま', api.srsInterval(7, null, 1), 7);
  c.eq('SRS：速い正解(≤4s)は間隔を延ばす(×1.3)', api.srsInterval(10, 3, 1), 13);
  c.eq('SRS：遅い正解(>12s)は縮める(×0.75)', api.srsInterval(8, 20, 1), 6);
  c.eq('SRS：ふつうの速さは等倍', api.srsInterval(14, 8, 1), 14);
  c.eq('SRS：何度も間違えた項目(wc>=3)は縮める', api.srsInterval(14, null, 3), 11);   // round(14*0.75)=11 (10.5→11)
  c.eq('SRS：2回間違えた項目は少し縮める(×0.9)', api.srsInterval(10, null, 2), 9);
  c.eq('SRS：最小1日は下回らない', api.srsInterval(1, 20, 3), 1);
  c.ok('SRS：速い×易しめ は 遅い×難しめ より長い', api.srsInterval(7,3,1) > api.srsInterval(7,20,3));
}

// ===== ログイン連続の欠席救済（フリーズ）=====
{
  const T='2026-07-19', Y='2026-07-18', TA='2026-07-17';
  c.eq('昨日ログイン→連続+1', api.loginStreakUpdate({last:Y,streak:5,freezeAt:-99}, T, Y, TA).streak, 6);
  const f = api.loginStreakUpdate({last:TA,streak:10,freezeAt:-99}, T, Y, TA);   // 1日欠席・フリーズ可
  c.eq('1日欠席はフリーズで継続(+1)', f.streak, 11);
  c.ok('フリーズ発動フラグ', f.frozen === true);
  c.eq('フリーズ消費で freezeAt=新streak', f.freezeAt, 11);
  const f2 = api.loginStreakUpdate({last:TA,streak:11,freezeAt:11}, T, Y, TA);   // 直後にまた欠席＝フリーズ切れ
  c.eq('7連続以内の再欠席はリセット', f2.streak, 1);
  c.ok('連続してフリーズは使えない', f2.frozen === false);
  const f3 = api.loginStreakUpdate({last:TA,streak:20,freezeAt:11}, T, Y, TA);   // 前回freeze11から+9＝再び使える
  c.eq('7連続あけば再びフリーズ可', f3.streak, 21);
  // 2日以上の欠席はフリーズでも救えない（last=3日前）
  c.eq('2日欠席はリセット', api.loginStreakUpdate({last:'2026-07-16',streak:30,freezeAt:-99}, T, Y, TA).streak, 1);
  // 初回（履歴なし）
  c.eq('初ログインは1', api.loginStreakUpdate({last:'',streak:0}, T, Y, TA).streak, 1);
}

// index.html 側は再定義せず、モジュールを読み込む
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('rpgLoginBonus は loginStreakUpdate を使う（欠席救済の配線）',
  /function rpgLoginBonus\(\)[\s\S]{0,400}loginStreakUpdate\(lg/.test(html));
c.ok('srsCorrect は srsInterval で復習間隔を伸縮（HLR-lite配線）',
  html.indexOf('function srsCorrect(q)') >= 0 && html.indexOf('srsInterval(SRS_INT[box]') >= 0);
c.ok('index.html は calcHensachiRaw を再定義しない', html.indexOf('function calcHensachiRaw(') < 0);
c.ok('index.html は withSeed を再定義しない', html.indexOf('function withSeed(') < 0);
c.ok('index.html は js/scoring.js を読み込む', html.indexOf('<script src="js/scoring.js') >= 0);
c.ok('index.html は masteryTier を再定義しない（scoring.js に集約）', html.indexOf('function masteryTier(') < 0);
c.ok('renderMastery は masteryTier/masterySummary を使う', html.indexOf('masteryTier(') >= 0 && html.indexOf('masterySummary(') >= 0);

c.done();
