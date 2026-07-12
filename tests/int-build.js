'use strict';
// 本番ビルドが通り、dist/ が健全（ハンドラ関数が圧縮後も生存・バンドル構文OK）かを検証。
// esbuild(devDependency) が無い環境（依存ゼロのCIテストジョブ等）では優雅にスキップする。
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('int-build');

const esbuild = path.join(ROOT, 'node_modules', '.bin', 'esbuild');
if (!fs.existsSync(esbuild)) {
  console.log('  ⏭  esbuild未導入のためビルド検証をスキップ（CIのビルドジョブ側で検証）');
  c.done();
  return;
}

const build = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build.js')], { cwd: ROOT, encoding: 'utf8' });
c.ok('npm run build が成功する', build.status === 0);
if (build.status !== 0) { console.error(build.stdout, build.stderr); c.done(); return; }

const check = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-globals.js')], { cwd: ROOT, encoding: 'utf8' });
if (check.status !== 0) console.error(check.stdout, check.stderr);
c.ok('dist健全性チェック(check-globals)が通る', check.status === 0);

c.done();
