'use strict';
// 起動時の自己回復と上書き防止：
//  heal      : 名簿u1に縮んでもv1バックアップから3人回復＋千咲のポイントもmax回復＋クラウド書戻し
//  parentfail: 親doc(バックアップ)を読めない時は書き戻さない（取りこぼし上書き防止）
//  noread    : クラウドを読めない時は書き込み0（上書きなし）
const path = require('path');
const { createHarness } = require('./lib/cloud-harness');
const { makeChecker, ROOT } = require('./lib/assert');
const MODE = process.argv[2] || 'heal';
const c = makeChecker('int-heal[' + MODE + ']');

const THREE = JSON.stringify([
  { id: 'u1', name: 'ユーザー1', char: 'shiba', admin: true, startYear: 2020 },
  { id: 'u2', name: '千咲', char: 'shiba', startYear: 2020 },
  { id: 'u3', name: '彩花', char: 'shiba', startYear: 2023 },
]);
const store = {};
store['families/0000'] = { v2done: true, data: { mu_users: THREE, 'u:u2:c_points': '400' } }; // v1バックアップ＝3人＋千咲の旧ポイント400
store['families/0000/shared/settings'] = { data: { mu_users: JSON.stringify([{ id: 'u1', name: 'ユーザー1', char: 'shiba', admin: true, startYear: 2020 }]), custom_setting: 'keep_me' } };
store['families/0000/members/u1'] = { data: { c_points: '100' } };
store['families/0000/members/u2'] = { data: { c_points: '25' } };
store['families/0000/members/u3'] = { data: { c_points: '300', rpg_state: JSON.stringify({ level: 4, cos: { owned: { h_crown: 1 } } }) } };

const h = createHarness({ store, mode: MODE });
h.load(path.join(ROOT, 'cloud-sync.js'));

(async () => {
  await h.settle(10);
  const g = h.get;
  if (MODE === 'heal') {
    const users = JSON.parse(g('mu_users') || '[]');
    c.ok('mu_users が3人に回復', users.length === 3);
    c.ok('千咲・彩花 復活', users.some((u) => u.name === '千咲') && users.some((u) => u.name === '彩花'));
    c.ok('u3の学習データ復元', g('u:u3:c_points') === '300');
    c.ok('千咲のポイントがバックアップから回復 max(25,400)=400', g('u:u2:c_points') === '400');
    c.ok('クラウドのu2にも400が書き戻る', store['families/0000/members/u2'].data.c_points === '400');
    c.ok('クラウドshared一覧も3人に自己修復', JSON.parse(store['families/0000/shared/settings'].data.mu_users).length === 3);
    c.ok('sharedの他キー(custom_setting)温存', store['families/0000/shared/settings'].data.custom_setting === 'keep_me');
  } else if (MODE === 'parentfail') {
    c.ok('親doc読めない→sharedへ書き込みしていない', h.setCalls.indexOf('families/0000/shared/settings') < 0);
  } else { // noread
    c.ok('クラウド書き込みが発生していない', h.setCalls.length === 0);
    c.ok('shared一覧は縮んだまま触られない', JSON.parse(store['families/0000/shared/settings'].data.mu_users).length === 1);
  }
  c.done();
})();
