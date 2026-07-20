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
c.ok('rarityWrap LG→band-6＋MRバッジ', /band-6/.test(M.srpgRarityWrap('X', 'LG')) && /srpg-rar-badge">MR</.test(M.srpgRarityWrap('X', 'LG')));
c.ok('rarityWrap F→band-0＋Nバッジ', /band-0/.test(M.srpgRarityWrap('X', 'F')) && /srpg-rar-badge">N</.test(M.srpgRarityWrap('X', 'F')));
c.ok('rarityWrap は innerHTML を保持', M.srpgRarityWrap('<b>竜</b>', 'SS').indexOf('<b>竜</b>') >= 0);
c.ok('rarityWrap は rk-クラスと色変数を付与', /rk-SS/.test(M.srpgRarityWrap('X', 'SS')) && /--rc:/.test(M.srpgRarityWrap('X', 'SS')));

c.done();
