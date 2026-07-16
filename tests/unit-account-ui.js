'use strict';
// 設定画面のアカウント欄 renderAccountPanel が、同期状態（local / account / family）ごとに
// 正しいUI（作成/ログイン・ログアウト・削除ボタン）を出すことを、DOMスタブで検証する。
// アカウント削除ボタンが「ログイン中のときだけ」出ること（＝迷わず削除できる）を保証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-account-ui');

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const a = src.indexOf('function renderAccountPanel(');
const b = src.indexOf('function _acctDo(');
const code = src.slice(a, b);

// renderAccountPanel を stub 環境で評価。document.getElementById('account-panel') が拾えるように。
function render(mode, email) {
  const panel = { innerHTML: '' };
  const document = { getElementById: (id) => (id === 'account-panel' ? panel : null) };
  const window = { cloudMode: () => mode, cloudAccountEmail: () => email || '' };
  const escapeHtml = (s) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  (new Function('document', 'window', 'escapeHtml', code + '\nrenderAccountPanel();'))(document, window, escapeHtml);
  return panel.innerHTML;
}

// ---- local（既定・同期オフ）----
{
  const h = render('local', '');
  c.ok('local: この端末だけに保存 の説明', h.indexOf('この端末だけに保存') >= 0);
  c.ok('local: アカウント作成ボタン', h.indexOf("_acctDo('up')") >= 0);
  c.ok('local: ログインボタン', h.indexOf("_acctDo('in')") >= 0);
  c.ok('local: 削除ボタンは出さない（未ログイン）', h.indexOf('accountDelete()') < 0);
  c.ok('local: 家族コードはレガシー折りたたみ', h.indexOf('レガシー') >= 0 && h.indexOf('cloudFamilySet') >= 0);
}

// ---- account（ログイン中）----
{
  const h = render('account', 'parent@example.com');
  c.ok('account: クラウド同期オン の表示', h.indexOf('クラウド同期オン') >= 0);
  c.ok('account: ログイン中メールを表示', h.indexOf('parent@example.com') >= 0);
  c.ok('account: ログアウトボタン', h.indexOf('cloudAccountSignOut') >= 0);
  c.ok('account: 削除ボタンが出る（ログイン中のみ）', h.indexOf('accountDelete()') >= 0);
  c.ok('account: 削除の危険説明', h.indexOf('すべて消します') >= 0);
  c.ok('account: 作成フォームは出さない', h.indexOf("_acctDo('up')") < 0);
  // メールはエスケープされる（XSS防止）
  const h2 = render('account', '<b>x@y</b>');
  c.ok('account: メールはエスケープ表示', h2.indexOf('&lt;b&gt;') >= 0 && h2.indexOf('<b>x@y') < 0);
}

// ---- family（レガシー同期中）----
{
  const h = render('family', '');
  c.ok('family: レガシー・非推奨の表示', h.indexOf('非推奨') >= 0);
  c.ok('family: アカウントへ切替の作成フォーム', h.indexOf("_acctDo('up')") >= 0);
  c.ok('family: 同期オフ（端末内のみ）ボタン', h.indexOf('cloudFamilyClear') >= 0);
  c.ok('family: 削除ボタンは出さない（アカウントではない）', h.indexOf('accountDelete()') < 0);
}
c.done();
