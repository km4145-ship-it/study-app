'use strict';
// firestore.rules の構造を静的に検証する（キャッチオール再混入の回帰フェンス）。
// ルールの「意味論」までは検証できない（それはデプロイ後の実地プローブで確認する）が、
// 2026-07-14に見つけた「match /{document=**} の OR 評価で private/tts が漏れる」欠陥の
// 再発を防ぐ。tests/unit-tts-worker.js と同じ「ファイル内容アサート」方式。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-firestore-rules');

const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
// コメント行を除いた「実効ルール」だけを見る（コメント内の説明文に反応しないため）
const eff = rules.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

// ブレース対応でトップレベルの match ブロックを1つ切り出す
function block(src, header) {
  const s = src.indexOf(header);
  if (s < 0) return '';
  let depth = 0, start = src.indexOf('{', s);
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return src.slice(start);
}
const famBlock = block(eff, 'match /families/{fam}');

// 1) families 配下に素のキャッチオール match /{document=**} が無いこと（これが穴の元凶だった）。
//    families は private サブコレクションを持つので、無条件キャッチオールがあると OR 評価で漏れる。
c.ok('families ブロックを抽出できる', famBlock.length > 0);
c.ok('families 配下にキャッチオール match /{document=**} が無い', famBlock.indexOf('match /{document=**}') < 0);

// 2) 許可サブコレクションが明示列挙されている（shared/members/sessions）
c.ok('shared サブコレクションの明示 match がある', /match\s+\/shared\/\{document=\*\*\}/.test(eff));
c.ok('members サブコレクションの明示 match がある', /match\s+\/members\/\{document=\*\*\}/.test(eff));
c.ok('sessions サブコレクションの明示 match がある', /match\s+\/sessions\/\{document=\*\*\}/.test(eff));

// 3) private を許可するルールが無いこと（match /private/... を書かない＝デフォルト拒否）
c.ok('families 配下に private を対象にする match が無い（＝デフォルト拒否）', famBlock.indexOf('/private') < 0);

// 4) accounts は匿名を除外している（Phase 4・回帰確認）
c.ok('accounts は非匿名のみ許可（sign_in_provider チェック）',
  eff.indexOf("request.auth.token.firebase.sign_in_provider != 'anonymous'") >= 0);
c.ok('accounts は所有者本人のみ（uid 一致チェック）', eff.indexOf('request.auth.uid == accountId') >= 0);

// 5) rules_version 2（{document=**} 等の再帰ワイルドカードに必須）
c.ok("rules_version = '2'", rules.indexOf("rules_version = '2'") >= 0);

c.done();
