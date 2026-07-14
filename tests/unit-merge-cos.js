'use strict';
// cloud-sync.js の mergeRpg / mergeCos を抽出して、着せ替え(cos)・天井(pity)・
// 称号(titles)・セット(sets)が同期のマージで失われないことを検証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-merge-cos');

const src = fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8');
const s = src.indexOf('function mergeCos(');
const anchor = src.indexOf('function mergeRpg(', s);
const endMarker = 'return JSON.stringify(o); }catch(e){ return b||a; } }';
const end = src.indexOf(endMarker, anchor) + endMarker.length;
const code = src.slice(s, end);
const api = (new Function(code + '\nreturn { mergeRpg: mergeRpg, mergeCos: mergeCos };'))();
const mergeRpg = api.mergeRpg;

const local = JSON.stringify({
  v: 1, level: 5, xp: 640, cleared: { asia: 1 }, coll: {}, crystals: { c1: 1 }, story: { s1: 1 },
  dex: { slime: 1 }, stickers: { star: 1 }, pet: { stage: 2, wins: 12, name: 'ぽち', fed: '2026-07-10' },
  daily: { date: '2026-7-12', correct: 8, wins: 1, maxStreak: 3, claimed: { m1: 1 } },
  login: { last: '2026-7-12', streak: 4 }, stamina: { date: '2026-7-12', used: 2 }, dailyBox: '2026-7-12',
  cos: { coin: 200, tickets: 2, welcome: 1, owned: { hat_star: 1, aura_fire: 1 }, equip: { hero: { hat: 'hat_star', aura: 'aura_fire' }, pet: { hat: 'hat_bow' } } },
});
const r1 = JSON.parse(mergeRpg(local, local));
c.ok('reopen: cos保持', r1.cos && typeof r1.cos === 'object');
c.ok('reopen: owned保持', r1.cos.owned.hat_star === 1 && r1.cos.owned.aura_fire === 1);
c.ok('reopen: coin保持(200)', r1.cos.coin === 200);
c.ok('reopen: tickets保持(2)', r1.cos.tickets === 2);
c.ok('reopen: equip保持', r1.cos.equip.hero.hat === 'hat_star' && r1.cos.equip.pet.hat === 'hat_bow');
c.ok('reopen: dailyBox(未知フィールド)保持', r1.dailyBox === '2026-7-12');
c.ok('reopen: welcome保持', r1.cos.welcome === 1);

const deviceB = JSON.stringify({ v: 1, level: 3, cos: { coin: 50, tickets: 0, owned: { hat_crown: 1 }, equip: { hero: { hat: 'hat_crown' } } } });
const r2 = JSON.parse(mergeRpg(local, deviceB));
c.ok('cross: owned合算', r2.cos.owned.hat_star === 1 && r2.cos.owned.hat_crown === 1);
c.ok('cross: coin=max(200,50)', r2.cos.coin === 200);
c.ok('cross: level=max(5,3)', r2.level === 5);

const withPity = JSON.stringify({ v: 1, cos: { coin: 0, tickets: 0, owned: {}, pity: 37 } });
const rp = JSON.parse(mergeRpg(withPity, JSON.stringify({ v: 1, cos: { coin: 0, tickets: 0, owned: {}, pity: 12 } })));
c.ok('pity=max(37,12)=37', rp.cos && rp.cos.pity === 37);

const cA = JSON.stringify({ v: 1, cos: { coin: 0, tickets: 0, owned: {}, titles: { t_wizard: 1 }, sets: { set_wizard: 1 }, title: 't_wizard' } });
const cB = JSON.stringify({ v: 1, cos: { coin: 0, tickets: 0, owned: {}, titles: { t_king: 1 }, sets: { set_king: 1 } } });
const rc = JSON.parse(mergeRpg(cA, cB));
c.ok('titles合算', rc.cos.titles.t_wizard === 1 && rc.cos.titles.t_king === 1);
c.ok('sets合算', rc.cos.sets.set_wizard === 1 && rc.cos.sets.set_king === 1);
c.ok('装備称号保持', rc.cos.title === 't_wizard');

c.ok('null: mergeRpg(null,x)=x', mergeRpg(null, local) === local);
c.ok('null: mergeRpg(x,null)=x', mergeRpg(local, null) === local);

// ===== dailyBox（デイリー宝箱の開封日）は「新しい日付」が勝つ（端末間の二重受取防止）=====
const dbOld = JSON.stringify({ v: 1, dailyBox: '2026-7-9' });
const dbNew = JSON.stringify({ v: 1, dailyBox: '2026-7-12' });
c.ok('dailyBox: 新しい方が勝つ(x新)', JSON.parse(mergeRpg(dbNew, dbOld)).dailyBox === '2026-7-12');
c.ok('dailyBox: 新しい方が勝つ(y新)', JSON.parse(mergeRpg(dbOld, dbNew)).dailyBox === '2026-7-12');
// ゼロ埋め無し形式の月またぎ（文字列比較だと '2026-9-30' > '2026-10-2' で誤る）
const dbSep = JSON.stringify({ v: 1, dailyBox: '2026-9-30' });
const dbOct = JSON.stringify({ v: 1, dailyBox: '2026-10-2' });
c.ok('dailyBox: 月またぎでも新しい方(x=9月, y=10月)', JSON.parse(mergeRpg(dbSep, dbOct)).dailyBox === '2026-10-2');
c.ok('dailyBox: 月またぎでも新しい方(x=10月, y=9月)', JSON.parse(mergeRpg(dbOct, dbSep)).dailyBox === '2026-10-2');
// 片方に無いときはある方を採用・両方無ければフィールド自体を作らない
c.ok('dailyBox: 片方のみ(y)', JSON.parse(mergeRpg(JSON.stringify({ v: 1 }), dbNew)).dailyBox === '2026-7-12');
c.ok('dailyBox: 片方のみ(x)', JSON.parse(mergeRpg(dbNew, JSON.stringify({ v: 1 }))).dailyBox === '2026-7-12');
c.ok('dailyBox: 両方無しなら作らない', !('dailyBox' in JSON.parse(mergeRpg(JSON.stringify({ v: 1 }), JSON.stringify({ v: 1 })))));
c.done();
