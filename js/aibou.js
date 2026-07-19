/* aibou.js：あいぼう（なかまモンスター）システムのデータ＋純粋関数（classic script・グローバル）。
   バトルに勝つとモンスターが なかまになり、エサ（正解でたまる）で育てて 3匹まで冒険に連れていける。
   ここは「データと計算」だけ＝DOM/localStorageに触れない（テスト容易）。UI/保存は index.html 側。 */

// ===== 種族（魔王・英雄はレア） =====
var AIBOU_SPECIES={
  dragon:{ name:'ドラゴン', em:'🐉', desc:'おうえん攻撃が 強い',            rare:false },
  beast: { name:'魔獣',     em:'🐺', desc:'かいしん（会心）が 出やすくなる', rare:false },
  slime: { name:'スライム', em:'🟢', desc:'みがわりで ダメージを ふせぐ',    rare:false },
  nature:{ name:'自然',     em:'🌿', desc:'たたかいながら HPを 回復',        rare:false },
  maou:  { name:'魔王',     em:'😈', desc:'すべてが 強い でんせつの種族',    rare:true },
  hero:  { name:'英雄',     em:'🦸', desc:'もらえる けいけんちが ふえる',    rare:true }
};
// モンスターのアートキー→基本種族（RPG_SVGの全モンスターを網羅すること＝テストで検証）
var AIBOU_ART_SPECIES={
  slime:'slime', slugking:'slime', inkblob:'slime', flaskun:'slime', microbe:'slime',
  dragon:'dragon', voltdrake:'dragon',
  goblin:'beast', wolf:'beast', bat:'beast', ghost:'beast', kanjioni:'beast',
  qbird:'beast', fudebird:'beast', mapmoth:'beast', tokiou:'beast',
  trent:'nature', abcube:'nature', grammaro:'nature', haniwa:'nature',
  villain:'maou', daimaou:'maou', enmaou:'maou', hyoumaou:'maou',   // 伝説（LG限定スカウトの大魔王級）
  // 亜種（色ちがい・rpg-assets.jsのRPG_VARIANTS）は基本種と同じ種族
  slime2:'slime', flaskun2:'slime', goblin2:'beast', bat2:'beast', wolf2:'beast', ghost2:'beast',
  dragon2:'dragon', voltdrake2:'dragon', trent2:'nature', haniwa2:'nature'
};

// ===== ランク（9段階・SSSが最強）とパラメータ =====
var AIBOU_RANKS=['F','E','D','C','B','A','S','SS','SSS'];
var AIBOU_RANK_BASE ={ F:2,  E:3,  D:4,  C:5,  B:7,  A:9,  S:12, SS:16, SSS:22, LG:30 };   // 「ちから」の基礎値（LG=スカウト限定の伝説）
var AIBOU_RANK_LVMAX={ F:10, E:15, D:20, C:25, B:30, A:40, S:50, SS:65, SSS:80, LG:99 };   // ランクごとのレベル上限
var AIBOU_ROSTER_MAX=200;                                         // 手持ちの上限（121種コレクション対応で拡大。あふれたらエサになる）

// ランク抽選の重み。lv=戦った章のレベル（1..10、ボスは+2）。高い章ほど高ランクが出やすい
function aibouRankWeights(lv){
  lv=Math.max(1, Math.min(12, lv||1));
  return { F:Math.max(10,260-30*lv), E:Math.max(20,240-22*lv), D:Math.max(30,220-16*lv), C:Math.max(60,170-8*lv),
           B:120+6*lv, A:70+10*lv, S:30+12*lv, SS:10+8*lv, SSS:2+4*lv };
}
function aibouRollRank(lv, rnd){
  var w=aibouRankWeights(lv), tot=0, i;
  for(i=0;i<AIBOU_RANKS.length;i++) tot+=w[AIBOU_RANKS[i]];
  var r=(rnd===undefined?Math.random():rnd)*tot, acc=0;
  for(i=0;i<AIBOU_RANKS.length;i++){ acc+=w[AIBOU_RANKS[i]]; if(r<acc) return AIBOU_RANKS[i]; }
  return 'F';
}
// 勝利後に なかまになりたがる確率（charm=🌈にじのおまもり＝復習ダンジョン限定の報酬で加入しやすく）
function aibouJoinChance(nodeType, charm){
  if(nodeType==='maou') return 1;
  var base=(nodeType==='boss' ? 0.5 : 0.25);
  return Math.min(1, base + (charm ? 0.2 : 0));
}
// 種族の決定：基本はアート由来。まれにレア種族（魔王/英雄）に目ざめる。魔王シグマ(villain)は常に魔王。
// charm でレア種族の確率が2倍になる
function aibouRollSpecies(art, nodeType, rnd, charm){
  var base=AIBOU_ART_SPECIES[art]||'beast';
  if(base==='maou') return 'maou';
  var r=(rnd===undefined?Math.random():rnd);
  var mw=(nodeType==='boss') ? (charm?0.08:0.04) : 0;   // 魔王種のまど（ボス限定・4%/おまもり8%）
  var hw=charm?0.06:0.03;                                // 英雄種のまど（3%/おまもり6%）
  if(r<mw) return 'maou';
  if(r<mw+hw) return 'hero';                             // 魔王まどの すぐ後ろに英雄まど（重なり無し）
  return base;
}
// ===== しんか合成：同じランクの2ひき→ベースのランクが1つ上がる（素材は いなくなる） =====
function aibouNextRank(rank){ var i=AIBOU_RANKS.indexOf(rank); return (i>=0 && i<AIBOU_RANKS.length-1) ? AIBOU_RANKS[i+1] : null; }
function aibouCanFuse(base, mat, partyIds){
  if(!base || !mat || base.id===mat.id) return false;
  if(base.rank!==mat.rank) return false;              // 同じランクどうしだけ
  if(!aibouNextRank(base.rank)) return false;         // SSSは これ以上 進化できない
  if((partyIds||[]).indexOf(mat.id)>=0) return false; // 素材はパーティ外のみ（お気に入りを まちがって消さない）
  return true;
}

// ===== 育成（エサ＝正解でたまる） =====
function aibouXpNeed(lv){ return 12+((lv||1)-1)*6; }                 // つぎのLvまでに必要なけいけんち
function aibouPower(a){ var b=AIBOU_RANK_BASE[(a&&a.rank)||'F']||2; return Math.round(b*(1+0.05*(((a&&a.lv)||1)-1))); }
function aibouLvMax(a){ return AIBOU_RANK_LVMAX[(a&&a.rank)||'F']||10; }
// エサを n 個あげる（a を直接更新）。返り値＝上がったレベル数
function aibouFeed(a, n){
  // 同期データ破損（文字列/NaN/負数）でも while が暴走しないよう矯正
  a.lv=Math.max(1, Math.min(999, parseInt(a.lv,10)||1)); a.xp=Math.max(0, parseInt(a.xp,10)||0);
  var max=aibouLvMax(a), ups=0;
  a.xp=(a.xp||0)+(n||1)*8;
  while((a.lv||1)<max && a.xp>=aibouXpNeed(a.lv)){ a.xp-=aibouXpNeed(a.lv); a.lv=(a.lv||1)+1; ups++; }
  if((a.lv||1)>=max) a.xp=Math.min(a.xp, aibouXpNeed(max));   // 上限ではあふれを止める
  return ups;
}

// ===== パーティ（3匹）の応援効果 =====
// 種族ごとの「おうえん攻撃」の弾エフェクト（UI側が敵へ飛ばす絵文字）
var AIBOU_SHOT_EM={ dragon:'🔥', beast:'⚡', slime:'💧', nature:'🍃', maou:'🌑', hero:'⭐' };
// 返り値: support=正解時の追加ダメージ / critAt=会心に必要なコンボ数 / guard=みがわり回数 /
//         healPer3=3問正解ごとのHP回復量 / xpMult=バトル後けいけんち倍率
//         supportIdx/guardIdx/healIdx=発動を演出するパーティ内の個体（-1=いない）/ supportEm=弾の絵文字
function aibouPartyFx(party){
  var fx={ support:0, critAt:3, guard:0, healPer3:0, xpMult:1, supportIdx:-1, supportEm:'🔥', guardIdx:-1, healIdx:-1 };
  var best=-1;
  (party||[]).forEach(function(a, i){
    if(!a) return;
    var p=aibouPower(a), sp=a.sp;
    var contrib=p * (sp==='dragon' ? 1.6 : (sp==='maou' ? 1.8 : 1));
    fx.support += contrib;
    if(contrib>best){ best=contrib; fx.supportIdx=i; fx.supportEm=AIBOU_SHOT_EM[sp]||'🔥'; }   // いちばん強い子が撃つ
    if(sp==='beast') fx.critAt=2;
    if(sp==='slime'||sp==='maou'){ fx.guard+=1; if(fx.guardIdx<0) fx.guardIdx=i; }
    if(sp==='nature'){ fx.healPer3+=3; if(fx.healIdx<0) fx.healIdx=i; }
    if(sp==='hero') fx.xpMult+=0.15;
  });
  fx.support=Math.ceil(fx.support*0.25);
  fx.xpMult=Math.min(Math.round(fx.xpMult*100)/100, 1.45);   // 浮動小数点誤差を丸める（0.15×3=1.4499…対策）
  return fx;
}

// ===== 図鑑れんけい：そのアートキーのなかまで いちばん強い個体（ランク→Lvの順で比較） =====
// 返り値: { rank, lv, count } / なかまに いなければ null
function aibouBestOf(roster, art){
  var best=null, n=0;
  Object.keys(roster||{}).forEach(function(id){
    var a=roster[id]; if(!a || a.art!==art) return;
    n++;
    if(!best){ best=a; return; }
    var ri=AIBOU_RANKS.indexOf(a.rank||'F'), rb=AIBOU_RANKS.indexOf(best.rank||'F');
    if(ri>rb || (ri===rb && (a.lv||1)>(best.lv||1))) best=a;
  });
  return best ? { rank:best.rank||'F', lv:best.lv||1, count:n } : null;
}
