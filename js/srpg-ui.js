/* srpg-ui.js：マス目タクティクス戦闘のUI・操作・出題ゲート（DOMあり）。
   エンジン（js/srpg.js の純粋関数）を呼び、#srpg-screen を描画する。
   ドラクエタクト風：クォータービューの盤（rotateXで傾ける）＋立ち絵（逆回転で立たせる）。

   操作フロー（学習アプリの肝：攻撃は必ず「教科をえらんで1問正解」で発動）:
     自分のターン → [移動(自由)] → [こうげき/とくぎ] → 標的をタップ → 教科をえらぶ → 出題
       → 正解＝発動（弱点教科なら つよめ×1.5）／不正解＝ミス → ターン終了 */

var srpgB = null;   // 現在の戦闘状態（null＝非戦闘）
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
  var base = (typeof AIBOU_RANK_BASE!=='undefined' && AIBOU_RANK_BASE[a.rank||'C']) || 6;
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
  h += '<div class="srpg-tm-count">出撃：'+(1+srpgTeamSel.ids.length)+' / 5（勇者＋あいぼう最大4）</div>';
  h += '<div class="srpg-tm-grid">';
  h += card(hero, true, false);
  list.forEach(function(a){ h += card(srpgAibouSpec(a), srpgTeamSel.ids.indexOf(a.id) >= 0, true); });
  if(!list.length) h += '<div class="srpg-tm-empty">まだ あいぼうが いないよ。<br>「🗡️ぼうけん」で バトルに かつと なかまが ふえる！</div>';
  h += '</div>';
  h += '<div class="srpg-team-row"><button class="rpg-btn srpg-team-go" onclick="srpgTeamConfirm()">この編成で 出撃！ →</button>'
     + '<button class="rpg-btn ghost srpg-team-auto" onclick="srpgTeamAuto()">✨おまかせ</button></div>';
  h += '<div class="srpg-team-row"><button class="rpg-btn ghost srpg-team-scout" onclick="srpgScoutScreen()">🔮 スカウト</button>'
     + '<button class="rpg-btn ghost srpg-team-fuse" onclick="srpgSkillUpScreen()">⚗️ とくぎ強化</button></div>';
  h += '</div>';
  document.getElementById('srpg-body').innerHTML = h;
  try{ _char3dHydrateSafe(document.getElementById('srpg-body')); }catch(e){}
}
function srpgTeamToggle(id){
  try{ sfx('click'); }catch(e){}
  var i = srpgTeamSel.ids.indexOf(id);
  if(i >= 0){ srpgTeamSel.ids.splice(i, 1); if(srpgTeamSel.leader === id) srpgTeamSel.leader = 'hero'; }
  else { if(srpgTeamSel.ids.length >= 4){ try{ showToast('⚠️','これ以上 えらべないよ','あいぼうは 4体まで（勇者と合わせて5体）'); }catch(e){} return; } srpgTeamSel.ids.push(id); }
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
function srpgOpen(){
  try{ hideMainScreens(); }catch(e){}
  try{ hideTabbar(); }catch(e){}
  var sc = document.getElementById('srpg-screen'); if(!sc) return;
  sc.style.display = 'block';
  srpgTeamSel = null;
  srpgTeamScreen();
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
  return '<button class="srpg-stage-card'+(locked?' locked':'')+(done?' done':'')+(st.type==='quest'?' quest':'')+'" '+(locked?'disabled':'onclick="srpgStart(\''+id+'\')"')+'>'
    + '<div class="srpg-sc-head"><b>'+cont.emoji+' '+escapeHtml(st.name)+'</b>'+(done?('<span class="srpg-sc-stars">'+[1,2,3].map(function(i){return i<=stStars?'★':'☆';}).join('')+'</span>'):'')+(locked?'<span class="srpg-sc-lock">🔒</span>':'')+'</div>'
    + '<div class="srpg-sc-mons">'+faces+'</div>'
    + '<div class="srpg-sc-foot">'+foot+'</div>'
    + '</button>';
}
function srpgStageSelect(){
  srpgB = null;
  var cleared = srpgClearedSet();
  var quests = Object.keys(SRPG_STAGES).filter(function(id){ return SRPG_STAGES[id].type === 'quest'; });
  var trains = Object.keys(SRPG_STAGES).filter(function(id){ return SRPG_STAGES[id].type !== 'quest'; });
  var questCards = quests.map(function(id, i){
    var locked = i > 0 && !cleared[quests[i-1]];
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
    + '</button>';
  document.getElementById('srpg-body').innerHTML =
    '<div class="srpg-select">'
    + '<div class="srpg-select-top"><button class="srpg-mini2" onclick="srpgTeamScreen()">🛡️ 編成を かえる</button></div>'
    + '<div class="srpg-sec">🌀 まいにち <small>周回で きたえよう</small></div>'
    + '<div class="srpg-stage-list">'+loopCards+'</div>'
    + '<div class="srpg-sec">🗺️ 大陸クエスト <small>各大陸の 主を たおそう</small></div>'
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
  'タクトバトルへ ようこそ！ マスの上で たたかう さくせんバトルだよ。',
  'じぶんの ばんが きたら、まず 👣いどう で 青いマスへ うごこう。',
  'つぎに ⚔️こうげき！ 教科を えらんで、もんだいに 正解すると こうげきできるよ。',
  '敵には ⭐弱点の教科が あるよ。弱点を つくと 大ダメージ！',
  'MPが たまったら 🌟とくぎ！ それじゃあ、はじめよう！'
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
function srpgTowerStart(){ _towerFloor = 1; _towerCarry = null; srpgStart('tower'); }
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
  var stage = (stageId==='daily') ? srpgDailyStage(_srpgToday())
            : (stageId==='tower') ? srpgTowerStage(_towerFloor)
            : srpgStage(stageId);
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
  srpgB = {
    stageId: stageId, stage: stage, grid: srpgGridWithBlocks(stage), units: units,
    round: 1, order: [], turnPtr: -1, acted: {}, actorId: null,
    phase: 'idle', moved: false, chosenSkill: null, targetTile: null,
    hiMove: {}, hiTarget: {}, hiAoe: {}, combo: 0, over: false, busy: false,
    zoneSet: {}, deploySel: null
  };
  document.getElementById('srpg-title').textContent = stage.name;
  try{ if(typeof bgmPlay==='function') bgmPlay((stage.type==='quest' && stage.boss) ? 'boss' : 'battle'); }catch(e){}
  srpgApplyRescue();   // まけつづけたステージは おうえんバフ付きで再挑戦
  // 初回だけ：あそびかたのチュートリアル（タップ送り・読み上げつき）→ そのままステージの物語へ
  var lines = (stage.story && stage.story.length) ? stage.story.slice() : [];
  if(!_srpgFlag('srpg_tut')){ _srpgSetFlag('srpg_tut'); lines = SRPG_TUT_LINES.concat(lines); }
  if(lines.length){ srpgRender(); srpgStoryIntro(lines, srpgDeployBegin); }
  else { srpgDeployBegin(); }
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
function srpgBattleBegin(){
  try{ sfx('click'); }catch(e){}
  srpgB.phase = 'idle'; srpgB.deploySel = null; srpgB.zoneSet = {}; srpgB._rendered = false;
  srpgB.order = srpgTurnOrder(srpgB.units); srpgB.turnPtr = -1;
  srpgRender();
  var lead = srpgB.units.filter(function(u){ return u.side==='ally' && u.isLeader; })[0] || srpgB.units.filter(function(u){ return u.side==='ally'; })[0];
  var enemies = srpgB.units.filter(function(u){ return u.side==='enemy'; });
  var boss = enemies.filter(function(u){ var k=srpgEnemyKey(u); return k && SRPG_ENEMY_TEMPLATES[k] && SRPG_ENEMY_TEMPLATES[k].boss; })[0] || enemies[enemies.length-1];
  srpgVsIntro(lead, boss, function(){
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
  for(var y=0; y<g.h; y++) for(var x=0; x<g.w; x++){
    var key = x+','+y;
    var cls = 'srpg-tile';
    if((x+y)%2===0) cls += ' alt';
    if(srpgB.hiMove[key]) cls += ' hi-move';
    if(srpgB.hiTarget[key]) cls += ' hi-target';
    if(srpgB.hiAoe[key]) cls += ' hi-aoe';
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
  var isBoss = u.side==='enemy'&&SRPG_ENEMY_TEMPLATES[srpgEnemyKey(u)]&&SRPG_ENEMY_TEMPLATES[srpgEnemyKey(u)].boss;
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
  // artからテンプレのキーを逆引き（弱点boss判定用）
  var keys = Object.keys(SRPG_ENEMY_TEMPLATES);
  for(var i=0;i<keys.length;i++){ if(SRPG_ENEMY_TEMPLATES[keys[i]].art===u.art) return keys[i]; }
  return null;
}
function srpgTurnbarHtml(){
  var order = srpgB.order && srpgB.order.length ? srpgB.order : srpgTurnOrder(srpgB.units);
  var alive = order.filter(function(u){ return u && !u.downed; });
  var actor = srpgActor();
  return '<span class="srpg-round">R'+(srpgB.round||1)+'</span><div class="srpg-tb-lbl">じゅんばん</div>' + alive.slice(0, 8).map(function(u){
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
      return '<button class="srpg-sub '+(CLS[kind]||'')+'" onclick="srpgPickSubject(\''+k+'\')">'
        + m.em+' '+m.label+(TAG[kind]||'')+fcTx+'</button>';
    }).join('');
    var isDebuff = srpgB.chosenSkill && (srpgSkill(srpgB.chosenSkill)||{}).kind==='debuff';
    return '<div class="srpg-cmd-head">'+(isDebuff?'どの教科で しかける？':'どの教科で こうげきする？')+'</div><div class="srpg-subs">'+subs+'</div>'
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
    + '<div class="srpg-cmd-row">'
    + '<button class="srpg-cmd-btn'+(srpgB.moved?' off':'')+'" '+(srpgB.moved?'disabled':'onclick="srpgCmdMove()"')+'>👣 いどう</button>'
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
      setTimeout(function(){ srpgEndActorTurn(); }, 820);
      return;
    }
    if(actor.side === 'enemy'){ srpgB.phase = 'enemy'; srpgRender(); setTimeout(function(){ srpgEnemyTurn(actor); }, 480); }
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
    setTimeout(proceed, 660);
  } else { proceed(); }
}
function srpgSelectActor(){
  srpgB.phase = 'select'; srpgB.chosenSkill = null; srpgB.targetTile = null;
  srpgClearHi();
  var actor = srpgActor();
  if(actor){ try{ document.querySelector('#st-'+actor.x+'-'+actor.y).scrollIntoView({block:'center'}); }catch(e){} }
  srpgRender();
  // 初めてのコマンド選択にだけ ヒントを1回出す
  if(!_srpgFlag('srpg_hint_sel')){ _srpgSetFlag('srpg_hint_sel');
    try{ showToast('💡','さいしょの いっぽ','👣いどう してから ⚔️こうげき すると つよいよ！'); }catch(e){} }
}
function srpgClearHi(){ if(srpgB){ srpgB.hiMove = {}; srpgB.hiTarget = {}; srpgB.hiAoe = {}; } }

// ---- コマンド ----
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
  // コマンド選択中に ほかのユニットをタップ → 詳細パネル（能力・とくぎ・耐性表）
  if(srpgB.phase==='select' || srpgB.phase==='enemy'){
    var uu = srpgUnitAt(srpgB.units, x, y);
    var act0 = srpgActor();
    if(uu && (!act0 || uu.id !== act0.id)){ srpgShowUnitInfo(uu.id); return; }
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
function srpgCancel(){ srpgSelectActor(); }

// ================= 出題ゲート =================
function srpgAsk(area){
  var q = null; try{ q = genQuestion(area); }catch(e){}
  if(!q || !q.q){ srpgResolveAttack(true); return; }   // 出題失敗時はサービスで命中
  srpgB._q = q; srpgB.busy = true;
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
  if(sk) actor.mp = Math.max(0, (actor.mp||0) - sk.mp);
  if(!correct){
    srpgB.combo = 0;
    srpgRender();
    srpgPopupAt(tgt.x, tgt.y, 'ミス！', 'miss');
    try{ sfx('wrong'); }catch(e){}
    srpgAfterResolve();
    return;
  }
  srpgB.combo++;
  var crit = srpgB.combo >= 3;
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
  srpgAfterResolve();
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
  var actor = srpgActor(); if(actor) srpgB.acted[actor.id] = 1;
  setTimeout(function(){
    srpgClearHi();
    var oc = srpgOutcome(srpgB.units);
    if(oc){ srpgEnd(oc); return; }
    srpgEndActorTurn();
  }, 780);
}
function srpgEndActorTurn(){
  var actor = srpgActor();
  if(actor){ actor.acted = true; }
  srpgClearHi();
  srpgNextTurn();
}

// ================= 敵のターン（自動） =================
function srpgEnemyTurn(enemy){
  if(!srpgB || srpgB.over) return;
  var act = srpgEnemyAction(enemy, srpgB.grid, srpgB.units);
  var _efx = enemy.x, _efy = enemy.y;
  enemy.x = act.moveTo.x; enemy.y = act.moveTo.y;
  srpgClearHi(); srpgRender();
  srpgSlideUnit(enemy.id, _efx, _efy);   // 敵もマス間をすべって移動
  if(act.kind === 'skill'){
    (act.aoe || []).forEach(function(c){ srpgB.hiTarget[c.x+','+c.y] = 1; });   // 範囲を赤く予告
    srpgRender();
    try{ if(typeof showToast==='function') showToast('⚠️', enemy.name+'の'+((srpgSkill(act.skillId)||{}).name||'とくぎ')+'！', 'はんい こうげきが くるぞ！'); }catch(e){}
    setTimeout(function(){ srpgEnemySkill(enemy, act); }, 950);
  } else if(act.kind === 'attack'){
    setTimeout(function(){ srpgEnemyAttack(enemy, act.targetId); }, 420);
  } else {
    setTimeout(function(){ var oc = srpgOutcome(srpgB.units); if(oc){ srpgEnd(oc); return; } srpgNextTurn(); }, 420);
  }
}
function srpgEnemyAfter(){
  setTimeout(function(){ var oc = srpgOutcome(srpgB.units); if(oc){ srpgEnd(oc); return; } srpgNextTurn(); }, 700);
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
  }
  srpgEnemyAfter();
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
  var win = outcome==='win';
  var coin = 30 + srpgB.stage.enemies.length * 15;
  var xp = 40 + srpgB.stage.enemies.length * 20;
  var extra = '', scout = null;
  var stype = srpgB.stage.type;
  var isLoop = (stype==='daily' || stype==='tower');
  if(!isLoop){ if(win){ srpgClearLoss(srpgB.stageId); } else { srpgNoteLoss(srpgB.stageId); } }   // 敗北救済（周回は対象外）
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
    // ごほうび：コインとXP（既存RPGの経済＝rpgState/cosに合流）
    try{ var s = rpgState(), cos = rpgCosState(s);
      cos.coin = (cos.coin||0) + coin;
      s.xp = (s.xp||0) + xp; s.level = rpgLevelForXp(s.xp);
      rpgSave(s);
    }catch(e){}
    // 収集連動：出撃した仲間が成長＋敵をスカウト
    var grew = srpgGrowUsedAibou(srpgB.units);
    grew.forEach(function(g){ extra += '<div class="srpg-res-line grow">🍖 '+escapeHtml(g.name)+' が Lv'+g.lv+' に せいちょう！</div>'; });
    scout = srpgScoutReward(srpgB.stage);
    if(scout && scout.mon){ extra += '<div class="srpg-res-line scout">🎉 '+escapeHtml(scout.mon.name)+'（'+scout.mon.rank+'）が なかまに なった！'+(scout.inParty?'（パーティ入り）':'')+'</div>'; }
    else if(scout && scout.full){ extra += '<div class="srpg-res-line">🐾 なかまが いっぱい…🍖エサ+10</div>'; }
    try{ updateResBar(); }catch(e){}
    try{ if(typeof bgmPlay==='function') bgmPlay('map'); }catch(e){}
  }
  // ★クリア星評価（★1=勝利 ★2=全員生存 ★3=規定ラウンド以内）
  var stars = 0;
  if(win){
    var downed = srpgB.units.filter(function(x){ return x.side==='ally' && x.downed; }).length;
    stars = srpgStars(true, downed, srpgB.round||1, srpgB.stage.par||6);
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
    + (win?'<button class="rpg-btn" onclick="srpgTeamScreen()">🛡️ 編成をかえる</button>':'')
    + '<button class="rpg-btn ghost" onclick="srpgStageSelect()">🗺️ ステージ選択</button>'
    + '</div></div>';
  body.insertAdjacentHTML('beforeend', '<div class="srpg-result-wrap">'+card+'</div>');
  try{ sfx(win?'levelup':'wrong'); }catch(e){}
  if(win){ try{ if(typeof confetti==='function') confetti(); }catch(e){} }
  // 勝敗の声（スカウト演出があるときは そちらの声を優先＝重ねない）
  var hasScout = win && scout && scout.mon;
  if(!hasScout) srpgSay(win ? 'しょうり！ みんな、よくがんばったね！' : 'まけちゃった…。でも だいじょうぶ、つぎは きっと かてるよ！');
  // ③ スカウトした仲間の「登場演出」（結果カードの上に出す）
  if(hasScout){ try{ srpgScoutReveal(scout.mon); }catch(e){} }
}
function srpgClose(){
  srpgB = null;
  var sc = document.getElementById('srpg-screen'); if(sc) sc.style.display='none';
  var bar = document.getElementById('mu-tabbar'); if(bar) bar.classList.remove('mu-hidden');
  try{ muNav('home'); }catch(e){ try{ renderGameHub(); }catch(e2){} }
}

// ================= スカウトガチャ（コインで仲間モンスターを引く） =================
function _scoutArts(rank){
  // 引けるアート：基本20種＋属性変種100種（petは除外・魔王はSSS/LGのときだけ）
  var arts = Object.keys(AIBOU_ART_SPECIES).filter(function(a){ return a!=='pet' && a!=='villain' && !/2$/.test(a); });
  arts = arts.concat(Object.keys(SRPG_MON_VARIANTS2));
  if(rank==='SSS' || rank==='LG') arts.push('villain');
  return arts;
}
function _scoutSp(art){ var v=SRPG_MON_VARIANTS2[art]; return AIBOU_ART_SPECIES[v?v.base:art] || 'beast'; }
function _srpgWeekKey(){ var d=new Date(); var onejan=new Date(d.getFullYear(),0,1); var wk=Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7); return d.getFullYear()+'-w'+wk; }
function srpgScoutFreeReady(){ try{ return safeLS.getItem('srpg_scout_free') !== _srpgToday(); }catch(e){ return false; } }
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
    } else {
      srpgScoutResults(got);
    }
  });
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
    + '<div class="srpg-select-lead">📖 なかま ずかん<br><small>これまでに 仲間にした モンスターの きろく</small></div>'
    + '<div class="srpg-dex-prog"><div class="srpg-pity-bar"><i style="width:'+prog.pct+'%"></i></div><b>'+prog.count+' / '+prog.total+'</b> しゅるい</div>'
    + rwMsg
    + '<div class="srpg-dex-rw">'+rwList+'</div>'
    + '<div class="srpg-dex-grid">'+cells+'</div>'
    + '<button class="srpg-mini" onclick="srpgScoutScreen()">← スカウトへもどる</button></div>';
  try{ _char3dHydrateSafe(document.getElementById('srpg-body')); }catch(e){}
}

// ===== 召喚シネマティック：暗転→多重魔法陣チャージ→ランク色予告→爆発→結果 =====
var SRPG_TIER_COLOR = { low:'#38bdf8', A:'#a78bfa', S:'#f472b6', SS:'#fde047', SSS:'#f87171' };
function _scoutTier(best){
  if(best==='LG') return 'SSS';   // LGは最上位演出（虹）
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
  var fxRank = { low:'R', A:'SR', S:'SSR', SS:'UR', SSS:'LR' }[tier] || 'R';
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
    try{ if(tier==='SS'||tier==='SSS'){ document.body.classList.add('srpg-flash'); setTimeout(function(){ document.body.classList.remove('srpg-flash'); }, 300); vibe([20,50,20]); } }catch(e){}
    try{ sfx(tier==='SSS' ? 'legendary' : (tier==='SS'||tier==='S') ? 'fanfare' : 'levelup'); }catch(e){}
    try{ if(window.gachaFx){ gachaFx.pulse(fxRank); fxCv(2000); } }catch(e){}
  }, 1300);
  // ③SSSだけ：一度暗転する「ため」→虹爆発
  if(tier === 'SSS'){
    T(function(){ if(stage) stage.classList.add('blackout'); }, 2100);
    T(function(){ if(stage){ stage.classList.remove('blackout'); stage.classList.add('rainbow'); } try{ vibe([30,60,30,60,90]); if(typeof confetti==='function') confetti(); }catch(e){} }, 2800);
  }
  // ④爆発フラッシュ→結果へ
  var endAt = (tier === 'SSS') ? 3600 : 2400;
  T(function(){ var f = document.getElementById('sc-flash'); if(f) f.classList.add('go');
    try{ if(window.gachaFx){ gachaFx.burst(fxRank); if(tier==='SS'||tier==='SSS') gachaFx.rain(fxRank); fxCv(2000); } }catch(e){}
    try{ sfx('correct'); }catch(e){} }, endAt - 300);
  T(finish, endAt);
}
function srpgScoutResults(got){
  var ov = document.getElementById('srpg-ask'); if(!ov) return;
  var best = got.reduce(function(m, g){ return (['F','E','D','C','B','A','S','SS','SSS','LG'].indexOf(g.rank) > ['F','E','D','C','B','A','S','SS','SSS','LG'].indexOf(m)) ? g.rank : m; }, 'F');
  var HIRANK = { S:1, SS:1, SSS:1 };
  var many = got.length > 1;
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

// ================= とくぎ強化（ダブり合成）：同じ種のなかまで とくぎLvを上げる =================
function srpgSkillUpScreen(){
  srpgB = null;
  document.getElementById('srpg-title').textContent = 'とくぎ強化';
  var s, ai; try{ s = rpgState(); ai = rpgAibouState(s); }catch(e){ return; }
  var party = ai.party || [];
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
    var mats = g.filter(function(m){ return srpgSkillUpCanFuse(base, m, party); });
    var artHtml = (typeof srpgMonArt==='function' && srpgMonArt(art)) || _monStill(art);
    var maxed = (base.skLv||1) >= SRPG_SKLV_MAX;
    rows += '<div class="srpg-fuse-row">'
      + '<div class="srpg-fuse-art">'+artHtml+'</div>'
      + '<div class="srpg-fuse-info"><b>'+escapeHtml(base.name||'なかま')+'</b> <small>'+(base.rank||'F')+' Lv'+(base.lv||1)+'</small>'
      + '<div class="srpg-fuse-lv">とくぎLv '+(base.skLv||1)+' / '+SRPG_SKLV_MAX+'　<small>いりょく+'+((Math.min(SRPG_SKLV_MAX,base.skLv||1)-1)*10)+'%</small></div>'
      + '<small class="srpg-fuse-n">ダブり '+mats.length+'体</small></div>'
      + (maxed ? '<span class="srpg-fuse-max">MAX</span>'
         : (mats.length ? '<button class="rpg-btn srpg-fuse-btn" onclick="srpgSkillUpDo(\''+base.id+'\',\''+mats[0].id+'\')">⚗️ 強化</button>'
            : '<span class="srpg-fuse-none">素材なし</span>'))
      + '</div>';
  });
  if(!rows) rows = '<div class="srpg-tm-empty">おなじ種類の なかまが 2体いると 強化できるよ。<br>🔮スカウトや バトルで ダブりを あつめよう！</div>';
  document.getElementById('srpg-body').innerHTML =
    '<div class="srpg-fuse">'
    + '<div class="srpg-select-lead">⚗️ とくぎ強化<br><small>おなじ種類の なかまを 合成すると、とくぎLvが 上がる！（いりょく+10%・状態異常の確率+5% ずつ）</small></div>'
    + '<div class="srpg-fuse-top"><span>🐾 なかま '+Object.keys(ai.roster).length+' / '+AIBOU_ROSTER_MAX+'</span><button class="srpg-mini2" onclick="srpgCleanupDo()">🧹 おかたづけ（ダブり→エサ）</button></div>'
    + rows
    + '<button class="srpg-mini" onclick="srpgTeamScreen()">← 編成へもどる</button></div>';
  try{ _char3dHydrateSafe(document.getElementById('srpg-body')); }catch(e){}
}
// 🧹おかたづけ：各種類（art）で いちばん強い1体を残し、パーティ外のダブりを一括でエサに
function srpgCleanupDo(){
  try{ sfx('click'); }catch(e){}
  var s, ai; try{ s = rpgState(); ai = rpgAibouState(s); }catch(e){ return; }
  var party = ai.party || [];
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
  if(!srpgSkillUpCanFuse(base, mat, ai.party || [])){ try{ showToast('⚠️','強化できないよ',''); }catch(e){} return; }
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
  setTimeout(function(){ try{ sc.removeChild(el); }catch(e){} if(onDone) onDone(); }, 820);
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
  setTimeout(function(){ try{ sc.removeChild(el); }catch(e){} if(onDone) onDone(); }, 1150);
}
// ③ スカウトした仲間の登場演出（大アートが回転しながら光の中に登場）
function srpgScoutReveal(mon, onDone){
  var sc = document.getElementById('srpg-screen');
  if(!sc || !mon){ if(onDone) onDone(); return; }
  var art = ((typeof srpgMonArt==='function' && srpgMonArt(mon.art)) || (typeof _monStill==='function' && _monStill(mon.art)) || '👾');
  var el = document.createElement('div'); el.className = 'srpg-scout';
  el.innerHTML = '<div class="srpg-scout-rays"></div>'
    + '<div class="srpg-scout-art silhou">'+art+'</div>'
    + (mon.rank?'<div class="srpg-scout-stamp rk-'+mon.rank+'">'+mon.rank+'</div>':'')
    + '<div class="srpg-scout-cap">🎉 なかまが あらわれた！</div>'
    + '<div class="srpg-scout-nm">'+escapeHtml(mon.name)+' <span>'+escapeHtml(mon.rank||'')+'</span></div>'
    + '<div class="srpg-scout-tap">タップして つづける ▶</div>';
  var done = false, fin = function(){ if(done) return; done = true; try{ sc.removeChild(el); }catch(e){} if(onDone) onDone(); };
  el.onclick = fin;
  sc.appendChild(el);
  // 登場ショー：シルエット→0.7秒後に開眼（カラー化＋閃光）→ランクがドンと打刻
  setTimeout(function(){ try{ var a=el.querySelector('.srpg-scout-art'); if(a) a.classList.remove('silhou'); var st=el.querySelector('.srpg-scout-stamp'); if(st) st.classList.add('go'); sfx('correct'); vibe(20); }catch(e){} }, 700);
  try{ sfx('fanfare'); if(typeof confetti==='function') confetti(); }catch(e){}
  srpgSay('やったね！ '+(mon.name||'なかま')+'が、なかまに なったよ！');
  setTimeout(fin, 2800);
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
