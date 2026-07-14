'use strict';
// js/duel.js（家族対戦・協力レイド B1）の純ロジックを検証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-duel');

const code = fs.readFileSync(path.join(ROOT, 'js', 'duel.js'), 'utf8');
try { new Function(code)(); c.ok('duel.js 単体loadで例外なし', true); }
catch (e) { c.ok('duel.js 単体loadで例外なし: ' + e.message, false); }
const api = (new Function(code +
  '\nreturn { raidWeekRange, raidSumHist, raidBossFor, raidCompute, RAID_BOSSES, duelSanitizeQ, duelNew, duelMergeMaps, duelStatusFor, duelRanking, DUEL_N };'))();

// ---- 週レンジ（月曜はじまり・ゼロ埋め）----
{
  const r = api.raidWeekRange(new Date(2026, 6, 14));   // 2026-07-14 は火曜
  c.eq('週は月曜から', r.from, '2026-07-13');
  c.eq('週は日曜まで', r.to, '2026-07-19');
  c.eq('weekId=月曜', r.weekId, '2026-07-13');
  const r2 = api.raidWeekRange(new Date(2026, 6, 13));  // 月曜そのもの
  c.eq('月曜は自分が週初', r2.from, '2026-07-13');
  const r3 = api.raidWeekRange(new Date(2026, 6, 19));  // 日曜
  c.eq('日曜も同じ週', r3.from, '2026-07-13');
  const r4 = api.raidWeekRange(new Date(2026, 7, 1));   // 月またぎ（8/1土曜）
  c.eq('月またぎでも正しい週初', r4.from, '2026-07-27');
}
// ---- 履歴の期間合計 ----
c.eq('範囲内のみ合計', api.raidSumHist({ '2026-07-13': 10, '2026-07-14': 5, '2026-07-12': 99 }, '2026-07-13', '2026-07-19'), 15);
c.eq('JSON文字列でもOK', api.raidSumHist('{"2026-07-14":7}', '2026-07-13', '2026-07-19'), 7);
c.eq('壊れたJSONは0', api.raidSumHist('{oops', '2026-07-13', '2026-07-19'), 0);
c.eq('nullは0', api.raidSumHist(null, 'a', 'z'), 0);

// ---- 週間ボス（決定的・人数スケール）----
{
  const b1 = api.raidBossFor('2026-07-13', 3), b2 = api.raidBossFor('2026-07-13', 3);
  c.ok('同じ週は同じボス（全端末で一致）', b1.mon === b2.mon && b1.name === b2.name);
  c.eq('目標は人数×120', b1.target, 360);
  c.ok('ボスはRAID_BOSSESのどれか', api.RAID_BOSSES.some((b) => b.mon === b1.mon));
  c.eq('0人でも目標は最低120', api.raidBossFor('2026-07-13', 0).target, 120);
}
// ---- レイド集計 ----
{
  const members = [
    { uid: 'u1', name: 'パパ', hist: { '2026-07-13': 100 } },
    { uid: 'u2', name: 'ちさき', hist: { '2026-07-14': 200 } },
    { uid: 'u3', name: 'あやか', hist: { '2026-07-01': 999 } },   // 先週分はノーカウント
  ];
  const r = api.raidCompute(members, new Date(2026, 6, 14));
  c.eq('家族合計は今週分のみ', r.total, 300);
  c.eq('目標=3人×120', r.boss.target, 360);
  c.eq('残りHP', r.hp, 60);
  c.ok('未討伐', !r.defeated);
  c.eq('貢献は多い順', r.per[0].name, 'ちさき');
  const r2 = api.raidCompute([{ uid: 'u1', name: 'p', hist: { '2026-07-13': 999 } }], new Date(2026, 6, 14));
  c.ok('目標超えで討伐・HPは0未満にならない', r2.defeated && r2.hp === 0);
}

// ---- 対戦状 ----
const q = (i, type) => ({ q: '問題' + i, ans: 'A', type: type || 'choice', choices: ['A', 'B', 'C', 'D'], sub: 's', level: '★★☆' });
c.ok('図つき問題は持ち運ばない', api.duelSanitizeQ({ q: 'x', ans: '1', figure: '<svg/>' }) === null);
c.ok('正解が選択肢に無い問題は捨てる', api.duelSanitizeQ({ q: 'x', ans: 'Z', type: 'choice', choices: ['A', 'B'] }) === null);
c.ok('記述問題はOK', !!api.duelSanitizeQ({ q: 'x', ans: '12', type: 'free' }));
{
  const d = api.duelNew('u1', 'ちさき', 'math', [q(1), q(2), q(3), q(4), q(5)], 1000);
  c.ok('5問そろえば対戦状ができる', !!d && d.qs.length === api.DUEL_N);
  c.eq('idは時刻+発行者', d.id, 'd1000-u1');
  c.ok('4問では作れない', api.duelNew('u1', 'A', 'math', [q(1), q(2), q(3), q(4)], 1) === null);
}
// ---- マージ（union・先勝ち・cap）----
{
  const mk = (id, at, results) => ({ id, from: 'u1', fromName: 'A', area: 'math', at, qs: [q(1)], results: results || {} });
  const a = { d1: mk('d1', 100, { u1: { score: 5, name: 'A' } }) };
  const b = { d1: mk('d1', 100, { u2: { score: 3, name: 'B' } }), d2: mk('d2', 200) };
  const m = api.duelMergeMaps(a, b);
  c.eq('id単位の和集合', Object.keys(m).length, 2);
  c.ok('resultsもuid単位の和集合', !!(m.d1.results.u1 && m.d1.results.u2));
  const a2 = { d1: mk('d1', 100, { u1: { score: 5 } }) };
  const b2 = { d1: mk('d1', 100, { u1: { score: 999 } }) };
  c.eq('同一uidの記録は先勝ち（書き換え不可）', api.duelMergeMaps(a2, b2).d1.results.u1.score, 5);
  const many = {}; for (let i = 0; i < 20; i++) many['x' + i] = mk('x' + i, i);
  c.eq('上限で古い順に間引く', Object.keys(api.duelMergeMaps(many, {}, 12)).length, 12);
  c.ok('新しい方が残る', !!api.duelMergeMaps(many, {}, 12).x19 && !api.duelMergeMaps(many, {}, 12).x0);
}
// ---- 状態・勝敗 ----
{
  const d = { id: 'd1', from: 'u1', at: 1, results: { u1: { score: 4, timeMs: 60000, name: 'A' } } };
  c.eq('相手から見たら挑戦できる', api.duelStatusFor(d, 'u2'), 'challenge');
  c.eq('出した本人は相手待ち', api.duelStatusFor(d, 'u1'), 'waiting');
  d.results.u2 = { score: 4, timeMs: 45000, name: 'B' };
  c.eq('両者そろえばdone', api.duelStatusFor(d, 'u1'), 'done');
  const rk = api.duelRanking(d);
  c.eq('同点はタイムが速い方が勝ち', rk[0].uid, 'u2');
  d.results.u2.score = 3;
  c.eq('スコアが高い方が勝ち', api.duelRanking(d)[0].uid, 'u1');
}

// ---- index.html / cloud-sync 統合 ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cloud = fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8');
c.ok('index.html は js/duel.js を読み込む', html.indexOf('<script src="js/duel.js') >= 0);
c.ok('家族タブにレイド＋対戦を差し込む', html.indexOf('_familyExtras()') >= 0);
c.ok('対戦中はリベンジ挿入しない', html.indexOf('&& !_duel') >= 0);
c.ok('raid_claim がユーザー別キー登録済み', html.indexOf('raid_claim:1') >= 0);
c.ok('cloud-sync: family_duels が共有キー', cloud.indexOf("'family_duels'") >= 0);
c.ok('cloud-sync: mergeDuels が読み書き両方に入っている', /mergeKey[\s\S]{0,200}family_duels/.test(cloud) && /saveSharedGrowOnly[\s\S]{0,700}family_duels/.test(cloud));
c.done();
