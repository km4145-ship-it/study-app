'use strict';
// 分離した js/rpg-assets.js（RPG視覚データ）が正しく読み込め、index.html が二重定義しないことを検証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-rpg-assets');

const code = fs.readFileSync(path.join(ROOT, 'js', 'rpg-assets.js'), 'utf8');
const api = (new Function(code + '\nreturn { RPG_SVG, PET_SVG, PET_STAGE_NAME, PET_WINS_FOR, STICKERS };'))();

c.ok('RPG_SVG はオブジェクト', api.RPG_SVG && typeof api.RPG_SVG === 'object');
['slime', 'goblin', 'villain', 'crystal', 'dragon'].forEach((k) => c.ok('RPG_SVG.' + k + ' がSVG文字列', typeof api.RPG_SVG[k] === 'string' && api.RPG_SVG[k].indexOf('<svg') >= 0));
c.ok('PET_SVG は4段階', Array.isArray(api.PET_SVG) && api.PET_SVG.length === 4);
c.ok('PET_STAGE_NAME 4段階', Array.isArray(api.PET_STAGE_NAME) && api.PET_STAGE_NAME.length === 4);
c.ok('PET_WINS_FOR = [0,4,14,34]', JSON.stringify(api.PET_WINS_FOR) === '[0,4,14,34]');
c.ok('STICKERS 16種', Array.isArray(api.STICKERS) && api.STICKERS.length === 16);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は RPG_SVG を再定義しない', html.indexOf('var RPG_SVG = {') < 0);
c.ok('index.html は js/rpg-assets.js を読み込む', html.indexOf('<script src="js/rpg-assets.js') >= 0);
// ---- 亜種（RPG_VARIANTS）：hue-rotateフィルタ付きSVGとして生成されている ----
{
  const api3 = (new Function(code + '\nreturn { RPG_SVG, RPG_VARIANTS };'))();
  c.ok('RPG_VARIANTSは10種', Object.keys(api3.RPG_VARIANTS).length === 10);
  Object.keys(api3.RPG_VARIANTS).forEach((k) => {
    const base = k.replace(/2$/, '');
    c.ok('亜種 ' + k + ' がhue-rotate付きSVG', typeof api3.RPG_SVG[k] === 'string'
      && api3.RPG_SVG[k].indexOf('hue-rotate(' + api3.RPG_VARIANTS[k] + 'deg)') >= 0
      && api3.RPG_SVG[base].indexOf('hue-rotate') < 0);
  });
}
c.done();
