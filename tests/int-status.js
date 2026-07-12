'use strict';
// クラウド接続状態の検知：read可→'ok'、read拒否(permission-denied等)→'error'
// 使い方: node tests/int-status.js [ok|deny]
const path = require('path');
const { createHarness } = require('./lib/cloud-harness');
const { makeChecker, ROOT } = require('./lib/assert');
const MODE = process.argv[2] || 'ok';
const c = makeChecker('int-status[' + MODE + ']');

const store = {};
if (MODE !== 'deny') {
  store['families/0000'] = { v2done: true };
  store['families/0000/shared/settings'] = { data: { mu_users: JSON.stringify([{ id: 'u1', name: 'A', char: 'shiba' }]) } };
}
const h = createHarness({ store, mode: MODE });
h.load(path.join(ROOT, 'cloud-sync.js'));

(async () => {
  await h.settle(8);
  const s = h.statuses;
  if (MODE === 'deny') {
    c.ok("deny: 'error' が通知された", s.some((x) => x[0] === 'error'));
    c.ok('deny: 最終 cloudStatus()=error', window.cloudStatus() === 'error');
  } else {
    c.ok("ok: 'ok' が通知された", s.some((x) => x[0] === 'ok'));
    c.ok('ok: 最終 cloudStatus()=ok', window.cloudStatus() === 'ok');
    c.ok('ok: error は出ていない', !s.some((x) => x[0] === 'error'));
  }
  c.done();
})();
