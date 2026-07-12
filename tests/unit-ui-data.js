'use strict';
// js/ui-data.js（静的UIデータ）の整合テスト。件数・キーは分離前の index.html から捕捉したゴールデン。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-ui-data');

const code = fs.readFileSync(path.join(ROOT, 'js', 'ui-data.js'), 'utf8');
const api = (new Function(code +
  '\nreturn { CHAR_INFO, QUESTS, BADGES, JA_VOICE_CATALOG, TTS_VOICE_PACKS };'))();

c.eq('CHAR_INFO は10キャラ', Object.keys(api.CHAR_INFO).length, 10);
c.eq('QUESTS は4件', api.QUESTS.length, 4);
c.eq('BADGES は16件', api.BADGES.length, 16);
c.eq('JA_VOICE_CATALOG は32件', api.JA_VOICE_CATALOG.length, 32);
c.eq('TTS_VOICE_PACKS は5パック', Object.keys(api.TTS_VOICE_PACKS).length, 5);

c.ok('BADGES は id を持つ', api.BADGES.every((b) => b && typeof b.id === 'string'));
c.ok('QUESTS は id を持つ', api.QUESTS.every((q) => q && typeof q.id === 'string'));

// index.html 側は再定義せず、モジュールを読み込む
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は CHAR_INFO を再定義しない', html.indexOf('var CHAR_INFO =') < 0);
c.ok('index.html は BADGES を再定義しない', html.indexOf('var BADGES =') < 0);
c.ok('index.html は js/ui-data.js を読み込む', html.indexOf('<script src="js/ui-data.js') >= 0);

c.done();
