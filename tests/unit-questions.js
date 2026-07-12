'use strict';
// 分離した問題データ（js/questions-bank.js の QUESTIONS、js/questions-extra.js の BANK）を検証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-questions');

// QUESTIONS（完全独立の問題データ）
const qCode = fs.readFileSync(path.join(ROOT, 'js', 'questions-bank.js'), 'utf8');
const q = (new Function(qCode + '\nreturn { QUESTIONS };'))().QUESTIONS;
c.ok('QUESTIONS は非空オブジェクト', q && typeof q === 'object' && Object.keys(q).length > 0);
c.ok('questions-bank に関数が混入していない', qCode.indexOf('\nfunction ') < 0);
c.ok('問題エントリが多数（q:を100件以上）', (qCode.match(/q:/g) || []).length >= 100);

// BANK（4教科の practice/exam が積まれる）
const bCode = fs.readFileSync(path.join(ROOT, 'js', 'questions-extra.js'), 'utf8');
const B = (new Function(bCode + '\nreturn { BANK };'))().BANK;
['japanese', 'english', 'science', 'social'].forEach((k) => c.ok('BANK.' + k + ' に practice/exam', B[k] && Array.isArray(B[k].practice) && Array.isArray(B[k].exam)));
c.ok('BANK.japanese.practice に問題あり', B.japanese.practice.length > 0);
c.ok('questions-extra に関数が混入していない', bCode.indexOf('\nfunction ') < 0);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は QUESTIONS/BANK を再定義しない', html.indexOf('const QUESTIONS = {') < 0 && html.indexOf('const BANK = {') < 0);
c.ok('読み込み順: questions-bank が questions-extra の前', html.indexOf('js/questions-bank.js') < html.indexOf('js/questions-extra.js'));
c.done();
