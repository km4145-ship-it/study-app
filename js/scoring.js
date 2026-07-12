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
