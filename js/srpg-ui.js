/* srpg-ui.js：マス目タクティクス戦闘のUI・操作・出題ゲート（DOMあり）。
   エンジン（js/srpg.js の純粋関数）を呼び、#srpg-screen を描画する。
   ドラクエタクト風：クォータービューの盤（rotateXで傾ける）＋立ち絵（逆回転で立たせる）。

   操作フロー（学習アプリの肝：攻撃は必ず「教科をえらんで1問正解」で発動）:
     自分のターン → [移動(自由)] → [こうげき/とくぎ] → 標的をタップ → 教科をえらぶ → 出題
       → 正解＝発動（弱点教科なら つよめ×1.5）／不正解＝ミス → ターン終了 */

var srpgB = null;   // 現在の戦闘状態（null＝非戦闘）
// ⏩ばいそく：敵ターン・演出の「待ち」を半分に（保存される・出題の思考時間には影響しない）
function _srpgSpd(){ try{ return safeLS.getItem('srpg_speed')==='2' ? 2 : 1; }catch(e){ return 1; } }
function _sd(ms){ return Math.round(ms / _srpgSpd()); }
function srpgToggleSpeed(){
  try{ safeLS.setItem('srpg_speed', _srpgSpd()===2 ? '1' : '2'); sfx('click'); }catch(e){}
  if(srpgB) srpgRender();
}
var SRPG_STAT_JA = { atk:'こうげき', def:'まもり', spd:'すばやさ' };

// ===== 味方編成（③スカウト連動：集めたあいぼうを タクトに 出撃させる）=====
var SRPG_ROLE_BY_SP = { dragon:'attacker', beast:'attacker', slime:'tank', nature:'healer', maou:'mage', hero:'attacker' };
var srpgTeamSel = null;   // 編成画面の作業中の選択 {ids:[...], leader}
// きせかえ（勇者コスメ）の装備ボーナスを タクト用に控えめ換算（×0.6）
function srpgHeroBonus(){
  try{
    var eb = rpgEquipBonus(rpgCosState(rpgState()));   // {hp,atk,def,mp}
    return { hp:Math.round((eb.hp||0)*0.6), atk:Math.round((eb.atk||0)*0.6), def:Math.round((eb.def||0)*0.6), spd:0 };
  }catch(e){ return { hp:0, atk:0, def:0, spd:0 }; }
}
// あいぼうの帽子（a.hat）の装備ボーナス
function srpgAibouBonus(a){
  try{
    if(!a || !a.hat || typeof rpgItemById!=='function') return { hp:0, atk:0, def:0, spd:0 };
    var it = rpgItemById(a.hat); if(!it) return { hp:0, atk:0, def:0, spd:0 };
    var v = Math.ceil(((typeof STAT_EQUIP_MAG!=='undefined' && STAT_EQUIP_MAG[it.r||'N']) || 2) * 0.5);
    return { hp:v, atk:Math.ceil(v/2), def:Math.ceil(v/2), spd:0 };
  }catch(e){ return { hp:0, atk:0, def:0, spd:0 }; }
}
function srpgGearTotal(b){ return (b.hp||0)+(b.atk||0)+(b.def||0)+(b.spd||0); }
function srpgHeroSpec(){
  var u = (typeof muCurrentUser === 'function' && muCurrentUser()) || {};
  var lv = 1; try{ lv = (rpgState().level) || 1; }catch(e){}
  var hname = 'ゆうしゃ'; try{ hname = rpgHeroName(); }catch(e){}
  return { id:'hero', name:hname, art:(u.char || (typeof currentChar!=='undefined'&&currentChar) || 'shiba'), role:'attacker', lvl:lv, rankBase:8, bonus:srpgHeroBonus() };
}
function srpgAibouSpec(a){
  var spName = (typeof AIBOU_SPECIES!=='undefined' && AIBOU_SPECIES[a.sp] && AIBOU_SPECIES[a.sp].name) || 'なかま';
  var base = Math.max(5, (typeof AIBOU_RANK_BASE!=='undefined' && AIBOU_RANK_BASE[a.rank||'C']) || 6);   // スカウトした低ランクが 初期仲間(buddy)より弱い逆転を防ぐ（下限5）
  var role = SRPG_ROLE_BY_SP[a.sp] || 'attacker', lvl = a.lv || 1;
  // モンスター固有とくぎ（種の個性・Lv1から使える）＋役割とくぎ（覚醒で増える）
  var skills = ((SRPG_ROLES[role] || SRPG_ROLES.attacker).skills || []).slice(0, srpgSkillCount(lvl));
  var innate = srpgMonSkill(a.art);
  if(innate && skills.indexOf(innate) < 0) skills.unshift(innate);
  return { id:a.id, name:a.name || spName, art:a.art || 'slime', role:role, lvl:lvl, rankBase:base, rank:a.rank, sp:a.sp, bonus:srpgAibouBonus(a), skills:skills, innate:innate, skLv:a.skLv || 1 };
}
function srpgAibouRosterList(){
  try{ var ai = rpgAibouState(rpgState()); return Object.keys(ai.roster).map(function(id){ return ai.roster[id]; }); }catch(e){ return []; }
}
// 出撃メンバー（勇者＋選んだあいぼう最大4・リーダー先頭・足りなければ既定仲間で補完）
function srpgAllyRoster(){
  var team = null; try{ team = lsGetJSON('srpg_team', null); }catch(e){}
  var hero = srpgHeroSpec();
  var list = srpgAibouRosterList(), byId = {}; list.forEach(function(a){ byId[a.id] = a; });
  var out = [hero];
  if(team && team.ids && team.ids.length){
    team.ids.forEach(function(id){ if(out.length < 5 && byId[id]) out.push(srpgAibouSpec(byId[id])); });
  } else {
    var party = []; try{ party = rpgAibouParty() || []; }catch(e){}
    party.forEach(function(a){ if(a && out.length < 5) out.push(srpgAibouSpec(a)); });
  }
  var fb = [
    { id:'buddy_heal', name:'ヒーラン', art:'trent', role:'healer', lvl:Math.max(1,hero.lvl), rankBase:6 },
    { id:'buddy_tank', name:'ガードン', art:'slime', role:'tank',   lvl:Math.max(1,hero.lvl), rankBase:6 },
    { id:'buddy_mage', name:'ボム',     art:'bat',   role:'mage',   lvl:Math.max(1,hero.lvl), rankBase:6 }
  ];
  for(var k=0; out.length < 3 && k < fb.length; k++) out.push(fb[k]);
  out = out.slice(0, 5);
  var leader = (team && team.leader) || 'hero', li = -1;
  for(var i=0;i<out.length;i++){ if(out[i].id === leader){ li = i; break; } }
  if(li > 0){ var l = out.splice(li, 1)[0]; out.unshift(l); }
  return out;
}

// ---- 編成画面 ----
function srpgTeamScreen(){
  srpgB = null;
  var list = srpgAibouRosterList();
  var team = null; try{ team = lsGetJSON('srpg_team', null); }catch(e){}
  if(!srpgTeamSel){
    var initIds = (team && team.ids) ? team.ids.slice() : list.slice(0, 4).map(function(a){ return a.id; });
    srpgTeamSel = { ids:initIds.filter(function(id){ return list.some(function(a){ return a.id === id; }); }), leader:(team && team.leader) || 'hero' };
  }
  document.getElementById('srpg-title').textContent = 'しゅつげき編成';
  var hero = srpgHeroSpec();
  var roleMeta = SRPG_ROLES;
  var card = function(sp, on, selectable){
    var r = roleMeta[sp.role] || roleMeta.attacker;
    var isLeader = srpgTeamSel.leader === sp.id;
    var nSk = srpgSkillCount(sp.lvl);
    var gear = sp.bonus ? srpgGearTotal(sp.bonus) : 0;
    var innate = sp.innate ? srpgSkill(sp.innate) : null;   // 固有とくぎ＝種の個性を見せる
    return '<div class="srpg-tm-card'+(on?' on':'')+(isLeader?' leader':'')+'">'
      + (isLeader?'<span class="srpg-tm-crown">👑</span>':'')
      + '<div class="srpg-tm-ava">'+((typeof srpgMonArt==='function'&&srpgMonArt(sp.art))||_charStill(sp.art))+'</div>'
      + '<div class="srpg-tm-nm">'+escapeHtml(sp.name)+'</div>'
      + '<div class="srpg-tm-meta">'+r.em+r.name+' <small>Lv'+sp.lvl+(sp.rank?' ('+sp.rank+')':'')+'</small></div>'
      + '<div class="srpg-tm-sk">'+(innate?('<span class="srpg-tm-innate">✦'+escapeHtml(innate.name)+'</span> '):'')+((sp.skLv||1)>1?('<span class="srpg-tm-sklv">技Lv'+sp.skLv+'</span> '):'')+'とくぎ×'+(nSk+(innate?1:0))+(gear>0?' <span class="srpg-tm-gear">🎽そうび+'+gear+'</span>':'')+'</div>'
      + (on ? '<button class="srpg-tm-lead" onclick="srpgTeamSetLeader(\''+sp.id+'\')">'+(isLeader?'★リーダー':'リーダーにする')+'</button>' : '')
      + (selectable ? '<button class="srpg-tm-toggle'+(on?' rm':'')+'" onclick="srpgTeamToggle(\''+sp.id+'\')">'+(on?'はずす':'えらぶ')+'</button>' : '<div class="srpg-tm-fixed">必ず出撃</div>')
      + '</div>';
  };
  var h = '<div class="srpg-team">';
  var trait = srpgLeaderTrait((srpgTeamSel.leader==='hero'?hero:(function(){ var a=list.filter(function(x){return x.id===srpgTeamSel.leader;})[0]; return a?srpgAibouSpec(a):hero; })()).role);
  h += '<div class="srpg-team-lead">👑 リーダー特性：<b>'+(trait?trait.name:'—')+'</b><br><small>'+(trait?trait.desc:'')+'</small></div>';
  h += '<div class="srpg-tm-count">出撃：'+(1+srpgTeamSel.ids.length)+' / 5（勇者＋なかま最大4）</div>';
  h += '<div class="srpg-tm-grid">';
  h += card(hero, true, false);
  list.forEach(function(a){ h += card(srpgAibouSpec(a), srpgTeamSel.ids.indexOf(a.id) >= 0, true); });
  if(!list.length) h += '<div class="srpg-tm-empty">まだ なかまが いないよ。<br>「⚔️ぼうけん」で バトルに かつと なかまが ふえる！</div>';
  h += '</div>';
  h += '<div class="srpg-team-row"><button class="rpg-btn srpg-team-go" onclick="srpgTeamConfirm()">この編成で 出撃！ →</button>'
     + '<button class="rpg-btn ghost srpg-team-auto" onclick="srpgTeamAuto()">✨おまかせ</button></div>';
  h += '<div class="srpg-team-row"><button class="rpg-btn ghost srpg-team-scout" onclick="srpgScoutScreen()">🔮 スカウト</button>'
     + '<button class="rpg-btn ghost srpg-team-fuse" onclick="srpgSkillUpScreen()">🌟 育成（進化・とくぎ）</button></div>';
  h += '</div>';
  document.getElementById('srpg-body').innerHTML = h;
  try{ _char3dHydrateSafe(document.getElementById('srpg-body')); }catch(e){}
}
function srpgTeamToggle(id){
  try{ sfx('click'); }catch(e){}
  var i = srpgTeamSel.ids.indexOf(id);
  if(i >= 0){ srpgTeamSel.ids.splice(i, 1); if(srpgTeamSel.leader === id) srpgTeamSel.leader = 'hero'; }
  else { if(srpgTeamSel.ids.length >= 4){ try{ showToast('⚠️','これ以上 えらべないよ','なかまは 4体まで（勇者と合わせて5体）'); }catch(e){} return; } srpgTeamSel.ids.push(id); }
  srpgTeamScreen();
}
function srpgTeamSetLeader(id){ try{ sfx('click'); }catch(e){} srpgTeamSel.leader = id; srpgTeamScreen(); }
// おまかせ編成：つよさ×役割バランス（かいふく役1体確保→強い順）で自動選抜
function srpgTeamAuto(){
  try{ sfx('click'); }catch(e){}
  var list = srpgAibouRosterList();
  srpgTeamSel.ids = srpgAutoPick(list, 4);
  srpgTeamSel.leader = 'hero';
  srpgTeamScreen();
  try{ showToast('✨','おまかせ編成にしたよ','つよい なかま＋かいふく役で くみました'); }catch(e){}
}
function srpgTeamConfirm(){
  try{ sfx('click'); }catch(e){}
  try{ lsSetJSON('srpg_team', { ids:srpgTeamSel.ids.slice(), leader:srpgTeamSel.leader }); }catch(e){}
  srpgStageSelect();
}

// ================= 起動・ステージ選択 =================
function srpgOpen(dest){
  try{ hideMainScreens(); }catch(e){}
  try{ hideTabbar(); }catch(e){}
  var sc = document.getElementById('srpg-screen'); if(!sc) return;
  sc.style.display = 'block';
  srpgTeamSel = null;
  if(dest==='daily'){ try{ srpgStart('daily'); return; }catch(e){} }
  else if(dest==='tower'){ try{ srpgTowerStart(); return; }catch(e){} }
  else if(dest==='team'){ srpgTeamScreen(); return; }
  srpgStageSelect();   // 既定はステージ選択（毎回 編成をくぐらせない。編成は「編成をかえる」から）
}
function srpgStageCard(id, locked){
  var st = SRPG_STAGES[id], cleared = srpgClearedSet(), done = cleared[id];
  var starMap = (function(){ try{ return lsGetJSON('srpg_stars', {})||{}; }catch(e){ return {}; } })();
  var stStars = starMap[id]||0;
  var cont = (typeof RPG_WORLD!=='undefined' && RPG_WORLD[st.continent]) || { emoji:'⚔️', name:'' };
  var faces = st.enemies.map(function(e){ var a=SRPG_ENEMY_TEMPLATES[e.key].art; return '<span class="srpg-sc-mon">'+((typeof srpgMonArt==='function'&&srpgMonArt(a))||_monStill(a))+'</span>'; }).join('');
  var terr = (st.terrain||[]).reduce(function(m,t){ m[t.kind]=1; return m; }, {});
  var terrIcons = Object.keys(terr).map(function(k){ return SRPG_TERRAIN_META[k].em; }).join('');
  var foot = locked ? '前を クリアで 解放' : ('敵'+st.enemies.length+'体'+(st.boss?' ・ ボス「'+st.boss+'」':'')+(terrIcons?' ・ 地形'+terrIcons:''));
  if(id==='q_maou'){   // 魔王城＝5つのクリスタルで開く決戦（通し糸の到達点）
    var _cn = srpgCrystalCount(cleared);
    foot = locked ? ('💎 5つの クリスタルで ひらく（'+_cn+'/5）') : '💎 5つのクリスタルが かがやく！ さいごの決戦だ';
  }
  return '<button class="srpg-stage-card'+(locked?' locked':'')+(done?' done':'')+(st.type==='quest'?' quest':'')+'" '+(locked?'disabled':'onclick="srpgStart(\''+id+'\')"')+'>'
    + '<div class="srpg-sc-head"><b>'+cont.emoji+' '+escapeHtml(st.name)+'</b>'+(done?('<span class="srpg-sc-stars">'+[1,2,3].map(function(i){return i<=stStars?'★':'☆';}).join('')+'</span>'):'')+(locked?'<span class="srpg-sc-lock">🔒</span>':'')+'</div>'
    + '<div class="srpg-sc-mons">'+faces+'</div>'
    + '<div class="srpg-sc-foot">'+foot+'</div>'
    + '</button>';
}
// ちえのクリスタル収集バー（物語の通し糸を可視化：n/5＋どの大陸のを持っているか）
function srpgCrystalBarHtml(cleared){
  var list = srpgCrystalsFrom(cleared), n = list.filter(function(c){ return c.got; }).length;
  var gems = list.map(function(c){
    return '<span class="srpg-cry'+(c.got?' got':'')+'" title="'+escapeHtml(c.name)+'">'+(c.got?c.em:'⬜')+'</span>';
  }).join('');
  var hint = (n>=5) ? '5つ そろった！ 魔王城で 決戦だ！' : 'ひとつずつ 集めて 魔王シグマを たおそう';
  return '<div class="srpg-crystals"><div class="srpg-cry-head">💎 ちえのクリスタル <b>'+n+'/5</b></div>'
    + '<div class="srpg-cry-row">'+gems+'</div>'
    + '<div class="srpg-cry-hint'+(n>=5?' done':'')+'">'+hint+'</div></div>';
}
// ===== 物語モード：進行の判定（純粋関数 srpg*In に srpg_cleared を注入して委譲＝テスト可能） =====
function srpgNodeDone(area, ci, ni){ return srpgNodeDoneIn(area, ci, ni, srpgClearedSet()); }
function srpgChapDone(area, ci){ return srpgChapDoneIn(area, ci, srpgClearedSet()); }   // 章ボス（node2）クリア＝章クリア
function srpgChapUnlocked(area, ci){ return srpgChapUnlockedIn(area, ci, srpgClearedSet()); }
function srpgNodeUnlocked(area, ci, ni){ return srpgNodeUnlockedIn(area, ci, ni, srpgClearedSet()); }
function srpgContinentDoneCount(area){ var n=0, c=srpgChapterCount(area); for(var i=0;i<c;i++){ if(srpgChapDone(area,i)) n++; } return n; }
// ステージ選択に出す「大陸（物語）」カード。章の進捗を見せ、タップで章一覧へ。
// 大陸(=教科)の単元習得率。記録画面の習熟マップ(masterySummary)をRPG大陸マップにも重ねる。
function srpgAreaMasteryPct(area){
  try{
    if(typeof lsGetJSON!=='function' || typeof masterySummary!=='function') return -1;
    var st=lsGetJSON('topic_stats',{})||{};
    var rows=Object.keys(st).map(function(k){ return st[k]; }).filter(function(r){ return r && r.area===area; });
    if(!rows.length) return -1;
    return masterySummary(rows).pct;
  }catch(e){ return -1; }
}
function srpgContinentCard(area, locked){
  var cont = srpgContinent(area); if(!cont) return '';
  var total = srpgChapterCount(area), done = srpgContinentDoneCount(area);
  var got = !!srpgClearedSet()[cont.crystalId];
  var mas = locked ? -1 : srpgAreaMasteryPct(area);   // 習得率（未挑戦や施錠中は出さない）
  var foot = locked ? '前の大陸を クリアで 解放'
    : (got ? (cont.emoji+' 制覇！「'+escapeHtml(cont.crystalName)+'」獲得ずみ') : ('物語で すすもう ・ '+done+'/'+total+'章 クリア'));
  return '<button class="srpg-stage-card quest'+(locked?' locked':'')+(got?' done':'')+'" '
    + (locked?'disabled':'onclick="srpgContinentScreen(\''+area+'\')"')+'>'
    + '<div class="srpg-sc-head"><b>'+cont.emoji+' '+escapeHtml(cont.name)+' <small style="font-weight:800;color:#a9b6d6;font-size:.72rem">ものがたり</small></b>'
    + (mas>=0?'<span class="srpg-sc-mas" title="この教科の単元 習得率（とくい以上の割合）">🗺️習得 '+mas+'%</span>':'')
    + (got?'<span class="srpg-sc-clear">クリア済</span>':'<span class="srpg-sc-new">'+done+'/'+total+'章</span>')+(locked?'<span class="srpg-sc-lock">🔒</span>':'')+'</div>'
    + '<div class="srpg-sc-foot">'+foot+'</div>'
    + '</button>';
}
// 大陸の章一覧（大陸→章→ノード）。順次解放・クリア表示つき。
function srpgContinentScreen(area){
  srpgB = null;
  var cont = srpgContinent(area); if(!cont){ srpgStageSelect(); return; }
  try{ sfx('click'); }catch(e){}
  var total = srpgChapterCount(area);
  var chaps = '';
  for(var ci=0; ci<total; ci++){
    var unlocked = srpgChapUnlocked(area, ci), chDone = srpgChapDone(area, ci);
    var ch = cont.chapters[ci];
    var cur = unlocked && !chDone;
    var nodes = '';
    for(var ni=0; ni<3; ni++){
      var isBoss = (ni===2), nDone = srpgNodeDone(area, ci, ni), nUnlk = srpgNodeUnlocked(area, ci, ni);
      var nm = (ch.nodes && ch.nodes[ni]) || (ch.title+(isBoss?' ボス':''));
      var ic = nDone ? '✅' : (isBoss ? '👑' : (nUnlk ? '⚔️' : '🔒'));
      var cls = 'srpg-node'+(isBoss?' boss':'')+(nDone?' done':'')+((!nUnlk)?' locked':'');
      nodes += '<button class="'+cls+'" '+(nUnlk?('onclick="srpgStart(\''+srpgChapterId(area,ci,ni)+'\')"'):'disabled')+'>'
        + '<span class="srpg-node-ic">'+ic+'</span>'+escapeHtml(nm)+'</button>';
    }
    var lockNote = unlocked ? '' : '<div class="srpg-chap-lock">🔒 前の章「'+escapeHtml((cont.chapters[ci-1]||{}).title||'')+'」を クリアで 解放</div>';
    chaps += '<div class="srpg-chap'+(chDone?' done':'')+(cur?' cur':'')+((!unlocked)?' locked':'')+'">'
      + '<div class="srpg-chap-head"><span class="srpg-chap-no">第'+(ci+1)+'章</span><b>'+escapeHtml(ch.title)+'</b>'
      + (chDone?'<span class="srpg-sc-clear">クリア</span>':'')+'</div>'
      + '<div class="srpg-chap-topic">📘 '+escapeHtml(ch.topic)+' ・ <span class="srpg-chap-boss">👑'+escapeHtml(ch.boss)+'</span></div>'
      + (unlocked ? ('<div class="srpg-chap-nodes">'+nodes+'</div>') : lockNote)
      + '</div>';
  }
  var done = srpgContinentDoneCount(area);
  document.getElementById('srpg-body').innerHTML =
    '<div class="srpg-select">'
    + '<div class="srpg-select-top"><button class="srpg-mini2" onclick="srpgStageSelect()">← ステージ選択</button>'
    + '<button class="srpg-mini2" onclick="srpgTeamScreen()">🛡️ 編成</button></div>'
    + '<div class="srpg-sec">'+cont.emoji+' '+escapeHtml(cont.name)+' <small>先生を すくい '+escapeHtml(cont.crystalName)+'を とりもどそう（'+done+'/'+total+'章）</small></div>'
    + chaps
    + '</div>';
  document.getElementById('srpg-title').textContent = cont.name;
}
function srpgStageSelect(){
  srpgB = null;
  var cleared = srpgClearedSet();
  var quests = Object.keys(SRPG_STAGES).filter(function(id){ return SRPG_STAGES[id].type === 'quest'; });
  // 裏ボス（エンドゲーム）は 魔王城クリアまで 隠す＝サプライズ
  if(!cleared['q_maou']){ quests = quests.filter(function(id){ return id !== 'q_secret'; }); }
  var trains = Object.keys(SRPG_STAGES).filter(function(id){ return SRPG_STAGES[id].type !== 'quest'; });
  var questCards = quests.map(function(id, i){
    var locked = i > 0 && !cleared[quests[i-1]];
    // 物語モード化した大陸は 章一覧を開く「ものがたり」カードに差し替え（q_math→math など）
    var area = id.indexOf('q_')===0 ? id.slice(2) : null;
    if(area && typeof SRPG_CONTINENTS!=='undefined' && SRPG_CONTINENTS[area]){ return srpgContinentCard(area, locked); }
    return srpgStageCard(id, locked);
  }).join('');
  var trainCards = trains.map(function(id, i){
    var locked = i > 0 && !cleared[trains[i-1]];
    return srpgStageCard(id, locked);
  }).join('');
  // 周回コンテンツ：きょうの挑戦（日替わり・1日1回ボーナス）＆ちょうせんの塔（最高階を目指す）
  var dailyDone = srpgDailyDoneToday(), best = srpgTowerBest();
  var dailySt = srpgDailyStage(_srpgToday());
  var dailyFaces = dailySt.enemies.map(function(e){ var a=SRPG_ENEMY_TEMPLATES[e.key].art; return '<span class="srpg-sc-mon">'+((typeof srpgMonArt==='function'&&srpgMonArt(a))||_monStill(a))+'</span>'; }).join('');
  var loopCards =
    '<button class="srpg-stage-card quest'+(dailyDone?' done':'')+'" onclick="srpgStart(\'daily\')">'
    + '<div class="srpg-sc-head"><b>🌀 きょうの ちょうせん</b>'+(dailyDone?'<span class="srpg-sc-clear">クリア済</span>':'<span class="srpg-sc-new">ボーナス!</span>')+'</div>'
    + '<div class="srpg-sc-mons">'+dailyFaces+'</div>'
    + '<div class="srpg-sc-foot">'+(dailyDone?'また あした あたらしい 敵が くるよ':'まいにち 敵が かわる ・ きょうの初クリアで 🪙+60 と 🍖+5')+'</div>'
    + '</button>'
    + '<button class="srpg-stage-card quest" onclick="srpgTowerStart()">'
    + '<div class="srpg-sc-head"><b>🗼 ちょうせんの塔</b>'+(best?'<span class="srpg-sc-clear">最高 '+best+'階</span>':'')+'</div>'
    + '<div class="srpg-sc-foot">のぼるほど 敵が つよくなる ・ HPを ひきついで 連戦 ・ 5階ごとに ボス＆🎫</div>'
    + '</button>'
    + (srpgTowerSave() ? '<button class="rpg-btn srpg-tower-resume" onclick="srpgTowerResume()">▶ つづきから（'+srpgTowerSave().floor+'階）</button>' : '');
  document.getElementById('srpg-body').innerHTML =
    '<div class="srpg-select">'
    + '<div class="srpg-select-top"><button class="srpg-mini2" onclick="srpgTeamScreen()">🛡️ 編成を かえる</button></div>'
    + '<div class="srpg-sec">🌀 まいにち <small>周回で きたえよう</small></div>'
    + '<div class="srpg-stage-list">'+loopCards+'</div>'
    + '<div class="srpg-sec">🗺️ 大陸クエスト <small>各大陸の 主を たおそう</small></div>'
    + srpgCrystalBarHtml(cleared)
    + '<div class="srpg-stage-list">'+questCards+'</div>'
    + '<div class="srpg-sec">⚔️ 訓練場 <small>自由に れんしゅう</small></div>'
    + '<div class="srpg-stage-list">'+trainCards+'</div>'
    + '</div>';
  document.getElementById('srpg-title').textContent = 'ステージ選択';
}
function srpgClearedSet(){ try{ return lsGetJSON('srpg_cleared', {}) || {}; }catch(e){ return {}; } }
function srpgMarkCleared(id){ try{ var s = srpgClearedSet(); s[id] = 1; lsSetJSON('srpg_cleared', s); }catch(e){} }
// ===== チュートリアル（初回だけ）＆敗北救済（難易度曲線） =====
function _srpgFlag(k){ try{ return safeLS.getItem(k)==='1'; }catch(e){ return false; } }
function _srpgSetFlag(k){ try{ safeLS.setItem(k, '1'); }catch(e){} }
var SRPG_TUT_LINES = [
  // ── 物語（なぜ戦うのか）＝タクト単体で世界観が伝わるように ──
  'むかし、まなびの王国は「ちえの光」で かがやいていた。',
  'でも 魔王シグマの「モヤの霧」で、ちえは モンスターに かわり、動物の先生たちも 霧の中に とらわれてしまった…！',
  'そこで きみの出番だ、見習い勇者！ 問題を といて モンスターを たおし、5つの「ちえのクリスタル」を あつめて、魔王シグマを たおそう！',
  // ── あそびかた ──
  'まずは たたかいかたを おぼえよう。マスの上で たたかう さくせんバトルだよ。',
  'じぶんの ばんが きたら、まず 👣いどう で 青いマスへ うごこう。',
  'つぎに ⚔️こうげき！ 教科を えらんで、もんだいに 正解すると こうげきできるよ。',
  '敵には ⭐弱点の教科が あるよ。弱点を つくと 大ダメージ！',
  'MPが たまったら 🌟とくぎ！ それじゃあ、ぼうけんの はじまりだ！'
];
// 同じステージで2回負けたら、次は おうえんバフ（こうげき+1段階）で再挑戦できる
function srpgLossMap(){ try{ return lsGetJSON('srpg_loss', {}) || {}; }catch(e){ return {}; } }
function srpgNoteLoss(id){ try{ var m = srpgLossMap(); m[id] = (m[id]||0) + 1; lsSetJSON('srpg_loss', m); }catch(e){} }
function srpgClearLoss(id){ try{ var m = srpgLossMap(); if(m[id]){ delete m[id]; lsSetJSON('srpg_loss', m); } }catch(e){} }
function srpgApplyRescue(){
  if((srpgLossMap()[srpgB.stageId]||0) < 2) return;
  srpgB.units.forEach(function(u){ if(u.side==='ally') srpgSetMod(u, 'atk', 1, 99); });
  try{ showToast('📣','おうえんが かけつけた！','みんなの こうげきが アップ！（まけつづけた ステージの おたすけ）'); }catch(e){}
}

// ================= 戦闘の開始 =================
// ===== 周回要素の状態 =====
function _srpgToday(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
var _towerFloor = 1, _towerCarry = null;   // 塔：現在の階＆前フロアからのHP/MP引き継ぎ
function srpgTowerBest(){ try{ return parseInt(safeLS.getItem('srpg_tower_best'),10)||0; }catch(e){ return 0; } }
function srpgDailyDoneToday(){ try{ return safeLS.getItem('srpg_daily_done')===_srpgToday(); }catch(e){ return false; } }
function srpgTowerSave(){ try{ return lsGetJSON('srpg_tower_save', null); }catch(e){ return null; } }
function srpgTowerStart(){ _towerFloor = 1; _towerCarry = null; try{ lsSetJSON('srpg_tower_save', null); }catch(e){} srpgStart('tower'); }
function srpgTowerResume(){
  var sv = srpgTowerSave(); if(!sv){ srpgTowerStart(); return; }
  _towerFloor = sv.floor || 1; _towerCarry = sv.carry || null;
  srpgStart('tower');
}
// 塔の次の階へ：味方のHP/MP（と倒れたか）を持ち越して連戦
function srpgTowerNext(){
  try{ sfx('click'); }catch(e){}
  _towerCarry = {};
  (srpgB && srpgB.units || []).forEach(function(u){
    if(u.side==='ally') _towerCarry[u.id] = { hp:u.hp, mp:u.mp||0, downed:!!u.downed };
  });
  _towerFloor = ((srpgB && srpgB.stage && srpgB.stage.floor) || _towerFloor) + 1;
  srpgStart('tower');
}
function srpgStart(stageId){
  try{ sfx('click'); }catch(e){}
  var _pc = srpgParseChapterId(stageId);
  var stage = (stageId==='daily') ? srpgDailyStage(_srpgToday())
            : (stageId==='tower') ? srpgTowerStage(_towerFloor)
            : _pc ? srpgChapterStage(_pc.area, _pc.ci, _pc.ni)
            : srpgStage(stageId);
  if(!stage){ try{ srpgStageSelect(); }catch(e){} return; }   // 不正なID＝ステージ選択へ戻す
  var units = srpgBuildUnits(stage, srpgAllyRoster());
  // 塔の連戦：前の階の HP/MP を引き継ぐ（倒れた仲間は 30% で復活＝やさしめの消耗戦）
  if(stageId==='tower' && _towerCarry){
    units.forEach(function(u){
      if(u.side!=='ally') return;
      var c = _towerCarry[u.id]; if(!c) return;
      u.hp = c.downed ? Math.max(1, Math.round(u.maxHp*0.3)) : Math.max(1, Math.min(u.maxHp, c.hp));
      u.mp = Math.min(u.mpMax||6, c.mp||0);
    });
  }
  // 声を勇者のキャラに合わせる（読み上げ＝出題・技名・勝敗がそのキャラの声になる）
  try{ var _h = srpgHeroSpec(); if(typeof CHARS!=='undefined' && CHARS[_h.art]) currentChar = _h.art; }catch(e){}
  // 💪にがて教科（練習レートが一番低い教科）＝この教科で正解するとボーナス
  var _nigate = null;
  try{
    var _rs = ratingLoad(), _lo = 1e9;
    SRPG_SUBJECT_KEYS.forEach(function(k){ var e = _rs.by && _rs.by[k]; if(e && e.n >= 3 && e.r < _lo){ _lo = e.r; _nigate = k; } });
  }catch(e){}
  srpgB = {
    stageId: stageId, stage: stage, grid: srpgGridWithBlocks(stage), units: units, nigate: _nigate, nigateHits: 0, hardMode: false, missedQ: [],
    round: 1, order: [], turnPtr: -1, acted: {}, actorId: null,
    phase: 'idle', moved: false, chosenSkill: null, targetTile: null,
    hiMove: {}, hiTarget: {}, hiAoe: {}, combo: 0, over: false, busy: false,
    zoneSet: {}, deploySel: null, charge: null,
    auto: srpgAutoPref()   // 自動モード（移動を自動化）。設定は端末＋ユーザー別に記憶
  };
  document.getElementById('srpg-title').textContent = stage.name;
  try{ if(typeof bgmPlay==='function') bgmPlay(stage.boss ? 'boss' : 'battle'); }catch(e){}   // ボス名があればボス曲（章ボスノード・大陸/魔王/裏ボス 共通）
  srpgApplyRescue();   // まけつづけたステージは おうえんバフ付きで再挑戦
  // 物語モード（大陸アーク）：章ノード0の初回だけ 立ち絵つき導入シーン。あそびかた説明も初回のみ。
  if(_pc){
    srpgRender();
    var chIntro = (_pc.ni === 0) ? _srpgChapterIntroScenes(stageId) : null;
    var chScenes = chIntro ? chIntro.scenes : null;
    var markIntro = function(){ if(chIntro){ chIntro.marks.forEach(srpgMarkStorySeen); } };   // 既読は再生後にだけ
    var firstEver = !_srpgFlag('srpg_tut'); if(firstEver) _srpgSetFlag('srpg_tut');
    var goDeploy = function(){ srpgDeployBegin(); };
    var goStory = function(){
      if(chScenes && chScenes.length){ try{ rpgStoryPlay(chScenes, function(){ markIntro(); goDeploy(); }); return; }catch(e){} }
      markIntro(); goDeploy();   // シーン無し/再生失敗時もフラグは進める（無限リトライ防止）
    };
    // 導入シーンを流すときは あそびかたの世界観説明（先頭3行）を省いて重複を避ける
    if(firstEver){ srpgStoryIntro(SRPG_TUT_LINES.slice(chScenes && chScenes.length ? 3 : 0), goStory); }
    else { goStory(); }
    return;
  }
  // 魔王城：突入シーン（5先生合流・レン参戦・シグマの真実）を初回だけ立ち絵つきで再生
  if(stageId==='q_maou'){
    var maouScenes = (!srpgStorySeen('maou_intro')) ? _srpgStory('maou_intro') : null;
    if(maouScenes && maouScenes.length){
      srpgRender();
      try{ rpgStoryPlay(maouScenes, function(){ srpgMarkStorySeen('maou_intro'); srpgDeployBegin(); }); return; }catch(e){}   // 既読は再生後
    }
  }
  // 裏ボス（エンドゲーム）：真の決戦の突入シーンを初回だけ再生
  if(stageId==='q_secret'){
    var secScenes = (!srpgStorySeen('secret_intro')) ? _srpgStory('secret_intro') : null;
    if(secScenes && secScenes.length){
      srpgRender();
      try{ rpgStoryPlay(secScenes, function(){ srpgMarkStorySeen('secret_intro'); srpgDeployBegin(); }); return; }catch(e){}   // 既読は再生後
    }
  }
  // 初回だけ：あそびかたのチュートリアル（タップ送り・読み上げつき）→ そのままステージの物語へ
  var lines = (stage.story && stage.story.length) ? stage.story.slice() : [];
  if(!_srpgFlag('srpg_tut')){ _srpgSetFlag('srpg_tut'); lines = SRPG_TUT_LINES.concat(lines); }
  if(lines.length){ srpgRender(); srpgStoryIntro(lines, srpgDeployBegin); }
  else { srpgDeployBegin(); }
}
// ===== 物語モードの ヘルパー（シーン取得・既読管理） =====
function _srpgStory(key){ try{ return (typeof SRPG_STORY!=='undefined' && SRPG_STORY[key]) || null; }catch(e){ return null; } }
function _srpgPrologue(){ try{ return (typeof RPG_STORY!=='undefined' && RPG_STORY.prologue) || null; }catch(e){ return null; } }
function srpgStorySeenSet(){ try{ return lsGetJSON('srpg_story_seen', {}) || {}; }catch(e){ return {}; } }
function srpgStorySeen(key){ return !!srpgStorySeenSet()[key]; }
function srpgMarkStorySeen(key){ try{ var s=srpgStorySeenSet(); s[key]=1; lsSetJSON('srpg_story_seen', s); }catch(e){} }
// 章ノード0 の初回に流す導入シーン（プロローグ＋章導入）。
// 既読マークは「再生後」に行うため、ここでは付けずに marks で返す（途中離脱で見逃す事故を防ぐ）。
function _srpgChapterIntroScenes(stageId){
  var pc = srpgParseChapterId(stageId); if(!pc || pc.ni !== 0) return null;
  var seq = [], marks = [];
  if(!srpgStorySeen('prologue')){ var pro=_srpgPrologue(); if(pro && pro.length){ seq=seq.concat(pro); } marks.push('prologue'); }
  var key = pc.area + '_ch' + pc.ci + '_intro';
  if(!srpgStorySeen(key)){ var intro=_srpgStory(key); if(intro && intro.length){ seq=seq.concat(intro); } marks.push(key); }
  return (seq.length || marks.length) ? { scenes:seq, marks:marks } : null;
}
// ---- 配置フェーズ（戦闘前に 味方を マスへ 並べる）----
function srpgDeployBegin(){
  srpgB.phase = 'deploy'; srpgB.deploySel = null; srpgB.zoneSet = {};
  srpgDeployZone(srpgB.stage).forEach(function(t){ srpgB.zoneSet[t.x+','+t.y] = 1; });
  srpgRender();
  srpgToast('🛡️ じんけい', '味方を おいて 陣形を つくろう！');
}
function srpgDeployAuto(){
  try{ sfx('click'); }catch(e){}
  var slots = srpgB.stage.allySlots, allies = srpgB.units.filter(function(u){ return u.side==='ally'; });
  allies.forEach(function(u, i){ var s = slots[i] || slots[slots.length-1]; u.x = s.x; u.y = s.y; });
  srpgB.deploySel = null; srpgRender();
}
function srpgDeployTap(x, y){
  var key = x+','+y, u = srpgUnitAt(srpgB.units, x, y);
  if(u && u.side==='ally'){ srpgB.deploySel = (srpgB.deploySel===u.id) ? null : u.id; try{ sfx('click'); }catch(e){} srpgRender(); return; }
  if(srpgB.deploySel && srpgB.zoneSet[key]){
    var sel = srpgUnitById(srpgB.deploySel), occ = srpgUnitAt(srpgB.units, x, y);
    if(occ && occ.side==='enemy') return;
    var ox = sel.x, oy = sel.y;
    if(occ && occ.side==='ally'){ occ.x = ox; occ.y = oy; }   // 入れ替え
    sel.x = x; sel.y = y; srpgB.deploySel = null;
    try{ sfx('click'); }catch(e){} srpgRender();
  }
}
// 物語モード：各大陸の先生の 単元ヒント（戦闘＝学習の接続。弱点＝その教科でせめると刺さる）
var SRPG_TEACHER_HINT = {
  math:'（コタロウ先生）1問ずつ たしかめて いこう！',
  japanese:'（ミケ先生）ことばを ていねいに 読むニャ！',
  english:'（ラビィ先生）主語と 動詞を 思い出して！',
  science:'（ナナ博士）なぜ？と 考えて みよう！',
  social:'（クマ先生）よく 思い出して すすもう！'
};
// この章の単元・弱点教科・先生の一言を伝える（章バトル開始時）
function srpgChapterHint(stage){
  if(!stage || stage.type !== 'chapter' || !stage.topic) return;
  try{
    var sm = srpgSubjectMeta(stage.forceWeak || stage.continent);
    var th = SRPG_TEACHER_HINT[stage.continent] || '';
    srpgToast('📘 きょうの単元：' + stage.topic, '弱点は ' + sm.em + ' ' + sm.label + '！ この教科で こうげきすると つよいよ。' + (th ? '　' + th : ''));
  }catch(e){}
}
function srpgBattleBegin(){
  try{ sfx('click'); }catch(e){}
  srpgB.phase = 'idle'; srpgB.deploySel = null; srpgB.zoneSet = {}; srpgB._rendered = false;
  srpgB.order = srpgTurnOrder(srpgB.units); srpgB.turnPtr = -1;
  srpgWatchStart();   // 進行ウォッチドッグ開始（万一の停止から自動復帰）
  srpgRender();
  var lead = srpgB.units.filter(function(u){ return u.side==='ally' && u.isLeader; })[0] || srpgB.units.filter(function(u){ return u.side==='ally'; })[0];
  var enemies = srpgB.units.filter(function(u){ return u.side==='enemy'; });
  var boss = enemies.filter(srpgIsBossUnit)[0] || enemies[enemies.length-1];
  srpgVsIntro(lead, boss, function(){
    srpgChapterHint(srpgB.stage);   // 単元・弱点教科・先生の一言（学習の接続）
    if(lead && lead.leaderTrait){ try{ showToast('👑', 'リーダー特性 発動！', lead.leaderTrait.name+'：'+lead.leaderTrait.desc); }catch(e){} }
    setTimeout(srpgNextTurn, lead && lead.leaderTrait ? 700 : 350);
  });
}
// ステージ導入の物語（タップで送る）
var srpgStoryLines = null, srpgStoryIdx = 0, srpgStoryCb = null;
function srpgStoryIntro(lines, cb){
  if(!lines || !lines.length){ if(cb) cb(); return; }
  srpgStoryLines = lines; srpgStoryIdx = 0; srpgStoryCb = cb || null; srpgStoryStep();
}
function srpgStoryStep(){
  var ov = document.getElementById('srpg-ask'); if(!ov) return;
  if(srpgStoryIdx >= srpgStoryLines.length){ ov.style.display = 'none'; var cb = srpgStoryCb; srpgStoryCb = null; if(cb) cb(); return; }
  var line = srpgStoryLines[srpgStoryIdx++];
  ov.innerHTML = '<div class="srpg-story-card" onclick="srpgStoryStep()"><div class="srpg-story-em">📜</div><div class="srpg-story-tx">'+escapeHtml(line)+'</div><div class="srpg-story-go">タップで つづき ▶</div></div>';
  ov.style.display = 'flex';
  srpgSay(line);   // 物語をキャラの声で読み上げ（タップで次の行＝前の声は自動で止まる）
}

// ================= 描画 =================
function srpgFieldSkyClass(){
  var cont = (srpgB && srpgB.stage && srpgB.stage.continent) || 'math';
  return 'sky-' + cont;
}
function srpgRender(){
  if(!srpgB) return;
  var g = srpgB.grid, html = '';
  html += '<div class="srpg-field '+srpgFieldSkyClass()+'"><div class="srpg-stage3d"><div class="srpg-grid" style="grid-template-columns:repeat('+g.w+',var(--st));grid-template-rows:repeat('+g.h+',var(--st))">';
  var byPos = {};
  srpgB.units.forEach(function(u){ if(!u.downed) byPos[u.x+','+u.y] = u; });
  // 大技の予告（チャージ中・発動者が生きているあいだ 赤マスを塗り続ける）
  var chgOn = false;
  if(srpgB.charge){ var _co = srpgUnitById(srpgB.charge.by); chgOn = !!(_co && !_co.downed); }
  for(var y=0; y<g.h; y++) for(var x=0; x<g.w; x++){
    var key = x+','+y;
    var cls = 'srpg-tile';
    if((x+y)%2===0) cls += ' alt';
    if(srpgB.hiMove[key]) cls += ' hi-move';
    if(srpgB.hiAtk && srpgB.hiAtk[key]) cls += ' hi-atk';
    if(srpgB.hiTarget[key]) cls += ' hi-target';
    if(srpgB.hiAoe[key]) cls += ' hi-aoe';
    if(chgOn && srpgB.charge.set[key]) cls += ' hi-charge';
    if(srpgB.phase==='deploy' && srpgB.zoneSet[key]) cls += ' hi-deploy';
    var actor = srpgActor();
    if(actor && actor.x===x && actor.y===y && !actor.downed) cls += ' actor';
    var blockKind = srpgB.grid.blocked && srpgB.grid.blocked[key];
    if(blockKind) cls += ' blocked';
    var terr = srpgTerrainAt(srpgB.stage, x, y);
    if(terr) cls += ' terr-' + SRPG_TERRAIN_META[terr].cls;
    var inner = blockKind ? ('<span class="srpg-block">'+(SRPG_BLOCK_META[blockKind]||SRPG_BLOCK_META.rock).em+'</span>') : (terr ? ('<span class="srpg-terr">'+SRPG_TERRAIN_META[terr].em+'</span>') : '');
    var u = byPos[key];
    if(u){
      var uAct = (actor && actor.id===u.id) || (srpgB.phase==='deploy' && srpgB.deploySel===u.id);
      var uDone = srpgB.acted && srpgB.acted[u.id] && !uAct;
      inner += '<div class="srpg-foot '+u.side+(uAct?' isactor':'')+(uDone?' done':'')+'"></div>' + srpgUnitPlate(u);
    }
    html += '<div class="'+cls+'" id="st-'+x+'-'+y+'" onclick="srpgTileTap('+x+','+y+')">'+inner+'</div>';
  }
  html += '</div></div>';
  html += '<div class="srpg-fx" id="srpg-fx"></div></div>';
  html += '<div class="srpg-turnbar" id="srpg-turnbar">'+srpgTurnbarHtml()+'</div>';
  html += '<div class="srpg-cmd" id="srpg-cmd">'+srpgCmdHtml()+'</div>';
  document.getElementById('srpg-body').innerHTML = html;
  try{ _char3dHydrateSafe(document.getElementById('srpg-body')); }catch(e){}
  if(!srpgB._rendered){   // 戦闘開始の登場フェード（1回だけ）
    srpgB._rendered = true;
    try{ var f = document.querySelector('#srpg-body .srpg-field'); if(f){ f.classList.add('entering'); setTimeout(function(){ try{ f.classList.remove('entering'); }catch(e){} }, 900); } }catch(e){}
  }
}
// ユニットの絵：モンスターは新オリジナルアート、勇者などキャラは従来の3D/SVG
function srpgUnitArt(u){
  var a = (typeof srpgMonArt==='function') ? srpgMonArt(u.art) : null;
  if(a) return a;
  return (u.side==='enemy') ? _monStill(u.art) : _charStill(u.art);
}
function srpgUnitPlate(u){
  var art = srpgUnitArt(u);
  var hpPct = Math.max(0, Math.round(u.hp / u.maxHp * 100));
  var mpPct = u.mpMax ? Math.round((u.mp||0) / u.mpMax * 100) : 0;
  var badge = (u.side==='enemy' && u.weak)
    ? '<span class="srpg-weak" title="弱点">'+srpgSubjectMeta(u.weak).em+'</span>'
    : '<span class="srpg-role">'+u.roleEm+'</span>';
  // 状態異常アイコン＋バフ/デバフ矢印
  var stt=u.status||{}, sIcons='';
  ['poison','paralyze','sleep','seal'].forEach(function(k){ if(stt[k]>0) sIcons+=SRPG_STATUS_META[k].em; });
  var md=u.mods||{}, mUp=(md.atk>0||md.def>0||md.spd>0), mDn=(md.atk<0||md.def<0||md.spd<0);
  var stBar=(sIcons||mUp||mDn) ? ('<div class="srpg-stbar">'+sIcons+(mUp?'<span class="srpg-buf up">⬆</span>':'')+(mDn?'<span class="srpg-buf dn">⬇</span>':'')+'</div>') : '';
  var isBoss = srpgIsBossUnit(u);
  var act = srpgActor();
  var isActor = act && act.id===u.id;
  var done = srpgB.acted && srpgB.acted[u.id] && !isActor;   // このラウンドで手番を終えた＝グレーアウト
  var dly = (function(s){ var n=0, i; for(i=0;i<(s||'').length;i++) n+=s.charCodeAt(i); return (n%20)/10; })(u.id);   // 待機ゆれを個体ごとにずらす
  return '<div class="srpg-unit '+u.side+(isBoss?' boss':'')+(done?' done':'')+(isActor?' isactor':'')+(u.isLeader?' leader':'')+'" id="su-'+u.id+'">'
    + (u.isLeader ? '<span class="srpg-crown">👑</span>' : '')
    + '<div class="srpg-hpbar"><i style="width:'+hpPct+'%"></i></div>'
    + (u.side==='ally' && u.mpMax ? '<div class="srpg-mpbar"><i style="width:'+mpPct+'%"></i></div>' : '')
    + stBar
    + '<div class="srpg-sprite" style="animation-delay:-'+dly+'s">'+art+'</div>'
    + badge
    + '<div class="srpg-uname">'+escapeHtml(u.name)+'</div>'
    + '</div>';
}
function srpgEnemyKey(u){
  // まず生成時に持たせた tmplKey を優先（art を共有するテンプレ＝zeron/voltdrake, mathfinal/dragon の取り違え防止）
  if(u && u.tmplKey && SRPG_ENEMY_TEMPLATES[u.tmplKey]) return u.tmplKey;
  // 後方互換：art からテンプレのキーを逆引き（弱点boss判定用）
  var keys = Object.keys(SRPG_ENEMY_TEMPLATES);
  for(var i=0;i<keys.length;i++){ if(SRPG_ENEMY_TEMPLATES[keys[i]].art===u.art) return keys[i]; }
  return null;
}
// このユニットが「ボス」か（VS演出・王冠・BGM判定の単一の真実源）。
// ユニット標識 u.boss（章ステージが boss指定）＋テンプレの boss:true（villain/幹部/最終/裏ボス）の両対応。
function srpgIsBossUnit(u){
  if(!u || u.side!=='enemy') return false;
  if(u.boss) return true;
  var k = srpgEnemyKey(u);
  return !!(k && SRPG_ENEMY_TEMPLATES[k] && SRPG_ENEMY_TEMPLATES[k].boss);
}
function srpgTurnbarHtml(){
  var order = srpgB.order && srpgB.order.length ? srpgB.order : srpgTurnOrder(srpgB.units);
  var alive = order.filter(function(u){ return u && !u.downed; });
  var actor = srpgActor();
  var _wv = (srpgB.stage && srpgB.stage.waves && srpgB.stage.waves.length) ? '<span class="srpg-wave">🌊 '+((srpgB.waveIdx||0)+1)+'/'+ (srpgB.stage.waves.length+1)+'陣</span>' : '';
  var _chg = srpgB.charge ? '<span class="srpg-charge-warn">☢️ '+escapeHtml(srpgB.charge.name||'大技')+'くる！赤マスから にげろ</span>' : '';
  return '<span class="srpg-round">R'+(srpgB.round||1)+'</span>'+_wv+_chg
    + '<button class="srpg-spd'+(srpgB.auto?' on':'')+'" onclick="srpgToggleAuto()" title="移動を自動化（教科えらびは自分）">🤖じどう</button>'
    + '<button class="srpg-spd'+(_srpgSpd()===2?' on':'')+'" onclick="srpgToggleSpeed()">⏩×2</button><div class="srpg-tb-lbl">じゅんばん</div>' + alive.slice(0, 8).map(function(u){
    var art = srpgUnitArt(u);
    return '<span class="srpg-tb-face '+u.side+(actor&&u.id===actor.id?' now':'')+'">'+art+'</span>';
  }).join('<span class="srpg-tb-arrow">›</span>');
}
function srpgCmdHtml(){
  if(srpgB.over) return '';
  if(srpgB.phase==='deploy'){
    return '<div class="srpg-deploy-bar"><div class="srpg-deploy-hint">🛡️ 味方を タップ → みどりのマスへ おいて 陣形を つくろう</div>'
      + '<div class="srpg-deploy-btns"><button class="srpg-cmd-btn" onclick="srpgDeployAuto()">🔀 おまかせ</button>'
      + '<button class="srpg-cmd-btn atk" onclick="srpgBattleBegin()">⚔️ たたかう！</button></div></div>';
  }
  var actor = srpgActor();
  if(!actor || actor.side!=='ally') return '<div class="srpg-cmd-wait">'+(actor?escapeHtml(actor.name)+' の ターン…':'…')+'</div>';
  if(srpgB.phase==='pick-subject'){
    var tgt = srpgUnitAt(srpgB.units, srpgB.targetTile.x, srpgB.targetTile.y);
    var TAG = { weak:'<b>弱点！</b>', half:'<span>半減</span>', 'null':'<span class="x">無効</span>', drain:'<span class="x">吸収!</span>', normal:'' };
    var CLS = { weak:'weak', half:'resist', 'null':'nullr', drain:'drain', normal:'' };
    var _sk0 = srpgB.chosenSkill ? srpgSkill(srpgB.chosenSkill) : null;
    var _me = srpgActor();
    var subs = SRPG_SUBJECT_KEYS.map(function(k){
      var m = srpgSubjectMeta(k), kind = srpgResistKind(k, tgt);
      var fc = (_me && tgt) ? srpgForecast(_me, tgt, k, _sk0 && _sk0.kind==='atk' ? _sk0 : null) : null;
      var fcTx = !fc ? '' : (kind==='null' ? '' : (kind==='drain' ? '<small class="srpg-fc bad">敵が '+fc.dmg+' 回復!</small>' : '<small class="srpg-fc">よそう '+fc.dmg+'</small>'));
      var nig = (srpgB.nigate === k) ? '<span class="srpg-nigate">💪にがて</span>' : '';
      return '<button class="srpg-sub '+(CLS[kind]||'')+'" onclick="srpgPickSubject(\''+k+'\')">'
        + m.em+' '+m.label+nig+(TAG[kind]||'')+fcTx+'</button>';
    }).join('');
    var hardTgl = '<button class="srpg-hard-tgl'+(srpgB.hardMode?' on':'')+'" onclick="srpgToggleHard()">🔥 むずかしい もんだいで挑む（いりょく×1.3）'+(srpgB.hardMode?' ✅':'')+'</button>';
    var isDebuff = srpgB.chosenSkill && (srpgSkill(srpgB.chosenSkill)||{}).kind==='debuff';
    var _cwarn = (tgt && !srpgB.chosenSkill && _me && srpgDist(_me.x,_me.y,tgt.x,tgt.y)===1 && srpgCanCounter(tgt,_me)) ? '<div class="srpg-counter-warn">⚠️ たおしきれないと はんげき されるよ</div>' : '';
    return '<div class="srpg-cmd-head">'+(isDebuff?'どの教科で しかける？':'どの教科で こうげきする？')+'</div><div class="srpg-subs">'+subs+'</div>'
      + _cwarn
      + hardTgl
      + '<button class="srpg-mini" onclick="srpgCancel()">← もどる</button>';
  }
  if(srpgB.phase==='move'){
    return '<div class="srpg-cmd-head">青いマスへ うごく（タップ）</div><button class="srpg-mini" onclick="srpgSelectActor()">← やめる</button>';
  }
  if(srpgB.phase==='action'){
    var sk = srpgB.chosenSkill ? srpgSkill(srpgB.chosenSkill) : null;
    return '<div class="srpg-cmd-head">'+(sk?sk.name+'：':'こうげき：')+'あかいマスの てきを タップ</div><button class="srpg-mini" onclick="srpgSelectActor()">← やめる</button>';
  }
  // phase 'select'：コマンド一覧
  var mp = actor.mp || 0;
  var sealed = !srpgCanUseSkill(actor);
  var SKEM = { heal:'✨', buff:'⬆️', debuff:'⬇️', atk:'🌟' };
  var skills = actor.skills.map(function(id){
    var s = srpgSkill(id); if(!s) return '';
    var ok = mp >= s.mp && !sealed;
    return '<button class="srpg-cmd-btn skill'+(ok?'':' off')+'" '+(ok?'onclick="srpgCmdSkill(\''+id+'\')"':'disabled')+' title="'+escapeHtml(s.desc)+'">'
      + (SKEM[s.kind]||'🌟')+' '+s.name+' <small>'+(sealed?'ふうじ':'MP'+s.mp)+'</small></button>';
  }).join('');
  return '<div class="srpg-cmd-actor">'+actor.roleEm+' '+escapeHtml(actor.name)+' <small>HP'+actor.hp+'/'+actor.maxHp+' MP'+mp+'</small></div>'
    + '<div class="srpg-cmd-hint2">🔷あおいマス＝いどう ・ 🔴てきをタップ＝こうげき（とおくても 自動で ちかづくよ）</div>'
    + '<div class="srpg-cmd-row">'
    + (srpgB.moved && srpgB.undoPos ? '<button class="srpg-cmd-btn" onclick="srpgCmdUndo()">↩ いどうをもどす</button>' : '')
    + '<button class="srpg-cmd-btn atk" onclick="srpgCmdAttack()">⚔️ こうげき</button>'
    + skills
    + '<button class="srpg-cmd-btn wait" onclick="srpgCmdWait()">💤 まつ</button>'
    + '</div>';
}

// ================= ターン進行 =================
function srpgActor(){ return srpgB && srpgB.actorId ? srpgUnitById(srpgB.actorId) : null; }
function srpgUnitById(id){ var us = srpgB.units; for(var i=0;i<us.length;i++) if(us[i].id===id) return us[i]; return null; }

function srpgNextTurn(){
  if(!srpgB || srpgB.over) return;
  var oc = srpgOutcome(srpgB.units);
  if(oc){ srpgEnd(oc); return; }
  srpgB.turnPtr++;
  if(srpgB.turnPtr >= srpgB.order.length){
    // 次のラウンドへ：順番を組み直す＋行動済み（グレーアウト）をリセット
    srpgB.round++; srpgB.order = srpgTurnOrder(srpgB.units); srpgB.turnPtr = 0; srpgB.acted = {};
  }
  var actor = srpgB.order[srpgB.turnPtr];
  if(!actor || actor.downed){ return srpgNextTurn(); }   // 死者は飛ばす
  srpgB.actorId = actor.id; srpgB.moved = false; srpgB.chosenSkill = null; srpgB.targetTile = null;
  srpgClearHi();
  srpgTurnStart(actor);
}
// ターン開始：バフ経過・毒/地形のHP変化・行動不能（まひ/ねむり）を処理してから操作へ
function srpgTurnStart(actor){
  var wasSleep = srpgHasStatus(actor, 'sleep');
  srpgTickMods(actor);
  if(actor.side==='enemy'){ actor.mp = Math.min(actor.mpMax||6, (actor.mp||0) + 2); }   // 敵はMP自動チャージ（とくぎのもと）
  var t = srpgTickStatus(actor);
  var proceed = function(){
    if(actor.downed){ srpgRender(); setTimeout(srpgNextTurn, 480); return; }
    if(t.skip){
      srpgRender();
      srpgPopupAt(actor.x, actor.y, wasSleep ? '💤 ねむり…' : '⚡ まひ！', 'status');
      setTimeout(function(){ srpgEndActorTurn(); }, _sd(820));
      return;
    }
    if(actor.side === 'enemy'){ srpgB.phase = 'enemy'; srpgRender(); setTimeout(function(){ srpgEnemyTurn(actor); }, _sd(480)); }
    else { srpgSelectActor(); }
  };
  // ターン開始時のHP変化：毒（状態異常）＋地形マス（回復の泉/毒沼/炎）
  var events = [];
  if(t.poisonDmg > 0) events.push({ amt:-t.poisonDmg, cls:'poison', txt:'☠️' + t.poisonDmg });
  var terr = srpgTerrainAt(srpgB.stage, actor.x, actor.y);
  if(terr){
    var d = srpgTerrainDelta(terr, actor), m = SRPG_TERRAIN_META[terr];
    if(d !== 0) events.push({ amt:d, cls:(d > 0 ? 'heal' : (terr === 'fire' ? 'dmg' : 'poison')), txt:(d > 0 ? '+' : '') + Math.abs(d) + ' ' + m.em });
  }
  if(events.length){
    events.forEach(function(ev){ actor.hp = Math.max(0, Math.min(actor.maxHp, actor.hp + ev.amt)); });
    var died = actor.hp <= 0; if(died) actor.downed = true;
    srpgRender();   // 先に描画してから演出（renderで消えないように）
    events.forEach(function(ev){ srpgPopupAt(actor.x, actor.y, ev.txt, ev.cls); if(ev.amt < 0) srpgFlashSprite(actor.id, ev.cls==='heal'?'heal':'hit'); else srpgFlashSprite(actor.id, 'heal'); });
    if(died){ srpgPoof(actor.x, actor.y); srpgPopupAt(actor.x, actor.y, 'たおれた…', 'down'); }
    var oc = srpgOutcome(srpgB.units);
    if(oc){ setTimeout(function(){ srpgEnd(oc); }, 700); return; }
    setTimeout(proceed, _sd(660));
  } else { proceed(); }
}
function srpgSelectActor(){
  srpgB.phase = 'select'; srpgB.chosenSkill = null; srpgB.targetTile = null;
  srpgClearHi();
  var actor = srpgActor();
  if(actor){
    // 🔷 いどうできるマス（未移動なら）と 🔴 いま攻撃できる敵 を最初から見せる＝迷わない
    if(!srpgB.moved){ srpgMoveTiles(actor, srpgB.grid, srpgB.units).forEach(function(t){ srpgB.hiMove[t.x+','+t.y] = 1; }); }
    srpgB.hiAtk = {};
    srpgRangeTiles(actor.x, actor.y, actor.rng, srpgB.grid).forEach(function(t){
      var u = srpgUnitAt(srpgB.units, t.x, t.y);
      if(u && u.side==='enemy' && !u.downed) srpgB.hiAtk[t.x+','+t.y] = 1;
    });
    try{ document.querySelector('#st-'+actor.x+'-'+actor.y).scrollIntoView({block:'center'}); }catch(e){}
  }
  srpgRender();
  // 自動モード：少し見せてから 自動で移動→教科えらび（きみが答える）
  if(srpgB.auto && actor && actor.side==='ally'){ setTimeout(srpgAutoAllyMove, _sd(520)); return; }
  // 初めてのコマンド選択にだけ ヒントを1回出す
  if(!_srpgFlag('srpg_hint_sel')){ _srpgSetFlag('srpg_hint_sel');
    try{ showToast('💡','さいしょの いっぽ','🔷あおいマスをタップで いどう。🔴てきをタップで こうげき（とおくても 自動で ちかづくよ）'); }catch(e){} }
}
function srpgClearHi(){ if(srpgB){ srpgB.hiMove = {}; srpgB.hiTarget = {}; srpgB.hiAoe = {}; srpgB.hiAtk = {}; } }

// ===== 自動モード（移動を自動化。教科えらび＝出題は きみが答える＝学習は残す） =====
function srpgAutoPref(){ try{ return safeLS.getItem(muKey('srpg_auto'))==='1'; }catch(e){ return false; } }
function srpgToggleAuto(){
  if(!srpgB) return;
  srpgB.auto = !srpgB.auto;
  try{ safeLS.setItem(muKey('srpg_auto'), srpgB.auto ? '1' : '0'); }catch(e){}
  try{ sfx('click'); }catch(e){}
  try{ showToast(srpgB.auto?'🤖':'✋', srpgB.auto?'じどうモード ON':'じどうモード OFF',
    srpgB.auto?'味方が じどうで 近づくよ（⚔️教科えらび＝きみが こたえる）':'いどうを 自分で そうさするよ'); }catch(e){}
  srpgRender();
  if(srpgB.auto && srpgB.phase==='select' && !srpgB.busy){ setTimeout(srpgAutoAllyMove, _sd(260)); }
}
// 現在の味方アクターを自動で 移動→教科えらび（出題）へ。攻撃できなければ最寄りへ近づいてターン終了。
function srpgAutoAllyMove(){
  if(!srpgB || srpgB.over || srpgB.busy || !srpgB.auto) return;
  if(srpgB.phase !== 'select') return;
  var actor = srpgActor(); if(!actor || actor.side !== 'ally') return;
  var plan = srpgAllyAutoPlan(actor, srpgB.grid, srpgB.units, srpgB.moved);
  var moveThen = function(dest, after){
    if(dest && (dest.x !== actor.x || dest.y !== actor.y)){
      srpgB.undoPos = { id:actor.id, x:actor.x, y:actor.y };
      var ox = actor.x, oy = actor.y; actor.x = dest.x; actor.y = dest.y; srpgB.moved = true;
      srpgClearHi(); srpgRender(); srpgSlideUnit(actor.id, ox, oy);
      setTimeout(after, _sd(340));
    } else { after(); }
  };
  if(plan.kind === 'attack'){
    moveThen(plan.moveTo, function(){
      if(!srpgB || srpgB.over || srpgB.phase !== 'select') return;
      srpgB.chosenSkill = null; srpgB.targetTile = { x:plan.tx, y:plan.ty };
      srpgB.phase = 'pick-subject'; srpgClearHi(); srpgRender();   // 教科えらび→出題（答えるのは きみ）
    });
    return;
  }
  if(plan.kind === 'approach'){
    moveThen(plan.moveTo, function(){ if(srpgB && !srpgB.over) srpgEndActorTurn(); });
    return;
  }
  setTimeout(function(){ if(srpgB && !srpgB.over && srpgB.phase==='select') srpgEndActorTurn(); }, _sd(300));
}

// ===== 進行ウォッチドッグ：手番遷移/敵ターンが万一 固まっても 自動で復帰（バトルが二度と進まない事故を防ぐ） =====
var _srpgWd = null, _srpgWdTok = '', _srpgWdN = 0;
function srpgWatchStart(){ srpgWatchStop(); _srpgWdTok = ''; _srpgWdN = 0; try{ _srpgWd = setInterval(srpgWatchTick, 1000); }catch(e){} }
function srpgWatchStop(){ if(_srpgWd){ try{ clearInterval(_srpgWd); }catch(e){} _srpgWd = null; } }
function srpgWatchTick(){
  if(!srpgB || srpgB.over){ srpgWatchStop(); return; }
  var p = srpgB.phase;
  // 入力待ち（select/action/pick-subject/deploy）や 出題中(busy) は 正常な待ち＝監視しない
  if(srpgB.busy || p==='select' || p==='action' || p==='pick-subject' || p==='deploy'){ _srpgWdN = 0; _srpgWdTok = 'x'; return; }
  // 進行フェーズ（idle=VS/手番間・enemy=敵ターン）が 同じ状態のまま続いていないか
  var tok = p + '|' + (srpgB.actorId||'-') + '|R' + (srpgB.round||0) + '|p' + (srpgB.turnPtr==null?-1:srpgB.turnPtr) + '|c' + (srpgB.charge?1:0);
  if(tok === _srpgWdTok){ _srpgWdN++; } else { _srpgWdTok = tok; _srpgWdN = 0; }
  if(_srpgWdN >= 6){   // 6秒 同一＝ハング → 安全に手番を進めて復帰（正常なVS/敵ターンは数百ms〜2秒で変化する）
    _srpgWdN = 0; _srpgWdTok = 'x';
    try{ srpgB.busy = false; srpgClearHi(); srpgNextTurn(); }catch(e){}
  }
}

// ---- コマンド ----
function srpgCmdUndo(){
  var u = srpgB && srpgB.undoPos; if(!u) return;
  var actor = srpgUnitById(u.id); if(!actor) return;
  try{ sfx('click'); }catch(e){}
  var _fx = actor.x, _fy = actor.y;
  actor.x = u.x; actor.y = u.y;
  srpgB.moved = false; srpgB.undoPos = null;
  srpgSelectActor();
  srpgSlideUnit(actor.id, _fx, _fy);
}
function srpgCmdMove(){
  var actor = srpgActor(); if(!actor || srpgB.moved) return;
  try{ sfx('click'); }catch(e){}
  srpgB.phase = 'move'; srpgB.hiMove = {};
  srpgMoveTiles(actor, srpgB.grid, srpgB.units).forEach(function(t){ srpgB.hiMove[t.x+','+t.y] = 1; });
  srpgRender();
}
function srpgCmdAttack(){
  var actor = srpgActor(); if(!actor) return;
  try{ sfx('click'); }catch(e){}
  srpgB.chosenSkill = null; srpgB.phase = 'action';
  srpgShowTargets(actor, actor.rng, 'enemy');
}
function srpgCmdSkill(id){
  var actor = srpgActor(); if(!actor) return;
  var s = srpgSkill(id); if(!s) return;
  if(!srpgCanUseSkill(actor)) return;          // ふうじ中は使えない
  if((actor.mp||0) < s.mp) return;
  try{ sfx('click'); }catch(e){}
  srpgB.chosenSkill = id;
  if(s.kind==='buff' && s.buff && s.buff.target==='self'){ srpgResolveBuff(actor); return; }  // 自分バフ＝出題なしで即発動
  srpgB.phase = 'action';
  var mode = (s.kind==='heal' || (s.kind==='buff' && s.buff && s.buff.target==='ally')) ? 'ally-support' : 'enemy';
  srpgShowTargets(actor, s.rng, mode);
}
function srpgCmdWait(){
  try{ sfx('click'); }catch(e){}
  var actor = srpgActor(); if(actor) srpgB.acted[actor.id] = 1;
  srpgEndActorTurn();
}
function srpgShowTargets(actor, rng, mode){
  srpgB.hiTarget = {};
  var want = (mode==='ally-support') ? 'ally' : 'enemy';
  srpgRangeTiles(actor.x, actor.y, rng, srpgB.grid).forEach(function(t){
    var u = srpgUnitAt(srpgB.units, t.x, t.y);
    if(u && u.side===want && !u.downed) srpgB.hiTarget[t.x+','+t.y] = 1;
  });
  srpgRender();
}

// ---- マスのタップ ----
function srpgTileTap(x, y){
  if(!srpgB || srpgB.over || srpgB.busy) return;
  if(srpgB.phase==='deploy'){ srpgDeployTap(x, y); return; }
  var key = x+','+y;
  // 敵ターン中のユニットタップ → 詳細パネル
  if(srpgB.phase==='enemy'){
    var uu0 = srpgUnitAt(srpgB.units, x, y);
    if(uu0){ srpgShowUnitInfo(uu0.id); return; }
  }
  // ⚡スマート操作（コマンド選択中）：青マス=即いどう／敵=即こうげき（届かなければ近づいて攻撃）
  if(srpgB.phase==='select'){
    var act0 = srpgActor(); if(!act0) return;
    if(srpgB.hiMove[key]){
      try{ sfx('click'); }catch(e){}
      srpgB.undoPos = { id:act0.id, x:act0.x, y:act0.y };   // ↩もどす用
      var _mx = act0.x, _my = act0.y;
      act0.x = x; act0.y = y; srpgB.moved = true;
      srpgSelectActor();
      srpgSlideUnit(act0.id, _mx, _my);
      return;
    }
    var uu = srpgUnitAt(srpgB.units, x, y);
    if(uu && uu.side==='enemy' && !uu.downed){
      if(srpgInRange(act0.x, act0.y, x, y, act0.rng)){
        // いま届く → そのまま教科えらびへ
        try{ sfx('click'); }catch(e){}
        srpgB.chosenSkill = null; srpgB.targetTile = { x:x, y:y };
        srpgB.phase = 'pick-subject'; srpgRender();
        return;
      }
      if(!srpgB.moved){
        // 届かない → 射程に入れる移動マスへ自動で近づいて攻撃（タクトのスマートタップ）
        var best = null, bd = 1e9;
        srpgMoveTiles(act0, srpgB.grid, srpgB.units).forEach(function(t){
          if(srpgInRange(t.x, t.y, x, y, act0.rng) && t.d < bd){ bd = t.d; best = t; }
        });
        if(best){
          try{ sfx('click'); }catch(e){}
          srpgB.undoPos = { id:act0.id, x:act0.x, y:act0.y };
          var _ax = act0.x, _ay = act0.y;
          act0.x = best.x; act0.y = best.y; srpgB.moved = true;
          srpgB.chosenSkill = null; srpgB.targetTile = { x:x, y:y };
          srpgB.phase = 'pick-subject'; srpgClearHi(); srpgRender();
          srpgSlideUnit(act0.id, _ax, _ay);
          return;
        }
      }
      srpgShowUnitInfo(uu.id); return;   // どうやっても届かない敵は 詳細を見せる
    }
    if(uu && uu.id !== act0.id){ srpgShowUnitInfo(uu.id); return; }   // 味方=詳細
    return;
  }
  if(srpgB.phase==='move' && srpgB.hiMove[key]){
    var actor = srpgActor();
    try{ sfx('click'); }catch(e){}
    var _fx = actor.x, _fy = actor.y;
    actor.x = x; actor.y = y; srpgB.moved = true;
    srpgSelectActor();
    srpgSlideUnit(actor.id, _fx, _fy);   // マス間をすべって移動（テレポートしない）
    return;
  }
  if(srpgB.phase==='action' && srpgB.hiTarget[key]){
    srpgB.targetTile = { x:x, y:y };
    var sk = srpgB.chosenSkill ? srpgSkill(srpgB.chosenSkill) : null;
    if(sk && sk.kind==='heal'){ srpgResolveHeal(); return; }                         // 回復は出題なしで即発動
    if(sk && sk.kind==='buff'){ srpgResolveBuff(srpgUnitAt(srpgB.units, x, y)); return; }  // なかまバフも即発動
    srpgB.phase = 'pick-subject'; srpgRender();   // こうげき／デバフは 教科えらび→出題
    if(!_srpgFlag('srpg_hint_sub')){ _srpgSetFlag('srpg_hint_sub');
      try{ showToast('💡','教科えらびの コツ','「弱点！」と 光っている教科を えらぶと 大ダメージ！'); }catch(e){} }
    return;
  }
}

// ---- 教科をえらぶ → 出題 ----
function srpgPickSubject(subjectKey){
  if(!srpgB || srpgB.phase!=='pick-subject') return;
  try{ sfx('click'); }catch(e){}
  srpgB.subject = subjectKey;
  srpgAsk(subjectKey);
}
function srpgToggleHard(){ srpgB.hardMode = !srpgB.hardMode; try{ sfx('click'); }catch(e){} srpgRender(); }
function srpgCancel(){ srpgSelectActor(); }

// ================= 出題ゲート =================
function srpgAsk(area){
  var q = null, isRevenge = false;
  // 🔁リベンジ：この戦闘で間違えた問題を最優先で再出題（正解すれば いりょく×1.5）
  try{
    var mi = (srpgB.missedQ || []).findIndex(function(e){ return e.area === area; });
    if(mi >= 0){ q = srpgB.missedQ.splice(mi, 1)[0].q; isRevenge = true; }
  }catch(e){}
  if(!q){
    try{
      q = genQuestion(area);
      if(srpgB.hardMode){   // 🔥むずかしい優先：★★★以上を最大12回さがす
        for(var hi = 0; hi < 12; hi++){
          if(q && (q.level === '★★★' || q.level === '★★★★')) break;
          var q2 = genQuestion(area); if(q2 && q2.q) q = q2;
        }
      }
    }catch(e){}
  }
  if(!q || !q.q){ srpgResolveAttack(true); return; }   // 出題失敗時はサービスで命中
  srpgB._q = q; srpgB.busy = true;
  srpgB._qRevenge = isRevenge;
  srpgB._qHard = !!(srpgB.hardMode && (q.level === '★★★' || q.level === '★★★★'));
  var m = srpgSubjectMeta(area);
  var choicesHtml = '';
  if(q.type==='choice' && q.choices && q.choices.length){
    choicesHtml = '<div class="srpg-ask-choices">' + q.choices.map(function(ch){
      return '<button class="srpg-ask-ch" onclick="srpgAnswerChoice(this)">'+escapeHtml(String(ch))+'</button>';
    }).join('') + '</div>';
  } else {
    choicesHtml = '<div class="srpg-ask-free"><input id="srpg-ask-input" class="srpg-ask-input" type="text" autocomplete="off" placeholder="こたえを にゅうりょく">'
      + '<button class="srpg-ask-ok" onclick="srpgAnswerFree()">けってい</button></div>';
  }
  var ov = document.getElementById('srpg-ask');
  ov.innerHTML = '<div class="srpg-ask-card" style="--sub:'+m.color+'">'
    + '<div class="srpg-ask-tag">'+m.em+' '+m.label+' で こうげき！</div>'
    + (isRevenge?'<div class="srpg-ask-boost rev">🔁 リベンジ！ さっきの もんだい（正解で いりょく×1.5）</div>':(srpgB._qHard?'<div class="srpg-ask-boost hard">🔥 むずかしい '+(q.level||'')+'（正解で いりょく×1.3）</div>':''))
    + '<div class="srpg-ask-q">'+ (typeof furiganaHtml==='function' ? furiganaHtml(q.q) : escapeHtml(q.q)) +'</div>'
    + choicesHtml
    + '<div class="srpg-ask-fb" id="srpg-ask-fb"></div>'
    + '</div>';
  ov.style.display = 'flex';
  srpgSay(q.q);   // 出題をキャラの声で読み上げ（クイズ画面と同じ体験に）
  setTimeout(function(){ try{ var i=document.getElementById('srpg-ask-input'); if(i) i.focus(); }catch(e){} }, 60);
}
function srpgCheckAns(q, given){
  var norm = function(s){ return String(s==null?'':s).replace(/\s+/g,'').replace(/[Ａ-Ｚａ-ｚ０-９]/g,function(c){ return String.fromCharCode(c.charCodeAt(0)-0xFEE0); }).toLowerCase(); };
  if(q.type==='choice') return String(given)===String(q.ans) || norm(given)===norm(q.ans);
  var ok = norm(given)===norm(q.ans);
  if(!ok && q.altAns){ (Array.isArray(q.altAns)?q.altAns:[q.altAns]).forEach(function(a){ if(norm(given)===norm(a)) ok=true; }); }
  return ok;
}
function srpgAnswerChoice(btn){
  var q = srpgB._q; var val = btn ? btn.textContent : '';
  var correct = srpgCheckAns(q, val);
  try{ document.querySelectorAll('.srpg-ask-ch').forEach(function(b){ b.disabled = true; if(srpgCheckAns(q, b.textContent)) b.classList.add('right'); }); }catch(e){}
  if(!correct && btn) btn.classList.add('wrong');
  srpgAfterAnswer(correct);
}
function srpgAnswerFree(){
  var q = srpgB._q; var el = document.getElementById('srpg-ask-input');
  var val = el ? el.value : '';
  var correct = srpgCheckAns(q, val);
  if(el){ el.disabled = true; el.classList.add(correct?'right':'wrong'); }
  srpgAfterAnswer(correct);
}
function srpgAfterAnswer(correct){
  var fb = document.getElementById('srpg-ask-fb');
  var q = srpgB._q;
  if(fb) fb.innerHTML = correct ? '<span class="ok">せいかい！ こうげき！</span>'
    : '<span class="ng">ざんねん… こたえは「'+escapeHtml(String(q.ans))+'」</span>';
  try{ sfx(correct?'correct':'wrong'); }catch(e){}
  // 学習の記録：偏差値にも反映（教科＝currentAreaを一時セットせず ratingRecord に直接）
  try{ if(typeof ratingRecord==='function') ratingRecord(srpgB.subject, q, correct); }catch(e){}
  try{ if(typeof hensaOnAnswer==='function') hensaOnAnswer(); }catch(e){}   // 確定偏差値のカウント（タクトの解答も実績）
  try{ if(typeof recordTactAnswer==='function') recordTactAnswer(srpgB.subject, q&&q.sub, correct); }catch(e){}   // 今日の目標/通算/苦手/ミッション・実績にも集計
  if(!correct){
    try{ (srpgB.missedQ = srpgB.missedQ || []).push({ area:srpgB.subject, q:q }); while(srpgB.missedQ.length > 5) srpgB.missedQ.shift(); }catch(e){}
    try{ if(typeof addMistake==='function') addMistake(q, srpgB.subject); }catch(e){}   // まちがいノートへ（あとで復習できる）
  } else if(srpgB.nigate && srpgB.subject === srpgB.nigate){
    srpgB.nigateHits = (srpgB.nigateHits||0) + 1;
    try{ showToast('💪','にがてチャレンジ せいこう！','にがて教科で 正解！（かちどきで ボーナス）'); }catch(e){}
  }
  try{ updateResBar(); }catch(e){}
  setTimeout(function(){
    var ov = document.getElementById('srpg-ask'); if(ov) ov.style.display='none';
    srpgB.busy = false;
    srpgResolveAttack(correct);
  }, correct ? 620 : 1150);
}

// ================= こうげきの解決 =================
function srpgResolveAttack(correct){
  var actor = srpgActor(), tgt = srpgB.targetTile;
  if(!actor || !tgt){ srpgEndActorTurn(); return; }
  var sk = srpgB.chosenSkill ? srpgSkill(srpgB.chosenSkill) : null;
  if(!correct){
    srpgB.combo = 0;
    srpgRender();
    srpgPopupAt(tgt.x, tgt.y, 'ミス！', 'miss');
    try{ sfx('wrong'); }catch(e){}
    srpgAfterResolve();
    return;   // とくぎ失敗でもMPは消費しない（不正解の三重罰を緩和）
  }
  if(sk) actor.mp = Math.max(0, (actor.mp||0) - sk.mp);   // MPは成功時のみ消費
  srpgB.combo++;
  var crit = srpgB.combo >= 3; if(crit) srpgB.combo = 0;   // 会心は3連続ごと＝戦闘中ずっと会心の雪だるまを解消
  var doIt = function(){
  // デバフ（敵のステータス下げ）：ダメージ無し・単体・出題に正解で成立
  if(sk && sk.kind==='debuff'){
    var d = srpgUnitAt(srpgB.units, tgt.x, tgt.y), okD = d && d.side==='enemy' && sk.buff;
    if(okD) srpgSetMod(d, sk.buff.stat, sk.buff.stage, sk.buff.turns);
    srpgRender();
    srpgAtkAnim(actor);
    if(okD){ srpgSlashAt(tgt.x, tgt.y, srpgB.subject, false); srpgPopupAt(tgt.x, tgt.y, '⬇'+SRPG_STAT_JA[sk.buff.stat]+' ダウン', 'debuff'); }
    try{ sfx('correct'); }catch(e){}
    srpgAfterResolve(); return;
  }
  if(!sk){ actor.mp = Math.min(actor.mpMax||6, (actor.mp||0) + 2); }   // 通常こうげき成功でMPチャージ
  var shape = sk ? sk.shape : 'single';
  var power = sk ? srpgSkillPower(sk, actor.skLv) : 100;   // とくぎLvで威力アップ
  var qb = (srpgB._qRevenge ? 1.5 : 1) * (srpgB._qHard ? 1.3 : 1);   // 🔁リベンジ×🔥むずかしい ボーナス
  power = Math.round(power * qb);
  srpgB._qRevenge = false; srpgB._qHard = false;
  var cells = srpgAoeTiles(shape, tgt.x, tgt.y, srpgB.grid, actor);
  var fx = [];   // 演出は「描画のあと」にまとめて再生（renderで消えないように）
  cells.forEach(function(c){
    srpgB.hiAoe[c.x+','+c.y] = 1;
    var e = srpgUnitAt(srpgB.units, c.x, c.y);
    if(!(e && e.side==='enemy')) return;
    var kind = srpgResistKind(srpgB.subject, e);
    if(kind==='null'){ fx.push({ x:c.x, y:c.y, text:'きかない！', cls:'nullr', hit:'guard', id:e.id }); return; }
    if(kind==='drain'){   // 吸収：ダメージ0＋敵HP回復（この教科は選んではいけない）
      var amt = srpgDamage(actor, e, power, 1, crit);
      e.hp = Math.min(e.maxHp, e.hp + amt);
      fx.push({ x:c.x, y:c.y, text:'+'+amt+' きゅうしゅう', cls:'drain', hit:'heal', id:e.id });
      return;
    }
    var mult = srpgResistMult(kind);
    var dmg = srpgDamage(actor, e, power, mult, crit);
    srpgWakeOnHit(e);   // ねむっている敵は こうげきで目ざめる
    e.hp = Math.max(0, e.hp - dmg);
    var lab = srpgResistLabel(kind);
    var infl = null;
    var down = e.hp <= 0; if(down) e.downed = true;
    if(!down && sk && sk.inflict && Math.random() < srpgInflictChance(sk, actor.skLv)){ srpgApplyStatus(e, sk.inflict.kind, sk.inflict.turns); infl = sk.inflict.kind; }
    fx.push({ x:c.x, y:c.y, text:(crit?'かいしん！ ':'')+dmg+(lab.txt?(' '+lab.txt):''), cls:(lab.cls==='weak'?'weak':(lab.cls==='resist'?'resist':'dmg')), hit:(crit?'crit':'hit'), id:e.id, down:down, infl:infl });
  });
  srpgRender();
  // ここから演出（描画のあと＝消えない）
  if(qb > 1){ srpgPopupAt(tgt.x, tgt.y, (qb >= 1.9 ? '🔁🔥 ダブルボーナス!' : qb >= 1.5 ? '🔁 リベンジせいこう!' : '🔥 むずかしいボーナス!'), 'buff'); }
  srpgAtkAnim(actor);
  srpgLunge(actor, tgt.x, tgt.y);                        // 標的へ踏み込む
  srpgSkillFx(sk, srpgB.subject, cells, tgt.x, tgt.y);   // ④ とくぎ固有エフェクト
  var anyHit = false;
  fx.forEach(function(ev){
    if(ev.hit==='hit' || ev.hit==='crit'){ srpgFlashSprite(ev.id, 'hit'); srpgShakeTile(ev.x, ev.y); anyHit = true; }
    if(ev.hit==='heal') srpgFlashSprite(ev.id, 'heal');
    srpgPopupAt(ev.x, ev.y, ev.text, ev.cls);
    if(ev.infl){ var sm = SRPG_STATUS_META[ev.infl]; setTimeout(function(){ srpgPopupAt(ev.x, ev.y, sm.em+sm.name, 'status'); }, 280); }
    if(ev.down){ srpgPoof(ev.x, ev.y); setTimeout(function(){ srpgPopupAt(ev.x, ev.y, 'たおした！', 'down'); }, 200); }
  });
  if(crit){ try{ document.body.classList.add('srpg-flash'); setTimeout(function(){ document.body.classList.remove('srpg-flash'); }, 260); }catch(e){} }
  try{ sfx(anyHit ? (crit?'levelup':'correct') : 'click'); vibe(anyHit?15:0); }catch(e){}
  var _ctgt = (!sk) ? srpgUnitAt(srpgB.units, tgt.x, tgt.y) : null;   // 通常こうげきだけ反撃対象
  if(_ctgt && _ctgt.side==='enemy'){ srpgTryCounter(_ctgt, actor, srpgAfterResolve); } else srpgAfterResolve();
  };
  if(sk){ srpgCutin(actor, sk.name, srpgB.subject, doIt); }   // とくぎは必殺技カットイン→発動
  else { doIt(); }                                            // 通常こうげきはテンポ優先
}
// なかま／自分へのバフ・デバフ（出題なしで即発動）
function srpgResolveBuff(tgt){
  var actor = srpgActor(), sk = srpgSkill(srpgB.chosenSkill);
  if(!tgt || !sk || !sk.buff){ srpgEndActorTurn(); return; }
  actor.mp = Math.max(0, (actor.mp||0) - sk.mp);
  var up = sk.buff.stage > 0;
  srpgCutin(actor, sk.name, null, function(){
    srpgSetMod(tgt, sk.buff.stat, sk.buff.stage, sk.buff.turns);
    srpgRender();
    srpgFxOverlay(tgt.x, tgt.y, up?'fx-buff':'fx-debuff', up?'⬆':'⬇');
    srpgFlashSprite(tgt.id, up?'heal':'hit');
    srpgPopupAt(tgt.x, tgt.y, (up?'⬆':'⬇')+SRPG_STAT_JA[sk.buff.stat]+(up?' アップ':' ダウン'), 'buff');
    try{ sfx('correct'); }catch(e){}
    srpgAfterResolve();
  });
}
function srpgResolveHeal(){
  var actor = srpgActor(), t = srpgB.targetTile;
  var sk = srpgSkill(srpgB.chosenSkill);
  var tgt = srpgUnitAt(srpgB.units, t.x, t.y);
  if(!tgt || !sk){ srpgEndActorTurn(); return; }
  actor.mp = Math.max(0, (actor.mp||0) - sk.mp);
  srpgCutin(actor, sk.name, null, function(){
    var heal = srpgHealAmount(actor, sk.power);
    tgt.hp = Math.min(tgt.maxHp, tgt.hp + heal);
    srpgRender();
    srpgFxOverlay(t.x, t.y, 'fx-heal', '✨');
    srpgFlashSprite(tgt.id, 'heal');
    srpgPopupAt(t.x, t.y, '+' + heal, 'heal');
    try{ sfx('correct'); }catch(e){}
    srpgAfterResolve();
  });
}
function srpgAfterResolve(){
  srpgB.undoPos = null;   // 攻撃したら いどうは もどせない
  var actor = srpgActor(); if(actor) srpgB.acted[actor.id] = 1;
  setTimeout(function(){
    srpgClearHi();
    var oc = srpgOutcome(srpgB.units);
    if(oc){ srpgEnd(oc); return; }
    if(srpgBossWatch()){ setTimeout(srpgEndActorTurn, _sd(1200)); return; }   // 攻撃で閾値を割ったら かくせい演出を見せてから
    srpgEndActorTurn();
  }, _sd(780));
}
function srpgEndActorTurn(){
  var actor = srpgActor();
  if(actor){ actor.acted = true; }
  srpgB.undoPos = null;   // 行動が確定したら いどうは もどせない
  srpgClearHi();
  srpgNextTurn();
}

// ================= 敵のターン（自動） =================
function srpgEnemyTurn(enemy){
  if(!srpgB || srpgB.over) return;
  // ① ためた大技を放つ（前のターンに予告した charge の発動者）
  if(srpgB.charge && srpgB.charge.by === enemy.id){ srpgBossFireCharge(enemy); return; }
  // ② かくせい（HPが閾値以下になっていたら 自分のターン開始で発動）
  if(srpgBossWatch()){ setTimeout(function(){ srpgEnemyTurn(enemy); }, _sd(1100)); return; }
  // ③ 大技をためる判断（かくせい後の魔王など）
  if(srpgEnemyMayCharge(enemy)){ srpgBossBeginCharge(enemy); return; }
  var act = srpgEnemyAction(enemy, srpgB.grid, srpgB.units);
  var _efx = enemy.x, _efy = enemy.y;
  enemy.x = act.moveTo.x; enemy.y = act.moveTo.y;
  srpgClearHi(); srpgRender();
  srpgSlideUnit(enemy.id, _efx, _efy);   // 敵もマス間をすべって移動
  if(act.kind === 'skill'){
    (act.aoe || []).forEach(function(c){ srpgB.hiTarget[c.x+','+c.y] = 1; });   // 範囲を赤く予告
    srpgRender();
    try{ if(typeof showToast==='function') showToast('⚠️', enemy.name+'の'+((srpgSkill(act.skillId)||{}).name||'とくぎ')+'！', 'はんい こうげきが くるぞ！'); }catch(e){}
    setTimeout(function(){ srpgEnemySkill(enemy, act); }, _sd(950));
  } else if(act.kind === 'support'){
    setTimeout(function(){ srpgEnemySupport(enemy, act); }, _sd(420));
  } else if(act.kind === 'attack'){
    setTimeout(function(){ srpgEnemyAttack(enemy, act.targetId); }, _sd(420));
  } else {
    setTimeout(function(){ var oc = srpgOutcome(srpgB.units); if(oc){ srpgEnd(oc); return; } srpgNextTurn(); }, _sd(420));
  }
}
function srpgEnemyAfter(){
  setTimeout(function(){ var oc = srpgOutcome(srpgB.units); if(oc){ srpgEnd(oc); return; } srpgNextTurn(); }, _sd(700));
}
function srpgEnemyAttack(enemy, targetId){
  var tgt = srpgUnitById(targetId);
  if(tgt && !tgt.downed){
    var dmg = srpgDamage(enemy, tgt, 100, 1, false);
    srpgWakeOnHit(tgt);
    tgt.hp = Math.max(0, tgt.hp - dmg);
    var infl = null;
    if(enemy.onhit && tgt.hp>0 && Math.random() < enemy.onhit.chance){ srpgApplyStatus(tgt, enemy.onhit.kind, enemy.onhit.turns); infl = enemy.onhit.kind; }
    var died = tgt.hp<=0; if(died) tgt.downed = true;
    srpgRender();
    srpgAtkAnim(enemy); srpgLunge(enemy, tgt.x, tgt.y);
    srpgSlashAt(tgt.x, tgt.y, 'math', false);
    srpgFlashSprite(tgt.id, 'hit'); srpgShakeTile(tgt.x, tgt.y);
    srpgPopupAt(tgt.x, tgt.y, dmg, 'dmg-e');
    try{ sfx('wrong'); vibe(20); }catch(e){}
    if(infl){ var sm = SRPG_STATUS_META[infl]; setTimeout(function(){ srpgPopupAt(tgt.x, tgt.y, sm.em+sm.name, 'status'); }, 280); }
    if(died){ srpgPoof(tgt.x, tgt.y); srpgPopupAt(tgt.x, tgt.y, 'たおれた…', 'down'); }
    if(!died){ srpgTryCounter(tgt, enemy, srpgEnemyAfter); return; }   // 味方の反撃
  }
  srpgEnemyAfter();
}
// 敵のサポート：なかまの敵を回復／強化（先にサポート役を倒す判断が生まれる）
function srpgEnemySupport(enemy, act){
  var sk = srpgSkill(act.skillId), tgt = srpgUnitById(act.targetId);
  if(!sk || !tgt || tgt.downed){ srpgEnemyAfter(); return; }
  enemy.mp = Math.max(0, (enemy.mp||0) - sk.mp);
  if(sk.kind === 'heal'){
    var heal = srpgHealAmount(enemy, sk.power);
    tgt.hp = Math.min(tgt.maxHp, tgt.hp + heal);
    srpgRender();
    srpgFxOverlay(tgt.x, tgt.y, 'fx-heal', '✨');
    srpgFlashSprite(tgt.id, 'heal');
    srpgPopupAt(tgt.x, tgt.y, '+'+heal, 'heal');
    try{ showToast('⚠️', enemy.name+'が なかまを 回復！', 'かいふく役を 先に たおそう！'); }catch(e){}
  } else if(sk.buff){
    srpgSetMod(tgt, sk.buff.stat, sk.buff.stage, sk.buff.turns);
    srpgRender();
    srpgFxOverlay(tgt.x, tgt.y, 'fx-buff', '⬆');
    srpgPopupAt(tgt.x, tgt.y, '⬆'+SRPG_STAT_JA[sk.buff.stat]+' アップ', 'buff');
    try{ showToast('⚠️', enemy.name+'が なかまを 強化！', 'おうえん役を 先に たおそう！'); }catch(e){}
  }
  try{ sfx('powerup'); }catch(e){}
  srpgEnemyAfter();
}
// ================= ボスの山場：かくせい（フェーズ変化）＆ 大技（予告→回避）=================
// 全敵をスキャンし、HPが閾値以下に落ちたボスを1体 かくせいさせる（演出つき）。true=発動。
function srpgBossWatch(){
  if(!srpgB || srpgB.over) return false;
  // 安全弁：大技チャージの発動者が倒れていたら 予告を破棄（残留で警告が残り、以後どのボスも大技を
  // ためられなくなる＝srpgEnemyMayChargeの『|| srpgB.charge』ガードが恒久無効化するのを防ぐ）
  if(srpgB.charge){ var _co = srpgUnitById(srpgB.charge.by); if(!_co || _co.downed){ srpgB.charge = null; srpgClearHi(); } }
  for(var i=0;i<srpgB.units.length;i++){
    var u = srpgB.units[i];
    if(u.side!=='enemy' || u.downed) continue;
    var ph = (typeof srpgBossPhaseReady==='function') ? srpgBossPhaseReady(u) : null;
    if(ph){ srpgBossEnrage(u, ph); return true; }
  }
  return false;
}
function srpgBossEnrage(boss, phase){
  boss.phaseDone = true;
  srpgSetMod(boss, 'atk', phase.atk||0, 99);
  srpgSetMod(boss, 'def', phase.def||0, 99);
  boss.mp = boss.mpMax || 6;   // かくせい直後は 大技も撃てる
  srpgRender();                // 強化の矢印を反映
  try{ sfx('powerup'); }catch(e){}
  try{ vibe(60); }catch(e){}
  srpgShakeTile(boss.x, boss.y); srpgFlashSprite(boss.id, 'hit');
  srpgFxOverlay(boss.x, boss.y, 'fx-buff', '🔥', 900);
  try{
    var host=document.getElementById('srpg-body');
    if(host){
      var o=document.createElement('div'); o.className='srpg-enrage-flash';
      o.innerHTML='<div class="srpg-enrage-word">'+escapeHtml(phase.name||'かくせい')+'！</div><div class="srpg-enrage-boss">'+escapeHtml(boss.name||'ボス')+'</div>';
      host.appendChild(o);
      setTimeout(function(){ try{ host.removeChild(o); }catch(e){} }, 1400);
    }
  }catch(e){}
  try{ if(phase.msg) showToast('👹', (boss.name||'ボス')+' '+(phase.name||'かくせい')+'！', phase.msg); }catch(e){}
}
// 大技をためる判断：ボスで charge を持ち、かくせい後・クールダウン明け・味方がいる。
// （MPだと通常とくぎに消費され溜まらないので、大技は専用クールダウン制＝確実に周期発動）
function srpgEnemyMayCharge(enemy){
  if(!enemy || !enemy.charge || srpgB.charge) return false;
  if(!enemy.phaseDone) return false;                       // かくせい後だけ大技を使う
  if((enemy._chgCd||0) > 0){ enemy._chgCd--; return false; }
  return srpgB.units.some(function(u){ return u.side==='ally' && !u.downed; });
}
// 大技の予告：いちばん巻き込める中心にAoEを表示し、次のターンに放つ。今ターンは ためるだけ。
function srpgBossBeginCharge(boss){
  var ch = boss.charge;
  var best = (typeof srpgAoeBestCenter==='function') ? srpgAoeBestCenter(ch.aoe, srpgB.units, srpgB.grid) : null;
  if(!best){ setTimeout(function(){ srpgEnemyAfter(); }, _sd(300)); return; }
  boss._chgCd = (ch.cd || 3);   // 次の大技まで ボスの手番 3回ぶん あける
  var set={}; best.tiles.forEach(function(t){ set[t.x+','+t.y]=1; });
  srpgB.charge = { by:boss.id, set:set, tiles:best.tiles, power:ch.power||180, name:ch.name||'大技' };
  srpgClearHi(); srpgRender();   // 赤い予告マスを描画
  srpgFlashSprite(boss.id, 'heal'); srpgFxOverlay(boss.x, boss.y, 'fx-buff', '⚡', 900);
  try{ sfx('powerup'); }catch(e){}
  try{ showToast('☢️', (boss.name||'ボス')+'「'+(ch.name||'大技')+'」を ためた！', ch.warn||'つぎのターン 赤いマスに 大技がくる！ にげろ！'); }catch(e){}
  setTimeout(function(){ srpgEnemyAfter(); }, _sd(950));
}
// 大技の発動：予告マスに残っている味方に大ダメージ。逃げた味方は無傷。
function srpgBossFireCharge(boss){
  var chg = srpgB.charge; srpgB.charge = null;
  if(!chg || boss.downed){ srpgEnemyAfter(); return; }
  srpgClearHi();
  srpgCutin(boss, chg.name, null, function(){
    var hits = [];
    (chg.tiles||[]).forEach(function(t){
      var u = srpgUnitAt(srpgB.units, t.x, t.y);
      if(u && u.side==='ally' && !u.downed){
        var dmg = srpgDamage(boss, u, chg.power, 1, false);
        dmg = Math.min(dmg, Math.round(u.maxHp * 0.6));   // 満タンからの即死を防ぐ（ねむり/まひで回避不能な子の救済）
        u.hp = Math.max(0, u.hp - dmg);
        var died = u.hp<=0; if(died) u.downed=true;
        hits.push({ x:t.x, y:t.y, dmg:dmg, died:died });
      }
    });
    srpgRender();
    (chg.tiles||[]).forEach(function(t){ srpgPoof(t.x, t.y); });
    hits.forEach(function(h){
      srpgShakeTile(h.x, h.y);
      srpgPopupAt(h.x, h.y, h.dmg, 'dmg-e');
      if(h.died){ srpgPopupAt(h.x, h.y, 'たおれた…', 'down'); }
    });
    try{ sfx('wrong'); vibe(80); }catch(e){}
    if(!hits.length){ try{ showToast('💨','大技を かわした！','赤いマスから ぜんいん にげきった！ ナイス回避！'); }catch(e){} }
    setTimeout(function(){ srpgClearHi(); srpgEnemyAfter(); }, _sd(950));
  });
}
function srpgEnemySkill(enemy, act){
  var sk = srpgSkill(act.skillId); if(!sk){ srpgEnemyAttack(enemy, (act.targetIds||[])[0]); return; }
  enemy.mp = Math.max(0, (enemy.mp||0) - sk.mp);
  srpgClearHi();
  srpgCutin(enemy, sk.name, null, function(){ srpgEnemySkillApply(enemy, act, sk); });
}
function srpgEnemySkillApply(enemy, act, sk){
  var cells = act.aoe || [], fx = [];
  cells.forEach(function(c){
    var u = srpgUnitAt(srpgB.units, c.x, c.y);
    if(!(u && u.side==='ally' && !u.downed)) return;
    var dmg = srpgDamage(enemy, u, sk.power||100, 1, false);
    srpgWakeOnHit(u);
    u.hp = Math.max(0, u.hp - dmg);
    var died = u.hp<=0; if(died) u.downed = true;
    var infl = null;
    if(!died && sk.inflict && Math.random() < sk.inflict.chance){ srpgApplyStatus(u, sk.inflict.kind, sk.inflict.turns); infl = sk.inflict.kind; }
    fx.push({ x:c.x, y:c.y, dmg:dmg, id:u.id, died:died, infl:infl });
  });
  srpgRender();
  srpgAtkAnim(enemy);
  var _c = act.center || (cells[0] || { x:enemy.x, y:enemy.y });
  srpgLunge(enemy, _c.x, _c.y);
  srpgSkillFx(sk, null, cells, _c.x, _c.y);   // ④ 敵とくぎも固有エフェクト
  fx.forEach(function(ev){
    srpgFlashSprite(ev.id, 'hit'); srpgShakeTile(ev.x, ev.y);
    srpgPopupAt(ev.x, ev.y, ev.dmg, 'dmg-e');
    if(ev.infl){ var sm = SRPG_STATUS_META[ev.infl]; setTimeout(function(){ srpgPopupAt(ev.x, ev.y, sm.em+sm.name, 'status'); }, 280); }
    if(ev.died){ srpgPoof(ev.x, ev.y); srpgPopupAt(ev.x, ev.y, 'たおれた…', 'down'); }
  });
  try{ sfx('wrong'); vibe([20,40,20]); document.body.classList.add('srpg-flash'); setTimeout(function(){ document.body.classList.remove('srpg-flash'); }, 260); }catch(e){}
  srpgEnemyAfter();
}

// ================= 決着 =================
// 勝利：出撃したあいぼうが成長（エサ2つぶん＝Lvが上がると覚醒でとくぎ習得）
function srpgGrowUsedAibou(units){
  try{
    var s = rpgState(), ai = rpgAibouState(s), grew = [];
    (units || []).forEach(function(u){
      if(u.side !== 'ally') return;
      var a = ai.roster[u.id]; if(!a) return;
      var ups = aibouFeed(a, 2);   // 参加ボーナス
      if(ups > 0) grew.push({ name:a.name || 'なかま', lv:a.lv });
    });
    if(grew.length) rpgSave(s);
    return grew;
  }catch(e){ return []; }
}
// 勝利：ステージの敵から1体をスカウト（あいぼうに加入）。ボスは加入しやすい
function srpgScoutReward(stage){
  try{
    var s = rpgState(), ai = rpgAibouState(s);
    if(Object.keys(ai.roster).length >= AIBOU_ROSTER_MAX){ ai.food += 10; rpgSave(s); return { full:true }; }
    var isBoss = stage.type === 'quest' && stage.boss;
    if(Math.random() >= (isBoss ? 0.9 : 0.5)) return null;
    var es = stage.enemies || []; if(!es.length) return null;
    var e = es[Math.floor(Math.random() * es.length)], t = SRPG_ENEMY_TEMPLATES[e.key] || {};
    var lvl = e.lvl || 1;
    var rank = aibouRollRank(lvl + (t.boss ? 2 : 0));
    var sp = aibouRollSpecies(t.art, t.boss ? 'boss' : 'zako', undefined, false);
    var id = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    var mon = { id:id, art:t.art || 'slime', sp:sp, rank:rank, lv:1, xp:0, name:t.name || 'なかま' };
    ai.roster[id] = mon;
    var inParty = false; if(ai.party.length < 3){ ai.party.push(id); inParty = true; }
    rpgSave(s);
    return { mon:mon, inParty:inParty };
  }catch(e){ return null; }
}
// ===== 魔王フィナーレ（q_maou 制覇＝タクトの結末＝まなびの王国がすくわれる）=====
var SRPG_MAOU_LINES = [
  { em:'☀️', tx:'まなびの王国に、ちえの光が もどってきた！' },
  { em:'💎', tx:'5つの クリスタルの かがやきが、魔王シグマの「モヤの霧」を はらった。' },
  { em:'🐾', tx:'霧に とらわれていた 動物の先生たちも、みんな たすかったよ。' },
  { em:'🏆', tx:'きみは、まなびの王国を すくった 本物の 勇者だ！' },
  { em:'✨', tx:'……でも、ほんとうの ぼうけんは これからだ。つぎの きみに 会えるのを たのしみにしてる！' }
];
function srpgMaouFinale(){
  // 初回は 救済エンディングの物語シーン（立ち絵）→ そのあと お祝いパネル
  if(!srpgStorySeen('maou_clear')){
    var scenes = _srpgStory('maou_clear');
    if(scenes && scenes.length){ srpgMarkStorySeen('maou_clear'); try{ rpgStoryPlay(scenes, _srpgMaouFinalePanel); return; }catch(e){} }
  }
  _srpgMaouFinalePanel();
}
function _srpgMaouFinalePanel(){
  try{ safeLS.setItem('srpg_maou_cleared', '1'); }catch(e){}
  var host = document.getElementById('srpg-body'); if(!host) return;
  if(host.querySelector('.srpg-finale')) return;   // 二重生成ガード（自動再生とボタンが競合しても1枚だけ）
  var ov = document.createElement('div'); ov.className = 'srpg-finale';
  ov.innerHTML = '<div class="srpg-finale-sky"></div>'
    + '<div class="srpg-finale-em">🏰✨</div>'
    + '<div class="srpg-finale-ttl">まなびの王国、へいわ！</div>'
    + '<div class="srpg-finale-line" id="srpg-finale-line"></div>'
    + '<div class="srpg-finale-hint" id="srpg-finale-hint">タップで つぎへ ▶</div>';
  host.appendChild(ov);
  try{ sfx('fanfare'); }catch(e){} try{ if(typeof confetti==='function') confetti(); }catch(e){}
  var i = 0;
  function show(){
    var line = document.getElementById('srpg-finale-line'); if(!line) return;
    if(i >= SRPG_MAOU_LINES.length){
      line.innerHTML = '';
      var st = document.createElement('div'); st.className = 'srpg-finale-stamp'; st.textContent = '🏆 クリア！';
      ov.appendChild(st);
      var hint = document.getElementById('srpg-finale-hint'); if(hint) hint.textContent = 'タップで とじる ▶';
      ov.onclick = function(){ try{ host.removeChild(ov); }catch(e){} ov.onclick = null; };
      try{ sfx('legendary'); if(typeof confetti==='function') confetti(); }catch(e){}
      return;
    }
    var l = SRPG_MAOU_LINES[i++];
    line.className = 'srpg-finale-line';
    line.innerHTML = '<span class="srpg-finale-lem">'+l.em+'</span>'+escapeHtml(l.tx);
    void line.offsetWidth; line.classList.add('in');
    try{ speak(l.tx); }catch(e){}
  }
  ov.onclick = show;
  show();
}
function srpgEnd(outcome){
  if(!srpgB || srpgB.over) return;
  // ウェーブ制：敵を全滅させても 増援（次の陣）が残っていれば 戦闘続行
  if(outcome==='win' && srpgB.stage.waves && (srpgB.waveIdx||0) < srpgB.stage.waves.length){
    srpgB.waveIdx = (srpgB.waveIdx||0) + 1;
    var newbies = srpgWaveUnits(srpgB.stage, srpgB.waveIdx);
    // 味方が居るマスと被ったら1マス上へずらす（安全弁）
    newbies.forEach(function(nu){ var g=0; while(srpgUnitAt(srpgB.units, nu.x, nu.y) && g++<6){ nu.y = Math.max(0, nu.y-1); } });
    srpgB.units = srpgB.units.concat(newbies);
    srpgB.order = srpgTurnOrder(srpgB.units); srpgB.turnPtr = -1; srpgB.acted = {};
    srpgClearHi(); srpgRender();
    newbies.forEach(function(nu){ srpgFlashSprite(nu.id, 'hit'); srpgPopupAt(nu.x, nu.y, 'とうじょう！', 'status'); });
    try{ showToast('⚠️','あたらしい てきが あらわれた！','第'+(srpgB.waveIdx+1)+'陣！ まだ おわらないぞ！'); sfx('wrong'); vibe(30); }catch(e){}
    srpgSay('まだ おわらない！ あたらしい てきが きたぞ！');
    setTimeout(srpgNextTurn, 1100);
    return;
  }
  srpgB.over = true; srpgB.phase = 'over';
  srpgWatchStop();   // 決着＝ウォッチドッグ停止
  var win = outcome==='win';
  var coin = 30 + srpgB.stage.enemies.length * 15;
  var xp = 40 + srpgB.stage.enemies.length * 20;
  var extra = '', scout = null;
  var stype = srpgB.stage.type;
  var isLoop = (stype==='daily' || stype==='tower');
  var maouWin = win && srpgB.stageId === 'q_maou';                       // 魔王シグマ撃破＝ゲームのクライマックス
  var maouFirst = maouWin && !srpgClearedSet()['q_maou'];               // 初制覇だけ フィナーレを自動再生
  var cryDef = win ? srpgCrystalFor(srpgB.stageId) : null;              // この大陸クエストのクリスタル
  var cryFirst = cryDef && !srpgClearedSet()[srpgB.stageId];            // 大陸の初クリア＝クリスタル獲得
  // 物語モード（大陸アーク）：章ボス撃破シーン／最終章クリアで先生救出＋クリスタル授与
  var storyAfter = null, chapWin = null;
  if(win && stype==='chapter'){
    chapWin = srpgParseChapterId(srpgB.stageId);
    if(chapWin){
      var _cont = srpgContinent(chapWin.area);
      var _isFinal = srpgIsFinalBoss(chapWin.area, chapWin.ci, chapWin.ni);   // 純関数で最終章ボス判定（テスト可能）
      if(_isFinal && _cont){
        cryDef = srpgCrystalFor(_cont.crystalId);                        // クリスタルは大陸ID（q_math等）に付与
        cryFirst = cryDef && !srpgClearedSet()[_cont.crystalId];
        storyAfter = _srpgStory(chapWin.area+'_clear');
      } else if(chapWin.ni===2){
        storyAfter = _srpgStory(chapWin.area+'_ch'+chapWin.ci+'_win');
      }
    }
  }
  // 裏ボス（エンドゲーム）撃破＝真エンディングのシーンを結果のあとに再生
  if(win && srpgB.stageId==='q_secret'){ storyAfter = _srpgStory('secret_clear'); }
  if(!isLoop){ if(win){ srpgClearLoss(srpgB.stageId); } else { srpgNoteLoss(srpgB.stageId); } }   // 敗北救済（周回は対象外）
  if(!win && stype==='tower'){ try{ lsSetJSON('srpg_tower_save', null); }catch(e){} }   // 塔で負けたら「つづき」は消える
  if(win && isLoop){
    // 周回の追加報酬：デイリー初クリア＝🪙60＋🍖5／塔＝階×10コイン＆5階ごとに🎫
    try{
      var s2 = rpgState(), cos2 = rpgCosState(s2);
      if(stype==='daily' && !srpgDailyDoneToday()){
        cos2.coin = (cos2.coin||0) + 60;
        var ai2 = rpgAibouState(s2); ai2.food = (ai2.food||0) + 5;
        safeLS.setItem('srpg_daily_done', _srpgToday());
        extra += '<div class="srpg-res-line scout">🌀 きょうの初クリア！ 🪙+60 ・ 🍖エサ+5</div>';
      }
      if(stype==='tower'){
        // 🏰中断セーブ：勝った時点で「つぎの階＋味方の状態」を保存（あとで つづきから）
        try{
          var _cw = {};
          srpgB.units.forEach(function(uu){ if(uu.side==='ally') _cw[uu.id] = { hp:uu.hp, mp:uu.mp||0, downed:!!uu.downed }; });
          lsSetJSON('srpg_tower_save', { floor:(srpgB.stage.floor||1)+1, carry:_cw });
        }catch(e){}
        var fl = srpgB.stage.floor || 1;
        cos2.coin = (cos2.coin||0) + fl*10;
        extra += '<div class="srpg-res-line grow">🗼 '+fl+'階 とっぱ！ 🪙+'+(fl*10)+'</div>';
        if(fl % 5 === 0){ cos2.tickets = (cos2.tickets||0) + 1; extra += '<div class="srpg-res-line scout">🎫 ボス階クリア！ ガチャチケット+1</div>'; }
        if(fl > srpgTowerBest()){ try{ safeLS.setItem('srpg_tower_best', String(fl)); }catch(e){} extra += '<div class="srpg-res-line">🏅 さいこう記録 こうしん！ '+fl+'階</div>'; }
      }
      rpgSave(s2);
    }catch(e){}
  }
  if(win){
    if(!isLoop) srpgMarkCleared(srpgB.stageId);
    // 物語モード：大陸の最終章クリア＝クリスタルは大陸ID（q_math等）で記録（既存クリスタル数に合流）
    if(stype==='chapter' && chapWin && cryFirst && cryDef){ var _fc=srpgContinent(chapWin.area); if(_fc) srpgMarkCleared(_fc.crystalId); }
    if(cryFirst){ extra += '<div class="srpg-res-line scout">'+cryDef.em+' 「'+escapeHtml(cryDef.name)+'」を 手に入れた！（ちえのクリスタル '+srpgCrystalCount(srpgClearedSet())+'/5）</div>'; }
    // ごほうび：コインとXP（既存RPGの経済＝rpgState/cosに合流）
    try{ var s = rpgState(), cos = rpgCosState(s);
      cos.coin = (cos.coin||0) + coin;
      s.xp = (s.xp||0) + xp; s.level = rpgLevelForXp(s.xp);
      rpgSave(s);
    }catch(e){}
    // 💪にがてチャレンジ：にがて教科での正解1回につき 🪙+5
    if(srpgB.nigateHits > 0){
      try{ var sN = rpgState(), cosN = rpgCosState(sN); cosN.coin = (cosN.coin||0) + srpgB.nigateHits * 5; rpgSave(sN); }catch(e){}
      extra += '<div class="srpg-res-line grow">💪 にがてチャレンジ '+srpgB.nigateHits+'回 → 🪙+'+(srpgB.nigateHits*5)+'</div>';
    }
    // 収集連動：出撃した仲間が成長＋敵をスカウト
    var grew = srpgGrowUsedAibou(srpgB.units);
    grew.forEach(function(g){ extra += '<div class="srpg-res-line grow">🍖 '+escapeHtml(g.name)+' が Lv'+g.lv+' に せいちょう！</div>'; });
    scout = srpgScoutReward(srpgB.stage);
    if(scout && scout.mon){ extra += '<div class="srpg-res-line scout">🎉 '+escapeHtml(scout.mon.name)+'（'+scout.mon.rank+'）が なかまに なった！'+(scout.inParty?'（パーティ入り）':'')+'</div>'; }
    else if(scout && scout.full){ extra += '<div class="srpg-res-line">🐾 なかまが いっぱい…🍖エサ+10</div>'; }
    try{ updateResBar(); }catch(e){}
    try{ if(typeof rpgBumpDailyWin==='function'){ rpgBumpDailyWin(); rpgCheckMissions(); if(typeof checkAchievements==='function') checkAchievements(); } }catch(e){}   // きょうの目標：タクト勝利をカウント＋達成判定
    try{ if(typeof bgmPlay==='function') bgmPlay('map'); }catch(e){}
  }
  // ★クリア星評価（★1=勝利 ★2=全員生存 ★3=規定ラウンド以内）
  var stars = 0;
  if(win){
    var downed = srpgB.units.filter(function(x){ return x.side==='ally' && x.downed; }).length;
    stars = srpgStars(true, downed, srpgB.round||1, srpgB.stage.par || (4 + srpgB.stage.enemies.length + (srpgB.stage.waves||[]).length*2));
    if(!isLoop){ try{ var sm2 = lsGetJSON('srpg_stars', {})||{}; if((sm2[srpgB.stageId]||0) < stars){ sm2[srpgB.stageId]=stars; lsSetJSON('srpg_stars', sm2); } }catch(e){} }
  }
  // ⑤ 勝利の決めポーズ：生き残った味方が とびはねる（リーダーは大きく中央）
  var vic = '';
  if(win){
    var alive = srpgB.units.filter(function(u){ return u.side==='ally' && !u.downed; });
    var mems = alive.map(function(u, i){
      return '<div class="srpg-vic-mem'+(u.isLeader?' lead':'')+'" style="animation-delay:'+(i*0.09).toFixed(2)+'s">'+srpgUnitArt(u)+'</div>';
    }).join('');
    vic = '<div class="srpg-vic-stage"><div class="srpg-vic-burst"></div><div class="srpg-vic-party">'+mems+'</div></div>';
  }
  var body = document.getElementById('srpg-body');
  var card = '<div class="srpg-result '+(win?'win':'lose')+'">'
    + vic
    + '<div class="srpg-result-em">'+(win?'🏆':'💫')+'</div>'
    + '<div class="srpg-result-t">'+(win?'しょうり！':'まけてしまった…')+'</div>'
    + (win?('<div class="srpg-result-stars">'+[1,2,3].map(function(i){return '<span class="'+(i<=stars?'on':'')+'">★</span>';}).join('')+'</div><div class="srpg-result-starhint">'+(stars>=3?'パーフェクト！':(stars===2?'全員生存！ ★3は '+(srpgB.stage.par||6)+'ラウンド以内':'★2は 全員生存 ／ ★3は はやくクリア'))+'</div>'):'')
    + '<div class="srpg-result-s">'+(win?('🪙コイン +'+coin+' ／ けいけんち +'+xp):'もういちど ちょうせんしよう！')+'</div>'
    + (extra?('<div class="srpg-res-extra">'+extra+'</div>'):'')
    + '<div class="srpg-result-btns">'
    + (win && stype==='tower' ? '<button class="rpg-btn" onclick="srpgTowerNext()">🗼 つぎの '+((srpgB.stage.floor||1)+1)+'階へ →</button>' : '')
    + (stype==='tower' ? '' : '<button class="rpg-btn" onclick="srpgStart(\''+srpgB.stageId+'\')">🔁 もういちど</button>')
    + (!win && stype==='tower' ? '<button class="rpg-btn" onclick="srpgTowerStart()">🔁 1階から ちょうせん</button>' : '')
    + (maouWin ? '<button class="rpg-btn" onclick="srpgMaouFinale()">🎬 エンディングを見る</button>' : '')
    + (win?'<button class="rpg-btn" onclick="srpgTeamScreen()">🛡️ 編成をかえる</button>':'')
    + '<button class="rpg-btn ghost" onclick="srpgStageSelect()">🗺️ ステージ選択</button>'
    + '</div></div>';
  body.insertAdjacentHTML('beforeend', '<div class="srpg-result-wrap">'+card+'</div>');
  try{ sfx(win?'levelup':'wrong'); }catch(e){}
  if(win){ try{ if(typeof confetti==='function') confetti(); }catch(e){} }
  if(cryFirst){ try{ var _cn=srpgCrystalCount(srpgClearedSet()); sfx('fanfare'); showToast(cryDef.em, '「'+cryDef.name+'」GET！', 'ちえのクリスタル '+_cn+'/5'+(_cn>=5?'　5つ そろった！ 魔王城が ひらいた！':'　のこり '+(5-_cn)+'つ！')); }catch(e){} }
  if(maouFirst){ setTimeout(function(){ try{ srpgMaouFinale(); }catch(e){} }, _sd(900)); }   // 初制覇＝結末を自動再生
  // 勝敗の声（スカウト演出があるときは そちらの声を優先＝重ねない）
  var hasScout = win && scout && scout.mon;
  if(!hasScout) srpgSay(win ? 'しょうり！ みんな、よくがんばったね！' : 'まけちゃった…。でも だいじょうぶ、つぎは きっと かてるよ！');
  // ③ スカウトした仲間の「登場演出」（結果カードの上に出す）
  if(hasScout){ try{ srpgScoutReveal(scout.mon); }catch(e){} }
  // 物語モード：章ボス撃破／大陸クリアのシーンを 結果のあとに再生（スカウト演出とは重ねない）
  if(win && storyAfter && storyAfter.length){
    var _stDelay = hasScout ? 2800 : (cryFirst ? 1500 : 1000);
    setTimeout(function(){ try{ rpgStoryPlay(storyAfter, null); }catch(e){} }, _sd(_stDelay));
  }
}
function srpgClose(){
  srpgWatchStop();   // バトル終了/離脱＝ウォッチドッグ停止
  srpgB = null;
  var sc = document.getElementById('srpg-screen'); if(sc) sc.style.display='none';
  var bar = document.getElementById('mu-tabbar'); if(bar) bar.classList.remove('mu-hidden');
  try{ muNav('home'); }catch(e){ try{ renderGameHub(); }catch(e2){} }
}

// ================= スカウトガチャ（コインで仲間モンスターを引く） =================
function _scoutArts(rank){
  // 引けるアート：基本20種＋属性変種100種（petは除外・魔王はSSS/LG・大魔王級はLG限定）
  var LEG = (typeof SRPG_LEGEND_ARTS!=='undefined') ? SRPG_LEGEND_ARTS : [];
  var arts = Object.keys(AIBOU_ART_SPECIES).filter(function(a){ return a!=='pet' && a!=='villain' && !/2$/.test(a) && LEG.indexOf(a)<0; });
  arts = arts.concat(Object.keys(SRPG_MON_VARIANTS2));
  if(rank==='SSS' || rank==='LG') arts.push('villain');
  if(rank==='LG') arts = arts.concat(LEG);   // 大魔王級はLG（0.5%）のときだけ＝コレクションの最高峰
  return arts;
}
function _scoutSp(art){ var v=SRPG_MON_VARIANTS2[art]; return AIBOU_ART_SPECIES[v?v.base:art] || 'beast'; }
function _srpgWeekKey(){ var d=new Date(); var onejan=new Date(d.getFullYear(),0,1); var wk=Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7); return d.getFullYear()+'-w'+wk; }
function srpgScoutFreeReady(){ try{ return safeLS.getItem('srpg_scout_free') !== _srpgToday(); }catch(e){ return false; } }
// 進化できるなかまが1体でもいるか（ハブの発見性バッジ用）。育成画面と同じ判定ロジック。
function srpgHasEvolvable(){
  try{
    if(typeof srpgEvolveCanDo!=='function') return false;
    var s = rpgState(), ai = rpgAibouState(s), cos = rpgCosState(s);
    var coin = cos.coin || 0, party = srpgProtectedIds(ai);
    var RANKS = ['F','E','D','C','B','A','S','SS','SSS','LG'];
    var byArt = {};
    Object.keys(ai.roster).forEach(function(id){ var a = ai.roster[id]; if(a) (byArt[a.art] = byArt[a.art] || []).push(a); });
    return Object.keys(byArt).some(function(art){
      var g = byArt[art]; if(g.length < 2) return false;
      g.sort(function(a, b){ return (RANKS.indexOf(b.rank||'F') - RANKS.indexOf(a.rank||'F')) || ((b.lv||1) - (a.lv||1)); });
      var base = g[0];
      var dupes = g.filter(function(m){ return m.id !== base.id && party.indexOf(m.id) < 0; });
      var can = srpgEvolveCanDo(base, dupes.length, coin);
      return !!(can && can.ok);
    });
  }catch(e){ return false; }
}
function srpgScoutScreen(){
  srpgB = null;
  var coin = 0; try{ coin = rpgCoin(); }catch(e){}
  var pity = 0; try{ pity = rpgCosState(rpgState()).scoutPity || 0; }catch(e){}
  var pleft = Math.max(0, SRPG_SCOUT_PITY_MAX - pity);
  var ppct = Math.min(100, Math.round(pity / SRPG_SCOUT_PITY_MAX * 100));
  var picks = srpgScoutPickups(_srpgWeekKey());
  var freeOk = srpgScoutFreeReady();
  document.getElementById('srpg-title').textContent = 'スカウト';
  var faces = ['dragon','slugking','tokiou','villain'].map(function(a){ return '<span class="srpg-sc-mon">'+((typeof srpgMonArt==='function'&&srpgMonArt(a))||_monStill(a))+'</span>'; }).join('');
  var pickFaces = picks.map(function(a){ return '<span class="srpg-pick-face">'+((typeof srpgMonArt==='function'&&srpgMonArt(a))||_monStill(a))+'<i>×2</i></span>'; }).join('');
  document.getElementById('srpg-body').innerHTML =
    '<div class="srpg-scout-shop">'
    + '<div class="srpg-shop-hero"><div class="srpg-shop-circle"></div><div class="srpg-shop-faces">'+faces+'</div>'
    + '<div class="srpg-shop-t">🔮 なかまスカウト</div>'
    + '<div class="srpg-shop-s">コインで つよい なかまを むかえよう！<br>SSSランクなら 魔王も なかまに…！？</div></div>'
    + '<div class="srpg-shop-pick"><small>こんしゅうの ピックアップ（出やすさ2倍）</small><div class="srpg-pick-row">'+pickFaces+'</div></div>'
    + '<div class="srpg-shop-pity"><div class="srpg-pity-bar"><i style="width:'+ppct+'%"></i></div><small>あと <b>'+pleft+'</b>回スカウトで SSランク以上 かくてい！（天井）</small></div>'
    + '<div class="srpg-shop-coin">🪙 <b>'+coin+'</b></div>'
    + (freeOk ? '<button class="rpg-btn srpg-shop-free" onclick="srpgScoutDo(1,true)">🎀 きょうの むりょうスカウト（1日1回）</button>' : '<div class="srpg-shop-freedone">🎀 きょうの むりょうスカウトは うけとりずみ（また あした！）</div>')
    + '<div class="srpg-shop-btns">'
    + '<button class="rpg-btn" onclick="srpgScoutDo(1)">1回 スカウト<br><small>🪙'+SRPG_SCOUT_COST.one+'</small></button>'
    + '<button class="rpg-btn srpg-shop-ten" onclick="srpgScoutDo(10)">10連 スカウト<br><small>🪙'+SRPG_SCOUT_COST.ten+' ・ Aランク以上 1体かくてい</small></button>'
    + '</div>'
    + '<div class="srpg-shop-links"><button class="srpg-mini2" onclick="srpgScoutOdds()">📋 確率</button>'
    + '<button class="srpg-mini2" onclick="srpgScoutLog()">📜 きろく</button>'
    + '<button class="srpg-mini2" onclick="srpgMedalShop()">🎖️ こうかんじょ</button>'
    + '<button class="srpg-mini2" onclick="srpgDexScreen()">📖 ずかん</button></div>'
    + '<button class="srpg-mini" onclick="srpgTeamScreen()">← 編成へもどる</button>'
    + '</div>';
  try{ _char3dHydrateSafe(document.getElementById('srpg-body')); }catch(e){}
}
function srpgScoutLog(){
  var ov = document.getElementById('srpg-ask'); if(!ov) return;
  var lg = []; try{ lg = lsGetJSON('scout_log', []) || []; }catch(e){}
  var rows = lg.slice().reverse().map(function(e){
    var art = (typeof srpgMonArt==='function' && srpgMonArt(e.art)) || _monStill(e.art);
    return '<div class="srpg-log-row"><span class="srpg-log-art">'+art+'</span><b class="rk-'+e.rank+'">'+e.rank+'</b><span>'+escapeHtml(e.nm||'')+'</span>'+(e.nw?'<i class="srpg-log-new">NEW</i>':'')+'</div>';
  }).join('') || '<div class="srpg-odds-note">まだ スカウトしていないよ</div>';
  ov.innerHTML = '<div class="srpg-ui-card"><div class="srpg-ui-sec">📜 スカウトの きろく（さいきん20回）</div>'+rows
    + '<button class="rpg-btn ghost srpg-ui-close" onclick="srpgCloseUnitInfo()">とじる</button></div>';
  ov.style.display = 'flex';
  try{ _char3dHydrateSafe(ov); }catch(e){}
}
function srpgScoutOdds(){
  var ov = document.getElementById('srpg-ask'); if(!ov) return;
  var rows = SRPG_SCOUT_RATES.map(function(r){
    return '<div class="srpg-odds-row"><b class="rk-'+r[0]+'">'+r[0]+'</b><span>'+r[1]+'%</span></div>';
  }).join('');
  ov.innerHTML = '<div class="srpg-ui-card"><div class="srpg-ui-sec">スカウトの確率（合計100%）</div>'+rows
    + '<div class="srpg-odds-note">・10連は Aランク以上が 1体かくてい<br>・なかまが いっぱい（50体）のときは かわりに 🍖エサ+5</div>'
    + '<button class="rpg-btn ghost srpg-ui-close" onclick="srpgCloseUnitInfo()">とじる</button></div>';
  ov.style.display = 'flex';
}
function srpgScoutDo(n, useFree){
  try{ sfx('click'); }catch(e){}
  var cost = useFree ? 0 : ((n === 10) ? SRPG_SCOUT_COST.ten : SRPG_SCOUT_COST.one);
  var s, cos;
  try{ s = rpgState(); cos = rpgCosState(s); }catch(e){ return; }
  if(useFree){ if(!srpgScoutFreeReady()) return; try{ safeLS.setItem('srpg_scout_free', _srpgToday()); }catch(e){} }
  if((cos.coin||0) < cost){ try{ sfx('wrong'); showToast('🪙','コインが たりないよ','バトルの しょうりや デイリーで ためよう'); }catch(e){} return; }
  cos.coin -= cost;
  var ai = rpgAibouState(s);
  var ranks = (n === 10) ? srpgScoutTen(Math.random) : [srpgScoutRank(Math.random())];
  // 天井：ハズレ続きでも SRPG_SCOUT_PITY_MAX 回で SS以上を保証（SS以上が出たらリセット）
  var pityRes = srpgScoutApplyPity(ranks, cos.scoutPity || 0, SRPG_SCOUT_PITY_MAX);
  ranks = pityRes.ranks; cos.scoutPity = pityRes.pity;
  cos.scoutMedals = (cos.scoutMedals || 0) + ranks.length;   // 🎖️1回=1枚（交換所用・ダブり救済の最終形）
  if(!cos.metDex) cos.metDex = {};
  var picks = srpgScoutPickups(_srpgWeekKey());
  var got = [];
  ranks.forEach(function(rank){
    var full = Object.keys(ai.roster).length >= AIBOU_ROSTER_MAX;
    if(full){ ai.food = (ai.food||0) + 5; got.push({ rank:rank, full:true }); return; }
    var arts = _scoutArts(rank);
    var art = srpgScoutArt(Math.random(), arts, picks);   // ピックアップは出やすさ2倍
    var sp = _scoutSp(art);
    var id = 'm' + Date.now().toString(36) + Math.floor(Math.random()*1e6).toString(36);
    var name = (typeof srpgMonName==='function' ? srpgMonName(art) : ((SRPG_ENEMY_TEMPLATES[art] && SRPG_ENEMY_TEMPLATES[art].name) || 'なかま'));
    var isNew = !Object.keys(ai.roster).some(function(k){ return ai.roster[k] && ai.roster[k].art === art; });
    var mon = { id:id, art:art, sp:sp, rank:rank, lv:1, xp:0, name:name };
    ai.roster[id] = mon;
    cos.metDex[art] = 1;   // 図鑑：この種に出会った
    got.push({ rank:rank, mon:mon, isNew:isNew });
  });
  rpgSave(s);
  try{
    var lg = lsGetJSON('scout_log', []) || [];
    got.forEach(function(g){ if(g.mon) lg.push({ t:Date.now(), art:g.mon.art, rank:g.rank, nm:g.mon.name, nw:g.isNew?1:0 }); });
    while(lg.length > 20) lg.shift();
    lsSetJSON('scout_log', lg);
  }catch(e){}
  if(pityRes.triggered){ try{ showToast('🎯','天井とうたつ！','SSランク以上を おむかえ！（ここまでの がんばりの ごほうび）'); }catch(e){} }
  try{ updateResBar(); }catch(e){}
  srpgScoutCinematic(got, function(){
    if(got.length === 1 && got[0].mon){
      srpgScoutReveal(got[0].mon, function(){ srpgScoutResults(got); });
    } else if(got.length > 1){
      srpgScoutSequence(got, function(){ srpgScoutResults(got, true); });   // 1体ずつ順次開封→まとめ
    } else {
      srpgScoutResults(got);
    }
  });
}
// ================= 10連の順次開封：低レアはさっと・高レアは足が止まる =================
// 1体ずつ見せる自動送りの間隔（ms）。速すぎて味わえない声を受け、ゆっくりめに調整。
var SRPG_SEQ_MS = { low: 820, mid: 1500 };
function srpgScoutSequence(got, onDone){
  var ov = document.getElementById('srpg-ask');
  var fxMode = 'full'; try{ fxMode = _gachaFxMode(); }catch(e){}
  if(!ov || !got.length || _srpgRM || fxMode === 'off'){ onDone(); return; }
  var i = 0, timer = null, finished = false;
  var HIGH = { SS:1, SSS:1, LG:1 }, MID = { A:1, S:1 };
  function finishAll(){
    if(finished) return; finished = true;
    if(timer) clearTimeout(timer);
    ov.onclick = null;
    onDone();
  }
  function next(){
    if(finished) return;
    if(timer){ clearTimeout(timer); timer = null; }
    if(i >= got.length){ finishAll(); return; }
    var g = got[i++];
    if(g.mon && HIGH[g.rank]){
      // SS以上：予兆の「ため」→フル登場ショー（タップするまで先へ進まない）
      ov.onclick = null; ov.style.display = 'none';
      srpgScoutOmen(g.rank, function(){ srpgScoutReveal(g.mon, function(){ next(); }); });
      return;
    }
    show(g, (g.mon && MID[g.rank]) ? 'mid' : 'low', (g.mon && MID[g.rank]) ? SRPG_SEQ_MS.mid : SRPG_SEQ_MS.low);
  }
  function show(g, tier, ms){
    var art = g.mon ? ((typeof srpgMonArt==='function' && srpgMonArt(g.mon.art)) || _monStill(g.mon.art)) : '<span class="sc-seq-em">🍖</span>';
    ov.innerHTML = '<div class="sc-seq '+tier+'">'
      + '<div class="sc-seq-count">'+i+' / '+got.length+'</div>'
      + '<div class="sc-seq-card rk-'+(g.rank||'')+'">'
      + (g.isNew ? '<span class="srpg-got-new">NEW</span>' : '')
      + '<div class="sc-seq-art">'+art+'</div>'
      + '<div class="sc-seq-rk rk-'+(g.rank||'')+'">'+(g.rank||'')+'</div>'
      + '<div class="sc-seq-nm">'+escapeHtml(g.mon ? g.mon.name : 'なかまがいっぱい → エサ+5')+'</div></div>'
      + '<div class="sc-seq-skip">タップで つぎへ<button class="sc-seq-all">⏭ ぜんぶとばす</button></div>';
    ov.style.display = 'flex';
    ov.onclick = function(){ next(); };
    var btn = ov.querySelector('.sc-seq-all');
    if(btn) btn.onclick = function(ev){ try{ ev.stopPropagation(); }catch(e){} finishAll(); };
    try{ sfx(tier === 'mid' ? 'levelup' : 'click'); if(tier === 'mid') vibe(12); }catch(e){}
    timer = setTimeout(next, ms);
  }
  next();
}

// ================= 🎖️メダル交換所＆📖なかま図鑑 =================
function _srpgAllDexArts(){ var base=Object.keys(AIBOU_ART_SPECIES).filter(function(a){ return a!=='pet' && !/2$/.test(a); }); return base.concat(Object.keys(SRPG_MON_VARIANTS2)); }
function _srpgMetDex(){
  // 図鑑＝これまでに仲間にした種（cos.metDex）。現ロスターからも補完（過去分の救済）
  var s = rpgState(), cos = rpgCosState(s), ai = rpgAibouState(s);
  if(!cos.metDex) cos.metDex = {};
  var changed = false;
  Object.keys(ai.roster).forEach(function(id){ var a = ai.roster[id]; if(a && a.art && !cos.metDex[a.art] && !/2$/.test(a.art) && a.art!=='pet'){ cos.metDex[a.art] = 1; changed = true; } });
  if(changed) rpgSave(s);
  return cos.metDex;
}
function srpgMedalShop(){
  srpgB = null;
  var s = rpgState(), cos = rpgCosState(s);
  var medals = cos.scoutMedals || 0;
  document.getElementById('srpg-title').textContent = 'こうかんじょ';
  var arts = _srpgAllDexArts();
  var cells = arts.map(function(a){
    var art = (typeof srpgMonArt==='function' && srpgMonArt(a)) || _monStill(a);
    var cost = srpgMedalCost(a);
    var name = (typeof srpgMonName==='function') ? srpgMonName(a) : a;
    var ok = medals >= cost;
    return '<div class="srpg-med-cell"><div class="srpg-med-art">'+art+'</div>'
      + '<div class="srpg-med-nm">'+escapeHtml(name)+'</div>'
      + '<button class="srpg-med-btn'+(ok?'':' off')+'" '+(ok?('onclick="srpgMedalBuy(\''+a+'\')"'):'disabled')+'>🎖️'+cost+'</button></div>';
  }).join('');
  document.getElementById('srpg-body').innerHTML =
    '<div class="srpg-medshop">'
    + '<div class="srpg-select-lead">🎖️ メダル こうかんじょ<br><small>スカウト1回で メダル1枚。ためると すきな なかまと 交換できるよ（Aランク・魔王はSランク）</small></div>'
    + '<div class="srpg-med-have">もっているメダル 🎖️ <b>'+medals+'</b></div>'
    + '<div class="srpg-med-grid">'+cells+'</div>'
    + '<button class="srpg-mini" onclick="srpgScoutScreen()">← スカウトへもどる</button></div>';
  try{ _char3dHydrateSafe(document.getElementById('srpg-body')); }catch(e){}
}
function srpgMedalBuy(art){
  try{ sfx('click'); }catch(e){}
  var s = rpgState(), cos = rpgCosState(s), ai = rpgAibouState(s);
  var cost = srpgMedalCost(art);
  if((cos.scoutMedals||0) < cost) return;
  if(Object.keys(ai.roster).length >= AIBOU_ROSTER_MAX){ try{ showToast('🐾','なかまが いっぱいだよ','⚗️とくぎ強化の『🧹おかたづけ』で ダブりを整理してね'); }catch(e){} return; }
  var name = (typeof srpgMonName==='function') ? srpgMonName(art) : 'なかま';
  if(!confirm('🎖️ メダル'+cost+'枚で「'+name+'」と 交換しますか？')) return;
  cos.scoutMedals -= cost;
  var rank = (art === 'villain') ? 'S' : 'A';
  var sp = aibouRollSpecies(art, art==='villain' ? 'boss' : 'zako', undefined, false);
  var id = 'm' + Date.now().toString(36) + Math.floor(Math.random()*1e6).toString(36);
  var mon = { id:id, art:art, sp:sp, rank:rank, lv:1, xp:0, name:name };
  ai.roster[id] = mon;
  if(!cos.metDex) cos.metDex = {};
  cos.metDex[art] = 1;
  rpgSave(s);
  try{ sfx('fanfare'); if(typeof confetti==='function') confetti(); }catch(e){}
  srpgScoutReveal(mon, function(){ srpgMedalShop(); });
}
function srpgDexScreen(){
  srpgB = null;
  var met = _srpgMetDex();
  var s = rpgState(), cos = rpgCosState(s);
  var arts = _srpgAllDexArts();
  var prog = srpgDexProgress(met, arts.length);
  document.getElementById('srpg-title').textContent = 'なかま ずかん';
  if(!cos.dexRw) cos.dexRw = {};
  var rwMsg = '';
  SRPG_DEX_REWARDS.forEach(function(r){
    if(prog.count >= r.need && !cos.dexRw[r.id]){
      cos.dexRw[r.id] = 1; cos.coin = (cos.coin||0) + r.coin;
      rwMsg += '<div class="srpg-res-line scout">🎉 ずかん '+r.need+'種 たっせい！ 🪙+'+r.coin+'</div>';
    }
  });
  if(rwMsg){ rpgSave(s); try{ sfx('fanfare'); if(typeof confetti==='function') confetti(); }catch(e){} }
  var cells = arts.map(function(a){
    var got = !!met[a];
    var art = (typeof srpgMonArt==='function' && srpgMonArt(a)) || _monStill(a);
    var name = got ? ((typeof srpgMonName==='function') ? srpgMonName(a) : a) : '？？？';
    return '<div class="srpg-dex-cell'+(got?' got':'')+'"><div class="srpg-dex-art">'+art+'</div><div class="srpg-dex-nm">'+escapeHtml(name)+'</div></div>';
  }).join('');
  var rwList = SRPG_DEX_REWARDS.map(function(r){ return '<span class="'+(cos.dexRw[r.id]?'done':'')+'">'+(cos.dexRw[r.id]?'✅':'🎁')+' '+r.label+'</span>'; }).join('');
  document.getElementById('srpg-body').innerHTML =
    '<div class="srpg-dex">'
    + '<div class="srpg-select-lead">📖 なかま ずかん<br><small>これまでに なかまにした モンスターの きろく</small></div>'
    + '<div class="srpg-dex-prog"><div class="srpg-pity-bar"><i style="width:'+prog.pct+'%"></i></div><b>'+prog.count+' / '+prog.total+'</b> しゅるい</div>'
    + rwMsg
    + '<div class="srpg-dex-rw">'+rwList+'</div>'
    + '<div class="srpg-dex-grid">'+cells+'</div>'
    + '<button class="srpg-mini" onclick="srpgScoutScreen()">← スカウトへもどる</button></div>';
  try{ _char3dHydrateSafe(document.getElementById('srpg-body')); }catch(e){}
}

// ===== 召喚シネマティック：暗転→多重魔法陣チャージ→ランク色予告→爆発→結果 =====
var SRPG_TIER_COLOR = { low:'#38bdf8', A:'#a78bfa', S:'#f472b6', SS:'#fde047', SSS:'#f87171', LG:'#ffffff' };
function _scoutTier(best){
  if(best==='LG') return 'LG';    // LG＝伝説専用の最上位演出
  if(best==='SSS') return 'SSS';
  if(best==='SS') return 'SS';
  if(best==='S') return 'S';
  if(best==='A') return 'A';
  return 'low';
}
function srpgScoutCinematic(got, onDone){
  var ov = document.getElementById('srpg-ask'); if(!ov){ onDone(); return; }
  var RK = ['F','E','D','C','B','A','S','SS','SSS','LG'];
  var best = got.reduce(function(m, g){ return RK.indexOf(g.rank) > RK.indexOf(m) ? g.rank : m; }, 'F');
  var tier = _scoutTier(best), col = SRPG_TIER_COLOR[tier];
  var fxMode = 'full'; try{ fxMode = _gachaFxMode(); }catch(e){}
  var reduced = _srpgRM || fxMode === 'off';
  if(reduced){ onDone(); return; }   // 演出オフ設定・reduced-motionは即結果
  var motes = '';
  for(var i = 0; i < 14; i++){
    motes += '<span class="sc-mote" style="--a:'+(i*26)+'deg;--d:'+(0.9+(i%5)*0.22)+'s"></span>';
  }
  var skipped = false, timers = [];
  function T(fn, ms){ timers.push(setTimeout(fn, ms)); }
  function finish(){
    if(skipped) return; skipped = true;
    timers.forEach(clearTimeout);
    setTimeout(function(){ try{ if(window.gachaFx) gachaFx.stop(); }catch(e){} }, 1600);   // 星の雨は少し余韻を残して停止
    onDone();
  }
  ov.innerHTML = '<div class="sc-stage" id="sc-stage">'
    + '<div class="sc-vignette"></div>'
    + '<div class="sc-circle c1"></div><div class="sc-circle c2"></div><div class="sc-circle c3"></div>'
    + '<div class="sc-runes">✦ ◇ ✧ ○ ✦ ◇ ✧ ○</div>'
    + motes
    + '<div class="sc-core"></div>'
    + '<div class="sc-flash" id="sc-flash"></div>'
    + '<div class="sc-skip">タップで スキップ ⏭</div>'
    + '</div>';
  ov.style.display = 'flex';
  ov.onclick = finish;
  var stage = document.getElementById('sc-stage');
  // Canvasパーティクル（gacha-fx）を召喚にも接続＝数百粒子の吸い込み・爆発・星の雨
  var fxRank = { low:'R', A:'SR', S:'SSR', SS:'UR', SSS:'LR', LG:'LR' }[tier] || 'R';
  function fxCv(z){ try{ var cv=document.getElementById('gacha-fx-canvas'); if(cv) cv.style.zIndex=z; }catch(e){} }
  try{ if(window.gachaFx){ gachaFx.charge(fxRank); fxCv(2000); } }catch(e){}
  try{ sfx('click'); }catch(e){}
  // ①チャージ（吸い込み・魔法陣が速くなる）
  T(function(){ if(stage) stage.classList.add('charging'); try{ sfx('coin'); }catch(e){} }, 250);
  // ②ランク色の予告（円が染まる・SS以上は震動）
  T(function(){
    if(!stage) return;
    stage.style.setProperty('--sc', col);
    stage.classList.add('tell', 'tier-' + tier);
    try{ if(tier==='SS'||tier==='SSS'||tier==='LG'){ document.body.classList.add('srpg-flash'); setTimeout(function(){ document.body.classList.remove('srpg-flash'); }, 300); vibe([20,50,20]); } }catch(e){}
    try{ sfx((tier==='SSS'||tier==='LG') ? 'legendary' : (tier==='SS'||tier==='S') ? 'fanfare' : 'levelup'); }catch(e){}
    try{ if(window.gachaFx){ gachaFx.pulse(fxRank); fxCv(2000); } }catch(e){}
  }, 1300);
  // ③SSS/LG：暗転の「ため」→虹爆発（LGは 二段の暗転＝もう一度ためる）
  if(tier === 'SSS' || tier === 'LG'){
    T(function(){ if(stage) stage.classList.add('blackout'); }, 2100);
    T(function(){ if(stage){ stage.classList.remove('blackout'); stage.classList.add('rainbow'); } try{ vibe([30,60,30,60,90]); if(typeof confetti==='function') confetti(); }catch(e){} }, 2800);
  }
  if(tier === 'LG'){
    // 伝説だけの二段目：虹が一度ぜんぶ消える→白光で再点灯→超爆発
    T(function(){ if(stage) stage.classList.add('blackout'); try{ sfx('coin'); }catch(e){} }, 3700);
    T(function(){ if(stage){ stage.classList.remove('blackout'); stage.classList.add('rainbow','lgfinal'); } try{ sfx('legendary'); vibe([40,80,40,80,120]); if(typeof confetti==='function'){ confetti(); setTimeout(confetti,300); } if(window.gachaFx&&gachaFx.rain) gachaFx.rain('LR'); }catch(e){} }, 4400);
  }
  // ④爆発フラッシュ→結果へ
  var endAt = (tier === 'LG') ? 5400 : (tier === 'SSS') ? 3600 : 2400;
  T(function(){ var f = document.getElementById('sc-flash'); if(f) f.classList.add('go');
    try{ if(window.gachaFx){ gachaFx.burst(fxRank); if(tier==='SS'||tier==='SSS') gachaFx.rain(fxRank); fxCv(2000); } }catch(e){}
    try{ sfx('correct'); }catch(e){} }, endAt - 300);
  T(finish, endAt);
}
function srpgScoutResults(got, revealed){
  var ov = document.getElementById('srpg-ask'); if(!ov) return;
  var best = got.reduce(function(m, g){ return (['F','E','D','C','B','A','S','SS','SSS','LG'].indexOf(g.rank) > ['F','E','D','C','B','A','S','SS','SSS','LG'].indexOf(m)) ? g.rank : m; }, 'F');
  var HIRANK = { S:1, SS:1, SSS:1, LG:1 };
  var many = got.length > 1 && !revealed;   // 順次開封済みは 開いた一覧で
  var cells = got.map(function(g, i){
    if(g.full) return '<div class="srpg-got full"><div class="srpg-got-art">🍖</div><div class="srpg-got-nm">エサ+5</div><small>いっぱい</small></div>';
    var art = (typeof srpgMonArt==='function' && srpgMonArt(g.mon.art)) || _monStill(g.mon.art);
    var inner = (g.isNew ? '<span class="srpg-got-new">NEW</span>' : '')
      + '<div class="srpg-got-art">'+art+'</div>'
      + '<div class="srpg-got-rk rk-'+g.rank+'">'+g.rank+'</div>'
      + '<div class="srpg-got-nm">'+escapeHtml(g.mon.name)+'</div>';
    if(!many) return '<div class="srpg-got rk-'+g.rank+'">'+inner+'</div>';
    // 10連：裏向きカード → 順次フリップ（0.16秒間隔・高ランクは開く直前に金パルス）
    return '<div class="srpg-got card rk-'+g.rank+(HIRANK[g.rank]?' hi':'')+'" style="--fd:'+(0.35 + i*0.16)+'s">'
      + '<div class="srpg-got-back">？</div>'
      + '<div class="srpg-got-face">'+inner+'</div></div>';
  }).join('');
  ov.innerHTML = '<div class="srpg-ui-card scout-res">'
    + '<div class="srpg-ui-sec">🔮 スカウトの けっか</div>'
    + '<div class="srpg-got-grid">'+cells+'</div>'
    + '<div class="srpg-odds-note">「🛡️ 編成」から 出撃メンバーに 入れられるよ</div>'
    + '<div class="srpg-result-btns">'
    + '<button class="rpg-btn" onclick="srpgCloseUnitInfo();srpgScoutScreen()">🔮 もういちど</button>'
    + '<button class="rpg-btn ghost" onclick="srpgCloseUnitInfo();srpgTeamScreen()">🛡️ 編成へ</button></div></div>';
  ov.style.display = 'flex';
  try{ _char3dHydrateSafe(ov); }catch(e){}
  try{ sfx(['SSS','SS','S'].indexOf(best) >= 0 ? 'fanfare' : 'levelup'); if(['SSS','SS'].indexOf(best) >= 0 && typeof confetti === 'function') confetti(); }catch(e){}
}

// ================= なかまの育成（ダブり合成）：とくぎ強化／進化（ランクアップ） =================
// 育成の素材にしてはいけない「使用中のなかま」＝タクトの出撃チーム(srpg_team)を保護。
// （以前は旧RPGの ai.party=3びき を保護していたが、実戦で使うのはタクトのチーム。移行期は両方を保護＝より安全）
function srpgProtectedIds(ai){
  var ids = {};
  try{ var t = lsGetJSON('srpg_team', null); if(t){ (t.ids||[]).forEach(function(id){ ids[id]=1; }); if(t.leader && t.leader!=='hero') ids[t.leader]=1; } }catch(e){}
  try{ (ai && ai.party || []).forEach(function(id){ ids[id]=1; }); }catch(e){}
  return Object.keys(ids);
}
var SRPG_RANK_SCORE = ['F','E','D','C','B','A','S','SS','SSS','LG'];
// ダブりを「弱い順」に（進化の素材は 弱い個体から消費し、育てた個体を守る）
function _srpgDupeSort(a, b){
  return (SRPG_RANK_SCORE.indexOf(a.rank||'F') - SRPG_RANK_SCORE.indexOf(b.rank||'F'))
      || ((a.lv||1) - (b.lv||1)) || ((a.skLv||1) - (b.skLv||1));
}
function srpgSkillUpScreen(){
  srpgB = null;
  document.getElementById('srpg-title').textContent = 'なかまの育成';
  var s, ai; try{ s = rpgState(); ai = rpgAibouState(s); }catch(e){ return; }
  var party = srpgProtectedIds(ai);
  var coin = 0; try{ coin = rpgCoin(); }catch(e){}
  // artごとにグループ（2体以上いる種＝合成できる）
  var byArt = {};
  Object.keys(ai.roster).forEach(function(id){ var a = ai.roster[id]; if(!a) return; (byArt[a.art] = byArt[a.art] || []).push(a); });
  var RANKS = ['F','E','D','C','B','A','S','SS','SSS','LG'];
  var rows = '';
  Object.keys(byArt).forEach(function(art){
    var g = byArt[art]; if(g.length < 2) return;
    // ベース＝いちばん強い個体／素材＝パーティ外のダブり
    g.sort(function(a, b){ return (RANKS.indexOf(b.rank||'F') - RANKS.indexOf(a.rank||'F')) || ((b.lv||1) - (a.lv||1)); });
    var base = g[0];
    var dupes = g.filter(function(m){ return m.id !== base.id && party.indexOf(m.id) < 0; });   // パーティ外のダブり（進化の素材）
    var skMats = dupes.filter(function(m){ return srpgSkillUpCanFuse(base, m, party); });        // とくぎ強化に使える素材
    var artHtml = (typeof srpgMonArt==='function' && srpgMonArt(art)) || _monStill(art);
    var skMaxed = (base.skLv||1) >= SRPG_SKLV_MAX;
    // --- 進化ボタン ---
    var evo = srpgEvolveCost(base.rank || 'F');
    var evoBtn;
    if(!evo){ evoBtn = '<span class="srpg-fuse-max evo">ランクMAX</span>'; }
    else {
      var can = srpgEvolveCanDo(base, dupes.length, coin);
      var costTxt = 'ダブり'+evo.dupes+'体＋🪙'+evo.coins;
      if(can.ok){ evoBtn = '<button class="rpg-btn srpg-evo-btn" onclick="srpgEvolveDo(\''+base.id+'\')">✨ 進化 → '+evo.next+'<small>'+costTxt+'</small></button>'; }
      else { evoBtn = '<span class="srpg-fuse-none evo">✨→'+evo.next+'<small>'+costTxt+'</small><em>'+(can.reason==='coin'?'コイン不足':'素材不足')+'</em></span>'; }
    }
    // --- とくぎ強化ボタン ---
    var skBtn = skMaxed ? '<span class="srpg-fuse-max">とくぎMAX</span>'
      : (skMats.length ? '<button class="rpg-btn srpg-fuse-btn" onclick="srpgSkillUpDo(\''+base.id+'\',\''+skMats[0].id+'\')">⚗️ とくぎ強化</button>'
         : '<span class="srpg-fuse-none">素材なし</span>');
    rows += '<div class="srpg-fuse-row">'
      + '<div class="srpg-fuse-art">'+artHtml+'</div>'
      + '<div class="srpg-fuse-info"><b>'+escapeHtml(base.name||'なかま')+'</b> <small class="srpg-fuse-rank r-'+(base.rank||'F')+'">'+(base.rank||'F')+'</small> <small>Lv'+(base.lv||1)+'</small>'
      + '<div class="srpg-fuse-lv">とくぎLv '+(base.skLv||1)+' / '+SRPG_SKLV_MAX+'　<small>いりょく+'+((Math.min(SRPG_SKLV_MAX,base.skLv||1)-1)*10)+'%</small></div>'
      + '<small class="srpg-fuse-n">ダブり '+dupes.length+'体</small></div>'
      + '<div class="srpg-fuse-acts">'+evoBtn+skBtn+'</div>'
      + '</div>';
  });
  if(!rows) rows = '<div class="srpg-tm-empty">おなじ種類の なかまが 2体いると 育成できるよ。<br>🔮スカウトや バトルで ダブりを あつめよう！</div>';
  document.getElementById('srpg-body').innerHTML =
    '<div class="srpg-fuse">'
    + '<div class="srpg-select-lead">🌟 なかまの育成<br><small>おなじ種類の ダブりを つかって、<b>✨進化</b>でランクUP（つよさ大アップ・Lv上限も上がる）／<b>⚗️とくぎ強化</b>でとくぎLv UP！</small></div>'
    + '<div class="srpg-fuse-top"><span>🐾 なかま '+Object.keys(ai.roster).length+' / '+AIBOU_ROSTER_MAX+'</span><span>🪙 <b>'+coin+'</b></span><button class="srpg-mini2" onclick="srpgCleanupDo()">🧹 おかたづけ</button></div>'
    + rows
    + '<button class="srpg-mini" onclick="srpgTeamScreen()">← 編成へもどる</button></div>';
  try{ _char3dHydrateSafe(document.getElementById('srpg-body')); }catch(e){}
}
// ✨進化：ベースのランクを1つ上げる。素材は弱いダブりから必要数＋コインを消費。
function srpgEvolveDo(baseId){
  try{ sfx('click'); }catch(e){}
  var s, ai; try{ s = rpgState(); ai = rpgAibouState(s); }catch(e){ return; }
  var cos; try{ cos = rpgCosState(s); }catch(e){ return; }
  var base = ai.roster[baseId]; if(!base){ return; }
  var party = srpgProtectedIds(ai);
  var dupes = Object.keys(ai.roster).map(function(id){ return ai.roster[id]; })
    .filter(function(m){ return m && m.art === base.art && m.id !== base.id && party.indexOf(m.id) < 0; })
    .sort(_srpgDupeSort);   // 弱い順＝弱いダブりから消費
  var can = srpgEvolveCanDo(base, dupes.length, cos.coin || 0);
  if(!can.ok){
    var msg = can.reason==='coin' ? 'コインが たりないよ（'+(can.cost?can.cost.coins:'?')+'ひつよう）'
      : can.reason==='max' ? 'もう これいじょう 進化できないよ（ランクMAX）'
      : 'ダブりが たりないよ（'+(can.cost?can.cost.dupes:'?')+'体ひつよう）';
    try{ sfx('wrong'); showToast('✨','進化できないよ',msg); }catch(e){} return;
  }
  var cost = can.cost;
  var mats = dupes.slice(0, cost.dupes);
  if(!confirm('✨ 進化（ランクアップ）\n\n「'+(base.name||'なかま')+'」を '+(base.rank||'F')+' → '+cost.next+' に します。\n\nつかうもの：おなじ種の ダブり '+cost.dupes+'体 ＋ 🪙'+cost.coins+'\n（素材の なかまは いなくなります。育てた子・パーティは のこります）\n\nよろしいですか？')) return;
  cos.coin = (cos.coin||0) - cost.coins;
  base.rank = cost.next;
  if(!ai.gone) ai.gone = {};
  mats.forEach(function(m){ ai.gone[m.id] = 1; delete ai.roster[m.id]; });   // 墓標＝同期しても復活しない
  rpgSave(s);
  try{ sfx('levelup'); }catch(e){ try{ sfx('coin'); }catch(e2){} }
  try{ srpgEvolveFx(base, cost.next); }catch(e){}
  try{ showToast('✨','しんか！ '+(base.name||'なかま')+' が '+cost.next+' に！','つよさが 大アップ！ レベル上限も 上がったよ'); }catch(e){}
  try{ if(typeof updateResBar==='function') updateResBar(); }catch(e){}
  srpgSkillUpScreen();
}
// 進化の演出（画面フラッシュ＋ランク帯の表示）
function srpgEvolveFx(base, rank){
  try{
    var host = document.getElementById('srpg-body'); if(!host) return;
    var o = document.createElement('div'); o.className = 'srpg-evo-flash';
    o.innerHTML = '<div class="srpg-evo-burst">✨</div><div class="srpg-evo-rank r-'+rank+'">'+rank+'</div><div class="srpg-evo-word">しんか！</div>';
    host.appendChild(o);
    setTimeout(function(){ try{ host.removeChild(o); }catch(e){} }, 1600);
  }catch(e){}
}
// 🧹おかたづけ：各種類（art）で いちばん強い1体を残し、パーティ外のダブりを一括でエサに
function srpgCleanupDo(){
  try{ sfx('click'); }catch(e){}
  var s, ai; try{ s = rpgState(); ai = rpgAibouState(s); }catch(e){ return; }
  var party = srpgProtectedIds(ai);
  var RANKS = ['F','E','D','C','B','A','S','SS','SSS','LG'];
  var score = function(a){ return RANKS.indexOf(a.rank||'F')*10000 + (a.lv||1)*10 + (a.skLv||1); };
  var byArt = {};
  Object.keys(ai.roster).forEach(function(id){ var a=ai.roster[id]; if(a) (byArt[a.art]=byArt[a.art]||[]).push(a); });
  var mats = [];
  Object.keys(byArt).forEach(function(art){
    var g = byArt[art]; if(g.length < 2) return;
    g.sort(function(a,b){ return score(b)-score(a); });
    g.slice(1).forEach(function(m){ if(party.indexOf(m.id) < 0) mats.push(m); });   // 最強1体とパーティは残す
  });
  if(!mats.length){ try{ showToast('🧹','ダブりは ないよ','どの種類も 1体ずつ＝ぴかぴかだね！'); }catch(e){} return; }
  var food = mats.length * 2;
  if(!confirm('🧹 おかたづけ\n\nダブり '+mats.length+'体を エサ '+food+'こ に かえます。\n（各種類で いちばん強い子と パーティは のこります）\n※とくぎ強化に つかいたい ダブりがあるなら、先に ⚗️強化してね。よろしいですか？')) return;
  if(!ai.gone) ai.gone = {};
  mats.forEach(function(m){ ai.gone[m.id] = 1; delete ai.roster[m.id]; });
  ai.food = (ai.food||0) + food;
  rpgSave(s);
  try{ sfx('coin'); showToast('🧹','おかたづけ かんりょう！','ダブり'+mats.length+'体 → 🍖エサ+'+food+'（のこり '+Object.keys(ai.roster).length+'体）'); }catch(e){}
  srpgSkillUpScreen();
}
function srpgSkillUpDo(baseId, matId){
  try{ sfx('click'); }catch(e){}
  var s, ai; try{ s = rpgState(); ai = rpgAibouState(s); }catch(e){ return; }
  var base = ai.roster[baseId], mat = ai.roster[matId];
  if(!srpgSkillUpCanFuse(base, mat, srpgProtectedIds(ai))){ try{ showToast('⚠️','強化できないよ',''); }catch(e){} return; }
  if(!confirm('⚗️ とくぎ強化\n\n「'+(mat.name||'なかま')+'（'+(mat.rank||'F')+'）」を 素材にして、\n「'+(base.name||'なかま')+'」の とくぎLvを '+((base.skLv||1)+1)+' に上げます。\n素材の なかまは いなくなります。よろしいですか？')) return;
  base.skLv = Math.min(SRPG_SKLV_MAX, (base.skLv||1) + 1);
  if(!ai.gone) ai.gone = {};
  ai.gone[matId] = 1; delete ai.roster[matId];   // 墓標＝同期しても復活しない（既存の合成と同じ仕組み）
  rpgSave(s);
  try{ sfx('fanfare'); vibe([20,40,20]); if(typeof confetti==='function') confetti(); }catch(e){}
  try{ showToast('⚗️','とくぎ強化 せいこう！','「'+(base.name||'なかま')+'」の とくぎLvが '+base.skLv+' になった！'); }catch(e){}
  srpgSay('とくぎが つよくなった！');
  srpgSkillUpScreen();
}

// ================= ユニット詳細パネル（能力・とくぎ・耐性表） =================
function srpgShowUnitInfo(unitId){
  var u = srpgUnitById(unitId); if(!u) return;
  try{ sfx('click'); }catch(e){}
  var ov = document.getElementById('srpg-ask'); if(!ov) return;
  var art = srpgUnitArt(u);
  // 耐性表（敵のみ・弱点えらびの作戦板になる）
  var resistRow = '';
  if(u.side === 'enemy'){
    resistRow = '<div class="srpg-ui-sec">こうかの ひょう</div><div class="srpg-ui-resists">'
      + SRPG_SUBJECT_KEYS.map(function(k){
          var m = srpgSubjectMeta(k), kind = srpgResistKind(k, u);
          var T = { weak:'◎ つよめ', normal:'○ ふつう', half:'△ よわめ', 'null':'✕ むこう', drain:'⚠ きゅうしゅう' };
          return '<div class="srpg-ui-res '+kind+'"><span>'+m.em+'</span>'+ (T[kind]||T.normal) +'</div>';
        }).join('') + '</div>';
  }
  var skills = (u.skills || []).map(function(id){
    var s = srpgSkill(id); if(!s) return '';
    return '<div class="srpg-ui-skill"><b>'+escapeHtml(s.name)+'</b> <small>MP'+s.mp+'</small><br><span>'+escapeHtml(s.desc||'')+'</span></div>';
  }).join('') || '<div class="srpg-ui-skill"><span>とくぎ なし</span></div>';
  var md = u.mods || {};
  var stat = function(lab, v, m){ return '<div class="srpg-ui-stat"><small>'+lab+'</small><b>'+v+(m>0?' <i class="up">▲</i>':(m<0?' <i class="dn">▼</i>':''))+'</b></div>'; };
  ov.innerHTML = '<div class="srpg-ui-card">'
    + '<div class="srpg-ui-head"><div class="srpg-ui-art">'+art+'</div>'
    + '<div class="srpg-ui-meta"><div class="srpg-ui-nm">'+(u.isLeader?'👑 ':'')+escapeHtml(u.name)+'</div>'
    + '<div class="srpg-ui-role">'+u.roleEm+' '+escapeHtml(u.roleName||'')+' ・ Lv'+(u.lvl||1)+'</div>'
    + '<div class="srpg-ui-hp">HP '+u.hp+'/'+u.maxHp+(u.side==='ally'?(' ・ MP '+(u.mp||0)+'/'+(u.mpMax||6)):'')+'</div></div></div>'
    + '<div class="srpg-ui-stats">'
    + stat('こうげき', srpgEffStat(u,'atk'), md.atk||0)
    + stat('まもり', srpgEffStat(u,'def'), md.def||0)
    + stat('すばやさ', srpgEffStat(u,'spd'), md.spd||0)
    + stat('いどう', u.mov||0, 0) + stat('しゃてい', u.rng||1, 0)
    + '</div>'
    + resistRow
    + '<div class="srpg-ui-sec">とくぎ</div>' + skills
    + '<button class="rpg-btn ghost srpg-ui-close" onclick="srpgCloseUnitInfo()">とじる</button>'
    + '</div>';
  ov.style.display = 'flex';
  try{ _char3dHydrateSafe(ov); }catch(e){}
}
function srpgCloseUnitInfo(){
  var ov = document.getElementById('srpg-ask'); if(ov){ ov.style.display='none'; ov.innerHTML=''; }
  try{ sfx('click'); }catch(e){}
}

// ================= 小物：ダメージ表示・演出・トースト =================
// ★重要：これらは必ず srpgRender() の「あと」に呼ぶ（renderがタイルを作り直すと演出が消えるため）
function srpgPopupAt(x, y, text, cls){
  var tile = document.getElementById('st-'+x+'-'+y); if(!tile) return;
  var pop = document.createElement('div');
  pop.className = 'srpg-pop ' + (cls||'dmg');
  pop.textContent = text;
  tile.appendChild(pop);
  setTimeout(function(){ try{ tile.removeChild(pop); }catch(e){} }, 1100);
}
// タイルに一時オーバーレイ（斬撃・爆発・きらめき等）を重ねる
function srpgFxOverlay(x, y, cls, html, ms){
  var tile = document.getElementById('st-'+x+'-'+y); if(!tile) return;
  var d = document.createElement('div');
  d.className = 'srpg-ov ' + cls;
  if(html) d.innerHTML = html;
  tile.appendChild(d);
  setTimeout(function(){ try{ tile.removeChild(d); }catch(e){} }, ms || 640);
}
// 属性色の斬撃/魔法エフェクト
function srpgSlashAt(x, y, subject, big){
  var col = (srpgSubjectMeta(subject) || {}).color || '#fff';
  srpgFxOverlay(x, y, 'fx-slash' + (big ? ' big' : ''), '<span class="fx-slash-l" style="--c:'+col+'"></span>', 560);
}
function srpgPoof(x, y){ srpgFxOverlay(x, y, 'fx-poof', '💥', 720); }
// ユニットのスプライトに一時クラス（被弾フラッシュ・攻撃の気合い・回復の光）
function srpgFlashSprite(id, cls){
  var el = document.getElementById('su-'+id); if(!el) return;
  var s = el.querySelector('.srpg-sprite'); if(!s) return;
  s.classList.add('fx-'+cls);
  setTimeout(function(){ try{ s.classList.remove('fx-'+cls); }catch(e){} }, 500);
}
function srpgShakeTile(x, y){
  var tile = document.getElementById('st-'+x+'-'+y); if(!tile) return;
  tile.classList.add('shake');
  setTimeout(function(){ try{ tile.classList.remove('shake'); }catch(e){} }, 340);
}
// こうげき側の気合いモーション
function srpgAtkAnim(actor){ if(actor) srpgFlashSprite(actor.id, 'atk'); }
// ⚔️反撃：隣接の単体こうげきを受けて生き残ったら 殴り返す（威力60%・出題なし）
function srpgTryCounter(defender, attacker, after){
  if(!srpgCanCounter(defender, attacker)){ after(); return; }
  setTimeout(function(){
    var dmg = srpgDamage(defender, attacker, 60, 1, false);
    attacker.hp = Math.max(0, attacker.hp - dmg);
    var died = attacker.hp <= 0; if(died) attacker.downed = true;
    srpgRender();
    srpgLunge(defender, attacker.x, attacker.y);
    srpgFlashSprite(attacker.id, 'hit'); srpgShakeTile(attacker.x, attacker.y);
    srpgPopupAt(attacker.x, attacker.y, '⚔️はんげき! '+dmg, defender.side === 'ally' ? 'dmg' : 'dmg-e');
    if(died){ srpgPoof(attacker.x, attacker.y); srpgPopupAt(attacker.x, attacker.y, defender.side === 'ally' ? 'たおした！' : 'たおれた…', 'down'); }
    try{ sfx('wrong'); vibe(15); }catch(e){}
    setTimeout(after, _sd(620));
  }, _sd(480));
}
// ===== 音声（タクトにもキャラの声を）＝speak()があれば読み上げ（設定・フォールバックはspeak側が処理） =====
function srpgSay(t){ try{ if(typeof speak==='function' && t) speak(t); }catch(e){} }
// ===== 移動アニメ（FLIP）：グリッド面の座標系でスライドさせる =====
// 盤はrotateX(52deg)で傾いているため画面座標のFLIPは歪む。ユニットの transform の
// 「先頭」にグリッド面での平行移動を足す（1マス＝タイル幅+gap）と正しく滑る。
var _srpgRM = false; try{ _srpgRM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }catch(e){}
var _SRPG_UNIT_BASE = 'translateX(-50%) rotateX(-52deg)';
function _srpgStep(){
  var t = document.querySelector('#srpg-body .srpg-tile');
  return (t ? t.offsetWidth : 46) + 3;   // タイル幅＋グリッドgap(3px)
}
// 描画後に「元のマスの位置から」現在のマスへ滑らせる（テレポート感の根治）
function srpgSlideUnit(unitId, fromX, fromY){
  if(_srpgRM) return;
  var u = srpgUnitById(unitId); if(!u) return;
  var el = document.getElementById('su-'+unitId); if(!el) return;
  var step = _srpgStep();
  var dx = (fromX - u.x) * step, dy = (fromY - u.y) * step;
  if(!dx && !dy) return;
  var dist = Math.abs(fromX - u.x) + Math.abs(fromY - u.y);
  var dur = Math.min(0.5, 0.13 * dist + 0.08);
  el.style.transition = 'none';
  el.style.transform = 'translate('+dx+'px,'+dy+'px) ' + _SRPG_UNIT_BASE;
  void el.offsetWidth;   // reflowでスタート位置を確定
  el.style.transition = 'transform '+dur+'s cubic-bezier(.3,.9,.4,1)';
  el.style.transform = _SRPG_UNIT_BASE;
  setTimeout(function(){ try{ el.style.transition=''; el.style.transform=''; }catch(e){} }, dur*1000 + 60);
}
// 攻撃の踏み込み：標的の方向へ4割ふみこんで、ばねで戻る
function srpgLunge(unit, tx, ty){
  if(_srpgRM || !unit) return;
  var el = document.getElementById('su-'+unit.id); if(!el) return;
  var step = _srpgStep();
  var ddx = tx - unit.x, ddy = ty - unit.y, d = Math.max(1, Math.abs(ddx) + Math.abs(ddy));
  var lx = ddx / d * step * 0.4, ly = ddy / d * step * 0.4;
  if(!lx && !ly) return;
  el.style.transition = 'transform .13s ease-out';
  el.style.transform = 'translate('+lx+'px,'+ly+'px) ' + _SRPG_UNIT_BASE;
  setTimeout(function(){
    el.style.transition = 'transform .24s cubic-bezier(.2,1.5,.4,1)';
    el.style.transform = _SRPG_UNIT_BASE;
    setTimeout(function(){ try{ el.style.transition=''; el.style.transform=''; }catch(e){} }, 280);
  }, 140);
}
// 必殺技カットイン（オリジナルキャラの大アート＋技名＋属性色フルスクリーン）→onDoneで発動
function srpgCutin(unit, name, subjectKey, onDone){
  var sc = document.getElementById('srpg-screen');
  if(!sc || !unit){ if(onDone) onDone(); return; }
  var col = subjectKey ? ((srpgSubjectMeta(subjectKey) || {}).color || '#fbbf24') : (unit.side === 'enemy' ? '#ef4444' : '#fbbf24');
  var el = document.createElement('div');
  el.className = 'srpg-cutin ' + (unit.side === 'enemy' ? 'enemy' : 'ally');
  el.innerHTML = '<div class="srpg-cutin-band" style="--c:'+col+'"></div>'
    + '<div class="srpg-cutin-lines"></div>'
    + '<div class="srpg-cutin-art">'+srpgUnitArt(unit)+'</div>'
    + '<div class="srpg-cutin-name" style="--c:'+col+'">'+escapeHtml(name || 'とくぎ')+'</div>';
  sc.appendChild(el);
  try{ sfx(unit.side === 'enemy' ? 'wrong' : 'levelup'); vibe(20); }catch(e){}
  if(unit.side !== 'enemy') srpgSay(name);   // 味方の技名をキャラの声で叫ぶ（必殺技ボイス）
  setTimeout(function(){ try{ sc.removeChild(el); }catch(e){} if(onDone) onDone(); }, _sd(820));
}
// バトル開始のVSカットイン（味方リーダー vs 敵ボス）
function srpgVsIntro(a, b, onDone){
  var sc = document.getElementById('srpg-screen');
  if(!sc){ if(onDone) onDone(); return; }
  var el = document.createElement('div'); el.className = 'srpg-vs';
  el.innerHTML = '<div class="srpg-vs-side l"><div class="srpg-vs-art">'+(a ? srpgUnitArt(a) : '')+'</div><div class="srpg-vs-nm">'+escapeHtml(a ? a.name : 'みかた')+'</div></div>'
    + '<div class="srpg-vs-mid">VS</div>'
    + '<div class="srpg-vs-side r"><div class="srpg-vs-art">'+(b ? srpgUnitArt(b) : '')+'</div><div class="srpg-vs-nm">'+escapeHtml(b ? b.name : 'てき')+'</div></div>';
  sc.appendChild(el);
  try{ sfx('levelup'); }catch(e){}
  srpgSay('たたかいの はじまりだ！');
  setTimeout(function(){ try{ sc.removeChild(el); }catch(e){} if(onDone) onDone(); }, _sd(1150));
}
// ③ スカウトした仲間の登場演出（大アートが回転しながら光の中に登場）
// 予兆：高レア個体の直前に流れる「…なにかが ちかづいてくる…」の暗黒のため
function srpgScoutOmen(rank, cb){
  var sc = document.getElementById('srpg-screen');
  if(!sc){ cb(); return; }
  var col = SRPG_TIER_COLOR[_scoutTier(rank||'SS')] || '#fde047';
  var el = document.createElement('div'); el.className = 'sc-omen';
  el.style.setProperty('--rc', col);
  el.innerHTML = '<div class="sc-omen-heart"></div><div class="sc-omen-tx">…なにかが ちかづいてくる…</div>';
  var done = false, t1, t2;
  var go = function(){ if(done) return; done = true; clearTimeout(t1); clearTimeout(t2); try{ sc.removeChild(el); }catch(e){} cb(); };
  el.onclick = go;
  sc.appendChild(el);
  try{ sfx('drumroll'); vibe([10,120,10,120,10]); }catch(e){}
  t1 = setTimeout(function(){ try{ el.classList.add('near'); sfx('powerup'); }catch(e){} }, 1200);   // 光がランク色に染まり脈が速くなる
  t2 = setTimeout(go, 2500);
}
function srpgScoutReveal(mon, onDone){
  var sc = document.getElementById('srpg-screen');
  if(!sc || !mon){ if(onDone) onDone(); return; }
  var art = ((typeof srpgMonArt==='function' && srpgMonArt(mon.art)) || (typeof _monStill==='function' && _monStill(mon.art)) || '👾');
  var HIGH = { SS:1, SSS:1, LG:1 };
  var isHigh = !!HIGH[mon.rank];
  var col = SRPG_TIER_COLOR[_scoutTier(mon.rank||'F')] || '#a78bfa';
  var fxRank = { low:'R', A:'SR', S:'SSR', SS:'UR', SSS:'LR', LG:'LR' }[_scoutTier(mon.rank||'F')] || 'R';
  var bg = document.createElement('div'); bg.className = 'srpg-scout-bg';   // 暗幕（パーティクルより下）
  function fxCv(z){ try{ var cv=document.getElementById('gacha-fx-canvas'); if(cv) cv.style.zIndex=z; }catch(e){} }
  var el = document.createElement('div'); el.className = 'srpg-scout' + (isHigh ? ' high' : '');
  el.style.setProperty('--rc', col);
  el.innerHTML = (isHigh ? '<div class="srpg-scout-aura"></div>' : '')
    + '<div class="srpg-scout-rays"></div><div class="srpg-scout-rays r2"></div>'
    + '<div class="srpg-scout-ring"></div>'
    + '<div class="srpg-scout-shock"></div>'
    + '<div class="srpg-scout-art silhou drop">'+art+'</div>'
    + (mon.rank?'<div class="srpg-scout-stamp rk-'+mon.rank+'">'+mon.rank+'</div>':'')
    + '<div class="srpg-scout-cap">🎉 なかまが あらわれた！</div>'
    + '<div class="srpg-scout-nm">'+escapeHtml(mon.name)+' <span>'+escapeHtml(mon.rank||'')+'</span></div>'
    + '<div class="srpg-scout-tap">'+(isHigh?'タップして むかえいれる ▶':'タップして つづける ▶')+'</div>';
  var done = false, finalDone = false, timers = [];
  function T(fn, ms){ timers.push(setTimeout(fn, ms)); }
  var fin = function(){ if(done) return; done = true; timers.forEach(clearTimeout); try{ sc.removeChild(el); }catch(e){} try{ sc.removeChild(bg); }catch(e){} fxCv(10000); if(onDone) onDone(); };
  // 段階：①環の収縮チャージ→②シルエット降臨（衝撃波）→③静止のため→④開眼＋爆発→⑤打刻＋名前
  var landed = function(){
    try{ el.classList.add('landed'); var sh=el.querySelector('.srpg-scout-shock'); if(sh) sh.classList.add('go'); sfx('reveal'); vibe([20,40,20]); }catch(e){}
  };
  var finale = function(){
    if(finalDone) return; finalDone = true;
    try{
      el.classList.remove('holdstill'); el.classList.add('landed','opened');
      var a=el.querySelector('.srpg-scout-art'); if(a){ a.classList.remove('silhou'); }
      var st=el.querySelector('.srpg-scout-stamp'); if(st) st.classList.add('go');
      sfx(isHigh ? 'legendary' : 'fanfare'); vibe([30,60,30,60,100]);
      if(window.gachaFx){ gachaFx.burst(fxRank); if(isHigh && gachaFx.rain) gachaFx.rain(fxRank); }
      fxCv(1660);   // 念のため再適用：粒子キャンバスをモンスターの下(1660<1700)に保ち、雨で隠れないようにする
      // 豪華演出：高レアは紙吹雪と星の雨を追い波で重ねる（伝説LGは最も長く華やかに）
      if(typeof confetti==='function'){ confetti(); setTimeout(confetti, 260); if(isHigh){ setTimeout(confetti, 560); setTimeout(confetti, 900); } }
      var _lg = (mon.rank==='LG' || mon.rank==='SSS');
      if(_lg){
        try{ if(window.gachaFx){ setTimeout(function(){ try{ gachaFx.burst(fxRank); if(gachaFx.rain) gachaFx.rain(fxRank); fxCv(1660); }catch(e){} }, 620); } }catch(e){}
        if(typeof confetti==='function'){ setTimeout(confetti, 1300); setTimeout(confetti, 1700); }
        try{ document.body.classList.add('srpg-flash'); setTimeout(function(){ document.body.classList.remove('srpg-flash'); }, 320); }catch(e){}
      }
    }catch(e){}
    srpgSay('やったね！ '+(mon.name||'なかま')+'が、なかまに なったよ！');
    if(!isHigh) T(fin, 2000);   // 低中レアは自動で次へ／SS以上は タップまで止まる（一度ストップ）
  };
  el.onclick = function(){ if(!finalDone){ timers.forEach(clearTimeout); timers=[]; landed(); finale(); } else fin(); };
  sc.appendChild(bg); sc.appendChild(el);
  try{ sfx('charge'); if(window.gachaFx) gachaFx.charge(fxRank); }catch(e){}
  fxCv(1660);   // charge がキャンバスを生成した後に z を下げる：暗幕1600 < パーティクル1660 < モンスター1700（雨がモンスターを隠さない）
  var t1 = isHigh ? 1100 : 500;                 // 高レアは「ため」を約3倍に
  T(function(){ landed(); }, t1);               // 降臨（ドスン＋着地衝撃波＋画面ゆれ）
  T(function(){ try{ el.classList.add('holdstill'); }catch(e){} }, t1 + 700);   // 静止のため（無音の一瞬）
  T(finale, isHigh ? t1 + 1500 : t1 + 800);     // 開眼＋爆発＋打刻
}
// ④ とくぎごとの固有エフェクト（形・状態異常で見た目を変える）
function srpgSkillFx(sk, subj, cells, cx, cy){
  var col = subj ? ((srpgSubjectMeta(subj) || {}).color || '#f87171') : '#f87171';
  var shape = sk ? sk.shape : 'single';
  if(shape === 'burst'){
    srpgFxOverlay(cx, cy, 'fx-burst', '<span class="fx-burst-ring" style="--c:'+col+'"></span><span class="fx-burst-core" style="--c:'+col+'"></span>', 720);
    cells.forEach(function(c){ srpgFxOverlay(c.x, c.y, 'fx-spark', '', 560); });
  } else if(shape === 'line3'){
    cells.forEach(function(c){ srpgFxOverlay(c.x, c.y, 'fx-beam', '<span class="fx-beam-l" style="--c:'+col+'"></span>', 520); });
  } else if(shape === 'cross'){
    cells.forEach(function(c){ srpgSlashAt(c.x, c.y, subj, false); });
  } else {
    srpgSlashAt(cx, cy, subj, false);
  }
  // 状態異常つきは色つきのしるしを重ねる
  if(sk && sk.inflict){
    var K = sk.inflict.kind;
    var ov = K==='poison' ? { c:'fx-poison', e:'☠️' } : K==='paralyze' ? { c:'fx-zap', e:'⚡' }
      : K==='sleep' ? { c:'fx-sleep', e:'💤' } : K==='seal' ? { c:'fx-seal', e:'🚫' } : null;
    if(ov) cells.forEach(function(c){ srpgFxOverlay(c.x, c.y, ov.c, ov.e, 720); });
  }
}
function srpgToast(t, s){
  try{ if(typeof showToast==='function'){ showToast('', t, s||''); return; } }catch(e){}
}
