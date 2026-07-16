'use strict';
// 法的文書（legal/）の存在と必須項目、ビルドでのコピー、アプリからのリンクを検証。
// 内容の正確さ（実際のデータフローとの整合）は人手のレビュー前提だが、
// 「必須の見出し・第三者送信先・削除の記載・お問い合わせ窓口」が欠けていないことを機械保証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-legal');

function read(p) { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return ''; } }

// ---- ファイルの存在 ----
['legal/index.html', 'legal/privacy.html', 'legal/terms.html', 'legal/tokushoho.html'].forEach((f) => {
  c.ok(f + ' が存在', read(f).length > 400);
});

// ---- プライバシーポリシー：必須要素 ----
{
  const p = read('legal/privacy.html');
  c.ok('PP: 取得する情報の記載', /取得する情報/.test(p));
  c.ok('PP: 利用目的の記載', /利用目的/.test(p));
  // 第三者送信先が実装と整合（Firebase / Cloudflare / ElevenLabs / LINE）
  ['Firebase', 'Cloudflare', 'ElevenLabs', 'LINE'].forEach((s) => c.ok('PP: 送信先 ' + s + ' を開示', p.indexOf(s) >= 0));
  c.ok('PP: 広告・追跡なしの明記', /広告を表示せず|行動ターゲティング|トラッキングを行いません/.test(p));
  c.ok('PP: データ削除の方法（アカウント削除）', /アカウントを削除|完全リセット/.test(p));
  c.ok('PP: 13歳未満・保護者同意の記載', /13歳未満/.test(p) && /保護者/.test(p));
  c.ok('PP: お問い合わせ窓口', /お問い合わせ|連絡先/.test(p));
}

// ---- 利用規約：必須要素 ----
{
  const t = read('legal/terms.html');
  c.ok('規約: 禁止事項', /禁止事項/.test(t));
  c.ok('規約: 免責', /免責/.test(t));
  c.ok('規約: 偏差値・成績表示は目安である旨', /保証するものではありません|目安/.test(t));
  c.ok('規約: 準拠法', /準拠法|日本法/.test(t));
}

// ---- 特商法表記：必須欄 ----
{
  const s = read('legal/tokushoho.html');
  ['販売事業者', '所在地', '連絡先', '販売価格', '返品', 'お支払い方法'].forEach((k) => c.ok('特商法: ' + k + ' の欄', s.indexOf(k) >= 0));
}

// ---- ビルドが legal/ をコピーする ----
c.ok('build.js が legal/ を dist へコピー', /legal.*cpSync|cpSync.*legal/.test(read('scripts/build.js')));

// ---- アプリ（index.html）から法的情報へリンク ----
{
  const html = read('index.html');
  c.ok('設定に プライバシーポリシーへのリンク', html.indexOf('legal/privacy.html') >= 0);
  c.ok('設定に 利用規約へのリンク', html.indexOf('legal/terms.html') >= 0);
  c.ok('設定に お問い合わせへのリンク', html.indexOf('legal/index.html') >= 0);
}
c.done();
