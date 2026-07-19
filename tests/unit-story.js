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

// ===== レビュー修正 A/#1：章ボスの固有名＋boss標識（VS演出/王冠/BGMを正しく） =====
AREAS.forEach(function (area) {
  for (let ci = 0; ci < 10; ci++) {
    const st = S.srpgChapterStage(area, ci, 2);
    const bossE = st.enemies[1];
    c.ok(area + ' ch' + ci + ' ボス敵にboss標識', bossE.boss === true);
    c.ok(area + ' ch' + ci + ' ボス敵に固有名=' + st.boss, bossE.name === st.boss && st.boss.length > 0);
    const units = S.srpgBuildUnits(st, [{ id: 'h', art: 'cat', role: 'attacker', lvl: 5, rankBase: 8 }]).filter(function (u) { return u.side === 'enemy'; });
    c.eq(area + ' ch' + ci + ' ユニットのボスは1体', units.filter(function (u) { return u.boss; }).length, 1);
    c.ok(area + ' ch' + ci + ' ボスユニット名一致', units.filter(function (u) { return u.boss; })[0].name === st.boss);
  }
});
c.ok('srpgIsBossUnit をVS選出/王冠で使用', ui.indexOf('function srpgIsBossUnit') >= 0 && ui.indexOf('enemies.filter(srpgIsBossUnit)') >= 0 && ui.indexOf('var isBoss = srpgIsBossUnit(u)') >= 0);
c.ok('ボスBGMは stage.boss で判定', ui.indexOf("bgmPlay(stage.boss ? 'boss' : 'battle')") >= 0);

// ===== レビュー修正 C：進行/クリスタル判定の実挙動（純関数＝off-by-one を実検出） =====
AREAS.forEach(function (area) {
  // 最終章ボス判定：(9,2)のみ true
  c.ok(area + ' 最終ボスは(9,2)のみ', S.srpgIsFinalBoss(area, 9, 2) === true && S.srpgIsFinalBoss(area, 8, 2) === false && S.srpgIsFinalBoss(area, 9, 1) === false);
  const empty = {};
  c.ok(area + ' 空clearedで1章のみ解放', S.srpgChapUnlockedIn(area, 0, empty) === true && S.srpgChapUnlockedIn(area, 1, empty) === false);
  const c1 = {}; c1[S.srpgChapterId(area, 0, 2)] = 1;
  c.ok(area + ' 1章クリアで2章解放・3章未解放', S.srpgChapUnlockedIn(area, 1, c1) === true && S.srpgChapUnlockedIn(area, 2, c1) === false);
  c.ok(area + ' ch1はnode0のみ解放', S.srpgNodeUnlockedIn(area, 0, 0, empty) === true && S.srpgNodeUnlockedIn(area, 0, 1, empty) === false && S.srpgNodeUnlockedIn(area, 0, 2, empty) === false);
  const n0 = {}; n0[S.srpgChapterId(area, 0, 0)] = 1;
  c.ok(area + ' node0クリアでnode1解放・node2未解放', S.srpgNodeUnlockedIn(area, 0, 1, n0) === true && S.srpgNodeUnlockedIn(area, 0, 2, n0) === false);
  const n1 = {}; n1[S.srpgChapterId(area, 0, 0)] = 1; n1[S.srpgChapterId(area, 0, 1)] = 1;
  c.ok(area + ' node1クリアでnode2解放', S.srpgNodeUnlockedIn(area, 0, 2, n1) === true);
  c.ok(area + ' 未解放章のnode0もロック', S.srpgNodeUnlockedIn(area, 5, 0, empty) === false);
  // クリスタル授与は最終章ボスのみ（非最終章の章ノードidはクリスタルに一致しない＝早期授与しない）
  const cont = S.srpgContinent(area);
  c.ok(area + ' 最終章で ' + cont.crystalId + ' クリスタル定義あり', !!S.srpgCrystalFor(cont.crystalId));
  c.ok(area + ' 非最終章はクリスタル無し(早期授与しない)', S.srpgCrystalFor(S.srpgChapterId(area, 0, 2)) === null && S.srpgCrystalFor(S.srpgChapterId(area, 8, 2)) === null);
});
c.ok('srpg-uiが純関数に委譲(srpgChapUnlockedIn等)', ui.indexOf('srpgChapUnlockedIn(area') >= 0 && ui.indexOf('srpgNodeUnlockedIn(area') >= 0 && ui.indexOf('srpgIsFinalBoss(chapWin.area') >= 0);
// 導入シーンの既読は「再生後」にマーク（途中離脱で見逃す事故を防ぐ）
c.ok('章導入の既読は再生後にマーク(marks)', ui.indexOf('chIntro.marks.forEach(srpgMarkStorySeen)') >= 0);
c.ok('魔王城/裏ボス突入も再生後マーク', ui.indexOf("srpgMarkStorySeen('maou_intro'); srpgDeployBegin()") >= 0 && ui.indexOf("srpgMarkStorySeen('secret_intro'); srpgDeployBegin()") >= 0);
c.ok('フィナーレパネル二重生成ガード', ui.indexOf("host.querySelector('.srpg-finale')") >= 0);

// ===== レビュー修正 B：クラウド同期のマージ規則（進捗/既読を端末間で失わない） =====
const cs = fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8');
c.ok('srpg_cleared/srpg_story_seen は union マージ', /isUnionObj[\s\S]{0,120}srpg_cleared/.test(cs) && /isUnionObj[\s\S]{0,120}srpg_story_seen/.test(cs));
c.ok('srpg_stars は max マージ', /isObjMax[\s\S]{0,120}srpg_stars/.test(cs));

// ===== 自動モード（冒険の移動を自動化） =====
c.ok('srpgAllyAutoPlan がエクスポート', typeof S.srpgAllyAutoPlan === 'function');
c.ok('自動モードのUI関数が定義', ui.indexOf('function srpgToggleAuto') >= 0 && ui.indexOf('function srpgAutoAllyMove') >= 0 && ui.indexOf('function srpgAutoPref') >= 0);
c.ok('ターンバーに🤖じどうトグル', ui.indexOf('srpgToggleAuto()') >= 0 && ui.indexOf('🤖じどう') >= 0);
c.ok('srpgSelectActor が auto で自動実行', ui.indexOf('srpgB.auto && actor') >= 0 && ui.indexOf('srpgAutoAllyMove') >= 0);
c.ok('自動は移動→pick-subject（出題=学習は残す）', /plan\.kind === 'attack'[\s\S]{0,220}pick-subject/.test(ui));
c.ok('srpg_auto が per-user(MU_PER_USER)＋移行対象', /MU_PER_USER[\s\S]*srpg_auto:1/.test(html) && html.indexOf("'srpg_auto'") >= 0);

// ===== 進行ウォッチドッグ（バトルが二度と進まない事故の自己回復） =====
c.ok('srpgWatchStart/Stop/Tick が定義', ui.indexOf('function srpgWatchStart') >= 0 && ui.indexOf('function srpgWatchStop') >= 0 && ui.indexOf('function srpgWatchTick') >= 0);
c.ok('バトル開始で起動', /function srpgBattleBegin[\s\S]{0,260}srpgWatchStart\(\)/.test(ui));
c.ok('決着＆離脱で停止', /srpgB\.over = true[\s\S]{0,60}srpgWatchStop\(\)/.test(ui) && /function srpgClose\(\)\s*\{\s*srpgWatchStop\(\)/.test(ui));
c.ok('入力待ち/出題中は監視しない', ui.indexOf("srpgB.busy || p==='select'") >= 0);
c.ok('ハング検出で srpgNextTurn 復帰', ui.indexOf('_srpgWdN >= 6') >= 0 && ui.indexOf('srpgB.busy = false; srpgClearHi(); srpgNextTurn()') >= 0);

// ===== U3：初回オンボーディングで学年を選ばせる（最大の離脱要因の解消） =====
c.ok('OB_SLIDES 先頭が学年選択スライド(grade:true)', /var OB_SLIDES=\[\s*\{[^}]*grade:true/.test(html));
c.ok('obRender が grade スライドで gp-grid を描く', /if\(s\.grade\)\{[\s\S]{0,320}gp-grid[\s\S]{0,220}obPickGrade\(/.test(html));
c.ok('obPickGrade が現ユーザーの学年を設定＋ヘッダー更新＋次へ', /function obPickGrade\(l\)\{[\s\S]{0,200}muSetUserGrade\(u\.id, l\)[\s\S]{0,120}muUpdateHeader\(\)[\s\S]{0,120}obNext\(\)/.test(html));
c.ok('grade スライドは gp-cell 9学年（小1〜中3）', (html.match(/\['小1',1,/)||[]).length >= 1 && html.indexOf("['中3',9,'🦁']") >= 0);
c.ok('grade picker はダークモードで白×白にならない', html.indexOf('body.dark .gp-cell{') >= 0);

// ===== オンボーディング：名前＋キャラ選択（"ユーザー1"始まりの解消・UX#3）=====
c.ok('OB_SLIDES に profile スライド（学年の次）', /grade:true[\s\S]{0,200}profile:true/.test(html));
c.ok('obRender が profile で 名前入力＋キャラグリッドを描く',
  /if\(s\.profile\)\{[\s\S]{0,400}ob-name[\s\S]{0,300}MU_CHARS\.map/.test(html));
c.ok('obSaveProfile が muRenameUser＋muSetUserChar で保存', /function obSaveProfile\(\)\{[\s\S]{0,260}muRenameUser\(u\.id, nm\)[\s\S]{0,120}muSetUserChar\(u\.id, _obChar\)/.test(html));
c.ok('obPickChar は再レンダーせずハイライトのみ（入力中の名前を消さない）',
  /function obPickChar\(ck\)\{[\s\S]{0,400}classList\.remove\('on'\)/.test(html) && html.slice(html.indexOf('function obPickChar('), html.indexOf('function obSaveProfile(')).indexOf('obRender()') < 0);
c.ok('デフォルト名(ユーザーN)は入力欄に出さない', html.indexOf("!/^ユーザー\\d+$/.test(_up.name)") >= 0);

// ===== 習熟マップを大陸マップへ重畳（教科の習得率を大陸カードに）=====
c.ok('srpgAreaMasteryPct が masterySummary を使う',
  ui.indexOf('function srpgAreaMasteryPct(') >= 0 && ui.indexOf('masterySummary(rows).pct') >= 0);
c.ok('大陸カードに習得率バッジ（施錠中は出さない）',
  ui.indexOf('srpg-sc-mas') >= 0 && /var mas = locked \? -1 : srpgAreaMasteryPct\(area\)/.test(ui));
c.ok('習得率バッジのCSSがある', html.indexOf('.srpg-sc-mas{') >= 0);

// ===== ガチャ（スカウト10連）：送りをゆっくり＋レア演出を豪華に =====
c.ok('10連の送り間隔は定数 SRPG_SEQ_MS で管理', ui.indexOf('var SRPG_SEQ_MS = {') >= 0 && ui.indexOf('SRPG_SEQ_MS.mid') >= 0 && ui.indexOf('SRPG_SEQ_MS.low') >= 0);
{
  const m = ui.match(/var SRPG_SEQ_MS = \{ low: (\d+), mid: (\d+) \}/);
  c.ok('送りは以前(low460/mid950)よりゆっくり', !!m && parseInt(m[1]) >= 700 && parseInt(m[2]) >= 1300);
}
c.ok('高レアに脈打つオーラ要素＋CSS', ui.indexOf("isHigh ? '<div class=\"srpg-scout-aura\">") >= 0 && html.indexOf('.srpg-scout-aura{') >= 0);
c.ok('伝説(LG/SSS)は紙吹雪・星の雨を追い波で重ねる', /mon\.rank==='LG' \|\| mon\.rank==='SSS'/.test(ui) && /_lg[\s\S]{0,300}gachaFx\.rain/.test(ui));

// ===== ③ 大魔王級レアモンスター（LG限定スカウト）=====
c.ok('_scoutArts は大魔王級(LEG)をLGのときだけ追加', /if\(rank==='LG'\) arts = arts\.concat\(LEG\)/.test(ui) && ui.indexOf('LEG.indexOf(a)<0') >= 0);
{
  const mons = fs.readFileSync(path.join(ROOT, 'js', 'srpg-mons.js'), 'utf8');
  c.ok('大魔王級3体のアートが定義（daimaou/enmaou/hyoumaou）',
    /daimaou:\s*\n?\s*_mFiend/.test(mons) && /enmaou:\s*\n?\s*_mFiend/.test(mons) && /hyoumaou:\s*\n?\s*_mFiend/.test(mons));
  c.ok('大魔王級は属性変種を作らない（唯一無二）', mons.indexOf("b==='villain' || _leg.indexOf(b)>=0") >= 0);
  const ab = fs.readFileSync(path.join(ROOT, 'js', 'aibou.js'), 'utf8');
  c.ok('大魔王級の種族は maou', /daimaou:'maou', enmaou:'maou', hyoumaou:'maou'/.test(ab));
}

// ===== 習熟度→戦闘力（学習直結）=====
c.ok('srpgSubjMasteryMult が masteryPowerBonus を使う',
  ui.indexOf('function srpgSubjMasteryMult(') >= 0 && ui.indexOf('masteryPowerBonus(srpgAreaMasteryPct(area))') >= 0);
c.ok('攻撃解決で習熟ボーナスを威力に乗せる（power×qb×mBonus）',
  ui.indexOf('var mBonus = srpgSubjMasteryMult(srpgB.subject)') >= 0 && ui.indexOf('power * qb * mBonus') >= 0);
c.ok('習熟ボーナス発動でポップアップ表示', ui.indexOf("'🎓習熟+'") >= 0);
c.ok('教科えらびに習熟チップ＋予測へ倍率反映', ui.indexOf('srpg-mas-b') >= 0 && /srpgForecast\(_me, tgt, k,[^)]*mMult\)/.test(ui));
c.ok('習熟チップCSSがある', html.indexOf('.srpg-mas-b{') >= 0);

// ===== 単元ボス（弱点＝勉強）=====
c.ok('srpgAsk が章の単元(stage.topic)に出題を寄せる', ui.indexOf('srpgTopicKeyword(srpgB.stage.topic)') >= 0 && ui.indexOf('q.sub.indexOf(_topicKw)') >= 0);
c.ok('単元一致フラグ srpgB._qTopic を立てる', ui.indexOf('srpgB._qTopic = !!(_topicKw') >= 0);
c.ok('ボス相手＋単元一致で×1.5ダメージ',
  /_qTopic && _tgtE && _tgtE\.boss\) \? 1\.5 : 1/.test(ui) && ui.indexOf('power * qb * mBonus * tBonus') >= 0);
c.ok('弱点単元をついたポップアップ', ui.indexOf("'📘弱点単元を ついた！×1.5'") >= 0);
c.ok('教科えらびにボスの弱点単元バナー＋CSS', ui.indexOf('srpg-topic-boss') >= 0 && html.indexOf('.srpg-topic-boss{') >= 0);

// ===== 復帰導線（数日ぶりの前向きな迎え・通知なしでアプリ内完結）=====
c.ok('maybeShowComeback/_lastActivityGapDays が定義',
  html.indexOf('function maybeShowComeback(') >= 0 && html.indexOf('function _lastActivityGapDays(') >= 0);
c.ok('既存ユーザーのログイン着地で復帰チェックを呼ぶ',
  /_onboarded\(\)\)\{[\s\S]{0,120}maybeShowComeback\(\)/.test(html));
c.ok('復帰は毎日/60日超を除外し 今日は1回だけ',
  /gap<2 \|\| gap>60/.test(html) && html.indexOf("safeLS.getItem('comeback_seen')===tk") >= 0);
c.ok('comeback_seen は per-user 同期対象', html.indexOf('comeback_seen:1') >= 0);

c.done();
