'use strict';
// js/reading-ja.js（日本語の読み変換）の特性テスト。
// ゴールデン値は分離前の index.html 実装から捕捉したもの＝分離で挙動が1文字も変わらないことを保証する。
// 注：本番では initKuromoji() がどこからも呼ばれず kuroTokenizer は常に null のため、
//     実際の読み上げは「記号・数字・固有名詞の置換のみ」パス。ゴールデン値もそれに一致。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-reading-ja');

const code = fs.readFileSync(path.join(ROOT, 'js', 'reading-ja.js'), 'utf8');
// kuromoji 未ロード（typeof kuromoji === 'undefined'）の本番相当環境で評価
const api = (new Function(code +
  '\nreturn { hasJapanese, intToKan, numToJa, toReading, stripEmoji, forTTS, initKuromoji };'))();

['hasJapanese', 'intToKan', 'numToJa', 'toReading', 'stripEmoji', 'forTTS', 'initKuromoji']
  .forEach((f) => c.ok(f + ' が関数', typeof api[f] === 'function'));

const GOLDEN = [
  ['intToKan', [0], 'ゼロ'],
  ['intToKan', [7], '七'],
  ['intToKan', [10], '十'],
  ['intToKan', [21], '二十一'],
  ['intToKan', [100], '百'],
  ['intToKan', [1000], '千'],
  ['intToKan', [12345], '一万二千三百四十五'],
  ['intToKan', [-3], 'マイナス三'],
  ['numToJa', ['3.14'], '三点一四'],
  ['numToJa', ['-7'], 'マイナス七'],
  ['numToJa', ['100'], '百'],
  ['hasJapanese', ['hello'], false],
  ['hasJapanese', ['あ'], true],
  ['toReading', ['hello world'], 'hello world'],
  ['toReading', ['千咲がいる'], 'チサキがいる'],
  ['toReading', ['彩花は10才'], 'アヤカは十才'],
  ['toReading', ['面積は12cm²'], '面積は十二平方センチメートル'],
  ['toReading', ['5×3=15'], '5×3=15'],
  ['forTTS', ['🌺こんにちは5'], 'こんにちは五'],
];
for (const [fn, args, want] of GOLDEN) {
  c.eq(fn + '(' + JSON.stringify(args).slice(1, -1) + ')', api[fn].apply(null, args), want);
}

// initKuromoji は kuromoji 未定義でも例外を出さない（typeof ガード）
let threw = null;
try { api.initKuromoji(); } catch (e) { threw = e.message; }
c.ok('initKuromoji は kuromoji 未ロードでも例外を出さない', threw === null);

// index.html 側は再定義していない／読み込んでいる
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は forTTS を再定義しない', html.indexOf('\nfunction forTTS(') < 0);
c.ok('index.html は js/reading-ja.js を読み込む', html.indexOf('<script src="js/reading-ja.js') >= 0);

c.done();
