'use strict';
// 分離した js/cos-data.js（着せ替えアイテム＋セット＋称号）を検証。
// 追加アイテムのIIFE（142種化＋レア装備大量追加）も評価されて275種になることを確認する。
//   ※装備を増減したらこの数も更新する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-cos-data');

const code = fs.readFileSync(path.join(ROOT, 'js', 'cos-data.js'), 'utf8');
const api = (new Function(code + '\nreturn { COS_DATA, COS_SETS, COS_TITLES, COS_RARITY, COS_SLOTS };'))();

let count = 0;
['hero', 'pet'].forEach((k) => Object.keys(api.COS_DATA[k]).forEach((sl) => { count += api.COS_DATA[k][sl].length; }));
c.ok('COS_DATA アイテム総数275（追加IIFE込み）', count === 275);
// idの一意性（過去にhat/handが同じgx_hh…を生成して12個衝突していた回帰ガード）
{
  const seen = {};
  let dup = 0;
  Object.keys(api.COS_DATA).forEach((k) => Object.keys(api.COS_DATA[k]).forEach((sl) => api.COS_DATA[k][sl].forEach((it) => {
    if (seen[it.id]) dup++; seen[it.id] = 1;
  })));
  c.ok('全アイテムidが一意（hat/hand衝突の回帰ガード）', dup === 0);
}
const tiers = {};
['hero', 'pet'].forEach((k) => Object.keys(api.COS_DATA[k]).forEach((sl) => api.COS_DATA[k][sl].forEach((it) => { tiers[it.r] = (tiers[it.r] || 0) + 1; })));
c.ok('8レア度すべてに装備がある', ['N', 'HN', 'R', 'HR', 'SR', 'SSR', 'UR', 'LR'].every((t) => tiers[t] > 0));
c.ok('COS_RARITY に UR', !!api.COS_RARITY.UR);
c.ok('COS_SLOTS に hero/pet', api.COS_SLOTS.hero && api.COS_SLOTS.pet);
c.ok('COS_SETS 6セット', Array.isArray(api.COS_SETS) && api.COS_SETS.length === 6);
c.ok('COS_TITLES に t_master', api.COS_TITLES && api.COS_TITLES.t_master);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は COS_DATA を再定義しない', html.indexOf('var COS_DATA=') < 0);
c.ok('index.html は js/cos-data.js を読み込む', html.indexOf('<script src="js/cos-data.js') >= 0);
c.done();
