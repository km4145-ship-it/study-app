/* scoring.js：採点・進行の純関数（偏差値・試験シードRNG・RPG経験値カーブ）。
   index.html から分離した classic script。純粋関数のみ・挙動不変・グローバル。
   tests/unit-scoring.js のゴールデン値で挙動を固定。メイン <script> より前に読み込む。 */
const EXAM_STATS = {
  math:     { mu:0.57, sigma:0.19 },
  japanese: { mu:0.60, sigma:0.17 },
  english:  { mu:0.58, sigma:0.18 },
  science:  { mu:0.57, sigma:0.18 },
  social:   { mu:0.58, sigma:0.18 },
};

function _seedOf(str){ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }

function withSeed(seed, fn){
  const orig=Math.random; let s=(seed>>>0)||1;
  Math.random=function(){ s|=0; s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
  try{ return fn(); } finally{ Math.random=orig; }
}

function calcHensachiRaw(area, ratio){
  const st = EXAM_STATS[area] || { mu:0.6, sigma:0.18 };
  return 50 + 10*(ratio - st.mu)/st.sigma;
}

function judgeOf(h){
  if(h>=65) return { band:'A', cls:'judge-A', comment:'合格圏！目標の偏差値65に到達！この調子で得意を伸ばそう。' };
  if(h>=60) return { band:'B', cls:'judge-B', comment:'合格有望ライン。ケアレスミスを減らせばさらに上へ。' };
  if(h>=54) return { band:'C', cls:'judge-C', comment:'合格可能圏。間違えた単元を復習して底上げしよう。' };
  if(h>=48) return { band:'D', cls:'judge-D', comment:'あと一歩。基礎の取りこぼしをなくすのが先決。' };
  return { band:'E', cls:'judge-E', comment:'まずは基礎固め。解説をじっくり読んで土台を作ろう。' };
}

function rpgXpForLevel(l){ return Math.pow(Math.max(0,l-1),2)*40; }

function rpgLevelForXp(xp){ return Math.floor(Math.sqrt(Math.max(0,xp)/40))+1; }

// ===== 単元マスター度（Familiar→Proficient→Mastered）=====
// 正答率だけでなく「挑戦回数（＝確信度）」も加味した段階モデル。
// 1回100%は"マスター"にしない（まぐれ/母数不足を排除）＝教育的に正しい習熟の見立て。
// order は「弱い→強い」の並び順。renderMastery とサマリで共有する唯一の判定ソース。
var MASTERY_TIERS = {
  learning:   { key:'learning',   order:0, mk:'▶', label:'れんしゅう中', short:'練習中', col:'#94a3b8' },
  familiar:   { key:'familiar',   order:1, mk:'○', label:'なじんできた', short:'なじみ',   col:'#f59e0b' },
  proficient: { key:'proficient', order:2, mk:'◎', label:'とくい',       short:'とくい',   col:'#36b37e' },
  mastered:   { key:'mastered',   order:3, mk:'👑', label:'マスター',     short:'マスター', col:'#137a4f' },
};
// correct/attempts → tier オブジェクト。attempts=0 は null（マップに出さない）。
function masteryTier(correct, attempts){
  attempts = attempts|0; correct = correct|0;
  if(attempts <= 0) return null;
  var rate = correct / attempts;
  if(attempts >= 6 && rate >= 0.85) return MASTERY_TIERS.mastered;
  if(attempts >= 4 && rate >= 0.70) return MASTERY_TIERS.proficient;
  if(attempts >= 2 && rate >= 0.55) return MASTERY_TIERS.familiar;
  return MASTERY_TIERS.learning;
}
// ログイン連続の更新：1日の欠席は「フリーズ」で救済（7連続ごとに1回まで）。
// 学習ストリーク(currentStreak)は既に月1回の欠席救済を持つのに、ログインボーナス側だけ
// 1日欠席で streak=1 にリセット＝7/14/30/50/100/200/365日の大型報酬が最も脆かった。
// これを是正（"休める設計"＝ダークパターンの逆）。lg={last,streak,freezeAt} を受け取り純粋に次状態を返す。
function loginStreakUpdate(lg, todayStr, yestStr, twoAgoStr){
  lg = lg || {};
  var prev = lg.streak || 0;
  var freezeAt = (lg.freezeAt == null) ? -99 : lg.freezeAt;
  if(lg.last === yestStr) return { streak: prev + 1, frozen:false, freezeAt: freezeAt };
  if(lg.last === twoAgoStr && (prev - freezeAt) >= 7){   // 1日だけの欠席はフリーズで継続
    var ns = prev + 1;
    return { streak: ns, frozen:true, freezeAt: ns };    // フリーズ消費（次は+7連続まで使えない）
  }
  return { streak: 1, frozen:false, freezeAt: -99 };     // 2日以上の欠席 or フリーズ切れ＝リセット
}
// rows=[{correct,attempts},...] → 段階ごとの単元数＋マスター率(%)。
// 「マスター率」は proficient 以上（とくい＋マスター）を習得済みとみなした割合。
function masterySummary(rows){
  var out = { learning:0, familiar:0, proficient:0, mastered:0, total:0, pct:0 };
  (rows||[]).forEach(function(r){
    var t = masteryTier(r.correct, r.attempts); if(!t) return;
    out[t.key]++; out.total++;
  });
  var got = out.proficient + out.mastered;
  out.pct = out.total ? Math.round(got / out.total * 100) : 0;
  return out;
}
