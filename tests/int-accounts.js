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

  // --- ⑤ アカウント削除（App Store 5.1.1(v) 必須要件）---
  {
    const store = {};
    const h = createHarness({ store, mode: 'ok', authUser: { uid: 'owner5', isAnonymous: false } });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(10);
    global.localStorage.setItem('mu_users', JSON.stringify([{ id: 'kid1' }, { id: 'kid2' }]));
    global.localStorage.setItem('mu_account_active', '1');
    global.localStorage.setItem('theme', 'dark');
    await h.settle(40, 40);
    // データが accounts/owner5 配下に存在することを確認
    c.ok('⑤削除前：shared/settingsが存在', !!store['accounts/owner5/shared/settings']);
    // 削除対象パスの列挙（純粋ロジック）：shared＋各メンバー＋各セッション＋root
    const paths = window._accountDeletePaths().map((p) => p.label);
    c.ok('⑤削除対象にshared・両メンバー・両セッション・rootが含まれる',
      paths.includes('shared') && paths.includes('member:kid1') && paths.includes('member:kid2')
      && paths.includes('session:kid1') && paths.includes('session:kid2') && paths.includes('root'));
    const r = await window.cloudAccountDelete();
    c.ok('⑤削除は成功を返す', r && r.ok === true);
    c.ok('⑤accounts/owner5/shared/settings が消える', store['accounts/owner5/shared/settings'] === undefined);
    c.ok('⑤accounts/owner5/members/kid1 が消える', store['accounts/owner5/members/kid1'] === undefined);
    c.ok('⑤Authユーザーが削除される（currentUser=null）', window.firebase.auth().currentUser === null);
    c.ok('⑤mu_account_active が解除される', global.localStorage.getItem('mu_account_active') !== '1');
    c.ok('⑤families/... には一切触れない', !hasFamiliesPath(store));
  }

  // --- ⑤b 匿名/familyモードでは削除できない（誤操作でfamiliesを消さない）---
  {
    const store = {};
    store['families/0000'] = { data: { mu_users: '[]' } };
    const h = createHarness({ store, mode: 'ok' });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(10);
    const r = await window.cloudAccountDelete();
    c.ok('⑤b familyモードでは削除拒否（reason=not-account）', r && r.ok === false && r.reason === 'not-account');
  }

  // --- ⑤c 最近のログインが必要なときは、データを消さずに再ログインを促す ---
  {
    const store = {};
    const h = createHarness({ store, mode: 'ok', authUser: { uid: 'owner6', isAnonymous: false }, requireRecentLogin: true });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(10);
    global.localStorage.setItem('mu_account_active', '1');
    const r = await window.cloudAccountDelete();
    c.ok('⑤c requires-recent-loginを返す', r && r.ok === false && r.reason === 'requires-recent-login');
    c.ok('⑤c Authユーザーは残る（再ログインしてもう一度で完了できる）', window.firebase.auth().currentUser !== null);
  }

  c.done();
})();
