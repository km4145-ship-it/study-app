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

// --- 期間ランキング（通算/今週/今月）---
const api2 = (new Function(code +
  '\nreturn { rankWeekRange, rankMonthRange, rankSumDailyHist, rankActiveDays, rankPeriodBestHensachi, rankBuildRowsPeriod, rankFamilyTotalCum };'))();
const WED = '2026-07-15'; // 水曜（週= 月2026-07-13 〜 水2026-07-15）
c.eq('週範囲(月〜today)', JSON.stringify(api2.rankWeekRange(WED)), JSON.stringify({ from: '2026-07-13', to: '2026-07-15' }));
c.eq('月範囲(1日〜today)', JSON.stringify(api2.rankMonthRange(WED)), JSON.stringify({ from: '2026-07-01', to: '2026-07-15' }));

const dh = JSON.stringify({ '2026-06-30': 10, '2026-07-06': 5, '2026-07-13': 2, '2026-07-14': 4, '2026-07-15': 3 });
const wr = api2.rankWeekRange(WED), mr = api2.rankMonthRange(WED);
c.eq('週合計問題数(2+4+3)', api2.rankSumDailyHist(dh, wr.from, wr.to), 9);
c.eq('月合計問題数(5+2+4+3)', api2.rankSumDailyHist(dh, mr.from, mr.to), 14);
c.eq('週の学習日数', api2.rankActiveDays(dh, wr.from, wr.to), 3);
c.eq('月の学習日数', api2.rankActiveDays(dh, mr.from, mr.to), 4);
c.eq('全期間の学習日数', api2.rankActiveDays(dh, '0000-00-00', '9999-99-99'), 5);
c.eq('壊れたdaily_histは0', api2.rankSumDailyHist('{bad', wr.from, wr.to), 0);

const elog2 = JSON.stringify([{ mode: 'exam', hensachi: 55, date: '2026-07-14' }, { mode: 'exam', hensachi: 60, date: '2026-05-01' }]);
c.eq('週の最高偏差値(55)', api2.rankPeriodBestHensachi(elog2, wr.from, wr.to), 55);
c.eq('月の最高偏差値(55)', api2.rankPeriodBestHensachi(elog2, mr.from, mr.to), 55);
c.eq('期間外は0', api2.rankPeriodBestHensachi(elog2, '2026-08-01', '2026-08-31'), 0);

const pMembers = {
  u1: { c_answered: '320', daily_hist: JSON.stringify({ '2026-07-13': 2, '2026-07-14': 4, '2026-07-15': 3 }), study_log: JSON.stringify([{ mode: 'exam', hensachi: 55, date: '2026-07-14' }]) },
  u2: { c_answered: '280', daily_hist: JSON.stringify({ '2026-07-15': 10 }) },
  u3: { c_answered: '150' },
};
const wrows = api2.rankBuildRowsPeriod(pMembers, users, WED, 'week');
const u1w = wrows.find((r) => r.id === 'u1');
c.eq('週: u1 の問題数=9', u1w.answered, 9);
c.eq('週: u1 の学習日数=3', u1w.activeDays, 3);
c.eq('週: u1 の偏差値=55', u1w.hensachi, 55);
c.eq('週でも cumAnswered は通算(320)', u1w.cumAnswered, 320);
const wsorted = api.rankSort(wrows, 'answered');
c.eq('週の問題数1位は u2(10)', wsorted[0].id, 'u2');
c.eq('週の問題数2位は u1(9)', wsorted[1].id, 'u1');
c.eq('家族の通算合計(cum)=750', api2.rankFamilyTotalCum(wrows), 750);

const arows = api2.rankBuildRowsPeriod(pMembers, users, WED, 'all');
c.eq('通算: u1 の問題数=c_answered(320)', arows.find((r) => r.id === 'u1').answered, 320);

// --- 魔王討伐（RPG連動）---
const api3 = (new Function(code + '\nreturn { rankClearedCount, rankBossFor, rankFamilyGoal };'))();
c.eq('合計0は討伐0体', api3.rankClearedCount(0), 0);
c.eq('合計499は0体', api3.rankClearedCount(499), 0);
c.eq('合計500で1体', api3.rankClearedCount(500), 1);
c.eq('合計1200で2体(500,1000)', api3.rankClearedCount(1200), 2);
c.eq('合計8000で5体', api3.rankClearedCount(8000), 5);
c.eq('合計99万で全7体', api3.rankClearedCount(990000), 7);
c.eq('stage1の魔王名', api3.rankBossFor(1).name, 'ゴブリン将軍');
c.eq('stage1の目標', api3.rankBossFor(1).goal, 500);
c.eq('stage5=魔王シグマ', api3.rankBossFor(5).name, '魔王シグマ');
c.eq('stage0以下はnull', api3.rankBossFor(0), null);
c.ok('範囲超のstageは最後の魔王を返す', api3.rankBossFor(99).name === '虚無の王');
// 次の魔王の目標は rankFamilyGoal.target と一致する（UIの整合）
c.eq('合計750の次の魔王(stage2)目標=次マイルストーン', api3.rankBossFor(api3.rankClearedCount(750) + 1).goal, api3.rankFamilyGoal(750).target);

// index.html/モジュール整合
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は js/ranking.js を読み込む', html.indexOf('<script src="js/ranking.js') >= 0);

c.done();
