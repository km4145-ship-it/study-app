'use strict';
// 分離した js/rpg-world.js（世界・大陸・ストーリー データ）を検証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-rpg-world');

const code = fs.readFileSync(path.join(ROOT, 'js', 'rpg-world.js'), 'utf8');
const api = (new Function(code + '\nreturn { RPG_WORLD, RPG_CONTINENTS, RPG_STORY, RPG_CASTLE_POS, RPG_GOAL_POS };'))();

c.ok('RPG_CONTINENTS が5大陸', Array.isArray(api.RPG_CONTINENTS) && api.RPG_CONTINENTS.length === 5);
c.ok('RPG_WORLD.math に chapters', api.RPG_WORLD && api.RPG_WORLD.math && Array.isArray(api.RPG_WORLD.math.chapters));
c.ok('全大陸が RPG_WORLD に存在', api.RPG_CONTINENTS.every((a) => api.RPG_WORLD[a] && api.RPG_WORLD[a].chapters));
c.ok('RPG_STORY.prologue が配列', api.RPG_STORY && Array.isArray(api.RPG_STORY.prologue));
c.ok('RPG_CASTLE_POS / RPG_GOAL_POS が座標', api.RPG_CASTLE_POS && typeof api.RPG_CASTLE_POS.x === 'number' && api.RPG_GOAL_POS && typeof api.RPG_GOAL_POS.y === 'number');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は RPG_WORLD を再定義しない', html.indexOf('var RPG_WORLD = {') < 0);
c.ok('index.html は js/rpg-world.js を読み込む', html.indexOf('<script src="js/rpg-world.js') >= 0);
c.done();
