'use strict';
// 共有コア js/roguelite.js（＋ js/battle-fx.js）を study-app 側でも検証。
// tactics-arena と同一 canonical（sync元）。ねらい＝共有モジュールが study-app の環境でも
// 壊れず動くことを担保する回帰安全網（“study側でも使えるものは共通化”の土台）。
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-roguelite');

const R = require(path.join(ROOT, 'js', 'roguelite.js'));
const FX = require(path.join(ROOT, 'js', 'battle-fx.js'));

// ---- レベル成長 ----
const XP = { base: 50, step: 30, max: 20 };
c.eq('rlXpReq(1)=50', R.rlXpReq(1, XP), 50);
c.eq('rlXpReq(2)=80', R.rlXpReq(2, XP), 80);
c.eq('rlLevel(0)=1', R.rlLevel(0, XP), 1);
c.eq('rlLevel(50)=2', R.rlLevel(50, XP), 2);
c.eq('rlLevel(49)=1', R.rlLevel(49, XP), 1);
c.eq('rlLevel(1e9)=max20', R.rlLevel(1e9, XP), 20);
const G = { hp: 5, atk: 1, def: 1, spdPer: 3 };
c.eq('rlLevelStat Lv1 hp=0', R.rlLevelStat(1, G).hp, 0);
c.eq('rlLevelStat Lv20 hp=95', R.rlLevelStat(20, G).hp, 95);
c.eq('rlLevelStat Lv20 spd=6', R.rlLevelStat(20, G).spd, 6);
const xi = R.rlXpInto(25, XP);
c.ok('rlXpInto pct50', xi.lv === 1 && xi.cur === 25 && xi.pct === 50);

// ---- 難易度（累積モッド）----
const ASC = [{}, { mod: { ehp: 0.15 } }, { mod: { eatk: 0.15 } }, { mod: { ecount: 1 } }];
c.eq('rlAscMods(2).ehp', R.rlAscMods(2, ASC).ehp, 0.15);
c.eq('rlAscMods(2).eatk', R.rlAscMods(2, ASC).eatk, 0.15);
c.eq('rlAscMods(3).ecount', R.rlAscMods(3, ASC).ecount, 1);
c.eq('rlAscMods(0).startHp=1', R.rlAscMods(0, ASC).startHp, 1);

// ---- 遺物集計 ----
const RD = { crest: { stat: { atk: 10 } }, bulwark: { stat: { def: 5 } }, curse1: { stat: { def: -3 }, curse: true }, hexr: { hex: 'burn' } };
c.eq('rlRelicStat atk', R.rlRelicStat(['crest', 'bulwark'], RD).atk, 10);
c.eq('rlRelicStat def', R.rlRelicStat(['crest', 'bulwark'], RD).def, 5);
c.ok('rlHas', R.rlHas(['crest'], 'crest') && !R.rlHas(['crest'], 'x'));
c.ok('rlHexHas', R.rlHexHas(['hexr'], RD, 'burn') && !R.rlHexHas([], RD, 'burn'));
c.ok('rlRollUnowned 通常は呪い除外', (function () { for (var i = 0; i < 20; i++) { var v = i / 20; var rng = (function (x) { return function () { return x; }; })(v); if (R.rlRollUnowned(rng, RD, [], false) === 'curse1') return false; } return true; })());
c.eq('rlRollUnowned 呪いのみ', R.rlRollUnowned(function () { return 0; }, RD, [], true), 'curse1');

// ---- carry効果（連戦持ち越し）----
const carry = { u1: { hp: 20, mp: 0, maxHp: 100, downed: false }, u2: { hp: 8, mp: 0, maxHp: 80, downed: true } };
R.rlCarryHeal(carry, 0.4);
c.eq('rlCarryHeal 20+40=60', carry.u1.hp, 60);
c.ok('rlCarryHeal 気絶を蘇生(32)', carry.u2.downed === false && carry.u2.hp === 32);
const carry2 = { u: { hp: 100, mp: 0, maxHp: 100, downed: false } };
R.rlCarryDamage(carry2, 0.25);
c.eq('rlCarryDamage -25%=75', carry2.u.hp, 75);
const carry3 = { u: { hp: 5, mp: 0, maxHp: 100, downed: false } };
R.rlCarryDamage(carry3, 0.9);
c.eq('rlCarryDamage 最低1', carry3.u.hp, 1);

// ---- 戦闘メタ（チャージ/覚醒）----
const bu = {};
c.ok('rlChargeTick period3 F/F/T', R.rlChargeTick(bu, 3) === false && R.rlChargeTick(bu, 3) === false && R.rlChargeTick(bu, 3) === true);
c.ok('rlEnrageReady 閾値割れtrue', R.rlEnrageReady({ phase: { hp: 0.5 }, hp: 40, maxHp: 100 }) === true);
c.ok('rlEnrageReady 覚醒済false', R.rlEnrageReady({ phase: { hp: 0.5 }, hp: 10, maxHp: 100, enraged: true }) === false);

// ---- 版付きセーブ移行 ----
c.eq('rlLoad 保存なし=null', R.rlLoad(null, { version: 1 }), null);
c.eq('rlLoad 壊れJSON=null', R.rlLoad('{bad', { version: 1 }), null);
c.ok('rlLoad v付き復元', (function () { var s = R.rlLoad(JSON.stringify({ v: 1, coins: 99 }), { version: 1 }); return s && s.coins === 99; })());
c.ok('rlLoad 段階移行 v1→v2', (function () { var s = R.rlLoad(JSON.stringify({ v: 1 }), { version: 2, migrations: { 1: function (o) { o.m = 1; return o; } } }); return s && s.v === 2 && s.m === 1; })());

// ---- battle-fx（Node には document 不在＝安全に no-op・関数が存在すること）----
c.ok('battle-fx: bfx* が関数', ['bfxToast', 'bfxCutin', 'bfxFlash', 'bfxPopup', 'bfxBoardFlash', 'bfxHitBurst'].every(function (k) { return typeof FX[k] === 'function'; }));
c.ok('battle-fx: Node(document不在)で例外なし', (function () { try { FX.bfxToast('x'); FX.bfxPopup(null, 10, 0, 0, 'x', 'dmg'); FX.bfxHitBurst(null, 10, 0, 0, '#fff'); return true; } catch (e) { return false; } })());

c.done();
