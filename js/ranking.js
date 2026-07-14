/* ranking.js：家族ランキングの集計ロジック（純粋関数・DOM非依存・グローバル）。
   メンバーのデータ（cloudFetchAllMembers の返り値：{uid:{フィールド...}}）と
   ユーザー一覧（mu_users）から、問題数・連続日数・偏差値・レベルの行を作り並べ替える。
   「今日」に依存する連続日数はテスト用に todayStr を注入可能。tests/unit-ranking-logic.js で固定。
   メイン <script> より前に読み込む。 */

// 家族の共同目標（合計問題数のマイルストーン）
var RANK_GOALS = [500, 1000, 2000, 4000, 8000, 16000, 32000];

function _rankToDate(s) { var a = String(s).split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); }
function _rankNum(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }

// study_log(JSON文字列) から、今日(または直近)からの連続学習日数を数える
function rankStreakFromLog(logJson, todayStr) {
  var log; try { log = JSON.parse(logJson || '[]'); } catch (e) { return 0; }
  if (!Array.isArray(log) || !log.length) return 0;
  var set = {}; log.forEach(function (e) { if (e && e.date) set[e.date] = 1; });
  var days = Object.keys(set).sort();
  if (!days.length) return 0;
  var today = todayStr ? _rankToDate(todayStr) : (function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  var dayMs = 86400000;
  var gap = Math.round((today - _rankToDate(days[days.length - 1])) / dayMs);
  if (gap > 1) return 0; // 昨日も今日も学習なし＝連続途切れ
  var streak = 1;
  for (var i = days.length - 1; i > 0; i--) {
    if (Math.round((_rankToDate(days[i]) - _rankToDate(days[i - 1])) / dayMs) === 1) streak++;
    else break;
  }
  return streak;
}

// study_log から模試(exam)の最高偏差値
function rankBestHensachi(logJson) {
  var log; try { log = JSON.parse(logJson || '[]'); } catch (e) { return 0; }
  if (!Array.isArray(log)) return 0;
  var hs = log.filter(function (e) { return e && e.mode === 'exam' && typeof e.hensachi === 'number'; })
    .map(function (e) { return e.hensachi; });
  return hs.length ? Math.max.apply(null, hs) : 0;
}

// 1人ぶんのメンバーデータ(フィールドは文字列)から指標を算出
function rankUserMetrics(data, todayStr) {
  data = data || {};
  var level = 1; try { var rs = JSON.parse(data.rpg_state || '{}'); if (rs && rs.level) level = rs.level; } catch (e) {}
  return {
    answered: _rankNum(data.c_answered),
    points: _rankNum(data.c_points),
    streak: rankStreakFromLog(data.study_log, todayStr),
    hensachi: rankBestHensachi(data.study_log),
    level: level,
  };
}

// 全メンバー×ユーザー一覧 → 行配列
function rankBuildRows(allMembers, users, todayStr) {
  allMembers = allMembers || {}; users = users || [];
  return users.map(function (u) {
    var m = rankUserMetrics(allMembers[u.id] || {}, todayStr);
    return {
      id: u.id, name: u.name, char: u.char, admin: !!u.admin,
      answered: m.answered, points: m.points, streak: m.streak, hensachi: m.hensachi, level: m.level,
    };
  });
}

// 指標で降順ソート（同点は問題数→名前で安定化）
function rankSort(rows, key) {
  key = key || 'answered';
  return rows.slice().sort(function (a, b) {
    return (b[key] || 0) - (a[key] || 0) || (b.answered || 0) - (a.answered || 0) ||
      (String(a.name) > String(b.name) ? 1 : -1);
  });
}

// 家族の合計問題数
function rankFamilyTotal(rows) { return rows.reduce(function (s, r) { return s + (r.answered || 0); }, 0); }

// ===== 期間ランキング（通算 / 今週 / 今月）=====
// daily_hist = {'YYYY-MM-DD': その日の問題数} を期間で合計する。日付は文字列比較でOK（YYYY-MM-DD）。
function _rankKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function _rankAddDays(dateStr, n) { var d = _rankToDate(dateStr); d.setDate(d.getDate() + n); return _rankKey(d); }

// 今週（月曜〜today）
function rankWeekRange(todayStr) {
  var dow = _rankToDate(todayStr).getDay();   // 0=日..6=土
  var backToMon = (dow + 6) % 7;              // 月曜までの戻り日数
  return { from: _rankAddDays(todayStr, -backToMon), to: todayStr };
}
// 今月（1日〜today）
function rankMonthRange(todayStr) {
  var d = _rankToDate(todayStr);
  return { from: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01', to: todayStr };
}
// daily_hist を期間で合計（問題数）
function rankSumDailyHist(json, from, to) {
  var h; try { h = JSON.parse(json || '{}'); } catch (e) { return 0; }
  if (!h || typeof h !== 'object') return 0;
  var s = 0; Object.keys(h).forEach(function (k) { if (k >= from && k <= to) s += (+h[k] || 0); }); return s;
}
// 期間内に学習した日数（>0の日を数える）
function rankActiveDays(json, from, to) {
  var h; try { h = JSON.parse(json || '{}'); } catch (e) { return 0; }
  if (!h || typeof h !== 'object') return 0;
  var n = 0; Object.keys(h).forEach(function (k) { if (k >= from && k <= to && (+h[k] || 0) > 0) n++; }); return n;
}
// 期間内の模試の最高偏差値
function rankPeriodBestHensachi(logJson, from, to) {
  var log; try { log = JSON.parse(logJson || '[]'); } catch (e) { return 0; }
  if (!Array.isArray(log)) return 0;
  var hs = log.filter(function (e) { return e && e.mode === 'exam' && typeof e.hensachi === 'number' && e.date && e.date >= from && e.date <= to; })
    .map(function (e) { return e.hensachi; });
  return hs.length ? Math.max.apply(null, hs) : 0;
}
// 期間指定で行を構築。period: 'all'|'week'|'month'。
//   answered は期間内の問題数（allは通算 c_answered）、activeDays は期間内の学習日数、
//   hensachi は期間内の最高偏差値（allは全期間）。cumAnswered/points/streak/level は通算。
function rankBuildRowsPeriod(allMembers, users, todayStr, period) {
  allMembers = allMembers || {}; users = users || []; period = period || 'all';
  var range = period === 'week' ? rankWeekRange(todayStr) : period === 'month' ? rankMonthRange(todayStr) : { from: '0000-00-00', to: '9999-99-99' };
  return users.map(function (u) {
    var data = allMembers[u.id] || {};
    var cum = rankUserMetrics(data, todayStr);
    return {
      id: u.id, name: u.name, char: u.char, admin: !!u.admin,
      answered: period === 'all' ? cum.answered : rankSumDailyHist(data.daily_hist, range.from, range.to),
      cumAnswered: cum.answered, points: cum.points, streak: cum.streak, level: cum.level,
      activeDays: rankActiveDays(data.daily_hist, range.from, range.to),
      hensachi: period === 'all' ? cum.hensachi : rankPeriodBestHensachi(data.study_log, range.from, range.to),
    };
  });
}
// 家族の通算合計問題数（共同目標バー用）
function rankFamilyTotalCum(rows) { return rows.reduce(function (s, r) { return s + (r.cumAnswered != null ? r.cumAnswered : r.answered || 0); }, 0); }

// ===== 家族の共同目標＝魔王討伐（RPG連動）=====
// RANK_GOALS の各マイルストーンに「家族で討伐する魔王」を対応させる（stageは1始まり）。
var RANK_BOSSES = [
  { emoji: '👺', name: 'ゴブリン将軍' },   // 500
  { emoji: '🧟', name: 'アンデッド軍団' }, // 1000
  { emoji: '🐺', name: '魔狼フェンリル' }, // 2000
  { emoji: '🐉', name: '魔竜バハムート' }, // 4000
  { emoji: '👹', name: '魔王シグマ' },     // 8000
  { emoji: '💀', name: '冥王タナトス' },   // 16000
  { emoji: '🌑', name: '虚無の王' },       // 32000
];
// 通算合計問題数から、これまでに討伐した魔王の数（超えたマイルストーン数）
function rankClearedCount(total) {
  var n = 0; for (var i = 0; i < RANK_GOALS.length; i++) { if (total >= RANK_GOALS[i]) n++; else break; } return n;
}
// stage(1始まり) の魔王情報（超過時は最後の魔王を返す。範囲外の0以下はnull）
function rankBossFor(stage) {
  if (!stage || stage < 1) return null;
  var idx = Math.min(stage, RANK_BOSSES.length) - 1;
  var b = RANK_BOSSES[idx];
  return { emoji: b.emoji, name: b.name, goal: RANK_GOALS[Math.min(stage, RANK_GOALS.length) - 1], stage: stage };
}
// ===== 魔王解放イベント（家族→RPG連動）=====
// 家族の共同目標で「魔王シグマ」（RANK_BOSSES[4]＝stage5・8000問）を討伐すると、
// RPG本編の魔王城がクリスタル5個そろっていなくても先行解放される。
// 引数は rank_family_goal（討伐済みステージ数。共有キーで家族全員に同期される）の値
var RANK_MAOU_STAGE = 5;
function rankMaouFreed(clearedCount) { return (parseInt(clearedCount, 10) || 0) >= RANK_MAOU_STAGE; }

// 合計問題数 → 次の共同目標マイルストーンの進捗
function rankFamilyGoal(total) {
  var target = RANK_GOALS[RANK_GOALS.length - 1] * 2, prev = RANK_GOALS[RANK_GOALS.length - 1], stage = RANK_GOALS.length + 1;
  for (var i = 0; i < RANK_GOALS.length; i++) {
    if (total < RANK_GOALS[i]) { target = RANK_GOALS[i]; prev = i > 0 ? RANK_GOALS[i - 1] : 0; stage = i + 1; break; }
  }
  var pct = target > prev ? Math.max(0, Math.min(100, Math.round((total - prev) / (target - prev) * 100))) : 100;
  return { target: target, prev: prev, remaining: Math.max(0, target - total), pct: pct, stage: stage };
}
