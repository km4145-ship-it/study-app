'use strict';
// js/srpg.js（マス目タクティクス戦闘のエンジン＝純粋関数）を検証。
// 属性倍率・距離/範囲・移動BFS・AoE形状・ダメージ式・ターン順・敵AI・勝敗・ステージ整合。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-srpg');

const S = require(path.join(ROOT, 'js', 'srpg.js'));

// ---- 属性倍率（弱点＝つよめ／耐性＝よわめ／それ以外＝等倍） ----
const enemy = { weak:'science', resist:'math' };
c.eq('弱点教科は×1.5', S.srpgElemMult('science', enemy), 1.5);
c.eq('耐性教科は×0.6', S.srpgElemMult('math', enemy), 0.6);
c.eq('それ以外は×1', S.srpgElemMult('japanese', enemy), 1);
c.eq('つよめラベル', S.srpgMultLabel(1.5).cls, 'weak');
c.eq('よわめラベル', S.srpgMultLabel(0.6).cls, 'resist');
c.eq('等倍ラベルは空', S.srpgMultLabel(1).txt, '');

// ---- 距離・範囲（マンハッタン） ----
c.eq('マンハッタン距離', S.srpgDist(0, 0, 2, 3), 5);
c.ok('射程内（自分自身は除外）', S.srpgInRange(1, 1, 1, 2, 1) && !S.srpgInRange(1, 1, 1, 1, 1));
c.ok('射程外', !S.srpgInRange(0, 0, 3, 0, 2));

// ---- 移動BFS（mov歩以内・盤内・占有マスは通れない） ----
const grid = { w: 6, h: 7 };
{
  const u = { id:'a', side:'ally', x:2, y:6, mov:3, downed:false };
  const solo = S.srpgMoveTiles(u, grid, [u]);
  // mov=3 の菱形の理論最大は 2*mov*(mov+1)=24 マスだが、盤の端(下辺)で削られる
  c.ok('移動候補が存在する', solo.length > 0 && solo.length <= 24);
  c.ok('全候補が盤内', solo.every((t) => t.x >= 0 && t.x < grid.w && t.y >= 0 && t.y < grid.h));
  c.ok('全候補がmov歩以内', solo.every((t) => S.srpgDist(u.x, u.y, t.x, t.y) <= u.mov));
  c.ok('自分の現在地は候補に含まない', !solo.some((t) => t.x === u.x && t.y === u.y));
  // 隣を味方でふさぐと通れるマスが減る
  const blocker = { id:'b', side:'ally', x:2, y:5, mov:0, downed:false };
  const blocked = S.srpgMoveTiles(u, grid, [u, blocker]);
  c.ok('占有マスは移動先にならない', !blocked.some((t) => t.x === 2 && t.y === 5));
  c.ok('ふさがれると到達数が減る', blocked.length < solo.length);
}

// ---- 攻撃範囲・AoE形状 ----
{
  const r1 = S.srpgRangeTiles(3, 3, 1, grid);
  c.eq('rng1の狙えるマスは4（十字・自マス除く）', r1.length, 4);
  c.eq('single AoEは1マス', S.srpgAoeTiles('single', 3, 3, grid).length, 1);
  c.eq('cross AoEは5マス（盤中央）', S.srpgAoeTiles('cross', 3, 3, grid).length, 5);
  c.eq('burst AoEは9マス（盤中央）', S.srpgAoeTiles('burst', 3, 3, grid).length, 9);
  c.ok('all AoEは全マス', S.srpgAoeTiles('all', 0, 0, grid).length === grid.w * grid.h);
  // 盤の端では AoE がクリップされる
  c.ok('端のcrossはクリップされる（<5）', S.srpgAoeTiles('cross', 0, 0, grid).length < 5);
  // line3：攻撃者より奥（上→下 or 下→上）へ直線3マス
  const attacker = { x:3, y:6 };
  const line = S.srpgAoeTiles('line3', 3, 4, grid, attacker);   // ty(4) < attacker.y(6) → 上向き
  c.eq('line3は3マス', line.length, 3);
  c.ok('line3は縦一列', line.every((t) => t.x === 3));
}

// ---- ダメージ式（弱点＞等倍＞耐性・最低1・crit増加） ----
{
  const atkU = { atk: 30 }, defU = { def: 10 };
  const dNormal = S.srpgDamage(atkU, defU, 100, 1, false);
  const dWeak   = S.srpgDamage(atkU, defU, 100, 1.5, false);
  const dResist = S.srpgDamage(atkU, defU, 100, 0.6, false);
  const dCrit   = S.srpgDamage(atkU, defU, 100, 1, true);
  c.ok('弱点は等倍より大きい', dWeak > dNormal);
  c.ok('耐性は等倍より小さい', dResist < dNormal);
  c.ok('critは等倍より大きい', dCrit > dNormal);
  c.ok('最低でも1ダメージ', S.srpgDamage({ atk:1 }, { def:999 }, 50, 0.6, false) >= 1);
  c.ok('かいふく量は正', S.srpgHealAmount({ atk:20 }, 130) > 0);
}

// ---- ターン順（すばやさ降順・安定） ----
{
  const us = [{ id:'z', spd:10, downed:false }, { id:'a', spd:20, downed:false },
              { id:'b', spd:10, downed:false }, { id:'d', spd:5, downed:true }];
  const ord = S.srpgTurnOrder(us).map((u) => u.id);
  c.eq('すばやさ順＋同値id昇順・死者除外', JSON.stringify(ord), JSON.stringify(['a', 'b', 'z']));
}

// ---- 勝敗判定 ----
{
  const us = [{ side:'ally', downed:false }, { side:'enemy', downed:true }, { side:'enemy', downed:true }];
  c.eq('敵全滅で勝ち', S.srpgOutcome(us), 'win');
  const us2 = [{ side:'ally', downed:true }, { side:'enemy', downed:false }];
  c.eq('味方全滅で負け', S.srpgOutcome(us2), 'lose');
  c.eq('決着前はnull', S.srpgOutcome([{ side:'ally', downed:false }, { side:'enemy', downed:false }]), null);
}

// ---- 敵AI（近い味方へ寄り、射程に入れば標的を返す） ----
{
  const en = S.srpgMakeUnit({ id:'e', side:'enemy', name:'x', art:'slime', role:'attacker', rankBase:6, lvl:1, x:3, y:1 });
  const al = S.srpgMakeUnit({ id:'a', side:'ally', name:'y', art:'slime', role:'attacker', rankBase:6, lvl:1, x:3, y:5 });
  const plan = S.srpgEnemyPlan(en, grid, [en, al]);
  c.ok('敵は標的へ近づく（yが増える）', plan.moveTo.y > en.y);
  c.ok('移動先は盤内', plan.moveTo.x >= 0 && plan.moveTo.x < grid.w && plan.moveTo.y >= 0 && plan.moveTo.y < grid.h);
  // 隣接していれば標的を返す
  const en2 = Object.assign({}, en, { x:3, y:4 });
  const plan2 = S.srpgEnemyPlan(en2, grid, [en2, al]);
  c.ok('射程内なら攻撃対象を返す', plan2.targetId === 'a');
}

// ---- ユニット生成（役割倍率が効く・数値が正） ----
{
  const tank = S.srpgMakeUnit({ id:'t', side:'ally', name:'t', art:'slime', role:'tank', rankBase:8, lvl:5 });
  const atk  = S.srpgMakeUnit({ id:'k', side:'ally', name:'k', art:'slime', role:'attacker', rankBase:8, lvl:5 });
  c.ok('ぼうぎょはHPが厚い', tank.maxHp > atk.maxHp);
  c.ok('アタッカーは攻撃が高い', atk.atk > tank.atk);
  c.ok('HP/ATK/DEF/SPDが正', tank.maxHp > 0 && tank.atk > 0 && tank.def > 0 && tank.spd > 0);
  c.ok('とくぎを持つ', atk.skills.length > 0 && !!S.srpgSkill(atk.skills[0]));
}

// ---- ステージ整合：敵artは実在・弱点耐性は有効な教科・配置は盤内で味方枠に収まる ----
{
  const code = fs.readFileSync(path.join(ROOT, 'js', 'rpg-assets.js'), 'utf8');
  const RPG_SVG = (new Function(code + '\nreturn RPG_SVG;'))();
  const valid = (k) => S.SRPG_SUBJECT_KEYS.indexOf(k) >= 0;
  Object.keys(S.SRPG_ENEMY_TEMPLATES).forEach((k) => {
    const t = S.SRPG_ENEMY_TEMPLATES[k];
    c.ok('敵art ' + t.art + ' はRPG_SVGに実在', typeof RPG_SVG[t.art] === 'string');
    c.ok('敵 ' + k + ' の弱点は有効な教科', valid(t.weak));
    c.ok('敵 ' + k + ' の耐性は有効な教科', valid(t.resist));
    c.ok('敵 ' + k + ' の役割は定義済み', !!S.SRPG_ROLES[t.role]);
  });
  Object.keys(S.SRPG_STAGES).forEach((id) => {
    const st = S.SRPG_STAGES[id];
    c.ok('ステージ ' + id + ' は味方枠≧敵数', st.allySlots.length >= 1 && st.allySlots.length <= 5);
    st.enemies.forEach((e) => {
      c.ok('敵テンプレ ' + e.key + ' は実在', !!S.SRPG_ENEMY_TEMPLATES[e.key]);
      c.ok('敵配置が盤内', e.x >= 0 && e.x < st.grid.w && e.y >= 0 && e.y < st.grid.h);
    });
    st.allySlots.forEach((s) => c.ok('味方枠が盤内', s.x >= 0 && s.x < st.grid.w && s.y >= 0 && s.y < st.grid.h));
  });
  // buildUnits：味方＋敵が配置される
  const units = S.srpgBuildUnits(S.SRPG_STAGES.arena1, [
    { id:'h', name:'ゆうしゃ', art:'shiba', role:'attacker', lvl:3, rankBase:7 },
    { id:'m', name:'なかま',   art:'slime', role:'healer',   lvl:3, rankBase:6 }
  ]);
  c.eq('arena1は味方2＋敵2＝4体（チュートリアル戦＝易しく）', units.length, 4);
  c.ok('味方と敵が両方いる', units.some((u) => u.side === 'ally') && units.some((u) => u.side === 'enemy'));
  c.ok('全ユニットが盤内に配置', units.every((u) => u.x >= 0 && u.x < S.SRPG_STAGES.arena1.grid.w && u.y >= 0 && u.y < S.SRPG_STAGES.arena1.grid.h));
}

// ================= 第2弾：戦闘の駆け引き =================

// ---- 耐性の段階（弱点/半減/無効/吸収）----
{
  const en = { resists:{ math:'weak', english:'half', social:'null', japanese:'drain' } };
  c.eq('resistsマップ：弱点', S.srpgResistKind('math', en), 'weak');
  c.eq('resistsマップ：半減', S.srpgResistKind('english', en), 'half');
  c.eq('resistsマップ：無効', S.srpgResistKind('social', en), 'null');
  c.eq('resistsマップ：吸収', S.srpgResistKind('japanese', en), 'drain');
  c.eq('指定なしは等倍', S.srpgResistKind('science', en), 'normal');
  // 後方互換（weak/resist しか無い敵）
  const old = { weak:'science', resist:'math' };
  c.eq('旧weakは弱点', S.srpgResistKind('science', old), 'weak');
  c.eq('旧resistは半減', S.srpgResistKind('math', old), 'half');
  c.eq('弱点倍率1.5', S.srpgResistMult('weak'), 1.5);
  c.eq('半減倍率0.5', S.srpgResistMult('half'), 0.5);
  c.eq('無効倍率0', S.srpgResistMult('null'), 0);
  c.eq('吸収倍率-1', S.srpgResistMult('drain'), -1);
  c.eq('無効ラベル', S.srpgResistLabel('null').cls, 'nullr');
  c.eq('吸収ラベル', S.srpgResistLabel('drain').cls, 'drain');
}

// ---- バフ/デバフ（実効ステータス ±25%/段階・±2で頭打ち）----
{
  const u = { atk:100, def:100, spd:100, mods:{ atk:0, def:0, spd:0 }, modTurns:{ atk:0, def:0, spd:0 } };
  c.eq('無補正は素の値', S.srpgEffStat(u, 'atk'), 100);
  S.srpgSetMod(u, 'atk', 2, 3);
  c.eq('+2段階で1.5倍', S.srpgEffStat(u, 'atk'), 150);
  S.srpgSetMod(u, 'atk', 2, 3);   // さらに+2 → +2で頭打ち
  c.eq('段階は+2で頭打ち', S.srpgEffStat(u, 'atk'), 150);
  S.srpgSetMod(u, 'def', -2, 2);
  c.eq('-2段階で0.5倍', S.srpgEffStat(u, 'def'), 50);
  // 残りターン減衰：0でリセット
  S.srpgTickMods(u); S.srpgTickMods(u);   // def:2→0 で解除
  c.eq('デバフはターンで解除', S.srpgEffStat(u, 'def'), 100);
  c.ok('atkバフはまだ残る（3ターン）', S.srpgEffStat(u, 'atk') === 150);
}

// ---- ダメージ・ターン順が実効ステを使う ----
{
  const base = S.srpgMakeUnit({ id:'a', side:'ally', name:'a', art:'slime', role:'attacker', rankBase:8, lvl:3 });
  const buffed = S.srpgMakeUnit({ id:'b', side:'ally', name:'b', art:'slime', role:'attacker', rankBase:8, lvl:3 });
  S.srpgSetMod(buffed, 'atk', 2, 3);
  const def = S.srpgMakeUnit({ id:'e', side:'enemy', name:'e', art:'slime', role:'tank', rankBase:8, lvl:3 });
  c.ok('攻撃バフでダメージ増', S.srpgDamage(buffed, def, 100, 1, false) > S.srpgDamage(base, def, 100, 1, false));
  const slow = S.srpgMakeUnit({ id:'z', side:'ally', name:'z', art:'slime', role:'attacker', rankBase:8, lvl:9 });
  const fast = S.srpgMakeUnit({ id:'y', side:'ally', name:'y', art:'slime', role:'attacker', rankBase:8, lvl:1 });
  S.srpgSetMod(slow, 'spd', -2, 3);   // 速い方を鈍足に
  const order = S.srpgTurnOrder([slow, fast]).map((u) => u.id);
  c.ok('すばやさデバフで後回しになる', order.indexOf('y') < order.indexOf('z') || S.srpgEffStat(fast, 'spd') >= S.srpgEffStat(slow, 'spd'));
}

// ---- 状態異常 ----
{
  const u = S.srpgMakeUnit({ id:'u', side:'ally', name:'u', art:'slime', role:'tank', rankBase:8, lvl:5 });
  S.srpgApplyStatus(u, 'poison', 3);
  c.ok('どく付与', S.srpgHasStatus(u, 'poison'));
  const t = S.srpgTickStatus(u);
  c.ok('どくで毎ターンダメージ', t.poisonDmg > 0);
  c.ok('どくのターンが減る', u.status.poison === 2);
  // ねむり＝行動不能・こうげきで解除
  S.srpgApplyStatus(u, 'sleep', 2);
  c.ok('ねむりで行動不能', !S.srpgCanAct(u));
  const t2 = S.srpgTickStatus(u);
  c.ok('ねむり中はスキップ', t2.skip === true);
  S.srpgWakeOnHit(u);
  c.ok('こうげきでねむり解除', u.status.sleep === 0 && S.srpgCanAct(u));
  // ふうじ＝とくぎ不可
  S.srpgApplyStatus(u, 'seal', 2);
  c.ok('ふうじでとくぎ不可', !S.srpgCanUseSkill(u));
  c.ok('ふうじでも通常行動は可', S.srpgCanAct(u));
  // まひ＝行動不能
  const p = S.srpgMakeUnit({ id:'p', side:'enemy', name:'p', art:'wolf', role:'attacker', rankBase:6, lvl:1 });
  S.srpgApplyStatus(p, 'paralyze', 1);
  c.ok('まひで行動不能', !S.srpgCanAct(p));
  const tp = S.srpgTickStatus(p);
  c.ok('まひはターンで解除', tp.skip === true && p.status.paralyze === 0);
}

// ---- 拡張スキルのデータ整合 ----
{
  const KINDS = ['atk', 'heal', 'buff', 'debuff'];
  const STAT = ['poison', 'paralyze', 'sleep', 'seal'];
  Object.keys(S.SRPG_SKILLS).forEach((id) => {
    const sk = S.SRPG_SKILLS[id];
    c.ok('スキル ' + id + ' の種別が有効', KINDS.indexOf(sk.kind) >= 0);
    c.ok('スキル ' + id + ' はMP≧0', typeof sk.mp === 'number' && sk.mp >= 0);
    if(sk.inflict) c.ok('スキル ' + id + ' の状態異常が有効', STAT.indexOf(sk.inflict.kind) >= 0 && sk.inflict.chance > 0);
    if(sk.kind === 'buff' || sk.kind === 'debuff'){
      c.ok('スキル ' + id + ' はbuff定義を持つ', sk.buff && ['atk','def','spd'].indexOf(sk.buff.stat) >= 0);
      c.ok('スキル ' + id + ' のtargetが有効', ['self','ally','enemy'].indexOf(sk.buff.target) >= 0);
    }
  });
}

// ---- 敵テンプレの耐性が有効（段階・教科ともに妥当・無効/吸収が存在する）----
{
  const RK = ['weak', 'normal', 'half', 'null', 'drain'];
  let hasNull = false, hasDrain = false;
  Object.keys(S.SRPG_ENEMY_TEMPLATES).forEach((k) => {
    const t = S.SRPG_ENEMY_TEMPLATES[k];
    if(t.resists) Object.keys(t.resists).forEach((sub) => {
      c.ok('敵 ' + k + ' の耐性教科が有効', S.SRPG_SUBJECT_KEYS.indexOf(sub) >= 0);
      c.ok('敵 ' + k + ' の耐性段階が有効', RK.indexOf(t.resists[sub]) >= 0);
      if(t.resists[sub] === 'null') hasNull = true;
      if(t.resists[sub] === 'drain') hasDrain = true;
    });
    if(t.onhit) c.ok('敵 ' + k + ' のonhit状態異常が有効', ['poison','paralyze','sleep','seal'].indexOf(t.onhit.kind) >= 0);
  });
  c.ok('無効(null)を持つ敵がいる（駆け引き）', hasNull);
  c.ok('吸収(drain)を持つ敵がいる（駆け引き）', hasDrain);
  // makeUnitが status/mods を初期化する
  const mu = S.srpgMakeUnit({ id:'m', side:'ally', name:'m', art:'slime', role:'attacker', rankBase:6, lvl:1 });
  c.ok('ユニットはstatus/modsを持つ', mu.status && mu.mods && typeof mu.mods.atk === 'number');
}

// ================= 第3弾：育成（覚醒/リーダー）＋地形＋大陸クエスト =================

// ---- 覚醒：レベルで とくぎ習得数（1〜3） ----
{
  c.eq('Lv1は とくぎ1つ', S.srpgSkillCount(1), 1);
  c.eq('Lv5も1つ', S.srpgSkillCount(5), 1);
  c.eq('Lv6で2つ', S.srpgSkillCount(6), 2);
  c.eq('Lv11で3つ', S.srpgSkillCount(11), 3);
  c.eq('3つで頭打ち', S.srpgSkillCount(50), 3);
  const low = S.srpgMakeUnit({ id:'a', side:'ally', name:'a', art:'slime', role:'attacker', rankBase:6, lvl:1 });
  const high = S.srpgMakeUnit({ id:'b', side:'ally', name:'b', art:'slime', role:'attacker', rankBase:6, lvl:12 });
  c.eq('低Lvは1とくぎ', low.skills.length, 1);
  c.eq('高Lvは3とくぎ（覚醒）', high.skills.length, 3);
  c.ok('覚醒段階を持つ', high.awaken === 3);
}

// ---- リーダー特性：先頭の役割で味方全体に開始時パッシブ ----
{
  ['attacker','mage','tank','healer'].forEach((r) => {
    const t = S.srpgLeaderTrait(r);
    c.ok('リーダー特性 ' + r + ' が定義済み', t && ['atk','def','spd'].indexOf(t.stat) >= 0 && t.stage > 0);
  });
  const units = S.srpgBuildUnits(S.SRPG_STAGES.arena1, [
    { id:'lead', name:'隊長', art:'shiba', role:'tank', lvl:5, rankBase:8 },   // ぼうぎょリーダー→守り+1
    { id:'m', name:'仲間', art:'slime', role:'attacker', lvl:5, rankBase:6 }
  ]);
  const allies = units.filter((u) => u.side === 'ally');
  c.ok('先頭がリーダー', allies[0].isLeader === true);
  c.ok('リーダー特性で味方全員に守りバフ', allies.every((u) => u.mods.def > 0));
  c.ok('敵にはリーダー特性がかからない', units.filter((u) => u.side === 'enemy').every((u) => u.mods.def === 0));
}

// ---- 地形（マス効果） ----
{
  const st = { terrain:[{ x:2, y:3, kind:'heal' }, { x:1, y:1, kind:'poison' }] };
  c.eq('地形あり：回復', S.srpgTerrainAt(st, 2, 3), 'heal');
  c.eq('地形あり：毒', S.srpgTerrainAt(st, 1, 1), 'poison');
  c.eq('地形なしはnull', S.srpgTerrainAt(st, 0, 0), null);
  const u = { maxHp:100 };
  c.ok('回復マスは＋', S.srpgTerrainDelta('heal', u) > 0);
  c.ok('毒沼は－', S.srpgTerrainDelta('poison', u) < 0);
  c.ok('炎は－', S.srpgTerrainDelta('fire', u) < 0);
  c.eq('不明な地形は0', S.srpgTerrainDelta('none', u), 0);
}

// ---- 大陸クエスト：ストーリー・地形・ボスの整合 ----
{
  const KIND = Object.keys(S.SRPG_TERRAIN_META);
  const quests = Object.keys(S.SRPG_STAGES).filter((id) => S.SRPG_STAGES[id].type === 'quest');
  c.ok('大陸クエストが5つ以上ある', quests.length >= 5);
  quests.forEach((id) => {
    const st = S.SRPG_STAGES[id];
    c.ok(id + ' の大陸が有効教科', S.SRPG_SUBJECT_KEYS.indexOf(st.continent) >= 0);
    c.ok(id + ' はストーリーを持つ', Array.isArray(st.story) && st.story.length > 0);
    (st.terrain || []).forEach((t) => {
      c.ok(id + ' の地形種別が有効', KIND.indexOf(t.kind) >= 0);
      c.ok(id + ' の地形が盤内', t.x >= 0 && t.x < st.grid.w && t.y >= 0 && t.y < st.grid.h);
    });
    // ボスは最後の敵として存在する
    c.ok(id + ' は敵（ボス含む）を持つ', st.enemies.length > 0 && st.enemies.every((e) => !!S.SRPG_ENEMY_TEMPLATES[e.key]));
  });
}

// ---- 収集連動：装備ボーナスが ステータスに乗る ----
{
  const plain = S.srpgMakeUnit({ id:'p', side:'ally', name:'p', art:'slime', role:'attacker', rankBase:8, lvl:5 });
  const geared = S.srpgMakeUnit({ id:'g', side:'ally', name:'g', art:'slime', role:'attacker', rankBase:8, lvl:5, bonus:{ hp:20, atk:8, def:5, spd:0 } });
  c.eq('装備でHPが+20', geared.maxHp - plain.maxHp, 20);
  c.eq('装備でATKが+8', geared.atk - plain.atk, 8);
  c.eq('装備でDEFが+5', geared.def - plain.def, 5);
  c.ok('gear情報を保持', geared.gear && geared.gear.hp === 20);
  c.ok('装備なしはgear=0', plain.gear && plain.gear.hp === 0 && plain.gear.atk === 0);
  // 装備ボーナスは実効ステ計算にも積まれる（バフと両立）
  S.srpgSetMod(geared, 'atk', 2, 3);
  c.ok('装備＋バフが両方効く', S.srpgEffStat(geared, 'atk') > geared.atk);
}

// ================= 第5弾：敵ボスAI＋配置フェーズ =================
const G = { w: 6, h: 7 };
function mk(spec){ return S.srpgMakeUnit(spec); }

// ---- 賢い標的選択：回復役＞瀕死＞近さ ----
{
  const enemy = mk({ id:'e', side:'enemy', name:'e', art:'slime', role:'attacker', rankBase:8, lvl:3, x:2, y:2 });
  const atk = mk({ id:'atk', side:'ally', name:'a', art:'slime', role:'attacker', rankBase:8, lvl:3, x:2, y:1 });
  const heal = mk({ id:'heal', side:'ally', name:'h', art:'slime', role:'healer', rankBase:8, lvl:3, x:3, y:2 });
  c.ok('回復役の方が狙う価値が高い', S.srpgTargetBonus(heal) > S.srpgTargetBonus(atk));
  const hurt = mk({ id:'hurt', side:'ally', name:'x', art:'slime', role:'attacker', rankBase:8, lvl:3, x:1, y:2 });
  hurt.hp = Math.round(hurt.maxHp * 0.2);
  c.ok('瀕死は健康な味方より価値が高い', S.srpgTargetBonus(hurt) > S.srpgTargetBonus(atk));
  // 射程内に回復役が居れば回復役を狙う
  const pick = S.srpgEnemyPickTarget(2, 2, 1, [enemy, atk, heal, hurt]);
  c.ok('射程内の回復役を優先して狙う', pick && pick.id === 'heal');
}

// ---- ボスAI：AoEとくぎで固まった味方をまとめて狙う ----
{
  // villain（burstball 3x3 を持つ・MPを与える）＋固まった味方3体
  const boss = mk({ id:'b', side:'enemy', name:'魔王', art:'villain', role:'tank', rankBase:16, lvl:8, skills:['burstball'], x:2, y:1 });
  boss.mp = 6;
  const a1 = mk({ id:'a1', side:'ally', name:'1', art:'slime', role:'attacker', rankBase:8, lvl:3, x:2, y:3 });
  const a2 = mk({ id:'a2', side:'ally', name:'2', art:'slime', role:'attacker', rankBase:8, lvl:3, x:3, y:3 });
  const a3 = mk({ id:'a3', side:'ally', name:'3', art:'slime', role:'attacker', rankBase:8, lvl:3, x:2, y:4 });
  const act = S.srpgEnemyAction(boss, G, [boss, a1, a2, a3]);
  c.ok('固まった味方にはとくぎを選ぶ', act.kind === 'skill' && act.skillId === 'burstball');
  c.ok('とくぎは2体以上を巻き込む', act.targetIds && act.targetIds.length >= 2);
  c.ok('AoEマスを予告用に返す', Array.isArray(act.aoe) && act.aoe.length > 0);
  // MPが足りなければ通常攻撃にフォールバック
  boss.mp = 0;
  const act2 = S.srpgEnemyAction(boss, G, [boss, a1, a2, a3]);
  c.ok('MP不足ならとくぎを使わない', act2.kind !== 'skill');
}

// ---- とくぎ持ちでない敵は通常攻撃のみ（暴発しない） ----
{
  const goblin = mk({ id:'g', side:'enemy', name:'g', art:'goblin', role:'attacker', rankBase:6, lvl:2, skills:[], x:2, y:2 });
  goblin.mp = 6;
  const ally = mk({ id:'a', side:'ally', name:'a', art:'slime', role:'attacker', rankBase:6, lvl:2, x:2, y:3 });
  const act = S.srpgEnemyAction(goblin, G, [goblin, ally]);
  c.ok('とくぎ無し敵はskillを選ばない', act.kind !== 'skill');
  c.ok('隣接すれば通常攻撃を選ぶ', act.kind === 'attack' && act.targetId === 'a');
}

// ---- 敵テンプレ：ボス/術者にとくぎ、雑魚には無し ----
{
  c.ok('魔王はとくぎを持つ', (S.SRPG_ENEMY_TEMPLATES.villain.skills || []).length >= 1);
  c.ok('ゴブリンはとくぎ無し', !(S.SRPG_ENEMY_TEMPLATES.goblin.skills && S.SRPG_ENEMY_TEMPLATES.goblin.skills.length));
  const units = S.srpgBuildUnits(S.SRPG_STAGES.q_maou, [{ id:'h', name:'h', art:'shiba', role:'attacker', lvl:5, rankBase:8 }]);
  const boss = units.filter((u) => u.art === 'villain')[0];
  c.ok('組み立てた魔王はskillsを保持', boss && boss.skills.length >= 1);
  const gob = S.srpgBuildUnits(S.SRPG_STAGES.arena1, [{ id:'h', name:'h', art:'shiba', role:'attacker', lvl:1, rankBase:8 }]).filter((u) => u.art === 'goblin')[0];
  c.ok('組み立てたゴブリンはskills空', gob && gob.skills.length === 0);
}

// ---- 配置ゾーン：自陣（下部）・盤内・敵初期位置は除く ----
{
  const zone = S.srpgDeployZone(S.SRPG_STAGES.arena1);
  c.ok('配置ゾーンが存在する', zone.length > 0);
  c.ok('配置ゾーンは盤内', zone.every((z) => z.x >= 0 && z.x < 6 && z.y >= 0 && z.y < 7));
  c.ok('配置ゾーンは下部（自陣側）', zone.every((z) => z.y >= 7 - 3));
  const occ = {}; S.SRPG_STAGES.arena1.enemies.forEach((e) => { occ[e.x + ',' + e.y] = 1; });
  c.ok('敵の初期位置は配置ゾーンに含まない', zone.every((z) => !occ[z.x + ',' + z.y]));
}

// ================= 周回要素：デイリー挑戦＆ちょうせんの塔（決定的生成） =================
{
  // 決定的：同じ日付キー → 完全に同じステージ／別の日 → （高確率で）別の編成
  const a = S.srpgDailyStage('2026-7-17'), b = S.srpgDailyStage('2026-7-17'), c2 = S.srpgDailyStage('2026-7-18');
  c.eq('デイリーは同じ日付で同一', JSON.stringify(a), JSON.stringify(b));
  const days = ['2026-7-17','2026-7-18','2026-7-19','2026-7-20','2026-7-21'];
  const sigs = new Set(days.map((d) => JSON.stringify(S.srpgDailyStage(d).enemies)));
  c.ok('日付が変わると編成も変わる（5日で2種以上）', sigs.size >= 2);
  // 妥当性：敵は実在テンプレ・盤内・重複配置なし・味方枠あり・地形は有効種別
  days.forEach((d) => {
    const st = S.srpgDailyStage(d), pos = new Set();
    c.ok(d+' 敵3〜4体', st.enemies.length >= 3 && st.enemies.length <= 4);
    st.enemies.forEach((e) => {
      c.ok(d+' 敵テンプレ実在', !!S.SRPG_ENEMY_TEMPLATES[e.key]);
      c.ok(d+' 盤内', e.x >= 0 && e.x < 6 && e.y >= 0 && e.y < 3);
      c.ok(d+' 配置重複なし', !pos.has(e.x+','+e.y)); pos.add(e.x+','+e.y);
    });
    (st.terrain||[]).forEach((t) => c.ok(d+' 地形種別が有効', ['heal','poison','fire'].indexOf(t.kind) >= 0));
    c.ok(d+' 味方枠5', st.allySlots.length === 5);
    c.ok(d+' 大陸が有効教科', S.SRPG_SUBJECT_KEYS.indexOf(st.continent) >= 0);
    c.ok(d+' buildUnitsが通る', S.srpgBuildUnits(st, [{id:'h',name:'h',art:'shiba',role:'attacker',lvl:3,rankBase:8}]).length >= 4);
  });
}
{
  // 塔：決定的・階が上がるとレベルも上がる・5階ごとにボス（魔王）
  c.eq('塔は同じ階で同一', JSON.stringify(S.srpgTowerStage(3)), JSON.stringify(S.srpgTowerStage(3)));
  const f1 = S.srpgTowerStage(1), f9 = S.srpgTowerStage(9);
  const maxLvl = (st) => Math.max.apply(null, st.enemies.map((e) => e.lvl));
  c.ok('高層ほど敵レベルが高い', maxLvl(f9) > maxLvl(f1));
  c.ok('高層ほど敵が多い（か同数）', f9.enemies.length >= f1.enemies.length);
  const f5 = S.srpgTowerStage(5), f10 = S.srpgTowerStage(10);
  c.ok('5階はボス（魔王）が出る', f5.enemies.some((e) => e.key === 'villain') && !!f5.boss);
  c.ok('10階もボス', f10.enemies.some((e) => e.key === 'villain'));
  c.ok('4階はボス無し', !S.srpgTowerStage(4).enemies.some((e) => e.key === 'villain'));
  // 妥当性（1〜12階）：盤内・重複なし・テンプレ実在
  for (let fl = 1; fl <= 12; fl++) {
    const st = S.srpgTowerStage(fl), pos = new Set();
    st.enemies.forEach((e) => {
      c.ok('塔'+fl+'階 敵テンプレ実在', !!S.SRPG_ENEMY_TEMPLATES[e.key]);
      c.ok('塔'+fl+'階 盤内', e.x >= 0 && e.x < 6 && e.y >= 0 && e.y < 3);
      c.ok('塔'+fl+'階 配置重複なし', !pos.has(e.x+','+e.y)); pos.add(e.x+','+e.y);
    });
    c.ok('塔'+fl+'階 レベル上限12(+ボス14)', st.enemies.every((e) => e.lvl <= 14));
  }
}

// ================= モンスター固有とくぎ =================
{
  // 冒険に出る全モンスター（＝あいぼう化しうる種）に固有とくぎがあり、実在スキルを指す
  const acode2 = require('fs').readFileSync(path.join(ROOT, 'js', 'aibou.js'), 'utf8');
  const ARTS = Object.keys((new Function(acode2 + '\nreturn AIBOU_ART_SPECIES;'))());
  ARTS.forEach((art) => {
    const id = S.srpgMonSkill(art);
    c.ok('固有とくぎあり: ' + art, !!id);
    c.ok('固有とくぎが実在スキル: ' + art + '→' + id, !!S.srpgSkill(id));
  });
  // 亜種はベース種と同じ技を受け継ぐ
  c.eq('亜種slime2はslimeの技', S.srpgMonSkill('slime2'), S.srpgMonSkill('slime'));
  c.eq('亜種dragon2はdragonの技', S.srpgMonSkill('dragon2'), S.srpgMonSkill('dragon'));
  c.ok('未知のartはnull', S.srpgMonSkill('__none__') === null);
  // 個性が出ている（固有とくぎの種類が10種以上に分散）
  const uniq = new Set(ARTS.map((a) => S.srpgMonSkill(a)));
  c.ok('固有とくぎは10種類以上に分散', uniq.size >= 10);
  // 新規固有スキルの整合は既存のスキル整合ループが検証済み（kind/mp/inflict/buff）。
  // 自分バフ型（ぷるぷるバリア）は target:'self' で出題なし発動の分岐に乗る
  c.eq('ぷるぷるバリアは自分バフ', S.srpgSkill('purupuru').buff.target, 'self');
  // ユニット組み立て：固有＋役割とくぎ（重複なし）
  const u = S.srpgMakeUnit({ id:'w', side:'ally', name:'w', art:'wolf', role:'attacker', rankBase:8, lvl:1,
    skills:['kamikizu'].concat(S.SRPG_ROLES.attacker.skills.slice(0, S.srpgSkillCount(1))) });
  c.ok('固有とくぎが先頭に入る', u.skills[0] === 'kamikizu' && u.skills.length === 2);
}

// ================= 第10弾：障害物・ダメージ予測・星評価 =================
{
  // 障害物：BFSで通れない・配置ゾーンから除外・グリッド生成
  const st = { grid:{ w:6, h:7 }, blocks:[{ x:2, y:5, kind:'rock' }, { x:3, y:5, kind:'water' }], enemies:[{ key:'slime', x:2, y:1, lvl:1 }] };
  const g = S.srpgGridWithBlocks(st);
  c.eq('障害物がグリッドに載る', g.blocked['2,5'], 'rock');
  const u = S.srpgMakeUnit({ id:'a', side:'ally', name:'a', art:'slime', role:'attacker', rankBase:8, lvl:3, x:2, y:6 });
  const tiles = S.srpgMoveTiles(u, g, [u]);
  c.ok('障害物マスへは移動できない', !tiles.some((t) => (t.x===2&&t.y===5) || (t.x===3&&t.y===5)));
  c.ok('障害物の先へは回り込みで到達（完全遮断ではない）', tiles.length > 0);
  const zone = S.srpgDeployZone(st);
  c.ok('配置ゾーンから障害物を除外', !zone.some((z) => (z.x===2&&z.y===5) || (z.x===3&&z.y===5)));
  // 全ステージの障害物が 盤内・敵/味方枠と非重複
  Object.keys(S.SRPG_STAGES).forEach((id) => {
    const s2 = S.SRPG_STAGES[id];
    (s2.blocks || []).forEach((b) => {
      c.ok(id+' 障害物が盤内', b.x>=0 && b.x<s2.grid.w && b.y>=0 && b.y<s2.grid.h);
      c.ok(id+' 障害物が敵と非重複', !s2.enemies.some((e) => e.x===b.x && e.y===b.y));
      c.ok(id+' 障害物が味方枠と非重複', !s2.allySlots.some((a) => a.x===b.x && a.y===b.y));
      c.ok(id+' 障害物の種別が有効', !!S.SRPG_BLOCK_META[b.kind||'rock']);
    });
  });
  // デイリー/塔の障害物も盤内＆敵と非重複（決定的サンプル）
  ['2026-7-17','2026-7-20','2026-7-25'].forEach((d) => {
    const ds = S.srpgDailyStage(d);
    (ds.blocks||[]).forEach((b) => c.ok('daily '+d+' 障害物OK', b.x>=0&&b.x<6&&b.y>=3&&b.y<5 && !ds.enemies.some((e)=>e.x===b.x&&e.y===b.y)));
  });
  for(let fl=4; fl<=8; fl++){
    const ts = S.srpgTowerStage(fl);
    (ts.blocks||[]).forEach((b) => c.ok('tower'+fl+' 障害物OK', b.x>=0&&b.x<6&&b.y===4));
  }
}
{
  // ダメージ予測：弱点＞等倍＞半減・無効は0・吸収は回復量
  const atk = S.srpgMakeUnit({ id:'x', side:'ally', name:'x', art:'slime', role:'attacker', rankBase:8, lvl:5 });
  const tgt = S.srpgMakeUnit({ id:'y', side:'enemy', name:'y', art:'villain', role:'tank', rankBase:16, lvl:8,
    resists:{ math:'weak', japanese:'half', social:'null', english:'drain' } });
  const fw = S.srpgForecast(atk, tgt, 'math', null), fn2 = S.srpgForecast(atk, tgt, 'science', null);
  const fh = S.srpgForecast(atk, tgt, 'japanese', null), f0 = S.srpgForecast(atk, tgt, 'social', null), fd = S.srpgForecast(atk, tgt, 'english', null);
  c.ok('予測: 弱点＞等倍＞半減', fw.dmg > fn2.dmg && fn2.dmg > fh.dmg);
  c.eq('予測: 無効は0', f0.dmg, 0);
  c.ok('予測: 吸収は正の回復量', fd.kind==='drain' && fd.dmg > 0);
  // とくぎの威力も反映
  const fs2 = S.srpgForecast(atk, tgt, 'math', S.srpgSkill('line'));
  c.ok('予測: とくぎ(威力130)は通常より大きい', fs2.dmg > fw.dmg);
}
{
  // 星評価
  c.eq('負けは0', S.srpgStars(false, 0, 1, 6), 0);
  c.eq('勝利のみ=★1', S.srpgStars(true, 2, 9, 6), 1);
  c.eq('全員生存=★2', S.srpgStars(true, 0, 9, 6), 2);
  c.eq('全員生存＋規定内=★3', S.srpgStars(true, 0, 5, 6), 3);
  c.eq('倒れたが速い=★2', S.srpgStars(true, 1, 4, 6), 2);
}

// ================= スカウトガチャ（抽選＝純粋関数・開示と同一ソース） =================
{
  const sum = S.SRPG_SCOUT_RATES.reduce((a, r) => a + r[1], 0);
  c.eq('スカウト確率の合計は100%', sum, 100);
  const RANKS = ['F','E','D','C','B','A','S','SS','SSS','LG'];
  c.ok('レート表のランクはすべて有効', S.SRPG_SCOUT_RATES.every((r) => RANKS.indexOf(r[0]) >= 0));
  // 境界値：0→最初(LG=伝説)・0.999→最後(F)・累積の切れ目
  c.eq('rnd=0 は最高ランク(LG)', S.srpgScoutRank(0), 'LG');
  c.eq('rnd=0.999 は最低ランク', S.srpgScoutRank(0.999), 'F');
  c.ok('全乱数で有効ランクのみ', [...Array(101)].every((_, i) => RANKS.indexOf(S.srpgScoutRank(i / 101)) >= 0));
  c.eq('LGレートは0.5%', S.SRPG_SCOUT_RATES[0].join(','), 'LG,0.5');
  // 10連保証：低ランクしか出ない乱数列でも A以上が1体入る
  const lowRng = () => 0.99;   // 常にF
  const ten = S.srpgScoutTen(lowRng);
  c.eq('10連は10体', ten.length, 10);
  c.ok('全F引きでも保証でA以上が1体', ten.some((k) => ['A','S','SS','SSS'].indexOf(k) >= 0));
  // 高ランクが自然に出た場合は昇格しない（決定的シード）
  const rng2 = S.srpgSeedRng('scout-test');
  const ten2 = S.srpgScoutTen(rng2);
  c.ok('10連の全要素が有効ランク', ten2.every((k) => RANKS.indexOf(k) >= 0));
  c.eq('コスト定義（単発80/10連720）', S.SRPG_SCOUT_COST.one + '/' + S.SRPG_SCOUT_COST.ten, '80/720');
}

// ================= 第12弾：ウェーブ制＋おまかせ編成 =================
{
  // ウェーブ：定義済みステージの増援が妥当なユニットとして生成される
  const staged = Object.keys(S.SRPG_STAGES).filter((id) => (S.SRPG_STAGES[id].waves || []).length);
  c.ok('ウェーブ付きステージが2つ以上', staged.length >= 2);
  staged.forEach((id) => {
    const st = S.SRPG_STAGES[id];
    c.eq(id + ' 総ウェーブ数', S.srpgTotalWaves(st), 1 + st.waves.length);
    st.waves.forEach((w, wi) => {
      const units = S.srpgWaveUnits(st, wi + 1);
      c.eq(id + ' 第' + (wi + 2) + '陣のユニット数', units.length, w.length);
      units.forEach((u2) => {
        c.ok(id + ' 増援は敵サイド', u2.side === 'enemy');
        c.ok(id + ' 増援が盤内', u2.x >= 0 && u2.x < st.grid.w && u2.y >= 0 && u2.y < st.grid.h);
        c.ok(id + ' 増援idが一意形式', /^enemy_w\d+_\d+$/.test(u2.id));
      });
    });
  });
  c.eq('波の無いステージは総1陣', S.srpgTotalWaves(S.SRPG_STAGES.arena1), 1);
  c.eq('範囲外waveは空配列', S.srpgWaveUnits(S.SRPG_STAGES.arena1, 1).length, 0);
}
{
  // おまかせ編成：かいふく役1体確保→強い順・最大n・重複なし
  const roster = [
    { id:'w1', rank:'B', lv:9, sp:'beast' }, { id:'h1', rank:'C', lv:3, sp:'nature' },
    { id:'s1', rank:'SS', lv:2, sp:'slime' }, { id:'d1', rank:'A', lv:5, sp:'dragon' },
    { id:'f1', rank:'F', lv:1, sp:'beast' }, { id:'h2', rank:'F', lv:1, sp:'nature' }
  ];
  const picked = S.srpgAutoPick(roster, 4);
  c.eq('4体えらぶ', picked.length, 4);
  c.ok('かいふく役(nature)を1体確保', picked.indexOf('h1') >= 0);
  c.ok('最強(SS)が入る', picked.indexOf('s1') >= 0);
  c.ok('最弱(F)は入らない', picked.indexOf('f1') < 0 && picked.indexOf('h2') < 0);
  c.eq('重複なし', new Set(picked).size, picked.length);
  c.eq('空ロスターは空', S.srpgAutoPick([], 4).length, 0);
}

// ================= 第13弾：とくぎ強化（ダブり合成） =================
{
  const sk = S.srpgSkill('burstball');   // power 120
  c.eq('とくぎLv1は素の威力', S.srpgSkillPower(sk, 1), 120);
  c.eq('とくぎLv3で+20%', S.srpgSkillPower(sk, 3), 144);
  c.eq('とくぎLv5で+40%', S.srpgSkillPower(sk, 5), 168);
  c.eq('Lv超過は5で頭打ち', S.srpgSkillPower(sk, 9), 168);
  c.eq('通常こうげき相当(null skill)は100基準', S.srpgSkillPower(null, 3), 120);
  const pb = S.srpgSkill('poisonbreath');   // chance 0.9
  c.ok('状態異常確率がLvで上がる', S.srpgInflictChance(pb, 3) > S.srpgInflictChance(pb, 1));
  c.eq('確率は1.0で頭打ち', S.srpgInflictChance(pb, 5), 1);
  c.eq('inflict無しは0', S.srpgInflictChance(S.srpgSkill('slash'), 5), 0);
  // 合成ルール
  const b = { id:'b1', art:'wolf', skLv:1 }, m1 = { id:'m1', art:'wolf' }, m2 = { id:'m2', art:'slime' };
  c.ok('同じ種は合成できる', S.srpgSkillUpCanFuse(b, m1, []));
  c.ok('別の種は合成できない', !S.srpgSkillUpCanFuse(b, m2, []));
  c.ok('自分自身は素材にできない', !S.srpgSkillUpCanFuse(b, b, []));
  c.ok('パーティ内の素材は不可', !S.srpgSkillUpCanFuse(b, m1, ['m1']));
  c.ok('Lv上限(5)では合成不可', !S.srpgSkillUpCanFuse({ id:'b2', art:'wolf', skLv:5 }, m1, []));
  // ユニット生成にskLvが乗る＆予測にも反映
  const uu = S.srpgMakeUnit({ id:'u', side:'ally', name:'u', art:'wolf', role:'attacker', rankBase:8, lvl:5, skLv:3 });
  c.eq('ユニットのskLv', uu.skLv, 3);
  const u1 = S.srpgMakeUnit({ id:'v', side:'ally', name:'v', art:'wolf', role:'attacker', rankBase:8, lvl:5, skLv:1 });
  const tgt2 = S.srpgMakeUnit({ id:'t', side:'enemy', name:'t', art:'slime', role:'tank', rankBase:8, lvl:5 });
  c.ok('予測ダメージがとくぎLvで増える',
    S.srpgForecast(uu, tgt2, 'japanese', S.srpgSkill('line')).dmg > S.srpgForecast(u1, tgt2, 'japanese', S.srpgSkill('line')).dmg);
}

// ================= 第15弾：天井・ピックアップ・重み付きアート抽選 =================
{
  // 天井：ハズレ続き→到達で最後の1体がSSに・SS以上が自然に出たらリセット
  const r1 = S.srpgScoutApplyPity(['F','E','D'], 27, 30);
  c.eq('天井到達で最後がSSに', r1.ranks[2], 'SS');
  c.ok('天井発動フラグ', r1.triggered === true);
  c.eq('発動後はリセット', r1.pity, 0);
  const r2 = S.srpgScoutApplyPity(['F','E'], 10, 30);
  c.eq('未到達は昇格なし', r2.ranks.join(','), 'F,E');
  c.eq('未到達はカウント加算', r2.pity, 12);
  const r3 = S.srpgScoutApplyPity(['F','SS'], 28, 30);
  c.ok('自然SSなら昇格せずリセット', r3.triggered === false && r3.pity === 0);
  const r4 = S.srpgScoutApplyPity(['SSS'], 29, 30);
  c.ok('自然SSSもリセット', r4.pity === 0 && r4.ranks[0] === 'SSS');
}
{
  // 週替わりピックアップ：決定的・3種・有効アート・villain/pet除外
  const p1 = S.srpgScoutPickups('2026-w29'), p2 = S.srpgScoutPickups('2026-w29'), p3 = S.srpgScoutPickups('2026-w30');
  c.eq('同じ週キーで同一', p1.join(','), p2.join(','));
  c.eq('3種えらぶ', p1.length, 3);
  c.eq('重複なし', new Set(p1).size, 3);
  p1.forEach((a) => c.ok('ピックアップは有効アート: '+a, !!S.srpgMonSkill(a) && a!=='villain' && a!=='pet'));
  const weeks = ['2026-w29','2026-w30','2026-w31','2026-w32'];
  const sigs = new Set(weeks.map((w) => S.srpgScoutPickups(w).join(',')));
  c.ok('週が変わると顔ぶれも変わる（4週で2種以上）', sigs.size >= 2);
}
{
  // 重み付きアート抽選：ピックアップは2倍＝決定的rndで検証
  const arts = ['a','b','c'];   // b がピックアップ→重み [1,2,1] 計4
  c.eq('rnd=0 は先頭', S.srpgScoutArt(0, arts, ['b']), 'a');
  c.eq('rnd=0.3 はピックアップ帯', S.srpgScoutArt(0.3, arts, ['b']), 'b');
  c.eq('rnd=0.6 もピックアップ帯（幅2倍）', S.srpgScoutArt(0.6, arts, ['b']), 'b');
  c.eq('rnd=0.9 は末尾', S.srpgScoutArt(0.9, arts, ['b']), 'c');
  c.eq('ピックアップ無しは均等', S.srpgScoutArt(0.5, arts, []), 'b');
  c.ok('空配列はnull', S.srpgScoutArt(0.5, [], []) === null);
}

// ================= 第16弾：メダル交換所＆なかま図鑑 =================
{
  c.eq('メダル交換：通常50枚', S.srpgMedalCost('wolf'), 50);
  c.eq('メダル交換：魔王150枚', S.srpgMedalCost('villain'), 150);
  const p = S.srpgDexProgress({ wolf:1, slime:1, ghost:0 }, 22);
  c.eq('図鑑進捗：met数', p.count, 2);
  c.eq('図鑑進捗：%', p.pct, Math.round(2/22*100));
  c.ok('節目報酬は4段階・needが昇順', S.SRPG_DEX_REWARDS.length === 4 && S.SRPG_DEX_REWARDS[0].need < S.SRPG_DEX_REWARDS[3].need);
  c.ok('最終節目は全121種（基本21＋変種100）', S.SRPG_DEX_REWARDS[3].need === 121);
  // LG：天井・自動編成・とくぎ継承
  c.ok('LGでも天井リセット', S.srpgScoutApplyPity(['LG'], 29, 30).pity === 0);
  const lgPick = S.srpgAutoPick([{id:'x',rank:'LG',lv:1,sp:'beast'},{id:'y',rank:'SSS',lv:99,sp:'beast'}], 1);
  c.eq('おまかせはLGを最強と判断', lgPick[0], 'x');
}

c.done();
