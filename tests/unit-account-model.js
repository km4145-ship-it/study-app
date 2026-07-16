'use strict';
// cloud-sync.js の _decideAuthAction（Phase 4 Slice 1：認証状態からの起動モード判定）を
// 抽出して検証する。unit-session.js の _sessionBlocked と同じ「ソース切り出し」方式。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-account-model');

const src = fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8');
const s = src.indexOf('function _decideAuthAction(');
const e = src.indexOf('\n  }', s) + 4;
const _decideAuthAction = (new Function(src.slice(s, e) + '\nreturn _decideAuthAction;'))();

// 非匿名ユーザー → 即accountモードで起動（復元待ちフラグの有無に関わらず）
c.eq('非匿名ユーザー→boot/account', _decideAuthAction({ uid: 'u1', isAnonymous: false }, false, false).action, 'boot');
c.eq('非匿名ユーザー→mode=account', _decideAuthAction({ uid: 'u1', isAnonymous: false }, false, false).mode, 'account');
c.eq('非匿名ユーザー(復元待ち中でも)→boot/account', _decideAuthAction({ uid: 'u1', isAnonymous: false }, true, true).action, 'boot');

// 匿名ユーザー → 即familyモードで起動
c.eq('匿名ユーザー→boot/family', _decideAuthAction({ uid: 'a1', isAnonymous: true }, false, false).action, 'boot');
c.eq('匿名ユーザー→mode=family', _decideAuthAction({ uid: 'a1', isAnonymous: true }, false, false).mode, 'family');

// user無し・アカウント無し・家族コードも無し → 既定は端末内のみ（local。匿名familyへ落ちない＝PII非送信）
c.eq('user無し・acct無・family無→local（既定・安全）', _decideAuthAction(null, false, false, false).action, 'local');

// user無し・アカウント無し・家族コードを明示設定 → レガシーfamily同期へ匿名認証でオプトイン
c.eq('user無し・acct無・family設定あり→anon（家族コードにオプトイン）', _decideAuthAction(null, false, false, true).action, 'anon');

// user無し・アカウントセッションの意図あり・まだ待っていない → 復元を待つ（即フォールバックしない）
c.eq('user無し・acctActive=true・未待機→wait', _decideAuthAction(null, true, false, false).action, 'wait');

// user無し・アカウントセッションの意図あり・既に待機中 → 二重にタイマーを立てない
c.eq('user無し・acctActive=true・待機中→none（多重タイマー防止）', _decideAuthAction(null, true, true, false).action, 'none');

c.done();
