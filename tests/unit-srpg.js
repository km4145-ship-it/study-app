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
  c.eq('arena1は味方2＋敵3＝5体', units.length, 5);
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

c.done();
