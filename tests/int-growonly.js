'use strict';
// 名簿(mu_users)クロバーの根本対策＝共有保存の grow-only 化を検証する。
// ①縮小した名簿を持つ端末が保存しても、クラウドの名簿は縮まない（和集合で書く）。
// ②すでにクラウドが縮んでいても、健全な端末が保存すると自己修復する。
const path = require('path');
const { createHarness } = require('./lib/cloud-harness');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('int-growonly');

const THREE = JSON.stringify([
  { id: 'u1', name: 'ユーザー1', char: 'shiba', admin: true },
  { id: 'u2', name: '千咲', char: 'shiba' },
  { id: 'u3', name: '彩花', char: 'shiba' },
]);
function usersIn(store, path) {
  try { return JSON.parse((store[path].data || {}).mu_users || '[]'); } catch (e) { return []; }
}

(async () => {
  // --- ① 縮小したローカルを持つ端末が保存 → クラウドは3人のまま ---
  {
    const store = {};
    store['families/0000'] = { v2done: true, data: { mu_users: THREE } };   // 親バックアップ=3人
    store['families/0000/shared/settings'] = { data: { mu_users: THREE } }; // クラウド共有=3人
    store['families/0000/members/u1'] = { data: { c_answered: '10' } };
    const h = createHarness({ store, mode: 'ok', family: '0000' });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(40, 40);
    // 端末のローカル名簿を u1 だけへ“こっそり”縮める（フックを通さず直接：古い/壊れた端末を再現）
    h.LS._m['mu_users'] = JSON.stringify([{ id: 'u1', name: 'ユーザー1', char: 'shiba', admin: true }]);
    // 何か共有設定を変えて保存を誘発（テーマ変更）
    global.localStorage.setItem('theme', 'dark');
    await h.settle(40, 40);
    const after = usersIn(store, 'families/0000/shared/settings');
    c.eq('①縮小端末が保存してもクラウド名簿は3人のまま', after.length, 3);
    c.ok('①千咲・彩花が残っている', after.some((u) => u.id === 'u2') && after.some((u) => u.id === 'u3'));
  }

  // --- ② クラウドが既に u1 だけへクロバー済み → 健全端末の保存で自己修復（親から復元済みローカルと和集合）---
  {
    const store = {};
    store['families/0000'] = { v2done: true, data: { mu_users: THREE } };                 // 親バックアップ=3人（健在）
    store['families/0000/shared/settings'] = { data: { mu_users: JSON.stringify([{ id: 'u1', name: 'ユーザー1', char: 'shiba', admin: true }]) } }; // 共有=クロバー済み1人
    store['families/0000/members/u2'] = { data: { c_answered: '20' } };
    const h = createHarness({ store, mode: 'ok', family: '0000' });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(50, 40);   // 起動時に親から名簿を復元→保存で共有を修復
    const after = usersIn(store, 'families/0000/shared/settings');
    c.eq('②クロバー済みクラウドが3人へ自己修復', after.length, 3);
    c.ok('②彩花が復活', after.some((u) => u.id === 'u3'));
  }

  // --- ③ 明示削除(mu_deleted)は尊重される：墓標は保存でも消えない ---
  {
    const store = {};
    store['families/0000'] = { v2done: true, data: { mu_users: THREE } };
    store['families/0000/shared/settings'] = { data: { mu_users: THREE, mu_deleted: JSON.stringify({ u3: 1 }) } };
    store['families/0000/members/u1'] = { data: { c_answered: '5' } };
    const h = createHarness({ store, mode: 'ok', family: '0000' });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(40, 40);
    global.localStorage.setItem('theme', 'light');
    await h.settle(40, 40);
    let md = {}; try { md = JSON.parse((store['families/0000/shared/settings'].data || {}).mu_deleted || '{}'); } catch (e) {}
    c.ok('③削除の墓標(mu_deleted u3)は保存後も残る', md.u3 === 1);
  }

  c.done();
})();
