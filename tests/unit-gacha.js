'use strict';
// index.html のガチャ処理（天井/10連保証/ダブり還元）を抽出して検証（8段階レア度）。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-gacha');

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const a = src.indexOf('function _gachaPool(');
const b = src.indexOf('function rpgDailyBoxReady');
const code = src.slice(a, b);
const make = new Function('COS_DATA', 'lsGetJSON', 'lsSetJSON', code + '\nreturn { _gachaDrawInto, _pityTriggered, _gacha10NeedGuarantee, _cosRank, _gachaPickRarity, _gachaPickGoodie, _gachaApplyGoodie, GACHA_GOODIES, _gachaRates, _gachaLog };');
const COS_DATA = { hero: { hat: [{ id: 'n1', r: 'N' }, { id: 'sr1', r: 'SR' }, { id: 'u1', r: 'UR' }] }, pet: { hat: [{ id: 'r1', r: 'R' }] } };
const LS = {};   // _gachaLog用のlocalStorageスタブ
const api = make(COS_DATA, (k, d) => (k in LS ? JSON.parse(LS[k]) : d), (k, v) => { LS[k] = JSON.stringify(v); });

let RND = 0; Math.random = () => RND;

c.ok('cosRank N=0', api._cosRank('N') === 0);
c.ok('cosRank UR=6', api._cosRank('UR') === 6);
c.ok('cosRank LR=7（最上位）', api._cosRank('LR') === 7);
c.ok('pity 49<50→false', api._pityTriggered(49, 50) === false);
c.ok('pity 50>=50→true', api._pityTriggered(50, 50) === true);
c.ok('need-guarantee: 全low(N,HN,R,HR)→true', api._gacha10NeedGuarantee(['N', 'HN', 'R', 'HR']) === true);
c.ok('need-guarantee: SRあり→false', api._gacha10NeedGuarantee(['N', 'SR']) === false);
c.ok('need-guarantee: URあり→false', api._gacha10NeedGuarantee(['N', 'UR']) === false);

// RND=0.5＝消費アイテム抽選（<0.12）を通らない通常経路
RND = 0.5;
let cos = { pity: 50, owned: {}, coin: 0 };
let r = api._gachaDrawInto(cos, 1);
c.ok('天井: 強制UR', r[0].pick.it.id === 'u1' && r[0].pick.it.r === 'UR');
c.ok('天井: カウンタ0にリセット', cos.pity === 0);

RND = 0.5; cos = { pity: 5, owned: {}, coin: 0 };
r = api._gachaDrawInto(cos, 1);
c.ok('通常: N(n1)取得', r[0].pick.it.id === 'n1');
c.ok('通常: pity 5→6', cos.pity === 6);
c.ok('通常: NEW(非dup)', r[0].dup === false && cos.owned.n1 === 1);

RND = 0.5; cos = { pity: 0, owned: {}, coin: 0 };
r = api._gachaDrawInto(cos, 10);
c.ok('10連: 10個返る', r.length === 10);
c.ok('10連: 保証で最後がSRに昇格', r[9].pick.it.id === 'sr1' && r[9].pick.it.r === 'SR');
c.ok('10連: SR+が1つ以上', r.some((o) => api._cosRank(o.pick.it.r) >= 4));

RND = 0.5; cos = { pity: 0, owned: { n1: 1 }, coin: 0 };
r = api._gachaDrawInto(cos, 1);
c.ok('dup: dup判定', r[0].dup === true);
c.ok('dup: N還元20', r[0].refund === 20 && cos.coin === 20);

// ---- 消費アイテム（おたのしみ枠・COS_DATA外の別プール）----
c.ok('GACHA_GOODIESは4種で全てuse/fxを持つ', api.GACHA_GOODIES.length === 4 && api.GACHA_GOODIES.every((g) => g.use && g.fx));
RND = 0;   // 0<0.12 → 消費アイテム経路・重み先頭のエサ×5
cos = { pity: 3, owned: {}, coin: 0 };
r = api._gachaDrawInto(cos, 1);
c.ok('goodie: pickにgoodieフラグ', !!r[0].pick.goodie);
c.ok('goodie: 重み先頭のエサ×5', r[0].pick.it.id === 'g_food_s');
c.ok('goodie: dup=false・refund=0', r[0].dup === false && r[0].refund === 0);
c.ok('goodie: ownedに登録されない', Object.keys(cos.owned).length === 0);
c.ok('goodie: 天井カウンタは進む(3→4)', cos.pity === 4);
RND = 0.85;
c.ok('goodie重み: 0.85でコインぶくろ', api._gachaPickGoodie().id === 'g_coin');
RND = 0.97;
c.ok('goodie重み: 0.97でおまもり', api._gachaPickGoodie().id === 'g_charm');
{
  // 効果適用（rpgAibouStateはこの抽出スコープに無い＝コインだけ適用され、エサ/おまもりは安全にスキップ）
  const c2 = { coin: 0 };
  api._gachaApplyGoodie(c2, null, { use: { coin: 50 } });
  c.ok('goodie効果: コイン+50', c2.coin === 50);
  api._gachaApplyGoodie(c2, { aibou: {} }, { use: { food: 5 } });
  c.ok('goodie効果: rpgAibouState不在でも例外なし', c2.coin === 50);
}
// 天井発動時は消費アイテムに置き換わらない（RND=0でも強制UR）
RND = 0;
cos = { pity: 50, owned: {}, coin: 0 };
r = api._gachaDrawInto(cos, 1);
c.ok('goodie: 天井優先（RND=0でもUR）', r[0].pick.it.id === 'u1');

// ---- バナー制：あいぼう宝箱はaibouプールだけ・該当レアが無い保証はフォールバック ----
{
  const COS2 = { hero: { hat: [{ id: 'n1', r: 'N' }, { id: 'sr1', r: 'SR' }, { id: 'u1', r: 'UR' }] }, pet: { hat: [{ id: 'r1', r: 'R' }] },
    aibou: { hat: [{ id: 'ah1', r: 'N' }, { id: 'ah2', r: 'N' }] } };
  const api2 = make(COS2, (k, d) => d, () => {});
  RND = 0.5;
  let cos2 = { pity: 0, owned: {}, coin: 0 };
  let r2 = api2._gachaDrawInto(cos2, 1, null, 'aibou');
  c.ok('あいぼう宝箱はah_*だけが出る', r2[0].pick.it.id.indexOf('ah') === 0);
  // 10連保証：aibouプールにSRが無い→常設からSRを補完（保証は必ず守る）
  cos2 = { pity: 0, owned: {}, coin: 0 };
  r2 = api2._gachaDrawInto(cos2, 10, null, 'aibou');
  c.ok('あいぼう宝箱の10連でもSR保証（常設から補完）', r2.some((o) => api2._cosRank(o.pick.it.r) >= 4));
  // 天井：aibouにURがある実データと違い、モックは無し→常設URで天井を守る
  cos2 = { pity: 50, owned: {}, coin: 0 };
  r2 = api2._gachaDrawInto(cos2, 1, null, 'aibou');
  c.ok('あいぼう宝箱でも天井UR（常設から補完）', r2[0].pick.it.r === 'UR');
  // 未知バナー/aibou欠落データは常設に安全フォールバック
  const r3 = api._gachaDrawInto({ pity: 0, owned: {}, coin: 0 }, 1, null, 'aibou');
  c.ok('aibouデータが無い環境では常設へフォールバック', !!r3[0].pick.it.id);
}

// ---- 確率表示（_gachaRates）：合計がちょうど100%・重みに比例 ----
{
  const rt = api._gachaRates();
  const sum = rt.tiers.reduce((s, t) => s + t.pct, 0) + rt.goodies.reduce((s, g) => s + g.pct, 0);
  c.ok('確率の合計=100%', Math.abs(sum - 100) < 1e-9);
  c.ok('レア度は4種（モックプール）', rt.tiers.length === 4 && rt.total === 4);
  // モック: N400+SR55+UR12+R160=627、アイテム枠88% → N=400/627*88
  const n = rt.tiers.find((t) => t.r === 'N');
  c.ok('Nの確率=重み比例（56.14%）', Math.abs(n.pct - (400 / 627) * 88) < 1e-9);
  c.ok('おたのしみ枠は12%', Math.abs(rt.goodiePct - 12) < 1e-9);
}
// ---- 排出履歴（_gachaLog）：50件でキャップ・古い方から消える ----
{
  const outs = [];
  for (let i = 0; i < 55; i++) outs.push({ pick: { it: { id: 'x' + i, em: '🎁', name: 'item' + i, r: 'N' } }, dup: false });
  api._gachaLog(outs);
  const log = JSON.parse(LS['gacha_log']);
  c.ok('履歴は50件でキャップ', log.length === 50);
  c.ok('古い方から消える（先頭=x5）', log[0].id === 'x5' && log[49].id === 'x54');
  api._gachaLog([{ pick: { it: { id: 'y', em: '🎉', name: 'Y', r: 'UR' }, goodie: 0 }, dup: true }]);
  const log2 = JSON.parse(LS['gacha_log']);
  c.ok('追記でも50件維持・dupフラグ記録', log2.length === 50 && log2[49].id === 'y' && log2[49].d === 1);
}
c.done();
