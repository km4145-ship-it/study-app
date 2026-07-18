'use strict';
// ナビ骨格の不変条件を固定する回帰テスト（①動線の骨格整備）。
// ・ログイン後はホーム（ハブ）に着地する（旧RPGマップではない）
// ・旧RPG系の子画面（大陸ストーリー/あいぼう/ずかん）は「ぼうけん(=タクト)」タブではなく
//   ホームタブを点灯させる（点灯タブと遷移先の不一致＝“嘘のタブ”を防ぐ）
// ・setActiveTab('adv') は muNav（=タクトの入口）以外から呼ばれない
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-nav');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- 着地：muGreetAndEnter はハブ(showSubjectSelect)を開く ----
const greet = html.slice(html.indexOf('function muGreetAndEnter'), html.indexOf('function muGreetAndEnter') + 400);
c.ok('ログイン後はハブ(showSubjectSelect)に着地する', greet.indexOf('showSubjectSelect()') >= 0);
c.ok('ログイン着地で旧RPGマップ(showRpg)を直接開かない', greet.indexOf('showRpg()') < 0);
c.ok('着地でも日次ログインボーナスを取りこぼさない', greet.indexOf('rpgLoginBonus()') >= 0);

// ---- タブの一致：旧RPG系はホームタブを点灯（advではない） ----
c.ok("旧RPGマップ(showRpg)はhomeタブを点灯", html.indexOf("setActiveTab('home');   // 旧RPG") >= 0);
c.ok('旧RPG系にadv点灯が残っていない（嘘のタブを排除）',
  html.indexOf("hideMainScreens(); setActiveTab('adv')") < 0 &&
  html.indexOf("hideMainScreens();\n  setActiveTab('adv')") < 0);

// ---- adv点灯はmuNavの動的 setActiveTab(dest) 経由のみ（リテラル'adv'点灯は残さない） ----
const advCalls = (html.match(/setActiveTab\('adv'\)/g) || []).length;
c.eq("リテラルsetActiveTab('adv')は残っていない（点灯はmuNav経由）", advCalls, 0);
const muNav = html.slice(html.indexOf('function muNav'), html.indexOf('function muNav') + 500);
c.ok('ぼうけんタブ(muNav adv)はタクト(srpgOpen)へ', muNav.indexOf("dest==='adv') srpgOpen()") >= 0);

// ---- アイコンの棲み分け：⚔️=タクトぼうけんタブ / 🗡️は旧RPGトップバーに残さない ----
c.ok('ぼうけんタブのアイコンは⚔️', html.indexOf('data-tab="adv" onclick="muNav(\'adv\')" aria-label="ぼうけん"><span class="mt-i">⚔️</span>') >= 0);
c.ok('旧RPGトップバーの🗡️衝突を解消（🗺️大陸ストーリー）', html.indexOf('<div class="rpg-topttl">🗺️ 大陸ストーリー</div>') >= 0);

// ---- タクト一本化：物語がタクト単体で伝わる＋育成はタクトのチームを保護 ----
const srpgUi = fs.readFileSync(path.join(ROOT, 'js', 'srpg-ui.js'), 'utf8');
const tut = srpgUi.slice(srpgUi.indexOf('var SRPG_TUT_LINES'), srpgUi.indexOf('var SRPG_TUT_LINES') + 900);
c.ok('タクト初回に魔王シグマの動機づけがある', tut.indexOf('魔王シグマ') >= 0);
c.ok('タクト初回にクリスタル収集の目的がある', tut.indexOf('クリスタル') >= 0);
c.ok('育成の保護対象はタクトのチーム(srpg_team)', srpgUi.indexOf("lsGetJSON('srpg_team', null)") >= 0 && srpgUi.indexOf('function srpgProtectedIds') >= 0);
c.ok('育成が旧RPGのai.partyを直接保護していない（ねじれ解消）', srpgUi.indexOf('var party = ai.party || [];') < 0);
c.ok('育成の合成可否がsrpgProtectedIdsを使う', srpgUi.indexOf('srpgSkillUpCanFuse(base, mat, srpgProtectedIds(ai))') >= 0);

// ---- タクトに独自の結末（魔王フィナーレ）があり自立している ----
c.ok('魔王フィナーレの台詞群がある', srpgUi.indexOf('SRPG_MAOU_LINES') >= 0);
c.ok('srpgMaouFinale が定義されている', srpgUi.indexOf('function srpgMaouFinale') >= 0);
c.ok('q_maou初制覇でフィナーレを自動再生', srpgUi.indexOf('maouFirst') >= 0 && srpgUi.indexOf("srpgB.stageId === 'q_maou'") >= 0);
c.ok('結果画面にエンディング再生ボタン', srpgUi.indexOf("onclick=\"srpgMaouFinale()\"") >= 0);

c.done();
