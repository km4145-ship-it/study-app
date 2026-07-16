/* srpg-ui.js：マス目タクティクス戦闘のUI・操作・出題ゲート（DOMあり）。
   エンジン（js/srpg.js の純粋関数）を呼び、#srpg-screen を描画する。
   ドラクエタクト風：クォータービューの盤（rotateXで傾ける）＋立ち絵（逆回転で立たせる）。

   操作フロー（学習アプリの肝：攻撃は必ず「教科をえらんで1問正解」で発動）:
     自分のターン → [移動(自由)] → [こうげき/とくぎ] → 標的をタップ → 教科をえらぶ → 出題
       → 正解＝発動（弱点教科なら つよめ×1.5）／不正解＝ミス → ターン終了 */

var srpgB = null;   // 現在の戦闘状態（null＝非戦闘）

// ---- 味方編成：勇者＋あいぼうパーティ（最大5・足りなければ既定の仲間で補う） ----
function srpgAllyRoster(){
  var out = [];
  var u = (typeof muCurrentUser === 'function' && muCurrentUser()) || {};
  var lv = 1; try{ lv = (rpgState().level) || 1; }catch(e){}
  var hname = 'ゆうしゃ'; try{ hname = rpgHeroName(); }catch(e){}
  out.push({ id:'hero', name:hname, art:(u.char || (typeof currentChar!=='undefined'&&currentChar) || 'shiba'), role:'attacker', lvl:lv, rankBase:8 });
  var roleBySp = { dragon:'attacker', beast:'attacker', slime:'tank', nature:'healer', maou:'mage', hero:'attacker' };
  var party = []; try{ party = rpgAibouParty() || []; }catch(e){}
  party.forEach(function(a, i){
    if(!a || out.length >= 5) return;
    var spName = (typeof AIBOU_SPECIES!=='undefined' && AIBOU_SPECIES[a.sp] && AIBOU_SPECIES[a.sp].name) || 'なかま';
    var base = (typeof AIBOU_RANK_BASE!=='undefined' && AIBOU_RANK_BASE[a.rank||'C']) || 6;
    out.push({ id:a.id || ('m'+i), name:a.name || spName, art:a.art || 'slime', role:roleBySp[a.sp] || 'attacker', lvl:a.lv || 1, rankBase:base });
  });
  // 最低2体は確保（回復役を1体入れて仕組みを体験させる）
  var fallbacks = [
    { id:'buddy_heal', name:'ヒーラン', art:'trent',  role:'healer',   lvl:Math.max(1,lv), rankBase:6 },
    { id:'buddy_tank', name:'ガードン', art:'slime',  role:'tank',     lvl:Math.max(1,lv), rankBase:6 },
    { id:'buddy_mage', name:'メラゾ',   art:'bat',    role:'mage',     lvl:Math.max(1,lv), rankBase:6 }
  ];
  for(var k=0; out.length < 3 && k < fallbacks.length; k++) out.push(fallbacks[k]);
  return out.slice(0, 5);
}

// ================= 起動・ステージ選択 =================
function srpgOpen(){
  try{ hideMainScreens(); }catch(e){}
  try{ hideTabbar(); }catch(e){}
  var sc = document.getElementById('srpg-screen'); if(!sc) return;
  sc.style.display = 'block';
  srpgStageSelect();
}
function srpgStageSelect(){
  srpgB = null;
  var cleared = srpgClearedSet();
  var cards = Object.keys(SRPG_STAGES).map(function(id, i){
    var st = SRPG_STAGES[id];
    var prev = Object.keys(SRPG_STAGES)[i-1];
    var locked = i > 0 && !cleared[prev];
    var done = cleared[id];
    var cont = (typeof RPG_WORLD!=='undefined' && RPG_WORLD[st.continent]) || { emoji:'⚔️', name:'' };
    var enemyFaces = st.enemies.map(function(e){ return '<span class="srpg-sc-mon">'+_monStill(SRPG_ENEMY_TEMPLATES[e.key].art)+'</span>'; }).join('');
    return '<button class="srpg-stage-card'+(locked?' locked':'')+(done?' done':'')+'" '+(locked?'disabled':'onclick="srpgStart(\''+id+'\')"')+'>'
      + '<div class="srpg-sc-head"><b>'+cont.emoji+' '+escapeHtml(st.name)+'</b>'+(done?'<span class="srpg-sc-clear">クリア済</span>':'')+(locked?'<span class="srpg-sc-lock">🔒</span>':'')+'</div>'
      + '<div class="srpg-sc-mons">'+enemyFaces+'</div>'
      + '<div class="srpg-sc-foot">'+(locked?'前のステージをクリアで解放':'敵'+st.enemies.length+'体 ・ '+st.grid.w+'×'+st.grid.h+'マス')+'</div>'
      + '</button>';
  }).join('');
  document.getElementById('srpg-body').innerHTML =
    '<div class="srpg-select">'
    + '<div class="srpg-select-lead">⚔️ タクトバトル<br><small>マスを えらんで うごき、教科を えらんで こうげき！ 敵の弱点を つけば 大ダメージ。</small></div>'
    + '<div class="srpg-stage-list">'+cards+'</div>'
    + '</div>';
  document.getElementById('srpg-title').textContent = 'タクトバトル';
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
    hiMove: {}, hiTarget: {}, hiAoe: {}, combo: 0, over: false, busy: false
  };
  document.getElementById('srpg-title').textContent = stage.name;
  srpgRender();
  srpgB.order = srpgTurnOrder(units);
  srpgB.turnPtr = -1;
  try{ if(typeof bgmPlay==='function') bgmPlay(stageId==='arena3'?'boss':'battle'); }catch(e){}
  srpgToast('⚔️ ' + stage.name, 'せんとう かいし！');
  setTimeout(srpgNextTurn, 700);
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
    var actor = srpgActor();
    if(actor && actor.x===x && actor.y===y && !actor.downed) cls += ' actor';
    var inner = '';
    var u = byPos[key];
    if(u) inner = srpgUnitPlate(u);
    html += '<div class="'+cls+'" id="st-'+x+'-'+y+'" onclick="srpgTileTap('+x+','+y+')">'+inner+'</div>';
  }
  html += '</div></div>';
  html += '<div class="srpg-fx" id="srpg-fx"></div></div>';
  html += '<div class="srpg-turnbar" id="srpg-turnbar">'+srpgTurnbarHtml()+'</div>';
  html += '<div class="srpg-cmd" id="srpg-cmd">'+srpgCmdHtml()+'</div>';
  document.getElementById('srpg-body').innerHTML = html;
  try{ _char3dHydrateSafe(document.getElementById('srpg-body')); }catch(e){}
}
function srpgUnitPlate(u){
  var art = (u.side==='enemy') ? _monStill(u.art) : _charStill(u.art);
  var hpPct = Math.max(0, Math.round(u.hp / u.maxHp * 100));
  var mpPct = u.mpMax ? Math.round((u.mp||0) / u.mpMax * 100) : 0;
  var badge = (u.side==='enemy' && u.weak)
    ? '<span class="srpg-weak" title="弱点">'+srpgSubjectMeta(u.weak).em+'</span>'
    : '<span class="srpg-role">'+u.roleEm+'</span>';
  return '<div class="srpg-unit '+u.side+(u.side==='enemy'&&SRPG_ENEMY_TEMPLATES[srpgEnemyKey(u)]&&SRPG_ENEMY_TEMPLATES[srpgEnemyKey(u)].boss?' boss':'')+'" id="su-'+u.id+'">'
    + '<div class="srpg-hpbar"><i style="width:'+hpPct+'%"></i></div>'
    + (u.side==='ally' && u.mpMax ? '<div class="srpg-mpbar"><i style="width:'+mpPct+'%"></i></div>' : '')
    + '<div class="srpg-sprite">'+art+'</div>'
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
    var art = (u.side==='enemy') ? _monStill(u.art) : _charStill(u.art);
    return '<span class="srpg-tb-face '+u.side+(actor&&u.id===actor.id?' now':'')+'">'+art+'</span>';
  }).join('<span class="srpg-tb-arrow">›</span>');
}
function srpgCmdHtml(){
  if(srpgB.over) return '';
  var actor = srpgActor();
  if(!actor || actor.side!=='ally') return '<div class="srpg-cmd-wait">'+(actor?escapeHtml(actor.name)+' の ターン…':'…')+'</div>';
  if(srpgB.phase==='pick-subject'){
    var tgt = srpgUnitAt(srpgB.units, srpgB.targetTile.x, srpgB.targetTile.y);
    var subs = SRPG_SUBJECT_KEYS.map(function(k){
      var m = srpgSubjectMeta(k), isWeak = tgt && tgt.weak===k, isRes = tgt && tgt.resist===k;
      return '<button class="srpg-sub'+(isWeak?' weak':'')+(isRes?' resist':'')+'" onclick="srpgPickSubject(\''+k+'\')">'
        + m.em+' '+m.label+(isWeak?'<b>弱点！</b>':'')+(isRes?'<span>耐性</span>':'')+'</button>';
    }).join('');
    return '<div class="srpg-cmd-head">どの教科で こうげきする？</div><div class="srpg-subs">'+subs+'</div>'
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
  var skills = actor.skills.map(function(id){
    var s = srpgSkill(id); if(!s) return '';
    var ok = mp >= s.mp;
    return '<button class="srpg-cmd-btn skill'+(ok?'':' off')+'" '+(ok?'onclick="srpgCmdSkill(\''+id+'\')"':'disabled')+' title="'+escapeHtml(s.desc)+'">'
      + (s.kind==='heal'?'✨':'🌟')+' '+s.name+' <small>MP'+s.mp+'</small></button>';
  }).join('');
  return '<div class="srpg-cmd-actor">'+actor.roleEm+' '+escapeHtml(actor.name)+' <small>Lv後 HP'+actor.hp+'/'+actor.maxHp+' MP'+mp+'</small></div>'
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
    // 次のラウンドへ：順番を組み直す
    srpgB.round++; srpgB.order = srpgTurnOrder(srpgB.units); srpgB.turnPtr = 0;
  }
  var actor = srpgB.order[srpgB.turnPtr];
  if(!actor || actor.downed){ return srpgNextTurn(); }   // 死者は飛ばす
  srpgB.actorId = actor.id; srpgB.moved = false; srpgB.chosenSkill = null; srpgB.targetTile = null;
  srpgClearHi();
  if(actor.side === 'enemy'){ srpgB.phase = 'enemy'; srpgRender(); setTimeout(function(){ srpgEnemyTurn(actor); }, 520); }
  else { srpgSelectActor(); }
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
  srpgShowTargets(actor, actor.rng, 'atk');
}
function srpgCmdSkill(id){
  var actor = srpgActor(); if(!actor) return;
  var s = srpgSkill(id); if(!s || (actor.mp||0) < s.mp) return;
  try{ sfx('click'); }catch(e){}
  srpgB.chosenSkill = id; srpgB.phase = 'action';
  srpgShowTargets(actor, s.rng, s.kind);
}
function srpgCmdWait(){
  try{ sfx('click'); }catch(e){}
  var actor = srpgActor(); if(actor) srpgB.acted[actor.id] = 1;
  srpgEndActorTurn();
}
function srpgShowTargets(actor, rng, kind){
  srpgB.hiTarget = {};
  var want = (kind==='heal') ? 'ally' : 'enemy';
  srpgRangeTiles(actor.x, actor.y, rng, srpgB.grid).forEach(function(t){
    var u = srpgUnitAt(srpgB.units, t.x, t.y);
    if(u && u.side===want && (kind!=='heal' || u.hp < u.maxHp)) srpgB.hiTarget[t.x+','+t.y] = 1;
    if(kind==='heal' && u && u.side==='ally') srpgB.hiTarget[t.x+','+t.y] = 1;   // 満タンでも選べる
  });
  srpgRender();
}

// ---- マスのタップ ----
function srpgTileTap(x, y){
  if(!srpgB || srpgB.over || srpgB.busy) return;
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
    if(sk && sk.kind==='heal'){ srpgResolveHeal(); return; }   // 回復は出題なしで即発動
    srpgB.phase = 'pick-subject'; srpgRender();
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
    srpgPopupAt(tgt.x, tgt.y, 'ミス！', 'miss');
    srpgAfterResolve();
    return;
  }
  srpgB.combo++;
  var crit = srpgB.combo >= 3;
  if(!sk){ actor.mp = Math.min(actor.mpMax||6, (actor.mp||0) + 2); }   // 通常こうげき成功でMPチャージ
  var shape = sk ? sk.shape : 'single';
  var power = sk ? sk.power : 100;
  var cells = srpgAoeTiles(shape, tgt.x, tgt.y, srpgB.grid, actor);
  var hitAny = false;
  cells.forEach(function(c){
    srpgB.hiAoe[c.x+','+c.y] = 1;
    var e = srpgUnitAt(srpgB.units, c.x, c.y);
    if(e && e.side==='enemy'){
      var mult = srpgElemMult(srpgB.subject, e);
      var dmg = srpgDamage(actor, e, power, mult, crit);
      e.hp = Math.max(0, e.hp - dmg);
      var lab = srpgMultLabel(mult);
      srpgPopupAt(c.x, c.y, (crit?'かいしん！ ':'') + dmg + (lab.txt?(' '+lab.txt):''), lab.cls==='weak'?'weak':(lab.cls==='resist'?'resist':'dmg'));
      if(e.hp<=0){ e.downed = true; srpgPopupAt(c.x, c.y, 'たおした！', 'down'); }
      hitAny = true;
    }
  });
  srpgRender();
  if(crit){ try{ document.body.classList.add('srpg-flash'); setTimeout(function(){ document.body.classList.remove('srpg-flash'); }, 260); }catch(e){} }
  srpgAfterResolve();
}
function srpgResolveHeal(){
  var actor = srpgActor(), t = srpgB.targetTile;
  var sk = srpgSkill(srpgB.chosenSkill);
  var tgt = srpgUnitAt(srpgB.units, t.x, t.y);
  if(!tgt || !sk){ srpgEndActorTurn(); return; }
  actor.mp = Math.max(0, (actor.mp||0) - sk.mp);
  var heal = srpgHealAmount(actor, sk.power);
  tgt.hp = Math.min(tgt.maxHp, tgt.hp + heal);
  srpgPopupAt(t.x, t.y, '+' + heal, 'heal');
  try{ sfx('correct'); }catch(e){}
  srpgRender();
  srpgAfterResolve();
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
  var plan = srpgEnemyPlan(enemy, srpgB.grid, srpgB.units);
  enemy.x = plan.moveTo.x; enemy.y = plan.moveTo.y;
  srpgRender();
  setTimeout(function(){
    if(plan.targetId){
      var tgt = srpgUnitById(plan.targetId);
      if(tgt && !tgt.downed){
        var dmg = srpgDamage(enemy, tgt, 100, 1, false);
        tgt.hp = Math.max(0, tgt.hp - dmg);
        srpgPopupAt(tgt.x, tgt.y, dmg, 'dmg-e');
        try{ sfx('wrong'); vibe(20); }catch(e){}
        if(tgt.hp<=0){ tgt.downed = true; srpgPopupAt(tgt.x, tgt.y, 'たおれた…', 'down'); }
        srpgRender();
      }
    }
    setTimeout(function(){
      var oc = srpgOutcome(srpgB.units);
      if(oc){ srpgEnd(oc); return; }
      srpgNextTurn();
    }, 640);
  }, 420);
}

// ================= 決着 =================
function srpgEnd(outcome){
  if(!srpgB || srpgB.over) return;
  srpgB.over = true; srpgB.phase = 'over';
  var win = outcome==='win';
  var coin = 30 + srpgB.stage.enemies.length * 15;
  var xp = 40 + srpgB.stage.enemies.length * 20;
  if(win){
    srpgMarkCleared(srpgB.stageId);
    // ごほうび：コインとXP（既存RPGの経済＝rpgState/cosに合流）
    try{ var s = rpgState(), cos = rpgCosState(s);
      cos.coin = (cos.coin||0) + coin;
      s.xp = (s.xp||0) + xp; s.level = rpgLevelForXp(s.xp);
      rpgSave(s);
    }catch(e){}
    try{ updateResBar(); }catch(e){}
    try{ if(typeof bgmPlay==='function') bgmPlay('map'); }catch(e){}
  }
  var body = document.getElementById('srpg-body');
  var card = '<div class="srpg-result '+(win?'win':'lose')+'">'
    + '<div class="srpg-result-em">'+(win?'🏆':'💫')+'</div>'
    + '<div class="srpg-result-t">'+(win?'しょうり！':'まけてしまった…')+'</div>'
    + '<div class="srpg-result-s">'+(win?('🪙コイン +'+coin+' ／ けいけんち +'+xp):'もういちど ちょうせんしよう！')+'</div>'
    + '<div class="srpg-result-btns">'
    + '<button class="rpg-btn" onclick="srpgStart(\''+srpgB.stageId+'\')">🔁 もういちど</button>'
    + '<button class="rpg-btn ghost" onclick="srpgStageSelect()">🗺️ ステージ選択</button>'
    + '</div></div>';
  body.insertAdjacentHTML('beforeend', '<div class="srpg-result-wrap">'+card+'</div>');
  try{ sfx(win?'levelup':'wrong'); }catch(e){}
}
function srpgClose(){
  srpgB = null;
  var sc = document.getElementById('srpg-screen'); if(sc) sc.style.display='none';
  var bar = document.getElementById('mu-tabbar'); if(bar) bar.classList.remove('mu-hidden');
  try{ muNav('home'); }catch(e){ try{ renderGameHub(); }catch(e2){} }
}

// ================= 小物：ダメージ表示・トースト =================
function srpgPopupAt(x, y, text, cls){
  var tile = document.getElementById('st-'+x+'-'+y); if(!tile) return;
  var pop = document.createElement('div');
  pop.className = 'srpg-pop ' + (cls||'dmg');
  pop.textContent = text;
  tile.appendChild(pop);
  setTimeout(function(){ try{ tile.removeChild(pop); }catch(e){} }, 1100);
}
function srpgToast(t, s){
  try{ if(typeof showToast==='function'){ showToast('', t, s||''); return; } }catch(e){}
}
