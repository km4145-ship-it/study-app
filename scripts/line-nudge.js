#!/usr/bin/env node
'use strict';
/*
 * line-nudge.js — 夜の「今日の学習まだ？」再訪ナッジ（LINE）
 * ------------------------------------------------------------------
 * 目的：Day7-14 離脱の最大要因＝再訪の欠如を、不安を煽らない前向きな1通で埋める。
 *      study-app が使っている LINE 転送エンドポイント（GAS の URL）へ、
 *      アプリの sendLineEvent と同じ {type,message} 形式で POST する。
 *
 * ■ 重要（安全設計）
 *  - 既定は **dry-run**（実際には送らず、送る内容を表示するだけ）。
 *    実送信は `--send` を付けたときだけ。＝うっかり実行で外部送信されない。
 *  - このスクリプトは **自動では動きません**。有効化（launchd 登録）は
 *    あなた自身が下記手順で行ってください（システム設定の変更のため）。
 *  - 個々の子の「今日やったか」は端末内(localStorage)にあり、この外部プロセスからは
 *    読めません。よって内容は "家族向けの一般的なリマインド" です（個別化は将来課題）。
 *
 * ■ 使い方
 *   1) エンドポイントを渡す（アプリの設定→LINE通知で使っている GAS の URL と同じ）：
 *        export LINE_ENDPOINT="https://script.google.com/macros/s/XXXX/exec"
 *   2) まず dry-run で内容確認：
 *        node scripts/line-nudge.js
 *   3) 実際に送る（1通）：
 *        node scripts/line-nudge.js --send
 *
 * ■ 毎晩20時に自動送信したい場合（launchd・任意・あなたが実行）
 *   ~/Library/LaunchAgents/com.studyapp.linenudge.plist を作り、
 *   ProgramArguments に node と このスクリプトのフルパス＋"--send"、
 *   EnvironmentVariables に LINE_ENDPOINT、StartCalendarInterval に Hour=20 を設定して
 *     launchctl load ~/Library/LaunchAgents/com.studyapp.linenudge.plist
 *   （雛形は docs/LINE_NUDGE_SETUP.md 参照）。※スリープ対策は keepawake を併用。
 */
const https = require('https');
const { URL } = require('url');

var SEND = process.argv.indexOf('--send') >= 0;
var ENDPOINT = process.env.LINE_ENDPOINT || '';

// 前向きで軽い文面（不安を煽らない・休んでOK・小さく再開）。曜日で少し変える。
var MESSAGES = [
  '今日の学習、まだの人は 軽く1問だけでも どうかな？ つづける力が いちばんの才能だよ✨',
  'おつかれさま！ 5分だけ 復習ダンジョンに 行ってみない？ 忘れたころが チャンスだよ🔁',
  'きょうの1問、いっしょに やっつけよう！ ちいさな一歩でも えらい🌱',
  'ストリークは おやすみ券で 守れるよ。ムリせず、できる範囲で つづけよう😊',
];
function pickMessage(){
  // 決定的（日付ベース）に選ぶ＝乱数なしで日替わり
  var d = new Date();
  var idx = (d.getFullYear()*372 + (d.getMonth()+1)*31 + d.getDate()) % MESSAGES.length;
  return MESSAGES[idx];
}

function main(){
  var payload = { type: 'nudge', message: pickMessage(), source: 'line-nudge.js', ts: Date.now() };
  var body = JSON.stringify(payload);
  console.log('[line-nudge] message:', payload.message);
  if(!ENDPOINT){
    console.log('[line-nudge] LINE_ENDPOINT が未設定です。export LINE_ENDPOINT="...(GASのURL)" を設定してください。');
    process.exit(SEND ? 1 : 0);
  }
  if(!SEND){
    console.log('[line-nudge] dry-run（送信しません）。実際に送るには --send を付けてください。');
    console.log('[line-nudge] 送信先:', ENDPOINT);
    return;
  }
  var u;
  try { u = new URL(ENDPOINT); } catch(e){ console.error('[line-nudge] URL が不正です:', e.message); process.exit(1); }
  var opts = { method:'POST', hostname:u.hostname, path:u.pathname + u.search, headers:{ 'Content-Type':'text/plain', 'Content-Length':Buffer.byteLength(body) } };
  var req = https.request(opts, function(res){
    // GAS はリダイレクトを返すことがある（302）。2xx/3xx を成功扱い。
    var ok = res.statusCode >= 200 && res.statusCode < 400;
    console.log('[line-nudge] 送信' + (ok ? '成功' : '失敗') + ' status=' + res.statusCode);
    res.resume();
    process.exit(ok ? 0 : 1);
  });
  req.on('error', function(e){ console.error('[line-nudge] 送信エラー:', e.message); process.exit(1); });
  req.write(body); req.end();
}
main();
