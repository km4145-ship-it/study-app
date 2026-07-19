/* roguelite.js — 汎用ローグライト・コア（データ駆動・DOM/乱数状態に触れない純粋関数中心）。
   tactics-arena / study-app 共用。各アプリは自前のロスター/難易度/遺物“定義”を渡して使う。
   ★ ここは「計算」だけ＝描画・保存・演出はアプリ側。エンジン(srpg.js)と同じ思想で テスト容易・再現可能。
   ★ 共有ファイル：修正は study-app 側 canonical を直し sync（分岐防止）。将来モノレポで単一ソース化。 */
(function (root) {
  'use strict';

  // ===== 永続レベル成長（使うほど育つ）=====
  // cfg = { base, step, max }。Lv→Lv+1 に必要なXP = base + (lv-1)*step。
  function rlXpReq(lv, cfg) { cfg = cfg || {}; var base = cfg.base == null ? 50 : cfg.base, step = cfg.step == null ? 30 : cfg.step; return base + (lv - 1) * step; }
  function rlLevel(xp, cfg) { cfg = cfg || {}; var max = cfg.max || 20; xp = xp || 0; var lv = 1, need = rlXpReq(1, cfg);
    while (lv < max && xp >= need) { xp -= need; lv++; need = rlXpReq(lv, cfg); } return lv; }
  // 進捗（XPバー用）：{ lv, cur, need, pct, max }
  function rlXpInto(xp, cfg) { cfg = cfg || {}; var max = cfg.max || 20; xp = xp || 0; var lv = 1, need = rlXpReq(1, cfg);
    while (lv < max && xp >= need) { xp -= need; lv++; need = rlXpReq(lv, cfg); }
    if (lv >= max) return { lv: lv, cur: 0, need: 0, pct: 100, max: true };
    return { lv: lv, cur: xp, need: need, pct: Math.max(0, Math.min(100, Math.round(xp / need * 100))), max: false }; }
  // growth = { hp, atk, def, spdPer }（Lv-1 あたりの加算。spd は spdPer レベルごとに +1）
  function rlLevelStat(level, growth) { growth = growth || {}; var n = (level || 1) - 1;
    return { hp: n * (growth.hp || 0), atk: n * (growth.atk || 0), def: n * (growth.def || 0), spd: Math.floor(n / (growth.spdPer || 3)) }; }

  // ===== アセンション（難易度）累積モッド =====
  // defs = [ {mod:{ehp,eatk,espd,ecount,coin,boons,heal,boss,startHp}} ... ]（index=段・0=標準）。
  // 1段目〜level段目を合算（startHp は上書き＝“最も厳しい割合”を採用）。
  function rlAscMods(level, defs) {
    var m = { ehp: 0, eatk: 0, espd: 0, ecount: 0, coin: 0, boons: 0, heal: 0, boss: 0, startHp: 1 };
    level = level || 0; defs = defs || [];
    for (var i = 1; i <= level && i < defs.length; i++) { var d = (defs[i] && defs[i].mod) || {};
      for (var k in d) { if (k === 'startHp') m.startHp = d.startHp; else m[k] = (m[k] || 0) + d[k]; } }
    return m;
  }

  // ===== 遺物（レリック）集計 =====
  // owned = [id...]、defs = { id:{ stat:{hp,atk,def,spd}, flag, hex, curse } }
  function rlHas(owned, id) { return !!(owned && owned.indexOf(id) >= 0); }
  // 味方全員に効く 加算ステの合計（bonus 経路で使う）
  function rlRelicStat(owned, defs) { var s = { hp: 0, atk: 0, def: 0, spd: 0 };
    (owned || []).forEach(function (id) { var r = defs[id]; if (r && r.stat) { Object.keys(r.stat).forEach(function (k) { s[k] = (s[k] || 0) + r.stat[k]; }); } });
    return s; }
  // 呪いのデメリット判定：いずれかの所持遺物が その hex を持つか
  function rlHexHas(owned, defs, hex) { return (owned || []).some(function (id) { var r = defs[id]; return r && r.hex === hex; }); }
  // 未所持の遺物を1つ（curse=false:通常のみ / true:呪いのみ）。全所持なら null。
  function rlRollUnowned(rng, defs, owned, curse) {
    var ids = Object.keys(defs).filter(function (id) { return !rlHas(owned, id) && (curse ? !!defs[id].curse : !defs[id].curse); });
    if (!ids.length) return null; return ids[Math.floor(rng() * ids.length)];
  }

  // ===== 連戦の持ち越し(carry)効果＝寄り道イベントの回復/被弾（次の戦闘に反映）=====
  // carry = { id:{ hp, mp, downed, maxHp } }。いずれも carry を直接ミューテート（純粋な副作用のみ）。
  // 割合回復：気絶は0基点から回復し 復帰。最低HP1を保証。
  function rlCarryHeal(carry, pct) { carry = carry || {}; Object.keys(carry).forEach(function (id) { var u = carry[id]; if (!u || !u.maxHp) return;
    var base = u.downed ? 0 : u.hp; u.hp = Math.max(1, Math.min(u.maxHp, base + Math.round(u.maxHp * pct))); u.downed = false; }); }
  // 全回復（MPは大きな値を入れて 次戦で mpMax にクランプさせる）
  function rlCarryFullHeal(carry) { carry = carry || {}; Object.keys(carry).forEach(function (id) { var u = carry[id]; if (!u || !u.maxHp) return; u.hp = u.maxHp; u.mp = 99; u.downed = false; }); }
  // 割合ダメージ：気絶は対象外・最低HP1（イベントで全滅させない）
  function rlCarryDamage(carry, pct) { carry = carry || {}; Object.keys(carry).forEach(function (id) { var u = carry[id]; if (!u || !u.maxHp || u.downed) return;
    u.hp = Math.max(1, u.hp - Math.round(u.maxHp * pct)); }); }

  // ===== 戦闘メタ：ボス/エリートの 大技チャージ・覚醒（ローグライトの駆け引き）=====
  // チャージ間隔：呼ぶたび unit._bturn を進め、period ごとに true（このターンは溜め）。
  function rlChargeTick(unit, period) { unit._bturn = (unit._bturn || 0) + 1; return (unit._bturn % (period || 3)) === 0; }
  // 覚醒到達：phase を持ち 未覚醒で HP が閾値割れなら true（一度だけ）。
  function rlEnrageReady(unit) { return !!(unit && unit.phase && !unit.enraged && unit.hp < unit.maxHp * ((unit.phase.hp) || 0.5)); }

  // ===== セーブ（バージョン付き・段階マイグレーション）=====
  // rlLoad(raw, {version, migrations}): 文字列を parse。保存なし/壊れは null（呼び出し側が default）。
  // 古い版は migrations[v](s)→次版…と 段階的に更新。返り値の v は version に揃える。
  function rlLoad(raw, opts) { opts = opts || {}; var s;
    try { s = JSON.parse(raw || 'null'); } catch (e) { s = null; }
    if (!(s && typeof s === 'object' && s.v)) return null;
    var migs = opts.migrations || {}, cur = opts.version || s.v;
    var guard = 0;
    while ((s.v || 1) < cur && migs[s.v] && guard++ < 100) { var nv = (s.v || 1) + 1; s = migs[s.v](s) || s; s.v = nv; }
    s.v = cur; return s;
  }

  var api = {
    rlXpReq: rlXpReq, rlLevel: rlLevel, rlXpInto: rlXpInto, rlLevelStat: rlLevelStat,
    rlAscMods: rlAscMods,
    rlHas: rlHas, rlRelicStat: rlRelicStat, rlHexHas: rlHexHas, rlRollUnowned: rlRollUnowned,
    rlCarryHeal: rlCarryHeal, rlCarryFullHeal: rlCarryFullHeal, rlCarryDamage: rlCarryDamage,
    rlChargeTick: rlChargeTick, rlEnrageReady: rlEnrageReady, rlLoad: rlLoad
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  for (var k in api) { root[k] = api[k]; }   // ブラウザ：グローバル公開
})(typeof window !== 'undefined' ? window : globalThis);
