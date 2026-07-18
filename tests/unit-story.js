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

// ---- 山場ボス（幹部ゼロン=5章・ファイナル=10章。boss:true+phase+charge＝魔王と同じ演出） ----
['zeron', 'mathfinal'].forEach(function (k) {
  const t = S.SRPG_ENEMY_TEMPLATES[k];
  c.ok(k + ' テンプレが存在', !!t);
  c.ok(k + ' は boss:true', !!(t && t.boss));
  c.ok(k + ' に phase(かくせい)', !!(t && t.phase && t.phase.name));
  c.ok(k + ' に charge(大技予告)', !!(t && t.charge && t.charge.warn && t.charge.power > 0));
  c.ok(k + ' の charge形状は cross/burst', !!(t && (t.charge.aoe === 'cross' || t.charge.aoe === 'burst')));
});
c.eq('第5章ボスは ゼロン', S.srpgChapterStage('math', 4, 2).enemies.some(function (e) { return e.key === 'zeron'; }), true);
c.eq('第10章ボスは ファイナル', S.srpgChapterStage('math', 9, 2).enemies.some(function (e) { return e.key === 'mathfinal'; }), true);
// 山場ボスは 周回（きょうの挑戦・塔）には出ない
const dailyKeys = S.srpgDailyStage('2026-07-18').enemies.map(function (e) { return e.key; });
c.ok('デイリーに山場ボスが出ない', dailyKeys.indexOf('zeron') < 0 && dailyKeys.indexOf('mathfinal') < 0 && dailyKeys.indexOf('villain') < 0);
// 塔のボス階(5階ごと)は魔王シグマ(villain)が意図的に出る。物語ボス(zeron/mathfinal)だけは出てはいけない。
let towerHasStoryBoss = false;
for (let f = 1; f <= 20; f++) { S.srpgTowerStage(f).enemies.forEach(function (e) { if (e.key === 'zeron' || e.key === 'mathfinal') towerHasStoryBoss = true; }); }
c.ok('塔(1..20階)に物語ボス(zeron/mathfinal)が出ない', !towerHasStoryBoss);

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
c.ok('ch4導入にゼロンの予感(zeron)', story.math_ch3_intro.some(function (l) { return l.char === 'zeron'; }));
c.ok('ch3導入にライバル レン(rival)登場', story.math_ch2_intro.some(function (l) { return l.char === 'rival'; }));
c.ok('ch7導入にレン再会(rival)', story.math_ch6_intro.some(function (l) { return l.char === 'rival'; }));
c.ok('ch10導入にレンの激励(rival)', story.math_ch9_intro.some(function (l) { return l.char === 'rival'; }));
c.ok('相棒モーグ(moog)が複数章に登場', ['math_ch0_intro', 'math_ch5_intro', 'math_ch7_intro'].every(function (k) { return story[k].some(function (l) { return l.char === 'moog'; }); }));
// 全章ボス（ci0..8）に勝利シーン。ci9は大陸クリアで代替。
for (let ci = 0; ci <= 8; ci++) {
  const wk = 'math_ch' + ci + '_win';
  c.ok('章ボス勝利シーンがある ' + wk, Array.isArray(story[wk]) && story[wk].length > 0);
}
c.ok('ch5勝利にゼロン敗北(zeron)', story.math_ch4_win.some(function (l) { return l.char === 'zeron'; }));

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
c.ok('ステージ選択で全大陸を物語カードに差し替え', ui.indexOf('SRPG_CONTINENTS[area]') >= 0 && ui.indexOf('srpgContinentCard(area') >= 0);
c.ok('srpgStart が章IDを解決', ui.indexOf('srpgParseChapterId(stageId)') >= 0 && ui.indexOf('srpgChapterStage(') >= 0);
c.ok('章ノード0の初回に導入シーン', ui.indexOf('_srpgChapterIntroScenes') >= 0);
c.ok('章ボス勝利/大陸クリアのシーン再生', ui.indexOf('storyAfter') >= 0 && ui.indexOf('rpgStoryPlay(storyAfter') >= 0);
c.ok('最終章クリアで大陸IDにクリスタル記録', ui.indexOf('srpgMarkCleared(_fc.crystalId)') >= 0);
c.ok('進行判定 srpgChapUnlocked/srpgNodeUnlocked', ui.indexOf('function srpgChapUnlocked') >= 0 && ui.indexOf('function srpgNodeUnlocked') >= 0);
// srpgEnemyKey は tmplKey を優先（art共有ボス zeron/voltdrake・mathfinal/dragon の取り違え＝ボス判定漏れを防ぐ）
c.ok('srpgEnemyKey が tmplKey を優先', /u\.tmplKey && SRPG_ENEMY_TEMPLATES\[u\.tmplKey\]/.test(ui));

// ===== P3：全5大陸（量産）の整合 =====
const AREAS = ['math', 'japanese', 'english', 'science', 'social'];
const LT = { math: 'zeron', japanese: 'jp_lt', english: 'en_lt', science: 'sci_lt', social: 'so_lt' };
const FIN = { math: 'mathfinal', japanese: 'jp_fin', english: 'en_fin', science: 'sci_fin', social: 'so_fin' };
AREAS.forEach(function (area) {
  c.eq(area + ' は10章', S.srpgChapterCount(area), 10);
  const cont = S.srpgContinent(area);
  c.ok(area + ' 大陸メタ(crystalId/teacherArt)', !!(cont && cont.crystalId === 'q_' + area && cont.teacherArt));
  let bosses = 0;
  for (let ci = 0; ci < 10; ci++) {
    for (let ni = 0; ni < 3; ni++) {
      const st = S.srpgChapterStage(area, ci, ni);
      c.ok(area + ' 生成 ' + ci + '-' + ni, !!st && st.forceWeak === area);
      st.enemies.forEach(function (e) {
        c.ok(area + ' 敵実在 ' + e.key, !!S.SRPG_ENEMY_TEMPLATES[e.key]);
        c.ok(area + ' 盤内 ' + e.key, e.x >= 0 && e.x < 6 && e.y >= 0 && e.y < 7);
      });
      if (ni === 2) bosses++;
    }
  }
  c.eq(area + ' 章ボス10体', bosses, 10);
  c.eq(area + ' 5章ボスは幹部', S.srpgChapterStage(area, 4, 2).enemies.some(function (e) { return e.key === LT[area]; }), true);
  c.eq(area + ' 10章ボスは最終', S.srpgChapterStage(area, 9, 2).enemies.some(function (e) { return e.key === FIN[area]; }), true);
  [LT[area], FIN[area]].forEach(function (k) {
    const t = S.SRPG_ENEMY_TEMPLATES[k];
    c.ok(area + ' ' + k + ' boss:true', !!(t && t.boss));
    c.ok(area + ' ' + k + ' phase+charge(山場)', !!(t && t.phase && t.charge && t.charge.warn && t.charge.power > 0));
  });
  // forceWeak：最終ボスの弱点=その大陸の教科（学習と物語の一致）
  S.srpgBuildUnits(S.srpgChapterStage(area, 9, 2), [{ id: 'h', art: 'cat', role: 'attacker', lvl: 6, rankBase: 8 }])
    .filter(function (u) { return u.side === 'enemy'; })
    .forEach(function (u) { c.eq(area + ' 最終ボス弱点=' + area, S.srpgResistKind(area, u), 'weak'); });
});
// 教科モンスターが敵テンプレに存在（zako＋通常ボス）
['inkblob', 'fudebird', 'kanjioni', 'abcube', 'qbird', 'grammaro', 'microbe', 'flaskun', 'mapmoth', 'haniwa', 'tokiou'].forEach(function (k) {
  c.ok('教科モンスター敵テンプレ ' + k, !!S.SRPG_ENEMY_TEMPLATES[k]);
});
// story-data：全5大陸に intro(10)/win(9)/clear
AREAS.forEach(function (area) {
  for (let ci = 0; ci < 10; ci++) { c.ok(area + ' 章導入 ' + ci, Array.isArray(story[area + '_ch' + ci + '_intro']) && story[area + '_ch' + ci + '_intro'].length > 0); }
  for (let ci = 0; ci <= 8; ci++) { c.ok(area + ' 章勝利 ' + ci, Array.isArray(story[area + '_ch' + ci + '_win']) && story[area + '_ch' + ci + '_win'].length > 0); }
  c.ok(area + ' 大陸クリア', Array.isArray(story[area + '_clear']) && story[area + '_clear'].length > 0);
});
// 全シーンの char が有効キーのみ（誤字＝立ち絵が✨になる不具合を防ぐ）
const VALID_CHARS = ['owl', 'shiba', 'cat', 'rabbit', 'fox', 'bear', 'villain', 'merchant', 'scroll', 'rival', 'moog', 'zeron', 'lt_jp', 'lt_en', 'lt_sci', 'lt_soc', 'secret'];
Object.keys(story).forEach(function (k) { story[k].forEach(function (l) { c.ok(k + ' char有効(' + l.char + ')', VALID_CHARS.indexOf(l.char) >= 0); }); });
// 各大陸の先生が clear シーンに登場（救出）
c.ok('ことば clearにミケ(cat)', story.japanese_clear.some(function (l) { return l.char === 'cat'; }));
c.ok('英語 clearにラビィ(rabbit)', story.english_clear.some(function (l) { return l.char === 'rabbit'; }));
c.ok('理科 clearにナナ(fox)', story.science_clear.some(function (l) { return l.char === 'fox'; }));
c.ok('社会 clearにクマ(bear)', story.social_clear.some(function (l) { return l.char === 'bear'; }));
// 幹部portrait が index.html にある
['lt_jp', 'lt_en', 'lt_sci', 'lt_soc'].forEach(function (k) { c.ok('_rpgPortrait に ' + k, html.indexOf("char==='" + k + "'") >= 0); });

// ===== P4：魔王城アーク（最終決戦＋救済エンディング） =====
c.ok('maou_intro がある', Array.isArray(story.maou_intro) && story.maou_intro.length > 0);
c.ok('maou_clear がある', Array.isArray(story.maou_clear) && story.maou_clear.length > 0);
c.ok('maou_intro に5先生が集結', ['shiba', 'cat', 'rabbit', 'fox', 'bear'].every(function (ch) { return story.maou_intro.some(function (l) { return l.char === ch; }); }));
c.ok('maou_intro にシグマの真実(villain)', story.maou_intro.some(function (l) { return l.char === 'villain'; }));
c.ok('maou_intro にレン参戦(rival)', story.maou_intro.some(function (l) { return l.char === 'rival'; }));
c.ok('maou_clear にシグマ(救済)', story.maou_clear.some(function (l) { return l.char === 'villain'; }));
c.ok('srpgStart が q_maou に maou_intro を配線', ui.indexOf("stageId==='q_maou'") >= 0 && ui.indexOf("_srpgStory('maou_intro')") >= 0);
c.ok('srpgMaouFinale が maou_clear→パネル', ui.indexOf("_srpgStory('maou_clear')") >= 0 && ui.indexOf('function _srpgMaouFinalePanel') >= 0);

// ===== 物語の磨き：章バトル開始の単元ヒント（学習と戦闘の接続） =====
c.ok('srpgChapterHint が定義', ui.indexOf('function srpgChapterHint') >= 0);
c.ok('先生の単元ヒント SRPG_TEACHER_HINT', ui.indexOf('SRPG_TEACHER_HINT') >= 0 && /math:'（コタロウ/.test(ui));
c.ok('VS後に単元ヒントを表示', ui.indexOf('srpgChapterHint(srpgB.stage)') >= 0);

// ===== ③ 裏ボス（エンドゲーム＝魔王城クリア後） =====
const KY = S.SRPG_ENEMY_TEMPLATES.kyomu;
c.ok('裏ボス kyomu テンプレ(boss+phase+charge)', !!(KY && KY.boss && KY.phase && KY.charge && KY.charge.warn));
c.ok('kyomu は全ボス最強(rankBase>=最終ボス)', !!(KY && KY.rankBase >= S.SRPG_ENEMY_TEMPLATES.mathfinal.rankBase));
c.ok('q_secret ステージが存在(quest型)', !!(S.SRPG_STAGES.q_secret && S.SRPG_STAGES.q_secret.type === 'quest'));
c.ok('q_secret に虚無竜ムゲン(kyomu)', S.SRPG_STAGES.q_secret.enemies.some(function (e) { return e.key === 'kyomu'; }));
c.ok('secret_intro/secret_clear がある', Array.isArray(story.secret_intro) && story.secret_intro.length > 0 && Array.isArray(story.secret_clear) && story.secret_clear.length > 0);
c.ok('secret に裏ボス立ち絵(secret char)', story.secret_intro.some(function (l) { return l.char === 'secret'; }));
c.ok('_rpgPortrait に secret', html.indexOf("char==='secret'") >= 0);
c.ok('srpgStart が q_secret に secret_intro を配線', ui.indexOf("stageId==='q_secret'") >= 0 && ui.indexOf("_srpgStory('secret_intro')") >= 0);
c.ok('q_secret 勝利で secret_clear を再生', ui.indexOf("_srpgStory('secret_clear')") >= 0);
c.ok('裏ボスは魔王城クリアまで隠す', ui.indexOf("id !== 'q_secret'") >= 0);

c.done();
