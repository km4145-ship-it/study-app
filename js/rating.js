/* rating.js：れんしゅう偏差値（実力メーター）。クラシックスクリプト・グローバル定義。
   ふだんの練習・バトルの全解答から、教科ごとの実力を毎問更新する（模試の偏差値とは別物）。

   ■ ロジックの根拠（リサーチ済み）
   - Klinkenberg, Straatemeier & van der Maas (2011) の Computer Adaptive Practice（Math Garden）：
     Elo レーティングを教育に応用。生徒と問題の両方に「強さ」を持たせ、1問ごとに即時更新。
     IRT（項目反応理論）の1PLモデルと等価な期待正答率を使う。
   - Pelánek (2016) "Applications of the Elo rating system in adaptive educational systems"：
     ①選択式は当て推量（guessing）を期待値に織り込む（4択なら g=0.25）
     ②K（更新幅）は回答数とともに減衰させると安定と追従のバランスが良い
   - Glicko の思想（不確実性が大きいほど大きく動く）を K 減衰で簡略化。

   ■ 実装
   - レートは偏差値スケールをそのまま使う（初期50・クランプ25〜80）
   - 問題難易度 b は ★ レベルから：★=42 / ★★=50 / ★★★=58 / ★★★★=66
   - 期待正答率 E = g + (1−g) / (1 + 10^((b−r)/S))、S=12（r−b=12 で約9割正解の感覚）
   - 更新 r ← r + K・(結果 − E)、K = 1.5 + 4.5/√(1 + n/15)
     → 最初は速く収束し、その後も K≧1.5 なので毎日の調子で上下に変動する（仕様）
   - むずかしい問題ほど正解の上げ幅が大きく、かんたんな問題を正解しても ほぼ動かない
     ＝かんたん問題の連打ではレートを盛れない（Elo の性質）
   - 学年の扱い：出題内容は muGradeBand（登録学年）が制御。レートは★難易度に対する
     相対値なので、実力が上がれば上の学年相当（★★★★）へ自然に踏み込む */

var RATING_S = 12, RATING_K0 = 6, RATING_KMIN = 1.5, RATING_MIN = 25, RATING_MAX = 80, RATING_START = 50;
var RATING_DIFF = { 0: 50, 1: 42, 2: 50, 3: 58, 4: 66 };

// ---- 純関数（Node テスト可能） ----
function ratingItemDiff(level){
  var n = (String(level || '').match(/★/g) || []).length;
  return RATING_DIFF[n >= 1 && n <= 4 ? n : 0];
}
function ratingGuess(qType){ return qType === 'choice' ? 0.25 : 0; }
function ratingExpected(r, b, guess){
  var g = guess || 0;
  return g + (1 - g) / (1 + Math.pow(10, (b - r) / RATING_S));
}
function ratingK(n){ return RATING_KMIN + (RATING_K0 - RATING_KMIN) / Math.sqrt(1 + (n || 0) / 15); }
function ratingStep(r, n, b, correct, guess){
  var e = ratingExpected(r, b, guess);
  var nr = r + ratingK(n) * ((correct ? 1 : 0) - e);
  return Math.max(RATING_MIN, Math.min(RATING_MAX, Math.round(nr * 100) / 100));
}
// 全体値＝回答数で重みづけした教科平均（データが無ければ 50）
function ratingOverallOf(by){
  var sw = 0, sr = 0;
  Object.keys(by || {}).forEach(function(k){
    var a = by[k]; if (!a || !a.n) return;
    var w = Math.min(a.n, 100);          // 1教科に偏りすぎないよう重みは100問で頭打ち
    sw += w; sr += (a.r || RATING_START) * w;
  });
  return sw ? Math.round(sr / sw * 100) / 100 : RATING_START;
}
// 日付キー（'2026-7-7' 形式＝ゼロ埋めなし）の昇順ソート。文字列sortだと 7-14 < 7-7 になる罠がある
function ratingDateSort(ks){ return ks.slice().sort(function(a, b){ return new Date(a) - new Date(b); }); }
// 7日前（に一番近い過去の記録）との差。履歴不足なら null
function ratingDelta7(hist, today){
  var ks = ratingDateSort(Object.keys(hist || {}));
  if (ks.length < 2) return null;
  var cur = hist[ks[ks.length - 1]];
  var curT = new Date(ks[ks.length - 1]).getTime();
  var target = null;
  for (var i = ks.length - 2; i >= 0; i--){ target = hist[ks[i]]; if (curT - new Date(ks[i]).getTime() >= 6.5 * 86400000) break; }
  if (target == null) return null;
  return Math.round((cur - target) * 10) / 10;
}
// おまかせ出題用：レート→難易度ティア
function ratingTier(r){
  if (r < 47) return 'basic';
  if (r < 55) return 'std';
  if (r < 63) return 'adv';
  return 'hard';
}

// ---- 保存・更新（実行時のみ。lsGetJSON/lsSetJSON/todayKey はメイン script 定義） ----
function ratingLoad(){
  try { if (typeof lsGetJSON === 'function') return lsGetJSON('practice_rating', { v:1, by:{}, hist:{} }) || { v:1, by:{}, hist:{} }; } catch(e){}
  return { v:1, by:{}, hist:{} };
}
function ratingOverall(st){ return ratingOverallOf((st || {}).by); }

// ===== 表示用の「確定偏差値」＝実際の偏差値のように まとまった実績ごとに更新 =====
// 内部レート(practice_rating)は毎問更新のまま（適応出題に必要）。表示だけをバッチ確定にする。
//   ・初回は20問といた時点で仮確定（それまでは「計測中」）
//   ・以降は10問ごとに確定しなおす。1回の変動は±3.0まで（実際の偏差値らしくジワジワ動く）
var HENSA_FIRST_N = 20, HENSA_BATCH_N = 10, HENSA_STEP_MAX = 3.0;
function hensaDispStep(disp, overallNow){
  var d = { val:(disp && disp.val != null) ? disp.val : null, pend:((disp && disp.pend) || 0) + 1 };
  var need = (d.val == null) ? HENSA_FIRST_N : HENSA_BATCH_N;
  if(d.pend < need) return { disp:d, updated:false, left:need - d.pend };
  var nv = overallNow;
  if(d.val != null) nv = Math.max(d.val - HENSA_STEP_MAX, Math.min(d.val + HENSA_STEP_MAX, nv));
  var prev = d.val;
  d.val = Math.round(nv * 10) / 10;
  d.pend = 0;
  return { disp:d, updated:true, prev:prev, left:HENSA_BATCH_N };
}
// 1問の結果を反映して保存。更新後の状態を返す
function ratingRecord(area, q, correct){
  if (!q) return null;
  var st = ratingLoad();
  st.by = st.by || {}; st.hist = st.hist || {};
  var a = st.by[area] = st.by[area] || { r: RATING_START, n: 0 };
  a.r = ratingStep(a.r, a.n, ratingItemDiff(q.level), !!correct, ratingGuess(q.type));
  a.n = (a.n || 0) + 1;
  try {
    if (typeof todayKey === 'function'){
      st.hist[todayKey()] = ratingOverall(st);
      var ks = ratingDateSort(Object.keys(st.hist));
      if (ks.length > 60){ ks.slice(0, ks.length - 60).forEach(function(k){ delete st.hist[k]; }); }
    }
  } catch(e){}
  try { if (typeof lsSetJSON === 'function') lsSetJSON('practice_rating', st); } catch(e){}
  return st;
}
// 教科のレート（回答5問未満なら全体値で代用）
function ratingAreaR(area){
  var st = ratingLoad();
  var a = (st.by || {})[area];
  if (a && a.n >= 5) return a.r;
  return ratingOverall(st);
}
