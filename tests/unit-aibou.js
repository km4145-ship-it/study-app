'use strict';
// js/aibou.js（あいぼう＝なかまモンスター育成の純粋関数）と、
// cloud-sync.js の mergeAibou（同期でなかまが消えないこと）を検証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-aibou');

// ===== js/aibou.js をロード（rpg-assets.js と一緒に＝アートキー網羅の検証のため） =====
const assetsCode = fs.readFileSync(path.join(ROOT, 'js', 'rpg-assets.js'), 'utf8');
const aibouCode = fs.readFileSync(path.join(ROOT, 'js', 'aibou.js'), 'utf8');
const api = (new Function(assetsCode + '\n' + aibouCode + `
return { RPG_SVG, AIBOU_SPECIES, AIBOU_ART_SPECIES, AIBOU_RANKS, AIBOU_RANK_LVMAX,
  aibouRankWeights, aibouRollRank, aibouJoinChance, aibouRollSpecies,
  aibouXpNeed, aibouPower, aibouLvMax, aibouFeed, aibouPartyFx };`))();

// ---- 種族マップが RPG_SVG の全モンスターを網羅（crystal は演出用で除外）----
Object.keys(api.RPG_SVG).filter((k) => k !== 'crystal').forEach((k) => {
  c.ok('アート ' + k + ' に種族がある', !!api.AIBOU_ART_SPECIES[k]);
});
Object.keys(api.AIBOU_ART_SPECIES).forEach((k) => {
  c.ok('種族 ' + api.AIBOU_ART_SPECIES[k] + ' が定義済み(' + k + ')', !!api.AIBOU_SPECIES[api.AIBOU_ART_SPECIES[k]]);
});
c.ok('魔王と英雄はレア種族', api.AIBOU_SPECIES.maou.rare === true && api.AIBOU_SPECIES.hero.rare === true);
c.eq('ランクは9段階（SSSが最強）', api.AIBOU_RANKS.join(','), 'F,E,D,C,B,A,S,SS,SSS');

// ---- ランク抽選：重みは常に正・返り値は必ず正規のランク・高い章ほどSSSが出やすい ----
for (let lv = 1; lv <= 12; lv++) {
  const w = api.aibouRankWeights(lv);
  c.ok('lv' + lv + ' の重みが全て正', api.AIBOU_RANKS.every((r) => w[r] > 0));
}
c.eq('rnd=0 は最弱F', api.aibouRollRank(1, 0), 'F');
c.eq('rnd≈1 は最強SSS', api.aibouRollRank(10, 0.99999), 'SSS');
c.ok('SSSの重みは章が上がるほど増える', api.aibouRankWeights(10).SSS > api.aibouRankWeights(1).SSS);
[0, 0.3, 0.5, 0.7, 0.9, 0.999].forEach((r) => {
  c.ok('rnd=' + r + ' で正規ランク', api.AIBOU_RANKS.indexOf(api.aibouRollRank(5, r)) >= 0);
});

// ---- なかま加入率と種族の目ざめ ----
c.eq('魔王シグマは必ずなかま(1)', api.aibouJoinChance('maou'), 1);
c.eq('ボスは50%', api.aibouJoinChance('boss'), 0.5);
c.eq('ザコは25%', api.aibouJoinChance('zako'), 0.25);
c.eq('villainは常に魔王種族', api.aibouRollSpecies('villain', 'zako', 0.5), 'maou');
c.eq('ボス+低rndで魔王種に目ざめ', api.aibouRollSpecies('slime', 'boss', 0.01), 'maou');
c.eq('ザコでは魔王に目ざめない', api.aibouRollSpecies('slime', 'zako', 0.01), 'slime');
c.eq('rnd=0.05は英雄種', api.aibouRollSpecies('wolf', 'zako', 0.05), 'hero');
c.eq('通常rndは基本種族(dragon)', api.aibouRollSpecies('dragon', 'zako', 0.5), 'dragon');

// ---- 育成：エサ→レベルアップ、ランク上限で止まる ----
c.ok('必要けいけんちは単調増加', api.aibouXpNeed(1) < api.aibouXpNeed(5) && api.aibouXpNeed(5) < api.aibouXpNeed(20));
{
  const a = { rank: 'C', lv: 1, xp: 0 };
  const ups = api.aibouFeed(a, 2);   // エサ2個=16xp、Lv1→2は12xp
  c.eq('エサ2個でLv2になる', a.lv, 2);
  c.eq('上がったLv数=1', ups, 1);
  c.eq('あまりxpは持ちこし(4)', a.xp, 4);
}
{
  const a = { rank: 'C', lv: 1, xp: 0 };
  api.aibouFeed(a, 100000);
  c.eq('Cランクは上限Lvで止まる', a.lv, api.AIBOU_RANK_LVMAX.C);
}
c.ok('ちからはランクが高いほど強い（F<C<A<SSS・同Lv）',
  api.aibouPower({ rank: 'F', lv: 10 }) < api.aibouPower({ rank: 'C', lv: 10 })
  && api.aibouPower({ rank: 'C', lv: 10 }) < api.aibouPower({ rank: 'A', lv: 10 })
  && api.aibouPower({ rank: 'A', lv: 10 }) < api.aibouPower({ rank: 'SSS', lv: 10 }));
c.ok('レベル上限もランクが高いほど高い（F<C<SSS）',
  api.AIBOU_RANK_LVMAX.F < api.AIBOU_RANK_LVMAX.C && api.AIBOU_RANK_LVMAX.C < api.AIBOU_RANK_LVMAX.SSS);
c.ok('ちからはLvが上がると強くなる', api.aibouPower({ rank: 'S', lv: 1 }) < api.aibouPower({ rank: 'S', lv: 30 }));

// ---- パーティ効果 ----
{
  const none = api.aibouPartyFx([]);
  c.ok('パーティ0匹は効果なし', none.support === 0 && none.critAt === 3 && none.guard === 0 && none.healPer3 === 0 && none.xpMult === 1);
  const fx = api.aibouPartyFx([
    { sp: 'beast', rank: 'A', lv: 5 },
    { sp: 'slime', rank: 'B', lv: 3 },
    { sp: 'nature', rank: 'C', lv: 1 },
  ]);
  c.ok('おうえんダメージ>0', fx.support > 0);
  c.eq('魔獣で会心コンボ2', fx.critAt, 2);
  c.eq('スライムでみがわり1回', fx.guard, 1);
  c.eq('自然でかいふく3', fx.healPer3, 3);
  const drg = api.aibouPartyFx([{ sp: 'dragon', rank: 'A', lv: 5 }]);
  const slm = api.aibouPartyFx([{ sp: 'slime', rank: 'A', lv: 5 }]);
  c.ok('ドラゴンのおうえんは同ランクより強い', drg.support > slm.support);
  c.eq('英雄1匹でxp1.15倍', api.aibouPartyFx([{ sp: 'hero', rank: 'C', lv: 1 }]).xpMult, 1.15);
  const h3 = api.aibouPartyFx([{ sp: 'hero', rank: 'C', lv: 1 }, { sp: 'hero', rank: 'C', lv: 1 }, { sp: 'hero', rank: 'C', lv: 1 }]);
  c.eq('英雄3匹でも上限1.45倍', h3.xpMult, 1.45);
  const mao = api.aibouPartyFx([{ sp: 'maou', rank: 'SSS', lv: 1 }]);
  c.ok('魔王種はみがわりも持つ', mao.guard === 1 && mao.support > 0);
}

// ===== cloud-sync.js の mergeAibou / mergeRpg（同期でなかまが消えないこと）=====
const src = fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8');
const s = src.indexOf('function mergeCos(');
const anchor = src.indexOf('function mergeRpg(', s);
const endMarker = 'return JSON.stringify(o); }catch(e){ return b||a; } }';
const end = src.indexOf(endMarker, anchor) + endMarker.length;
const mergeRpg = (new Function(src.slice(s, end) + '\nreturn mergeRpg;'))();

const devA = JSON.stringify({ v: 1, aibou: { roster: { m1: { id: 'm1', art: 'slime', sp: 'slime', rank: 'A', lv: 5, xp: 3, name: 'スラりん' } }, party: ['m1'], food: 12, migrated: 1 } });
const devB = JSON.stringify({ v: 1, aibou: { roster: { m1: { id: 'm1', art: 'slime', sp: 'slime', rank: 'A', lv: 2, xp: 9, name: '' }, m2: { id: 'm2', art: 'dragon', sp: 'dragon', rank: 'SSS', lv: 1, xp: 0, name: 'ドラゴ' } }, party: ['m2'], food: 4 } });
const m = JSON.parse(mergeRpg(devA, devB)).aibou;
c.ok('roster は和集合（m1とm2が残る）', !!m.roster.m1 && !!m.roster.m2);
c.eq('lvはmax(5,2)=5', m.roster.m1.lv, 5);
c.eq('xpはmax(3,9)=9', m.roster.m1.xp, 9);
c.eq('名前は消えない(スラりん)', m.roster.m1.name, 'スラりん');
c.eq('エサはmax(12,4)=12', m.food, 12);
c.eq('migratedが残る（旧ペット二重移行防止）', m.migrated, 1);
c.ok('partyはroster内のみ・3匹以下', m.party.every((id) => !!m.roster[id]) && m.party.length <= 3);
const noAi = JSON.parse(mergeRpg(JSON.stringify({ v: 1, level: 2 }), JSON.stringify({ v: 1, level: 3 })));
c.ok('aibou無しの状態を汚さない', !('aibou' in noAi));
const r2 = JSON.parse(mergeRpg(devA, JSON.stringify({ v: 1 }))).aibou;
c.ok('片側だけでも保全される', r2 && !!r2.roster.m1 && r2.food === 12);

c.done();
