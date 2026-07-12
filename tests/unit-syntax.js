'use strict';
// cloud-sync.js と index.html の全<script>が構文的に正しいことを検証（壊れたJSをpushで止める）。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-syntax');

try { new Function(fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8')); c.ok('cloud-sync.js 構文OK', true); }
catch (e) { c.ok('cloud-sync.js 構文OK: ' + e.message, false); }

const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const parts = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
let allOk = true, i = 0;
for (const p of parts) { i++; try { new Function(p); } catch (e) { allOk = false; c.ok('index.html <script>#' + i + ' 構文OK: ' + e.message, false); } }
c.ok('index.html の<script> ' + parts.length + '件すべて構文OK', allOk);
c.done();
