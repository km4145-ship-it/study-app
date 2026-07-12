'use strict';
// cloud-sync.js の _sessionBlocked（端末セッションロック判定）を抽出して検証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-session');

const src = fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8');
const s = src.indexOf('function _sessionBlocked(');
const e = src.indexOf('\n  }', s) + 4;
const _sessionBlocked = (new Function(src.slice(s, e) + '\nreturn _sessionBlocked;'))();

const STALE = 90000, NOW = 1000000000000;
const ts = (ms) => ({ toMillis: () => ms });
c.ok('doc無し→非ブロック', _sessionBlocked(null, 'meDev', NOW, STALE) === false);
c.ok('自分のセッション→非ブロック', _sessionBlocked({ device: 'meDev', at: ts(NOW - 1000) }, 'meDev', NOW, STALE) === false);
c.ok('他端末・新しい(10s前)→ブロック', _sessionBlocked({ device: 'other', at: ts(NOW - 10000) }, 'meDev', NOW, STALE) === true);
c.ok('他端末・古い(2分前)→非ブロック', _sessionBlocked({ device: 'other', at: ts(NOW - 120000) }, 'meDev', NOW, STALE) === false);
c.ok('他端末・失効ちょうど→非ブロック', _sessionBlocked({ device: 'other', at: ts(NOW - STALE) }, 'meDev', NOW, STALE) === false);
c.ok('他端末・timestamp無し→非ブロック', _sessionBlocked({ device: 'other' }, 'meDev', NOW, STALE) === false);
c.ok('他端末・数値at(fallback)新しい→ブロック', _sessionBlocked({ device: 'other', at: NOW - 5000 }, 'meDev', NOW, STALE) === true);
c.ok('device空→非ブロック', _sessionBlocked({ device: '', at: ts(NOW - 1000) }, 'meDev', NOW, STALE) === false);
c.done();
