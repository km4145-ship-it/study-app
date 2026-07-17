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
  return { id:a.id, name:a.name || spName, art:a.art || 'slime', role:SRPG_ROLE_BY_SP[a.sp] || 'attacker', lvl:a.lv || 1, rankBase:base, rank:a.rank, sp:a.sp, bonus:srpgAibouBonus(a) };
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
    return '<div class="srpg-tm-card'+(on?' on':'')+(isLeader?' leader':'')+'">'
      + (isLeader?'<span class="srpg-tm-crown">👑</span>':'')
      + '<div class="srpg-tm-ava">'+((typeof srpgMonArt==='function'&&srpgMonArt(sp.art))||_charStill(sp.art))+'</div>'
      + '<div class="srpg-tm-nm">'+escapeHtml(sp.name)+'</div>'
      + '<div class="srpg-tm-meta">'+r.em+r.name+' <small>Lv'+sp.lvl+(sp.rank?' ('+sp.rank+')':'')+'</small></div>'
      + '<div class="srpg-tm-sk">とくぎ×'+nSk+(gear>0?' <span class="srpg-tm-gear">🎽そうび+'+gear+'</span>':'')+'</div>'
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
  h += '<button class="rpg-btn srpg-team-go" onclick="srpgTeamConfirm()">この編成で 出撃！ →</button>';
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
  var cont = (typeof RPG_WORLD!=='undefined' && RPG_WORLD[st.continent]) || { emoji:'⚔️', name:'' };
  var faces = st.enemies.map(function(e){ var a=SRPG_ENEMY_TEMPLATES[e.key].art; return '<span class="srpg-sc-mon">'+((typeof srpgMonArt==='function'&&srpgMonArt(a))||_monStill(a))+'</span>'; }).join('');
  var terr = (st.terrain||[]).reduce(function(m,t){ m[t.kind]=1; return m; }, {});
  var terrIcons = Object.keys(terr).map(function(k){ return SRPG_TERRAIN_META[k].em; }).join('');
  var foot = locked ? '前を クリアで 解放' : ('敵'+st.enemies.length+'体'+(st.boss?' ・ ボス「'+st.boss+'」':'')+(terrIcons?' ・ 地形'+terrIcons:''));
  return '<button class="srpg-stage-card'+(locked?' locked':'')+(done?' done':'')+(st.type==='quest'?' quest':'')+'" '+(locked?'disabled':'onclick="srpgStart(\''+id+'\')"')+'>'
    + '<div class="srpg-sc-head"><b>'+cont.emoji+' '+escapeHtml(st.name)+'</b>'+(done?'<span class="srpg-sc-clear">クリア済</span>':'')+(locked?'<span class="srpg-sc-lock">🔒</span>':'')+'</div>'
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
  document.getElementById('srpg-body').innerHTML =
    '<div class="srpg-select">'
    + '<div class="srpg-select-top"><button class="srpg-mini2" onclick="srpgTeamScreen()">🛡️ 編成を かえる</button></div>'
    + '<div class="srpg-sec">🗺️ 大陸クエスト <small>各大陸の 主を たおそう</small></div>'
    + '<div class="srpg-stage-list">'+questCards+'</div>'
    + '<div class="srpg-sec">⚔️ 訓練場 <small>自由に れんしゅう</small></div>'
    + '<div class="srpg-stage-list">'+trainCards+'</div>'
    + '</div>';
  document.getElementById('srpg-title').textContent = 'ステージ選択';
}
function srpgClearedSet(){ try{ return lsGetJSON('srpg_cleared', {}) || {}; }catch(e){ return {}; } }
function srpgMarkCleared(id){ try{ var s = srpgClearedSet(); s[id] = 1; lsSetJSON('srpg_cleared', s); }catch(e){} }

// ================= 戦闘の開始 =================
function srpgStart(stageId){
  try{ sfx('click'); }catch(e){}
  var stage = srpgStage(stageId);
  var units = srpgBuildUnits(stage, srpgAllyRoster());
  srpgB = {
    stageId: stageId, stage: stage, grid: stage.grid, units: units,
    round: 1, order: [], turnPtr: -1, acted: {}, actorId: null,
    phase: 'idle', moved: false, chosenSkill: null, targetTile: null,
    hiMove: {}, hiTarget: {}, hiAoe: {}, combo: 0, over: false, busy: false,
    zoneSet: {}, deploySel: null
  };
  document.getElementById('srpg-title').textContent = stage.name;
  try{ if(typeof bgmPlay==='function') bgmPlay((stage.type==='quest' && stage.boss) ? 'boss' : 'battle'); }catch(e){}
  if(stage.story && stage.story.length){ srpgRender(); srpgStoryIntro(stage.story, srpgDeployBegin); }
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
    var terr = srpgTerrainAt(srpgB.stage, x, y);
    if(terr) cls += ' terr-' + SRPG_TERRAIN_META[terr].cls;
    var inner = terr ? ('<span class="srpg-terr">'+SRPG_TERRAIN_META[terr].em+'</span>') : '';
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
  return '<div class="srpg-tb-lbl">じゅんばん</div>' + alive.slice(0, 8).map(function(u){
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
    var subs = SRPG_SUBJECT_KEYS.map(function(k){
      var m = srpgSubjectMeta(k), kind = srpgResistKind(k, tgt);
      return '<button class="srpg-sub '+(CLS[kind]||'')+'" onclick="srpgPickSubject(\''+k+'\')">'
        + m.em+' '+m.label+(TAG[kind]||'')+'</button>';
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
  if(srpgB.phase==='move' && srpgB.hiMove[key]){
    var actor = srpgActor();
    try{ sfx('click'); }catch(e){}
    actor.x = x; actor.y = y; srpgB.moved = true;
    srpgSelectActor();
    return;
  }
  if(srpgB.phase==='action' && srpgB.hiTarget[key]){
    srpgB.targetTile = { x:x, y:y };
    var sk = srpgB.chosenSkill ? srpgSkill(srpgB.chosenSkill) : null;
    if(sk && sk.kind==='heal'){ srpgResolveHeal(); return; }                         // 回復は出題なしで即発動
    if(sk && sk.kind==='buff'){ srpgResolveBuff(srpgUnitAt(srpgB.units, x, y)); return; }  // なかまバフも即発動
    srpgB.phase = 'pick-subject'; srpgRender();   // こうげき／デバフは 教科えらび→出題
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
  var power = sk ? sk.power : 100;
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
    if(!down && sk && sk.inflict && Math.random() < sk.inflict.chance){ srpgApplyStatus(e, sk.inflict.kind, sk.inflict.turns); infl = sk.inflict.kind; }
    fx.push({ x:c.x, y:c.y, text:(crit?'かいしん！ ':'')+dmg+(lab.txt?(' '+lab.txt):''), cls:(lab.cls==='weak'?'weak':(lab.cls==='resist'?'resist':'dmg')), hit:(crit?'crit':'hit'), id:e.id, down:down, infl:infl });
  });
  srpgRender();
  // ここから演出（描画のあと＝消えない）
  srpgAtkAnim(actor);
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
  enemy.x = act.moveTo.x; enemy.y = act.moveTo.y;
  srpgClearHi(); srpgRender();
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
    srpgAtkAnim(enemy); srpgSlashAt(tgt.x, tgt.y, 'math', false);
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
  srpgB.over = true; srpgB.phase = 'over';
  var win = outcome==='win';
  var coin = 30 + srpgB.stage.enemies.length * 15;
  var xp = 40 + srpgB.stage.enemies.length * 20;
  var extra = '', scout = null;
  if(win){
    srpgMarkCleared(srpgB.stageId);
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
    + '<div class="srpg-result-s">'+(win?('🪙コイン +'+coin+' ／ けいけんち +'+xp):'もういちど ちょうせんしよう！')+'</div>'
    + (extra?('<div class="srpg-res-extra">'+extra+'</div>'):'')
    + '<div class="srpg-result-btns">'
    + '<button class="rpg-btn" onclick="srpgStart(\''+srpgB.stageId+'\')">🔁 もういちど</button>'
    + (win?'<button class="rpg-btn" onclick="srpgTeamScreen()">🛡️ 編成をかえる</button>':'')
    + '<button class="rpg-btn ghost" onclick="srpgStageSelect()">🗺️ ステージ選択</button>'
    + '</div></div>';
  body.insertAdjacentHTML('beforeend', '<div class="srpg-result-wrap">'+card+'</div>');
  try{ sfx(win?'levelup':'wrong'); }catch(e){}
  if(win){ try{ if(typeof confetti==='function') confetti(); }catch(e){} }
  // ③ スカウトした仲間の「登場演出」（結果カードの上に出す）
  if(win && scout && scout.mon){ try{ srpgScoutReveal(scout.mon); }catch(e){} }
}
function srpgClose(){
  srpgB = null;
  var sc = document.getElementById('srpg-screen'); if(sc) sc.style.display='none';
  var bar = document.getElementById('mu-tabbar'); if(bar) bar.classList.remove('mu-hidden');
  try{ muNav('home'); }catch(e){ try{ renderGameHub(); }catch(e2){} }
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
  setTimeout(function(){ try{ sc.removeChild(el); }catch(e){} if(onDone) onDone(); }, 1150);
}
// ③ スカウトした仲間の登場演出（大アートが回転しながら光の中に登場）
function srpgScoutReveal(mon, onDone){
  var sc = document.getElementById('srpg-screen');
  if(!sc || !mon){ if(onDone) onDone(); return; }
  var art = ((typeof srpgMonArt==='function' && srpgMonArt(mon.art)) || (typeof _monStill==='function' && _monStill(mon.art)) || '👾');
  var el = document.createElement('div'); el.className = 'srpg-scout';
  el.innerHTML = '<div class="srpg-scout-rays"></div>'
    + '<div class="srpg-scout-art">'+art+'</div>'
    + '<div class="srpg-scout-cap">🎉 なかまが あらわれた！</div>'
    + '<div class="srpg-scout-nm">'+escapeHtml(mon.name)+' <span>'+escapeHtml(mon.rank||'')+'</span></div>'
    + '<div class="srpg-scout-tap">タップして つづける ▶</div>';
  var done = false, fin = function(){ if(done) return; done = true; try{ sc.removeChild(el); }catch(e){} if(onDone) onDone(); };
  el.onclick = fin;
  sc.appendChild(el);
  try{ sfx('fanfare'); if(typeof confetti==='function') confetti(); }catch(e){}
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
