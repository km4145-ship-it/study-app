'use strict';
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-subjects');

const code = fs.readFileSync(path.join(ROOT, 'js', 'subjects.js'), 'utf8');
const api = (new Function(code + '\nreturn { SUBJECTS };'))();
c.ok('SUBJECTS は非空オブジェクト', api.SUBJECTS && typeof api.SUBJECTS === 'object' && Object.keys(api.SUBJECTS).length > 0);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は SUBJECTS を再定義しない', html.indexOf('const SUBJECTS = {') < 0);
c.ok('index.html は js/subjects.js を読み込む', html.indexOf('<script src="js/subjects.js') >= 0);
c.done();
