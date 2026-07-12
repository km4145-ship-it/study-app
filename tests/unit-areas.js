'use strict';
// 分離した js/areas.js（学習エリア定義）を検証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-areas');

const code = fs.readFileSync(path.join(ROOT, 'js', 'areas.js'), 'utf8');
const api = (new Function(code + '\nreturn { AREAS };'))();

c.ok('AREAS は配列', Array.isArray(api.AREAS) && api.AREAS.length > 0);
c.ok('各要素に key', api.AREAS.every((a) => a && a.key));

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は AREAS を再定義しない', html.indexOf('const AREAS = [') < 0);
c.ok('index.html は js/areas.js を読み込む', html.indexOf('<script src="js/areas.js') >= 0);
c.done();
