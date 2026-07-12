'use strict';
// キャッシュ削除（localStorage空）状態から、クラウドの全ユーザーデータが復元され、
// かつクラウドを空で上書きしないことを検証する。
const path = require('path');
const { createHarness } = require('./lib/cloud-harness');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('int-restore');

const store = {};
store['families/0000'] = { v2done: true };
store['families/0000/shared/settings'] = { data: { mu_users: JSON.stringify([
  { id: 'u1', name: 'たろう', char: 'shiba', admin: true },
  { id: 'u2', name: 'はなこ', char: 'cat' },
]) } };
store['families/0000/members/u1'] = { data: { c_points: '500', rpg_state: JSON.stringify({ v: 1, level: 5, xp: 600, cos: { coin: 200, owned: { h_crown: 1, a_galaxy: 1 }, titles: { t_king: 1 } } }) } };
store['families/0000/members/u2'] = { data: { c_points: '300' } };

const h = createHarness({ store, mode: 'ok' });
h.load(path.join(ROOT, 'cloud-sync.js'));

(async () => {
  await h.settle(8);
  const g = h.get;
  const users = JSON.parse(g('mu_users') || '[]');
  c.ok('mu_users 復元（2人）', users.length === 2 && users.some((u) => u.id === 'u1') && users.some((u) => u.id === 'u2'));
  c.ok('u1のchar復元', (users.find((u) => u.id === 'u1') || {}).char === 'shiba');
  c.ok('u1 c_points=500 復元', g('u:u1:c_points') === '500');
  c.ok('u2 c_points=300 復元', g('u:u2:c_points') === '300');
  const rpg = JSON.parse(g('u:u1:rpg_state') || 'null');
  c.ok('u1 rpg_state 復元(level5)', rpg && rpg.level === 5);
  c.ok('u1 着せ替え復元', rpg && rpg.cos && rpg.cos.owned && rpg.cos.owned.h_crown === 1 && rpg.cos.owned.a_galaxy === 1);
  c.ok('u1 称号復元', rpg && rpg.cos && rpg.cos.titles && rpg.cos.titles.t_king === 1);
  c.ok('クラウドのu1データ健在', store['families/0000/members/u1'].data.c_points === '500');
  c.ok('クラウドのu2データ健在', store['families/0000/members/u2'].data.c_points === '300');
  c.done();
})();
