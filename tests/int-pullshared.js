'use strict';
// 名簿が別端末に u1 へ縮められても、選択画面の更新(cloudPullShared)で
// v1バックアップから3人に自己回復し、sharedへも3人を書き戻すことを検証する。
const path = require('path');
const { createHarness } = require('./lib/cloud-harness');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('int-pullshared');

const THREE = JSON.stringify([
  { id: 'u1', name: 'ユーザー1', char: 'shiba', admin: true, startYear: 2020 },
  { id: 'u2', name: '千咲', char: 'shiba', startYear: 2020 },
  { id: 'u3', name: '彩花', char: 'shiba', startYear: 2023 },
]);
const ONE = JSON.stringify([{ id: 'u1', name: 'ユーザー1', char: 'shiba', admin: true, startYear: 2020 }]);
const store = {};
store['families/0000'] = { v2done: true, data: { mu_users: THREE } };
store['families/0000/shared/settings'] = { data: { mu_users: ONE } };
store['families/0000/members/u1'] = { data: { c_points: '100' } };
store['families/0000/members/u2'] = { data: { c_points: '200' } };
store['families/0000/members/u3'] = { data: { c_points: '300' } };

const h = createHarness({ store, mode: 'ok' });
h.load(path.join(ROOT, 'cloud-sync.js'));

(async () => {
  await h.settle(8);
  // 別端末がまた u1 に縮め、この端末の local も u1 だけにする
  store['families/0000/shared/settings'] = { data: { mu_users: ONE } };
  h.LS._m.mu_users = ONE; // 生書き（同期フックを通さない）
  c.ok('前提: local は u1 だけ', JSON.parse(h.get('mu_users')).length === 1);

  await window.cloudPullShared();
  await h.settle(4);
  const local = JSON.parse(h.get('mu_users') || '[]');
  c.ok('cloudPullShared 後 local が3人に自己回復', local.length === 3);
  c.ok('千咲・彩花 復活', local.some((u) => u.name === '千咲') && local.some((u) => u.name === '彩花'));

  await h.settle(40); // scheduleSave(1.2s)待ち
  c.ok('shared も3人へ自己修復', JSON.parse(store['families/0000/shared/settings'].data.mu_users).length === 3);
  c.done();
})();
