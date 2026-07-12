'use strict';
// index.html のガチャ処理（天井/10連保証/ダブり還元）を抽出して検証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-gacha');

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const a = src.indexOf('function _gachaPool()');
const b = src.indexOf('function rpgDailyBoxReady');
const code = src.slice(a, b);
const make = new Function('COS_DATA', code + '\nreturn { _gachaDrawInto, _pityTriggered, _gacha10NeedGuarantee, _cosRank, _gachaPickRarity };');
const COS_DATA = { hero: { hat: [{ id: 'n1', r: 'N' }, { id: 's1', r: 'S' }, { id: 'u1', r: 'UR' }] }, pet: { hat: [{ id: 'r1', r: 'R' }] } };
const api = make(COS_DATA);

let RND = 0; Math.random = () => RND;

c.ok('cosRank UR=3', api._cosRank('UR') === 3);
c.ok('pity 59<60→false', api._pityTriggered(59, 60) === false);
c.ok('pity 60>=60→true', api._pityTriggered(60, 60) === true);
c.ok('need-guarantee: 全low→true', api._gacha10NeedGuarantee(['N', 'N', 'R']) === true);
c.ok('need-guarantee: Sあり→false', api._gacha10NeedGuarantee(['N', 'S']) === false);
c.ok('need-guarantee: URあり→false', api._gacha10NeedGuarantee(['N', 'UR']) === false);

RND = 0;
let cos = { pity: 60, owned: {}, coin: 0 };
let r = api._gachaDrawInto(cos, 1);
c.ok('pity: 強制UR', r[0].pick.it.id === 'u1' && r[0].pick.it.r === 'UR');
c.ok('pity: カウンタ0にリセット', cos.pity === 0);

RND = 0; cos = { pity: 5, owned: {}, coin: 0 };
r = api._gachaDrawInto(cos, 1);
c.ok('通常: N(n1)取得', r[0].pick.it.id === 'n1');
c.ok('通常: pity 5→6', cos.pity === 6);
c.ok('通常: NEW(非dup)', r[0].dup === false && cos.owned.n1 === 1);

RND = 0; cos = { pity: 0, owned: {}, coin: 0 };
r = api._gachaDrawInto(cos, 10);
c.ok('10連: 10個返る', r.length === 10);
c.ok('10連: 保証で最後がSに昇格', r[9].pick.it.id === 's1' && r[9].pick.it.r === 'S');
c.ok('10連: S+が1つ以上', r.some((o) => api._cosRank(o.pick.it.r) >= 2));

RND = 0; cos = { pity: 0, owned: { n1: 1 }, coin: 0 };
r = api._gachaDrawInto(cos, 1);
c.ok('dup: dup判定', r[0].dup === true);
c.ok('dup: N還元20', r[0].refund === 20 && cos.coin === 20);
c.done();
