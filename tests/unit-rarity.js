'use strict';
// レア度帯システム（srpg-mons.js）を検証。ランク→帯→アートの結合が「レア度＝見た目の格」に
// なっているか、スカウト候補が全帯に漏れなく収まるか（fallback回避）を機械的に担保する。
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-rarity');
const M = require(path.join(ROOT, 'js', 'srpg-mons.js'));

// ---- ランク→帯 ----
c.eq('band F=0', M.srpgBandOfRank('F'), 0);
c.eq('band E=0', M.srpgBandOfRank('E'), 0);
c.eq('band S=3', M.srpgBandOfRank('S'), 3);
c.eq('band SS=4', M.srpgBandOfRank('SS'), 4);
c.eq('band SSS=5', M.srpgBandOfRank('SSS'), 5);
c.eq('band LG=6', M.srpgBandOfRank('LG'), 6);
c.eq('band 未知→0', M.srpgBandOfRank('???'), 0);

// ---- アート→帯（格） ----
c.eq('slime tier0', M.srpgTierOfArt('slime'), 0);
c.eq('wolf tier1', M.srpgTierOfArt('wolf'), 1);
c.eq('trent tier2', M.srpgTierOfArt('trent'), 2);
c.eq('slugking tier3', M.srpgTierOfArt('slugking'), 3);
c.eq('dragon tier4', M.srpgTierOfArt('dragon'), 4);
c.eq('zeron(魔神幹部) tier4', M.srpgTierOfArt('zeron'), 4);
c.eq('villain(魔王) tier5', M.srpgTierOfArt('villain'), 5);
c.eq('daimaou(大魔王) tier6', M.srpgTierOfArt('daimaou'), 6);
c.eq('kyomu(裏ボス) tier6', M.srpgTierOfArt('kyomu'), 6);
// 変種/亜種は基本種の帯に解決
c.eq('dragon_fire(属性変種)→4', M.srpgTierOfArt('dragon_fire'), 4);
c.eq('slime2(亜種)→0', M.srpgTierOfArt('slime2'), 0);
// 格の昇順（レア度が上がるほど格上）
c.ok('格の昇順 slime<wolf<trent<slugking<dragon<villain<daimaou',
  M.srpgTierOfArt('slime') < M.srpgTierOfArt('wolf') &&
  M.srpgTierOfArt('wolf') < M.srpgTierOfArt('trent') &&
  M.srpgTierOfArt('trent') < M.srpgTierOfArt('slugking') &&
  M.srpgTierOfArt('slugking') < M.srpgTierOfArt('dragon') &&
  M.srpgTierOfArt('dragon') < M.srpgTierOfArt('villain') &&
  M.srpgTierOfArt('villain') < M.srpgTierOfArt('daimaou'));

// ---- 帯フィルタ（スカウトの結合に使う純関数）----
const legendOnly = M.srpgArtsForBand(6, ['slime', 'dragon', 'villain', 'daimaou', 'enmaou', 'hyoumaou']);
c.ok('band6=神話のみ（大魔王級3体・スライム等は除外）', legendOnly.length === 3 && legendOnly.indexOf('slime') < 0 && legendOnly.indexOf('daimaou') >= 0);
c.ok('band0(N)は dragon を含まない', M.srpgArtsForBand(0, ['slime', 'dragon']).indexOf('dragon') < 0);
c.ok('band4(UR)は dragon を含む', M.srpgArtsForBand(4, ['slime', 'dragon']).indexOf('dragon') >= 0);

// ---- レア度メタ（rank から）----
c.eq('rarity F→band0', M.srpgRarityOfRank('F').band, 0);
c.eq('rarity F→stars1', M.srpgRarityOfRank('F').stars, 1);
c.eq('rarity LG→band6', M.srpgRarityOfRank('LG').band, 6);
c.eq('rarity LG→神話', M.srpgRarityOfRank('LG').name, '神話');
c.eq('rarity LG→stars7', M.srpgRarityOfRank('LG').stars, 7);

// ---- カバレッジ：スカウト候補が すべて 帯0..6 に収まり、全帯が非空（fallback回避＝どのランクでも候補がある）----
const all = Object.keys(M.SRPG_MON_BASE_NAMES).concat(Object.keys(M.SRPG_MON_VARIANTS2));
const bandCount = [0, 0, 0, 0, 0, 0, 0];
all.forEach(function (a) { var t = M.srpgTierOfArt(a); if (t >= 0 && t <= 6) bandCount[t]++; });
c.ok('全スカウト候補が 帯0..6 に解決', all.every(function (a) { var t = M.srpgTierOfArt(a); return t >= 0 && t <= 6; }));
c.ok('全帯0..6が非空（どのランクでも候補が存在＝安全）', bandCount.every(function (n) { return n > 0; }), JSON.stringify(bandCount));

// ---- レア度オーラ枠ラッパ（表示層）----
c.ok('rarityWrap LG→band-6＋LGバッジ', /band-6/.test(M.srpgRarityWrap('X', 'LG')) && /srpg-rar-badge">LG</.test(M.srpgRarityWrap('X', 'LG')));
// 二枚看板の表示ラベル：SSS→UR、LG→LG、その下は階級文字のまま
c.eq('rankLabel SSS→UR', M.srpgRankLabel('SSS'), 'UR');
c.eq('rankLabel LG→LG', M.srpgRankLabel('LG'), 'LG');
c.eq('rankLabel SS→SS（そのまま）', M.srpgRankLabel('SS'), 'SS');
c.eq('rankLabel S→S（そのまま）', M.srpgRankLabel('S'), 'S');
c.eq('rankTitle LG→神話', M.srpgRankTitle('LG'), '神話');
c.eq('rankTitle SSS→伝説', M.srpgRankTitle('SSS'), '伝説');
c.eq('rankTitle SS→称号なし', M.srpgRankTitle('SS'), '');
c.eq('帯5=UR/伝説（SSS階級・2番手）', M.srpgRarityOfRank('SSS').name + M.srpgRarityBand(5).key, '伝説UR');
c.eq('帯6=LG/神話（LG階級・最強）', M.srpgRarityBand(6).key, 'LG');
c.ok('rarityWrap F→band-0＋Nバッジ', /band-0/.test(M.srpgRarityWrap('X', 'F')) && /srpg-rar-badge">N</.test(M.srpgRarityWrap('X', 'F')));
c.ok('rarityWrap は innerHTML を保持', M.srpgRarityWrap('<b>竜</b>', 'SS').indexOf('<b>竜</b>') >= 0);
c.ok('rarityWrap は rk-クラスと色変数を付与', /rk-SS/.test(M.srpgRarityWrap('X', 'SS')) && /--rc:/.test(M.srpgRarityWrap('X', 'SS')));

// ---- Phase3+5：上位帯の新規スカウト種（魔神幹部5体＝UR ＋ 虚無竜＝神話）----
c.eq('zeron 名前', M.srpgMonName('zeron'), '天秤の魔神ゼロン');
c.eq('sci_lt 名前', M.srpgMonName('sci_lt'), 'まやかしの魔神ペテル');
c.eq('kyomu 名前', M.srpgMonName('kyomu'), '虚無竜ムゲン');
c.ok('魔神幹部/虚無竜は 属性変種を持たない（唯一無二）', !M.SRPG_MON_VARIANTS2['zeron_fire'] && !M.SRPG_MON_VARIANTS2['sci_lt_ice'] && !M.SRPG_MON_VARIANTS2['kyomu_dark']);
c.eq('base種 30（24＋魔神6）', Object.keys(M.SRPG_MON_BASE_NAMES).length, 30);
c.eq('属性変種 100（20種×5・魔神は除外）', Object.keys(M.SRPG_MON_VARIANTS2).length, 100);
const dexAll = Object.keys(M.SRPG_MON_BASE_NAMES).concat(Object.keys(M.SRPG_MON_VARIANTS2));
c.eq('dex総数=130', dexAll.length, 130);
c.ok('UR帯(4)に 魔神幹部zeronが入る', M.srpgArtsForBand(4, dexAll).indexOf('zeron') >= 0);
c.ok('UR帯(4)に ドラゴンも残る', M.srpgArtsForBand(4, dexAll).indexOf('dragon') >= 0);
c.ok('神話帯(6)=kyomu＋大魔王級3体の4体のみ', (function () { var b6 = M.srpgArtsForBand(6, dexAll); return b6.length === 4 && b6.indexOf('kyomu') >= 0 && b6.indexOf('daimaou') >= 0 && b6.every(function (a) { return M.srpgTierOfArt(a) === 6; }); })());

// ---- Phase4：進化ライン（育てると 姿が変身）----
c.eq('slime@F → スライム', M.srpgEvoFormFor('slime', 'F').art, 'slime');
c.eq('slime@C(band1) → まだスライム', M.srpgEvoFormFor('slime', 'C').art, 'slime');
c.eq('slime@S(band3) → キングスライム', M.srpgEvoFormFor('slime', 'S').art, 'slime_king');
c.eq('slime@SS(band4) → キングのまま', M.srpgEvoFormFor('slime', 'SS').art, 'slime_king');
c.eq('slime@SSS(band5) → スライム魔神', M.srpgEvoFormFor('slime', 'SSS').art, 'slime_lord');
c.eq('slime@LG(band6) → スライム魔神', M.srpgEvoFormFor('slime', 'LG').art, 'slime_lord');
c.eq('キング@SSS → 魔神（現フォームからも辿れる）', M.srpgEvoFormFor('slime_king', 'SSS').art, 'slime_lord');
c.eq('ライン無し(dragon) → null', M.srpgEvoFormFor('dragon', 'LG'), null);
// 進化フォームの名前・アート・格
c.eq('名 slime_king', M.srpgMonName('slime_king'), 'キングスライム');
c.eq('名 slime_lord', M.srpgMonName('slime_lord'), 'スライム魔神');
c.eq('格 slime_king=3(SSR)', M.srpgTierOfArt('slime_king'), 3);
c.eq('格 slime_lord=5(伝説)', M.srpgTierOfArt('slime_lord'), 5);
c.ok('進化フォームの SVGアートが存在', !!M.SRPG_MON_ART['slime_king'] && !!M.SRPG_MON_ART['slime_lord']);
// 進化フォームは スカウト/dex に混ざらない（AIBOU/BASE_NAMES/変種に無い）
c.ok('進化フォームは base名簿/変種に含まれない（dex非加算）', !M.SRPG_MON_BASE_NAMES['slime_king'] && !M.SRPG_MON_BASE_NAMES['slime_lord'] && !M.SRPG_MON_VARIANTS2['slime_king']);

// ---- なかま分類（種別／ランクで グループ表示）----
const roster = [
  { id: 'a', sp: 'slime', rank: 'F', lv: 3 },
  { id: 'b', sp: 'dragon', rank: 'LG', lv: 1 },
  { id: 'c', sp: 'slime', rank: 'F', lv: 9 },
  { id: 'd', sp: 'maou', rank: 'SSS', lv: 5 },
  { id: 'e', sp: 'beast', rank: 'A', lv: 2 }
];
const gR = M.srpgClassifyRoster(roster, 'rank');
c.ok('rank分類：先頭が最高レア(LG・band6)', gR[0].key === 'LG' && gR[0].band === 6);
c.ok('rank分類：最後がF', gR[gR.length - 1].key === 'F');
c.ok('rank分類：F群は Lv降順(9→3)', (function () { var f = gR.filter(function (g) { return g.key === 'F'; })[0]; return f.items[0].lv === 9 && f.items[1].lv === 3; })());
c.ok('rank分類：ラベルに帯名(SSS→伝説)', /伝説/.test(gR.filter(function (g) { return g.key === 'SSS'; })[0].label));
const gS = M.srpgClassifyRoster(roster, 'species');
c.eq('species分類：魔王級が先頭', gS[0].key, 'maou');
c.eq('species分類：スライム系ラベル', gS.filter(function (g) { return g.key === 'slime'; })[0].label, 'スライム系');
c.ok('species分類：slime群は 同ランクLv降順(9先頭)', gS.filter(function (g) { return g.key === 'slime'; })[0].items[0].lv === 9);
c.eq('空リスト→[]', M.srpgClassifyRoster([], 'rank').length, 0);

c.done();
