'use strict';
// functions/lib/tts.js（ElevenLabs TTSプロキシの純粋ロジック）を検証。
// firebase-functions/firebase-adminに依存しない純関数のみを対象＝依存ゼロのNode実行で検証できる。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-tts-functions');

const modPath = path.join(ROOT, 'functions', 'lib', 'tts.js');
let api;
try { api = require(modPath); c.ok('functions/lib/tts.js を require できる', true); }
catch (e) { c.ok('functions/lib/tts.js を require できる: ' + e.message, false); api = null; }

if (api) {
  // ---- isValidFamilyCode ----
  c.ok('通常の4桁コードは有効', api.isValidFamilyCode('0000'));
  c.ok('カスタムコードも有効（英数字）', api.isValidFamilyCode('sakura-family-2026'));
  c.ok('空文字は無効', !api.isValidFamilyCode(''));
  c.ok('空白を含むと無効', !api.isValidFamilyCode('0000 0000'));
  c.ok('41文字以上は無効', !api.isValidFamilyCode('a'.repeat(41)));
  c.ok('null/undefinedは無効', !api.isValidFamilyCode(null) && !api.isValidFamilyCode(undefined));
  c.ok('数値型は無効（文字列のみ許可）', !api.isValidFamilyCode(1234));

  // ---- isPlausibleApiKey ----
  c.ok('妥当な長さのキーは有効', api.isPlausibleApiKey('sk_' + 'a'.repeat(30)));
  c.ok('短すぎるキーは無効', !api.isPlausibleApiKey('short'));
  c.ok('長すぎるキーは無効', !api.isPlausibleApiKey('a'.repeat(201)));
  c.ok('空白混じりは無効', !api.isPlausibleApiKey('sk a'.repeat(10)));
  c.ok('空文字は無効', !api.isPlausibleApiKey(''));

  // ---- sanitizeText ----
  { const r = api.sanitizeText('  こんにちは  '); c.ok('前後空白を除去', r.ok && r.text === 'こんにちは'); }
  { const r = api.sanitizeText(''); c.ok('空文字は拒否', !r.ok && r.reason === 'text_empty'); }
  { const r = api.sanitizeText('   '); c.ok('空白のみは拒否', !r.ok && r.reason === 'text_empty'); }
  { const r = api.sanitizeText(123); c.ok('文字列以外は拒否', !r.ok && r.reason === 'text_required'); }
  { const r = api.sanitizeText('あ'.repeat(api.MAX_CHARS_PER_REQUEST + 1)); c.ok('上限超は明示的に拒否（黙って切り詰めない）', !r.ok && r.reason === 'text_too_long'); }
  { const r = api.sanitizeText('あ'.repeat(api.MAX_CHARS_PER_REQUEST)); c.ok('上限ちょうどは許可', r.ok); }

  // ---- checkAndConsumeQuota ----
  {
    const r = api.checkAndConsumeQuota(null, '2026-07-15', 100, 1000);
    c.ok('状態なし（初回）は許可され消費が記録される', r.allowed && r.usedCharsToday === 100 && r.usedDate === '2026-07-15');
  }
  {
    const r = api.checkAndConsumeQuota({ usedCharsToday: 900, usedDate: '2026-07-15' }, '2026-07-15', 50, 1000);
    c.ok('同日の続き：上限内なら加算', r.allowed && r.usedCharsToday === 950);
  }
  {
    const r = api.checkAndConsumeQuota({ usedCharsToday: 950, usedDate: '2026-07-15' }, '2026-07-15', 100, 1000);
    c.ok('同日の続き：上限超は拒否', !r.allowed && r.reason === 'daily_limit_exceeded');
    c.eq('拒否時は使用量を変えない', r.usedCharsToday, 950);
  }
  {
    const r = api.checkAndConsumeQuota({ usedCharsToday: 999, usedDate: '2026-07-14' }, '2026-07-15', 500, 1000);
    c.ok('日付が変わったら自動リセットされる', r.allowed && r.usedCharsToday === 500 && r.usedDate === '2026-07-15');
  }
  {
    const r = api.checkAndConsumeQuota({ usedCharsToday: 500, usedDate: '2026-07-15' }, '2026-07-15', 500, 1000);
    c.ok('ちょうど上限までは許可（境界値）', r.allowed && r.usedCharsToday === 1000);
  }
  c.eq('既定の日次上限はDAILY_CHAR_LIMIT', api.checkAndConsumeQuota(null, 'd', 1, undefined).limit, api.DAILY_CHAR_LIMIT);

  // ---- mapElevenLabsStatus ----
  c.eq('401→invalid_key', api.mapElevenLabsStatus(401, '').error, 'invalid_key');
  c.eq('429→rate_limited', api.mapElevenLabsStatus(429, '').error, 'rate_limited');
  c.eq('400→bad_request', api.mapElevenLabsStatus(400, '').error, 'bad_request');
  c.eq('422→bad_request', api.mapElevenLabsStatus(422, '').error, 'bad_request');
  c.eq('500→upstream_error', api.mapElevenLabsStatus(500, '').error, 'upstream_error');
  c.ok('bodyTextが保持される', api.mapElevenLabsStatus(400, 'voice_not_found').body === 'voice_not_found');

  // ---- todayDateKey ----
  c.eq('study-appのtodayKey()と同じ YYYY-MM-DD 形式', api.todayDateKey(new Date(2026, 6, 5)), '2026-07-05');
  c.eq('月日をゼロ埋めする', api.todayDateKey(new Date(2026, 0, 1)), '2026-01-01');

  // ---- index.js のグルー：純粋ロジックの呼び出しパターンが壊れていないかの静的確認 ----
  const glueCode = fs.readFileSync(path.join(ROOT, 'functions', 'index.js'), 'utf8');
  c.ok('index.js は3関数をexportする', /exports\.setTtsKey/.test(glueCode) && /exports\.verifyTtsKey/.test(glueCode) && /exports\.synthesizeSpeech/.test(glueCode));
  c.ok('index.js は lib/tts.js のロジックを使う（重複実装していない）', glueCode.indexOf("require('./lib/tts')") >= 0);
  c.ok('privateパスは families/{code}/private/tts', glueCode.indexOf("collection('private').doc('tts')") >= 0);
  c.ok('AuthorizationヘッダのBearerトークンを検証する', /verifyIdToken/.test(glueCode));
  c.ok('CORSは既知オリジンに限定（cors:trueで全許可にしていない）', /cors: ALLOWED_ORIGINS/.test(glueCode));
  c.ok('リージョンを明示指定', /asia-northeast1/.test(glueCode));

  // ---- firestore.rules：privateサブコレクションが完全ロックダウンされているか ----
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
  c.ok('firestore.rules に private ロックダウンがある', /match \/private\/\{document=\*\*\}[\s\S]{0,80}allow read, write: if false/.test(rules));
}

c.done();
