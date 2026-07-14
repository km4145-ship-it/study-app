'use strict';
// Phase 4 Slice 1（実アカウントモデル・メール＋パスワード、単独オーナーのみ）を検証。
// ①非匿名ユーザーで起動すると accounts/{uid}/... に同期される（families/... には一切触れない）
// ②accounts/{uid}/shared/settings からの復元も familyモードと同様に効く
// ③セッションロック（claim/release）も accounts/{uid}/sessions/{uid} 経由で機能する
// ④cloudMode() で現在のモードが判定できる
const path = require('path');
const { createHarness } = require('./lib/cloud-harness');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('int-accounts');

function hasFamiliesPath(store) { return Object.keys(store).some((k) => k.indexOf('families/') === 0); }

(async () => {
  // --- ① 非匿名ユーザーで起動 → 書き込みは accounts/{uid}/... のみ。families/... は一切触らない ---
  {
    const store = {};
    const h = createHarness({ store, mode: 'ok', authUser: { uid: 'owner1', isAnonymous: false } });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(10);
    c.eq('①起動直後は accountモード', window.cloudMode(), 'account');
    global.localStorage.setItem('theme', 'dark');
    await h.settle(40, 40); // scheduleSave(1.2s)待ち
    c.ok('①theme が accounts/owner1/shared/settings に保存される', store['accounts/owner1/shared/settings'] && store['accounts/owner1/shared/settings'].data.theme === 'dark');
    c.ok('①families/... のパスは一切作られない', !hasFamiliesPath(store));
  }

  // --- ② accounts/{uid}/shared/settings からの復元（familyモードのcheckLegacy相当は不要）---
  {
    const store = {};
    store['accounts/owner2/shared/settings'] = { data: { mu_users: JSON.stringify([{ id: 'k1', name: 'こども1', char: 'shiba' }]) } };
    store['accounts/owner2/members/k1'] = { data: { c_points: '777' } };
    const h = createHarness({ store, mode: 'ok', authUser: { uid: 'owner2', isAnonymous: false } });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(10);
    const users = JSON.parse(h.get('mu_users') || '[]');
    c.ok('②mu_users がaccountsから復元される', users.length === 1 && users[0].id === 'k1');
    c.ok('②子どもの学習データも復元される', h.get('u:k1:c_points') === '777');
    c.ok('②families/... のパスは一切作られない', !hasFamiliesPath(store));
  }

  // --- ③ セッションロック（claim/release）が accounts/{uid}/sessions/{childId} 経由で機能する ---
  {
    const store = {};
    const h = createHarness({ store, mode: 'ok', authUser: { uid: 'owner3', isAnonymous: false } });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(10);
    const claimed = await window.cloudSessionClaim('kid1', { name: 'たんまつA' });
    c.ok('③空きセッションを取得できる', claimed.ok === true);
    c.ok('③accounts/owner3/sessions/kid1 に書き込まれる', !!store['accounts/owner3/sessions/kid1']);
    await window.cloudSessionRelease('kid1');
    c.ok('③解放後はセッションdocが削除される', store['accounts/owner3/sessions/kid1'] === undefined);
    c.ok('③families/... のパスは一切作られない', !hasFamiliesPath(store));
  }

  // --- ④ 既定（authUser未指定・mu_account_active未設定）は従来通りfamilyモードのまま ---
  {
    const store = {};
    store['families/0000'] = { v2done: true };
    const h = createHarness({ store, mode: 'ok' });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(10);
    c.eq('④authUser未指定なら familyモードのまま（回帰確認）', window.cloudMode(), 'family');
  }

  c.done();
})();
