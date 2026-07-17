/* srpg.js：マス目グリッドのタクティクス戦闘（ドラクエタクト風）のデータ＋エンジン（純粋関数）。
   ここは「データと計算」だけ＝DOM/localStorage/乱数に触れない（テスト容易・再現可能）。
   描画・出題・保存・演出は index.html 側（srpgRender など）が担当する。

   設計の要（学習アプリとしての肝）:
   - 移動は自由（タクティクスの位置取り）。
   - こうげき／とくぎは「教科をえらんで 1問 正解する」と発動する＝正解が攻撃の入力。
   - 敵には弱点教科があり、弱点教科でせめると「つよめ（×1.5）」、耐性教科は「よわめ（×0.6）」。
     → どの教科でせめるか＝弱点をつく戦略＝いろんな教科をバランスよく解く動機になる。 */

// ===== 教科＝属性（ドラクエの8系統になぞらえる。攻撃側は5教科属性を使う） =====
var SRPG_SUBJECTS = {
  math:     { key:'math',     elem:'bang',  em:'💥', name:'ばくはつ', label:'算数・数学', color:'#f59e0b' },
  japanese: { key:'japanese', elem:'dark',  em:'🌑', name:'やみ',     label:'国語',       color:'#7c3aed' },
  english:  { key:'english',  elem:'wind',  em:'🌀', name:'かぜ',     label:'英語',       color:'#10b981' },
  science:  { key:'science',  elem:'ice',   em:'❄️', name:'こおり',   label:'理科',       color:'#38bdf8' },
  social:   { key:'social',   elem:'earth', em:'🪨', name:'だいち',   label:'社会',       color:'#a16207' }
};
var SRPG_SUBJECT_KEYS = ['math','japanese','english','science','social'];
// 敵の弱点・耐性はこの5属性のどれか（＝どの教科でせめれば刺さるか）
function srpgSubjectMeta(key){ return SRPG_SUBJECTS[key] || SRPG_SUBJECTS.math; }

// 属性倍率：弱点でつよめ・耐性でよわめ。無ければ等倍。
var SRPG_MULT_WEAK = 1.5, SRPG_MULT_RESIST = 0.6, SRPG_MULT_NORMAL = 1;
function srpgElemMult(subjectKey, enemy){
  if(!enemy) return SRPG_MULT_NORMAL;
  if(enemy.weak === subjectKey)   return SRPG_MULT_WEAK;
  if(enemy.resist === subjectKey) return SRPG_MULT_RESIST;
  return SRPG_MULT_NORMAL;
}
// つよめ／よわめ／等倍のラベル（UIの弱点表示用）
function srpgMultLabel(mult){
  if(mult >= SRPG_MULT_WEAK)   return { txt:'つよめ！', cls:'weak' };
  if(mult <= SRPG_MULT_RESIST) return { txt:'よわめ…', cls:'resist' };
  return { txt:'', cls:'normal' };
}

// ===== 耐性の段階（弱点/等倍/半減/無効/吸収）＝ドラクエの耐性表 =====
//   enemy.resists[subject] を優先。無ければ後方互換で weak/resist から導く。
//   drain（吸収）は倍率 -1（＝ダメージ0＋その分HP回復）を意味し、呼び出し側で回復に変換する。
var SRPG_RESIST_MULT = { weak:1.5, normal:1, half:0.5, 'null':0, drain:-1 };
function srpgResistKind(subjectKey, enemy){
  if(!enemy) return 'normal';
  if(enemy.resists && enemy.resists[subjectKey]) return enemy.resists[subjectKey];
  if(enemy.weak === subjectKey) return 'weak';
  if(enemy.resist === subjectKey) return 'half';
  return 'normal';
}
function srpgResistMult(kind){ return SRPG_RESIST_MULT[kind] !== undefined ? SRPG_RESIST_MULT[kind] : 1; }
function srpgResistLabel(kind){
  var T = { weak:{txt:'つよめ！',cls:'weak'}, half:{txt:'よわめ…',cls:'resist'},
    'null':{txt:'きかない！',cls:'nullr'}, drain:{txt:'きゅうしゅう！',cls:'drain'}, normal:{txt:'',cls:'normal'} };
  return T[kind] || T.normal;
}

// ===== バフ/デバフ（攻・守・速の段階。-2..+2、各段階 ±25%） =====
function srpgClampStage(v){ return Math.max(-2, Math.min(2, v || 0)); }
function srpgEffStat(unit, stat){
  var b = (unit && unit[stat]) || 0;
  var st = srpgClampStage(unit && unit.mods && unit.mods[stat]);
  return Math.round(b * (1 + 0.25 * st));
}
// バフ/デバフを積む（段階は累積し ±2 で頭打ち・残りターンを更新）
function srpgSetMod(unit, stat, stage, turns){
  if(!unit.mods) unit.mods = { atk:0, def:0, spd:0 };
  if(!unit.modTurns) unit.modTurns = { atk:0, def:0, spd:0 };
  unit.mods[stat] = srpgClampStage((unit.mods[stat] || 0) + stage);
  unit.modTurns[stat] = Math.max(unit.modTurns[stat] || 0, turns || 0);
}
// ターン開始時：バフ/デバフの残りターンを減らし、0になった段階は解除
function srpgTickMods(unit){
  if(!unit.modTurns) return;
  ['atk','def','spd'].forEach(function(s){
    if(unit.modTurns[s] > 0){ unit.modTurns[s]--; if(unit.modTurns[s] <= 0) unit.mods[s] = 0; }
  });
}

// ===== 状態異常（どく/まひ/ねむり/ふうじ） =====
var SRPG_STATUS_META = {
  poison:  { key:'poison',   em:'☠️', name:'どく',   desc:'毎ターン じわじわ ダメージ' },
  paralyze:{ key:'paralyze', em:'⚡', name:'まひ',   desc:'うごけない ことがある' },
  sleep:   { key:'sleep',    em:'💤', name:'ねむり', desc:'うごけない（こうげきで 目ざめる）' },
  seal:    { key:'seal',     em:'🚫', name:'ふうじ', desc:'とくぎが つかえない' }
};
function srpgApplyStatus(unit, kind, turns){
  if(!unit.status) unit.status = {};
  unit.status[kind] = Math.max(unit.status[kind] || 0, turns || 1);
}
function srpgHasStatus(unit, kind){ return !!(unit.status && unit.status[kind] > 0); }
// ターン開始時の状態異常処理。返り値: { poisonDmg, skip(行動不能か), cleared[] }
function srpgTickStatus(unit){
  var out = { poisonDmg:0, skip:false, cleared:[] };
  if(!unit.status) return out;
  if(unit.status.poison > 0){ out.poisonDmg = Math.max(1, Math.ceil(unit.maxHp * 0.10)); unit.status.poison--; if(unit.status.poison <= 0) out.cleared.push('poison'); }
  if(unit.status.sleep > 0){ out.skip = true; unit.status.sleep--; if(unit.status.sleep <= 0) out.cleared.push('sleep'); }
  else if(unit.status.paralyze > 0){ out.skip = true; unit.status.paralyze--; if(unit.status.paralyze <= 0) out.cleared.push('paralyze'); }
  if(unit.status.seal > 0){ unit.status.seal--; if(unit.status.seal <= 0) out.cleared.push('seal'); }
  return out;
}
function srpgCanAct(unit){ return !(unit.status && (unit.status.sleep > 0 || unit.status.paralyze > 0)); }
function srpgCanUseSkill(unit){ return !(unit.status && unit.status.seal > 0); }
// こうげきを受けたら ねむりは解除
function srpgWakeOnHit(unit){ if(unit.status && unit.status.sleep > 0) unit.status.sleep = 0; }

// ===== 役割（アタッカー/まほう/かいふく/ぼうぎょ）。ステータス倍率と初期とくぎ =====
// skills は「覚醒（レベルアップ）で 手前から順に 習得」する。Lv1で1つ・Lv6で2つ・Lv11で3つ。
var SRPG_ROLES = {
  attacker:{ key:'attacker', name:'アタッカー', em:'⚔️', hp:1.0, atk:1.25, def:0.9,  spd:1.15, mov:3, rng:1, skills:['slash','powerup','line'] },
  mage:    { key:'mage',     name:'まほう',     em:'🔮', hp:0.85,atk:1.15, def:0.8,  spd:1.0,  mov:2, rng:2, skills:['burstball','poisonbreath','numbing'] },
  healer:  { key:'healer',   name:'かいふく',   em:'✨', hp:0.95,atk:0.8,  def:0.95, spd:1.05, mov:2, rng:2, skills:['heal','bikilt','ranban'] },
  tank:    { key:'tank',     name:'ぼうぎょ',   em:'🛡️', hp:1.4, atk:0.9,  def:1.4,  spd:0.8,  mov:2, rng:1, skills:['taunt','rukani','rariho'] }
};
// 覚醒：レベルに応じた とくぎ習得数（1〜3）
function srpgSkillCount(lvl){ return Math.max(1, Math.min(3, 1 + Math.floor(((lvl || 1) - 1) / 5))); }
// リーダー特性：出撃メンバーの先頭（リーダー）の役割で、味方全体に開始時パッシブ（+1段階・実質永続）
var SRPG_LEADER_TRAITS = {
  attacker:{ stat:'atk', stage:1, name:'とつげきの号令', desc:'味方ぜんいんの こうげき↑' },
  mage:    { stat:'atk', stage:1, name:'まりょくの共鳴', desc:'味方ぜんいんの こうげき↑' },
  tank:    { stat:'def', stage:1, name:'まもりの陣',     desc:'味方ぜんいんの まもり↑' },
  healer:  { stat:'spd', stage:1, name:'はやての加護',   desc:'味方ぜんいんの すばやさ↑' }
};
function srpgLeaderTrait(role){ return SRPG_LEADER_TRAITS[role] || null; }

// ===== とくぎ（スキル）。elem/属性は「使うとき選んだ教科」で決まるのでここには持たない =====
//   shape: single(単体) / cross(十字5マス) / line3(奥へ直線3) / burst(3x3=9マス) / all(敵全体)
//   kind : atk（ダメージ）/ heal（味方回復）
var SRPG_SKILLS = {
  slash:    { id:'slash',    name:'なぎはらい',   mp:3, shape:'cross',  power:110, kind:'atk',  rng:1, desc:'十字5マスをまとめて斬る' },
  burstball:{ id:'burstball',name:'ばくれつ',     mp:4, shape:'burst',  power:120, kind:'atk',  rng:2, desc:'3×3の範囲を巻きこむ大魔法' },
  heal:     { id:'heal',     name:'いやしのて',   mp:3, shape:'single', power:130, kind:'heal', rng:2, desc:'なかま1体のHPを回復' },
  taunt:    { id:'taunt',    name:'みがわり突撃', mp:3, shape:'single', power:150, kind:'atk',  rng:1, desc:'みがわりになりつつ重い一撃' },
  line:     { id:'line',     name:'つらぬき',     mp:4, shape:'line3',  power:130, kind:'atk',  rng:1, desc:'奥へ直線3マスを貫く' },
  // 状態異常つきのこうげき（教科をえらんで正解で発動）
  poisonbreath:{ id:'poisonbreath', name:'どくのいき', mp:4, shape:'burst', power:60, kind:'atk', rng:2,
    inflict:{ kind:'poison', turns:3, chance:0.9 }, desc:'3×3にダメージ＋どく（じわじわ削る）' },
  numbing: { id:'numbing',  name:'しびれこうげき', mp:3, shape:'single', power:75, kind:'atk', rng:2,
    inflict:{ kind:'paralyze', turns:2, chance:0.7 }, desc:'まひで うごきを止める（2ターン）' },
  lullaby: { id:'lullaby',  name:'こもりうた',   mp:4, shape:'cross', power:0, kind:'atk', rng:2,
    inflict:{ kind:'sleep', turns:2, chance:0.65 }, desc:'十字の敵を ねむらせる（こうげきで起きる）' },
  sealing: { id:'sealing',  name:'とくぎふうじ', mp:3, shape:'single', power:55, kind:'atk', rng:2,
    inflict:{ kind:'seal', turns:3, chance:0.8 }, desc:'とくぎを ふうじる（3ターン）' },
  // バフ／デバフ（味方は出題なしで即・敵デバフは教科をえらんで正解で発動）
  powerup: { id:'powerup',  name:'ちからため',   mp:3, shape:'single', kind:'buff', rng:0,
    buff:{ stat:'atk', stage:2, turns:3, target:'self' }, desc:'自分の こうげきを 大きく上げる' },
  bikilt:  { id:'bikilt',   name:'ちからのうた', mp:4, shape:'single', kind:'buff', rng:2,
    buff:{ stat:'atk', stage:1, turns:3, target:'ally' }, desc:'なかま1体の こうげきを上げる' },
  ranban:  { id:'ranban',   name:'まもりのうた', mp:3, shape:'single', kind:'buff', rng:2,
    buff:{ stat:'def', stage:1, turns:3, target:'ally' }, desc:'なかま1体の まもりを上げる' },
  rukani:  { id:'rukani',   name:'よろいくだき', mp:3, shape:'single', kind:'debuff', rng:2,
    buff:{ stat:'def', stage:-2, turns:3, target:'enemy' }, desc:'敵の まもりを 下げる（ダメージUP）' },
  rariho:  { id:'rariho',   name:'すばやさダウン', mp:3, shape:'single', kind:'debuff', rng:2,
    buff:{ stat:'spd', stage:-1, turns:3, target:'enemy' }, desc:'敵の すばやさを 下げて 後回しに' },
  // ---- モンスター固有とくぎ（スカウトした仲間の個性・すべてオリジナル） ----
  purupuru: { id:'purupuru', name:'ぷるぷるバリア', mp:3, shape:'single', kind:'buff', rng:0,
    buff:{ stat:'def', stage:2, turns:3, target:'self' }, desc:'からだを かためて まもりを 大きく上げる' },
  royalwave:{ id:'royalwave',name:'おうさまウェーブ', mp:5, shape:'burst', power:110, kind:'atk', rng:2, desc:'王のちからで 3×3を なぎはらう' },
  kamikizu: { id:'kamikizu', name:'がぶりつき',     mp:4, shape:'single', power:130, kind:'atk', rng:1,
    inflict:{ kind:'poison', turns:2, chance:0.5 }, desc:'強くかみつき きずに どくが のこる' },
  hono:     { id:'hono',     name:'かえんのいき',   mp:5, shape:'line3',  power:140, kind:'atk', rng:1, desc:'ほのおで 直線3マスを やきはらう' },
  sumihane: { id:'sumihane', name:'すみはね',       mp:4, shape:'cross',  power:70,  kind:'atk', rng:2,
    inflict:{ kind:'seal', turns:2, chance:0.6 }, desc:'すみを まきちらし とくぎを ふうじる' },
  fudesabaki:{id:'fudesabaki',name:'ふでさばき',    mp:4, shape:'line3',  power:120, kind:'atk', rng:1, desc:'ひとふでがきで 直線3マスを 斬る' },
  gekiyaku: { id:'gekiyaku', name:'げきやくスプラッシュ', mp:5, shape:'burst', power:80, kind:'atk', rng:2,
    inflict:{ kind:'poison', turns:3, chance:0.7 }, desc:'やくひんを ばらまき 広く どくにする' },
  baikin:   { id:'baikin',   name:'ばいきんアタック', mp:3, shape:'single', power:90, kind:'atk', rng:1,
    inflict:{ kind:'poison', turns:3, chance:0.8 }, desc:'ばいきんを うえつける（どく確率大）' },
  rinpun:   { id:'rinpun',   name:'ねむりのこな',   mp:4, shape:'cross',  power:50,  kind:'atk', rng:2,
    inflict:{ kind:'sleep', turns:2, chance:0.6 }, desc:'こなを まいて 十字の敵を ねむらせる' },
  tokitome: { id:'tokitome', name:'とけいのまほう', mp:4, shape:'single', power:60,  kind:'atk', rng:2,
    inflict:{ kind:'paralyze', turns:2, chance:0.9 }, desc:'時間を くるわせ うごきを 止める' }
};
function srpgSkill(id){ return SRPG_SKILLS[id] || null; }
// ===== モンスター固有とくぎ：アート（種）→ 生まれつきのとくぎ =====
// スカウトした仲間の個性。亜種（〜2）はベースの種と同じ技を受け継ぐ。
var SRPG_MON_SKILL = {
  slime:'purupuru', slugking:'royalwave', goblin:'line', bat:'poisonbreath', wolf:'kamikizu',
  ghost:'lullaby', dragon:'hono', voltdrake:'numbing', trent:'heal', inkblob:'sumihane',
  fudebird:'fudesabaki', kanjioni:'sealing', abcube:'ranban', qbird:'rariho', grammaro:'bikilt',
  flaskun:'gekiyaku', microbe:'baikin', mapmoth:'rinpun', haniwa:'taunt', tokiou:'tokitome',
  villain:'burstball', pet:'heal'
};
function srpgMonSkill(art){
  if(!art) return null;
  if(SRPG_MON_SKILL[art]) return SRPG_MON_SKILL[art];
  var m = /^(.*)2$/.exec(art);   // 亜種はベース種の技
  return (m && SRPG_MON_SKILL[m[1]]) || null;
}

// ===== 距離・範囲（マンハッタン距離＝タクティクスの標準） =====
function srpgDist(ax, ay, bx, by){ return Math.abs(ax - bx) + Math.abs(ay - by); }
function srpgInRange(ax, ay, bx, by, range){ return srpgDist(ax, ay, bx, by) <= (range || 1) && !(ax === bx && ay === by); }

// 盤上の占有マップ（生きているユニットのみ）
function srpgOccupied(units){
  var occ = {};
  (units || []).forEach(function(u){ if(u && !u.downed) occ[u.x + ',' + u.y] = u; });
  return occ;
}
function srpgUnitAt(units, x, y){ return srpgOccupied(units)[x + ',' + y] || null; }

// 移動できるマス：BFSで mov 歩以内・盤内・味方敵で埋まっていないマス（自分の現在地は除く）
function srpgMoveTiles(unit, grid, units){
  if(!unit) return [];
  var occ = srpgOccupied(units), w = grid.w, h = grid.h;
  var start = unit.x + ',' + unit.y, seen = {}; seen[start] = 0;
  var q = [{ x:unit.x, y:unit.y, d:0 }], out = [];
  var DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
  while(q.length){
    var cur = q.shift();
    for(var i=0;i<DIRS.length;i++){
      var nx = cur.x + DIRS[i][0], ny = cur.y + DIRS[i][1], k = nx + ',' + ny;
      if(nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if(grid.blocked && grid.blocked[k]) continue;   // 障害物マス（岩・水）は通れない
      if(seen[k] !== undefined) continue;
      if(cur.d + 1 > (unit.mov || 0)) continue;
      var blocked = occ[k] && !(nx === unit.x && ny === unit.y);   // 他ユニットが居るマスは通れない
      if(blocked) continue;
      seen[k] = cur.d + 1;
      out.push({ x:nx, y:ny, d:cur.d + 1 });
      q.push({ x:nx, y:ny, d:cur.d + 1 });
    }
  }
  return out;
}

// こうげき/とくぎの「狙えるマス」：from から rng 以内（マンハッタン）・盤内
function srpgRangeTiles(fromX, fromY, rng, grid){
  var out = [];
  for(var y=0;y<grid.h;y++) for(var x=0;x<grid.w;x++){
    if(srpgInRange(fromX, fromY, x, y, rng)) out.push({ x:x, y:y });
  }
  return out;
}

// AoE：狙ったマス(tx,ty)を中心に、shape が実際に当てるマス一覧（盤内クリップ）。
// attacker は line3 の向き（味方→敵方向）を決めるのに使う。
function srpgAoeTiles(shape, tx, ty, grid, attacker){
  var cells = [];
  if(shape === 'single'){ cells = [[0,0]]; }
  else if(shape === 'cross'){ cells = [[0,0],[1,0],[-1,0],[0,1],[0,-1]]; }
  else if(shape === 'burst'){ for(var dy=-1;dy<=1;dy++) for(var dx=-1;dx<=1;dx++) cells.push([dx,dy]); }
  else if(shape === 'all'){
    var all = [];
    for(var yy=0;yy<grid.h;yy++) for(var xx=0;xx<grid.w;xx++) all.push({ x:xx, y:yy });
    return all;
  }
  else if(shape === 'line3'){
    var sy = 1;   // 既定は下→上（味方は下・敵は上に居る想定）
    if(attacker){ sy = (ty >= attacker.y) ? 1 : -1; if(ty === attacker.y) sy = 0; }
    cells = [[0,0]];
    if(sy !== 0){ cells.push([0, sy]); cells.push([0, 2 * sy]); }
    else { cells.push([1,0]); cells.push([2,0]); }
  }
  else { cells = [[0,0]]; }
  var out = [];
  cells.forEach(function(c){
    var x = tx + c[0], y = ty + c[1];
    if(x >= 0 && y >= 0 && x < grid.w && y < grid.h) out.push({ x:x, y:y });
  });
  return out;
}

// ===== ダメージ計算（決定的：crit は呼び出し側＝コンボ等が渡す） =====
// dmg = max(1, round((atk*power/100 - def*0.4) * elemMult * crit))
function srpgDamage(attacker, defender, power, elemMult, crit){
  var atk = srpgEffStat(attacker, 'atk') || 1, def = srpgEffStat(defender, 'def') || 0;
  var base = atk * ((power || 100) / 100) - def * 0.4;
  var raw = base * (elemMult || 1) * (crit ? 1.5 : 1);
  return Math.max(1, Math.round(raw));
}
// かいふく量（atk基準・防御は無関係）
function srpgHealAmount(caster, power){
  return Math.max(1, Math.round(((caster && caster.atk) || 1) * ((power || 100) / 100)));
}

// ===== ターン順（すばやさ降順・同値は id 昇順で安定） =====
function srpgTurnOrder(units){
  return (units || []).filter(function(u){ return u && !u.downed; })
    .slice().sort(function(a, b){ return (srpgEffStat(b, 'spd') - srpgEffStat(a, 'spd')) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
}

// ===== 勝敗（side の全員が downed か） =====
function srpgSideDown(units, side){
  var alive = (units || []).filter(function(u){ return u && u.side === side && !u.downed; });
  return alive.length === 0;
}
function srpgOutcome(units){
  if(srpgSideDown(units, 'enemy')) return 'win';
  if(srpgSideDown(units, 'ally'))  return 'lose';
  return null;
}

// ===== 地形（マス効果）＝ドラクエタクトのマス属性 =====
//   heal（回復の泉）/ poison（毒の沼）/ fire（炎）。ターン開始時に そのマスの効果を受ける。
var SRPG_TERRAIN_META = {
  heal:   { key:'heal',   em:'💚', name:'回復の泉', cls:'heal',   pct:0.12, sign:1 },
  poison: { key:'poison', em:'🟣', name:'毒の沼',   cls:'poison', pct:0.10, sign:-1 },
  fire:   { key:'fire',   em:'🔥', name:'炎',       cls:'fire',   pct:0.12, sign:-1 }
};
function srpgTerrainAt(stage, x, y){
  var t = (stage && stage.terrain) || [];
  for(var i=0;i<t.length;i++){ if(t[i].x === x && t[i].y === y) return t[i].kind; }
  return null;
}
// 地形がユニットに与えるHP変化量（+回復 / -ダメージ）。0なら効果なし。
function srpgTerrainDelta(kind, unit){
  var m = SRPG_TERRAIN_META[kind]; if(!m || !unit) return 0;
  return m.sign * Math.max(1, Math.ceil(unit.maxHp * m.pct));
}

// ===== 敵AI（決定的）：いちばん近い味方へ寄り、射程に入れば攻撃 =====
// 返り値: { moveTo:{x,y}, targetId:string|null }
function srpgEnemyPlan(enemy, grid, units){
  var allies = (units || []).filter(function(u){ return u && u.side === 'ally' && !u.downed; });
  if(!allies.length) return { moveTo:{ x:enemy.x, y:enemy.y }, targetId:null };
  // ねらう味方：現在地から最も近い（同距離は id 昇順）
  allies.sort(function(a, b){
    var da = srpgDist(enemy.x, enemy.y, a.x, a.y), db = srpgDist(enemy.x, enemy.y, b.x, b.y);
    return (da - db) || (a.id < b.id ? -1 : 1);
  });
  var target = allies[0];
  // 動けるマスのうち、標的に最も近づけるマス（射程内ならその場でも可）
  var tiles = srpgMoveTiles(enemy, grid, units);
  tiles.push({ x:enemy.x, y:enemy.y, d:0 });   // その場に留まる選択も候補
  var rng = enemy.rng || 1, best = null, bestScore = Infinity;
  tiles.forEach(function(t){
    var dToTarget = srpgDist(t.x, t.y, target.x, target.y);
    var inR = dToTarget <= rng;
    // 射程に入れるマスを最優先、次に標的への距離、最後に移動歩数が少ない方
    var score = (inR ? 0 : 1000) + dToTarget * 10 + (t.d || 0);
    if(score < bestScore){ bestScore = score; best = t; }
  });
  var moveTo = best ? { x:best.x, y:best.y } : { x:enemy.x, y:enemy.y };
  var canHit = srpgDist(moveTo.x, moveTo.y, target.x, target.y) <= rng;
  return { moveTo:moveTo, targetId: canHit ? target.id : null };
}

// ===== 賢い敵AI（ボス）：とくぎ／賢い狙い／範囲の中心探索 =====
// 狙う価値：回復役を最優先、次に瀕死（HP割合が低い）ほど高い
function srpgTargetBonus(u){
  if(!u) return -1;
  return (u.role === 'healer' ? 300 : 0) + Math.round((1 - (u.hp / u.maxHp)) * 200);
}
// from(rng内)で狙える味方から、狙う価値→近さ→id で最良を返す
function srpgEnemyPickTarget(fromX, fromY, rng, units){
  var cand = (units || []).filter(function(u){ return u && u.side === 'ally' && !u.downed && srpgInRange(fromX, fromY, u.x, u.y, rng); });
  cand.sort(function(a, b){
    return (srpgTargetBonus(b) - srpgTargetBonus(a))
      || (srpgDist(fromX, fromY, a.x, a.y) - srpgDist(fromX, fromY, b.x, b.y))
      || (a.id < b.id ? -1 : 1);
  });
  return cand[0] || null;
}
// 敵の行動を決める（決定的）。返り値:
//   { moveTo:{x,y}, kind:'skill'|'attack'|'none', skillId?, center?{x,y}, aoe?[], targetIds?[], targetId? }
function srpgEnemyAction(enemy, grid, units){
  var allies = (units || []).filter(function(u){ return u && u.side === 'ally' && !u.downed; });
  if(!allies.length) return { moveTo:{ x:enemy.x, y:enemy.y }, kind:'none' };
  var tiles = srpgMoveTiles(enemy, grid, units); tiles.push({ x:enemy.x, y:enemy.y, d:0 });
  var skills = (enemy.skills || []).map(function(id){ return srpgSkill(id); })
    .filter(function(s){ return s && s.kind === 'atk' && (enemy.mp || 0) >= s.mp; });
  var best = null;
  function consider(cand){ if(!best || cand.score > best.score) best = cand; }
  tiles.forEach(function(t){
    // --- とくぎ：射程内の中心マスで AoE に入る味方が最も多いところ ---
    skills.forEach(function(sk){
      var centers = srpgRangeTiles(t.x, t.y, sk.rng, grid); centers.push({ x:t.x, y:t.y });
      centers.forEach(function(cc){
        var aoe = srpgAoeTiles(sk.shape, cc.x, cc.y, grid, enemy);
        var hits = [];
        aoe.forEach(function(a){ var u = srpgUnitAt(units, a.x, a.y); if(u && u.side === 'ally' && !u.downed) hits.push(u); });
        if(!hits.length) return;
        var bonus = hits.reduce(function(s, u){ return s + srpgTargetBonus(u); }, 0);
        var score = (hits.length >= 2 ? 2000 * hits.length : 650) + bonus - (t.d || 0);
        consider({ score:score, moveTo:{ x:t.x, y:t.y }, kind:'skill', skillId:sk.id, center:{ x:cc.x, y:cc.y },
          aoe:aoe, targetIds:hits.map(function(u){ return u.id; }) });
      });
    });
    // --- 通常こうげき：最良ターゲットを狙う ---
    var tgt = srpgEnemyPickTarget(t.x, t.y, enemy.rng, units);
    if(tgt) consider({ score:700 + srpgTargetBonus(tgt) - (t.d || 0), moveTo:{ x:t.x, y:t.y }, kind:'attack', targetId:tgt.id });
  });
  if(best) return best;
  // どこからも攻撃できない：最近接へ寄る
  var plan = srpgEnemyPlan(enemy, grid, units);
  return { moveTo:plan.moveTo, kind:plan.targetId ? 'attack' : 'none', targetId:plan.targetId };
}

// ===== 配置フェーズ：味方を置ける自陣ゾーン（下部エリア。敵の初期位置・障害物は除く） =====
function srpgDeployZone(stage){
  if(stage.deployZone) return stage.deployZone.slice();
  var g = stage.grid, occ = {};
  (stage.enemies || []).forEach(function(e){ occ[e.x + ',' + e.y] = 1; });
  (stage.blocks || []).forEach(function(b){ occ[b.x + ',' + b.y] = 1; });
  var z = [];
  for(var y = Math.max(0, g.h - 3); y < g.h; y++) for(var x = 0; x < g.w; x++){ if(!occ[x + ',' + y]) z.push({ x:x, y:y }); }
  return z;
}

// ===== 障害物（岩🗻・水🌊）：通れないマス＝位置取りの戦略が深くなる =====
function srpgGridWithBlocks(stage){
  var g = { w: stage.grid.w, h: stage.grid.h, blocked: {} };
  (stage.blocks || []).forEach(function(b){ g.blocked[b.x + ',' + b.y] = b.kind || 'rock'; });
  return g;
}
var SRPG_BLOCK_META = { rock:{ em:'🗻', name:'いわ' }, water:{ em:'🌊', name:'みず' } };

// ===== ダメージ予測（攻撃前に「よそう」を見せる＝弱点えらびの学びが深まる） =====
function srpgForecast(attacker, target, subjectKey, skill){
  var kind = srpgResistKind(subjectKey, target);
  if(kind === 'null') return { kind:kind, dmg:0 };
  var power = skill ? srpgSkillPower(skill, attacker && attacker.skLv) : 100;
  var dmg = srpgDamage(attacker, target, power, kind === 'drain' ? 1 : srpgResistMult(kind), false);
  return { kind:kind, dmg:dmg };   // drainのdmgは「敵が回復する量」
}

// ===== とくぎ強化（ダブり合成）：同じ種のなかまを合成 → とくぎLv(1〜5)が上がる =====
// 効果：とくぎの威力 +10%/Lv、状態異常の確率 +5%/Lv（教科正解の一撃がさらに重くなる）
var SRPG_SKLV_MAX = 5;
function srpgSkillPower(sk, skLv){
  return Math.round((sk && sk.power || 100) * (1 + 0.10 * (Math.min(SRPG_SKLV_MAX, skLv || 1) - 1)));
}
function srpgInflictChance(sk, skLv){
  if(!sk || !sk.inflict) return 0;
  return Math.min(1, sk.inflict.chance + 0.05 * (Math.min(SRPG_SKLV_MAX, skLv || 1) - 1));
}
// 合成できるか：同じ種（art完全一致）・別個体・Lv上限未満・素材はパーティ外（お気に入り誤消し防止）
function srpgSkillUpCanFuse(base, mat, partyIds){
  if(!base || !mat || base.id === mat.id) return false;
  if(base.art !== mat.art) return false;
  if((base.skLv || 1) >= SRPG_SKLV_MAX) return false;
  if((partyIds || []).indexOf(mat.id) >= 0) return false;
  return true;
}

// ===== ウェーブ制（増援）：stage.waves = 追加の敵陣。1陣を全滅させると次が現れる =====
// waveIdx は 0=初期配置。srpgWaveUnits(stage, 1) が2陣目の敵ユニット配列を返す。
function srpgWaveUnits(stage, waveIdx){
  var wave = (stage.waves || [])[waveIdx - 1];
  if(!wave) return [];
  return wave.map(function(e, i){
    var t = srpgEnemyTemplate(e.key);
    return srpgMakeUnit({
      id:'enemy_w' + waveIdx + '_' + i, side:'enemy', name:t.name, art:t.art, role:t.role,
      rankBase:t.rankBase, lvl:e.lvl || 1, weak:t.weak, resist:t.resist,
      resists:t.resists, onhit:t.onhit, skills:(t.skills || []), x:e.x, y:e.y
    });
  });
}
function srpgTotalWaves(stage){ return 1 + ((stage.waves || []).length); }

// ===== おまかせ編成：ロスターから つよさ×役割バランスで自動選抜（純粋関数） =====
// list=[{id,rank,lv,sp,...}] → 選んだidの配列（最大n体）。かいふく役を1体確保→残りは強い順。
function srpgAutoPick(list, n){
  n = n || 4;
  var RANKS = ['F','E','D','C','B','A','S','SS','SSS'];
  var score = function(a){ return (RANKS.indexOf(a.rank || 'F') + 1) * 100 + (a.lv || 1); };
  var sorted = (list || []).slice().sort(function(a, b){ return score(b) - score(a); });
  var picked = [], healer = null;
  // かいふく役（nature種）を1体だけ先に確保（パーティの生存力）
  for(var i = 0; i < sorted.length; i++){ if(sorted[i].sp === 'nature'){ healer = sorted[i]; break; } }
  if(healer) picked.push(healer.id);
  for(var j = 0; j < sorted.length && picked.length < n; j++){
    if(picked.indexOf(sorted[j].id) < 0) picked.push(sorted[j].id);
  }
  return picked;
}

// ===== スカウトガチャ（コインで仲間モンスターを引く）＝抽選は純粋関数・確率は開示前提 =====
// レート表（合計100%）。表示と抽選が同一ソース＝開示とのズレが構造的に起きない。
var SRPG_SCOUT_RATES = [
  ['SSS', 1], ['SS', 4], ['S', 7], ['A', 12], ['B', 13], ['C', 14], ['D', 15], ['E', 16], ['F', 18]
];
var SRPG_SCOUT_COST = { one: 80, ten: 720 };   // 10連は1割引＋A以上1体確定
function srpgScoutRank(rnd){
  var r = (rnd === undefined ? 0 : rnd) * 100, acc = 0;
  for(var i = 0; i < SRPG_SCOUT_RATES.length; i++){
    acc += SRPG_SCOUT_RATES[i][1];
    if(r < acc) return SRPG_SCOUT_RATES[i][0];
  }
  return 'F';
}
// 10連：A以上（A/S/SS/SSS）が1体も出なければ、最後の1体をAに引き上げ（保証）
function srpgScoutTen(rng){
  var HI = { A:1, S:1, SS:1, SSS:1 };
  var out = [];
  for(var i = 0; i < 10; i++) out.push(srpgScoutRank(rng()));
  if(!out.some(function(k){ return HI[k]; })) out[9] = 'A';
  return out;
}

// ===== クリア星評価（★1=勝利 ★2=全員生存 ★3=規定ラウンド以内） =====
function srpgStars(won, alliesDowned, rounds, par){
  if(!won) return 0;
  var s = 1;
  if((alliesDowned || 0) === 0) s++;
  if((rounds || 99) <= (par || 6)) s++;
  return s;
}

// ===== ユニット生成 =====
// spec: { id, side, name, art, role, weak, resist, lvl(1..), rankBase(atk基礎) }
function srpgMakeUnit(spec){
  var role = SRPG_ROLES[spec.role] || SRPG_ROLES.attacker;
  var lvl = Math.max(1, spec.lvl || 1);
  var power = (spec.rankBase || 6) * (1 + 0.08 * (lvl - 1));   // 基礎ちから（rank/lv由来）
  var b = spec.bonus || {};                                    // 装備ボーナス（きせかえ/あいぼう帽子＝収集連動）
  var hp  = Math.round((26 + power * 3.2) * role.hp) + (b.hp || 0);
  var atk = Math.round((6  + power * 1.15) * role.atk) + (b.atk || 0);
  var def = Math.round((3  + power * 0.55) * role.def) + (b.def || 0);
  var spd = Math.round((10 + lvl * 0.6) * role.spd) + (b.spd || 0);
  return {
    id: spec.id, side: spec.side, name: spec.name, art: spec.art,
    role: role.key, roleName: role.name, roleEm: role.em,
    gear: { hp:(b.hp||0), atk:(b.atk||0), def:(b.def||0), spd:(b.spd||0) },
    maxHp: hp, hp: hp, atk: atk, def: def, spd: spd,
    mov: role.mov, rng: role.rng, mp: 0, mpMax: 6,
    skills: (spec.skills !== undefined ? spec.skills.slice() : role.skills.slice(0, srpgSkillCount(lvl))),
    lvl: lvl, awaken: srpgSkillCount(lvl), skLv: Math.max(1, Math.min(SRPG_SKLV_MAX, spec.skLv || 1)),
    weak: spec.weak || null, resist: spec.resist || null, resists: spec.resists || null,
    onhit: spec.onhit || null,
    status: {}, mods: { atk:0, def:0, spd:0 }, modTurns: { atk:0, def:0, spd:0 },
    x: spec.x || 0, y: spec.y || 0, acted: false, downed: false
  };
}

// ===== 敵テンプレ（art は RPG_SVG に存在するもの＝テストで検証） =====
var SRPG_ENEMY_TEMPLATES = {
  slime:  { art:'slime',   name:'スライム',   role:'attacker', rankBase:5,  weak:'science',  resist:'math',
    resists:{ science:'weak', math:'half' } },
  goblin: { art:'goblin',  name:'ゴブリン',   role:'attacker', rankBase:6,  weak:'math',     resist:'social',
    resists:{ math:'weak', social:'half' } },
  bat:    { art:'bat',     name:'いっかくばち',role:'mage',    rankBase:6,  weak:'english',  resist:'japanese',
    resists:{ english:'weak', japanese:'half' }, onhit:{ kind:'poison', turns:2, chance:0.35 }, skills:['poisonbreath'] },
  wolf:   { art:'wolf',    name:'ウルフ',     role:'attacker', rankBase:8,  weak:'social',   resist:'science',
    resists:{ social:'weak', science:'half' }, onhit:{ kind:'paralyze', turns:1, chance:0.25 } },
  ghost:  { art:'ghost',   name:'ゴースト',   role:'mage',     rankBase:8,  weak:'japanese', resist:'english',
    resists:{ japanese:'weak', english:'null' }, onhit:{ kind:'seal', turns:2, chance:0.3 }, skills:['lullaby'] },
  trent:  { art:'trent',   name:'トレント',   role:'tank',     rankBase:9,  weak:'science',  resist:'social',
    resists:{ science:'weak', social:'half', english:'half' } },
  voltdrake:{art:'voltdrake',name:'ボルトドレイク',role:'mage', rankBase:11, weak:'social', resist:'math',
    resists:{ social:'weak', math:'null' }, onhit:{ kind:'paralyze', turns:1, chance:0.3 }, skills:['numbing'] },
  dragon: { art:'dragon',  name:'ドラゴン',   role:'attacker', rankBase:13, weak:'math',     resist:'english',
    resists:{ math:'weak', english:'half', japanese:'drain' }, skills:['line'] },
  villain:{ art:'villain', name:'魔王シグマ', role:'tank',     rankBase:16, weak:'math',     resist:'japanese', boss:true,
    resists:{ math:'weak', japanese:'half', social:'null', english:'drain' }, onhit:{ kind:'poison', turns:3, chance:0.4 }, skills:['burstball','poisonbreath'] }
};
function srpgEnemyTemplate(key){ return SRPG_ENEMY_TEMPLATES[key] || SRPG_ENEMY_TEMPLATES.slime; }

// ===== ステージ定義（グリッド・敵配置・味方の出撃マス） =====
//   allySlots: 味方をならべる開始マス（前から順に使う）。
//   enemies: { key, x, y, lvl }
var SRPG_STAGES = {
  arena1: { id:'arena1', name:'はじまりの草原', grid:{ w:6, h:7 }, continent:'math', type:'training',
    // はじめての戦い＝チュートリアル戦。敵2体・低レベルで必ず勝てる難易度に（難易度曲線の入口）
    allySlots:[{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:2,y:5}],
    enemies:[{key:'slime',x:2,y:1,lvl:1},{key:'goblin',x:4,y:1,lvl:1}] },
  arena2: { id:'arena2', name:'いにしえの遺跡', grid:{ w:6, h:7 }, continent:'social', type:'training',
    allySlots:[{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:3,y:5}],
    enemies:[{key:'wolf',x:1,y:1,lvl:3},{key:'ghost',x:4,y:1,lvl:3},{key:'trent',x:2,y:0,lvl:3},{key:'goblin',x:3,y:2,lvl:2}] },
  arena3: { id:'arena3', name:'魔王城の決戦', grid:{ w:6, h:7 }, continent:'math', type:'training',
    allySlots:[{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:2,y:5}],
    enemies:[{key:'voltdrake',x:1,y:1,lvl:5},{key:'dragon',x:4,y:1,lvl:5},{key:'villain',x:3,y:0,lvl:6}] },
  // ===== 大陸クエスト（ストーリー・地形つき。各大陸の主を タクト盤で たおす）=====
  q_math: { id:'q_math', name:'数の大陸：計算の塔', grid:{ w:6, h:7 }, continent:'math', type:'quest', boss:'ドラゴン',
    story:['数の大陸に 黒い霧が たちこめた。','塔の上で 巨竜が 数式を くるわせている！','コタロウ先生「弱点の教科で いっきに たたもう！」'],
    allySlots:[{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:2,y:5}],
    terrain:[{x:2,y:3,kind:'fire'},{x:3,y:3,kind:'fire'},{x:0,y:5,kind:'heal'}],
    enemies:[{key:'goblin',x:1,y:2,lvl:3},{key:'slime',x:4,y:2,lvl:3},{key:'dragon',x:3,y:1,lvl:5}] },
  q_japanese: { id:'q_japanese', name:'ことばの大陸：ことだまの森', grid:{ w:6, h:7 }, continent:'japanese', type:'quest', boss:'トレント',
    story:['ことばの大陸の 森が しずかに ざわめく。','ことだまを のっとった 大樹が ゆくてを ふさぐ。','ミケ先生「森の 回復マスを うまく つかって！」'],
    allySlots:[{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:3,y:5}],
    terrain:[{x:2,y:4,kind:'heal'},{x:3,y:4,kind:'heal'},{x:1,y:3,kind:'poison'}],
    blocks:[{x:0,y:3,kind:'rock'},{x:5,y:3,kind:'rock'}],
    enemies:[{key:'ghost',x:1,y:2,lvl:4},{key:'bat',x:4,y:2,lvl:4},{key:'trent',x:3,y:1,lvl:6}] },
  q_english: { id:'q_english', name:'アルファベット大陸：かぜの谷', grid:{ w:6, h:7 }, continent:'english', type:'quest', boss:'ボルトドレイク',
    story:['かぜの谷に 雷鳴が とどろく。','空を かける 竜が いなずまを あやつる！','ラビィ先生「すばやさが カギ。順番を よく見て！」'],
    allySlots:[{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:2,y:5}],
    terrain:[{x:2,y:3,kind:'fire'},{x:4,y:4,kind:'heal'}],
    enemies:[{key:'bat',x:1,y:2,lvl:5},{key:'wolf',x:4,y:2,lvl:5},{key:'voltdrake',x:3,y:1,lvl:7}] },
  q_science: { id:'q_science', name:'じっけんの大陸：やくひんの湖', grid:{ w:6, h:7 }, continent:'science', type:'quest', boss:'トレント',
    story:['じっけんの大陸の 湖が むらさきに にごる。','こぼれた やくひんが モンスターを 生んだ。','ナナ博士「毒の沼に 気をつけて 動こう！」'],
    allySlots:[{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:3,y:5}],
    terrain:[{x:2,y:3,kind:'poison'},{x:3,y:3,kind:'poison'},{x:3,y:4,kind:'poison'},{x:0,y:5,kind:'heal'}],
    enemies:[{key:'slime',x:1,y:2,lvl:5},{key:'bat',x:4,y:2,lvl:5},{key:'trent',x:3,y:1,lvl:7}] },
  q_social: { id:'q_social', name:'れきしの大陸：いにしえの城', grid:{ w:6, h:7 }, continent:'social', type:'quest', boss:'ドラゴン',
    story:['れきしの大陸の 古城に 亡霊が よみがえる。','時を こえた 軍勢が 立ちはだかる。','クマ先生「陣形を 大事に、一体ずつ たおそう！」'],
    allySlots:[{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:2,y:5}],
    terrain:[{x:2,y:4,kind:'heal'},{x:4,y:3,kind:'fire'}],
    blocks:[{x:2,y:2,kind:'rock'},{x:3,y:3,kind:'rock'}],
    waves:[[{key:'ghost',x:1,y:0,lvl:6},{key:'bat',x:4,y:0,lvl:6}]],
    enemies:[{key:'wolf',x:1,y:2,lvl:6},{key:'ghost',x:4,y:2,lvl:6},{key:'goblin',x:2,y:1,lvl:5},{key:'dragon',x:3,y:1,lvl:8}] },
  q_maou: { id:'q_maou', name:'魔王城：さいごの決戦', grid:{ w:6, h:7 }, continent:'math', type:'quest', boss:'魔王シグマ',
    story:['5つの クリスタルが かがやきを とりもどした。','魔王シグマが さいごの 力で たちはだかる！','「いくぞ！ みんなの 力を あわせて！」'],
    allySlots:[{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:2,y:5}],
    terrain:[{x:2,y:3,kind:'fire'},{x:3,y:3,kind:'fire'},{x:0,y:6,kind:'heal'},{x:5,y:6,kind:'heal'},{x:3,y:2,kind:'poison'}],
    blocks:[{x:0,y:4,kind:'water'},{x:5,y:4,kind:'water'}],
    waves:[[{key:'wolf',x:0,y:1,lvl:8},{key:'ghost',x:5,y:1,lvl:8}]],
    enemies:[{key:'voltdrake',x:1,y:2,lvl:8},{key:'dragon',x:4,y:2,lvl:8},{key:'villain',x:3,y:0,lvl:10}] }
};
function srpgStage(id){ return SRPG_STAGES[id] || SRPG_STAGES.arena1; }

// ===== 周回要素：デイリー挑戦＆ちょうせんの塔（決定的生成＝同じ入力なら同じステージ） =====
// 乱数は種つきLCG（Date.now/Math.random禁止＝テスト再現可能。日付キーはUI側が渡す）
function srpgSeedRng(seedStr){
  var h = 2166136261 >>> 0;
  String(seedStr || '').split('').forEach(function(c){ h = ((h ^ c.charCodeAt(0)) * 16777619) >>> 0; });
  return function(){ h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
}
var SRPG_STD_SLOTS = [{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:2,y:5}];
// 敵n体を上部ゾーン（y0..2）へ重複なく置く
function _srpgPlaceEnemies(rng, keys, n, lvlMin, lvlVar){
  var out = [], used = {};
  for(var i=0;i<n;i++){
    var k = keys[Math.floor(rng()*keys.length)];
    var x = Math.floor(rng()*6), y = Math.floor(rng()*3), guard = 0;
    while(used[x+','+y] && guard++ < 24){ x = (x+1)%6; if(x===0) y = (y+1)%3; }
    used[x+','+y] = 1;
    out.push({ key:k, x:x, y:y, lvl:lvlMin + Math.floor(rng()*(lvlVar+1)) });
  }
  return out;
}
// きょうの挑戦：日付キー（例 '2026-7-17'）から敵編成・地形・大陸が日替わりで決まる
function srpgDailyStage(dateKey){
  var rng = srpgSeedRng('daily:' + dateKey);
  var keys = Object.keys(SRPG_ENEMY_TEMPLATES).filter(function(k){ return k !== 'villain'; });
  var cont = SRPG_SUBJECT_KEYS[Math.floor(rng()*SRPG_SUBJECT_KEYS.length)];
  var enemies = _srpgPlaceEnemies(rng, keys, 3 + Math.floor(rng()*2), 3, 3);   // 3〜4体・Lv3〜6
  var terr = [], tks = ['heal','poison','fire'], used = {};
  var tn = 1 + Math.floor(rng()*3);
  for(var j=0;j<tn;j++){
    var tx = Math.floor(rng()*6), ty = 3 + Math.floor(rng()*2);   // 中央帯（y3..4）
    if(used[tx+','+ty]) continue; used[tx+','+ty] = 1;
    terr.push({ x:tx, y:ty, kind:tks[Math.floor(rng()*tks.length)] });
  }
  var blocks = [];
  var bn = Math.floor(rng()*3);   // 0〜2個の岩
  for(var bi=0;bi<bn;bi++){ var bx2=Math.floor(rng()*6), by2=3+Math.floor(rng()*2);
    if(used[bx2+','+by2]) continue; used[bx2+','+by2]=1; blocks.push({x:bx2,y:by2,kind:(rng()<0.5?'rock':'water')}); }
  return { id:'daily', name:'きょうの ちょうせん', grid:{w:6,h:7}, continent:cont, type:'daily',
    allySlots:SRPG_STD_SLOTS.slice(), terrain:terr, blocks:blocks, enemies:enemies };
}
// ちょうせんの塔：階が上がるほど強く・多く。5階ごとにボス階（魔王）
function srpgTowerStage(floor){
  floor = Math.max(1, floor|0);
  var rng = srpgSeedRng('tower:' + floor);
  var keys = Object.keys(SRPG_ENEMY_TEMPLATES).filter(function(k){ return k !== 'villain'; });
  var boss = (floor % 5 === 0);
  var n = Math.min(5, 2 + Math.floor(floor/3)) - (boss ? 1 : 0);
  var lvl = Math.min(12, 1 + floor);
  var enemies = _srpgPlaceEnemies(rng, keys, Math.max(1, n), lvl, 1);
  if(boss){
    var bx = 2 + Math.floor(rng()*2);
    var _bg=0; while(enemies.some(function(e){ return e.x===bx && e.y===0; }) && _bg++<8) bx = (bx+1)%6;
    enemies.push({ key:'villain', x:bx, y:0, lvl:Math.min(14, lvl+2) });
  }
  var terr = [];
  if(floor >= 3){ terr.push({ x:Math.floor(rng()*6), y:3 + Math.floor(rng()*2), kind:(floor%2 ? 'fire' : 'poison') }); }
  if(floor >= 5){ terr.push({ x:Math.floor(rng()*6), y:5, kind:'heal' }); }
  var blocks = [];
  if(floor >= 4){ var _tb=Math.floor(rng()*6); blocks.push({x:_tb,y:4,kind:(floor%2?'rock':'water')}); }
  return { id:'tower', name:'ちょうせんの塔 ' + floor + '階', grid:{w:6,h:7}, continent:'math', type:'tower', floor:floor,
    boss:(boss ? '魔王シグマ' : null), allySlots:SRPG_STD_SLOTS.slice(), terrain:terr, blocks:blocks, enemies:enemies };
}

// 味方スペック配列＋ステージから、配置済みの戦闘ユニット一覧を組み立てる（純粋）。
// allySpecs: [{ id,name,art,role,lvl,rankBase }]（最大5・弱点耐性は持たない）
function srpgBuildUnits(stage, allySpecs){
  var units = [], allies = [];
  (allySpecs || []).slice(0, 5).forEach(function(sp, i){
    var slot = stage.allySlots[i] || stage.allySlots[stage.allySlots.length - 1];
    var u = srpgMakeUnit(Object.assign({}, sp, { id: sp.id || ('ally' + i), side:'ally', x:slot.x, y:slot.y }));
    allies.push(u); units.push(u);
  });
  // リーダー特性：先頭（リーダー）の役割に応じて 味方ぜんいんへ 開始時パッシブ
  if(allies.length){
    var trait = srpgLeaderTrait(allies[0].role);
    if(trait){ allies.forEach(function(u){ srpgSetMod(u, trait.stat, trait.stage, 99); }); }
    allies[0].isLeader = true; allies[0].leaderTrait = trait || null;
  }
  (stage.enemies || []).forEach(function(e, i){
    var t = srpgEnemyTemplate(e.key);
    units.push(srpgMakeUnit({
      id:'enemy' + i, side:'enemy', name:t.name, art:t.art, role:t.role,
      rankBase:t.rankBase, lvl:e.lvl || 1, weak:t.weak, resist:t.resist,
      resists:t.resists, onhit:t.onhit, skills:(t.skills || []), x:e.x, y:e.y
    }));
  });
  return units;
}

// テスト・他モジュールから使えるよう公開（classic script のグローバル）
if(typeof module !== 'undefined' && module.exports){
  module.exports = {
    SRPG_SUBJECTS: SRPG_SUBJECTS, SRPG_SUBJECT_KEYS: SRPG_SUBJECT_KEYS, SRPG_ROLES: SRPG_ROLES,
    SRPG_SKILLS: SRPG_SKILLS, SRPG_ENEMY_TEMPLATES: SRPG_ENEMY_TEMPLATES, SRPG_STAGES: SRPG_STAGES,
    srpgSubjectMeta: srpgSubjectMeta, srpgElemMult: srpgElemMult, srpgMultLabel: srpgMultLabel,
    SRPG_RESIST_MULT: SRPG_RESIST_MULT, srpgResistKind: srpgResistKind, srpgResistMult: srpgResistMult, srpgResistLabel: srpgResistLabel,
    SRPG_STATUS_META: SRPG_STATUS_META, srpgApplyStatus: srpgApplyStatus, srpgHasStatus: srpgHasStatus,
    srpgTickStatus: srpgTickStatus, srpgCanAct: srpgCanAct, srpgCanUseSkill: srpgCanUseSkill, srpgWakeOnHit: srpgWakeOnHit,
    srpgEffStat: srpgEffStat, srpgSetMod: srpgSetMod, srpgTickMods: srpgTickMods, srpgClampStage: srpgClampStage,
    srpgSkillCount: srpgSkillCount, SRPG_LEADER_TRAITS: SRPG_LEADER_TRAITS, srpgLeaderTrait: srpgLeaderTrait,
    SRPG_TERRAIN_META: SRPG_TERRAIN_META, srpgTerrainAt: srpgTerrainAt, srpgTerrainDelta: srpgTerrainDelta,
    srpgDist: srpgDist, srpgInRange: srpgInRange, srpgOccupied: srpgOccupied, srpgUnitAt: srpgUnitAt,
    srpgMoveTiles: srpgMoveTiles, srpgRangeTiles: srpgRangeTiles, srpgAoeTiles: srpgAoeTiles,
    srpgDamage: srpgDamage, srpgHealAmount: srpgHealAmount, srpgTurnOrder: srpgTurnOrder,
    srpgSideDown: srpgSideDown, srpgOutcome: srpgOutcome, srpgEnemyPlan: srpgEnemyPlan,
    srpgTargetBonus: srpgTargetBonus, srpgEnemyPickTarget: srpgEnemyPickTarget, srpgEnemyAction: srpgEnemyAction, srpgDeployZone: srpgDeployZone,
    srpgMakeUnit: srpgMakeUnit, srpgEnemyTemplate: srpgEnemyTemplate, srpgStage: srpgStage,
    srpgSkill: srpgSkill, srpgBuildUnits: srpgBuildUnits,
    srpgSeedRng: srpgSeedRng, srpgDailyStage: srpgDailyStage, srpgTowerStage: srpgTowerStage,
    SRPG_MON_SKILL: SRPG_MON_SKILL, srpgMonSkill: srpgMonSkill,
    srpgGridWithBlocks: srpgGridWithBlocks, SRPG_BLOCK_META: SRPG_BLOCK_META, srpgForecast: srpgForecast, srpgStars: srpgStars,
    SRPG_SCOUT_RATES: SRPG_SCOUT_RATES, SRPG_SCOUT_COST: SRPG_SCOUT_COST, srpgScoutRank: srpgScoutRank, srpgScoutTen: srpgScoutTen,
    srpgWaveUnits: srpgWaveUnits, srpgTotalWaves: srpgTotalWaves, srpgAutoPick: srpgAutoPick,
    SRPG_SKLV_MAX: SRPG_SKLV_MAX, srpgSkillPower: srpgSkillPower, srpgInflictChance: srpgInflictChance, srpgSkillUpCanFuse: srpgSkillUpCanFuse
  };
}
