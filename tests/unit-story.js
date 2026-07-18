'use strict';
// 物語モード（大陸アーク）の検証：章→ステージ生成器・弱点統一・物語データ・階層ナビ配線。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-story');

const S = require(path.join(ROOT, 'js', 'srpg.js'));

// ---- 大陸データ ----
c.eq('数の大陸は10章', S.srpgChapterCount('math'), 10);
c.eq('1章は3ノード', S.srpgNodeCount(), 3);
c.ok('存在しない大陸はnull', S.srpgContinent('xxx') === null);
c.eq('数の大陸のクリスタルはq_math', S.srpgContinent('math').crystalId, 'q_math');

// ---- 章→ステージ生成（全10章×3ノードの整合） ----
let bossNodes = 0;
const usedKeys = {};
for (let ci = 0; ci < 10; ci++) {
  for (let ni = 0; ni < 3; ni++) {
    const st = S.srpgChapterStage('math', ci, ni);
    c.ok('生成される ' + ci + '-' + ni, !!st);
    c.eq('id ' + ci + '-' + ni, st.id, 'c_math_' + ci + '_' + ni);
    c.eq('typeはchapter', st.type, 'chapter');
    c.eq('forceWeakはmath', st.forceWeak, 'math');
    c.ok('盤サイズ6x7', st.grid.w === 6 && st.grid.h === 7);
    st.enemies.forEach(function (e) {
      usedKeys[e.key] = 1;
      c.ok('敵が盤内 ' + e.key, e.x >= 0 && e.x < 6 && e.y >= 0 && e.y < 7);
      c.ok('敵テンプレ実在 ' + e.key, !!S.SRPG_ENEMY_TEMPLATES[e.key]);
    });
    if (ni === 2) { bossNodes++; c.ok('node2はボス ' + ci, st.isBoss && !!st.boss); }
    else { c.ok('node0/1はボスでない ' + ci + '-' + ni, !st.isBoss); }
  }
}
c.eq('章ボスは10体', bossNodes, 10);
c.ok('スラッグ王テンプレが存在', !!S.SRPG_ENEMY_TEMPLATES.slugking);
c.ok('スラッグ王を使う章がある', !!usedKeys.slugking);

// ---- 範囲外/不正は null ----
c.ok('章範囲外はnull', S.srpgChapterStage('math', 99, 0) === null);
c.ok('ノード範囲外はnull', S.srpgChapterStage('math', 0, 5) === null);

// ---- ID パース ----
c.eq('章IDパース area', S.srpgParseChapterId('c_math_3_2').area, 'math');
c.eq('章IDパース ci', S.srpgParseChapterId('c_math_3_2').ci, 3);
c.eq('章IDパース ni', S.srpgParseChapterId('c_math_3_2').ni, 2);
c.ok('非章IDはnull', S.srpgParseChapterId('q_math') === null);
c.ok('壊れたIDはnull', S.srpgParseChapterId('c_math_x_y') === null);

// ---- forceWeak：ステージからユニット化すると 全敵が「その大陸の教科＝弱点」に統一 ----
const st1 = S.srpgChapterStage('math', 4, 2); // 方程式の遺跡・ボス（幹部ゼロン=dragon）
const units = S.srpgBuildUnits(st1, [{ id: 'h', name: '勇者', art: 'cat', role: 'attacker', lvl: 6, rankBase: 8 }]);
const ens = units.filter(function (u) { return u.side === 'enemy'; });
c.eq('敵ユニット数=ステージ定義数', ens.length, st1.enemies.length);
ens.forEach(function (u) {
  c.eq('math が弱点(つよめ)', S.srpgResistKind('math', u), 'weak');
  c.eq('他教科は等倍', S.srpgResistKind('japanese', u), 'normal');
});

// ---- 物語データ（story-data.js）----
const storySrc = fs.readFileSync(path.join(ROOT, 'js', 'story-data.js'), 'utf8');
const story = (new Function(storySrc + '\nreturn SRPG_STORY;'))();
c.ok('SRPG_STORYが定義される', story && typeof story === 'object');
// 全10章に導入シーンがある
for (let ci = 0; ci < 10; ci++) {
  const key = 'math_ch' + ci + '_intro';
  const sc = story[key];
  c.ok('章導入がある ' + key, Array.isArray(sc) && sc.length > 0);
  sc.forEach(function (line) { c.ok(key + ' はwho/char/text形式', 'char' in line && 'text' in line); });
}
c.ok('大陸クリアシーンがある', Array.isArray(story.math_clear) && story.math_clear.length > 0);
c.ok('クリアシーンにコタロウ(shiba)登場', story.math_clear.some(function (l) { return l.char === 'shiba'; }));
c.ok('ch5導入に幹部ゼロン(zeron)登場', story.math_ch4_intro.some(function (l) { return l.char === 'zeron'; }));
c.ok('ch3導入にライバル レン(rival)登場', story.math_ch2_intro.some(function (l) { return l.char === 'rival'; }));

// ---- index.html：新キャラportrait・script読み込み・per-userキー ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('story-data.js を読み込む', html.indexOf('src="js/story-data.js') >= 0);
c.ok('_rpgPortrait に rival', html.indexOf("char==='rival'") >= 0);
c.ok('_rpgPortrait に moog', html.indexOf("char==='moog'") >= 0);
c.ok('_rpgPortrait に zeron', html.indexOf("char==='zeron'") >= 0);
c.ok('srpg_story_seen が per-user(MU_PER_USER)', /MU_PER_USER[\s\S]*srpg_story_seen:1/.test(html));
c.ok('srpg_story_seen がマイグレーション対象', html.indexOf("'srpg_story_seen'") >= 0);

// ---- srpg-ui.js：階層ナビ配線 ----
const ui = fs.readFileSync(path.join(ROOT, 'js', 'srpg-ui.js'), 'utf8');
c.ok('srpgContinentScreen が定義', ui.indexOf('function srpgContinentScreen') >= 0);
c.ok('srpgContinentCard が定義', ui.indexOf('function srpgContinentCard') >= 0);
c.ok('ステージ選択で数の大陸を物語カードに差し替え', ui.indexOf("id==='q_math'") >= 0 && ui.indexOf('srpgContinentCard') >= 0);
c.ok('srpgStart が章IDを解決', ui.indexOf('srpgParseChapterId(stageId)') >= 0 && ui.indexOf('srpgChapterStage(') >= 0);
c.ok('章ノード0の初回に導入シーン', ui.indexOf('_srpgChapterIntroScenes') >= 0);
c.ok('章ボス勝利/大陸クリアのシーン再生', ui.indexOf('storyAfter') >= 0 && ui.indexOf('rpgStoryPlay(storyAfter') >= 0);
c.ok('最終章クリアで大陸IDにクリスタル記録', ui.indexOf('srpgMarkCleared(_fc.crystalId)') >= 0);
c.ok('進行判定 srpgChapUnlocked/srpgNodeUnlocked', ui.indexOf('function srpgChapUnlocked') >= 0 && ui.indexOf('function srpgNodeUnlocked') >= 0);

c.done();
