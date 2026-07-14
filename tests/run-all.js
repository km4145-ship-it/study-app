'use strict';
// 全テストを実行して集計する（依存ゼロ。node tests/run-all.js もしくは npm test）
const { spawnSync } = require('child_process');
const path = require('path');

const TESTS = [
  ['tests/unit-syntax.js'],
  ['tests/unit-load-order.js'],
  ['tests/unit-rpg-assets.js'],
  ['tests/unit-rpg-world.js'],
  ['tests/unit-aibou.js'],
  ['tests/unit-chars.js'],
  ['tests/unit-char3d.js'],
  ['tests/unit-areas.js'],
  ['tests/unit-cos-data.js'],
  ['tests/unit-subjects.js'],
  ['tests/unit-questions.js'],
  ['tests/unit-generators.js'],
  ['tests/unit-generators-hard.js'],
  ['tests/unit-generators-plus.js'],
  ['tests/unit-revenge.js'],
  ['tests/unit-audio.js'],
  ['tests/unit-furigana.js'],
  ['tests/unit-reading-ja.js'],
  ['tests/unit-scoring.js'],
  ['tests/unit-content-data.js'],
  ['tests/unit-ui-data.js'],
  ['tests/unit-util.js'],
  ['tests/unit-miss-types.js'],
  ['tests/unit-coverage.js'],
  ['tests/unit-rating.js'],
  ['tests/unit-ranking-logic.js'],
  ['tests/unit-merge-cos.js'],
  ['tests/unit-users.js'],
  ['tests/unit-session.js'],
  ['tests/unit-gacha.js'],
  ['tests/unit-collections.js'],
  ['tests/unit-stats.js'],
  ['tests/int-restore.js'],
  ['tests/int-status.js', 'ok'],
  ['tests/int-status.js', 'deny'],
  ['tests/int-heal.js', 'heal'],
  ['tests/int-heal.js', 'parentfail'],
  ['tests/int-heal.js', 'noread'],
  ['tests/int-pullshared.js'],
  ['tests/int-ranking.js'],
  ['tests/int-growonly.js'],
  ['tests/int-build.js'],
];

const root = path.join(__dirname, '..');
let failed = 0;
for (const [file, ...args] of TESTS) {
  const r = spawnSync(process.execPath, [file, ...args], { stdio: 'inherit', cwd: root });
  if (r.status !== 0) failed++;
}
console.log('\n' + (failed ? ('❌ ' + failed + ' / ' + TESTS.length + ' テストが失敗') : ('✅ 全 ' + TESTS.length + ' テスト合格')));
process.exit(failed ? 1 : 0);
