'use strict';
// js/content-data.js（学習コンテンツの純データ）の整合テスト。
// ゴールデン件数は分離前の index.html から捕捉したもの＝分離でデータが変わっていないことを保証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-content-data');

const code = fs.readFileSync(path.join(ROOT, 'js', 'content-data.js'), 'utf8');
const api = (new Function(code + '\nreturn { FLASH_DECKS, STUDY_NOTES, WRITE_PROBLEMS };'))();

// FLASH_DECKS：10デッキ、各デッキは id/name/cards を持つ。カードは [表, 裏] の配列
c.eq('FLASH_DECKS は10デッキ', api.FLASH_DECKS.length, 10);
c.ok('各デッキが id/name/cards を持つ', api.FLASH_DECKS.every((d) =>
  typeof d.id === 'string' && typeof d.name === 'string' && Array.isArray(d.cards)));
c.ok('全カードが [表, 裏] の2要素配列', api.FLASH_DECKS.every((d) =>
  d.cards.length > 0 && d.cards.every((cd) => Array.isArray(cd) && cd.length === 2 &&
    typeof cd[0] === 'string' && typeof cd[1] === 'string')));

// STUDY_NOTES：5教科、math は8項目
c.eq('STUDY_NOTES は5教科', Object.keys(api.STUDY_NOTES).sort().join(','), 'english,japanese,math,science,social');
c.eq('STUDY_NOTES.math は8項目', api.STUDY_NOTES.math.length, 8);
c.ok('各ノートが title/body を持つ', Object.values(api.STUDY_NOTES).every((arr) =>
  arr.every((n) => typeof n.title === 'string' && typeof n.body === 'string')));

// WRITE_PROBLEMS：10問、各問 q/model
c.eq('WRITE_PROBLEMS は10問', api.WRITE_PROBLEMS.length, 10);
c.ok('各問が q/model を持つ', api.WRITE_PROBLEMS.every((p) => typeof p.q === 'string' && typeof p.model === 'string'));
c.ok('1問目は「−2³」の記述', api.WRITE_PROBLEMS[0].q.indexOf('−2³') >= 0);

// index.html 側は再定義せず、モジュールを読み込む
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は WRITE_PROBLEMS を再定義しない', html.indexOf('var WRITE_PROBLEMS=') < 0);
c.ok('index.html は FLASH_DECKS を再定義しない', html.indexOf('var FLASH_DECKS=') < 0);
c.ok('index.html は js/content-data.js を読み込む', html.indexOf('<script src="js/content-data.js') >= 0);

c.done();
