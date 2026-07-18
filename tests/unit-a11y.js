'use strict';
// アクセシビリティの仕上げ（コントラスト・色覚配慮・reduced-motion）を固定する回帰テスト。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-a11y');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- ライト背景の低コントラスト文字を AA（#64748b以上）へ ----
c.ok('rec-empty はAAコントラスト', html.indexOf('.rec-empty { text-align:center; color:#64748b;') >= 0);
c.ok('settings-hint はAAコントラスト', html.indexOf('.settings-hint { font-size: 0.74rem; color: #64748b;') >= 0);
c.ok('hub-ring-in small はAAコントラスト', html.indexOf('.hub-ring-in small{ font-size:10px; font-weight:700; color:#64748b;') >= 0);
// ライト背景に #94a3b8(<AA) を残していない（暗背景の srpg-*/rk-* 等は対象外）
c.ok('rec-empty/settings-hint に #94a3b8 が残っていない', html.indexOf('.rec-empty { text-align:center; color:#94a3b8') < 0 && html.indexOf('color: #94a3b8; line-height: 1.5;') < 0);

// ---- 正誤を色だけに頼らない（✓/✗ 記号）----
c.ok('正解ボタンに✓記号', html.indexOf('.option-btn.correct::after{ content:" ✓"') >= 0);
c.ok('誤答ボタンに✗記号', html.indexOf('.option-btn.wrong::after{ content:" ✗"') >= 0);

// ---- マスコットの常時アニメが reduced-motion で止まる ----
c.ok('reduced-motionでマスコット停止', html.indexOf('.char-svg, .char-svg.kai, .start-chars svg{ animation:none!important; }') >= 0);
c.ok('reduced-motionで発話ドット停止', html.indexOf('.speaking-dot{ animation:none!important; opacity:1; }') >= 0);

c.done();
