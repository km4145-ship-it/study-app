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

// 合計問題数 → 次の共同目標マイルストーンの進捗
function rankFamilyGoal(total) {
  var target = RANK_GOALS[RANK_GOALS.length - 1] * 2, prev = RANK_GOALS[RANK_GOALS.length - 1], stage = RANK_GOALS.length + 1;
  for (var i = 0; i < RANK_GOALS.length; i++) {
    if (total < RANK_GOALS[i]) { target = RANK_GOALS[i]; prev = i > 0 ? RANK_GOALS[i - 1] : 0; stage = i + 1; break; }
  }
  var pct = target > prev ? Math.max(0, Math.min(100, Math.round((total - prev) / (target - prev) * 100))) : 100;
  return { target: target, prev: prev, remaining: Math.max(0, target - total), pct: pct, stage: stage };
}
