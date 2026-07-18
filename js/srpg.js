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
  if(m && SRPG_MON_SKILL[m[1]]) return SRPG_MON_SKILL[m[1]];
  var uv = /^(.*)_(fire|ice|thunder|dark|holy)$/.exec(art);   // 属性変種もベース種の技を継承
  return (uv && SRPG_MON_SKILL[uv[1]]) || null;
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

// ===== 反撃：隣接からの単体こうげきを受けて生き残ったら 殴り返す（威力60%・両陣営対称） =====
function srpgCanCounter(defender, attacker){
  if(!defender || defender.downed || !attacker || attacker.downed) return false;
  if(srpgDist(defender.x, defender.y, attacker.x, attacker.y) !== 1) return false;
  return srpgCanAct(defender);   // ねむり・まひ中は反撃できない
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
  var allSk = (enemy.skills || []).map(function(id){ return srpgSkill(id); })
    .filter(function(s){ return s && (enemy.mp || 0) >= s.mp; });
  var skills = allSk.filter(function(s){ return s.kind === 'atk'; });
  var healSk = allSk.filter(function(s){ return s.kind === 'heal'; })[0] || null;
  var buffSk = allSk.filter(function(s){ return s.kind === 'buff'; })[0] || null;
  var mates = (units || []).filter(function(u){ return u && u.side === 'enemy' && !u.downed && u.id !== enemy.id; });
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
    // --- サポート：負傷した なかまを回復／未強化の なかまにバフ ---
    if(healSk){
      mates.forEach(function(m){
        if(m.hp >= m.maxHp * 0.65) return;
        if(!srpgInRange(t.x, t.y, m.x, m.y, healSk.rng)) return;
        consider({ score:1600 + (m.maxHp - m.hp) - (t.d || 0), moveTo:{ x:t.x, y:t.y }, kind:'support', skillId:healSk.id, targetId:m.id });
      });
    }
    if(buffSk && buffSk.buff){
      mates.forEach(function(m){
        if(m.mods && m.mods[buffSk.buff.stat] > 0) return;   // すでに強化済みは重ねない
        if(!srpgInRange(t.x, t.y, m.x, m.y, buffSk.rng)) return;
        consider({ score:800 + srpgTargetBonus(m) * 0.3 - (t.d || 0), moveTo:{ x:t.x, y:t.y }, kind:'support', skillId:buffSk.id, targetId:m.id });
      });
    }
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

// ===== 進化（ランクアップ）：同じ種のダブりを重ねて ランクを1つ上げる =====
// 効果：ランクが上がると 基礎ちからが跳ね上がり（AIBOU_RANK_BASE）、レベル上限も上がる。
//       進化は SSS まで（LG＝スカウト限定の伝説ランクには 進化では到達できない＝レア性を保つ）。
var SRPG_RANK_ORDER = ['F','E','D','C','B','A','S','SS','SSS'];
var SRPG_EVOLVE_DUPES = { F:1, E:1, D:2, C:2, B:3, A:3, S:4, SS:5 };   // 現ランク→次へ 上げるのに必要なダブり数
function srpgEvolveNextRank(rank){
  var i = SRPG_RANK_ORDER.indexOf(rank);
  return (i >= 0 && i < SRPG_RANK_ORDER.length - 1) ? SRPG_RANK_ORDER[i + 1] : null;
}
function srpgEvolveCost(rank){
  var next = srpgEvolveNextRank(rank);
  if(!next) return null;
  var dupes = SRPG_EVOLVE_DUPES[rank] || 1;
  return { next: next, dupes: dupes, coins: dupes * 150 };
}
// 進化できるか：SSS未満・別個体のダブりが必要数以上・コイン足りる（素材はパーティ外＝呼び出し側で除外）
function srpgEvolveCanDo(base, matCount, coins){
  if(!base) return { ok:false, reason:'none' };
  var cost = srpgEvolveCost(base.rank || 'F');
  if(!cost) return { ok:false, reason:'max' };
  if((matCount || 0) < cost.dupes) return { ok:false, reason:'mats', cost:cost };
  if((coins || 0) < cost.coins) return { ok:false, reason:'coin', cost:cost };
  return { ok:true, cost:cost };
}

// ===== ボスの山場：フェーズ変化（かくせい）＆ 大技（ためて放つ範囲攻撃を予告→回避）=====
// かくせい：HPが phase.hp（割合）以下に落ちた最初の瞬間に1度だけ発動できる。
function srpgBossPhaseReady(u){
  if(!u || u.downed || !u.phase || u.phaseDone) return null;
  if(u.hp > u.maxHp * (u.phase.hp || 0.5)) return null;
  return u.phase;
}
// 大技のねらい：AoE形状で いま いちばん多く味方を巻き込める中心マスを返す（純粋）。
// ＝予告の時点での最善位置。実際は次のターンに放つので、味方は逃げれば回避できる。
function srpgAoeBestCenter(shape, units, grid){
  var allies = (units || []).filter(function(u){ return u && u.side === 'ally' && !u.downed; });
  if(!allies.length) return null;
  var best = null;
  for(var y = 0; y < grid.h; y++) for(var x = 0; x < grid.w; x++){
    var tiles = srpgAoeTiles(shape, x, y, grid);
    var set = {}; tiles.forEach(function(t){ set[t.x + ',' + t.y] = 1; });
    var hits = allies.filter(function(a){ return set[a.x + ',' + a.y]; }).length;
    if(hits > 0 && (!best || hits > best.hits)) best = { x:x, y:y, hits:hits, tiles:tiles };
  }
  return best;
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
      resists:t.resists, onhit:t.onhit, skills:(t.skills || []), phase:t.phase, charge:t.charge, tmplKey:e.key, x:e.x, y:e.y
    });
  });
}
function srpgTotalWaves(stage){ return 1 + ((stage.waves || []).length); }

// ===== ちえのクリスタル：各大陸クエストをクリアで1つ手に入る（5つ集めて魔王城が開く）=====
// これが「なぜ戦うのか＝5つのクリスタルを集めて魔王シグマを倒す」という物語の通し糸。
// 状態は既存の srpg_cleared（クリア済みステージ）から導出＝新しい保存を増やさない。
var SRPG_CRYSTALS = [
  { id:'q_math',     continent:'math',     em:'🔴', name:'かずの クリスタル' },
  { id:'q_japanese', continent:'japanese', em:'🟣', name:'ことばの クリスタル' },
  { id:'q_english',  continent:'english',  em:'🟢', name:'えいごの クリスタル' },
  { id:'q_science',  continent:'science',  em:'🔵', name:'かがくの クリスタル' },
  { id:'q_social',   continent:'social',   em:'🟡', name:'れきしの クリスタル' }
];
function srpgCrystalsFrom(cleared){
  cleared = cleared || {};
  return SRPG_CRYSTALS.map(function(c){ return { id:c.id, continent:c.continent, em:c.em, name:c.name, got:!!cleared[c.id] }; });
}
function srpgCrystalCount(cleared){ return srpgCrystalsFrom(cleared).filter(function(c){ return c.got; }).length; }
function srpgCrystalFor(stageId){ for(var i=0;i<SRPG_CRYSTALS.length;i++){ if(SRPG_CRYSTALS[i].id===stageId) return SRPG_CRYSTALS[i]; } return null; }

// ===== おまかせ編成：ロスターから つよさ×役割バランスで自動選抜（純粋関数） =====
// list=[{id,rank,lv,sp,...}] → 選んだidの配列（最大n体）。かいふく役を1体確保→残りは強い順。
function srpgAutoPick(list, n){
  n = n || 4;
  var RANKS = ['F','E','D','C','B','A','S','SS','SSS','LG'];
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
  ['LG', 0.5], ['SSS', 1], ['SS', 3.5], ['S', 7], ['A', 12], ['B', 13], ['C', 14], ['D', 15], ['E', 16], ['F', 18]
];   // LG＝伝説ランク（最上位・0.5%）
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
// ===== スカウトメダル交換所：1回引くごとに1枚→ためると好きな種と交換（ダブり救済の最終形） =====
var SRPG_MEDAL_COST = { normal:50, villain:150 };
function srpgMedalCost(art){ return art === 'villain' ? SRPG_MEDAL_COST.villain : SRPG_MEDAL_COST.normal; }
// なかま図鑑の進捗（met=これまでに仲間にした種の集合）
function srpgDexProgress(metArts, total){
  var count = Object.keys(metArts || {}).filter(function(k){ return metArts[k]; }).length;
  return { count:count, total:total, pct: total ? Math.round(count / total * 100) : 0 };
}
// 図鑑の節目ほうび（受領フラグは cos.dexRw に union 保存）
var SRPG_DEX_REWARDS = [
  { id:'d10',  need:10,  coin:300,  label:'10種で 🪙300' },
  { id:'d40',  need:40,  coin:1000, label:'40種で 🪙1000' },
  { id:'d80',  need:80,  coin:2500, label:'80種で 🪙2500' },
  { id:'d121', need:121, coin:8000, label:'ぜんぶ（121種）で 🪙8000' }
];

// ===== 天井（ピティ）：ハズレ続きの救済＝スカウト30回で SS以上を1体かくてい =====
var SRPG_SCOUT_PITY_MAX = 30;
function srpgScoutApplyPity(ranks, pityBefore, pityMax){
  var HI = { SS:1, SSS:1, LG:1 };
  var natural = ranks.some(function(k){ return HI[k]; });
  var out = ranks.slice(), triggered = false;
  if(!natural && (pityBefore + ranks.length) >= (pityMax || SRPG_SCOUT_PITY_MAX)){
    out[out.length - 1] = 'SS'; triggered = true;   // 天井到達→最後の1体をSSへ
  }
  var pityAfter = (natural || triggered) ? 0 : (pityBefore + ranks.length);   // SS以上が出たらリセット
  return { ranks:out, pity:pityAfter, triggered:triggered };
}
// ===== 週替わりピックアップ：週キーから決定的に3種えらぶ（家族全端末で同じ） =====
function srpgScoutPickups(weekKey){
  var rng = srpgSeedRng('pickup:' + weekKey);
  var arts = Object.keys(SRPG_MON_SKILL).filter(function(k){ return k !== 'pet' && k !== 'villain'; });
  var out = [], guard = 0;
  while(out.length < 3 && guard++ < 60){
    var a = arts[Math.floor(rng() * arts.length)];
    if(out.indexOf(a) < 0) out.push(a);
  }
  return out;
}
// アート抽選（ピックアップは重み2倍）
function srpgScoutArt(rnd, arts, pickups){
  if(!arts || !arts.length) return null;
  var weights = arts.map(function(a){ return (pickups && pickups.indexOf(a) >= 0) ? 2 : 1; });
  var tot = weights.reduce(function(x, y){ return x + y; }, 0);
  var r = (rnd === undefined ? 0 : rnd) * tot, acc = 0;
  for(var i = 0; i < arts.length; i++){ acc += weights[i]; if(r < acc) return arts[i]; }
  return arts[arts.length - 1];
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
    onhit: spec.onhit || null, phase: spec.phase || null, charge: spec.charge || null, tmplKey: spec.tmplKey || null, phaseDone: false,
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
  slugking:{ art:'slugking', name:'スラッグ王', role:'tank',   rankBase:10, weak:'math',     resist:'english',
    resists:{ math:'weak', english:'half' }, onhit:{ kind:'poison', turns:2, chance:0.3 }, skills:['line'] },
  // 物語モードの山場ボス（大技予告→回避＆かくせい。魔王シグマと同じ演出システムを使う）
  zeron:{ art:'voltdrake', name:'天秤の魔神ゼロン', role:'tank', rankBase:12, weak:'math', resist:'english', boss:true,
    resists:{ math:'weak', english:'half' }, onhit:{ kind:'paralyze', turns:1, chance:0.25 }, skills:['line'],
    phase:{ hp:0.45, atk:1, def:0, name:'てんびん かくせい', msg:'まだだ…！ 天秤は かたむいてなど いない！' },
    charge:{ name:'てんびん くずし', aoe:'cross', power:150, mp:5, warn:'ゼロンが 天秤を かたむけている…！ つぎのターン 大技！ 赤いマスから にげろ！' } },
  mathfinal:{ art:'dragon', name:'入試魔竜ファイナル', role:'attacker', rankBase:15, weak:'math', resist:'english', boss:true,
    resists:{ math:'weak', english:'half' }, onhit:{ kind:'poison', turns:2, chance:0.3 }, skills:['line','burstball'],
    phase:{ hp:0.5, atk:1, def:1, name:'さいしゅう けいたい', msg:'まだだ！ 入試は ここからが 本番だぞ…！' },
    charge:{ name:'ファイナル・ジャッジ', aoe:'burst', power:190, mp:6, warn:'ファイナルが ちからを ためている…！ つぎのターン 超大技！ 赤いマスから にげろ！' } },
  // ===== 教科モンスター（他4大陸の物語モード用。zako＝雑魚 / boss＝章ボス / lt＝5章幹部 / fin＝10章最終） =====
  // ことばの大陸（japanese）
  inkblob: { art:'inkblob',  name:'インクブロブ',   role:'mage',    rankBase:7,  weak:'japanese', resist:'math',   resists:{ japanese:'weak', math:'half' }, skills:['poisonbreath'] },
  fudebird:{ art:'fudebird', name:'ふでどり',       role:'attacker',rankBase:7,  weak:'japanese', resist:'social', resists:{ japanese:'weak', social:'half' }, onhit:{ kind:'paralyze', turns:1, chance:0.2 } },
  kanjioni:{ art:'kanjioni', name:'漢字おに',       role:'tank',    rankBase:10, weak:'japanese', resist:'math',   resists:{ japanese:'weak', math:'half' }, onhit:{ kind:'seal', turns:1, chance:0.25 }, skills:['line'] },
  jp_lt:   { art:'kanjioni', name:'静寂の魔神サイレント', role:'tank', rankBase:12, weak:'japanese', resist:'math', boss:true, resists:{ japanese:'weak', math:'half' }, onhit:{ kind:'seal', turns:1, chance:0.3 }, skills:['line'],
    phase:{ hp:0.45, atk:1, def:0, name:'せいじゃく かくせい', msg:'…しずかに しろ。言葉など 消えて しまえ！' },
    charge:{ name:'サイレンス', aoe:'cross', power:150, mp:5, warn:'サイレントが 音を 消していく…！ つぎのターン 大技！ 赤いマスから にげろ！' } },
  jp_fin:  { art:'kanjioni', name:'国語魔王おに', role:'tank', rankBase:15, weak:'japanese', resist:'math', boss:true, resists:{ japanese:'weak', math:'half' }, onhit:{ kind:'seal', turns:2, chance:0.3 }, skills:['line','burstball'],
    phase:{ hp:0.5, atk:1, def:1, name:'ことば かいほう', msg:'まだ 言葉は のこっている…！ おまえの 声で しめして みろ！' },
    charge:{ name:'ことだま・ほうかい', aoe:'burst', power:185, mp:6, warn:'国語魔王が ちからを ためている…！ つぎのターン 超大技！ 赤いマスから にげろ！' } },
  // アルファベット大陸（english）
  abcube:  { art:'abcube',   name:'ABキューブ',     role:'tank',    rankBase:8,  weak:'english',  resist:'science',resists:{ english:'weak', science:'half' } },
  qbird:   { art:'qbird',    name:'クエスチョンバード', role:'attacker', rankBase:7, weak:'english', resist:'math', resists:{ english:'weak', math:'half' } },
  grammaro:{ art:'grammaro', name:'文法モロー',     role:'mage',    rankBase:10, weak:'english',  resist:'science',resists:{ english:'weak', science:'half' }, skills:['burstball'] },
  en_lt:   { art:'grammaro', name:'混沌の魔神バベル', role:'mage', rankBase:12, weak:'english', resist:'science', boss:true, resists:{ english:'weak', science:'half' }, onhit:{ kind:'paralyze', turns:1, chance:0.25 }, skills:['burstball'],
    phase:{ hp:0.45, atk:1, def:0, name:'こんとん かくせい', msg:'言葉を もっと バラバラに してやる！' },
    charge:{ name:'バベル・ノイズ', aoe:'cross', power:150, mp:5, warn:'バベルが 言葉を みだしている…！ つぎのターン 大技！ 赤いマスから にげろ！' } },
  en_fin:  { art:'grammaro', name:'英語魔王モロー', role:'mage', rankBase:15, weak:'english', resist:'science', boss:true, resists:{ english:'weak', science:'half' }, onhit:{ kind:'paralyze', turns:1, chance:0.3 }, skills:['burstball','line'],
    phase:{ hp:0.5, atk:1, def:1, name:'さいご の こうぶん', msg:'まだ 文は こわれておらん！ 主語と 動詞、思い出して みろ！' },
    charge:{ name:'グランド・グラマー', aoe:'burst', power:185, mp:6, warn:'英語魔王が ちからを ためている…！ つぎのターン 超大技！ 赤いマスから にげろ！' } },
  // じっけんの大陸（science／通常ボスは既存 voltdrake を流用）
  microbe: { art:'microbe',  name:'びせいぶつ',     role:'healer',  rankBase:6,  weak:'science',  resist:'social', resists:{ science:'weak', social:'half' }, skills:['heal'] },
  flaskun: { art:'flaskun',  name:'フラスコん',     role:'mage',    rankBase:7,  weak:'science',  resist:'english',resists:{ science:'weak', english:'half' }, onhit:{ kind:'poison', turns:2, chance:0.25 }, skills:['poisonbreath'] },
  sci_lt:  { art:'voltdrake',name:'まやかしの魔神ペテル', role:'mage', rankBase:12, weak:'science', resist:'social', boss:true, resists:{ science:'weak', social:'half' }, onhit:{ kind:'paralyze', turns:1, chance:0.25 }, skills:['numbing'],
    phase:{ hp:0.45, atk:1, def:0, name:'まやかし かくせい', msg:'世界の しくみなど、見せて やらぬ！' },
    charge:{ name:'まやかしの いかずち', aoe:'cross', power:150, mp:5, warn:'ペテルが まやかしを ためている…！ つぎのターン 大技！ 赤いマスから にげろ！' } },
  sci_fin: { art:'voltdrake',name:'理科魔王ボルト', role:'mage', rankBase:15, weak:'science', resist:'social', boss:true, resists:{ science:'weak', social:'half' }, onhit:{ kind:'paralyze', turns:1, chance:0.3 }, skills:['numbing','burstball'],
    phase:{ hp:0.5, atk:1, def:1, name:'さいだい しゅつりょく', msg:'なぜ？の こころが ある かぎり…だが、まだ 終わらぬ！' },
    charge:{ name:'ギガ・ボルテージ', aoe:'burst', power:185, mp:6, warn:'理科魔王が ちからを ためている…！ つぎのターン 超大技！ 赤いマスから にげろ！' } },
  // れきしの大陸（social）
  mapmoth: { art:'mapmoth',  name:'マップモス',     role:'attacker',rankBase:7,  weak:'social',   resist:'japanese',resists:{ social:'weak', japanese:'half' } },
  haniwa:  { art:'haniwa',   name:'はにわ',         role:'tank',    rankBase:8,  weak:'social',   resist:'math',   resists:{ social:'weak', math:'half' } },
  tokiou:  { art:'tokiou',   name:'トキ王',         role:'attacker',rankBase:10, weak:'social',   resist:'japanese',resists:{ social:'weak', japanese:'half' }, onhit:{ kind:'sleep', turns:1, chance:0.2 }, skills:['line'] },
  so_lt:   { art:'tokiou',   name:'忘却の魔神レーテ', role:'tank', rankBase:12, weak:'social', resist:'japanese', boss:true, resists:{ social:'weak', japanese:'half' }, onhit:{ kind:'sleep', turns:1, chance:0.25 }, skills:['line'],
    phase:{ hp:0.45, atk:1, def:0, name:'ぼうきゃく かくせい', msg:'すべて 忘れて しまえ…！ 過去など いらぬ！' },
    charge:{ name:'わすれの きり', aoe:'cross', power:150, mp:5, warn:'レーテが 記憶を けしていく…！ つぎのターン 大技！ 赤いマスから にげろ！' } },
  so_fin:  { art:'tokiou',   name:'社会魔王トキ', role:'attacker', rankBase:15, weak:'social', resist:'japanese', boss:true, resists:{ social:'weak', japanese:'half' }, onhit:{ kind:'sleep', turns:1, chance:0.3 }, skills:['line','burstball'],
    phase:{ hp:0.5, atk:1, def:1, name:'れきし さいげん', msg:'まだ 歴史は おわらぬ！ 昨日を 知る者だけが、明日を えらべる…！' },
    charge:{ name:'エターナル・エラ', aoe:'burst', power:185, mp:6, warn:'社会魔王が ちからを ためている…！ つぎのターン 超大技！ 赤いマスから にげろ！' } },
  mender: { art:'qbird',   name:'いやしのトリ', role:'healer',  rankBase:7,  weak:'english',  resist:'japanese',
    resists:{ english:'weak', japanese:'half' }, skills:['heal'] },
  cheerer:{ art:'grammaro', name:'おうえんのホン', role:'mage',  rankBase:7,  weak:'japanese', resist:'social',
    resists:{ japanese:'weak', social:'half' }, skills:['bikilt'] },
  villain:{ art:'villain', name:'魔王シグマ', role:'tank',     rankBase:16, weak:'math',     resist:'japanese', boss:true,
    resists:{ math:'weak', japanese:'half', social:'null', english:'drain' }, onhit:{ kind:'poison', turns:3, chance:0.4 }, skills:['burstball','poisonbreath'],
    phase:{ hp:0.5, atk:1, def:1, name:'かくせい', msg:'ぐ…ぬぬ！ まだ おわらん！ ほんきを だすぞ！' },
    charge:{ name:'めつぼうの いちげき', aoe:'burst', power:210, mp:6, warn:'魔王が ちからを ためている…！ つぎのターン 大技が くる！ 赤いマスから にげろ！' } }
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
    enemies:[{key:'goblin',x:1,y:1,lvl:3},{key:'slime',x:4,y:1,lvl:3},{key:'bat',x:3,y:2,lvl:2}] },
  arena3: { id:'arena3', name:'うでだめしの闘技場', grid:{ w:6, h:7 }, continent:'math', type:'training',
    allySlots:[{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:2,y:5}],
    enemies:[{key:'dragon',x:1,y:1,lvl:4},{key:'voltdrake',x:4,y:1,lvl:4},{key:'wolf',x:3,y:0,lvl:3}] },
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
    waves:[[{key:'ghost',x:1,y:0,lvl:6},{key:'mender',x:4,y:0,lvl:6}]],   // 回復役つき増援＝先に倒す判断が生まれる
    enemies:[{key:'wolf',x:1,y:2,lvl:6},{key:'ghost',x:4,y:2,lvl:6},{key:'goblin',x:2,y:1,lvl:5},{key:'dragon',x:3,y:1,lvl:8}] },
  q_maou: { id:'q_maou', name:'魔王城：さいごの決戦', grid:{ w:6, h:7 }, continent:'math', type:'quest', boss:'魔王シグマ',
    story:['5つの クリスタルが かがやきを とりもどした。','魔王シグマが さいごの 力で たちはだかる！','「いくぞ！ みんなの 力を あわせて！」'],
    allySlots:[{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:2,y:5}],
    terrain:[{x:2,y:3,kind:'fire'},{x:3,y:3,kind:'fire'},{x:0,y:6,kind:'heal'},{x:5,y:6,kind:'heal'},{x:3,y:2,kind:'poison'}],
    blocks:[{x:0,y:4,kind:'water'},{x:5,y:4,kind:'water'}],
    waves:[[{key:'wolf',x:0,y:1,lvl:8},{key:'cheerer',x:5,y:1,lvl:8}]],   // 応援役つき増援
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
  var keys = Object.keys(SRPG_ENEMY_TEMPLATES).filter(function(k){ return !SRPG_ENEMY_TEMPLATES[k].boss; });   // 物語ボス（villain/zeron/mathfinal）は周回に出さない
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
  var keys = Object.keys(SRPG_ENEMY_TEMPLATES).filter(function(k){ return !SRPG_ENEMY_TEMPLATES[k].boss; });   // ボスは塔に出さない（villain/zeron/mathfinal）
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

// ===== 物語モード：大陸アーク（1大陸＝10章、1章＝3ノード＝雑魚2＋章ボス） =====
// データ駆動。SRPG_CONTINENTS から srpgChapterStage() がステージを動的生成する。
// forceWeak: その大陸の教科を全敵の弱点にして、学習（教科えらび攻撃）と物語を一致させる。
var SRPG_CONTINENTS = {
  math: {
    name:'数の大陸', subject:'math', teacher:'コタロウ先生', teacherArt:'shiba',
    crystalId:'q_math', crystalName:'かずのクリスタル', emoji:'🔢',
    chapters:[
      { title:'計算の平原',   topic:'整数と小数',       lvl:1,  mons:['slime','goblin'], boss:'計算王スラッグ',    bossMon:'slugking', nodes:['たしざんの野原','ひきざんの丘','スラッグ王の砦'] },
      { title:'分数の谷',     topic:'分数のかけ算・わり算', lvl:2,  mons:['slime','wolf'],   boss:'通分キングスラッグ', bossMon:'slugking', nodes:['やくぶんの谷','つうぶんの淵','キングの間'] },
      { title:'正負の草原',   topic:'正負の数',         lvl:3,  mons:['goblin','bat'],   boss:'正負王スラッグ',    bossMon:'slugking', nodes:['プラスの丘','マイナスの沼','ぜったいちの祭壇'] },
      { title:'文字式の森',   topic:'文字と式',         lvl:4,  mons:['trent','slime'],  boss:'式変形スラッグ',    bossMon:'slugking', nodes:['文字の茂み','代入の泉','移項の広場'] },
      { title:'方程式の遺跡', topic:'一次方程式',       lvl:5,  mons:['ghost','wolf'],   boss:'天秤の魔神ゼロン',  bossMon:'zeron',    nodes:['移項の回廊','解の間','天秤の祭壇'], lieutenant:true },
      { title:'比例の丘',     topic:'比例と反比例',     lvl:6,  mons:['wolf','trent'],   boss:'関数竜プロポル',    bossMon:'dragon',   nodes:['比例の坂','反比例の谷','グラフの丘'] },
      { title:'図形の神殿',   topic:'平面と空間の図形', lvl:7,  mons:['trent','ghost'],  boss:'図形竜ジオドラ',    bossMon:'dragon',   nodes:['おうぎ形の門','立体の広間','展開図の回廊'] },
      { title:'連立の魔洞',   topic:'連立方程式と一次関数', lvl:8, mons:['ghost','wolf'], boss:'関数魔竜リニア',    bossMon:'dragon',   nodes:['連立の洞','代入の淵','交点の間'] },
      { title:'証明の霊峰',   topic:'図形の証明と確率', lvl:9,  mons:['ghost','trent'],  boss:'証明幻竜プルーフ',  bossMon:'dragon',   nodes:['合同の尾根','証明の頂','確率の祠'] },
      { title:'入試の魔宮',   topic:'規則性・関数と図形の融合', lvl:10, mons:['ghost','wolf'], boss:'入試魔竜ファイナル', bossMon:'mathfinal', nodes:['規則性の間','融合の回廊','ファイナルの玉座'], finale:true }
    ]
  },
  japanese: {
    name:'ことばの大陸', subject:'japanese', teacher:'ミケ先生', teacherArt:'cat',
    crystalId:'q_japanese', crystalName:'ことばのクリスタル', emoji:'📖',
    chapters:[
      { title:'ことばの野原', topic:'漢字の読み書き', lvl:1, mons:['inkblob','fudebird'], boss:'漢字おに小僧', bossMon:'kanjioni', nodes:['音読みインク','訓読みふでどり','漢字おに小僧'] },
      { title:'ことわざの林', topic:'語句・ことわざ', lvl:2, mons:['fudebird','inkblob'], boss:'語句おに', bossMon:'kanjioni', nodes:['ことわざふでどり','慣用句インク','語句おに'] },
      { title:'品詞の谷', topic:'言葉の種類・品詞', lvl:3, mons:['inkblob','fudebird'], boss:'品詞おに', bossMon:'kanjioni', nodes:['名詞インク','動詞ふでどり','品詞おに'] },
      { title:'文の森', topic:'文の組み立て・文節', lvl:4, mons:['fudebird','inkblob'], boss:'文法おに大将', bossMon:'kanjioni', nodes:['文節ふでどり','主語インク','文法おに大将'] },
      { title:'説明文の遺跡', topic:'説明文の読解', lvl:5, mons:['inkblob','fudebird'], boss:'静寂の魔神サイレント', bossMon:'jp_lt', nodes:['段落インク','要点ふでどり','静寂の魔神サイレント'], lieutenant:true },
      { title:'物語の館', topic:'小説・物語の読解', lvl:6, mons:['fudebird','inkblob'], boss:'物語おに', bossMon:'kanjioni', nodes:['心情ふでどり','情景インク','物語おに'] },
      { title:'詩歌の丘', topic:'詩・短歌・俳句', lvl:7, mons:['inkblob','fudebird'], boss:'詩歌おに', bossMon:'kanjioni', nodes:['短歌インク','俳句ふでどり','詩歌おに'] },
      { title:'古文の社', topic:'古文入門', lvl:8, mons:['fudebird','inkblob'], boss:'古文魔おに', bossMon:'kanjioni', nodes:['歴史仮名ふでどり','古語インク','古文魔おに'] },
      { title:'記述の霊堂', topic:'記述・要約', lvl:9, mons:['inkblob','fudebird'], boss:'記述幻おに', bossMon:'kanjioni', nodes:['要約インク','記述ふでどり','記述幻おに'] },
      { title:'論説の魔殿', topic:'論説文・要旨', lvl:10, mons:['fudebird','inkblob'], boss:'国語魔王おに', bossMon:'jp_fin', nodes:['論理ふでどり','要旨インク','国語魔王おに'], finale:true }
    ]
  },
  english: {
    name:'アルファベット大陸', subject:'english', teacher:'ラビィ先生', teacherArt:'rabbit',
    crystalId:'q_english', crystalName:'英語のクリスタル', emoji:'🔤',
    chapters:[
      { title:'アルファベット草原', topic:'アルファベットとローマ字', lvl:1, mons:['abcube','qbird'], boss:'文法モロー見習い', bossMon:'grammaro', nodes:['大文字キューブ','小文字バード','文法モロー見習い'] },
      { title:'あいさつの村', topic:'あいさつ・基本単語', lvl:2, mons:['qbird','abcube'], boss:'あいさつモロー', bossMon:'grammaro', nodes:['グリーティングバード','単語キューブ','あいさつモロー'] },
      { title:'be動詞の丘', topic:'be動詞', lvl:3, mons:['abcube','qbird'], boss:'be動詞モロー', bossMon:'grammaro', nodes:['am/isキューブ','areバード','be動詞モロー'] },
      { title:'動詞の森', topic:'一般動詞', lvl:4, mons:['qbird','abcube'], boss:'動詞モロー将軍', bossMon:'grammaro', nodes:['三単現バード','否定doキューブ','動詞モロー将軍'] },
      { title:'複数形の谷', topic:'名詞の複数形', lvl:5, mons:['abcube','qbird'], boss:'混沌の魔神バベル', bossMon:'en_lt', nodes:['複数sキューブ','esバード','混沌の魔神バベル'], lieutenant:true },
      { title:'進行形の湖', topic:'代名詞・現在進行形', lvl:6, mons:['qbird','abcube'], boss:'進行モロー', bossMon:'grammaro', nodes:['代名詞バード','ingキューブ','進行モロー'] },
      { title:'過去の遺跡', topic:'canや過去形', lvl:7, mons:['abcube','qbird'], boss:'過去モロー', bossMon:'grammaro', nodes:['canキューブ','過去形バード','過去モロー'] },
      { title:'比較の魔峠', topic:'不定詞・比較', lvl:8, mons:['qbird','abcube'], boss:'比較魔モロー', bossMon:'grammaro', nodes:['不定詞バード','比較級キューブ','比較魔モロー'] },
      { title:'完了の霊塔', topic:'受け身・現在完了', lvl:9, mons:['abcube','qbird'], boss:'完了幻モロー', bossMon:'grammaro', nodes:['受け身キューブ','現在完了バード','完了幻モロー'] },
      { title:'長文の魔城', topic:'長文読解・整序英作文', lvl:10, mons:['qbird','abcube'], boss:'英語魔王モロー', bossMon:'en_fin', nodes:['長文バード','整序キューブ','英語魔王モロー'], finale:true }
    ]
  },
  science: {
    name:'じっけんの大陸', subject:'science', teacher:'ナナ博士', teacherArt:'fox',
    crystalId:'q_science', crystalName:'理科のクリスタル', emoji:'🧪',
    chapters:[
      { title:'観察の草はら', topic:'身のまわりの生物', lvl:1, mons:['microbe','flaskun'], boss:'観察ボルト', bossMon:'voltdrake', nodes:['ルーペびせいぶつ','こんちゅうフラスコ','観察ボルト'] },
      { title:'天気の丘', topic:'天気と季節', lvl:2, mons:['flaskun','microbe'], boss:'天気ボルト', bossMon:'voltdrake', nodes:['雲フラスコ','気温びせいぶつ','天気ボルト'] },
      { title:'植物の森', topic:'植物のつくり', lvl:3, mons:['microbe','flaskun'], boss:'植物ボルト', bossMon:'voltdrake', nodes:['葉っぱびせいぶつ','花フラスコ','植物ボルト'] },
      { title:'物質の実験室', topic:'身のまわりの物質', lvl:4, mons:['flaskun','microbe'], boss:'物質ボルト', bossMon:'voltdrake', nodes:['金属フラスコ','気体びせいぶつ','物質ボルト'] },
      { title:'光と音の谷', topic:'光・音・力', lvl:5, mons:['flaskun','microbe'], boss:'まやかしの魔神ペテル', bossMon:'sci_lt', nodes:['反射フラスコ','音波びせいぶつ','まやかしの魔神ペテル'], lieutenant:true },
      { title:'水溶液の湖', topic:'水溶液と状態変化', lvl:6, mons:['microbe','flaskun'], boss:'溶液電竜ボルト', bossMon:'voltdrake', nodes:['溶解びせいぶつ','ろ過フラスコ','溶液電竜ボルト'] },
      { title:'大地の洞窟', topic:'大地の変化', lvl:7, mons:['flaskun','microbe'], boss:'大地電竜ボルト', bossMon:'voltdrake', nodes:['地層フラスコ','火山びせいぶつ','大地電竜ボルト'] },
      { title:'化学変化の魔炉', topic:'化学変化と原子・分子', lvl:8, mons:['flaskun','microbe'], boss:'化学魔竜ボルト', bossMon:'voltdrake', nodes:['化学式フラスコ','酸化びせいぶつ','化学魔竜ボルト'] },
      { title:'電流の霊塔', topic:'電流と磁界', lvl:9, mons:['microbe','flaskun'], boss:'電流幻竜ボルト', bossMon:'voltdrake', nodes:['オームびせいぶつ','電流フラスコ','電流幻竜ボルト'] },
      { title:'理科の魔天文台', topic:'総合・記述', lvl:10, mons:['flaskun','microbe'], boss:'理科魔王ボルト', bossMon:'sci_fin', nodes:['天体フラスコ','遺伝びせいぶつ','理科魔王ボルト'], finale:true }
    ]
  },
  social: {
    name:'れきしの大陸', subject:'social', teacher:'クマ先生', teacherArt:'bear',
    crystalId:'q_social', crystalName:'社会のクリスタル', emoji:'🗺️',
    chapters:[
      { title:'地図の平野', topic:'地図と都道府県', lvl:1, mons:['mapmoth','haniwa'], boss:'地図王トキ', bossMon:'tokiou', nodes:['方位マップモス','県庁はにわ','地図王トキ'] },
      { title:'くらしの里', topic:'日本のくらしと産業', lvl:2, mons:['haniwa','mapmoth'], boss:'産業王トキ', bossMon:'tokiou', nodes:['農業はにわ','工業マップモス','産業王トキ'] },
      { title:'世界の大地', topic:'世界の姿と地理', lvl:3, mons:['mapmoth','haniwa'], boss:'世界王トキ', bossMon:'tokiou', nodes:['六大陸マップモス','三海洋はにわ','世界王トキ'] },
      { title:'日本の山河', topic:'日本の地形と気候', lvl:4, mons:['haniwa','mapmoth'], boss:'地形王トキ', bossMon:'tokiou', nodes:['山脈はにわ','気候マップモス','地形王トキ'] },
      { title:'地方の街道', topic:'日本の地域', lvl:5, mons:['mapmoth','haniwa'], boss:'忘却の魔神レーテ', bossMon:'so_lt', nodes:['地方マップモス','人口はにわ','忘却の魔神レーテ'], lieutenant:true },
      { title:'古代の遺跡', topic:'古代の日本', lvl:6, mons:['haniwa','mapmoth'], boss:'古代王トキ', bossMon:'tokiou', nodes:['縄文はにわ','古墳はにわ','古代王トキ'] },
      { title:'中世の城下', topic:'中世の日本', lvl:7, mons:['haniwa','mapmoth'], boss:'中世魔王トキ', bossMon:'tokiou', nodes:['武士はにわ','幕府マップモス','中世魔王トキ'] },
      { title:'近世の城', topic:'近世の日本', lvl:8, mons:['mapmoth','haniwa'], boss:'近世魔王トキ', bossMon:'tokiou', nodes:['天下統一マップモス','鎖国はにわ','近世魔王トキ'] },
      { title:'近代の霊道', topic:'近代から現代', lvl:9, mons:['haniwa','mapmoth'], boss:'近代幻王トキ', bossMon:'tokiou', nodes:['明治はにわ','大戦マップモス','近代幻王トキ'] },
      { title:'公民の魔議堂', topic:'公民・資料読み取り', lvl:10, mons:['mapmoth','haniwa'], boss:'社会魔王トキ', bossMon:'so_fin', nodes:['憲法マップモス','経済はにわ','社会魔王トキ'], finale:true }
    ]
  }
};
function srpgContinent(area){ return SRPG_CONTINENTS[area] || null; }
function srpgChapterCount(area){ var c = SRPG_CONTINENTS[area]; return c ? c.chapters.length : 0; }
function srpgNodeCount(){ return 3; } // 1章 = 3ノード（雑魚2 + 章ボス）
// 章IDのパース/生成：'c_<area>_<ci>_<ni>'
function srpgChapterId(area, ci, ni){ return 'c_' + area + '_' + ci + '_' + ni; }
function srpgParseChapterId(id){
  if(typeof id !== 'string' || id.indexOf('c_') !== 0) return null;
  var p = id.split('_'); if(p.length < 4) return null;
  var ci = parseInt(p[2],10), ni = parseInt(p[3],10);
  if(isNaN(ci) || isNaN(ni)) return null;
  return { area:p[1], ci:ci, ni:ni };
}
// 章データからステージを動的生成（純粋）。ni: 0,1=雑魚ノード / 2=章ボス。
function srpgChapterStage(area, ci, ni){
  var cont = SRPG_CONTINENTS[area]; if(!cont) return null;
  var ch = cont.chapters[ci]; if(!ch) return null;
  ni = ni | 0; if(ni < 0 || ni > 2) return null;
  var isBoss = (ni === 2);
  var lv = ch.lvl;
  var m0 = ch.mons[0], m1 = ch.mons[1] || ch.mons[0];
  var enemies, terrain = [];
  if(isBoss){
    enemies = [
      { key:m0, x:1, y:1, lvl:lv },
      { key:ch.bossMon, x:3, y:0, lvl:lv + 2 },
      { key:m1, x:4, y:1, lvl:lv }
    ];
    terrain = [{ x:2, y:2, kind:'fire' }, { x:3, y:2, kind:'fire' }, { x:0, y:5, kind:'heal' }];
  } else {
    enemies = [
      { key:m0, x:1, y:1, lvl:lv },
      { key:m1, x:4, y:1, lvl:lv },
      { key:(ni === 0 ? m0 : m1), x:3, y:2, lvl:Math.max(1, lv - 1) }
    ];
    if(lv >= 4){ terrain = [{ x:2, y:3, kind:'poison' }, { x:0, y:5, kind:'heal' }]; }
  }
  var nodeName = (ch.nodes && ch.nodes[ni]) || ch.title;
  return {
    id: srpgChapterId(area, ci, ni),
    name: cont.name + ' ' + (ci + 1) + '-' + (ni + 1) + '：' + nodeName,
    grid:{ w:6, h:7 }, continent:area, type:'chapter',
    chapter:ci, node:ni, isBoss:isBoss, topic:ch.topic, forceWeak:cont.subject,
    boss: isBoss ? ch.boss : null,
    allySlots: SRPG_STD_SLOTS.slice(),
    terrain: terrain, enemies: enemies,
    par: 3 + enemies.length + (isBoss ? 2 : 0)
  };
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
    var weak = t.weak, resist = t.resist, resists = t.resists;
    if(stage.forceWeak){
      // 物語モード：大陸の教科を全敵の弱点に統一（その教科でこうげき＝つよめ）。
      weak = stage.forceWeak; resist = null; resists = {}; resists[stage.forceWeak] = 'weak';
    }
    units.push(srpgMakeUnit({
      id:'enemy' + i, side:'enemy', name:t.name, art:t.art, role:t.role,
      rankBase:t.rankBase, lvl:e.lvl || 1, weak:weak, resist:resist,
      resists:resists, onhit:t.onhit, skills:(t.skills || []), phase:t.phase, charge:t.charge, tmplKey:e.key, x:e.x, y:e.y
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
    srpgTargetBonus: srpgTargetBonus, srpgEnemyPickTarget: srpgEnemyPickTarget, srpgEnemyAction: srpgEnemyAction, srpgDeployZone: srpgDeployZone, srpgCanCounter: srpgCanCounter,
    srpgMakeUnit: srpgMakeUnit, srpgEnemyTemplate: srpgEnemyTemplate, srpgStage: srpgStage,
    srpgSkill: srpgSkill, srpgBuildUnits: srpgBuildUnits,
    srpgSeedRng: srpgSeedRng, srpgDailyStage: srpgDailyStage, srpgTowerStage: srpgTowerStage,
    SRPG_CONTINENTS: SRPG_CONTINENTS, srpgContinent: srpgContinent, srpgChapterCount: srpgChapterCount, srpgNodeCount: srpgNodeCount,
    srpgChapterId: srpgChapterId, srpgParseChapterId: srpgParseChapterId, srpgChapterStage: srpgChapterStage,
    SRPG_MON_SKILL: SRPG_MON_SKILL, srpgMonSkill: srpgMonSkill,
    srpgGridWithBlocks: srpgGridWithBlocks, SRPG_BLOCK_META: SRPG_BLOCK_META, srpgForecast: srpgForecast, srpgStars: srpgStars,
    SRPG_SCOUT_RATES: SRPG_SCOUT_RATES, SRPG_SCOUT_COST: SRPG_SCOUT_COST, srpgScoutRank: srpgScoutRank, srpgScoutTen: srpgScoutTen,
    SRPG_SCOUT_PITY_MAX: SRPG_SCOUT_PITY_MAX, srpgScoutApplyPity: srpgScoutApplyPity, srpgScoutPickups: srpgScoutPickups, srpgScoutArt: srpgScoutArt,
    SRPG_MEDAL_COST: SRPG_MEDAL_COST, srpgMedalCost: srpgMedalCost, srpgDexProgress: srpgDexProgress, SRPG_DEX_REWARDS: SRPG_DEX_REWARDS,
    srpgWaveUnits: srpgWaveUnits, srpgTotalWaves: srpgTotalWaves, srpgAutoPick: srpgAutoPick,
    SRPG_SKLV_MAX: SRPG_SKLV_MAX, srpgSkillPower: srpgSkillPower, srpgInflictChance: srpgInflictChance, srpgSkillUpCanFuse: srpgSkillUpCanFuse,
    SRPG_RANK_ORDER: SRPG_RANK_ORDER, SRPG_EVOLVE_DUPES: SRPG_EVOLVE_DUPES, srpgEvolveNextRank: srpgEvolveNextRank, srpgEvolveCost: srpgEvolveCost, srpgEvolveCanDo: srpgEvolveCanDo,
    srpgBossPhaseReady: srpgBossPhaseReady, srpgAoeBestCenter: srpgAoeBestCenter,
    SRPG_CRYSTALS: SRPG_CRYSTALS, srpgCrystalsFrom: srpgCrystalsFrom, srpgCrystalCount: srpgCrystalCount, srpgCrystalFor: srpgCrystalFor
  };
}
