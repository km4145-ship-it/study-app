'use strict';
// index.html のステータス計算（ベース値・装備ボーナス・被ダメ軽減・敵攻撃力）を抽出して検証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-stats');

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const a = src.indexOf('var RPG_SPECIAL_COST');
const b = src.indexOf('function rpgBattleStats');
const code = src.slice(a, b);
// レア度は8段階（旧4段階の'S'はcos-dataの再割当で実在しない）
const RAR = { atkLR: 'LR', atkUR: 'UR', defR: 'R', hpSR: 'SR', mpN: 'N', defHN: 'HN' };
const stubItemById = (id) => (RAR[id] ? { id, r: RAR[id] } : null);
const api = (new Function('rpgItemById', code + '\nreturn {_rpgBaseStats, rpgEquipBonus, rpgDmgTaken, rpgEnemyAtk, STAT_EQUIP_MAG};'))(stubItemById);

// 8段階すべてに上昇量が定義されている（旧4段階のままだとHN〜LRが+2に落ちる回帰ガード）
c.ok('STAT_EQUIP_MAGは8段階すべて定義', ['N','HN','R','HR','SR','SSR','UR','LR'].every((t) => typeof api.STAT_EQUIP_MAG[t] === 'number'));
c.ok('上位レアほど強い（単調増加）', (() => { const o = ['N','HN','R','HR','SR','SSR','UR','LR'].map((t) => api.STAT_EQUIP_MAG[t]); return o.every((v, i) => i === 0 || v > o[i - 1]); })());

const b1 = api._rpgBaseStats(1);
c.ok('Lv1 base hp21/atk8/def4/mp6', b1.hp === 21 && b1.atk === 8 && b1.def === 4 && b1.mp === 6);
const b5 = api._rpgBaseStats(5);
c.ok('Lv5 base hp33/atk16/def10/mp10', b5.hp === 33 && b5.atk === 16 && b5.def === 10 && b5.mp === 10);

const eq = api.rpgEquipBonus({ equip: { hero: { hand: 'atkLR', hat: 'defR' }, pet: { aura: 'hpSR' } } });
c.ok('装備: 攻+15(LRどうぐ)', eq.atk === 15);
c.ok('装備: 防+4(Rぼうし)', eq.def === 4);
c.ok('装備: HP+4(SRペットオーラ=半分)', eq.hp === 4);
c.ok('装備: MP+0', eq.mp === 0);
c.ok('装備なし=全0', JSON.stringify(api.rpgEquipBonus({})) === JSON.stringify({ hp: 0, atk: 0, def: 0, mp: 0 }));

c.ok('dmgTaken(10,4)=7', api.rpgDmgTaken(10, 4) === 7);
c.ok('dmgTaken(4,4)=3', api.rpgDmgTaken(4, 4) === 3);
c.ok('dmgTaken 最低1', api.rpgDmgTaken(1, 99) === 1);

c.ok('zako lv2=5', api.rpgEnemyAtk({ type: 'zako', lv: 2 }) === 5);
c.ok('boss lv2=9', api.rpgEnemyAtk({ type: 'boss', lv: 2 }) === 9);
c.ok('maou lv3=11', api.rpgEnemyAtk({ type: 'maou', lv: 3 }) === 11);
c.done();
