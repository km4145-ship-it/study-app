'use strict';
// 家族ランキング用 window.cloudFetchAllMembers の結合テスト。
// クラウド(スタブ)に3人ぶんのメンバーdocを置き、集計用に全員のデータを取得できることを検証。
const path = require('path');
const { createHarness } = require('./lib/cloud-harness');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('int-ranking');

const store = {};
store['families/0000'] = { v2done: true };
store['families/0000/shared/settings'] = { data: { mu_users: JSON.stringify([
  { id: 'u1', name: 'ちさき', char: 'cat', admin: true },
  { id: 'u2', name: 'あやか', char: 'rabbit' },
  { id: 'u3', name: 'けんいち', char: 'shiba' },
]) } };
store['families/0000/members/u1'] = { data: { c_answered: '320', c_points: '4200', study_log: '[]' } };
store['families/0000/members/u2'] = { data: { c_answered: '280', c_points: '3100' } };
store['families/0000/members/u3'] = { data: { c_answered: '150', c_points: '900' } };

const h = createHarness({ store, mode: 'ok', family: '0000' });
h.load(path.join(ROOT, 'cloud-sync.js'));

(async () => {
  await h.settle();
  c.ok('cloudFetchAllMembers が関数として公開される', typeof global.cloudFetchAllMembers === 'function');
  const all = await global.cloudFetchAllMembers();
  c.ok('3人ぶんのメンバーを取得', all && Object.keys(all).length === 3);
  c.eq('u1 の c_answered', all.u1.c_answered, '320');
  c.eq('u2 の c_answered', all.u2.c_answered, '280');
  c.eq('u3 の c_points', all.u3.c_points, '900');

  // 家族の魔王討伐状態(rank_family_goal)は共有キーとして shared/settings に同期される
  //   （保存は1200msデバウンスなので、それを超えて待つ）
  global.localStorage.setItem('rank_family_goal', '3');
  await h.settle(40, 40);
  c.eq('rank_family_goal が shared/settings に同期', (store['families/0000/shared/settings'].data || {}).rank_family_goal, '3');

  // メンバーdocが1件も無い家族では空オブジェクトを返す（UIは0件表示にできる）
  const store2 = { 'families/0000': { v2done: true },
    'families/0000/shared/settings': { data: { mu_users: '[]' } } };
  const h2 = createHarness({ store: store2, mode: 'ok', family: '0000' });
  h2.load(path.join(ROOT, 'cloud-sync.js'));
  await h2.settle();
  const all2 = await global.cloudFetchAllMembers();
  c.ok('メンバー0件なら空オブジェクト', all2 && Object.keys(all2).length === 0);

  c.done();
})();
