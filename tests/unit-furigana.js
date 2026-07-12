'use strict';
// 分離した js/furigana.js（視覚的ふりがな）を検証。トークナイザ未ロードでも例外を出さないこと。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-furigana');

const code = fs.readFileSync(path.join(ROOT, 'js', 'furigana.js'), 'utf8');
const esc = (s) => String(s).replace(/[&<>]/g, '_');
const doc = { getElementById: () => null };
const api = (new Function('muGradeBand', 'escapeHtml', 'showToast', 'document',
  code + '\nreturn { furiHTML, furiMode, furiOn, furiApply, setFurigana };'))(() => 'elem', esc, () => {}, doc);

['furiHTML', 'furiMode', 'furiOn', 'furiApply', 'setFurigana'].forEach((f) => c.ok(f + ' が関数', typeof api[f] === 'function'));

let threw = null;
try { api.furiHTML('漢字とひらがな'); api.furiHTML(''); api.furiApply(); } catch (e) { threw = e.message; }
c.ok('furiHTML/furiApply がトークナイザ未ロードでも例外を出さない', threw === null);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は furiHTML を再定義しない', html.indexOf('\nfunction furiHTML(') < 0);
c.ok('index.html は js/furigana.js を読み込む', html.indexOf('<script src="js/furigana.js') >= 0);
c.done();
