'use strict';
// 依存ゼロの軽量アサート（pass/fail を数えて、失敗時は非ゼロ終了＝CIで検知）
function makeChecker(name) {
  let pass = 0, fail = 0;
  return {
    ok(label, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + label); } },
    eq(label, a, b) { this.ok(label + ' (=' + JSON.stringify(b) + ')', a === b); },
    done() { console.log((fail ? '❌' : '✅') + ' ' + name + '  pass=' + pass + ' fail=' + fail); process.exit(fail ? 1 : 0); },
  };
}
const ROOT = require('path').join(__dirname, '..', '..'); // リポジトリ直下
module.exports = { makeChecker, ROOT };
