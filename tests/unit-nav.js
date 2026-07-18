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

// ---- タブの一致：旧RPG系の子画面はホームタブを点灯（advではない）。showRpgマップ本体は撤去済み ----
c.ok("旧RPG系の子画面(あいぼう)はhomeタブを点灯", html.indexOf("setActiveTab('home');   // あいぼうは") >= 0);
c.ok("旧RPGマップ(showRpg)は撤去済み", html.indexOf("function showRpg(){") < 0);
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

// ---- #3 タクトの正解が今日の目標/通算/苦手/ミッションに集計される ----
c.ok('recordTactAnswer が定義されている', html.indexOf('function recordTactAnswer') >= 0);
c.ok('recordTactAnswerが通算・目標・ミッションを集計', html.indexOf("safeLS.setItem('c_answered', totalAnswered)") >= 0 && /function recordTactAnswer[\s\S]*bumpDaily\(\);[\s\S]*rpgBumpDailyCorrect\(0\); rpgCheckMissions\(\); checkAchievements\(\);/.test(html));
c.ok('タクト解答がrecordTactAnswerを呼ぶ', srpgUi.indexOf('recordTactAnswer(srpgB.subject, q&&q.sub, correct)') >= 0);

// ---- #4 大技チャージの安全弁（発動者が倒れたら予告を破棄）----
c.ok('チャージ発動者死亡で予告を破棄', srpgUi.indexOf('srpgUnitById(srpgB.charge.by); if(!_co || _co.downed){ srpgB.charge = null;') >= 0);

// ---- バランス（公平性）：即死回避・コンボ会心リセット・とくぎ失敗のMP温存・かくせい緩和・par ----
const srpgJs = fs.readFileSync(path.join(ROOT, 'js', 'srpg.js'), 'utf8');
c.ok('大技ダメージに上限（満タン即死を防ぐ）', srpgUi.indexOf('Math.min(dmg, Math.round(u.maxHp * 0.6))') >= 0);
c.ok('コンボ会心は3連続ごとにリセット（雪だるま解消）', srpgUi.indexOf('if(crit) srpgB.combo = 0;') >= 0);
c.ok('とくぎのMPは成功時のみ消費', srpgUi.indexOf('if(sk) actor.mp = Math.max(0, (actor.mp||0) - sk.mp);   // MPは成功時のみ消費') >= 0);
c.ok('とくぎ失敗前にMPを消費しない', srpgUi.indexOf('srpgSkill(srpgB.chosenSkill) : null;\n  if(sk) actor.mp') < 0);
c.ok('かくせいの攻撃上昇を緩和(+1段)', srpgJs.indexOf("phase:{ hp:0.5, atk:1, def:1, name:'かくせい'") >= 0);
c.ok('★3のparが難易度で自動スケール', srpgUi.indexOf('srpgB.stage.par || (4 + srpgB.stage.enemies.length') >= 0);

// ---- UX：タクト入口のディープリンク＋既定ステージ選択、パーティ二重化の解消 ----
c.ok('srpgOpenがディープリンク(daily/tower/team)を受ける', srpgUi.indexOf("if(dest==='daily'){ try{ srpgStart('daily')") >= 0 && srpgUi.indexOf("dest==='team'){ srpgTeamScreen()") >= 0);
c.ok('srpgOpenの既定はステージ選択（毎回編成をくぐらせない）', /srpgOpen\(dest\)[\s\S]{0,400}srpgStageSelect\(\);\s+\/\/ 既定/.test(srpgUi));
c.ok('きょうのタクトstripがdaily/towerへ直リンク', html.indexOf("srpgOpen(\\'daily\\')") >= 0 && html.indexOf("srpgOpen(\\'tower\\')") >= 0);
c.ok('なかま画面はタクト編成へ誘導（3スロット別パーティを廃止）', html.indexOf('しゅつげきメンバーは タクトの<b>「編成」</b>で えらぶよ') >= 0 && html.indexOf('🎒 パーティ（いっしょに たたかう 3びき）') < 0);
c.ok('なかま詳細のパーティ・トグルを撤去', html.indexOf('🎒 パーティに いれる') < 0 && html.indexOf('🎒 パーティから はずす') < 0);

c.ok('スカウト低ランクの基礎値に下限5(初期仲間との逆転防止)', srpgUi.indexOf('Math.max(5, (typeof AIBOU_RANK_BASE')>=0);

// ---- UX2：おすすめ教科の算数固定を解消・無料スカウトの発見性・きろく並べ替え ----
c.ok('おすすめCTAが算数固定でない（苦手/ローテ）', html.indexOf('function _recommendArea') >= 0 && html.indexOf('startPractice(_recommendArea())') >= 0);
c.ok('無料スカウト可能時にぼうけんカードへバッジ', html.indexOf("_freeScout?'🎁':0") >= 0 && html.indexOf('srpgScoutFreeReady') >= 0);
c.ok('きろく：今日の目標が保護者向けより上に', html.indexOf('🎯 今日の目標・連続記録') < html.indexOf('おうちの方へ（保護者向け）'));
c.ok('きろく：保護者向けは折りたたみ', html.indexOf('<details class="rec-fold"><summary>👨‍👩‍👧 おうちの方へ') >= 0);
c.ok('きろく：偏差値推移チャートは折りたたみ外（レイアウト0回避）', html.indexOf('id="rec-trend"') < html.indexOf('<details class="rec-fold">'));
// ---- スカウト高レア演出：星の雨がモンスターを覆い隠さない（層分離）----
c.ok('スカウト演出：暗幕を別レイヤーに分離', html.indexOf('.srpg-scout-bg{')>=0 && html.indexOf('z-index:1600')>=0);
c.ok('スカウト演出：モンスターがパーティクルの前面(z1700)', html.indexOf('.srpg-scout{ position:absolute; inset:0; z-index:1700; background:transparent;')>=0);
c.ok('パーティクルキャンバスをcharge後に下げる(1660)', srpgUi.indexOf('gachaFx.charge(fxRank); }catch(e){}\n  fxCv(1660);')>=0);
// ---- 学習の定着・報酬連動 ----
c.ok('正解ポイントが難易度連動(易問グラインド対策)', html.indexOf("var _lvMult = { '★☆☆':1, '★★☆':1.2, '★★★':1.5, '★★★★':2 }")>=0 && html.indexOf('(totalStreak >= 5 ? 30 : totalStreak >= 3 ? 20 : 10) * _dm')>=0);
c.ok('SRSは選択式のまぐれ正解で卒業させない(2回正解)', html.indexOf("if((arr[i].type||q.type)==='choice'){")>=0 && html.indexOf('if(cc<2){ arr[i].cc=cc;')>=0);
c.ok('誤答でccをリセット', html.indexOf('arr[i].box = 0; arr[i].cc = 0;')>=0);
c.ok('ヒーローCTAが期限復習を優先表示(準強制)', html.indexOf("due>0 ? ('🔁 ふくしゅう '+due+'問")>=0);
c.done();
