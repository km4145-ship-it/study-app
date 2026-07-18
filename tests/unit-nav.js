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
const cosData = fs.readFileSync(path.join(ROOT, 'js', 'cos-data.js'), 'utf8');
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

// ---- 旧RPGをハブから引っ込め、あいぼう管理をハブへ移設（孤立防止）----
c.ok('ハブに旧RPG(大陸ストーリー)カードが無い', html.indexOf(">大陸ストーリー<") < 0 || html.indexOf("'大陸ストーリー','先生を たすける") < 0);
c.ok('ハブにあいぼう管理カードがある', html.indexOf("hubCard('aibou','🐾','なかま'") >= 0);
c.ok('あいぼう/ずかんの戻るはハブへ（旧マップを開かない）', (html.match(/onclick="showRpg\(\)">← もどる/g) || []).length === 0);
c.ok('あいぼうの戻り先はbackToSubjects', html.indexOf('onclick="backToSubjects()">← ホームへ') >= 0);
// ハブの主要導線に showRpg（旧RPGマップ）入口が残っていない（内部ナビ/中断復帰は除外）
const hubBody = html.slice(html.indexOf('function renderGameHub'), html.indexOf('function renderGameHub') + 4500);
c.ok('ハブ本体に旧RPGマップ(showRpg)入口が無い', hubBody.indexOf('showRpg()') < 0);

// ---- 物語の通し糸：クリスタル収集の可視化（④）----
c.ok('ステージ選択にクリスタルバー', srpgUi.indexOf('srpgCrystalBarHtml(cleared)') >= 0 && srpgUi.indexOf('function srpgCrystalBarHtml') >= 0);
c.ok('大陸初クリアでクリスタル獲得', srpgUi.indexOf('cryFirst') >= 0 && srpgUi.indexOf('srpgCrystalFor(srpgB.stageId)') >= 0);
c.ok('魔王城カードはクリスタル条件を表示', srpgUi.indexOf('5つの クリスタルで ひらく') >= 0);

// ---- きょうの目標（デイリーミッション）が旧RPG非表示後も機能・ハブに表示 ----
c.ok('回答時にミッション達成判定が走る', html.indexOf('rpgBumpDailyCorrect(totalStreak); try{ rpgCheckMissions(); checkAchievements(); }') >= 0);
c.ok('タクト勝利で勝利ミッションを加算', srpgUi.indexOf('rpgBumpDailyWin(); rpgCheckMissions();') >= 0 && html.indexOf('function rpgBumpDailyWin') >= 0);
c.ok('ハブにきょうの目標カードがある', html.indexOf('function _hubMissionsHtml') >= 0 && html.indexOf('h += _hubMissionsHtml();') >= 0);
c.ok('ハブ描画でミッション達成判定が走る', html.indexOf('try{ rpgCheckMissions(); checkAchievements(); }catch(e){}\n  h += _hubMissionsHtml();') >= 0);

// ---- 実績・称号（マイルストーンで称号付与・記録画面で装備）----
c.ok('実績データSTUDY_ACHIEVEMENTSがある', html.indexOf('function STUDY_ACHIEVEMENTS') >= 0);
c.ok('達成判定checkAchievementsがある', html.indexOf('function checkAchievements') >= 0);
c.ok('記録画面に実績セクション', html.indexOf('function renderAchievements') >= 0 && html.indexOf('id="rec-achievements"') >= 0);
c.ok('勝利でも実績判定が走る', srpgUi.indexOf('checkAchievements()') >= 0);
c.ok('実績由来の称号がCOS_TITLESにある', cosData.indexOf('a_maou:{') >= 0 && cosData.indexOf('a_crystal:{') >= 0);

// ---- 初回オンボーディング（使い方ガイド・1度だけ）----
c.ok('初回ガイド showOnboarding がある', html.indexOf('function showOnboarding') >= 0 && html.indexOf('var OB_SLIDES') >= 0);
c.ok('着地で未オンボーディングならガイド表示', html.indexOf('else { try{ maybeShowOnboarding(); }catch(e){} }') >= 0);
c.ok('ガイドは1度だけ（onboardedフラグ）', html.indexOf("safeLS.setItem('onboarded','1')") >= 0 && html.indexOf('onboarded:1') >= 0);
c.ok('設定から使い方を再表示できる', html.indexOf('onclick="showOnboarding()">❓ もう一度みる') >= 0);
c.ok('ガイドは5タブを説明する', html.indexOf("['🏠','ホーム'") >= 0 && html.indexOf("['📊','きろく'") >= 0);

// ---- データ整合性：タクト進捗がユーザー別＋同期＋移行される（家族利用のデータ混線/喪失を防ぐ）----
{
  const muLine = html.slice(html.indexOf('var MU_PER_USER'), html.indexOf('var MU_PER_USER') + 900);
  ['srpg_cleared','srpg_maou_cleared','srpg_stars','srpg_tower_best','srpg_tower_save','srpg_team','srpg_daily_done','scout_log'].forEach(function(k){
    c.ok('MU_PER_USERにタクト進捗 '+k+' が登録（per-user化）', muLine.indexOf(k+':1') >= 0);
  });
  c.ok('srpg進捗の一度きり移行がある', html.indexOf('function _srpgKeyMigrate') >= 0 && html.indexOf('_srpgKeyMigrate();') >= 0);
  c.ok('移行はRAWフラグで端末1回', html.indexOf("_rawGet('srpg_migrated_v1')") >= 0);
  // cloud-sync：u:接頭のsrpg進捗は同期対象・scout_logは除外
  const cs = fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8');
  c.ok('cloud-sync isMemberKey が u: を同期', cs.indexOf("k.indexOf('u:')===0") >= 0);
  c.ok('cloud-sync は scout_log を同期除外', /scout_log/.test(cs) && /q_log\|gacha_log\|scout_log/.test(cs));
}

c.done();
