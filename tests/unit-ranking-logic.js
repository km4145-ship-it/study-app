'use strict';
// js/ranking.js（家族ランキングの集計・純粋関数）のテスト。連続日数は todayStr を注入して決定論化。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-ranking-logic');

const code = fs.readFileSync(path.join(ROOT, 'js', 'ranking.js'), 'utf8');
const api = (new Function(code +
  '\nreturn { rankStreakFromLog, rankBestHensachi, rankUserMetrics, rankBuildRows, rankSort, rankFamilyTotal, rankFamilyGoal };'))();

// --- 連続日数（today=2026-07-13 固定）---
const TODAY = '2026-07-13';
const log3 = JSON.stringify([{ date: '2026-07-11' }, { date: '2026-07-12' }, { date: '2026-07-13' }]);
c.eq('3日連続', api.rankStreakFromLog(log3, TODAY), 3);
c.eq('昨日まで(今日未学習)でも連続継続', api.rankStreakFromLog(JSON.stringify([{ date: '2026-07-11' }, { date: '2026-07-12' }]), TODAY), 2);
c.eq('2日以上空くと0', api.rankStreakFromLog(JSON.stringify([{ date: '2026-07-01' }]), TODAY), 0);
c.eq('重複日は1日に圧縮', api.rankStreakFromLog(JSON.stringify([{ date: '2026-07-13' }, { date: '2026-07-13' }]), TODAY), 1);
c.eq('空ログは0', api.rankStreakFromLog('[]', TODAY), 0);
c.eq('壊れたJSONは0', api.rankStreakFromLog('{bad', TODAY), 0);

// --- 最高偏差値 ---
const elog = JSON.stringify([
  { mode: 'exam', hensachi: 52 }, { mode: 'practice', hensachi: 99 }, { mode: 'exam', hensachi: 61 }, { mode: 'exam' },
]);
c.eq('exam の最高偏差値(practiceは除外)', api.rankBestHensachi(elog), 61);
c.eq('exam無しは0', api.rankBestHensachi(JSON.stringify([{ mode: 'practice', hensachi: 70 }])), 0);

// --- ユーザー指標 ---
const m = api.rankUserMetrics({ c_answered: '320', c_points: '4200', study_log: log3, rpg_state: JSON.stringify({ level: 12 }) }, TODAY);
c.eq('answered', m.answered, 320);
c.eq('points', m.points, 4200);
c.eq('streak', m.streak, 3);
c.eq('level(rpg_stateから)', m.level, 12);
const m0 = api.rankUserMetrics({}, TODAY);
c.eq('データ無しは answered=0', m0.answered, 0);
c.eq('データ無しは level=1', m0.level, 1);

// --- 行構築・ソート・合計 ---
const users = [{ id: 'u1', name: 'ちさき', char: 'cat', admin: true }, { id: 'u2', name: 'あやか', char: 'rabbit' }, { id: 'u3', name: 'けんいち', char: 'shiba' }];
const members = {
  u1: { c_answered: '320', study_log: log3 },
  u2: { c_answered: '280', study_log: JSON.stringify([{ date: '2026-07-13' }]) },
  u3: { c_answered: '150' },
};
const rows = api.rankBuildRows(members, users, TODAY);
c.eq('行数=ユーザー数', rows.length, 3);
c.eq('メンバーdocが無いユーザーも0で行に出る', rows.find((r) => r.id === 'u3').answered, 150);
const byAns = api.rankSort(rows, 'answered');
c.eq('問題数1位はu1', byAns[0].id, 'u1');
c.eq('問題数3位はu3', byAns[2].id, 'u3');
const byStreak = api.rankSort(rows, 'streak');
c.eq('連続1位はu1(3日)', byStreak[0].id, 'u1');
c.eq('家族合計問題数', api.rankFamilyTotal(rows), 750);

// --- 家族共同目標 ---
const g = api.rankFamilyGoal(750);
c.eq('合計750の次の目標は1000', g.target, 1000);
c.eq('残り250', g.remaining, 250);
c.eq('進捗% (750-500)/(1000-500)=50', g.pct, 50);
c.eq('合計0の目標は500', api.rankFamilyGoal(0).target, 500);
c.eq('合計0の進捗0%', api.rankFamilyGoal(0).pct, 0);

// index.html/モジュール整合
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は js/ranking.js を読み込む', html.indexOf('<script src="js/ranking.js') >= 0);

c.done();
