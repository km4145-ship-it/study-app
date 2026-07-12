'use strict';
// index.html の _computeCollections（セット達成・称号付与）を抽出して検証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-collections');

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const a = src.indexOf('function _computeCollections(');
const b = src.indexOf('function rpgCheckCollections');
const _computeCollections = (new Function(src.slice(a, b) + '\nreturn _computeCollections;'))();

const SETS = [
  { id: 's1', name: 'A', em: 'A', items: ['i1', 'i2'], coin: 50, title: 'ta' },
  { id: 's2', name: 'B', em: 'B', items: ['i3'], coin: 30, title: 'tb' },
];
const POOL = [{ id: 'i1', r: 'N' }, { id: 'i2', r: 'R' }, { id: 'i3', r: 'UR' }, { id: 'i4', r: 'S' }];

let cos = { owned: { i1: 1, i2: 1 }, coin: 0, titles: {}, sets: {} };
let e1 = _computeCollections(cos, SETS, {}, POOL);
c.ok('set s1 完成', cos.sets.s1 === 1);
c.ok('set s1 coin+50', cos.coin === 50);
c.ok('set s1 称号付与', cos.titles.ta === 1);
c.ok('collector付与(半分)', cos.titles.t_collector === 1);
c.ok('master未付与(2/4)', !cos.titles.t_master);
c.ok('first_ur未付与(i3未所持)', !cos.titles.t_first_ur);
c.ok('earned = set + collector', e1.length === 2 && e1.some((x) => x.kind === 'set' && x.set.id === 's1') && e1.some((x) => x.kind === 'title' && x.tid === 't_collector'));

let e2 = _computeCollections(cos, SETS, {}, POOL);
c.ok('冪等: 二重報酬なし', e2.length === 0);
c.ok('冪等: coin不変', cos.coin === 50);

cos.owned.i3 = 1; cos.owned.i4 = 1;
let e3 = _computeCollections(cos, SETS, {}, POOL);
c.ok('set s2 完成 coin+30→80', cos.coin === 80 && cos.sets.s2 === 1);
c.ok('master付与(コンプ)', cos.titles.t_master === 1);
c.ok('first_ur付与(i3=UR)', cos.titles.t_first_ur === 1);
c.ok('earned3 = s2+master+first_ur', e3.length === 3);

let cos2 = { owned: { i1: 1 }, coin: 0, titles: {}, sets: {} };
let e4 = _computeCollections(cos2, SETS, {}, POOL);
c.ok('部分セットは報酬なし', !cos2.sets.s1 && !e4.some((x) => x.kind === 'set'));
c.done();
