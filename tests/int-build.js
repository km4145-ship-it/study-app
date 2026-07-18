'use strict';
// 本番ビルドが通り、dist/ が健全（ハンドラ関数が圧縮後も生存・バンドル構文OK）かを検証。
// esbuild(devDependency) が無い環境（依存ゼロのCIテストジョブ等）では優雅にスキップする。
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('int-build');

// CIで実ブラウザe2eが「黙ってスキップ→緑」にならない配線を守る（esbuild有無に依らず先に検証）
{
  const e2e = fs.readFileSync(path.join(ROOT, 'tests', 'e2e-smoke.js'), 'utf8');
  c.ok('e2e-smoke は E2E_REQUIRED=1 のとき Chrome不在を失敗にする',
    e2e.indexOf("E2E_REQUIRED === '1'") >= 0 && e2e.indexOf('CI設定を直すこと') >= 0);
  const ci = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
  c.ok('ci.yml は Chrome を導入し e2e を必須化（setup-chrome＋E2E_REQUIRED=1）',
    ci.indexOf('setup-chrome') >= 0 && ci.indexOf("E2E_REQUIRED: '1'") >= 0);
}

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
