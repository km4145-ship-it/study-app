'use strict';
// 分離した js/cos-data.js（着せ替えアイテム＋セット＋称号）を検証。
// 追加アイテムのIIFEも評価されて142種になることを確認する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-cos-data');

const code = fs.readFileSync(path.join(ROOT, 'js', 'cos-data.js'), 'utf8');
const api = (new Function(code + '\nreturn { COS_DATA, COS_SETS, COS_TITLES, COS_RARITY, COS_SLOTS };'))();

let count = 0;
['hero', 'pet'].forEach((k) => Object.keys(api.COS_DATA[k]).forEach((sl) => { count += api.COS_DATA[k][sl].length; }));
c.ok('COS_DATA アイテム総数142（追加IIFE込み）', count === 142);
c.ok('COS_RARITY に UR', !!api.COS_RARITY.UR);
c.ok('COS_SLOTS に hero/pet', api.COS_SLOTS.hero && api.COS_SLOTS.pet);
c.ok('COS_SETS 6セット', Array.isArray(api.COS_SETS) && api.COS_SETS.length === 6);
c.ok('COS_TITLES に t_master', api.COS_TITLES && api.COS_TITLES.t_master);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は COS_DATA を再定義しない', html.indexOf('var COS_DATA=') < 0);
c.ok('index.html は js/cos-data.js を読み込む', html.indexOf('<script src="js/cos-data.js') >= 0);
c.done();
