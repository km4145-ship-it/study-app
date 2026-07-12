'use strict';
// 分離した js/chars.js（キャラ定義）を検証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-chars');

const code = fs.readFileSync(path.join(ROOT, 'js', 'chars.js'), 'utf8');
const api = (new Function(code + '\nreturn { CHARS };'))();

c.ok('CHARS はオブジェクト', api.CHARS && typeof api.CHARS === 'object');
['owl', 'shiba', 'cat', 'girl', 'boy'].forEach((k) => c.ok('CHARS.' + k + ' に svg/name', api.CHARS[k] && typeof api.CHARS[k].svg === 'string' && api.CHARS[k].svg.length > 0));

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は CHARS を再定義しない', html.indexOf('const CHARS = {') < 0);
c.ok('index.html は js/chars.js を読み込む', html.indexOf('<script src="js/chars.js') >= 0);
c.done();
