'use strict';
// 分離した js/rpg-world.js（世界・大陸・ストーリー データ）を検証。
// 2026-07：RPG_PLAN から 5教科×10章×4ノード＝200ノードを生成する方式に拡張。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-rpg-world');

const code = fs.readFileSync(path.join(ROOT, 'js', 'rpg-world.js'), 'utf8');
const api = (new Function(code + '\nreturn { RPG_WORLD, RPG_CONTINENTS, RPG_STORY, RPG_CASTLE_POS, RPG_GOAL_POS, RPG_PLAN };'))();
// モンスターアートのキー（rpg-assets.js）
const assets = fs.readFileSync(path.join(ROOT, 'js', 'rpg-assets.js'), 'utf8');
const svgKeys = (new Function(assets + '\nreturn Object.keys(RPG_SVG);'))();

c.ok('RPG_CONTINENTS が5大陸', Array.isArray(api.RPG_CONTINENTS) && api.RPG_CONTINENTS.length === 5);
c.ok('全大陸が RPG_WORLD に存在', api.RPG_CONTINENTS.every((a) => api.RPG_WORLD[a] && Array.isArray(api.RPG_WORLD[a].chapters)));
c.ok('RPG_STORY.prologue が配列', api.RPG_STORY && Array.isArray(api.RPG_STORY.prologue));
c.ok('RPG_CASTLE_POS / RPG_GOAL_POS が座標', api.RPG_CASTLE_POS && typeof api.RPG_CASTLE_POS.x === 'number' && api.RPG_GOAL_POS && typeof api.RPG_GOAL_POS.y === 'number');

// --- 拡張後：規模と整合 ---
let totalNodes = 0, totalCh = 0, badMon = [], badStruct = 0, noStory = 0;
api.RPG_CONTINENTS.forEach((area) => {
  const chs = api.RPG_WORLD[area].chapters;
  totalCh += chs.length;
  let prevLv = 0, lvMono = true;
  chs.forEach((ch) => {
    if (!ch.id || !ch.title || !ch.story || !Array.isArray(ch.nodes) || !ch.nodes.length) badStruct++;
    if (!api.RPG_STORY[ch.story]) noStory++;
    if (ch.lv < prevLv) lvMono = false; prevLv = ch.lv;
    ch.nodes.forEach((n) => {
      totalNodes++;
      if (svgKeys.indexOf(n.mon) < 0) badMon.push(area + '/' + n.mon);
      if (!n.id || !n.name || n.count == null || n.lv == null || !n.pos ||
        n.pos.x < 0 || n.pos.x > 100 || n.pos.y < 0 || n.pos.y > 100) badStruct++;
    });
  });
  c.ok(area + ' は難易度lvが単調に上がる', lvMono);
});
c.eq('総ノード数（5×10×4）', totalNodes, 200);
c.eq('総章数（5×10）', totalCh, 50);
c.ok('全モンスターキーが rpg-assets.js に実在', badMon.length === 0);
c.ok('ノード/章の構造がすべて妥当', badStruct === 0);
c.ok('全章に導入ストーリーがある', noStory === 0);
c.ok('各教科は10章', api.RPG_CONTINENTS.every((a) => api.RPG_WORLD[a].chapters.length === 10));
c.ok('最終章はlv10（入試級）', api.RPG_CONTINENTS.every((a) => api.RPG_WORLD[a].chapters[9].lv === 10));

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は RPG_WORLD を再定義しない', html.indexOf('var RPG_WORLD = {') < 0 && html.indexOf('var RPG_WORLD={') < 0);
c.ok('index.html は js/rpg-world.js を読み込む', html.indexOf('<script src="js/rpg-world.js') >= 0);
c.done();
