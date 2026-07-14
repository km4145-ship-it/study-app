/* duel.js：家族対戦（B1）＝きょうだい対戦（非同期・同一問題セット）と 協力レイド（週間ボス）。
   クラシックスクリプト・グローバル定義。ここは純データ・純関数のみ（Node テスト可能）。
   - 対戦状は「問題そのもの」を持ち運ぶ（seed 方式だと学年やバージョン差で問題がズレるため）
   - 保存は共有キー family_duels（{id: 対戦状} のマップ）。cloud-sync 側で id 単位の和集合マージ
   - レイドは新しい同期を持たない：家族ランキングが取得する各メンバーの daily_hist から
     「今週の家族合計正解数」を集計し、週間ボスの HP を削る（全端末で同じ計算＝同じ見え方） */

// ===== 週の扱い（月曜はじまり・キーは 'YYYY-MM-DD' ゼロ埋め＝daily_hist と同じ） =====
function raidPad2(n){ return (n < 10 ? '0' : '') + n; }
function raidDateKey(d){ return d.getFullYear() + '-' + raidPad2(d.getMonth() + 1) + '-' + raidPad2(d.getDate()); }
// その週の月曜〜日曜。weekId は月曜の日付キー
function raidWeekRange(now){
  var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var dow = (d.getDay() + 6) % 7;                      // 月=0 … 日=6
  var mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  var sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  return { weekId: raidDateKey(mon), from: raidDateKey(mon), to: raidDateKey(sun) };
}
// daily_hist（{'YYYY-MM-DD':問題数}・JSON文字列でも可）を期間合計
function raidSumHist(hist, from, to){
  var h = hist;
  if (typeof h === 'string'){ try { h = JSON.parse(h); } catch (e) { h = null; } }
  if (!h) return 0;
  var sum = 0;
  Object.keys(h).forEach(function(k){ if (k >= from && k <= to){ var v = parseInt(h[k], 10); if (isFinite(v)) sum += v; } });
  return sum;
}

// ===== 週間ボス =====
var RAID_BOSSES = [
  { mon: 'slugking',  name: 'けいさん王スライム' },
  { mon: 'dragon',    name: 'ちえのドラゴン' },
  { mon: 'kanjioni',  name: 'かんじ大王' },
  { mon: 'grammaro',  name: 'グラマロー' },
  { mon: 'voltdrake', name: 'ボルトドレイク' },
  { mon: 'tokiou',    name: 'とき王' },
  { mon: 'villain',   name: '魔王シグマ' }
];
function raidHash(s){ var h = 0; for (var i = 0; i < s.length; i++){ h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h; }
// 週とメンバー数から今週のボスと目標を決める（全端末で同じ結果になる決定的計算）
function raidBossFor(weekId, memberCount){
  var b = RAID_BOSSES[raidHash(String(weekId)) % RAID_BOSSES.length];
  var target = 120 * Math.max(1, memberCount || 1);   // 1人あたり週120問（1日20問弱）
  return { mon: b.mon, name: b.name, target: target };
}
// メンバーの週間貢献 → レイド状況
// members: [{uid, name, hist}]（hist は daily_hist）
function raidCompute(members, now){
  var r = raidWeekRange(now || new Date());
  var per = (members || []).map(function(m){
    return { uid: m.uid, name: m.name, n: raidSumHist(m.hist, r.from, r.to) };
  }).sort(function(a, b){ return b.n - a.n; });
  var total = 0; per.forEach(function(p){ total += p.n; });
  var boss = raidBossFor(r.weekId, (members || []).length);
  var hp = Math.max(0, boss.target - total);
  return { weekId: r.weekId, boss: boss, total: total, hp: hp,
           pct: Math.min(100, Math.round(total / boss.target * 100)), defeated: total >= boss.target, per: per };
}

// ===== きょうだい対戦（対戦状） =====
var DUEL_N = 5;          // 1回の対戦は5問
var DUEL_CAP = 12;       // 保存する対戦状の最大数（古いものから捨てる）
// 対戦に使える問題だけ通す（図つき・巨大データは持ち運ばない）
function duelSanitizeQ(q){
  if (!q || !q.q || q.ans === undefined || q.figure) return null;
  var o = { q: q.q, ans: String(q.ans), sub: q.sub || '', level: q.level || '★★☆', type: q.type === 'choice' ? 'choice' : 'free' };
  if (o.type === 'choice'){
    if (!Array.isArray(q.choices) || q.choices.indexOf(q.ans) < 0) return null;
    o.choices = q.choices.map(String);
  }
  if (q.altAns) o.altAns = q.altAns;
  if (q.explain) o.explain = String(q.explain).slice(0, 400);
  return o;
}
function duelNew(fromUid, fromName, area, questions, now){
  var qs = (questions || []).map(duelSanitizeQ).filter(Boolean).slice(0, DUEL_N);
  if (qs.length < DUEL_N) return null;
  return { id: 'd' + now + '-' + fromUid, from: fromUid, fromName: fromName || '', area: area, at: now, qs: qs, results: {} };
}
// 対戦状マップのマージ（id 単位の和集合・results も uid 単位の和集合＝先勝ち・上限で古い順に間引く）
function duelMergeMaps(a, b, cap){
  var out = {};
  [a, b].forEach(function(m){
    Object.keys(m || {}).forEach(function(id){
      var d = m[id]; if (!d || !d.id) return;
      if (!out[id]){ out[id] = JSON.parse(JSON.stringify(d)); return; }
      var t = out[id];
      Object.keys(d.results || {}).forEach(function(uid){
        if (!t.results) t.results = {};
        if (!t.results[uid]) t.results[uid] = d.results[uid];              // 記録は一発勝負＝先にある方を残す
      });
    });
  });
  var ids = Object.keys(out).sort(function(x, y){ return (out[y].at || 0) - (out[x].at || 0); });
  ids.slice(cap || DUEL_CAP).forEach(function(id){ delete out[id]; });
  return out;
}
// 自分から見た対戦状の状態
function duelStatusFor(d, myUid){
  var mine = d.from === myUid;
  var played = !!(d.results && d.results[myUid]);
  var others = Object.keys(d.results || {}).filter(function(u){ return u !== d.from; });
  if (!mine && !played) return 'challenge';        // 挑戦できる
  if (Object.keys(d.results || {}).length >= 2) return 'done';
  return mine ? 'waiting' : 'done';                // 自分が出した→相手待ち
}
// 勝敗（スコア降順→タイム昇順）。全員分の結果を順位付けして返す
function duelRanking(d){
  return Object.keys(d.results || {}).map(function(uid){
    var r = d.results[uid] || {};
    return { uid: uid, name: r.name || uid, score: r.score || 0, timeMs: r.timeMs || 0 };
  }).sort(function(a, b){ return (b.score - a.score) || (a.timeMs - b.timeMs); });
}
