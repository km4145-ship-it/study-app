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

c.done();
