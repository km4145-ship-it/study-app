'use strict';
// js/srpg-mons.js（タクト用オリジナルモンスターSVG）を検証。
// 敵テンプレの全artに絵がある・SVGとして妥当・亜種は色相ラッパで包まれる・キャラは対象外。
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-srpg-mons');

const M = require(path.join(ROOT, 'js', 'srpg-mons.js'));
const S = require(path.join(ROOT, 'js', 'srpg.js'));

// 敵テンプレで使う全artに、オリジナルアートが存在する
const enemyArts = Object.keys(S.SRPG_ENEMY_TEMPLATES).map((k) => S.SRPG_ENEMY_TEMPLATES[k].art);
[...new Set(enemyArts)].forEach((art) => {
  const svg = M.srpgMonArt(art);
  c.ok('敵art ' + art + ' に絵がある', typeof svg === 'string' && svg.indexOf('<svg') >= 0);
});

// 各アートが妥当なSVG（viewBox・閉じタグ・class）
Object.keys(M.SRPG_MON_ART).forEach((art) => {
  const s = M.SRPG_MON_ART[art];
  c.ok(art + ' は viewBox 120 を持つ', s.indexOf('viewBox="0 0 120 120"') >= 0);
  c.ok(art + ' は mon-svg クラス', s.indexOf('class="mon-svg"') >= 0);
  c.ok(art + ' は <svg>…</svg> で閉じる', s.trim().slice(0, 4) === '<svg' && s.trim().slice(-6) === '</svg>');
  c.ok(art + ' に目がある（<circle か path）', s.indexOf('<circle') >= 0 || s.indexOf('<path') >= 0);
});

// 9種そろっている（slime/goblin/bat/wolf/ghost/trent/voltdrake/dragon/villain）
['slime', 'goblin', 'bat', 'wolf', 'ghost', 'trent', 'voltdrake', 'dragon', 'villain'].forEach((k) => {
  c.ok('主要モンスター ' + k + ' が定義済み', !!M.SRPG_MON_ART[k]);
});

// 冒険RPGへの横展開：RPG_SVG の全モンスター（crystal と亜種を除く）に 新アートがある＝混在しない
const acode = require('fs').readFileSync(path.join(ROOT, 'js', 'rpg-assets.js'), 'utf8');
const RPG_SVG = (new Function(acode + '\nreturn RPG_SVG;'))();
const baseMons = Object.keys(RPG_SVG).filter((k) => k !== 'crystal' && !/2$/.test(k));
c.ok('冒険モンスターは20種以上', baseMons.length >= 20);
baseMons.forEach((k) => c.ok('冒険モンスター ' + k + ' に新アートがある（混在しない）', !!M.SRPG_MON_ART[k]));
// RPG_VARIANTS の全亜種も色相ラッパで出せる
const RPG_VARIANTS = (new Function(acode + '\nreturn RPG_VARIANTS;'))();
Object.keys(RPG_VARIANTS).forEach((v) => c.ok('亜種 ' + v + ' も新アートで出せる', typeof M.srpgMonArt(v) === 'string' && M.srpgMonArt(v).indexOf('hue-rotate') >= 0));

// _monStill が新アートを優先する（冒険の静止表示に反映）
const html2 = require('fs').readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('_monStill は srpgMonArt を優先する', /function _monStill\([^)]*\)\{[^}]*srpgMonArt/.test(html2.replace(/\n/g, ' ')));

// 亜種：ベースの絵を hue-rotate で包む
Object.keys(M.SRPG_MON_VARIANT).forEach((v) => {
  const base = v.replace(/2$/, '');
  const svg = M.srpgMonArt(v);
  c.ok(v + ' は色相ラッパで包まれる', typeof svg === 'string' && svg.indexOf('hue-rotate(' + M.SRPG_MON_VARIANT[v] + 'deg)') >= 0);
  c.ok(v + ' の中身はベース ' + base + ' の絵', svg.indexOf('viewBox="0 0 120 120"') >= 0 && !!M.SRPG_MON_ART[base]);
});

// キャラ（勇者など）は対象外＝null を返す（従来アートにフォールバックさせる）
['shiba', 'cat', 'rabbit', 'penguin', 'owl'].forEach((k) => {
  c.ok('キャラ ' + k + ' はモンスターアート対象外', M.srpgMonArt(k) === null);
});
c.ok('未知キーは null', M.srpgMonArt('__none__') === null);

// index.html が srpg-mons を srpg-ui より前に読む
const fs = require('fs');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は srpg-mons.js を srpg-ui.js の前で読む',
  html.indexOf('js/srpg-mons.js') >= 0 && html.indexOf('js/srpg-mons.js') < html.indexOf('js/srpg-ui.js'));

c.done();
