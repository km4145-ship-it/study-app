'use strict';
// js/miss-types.js（ミスの型分析）を検証。
// 分類器は純関数：選んだ答え×正解（＋問題文の数値・解答秒数）→ ミスの型。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-miss-types');

const code = fs.readFileSync(path.join(ROOT, 'js', 'miss-types.js'), 'utf8');

// 単体load（lsGetJSON等が無いNodeでも例外なし）
try { new Function(code)(); c.ok('miss-types.js 単体loadで例外なし', true); }
catch (e) { c.ok('miss-types.js 単体loadで例外なし: ' + e.message, false); }

const api = (new Function(code +
  '\nreturn { MISS_TYPES, missParseNum, missNumsInText, missClassify, missWeekSummary, missLoad, missBump };'))();

// ---- MISS_TYPES の整合 ----
const REQ = ['sign','place','op','near','unit','misread','recall','careless','unknown'];
REQ.forEach((t) => c.ok('MISS_TYPES.' + t + ' に em/name/tip', !!(api.MISS_TYPES[t] && api.MISS_TYPES[t].em && api.MISS_TYPES[t].name && api.MISS_TYPES[t].tip)));

// ---- missParseNum ----
const P = api.missParseNum;
c.eq('整数', P('12'), 12);
c.eq('マイナス（全角ハイフン系）', P('−3'), -3);
c.eq('小数', P('2.5'), 2.5);
c.eq('分数', P('3/4'), 0.75);
c.eq('負の分数', P('-3/4'), -0.75);
c.eq('単位つき', P('12cm'), 12);
c.eq('全角数字', P('１２'), 12);
c.eq('x=形式', P('x=3'), 3);
c.eq('数値なし→null', P('りんご'), null);
c.eq('null→null', P(null), null);

// ---- missNumsInText ----
c.eq('問題文から数値抽出', JSON.stringify(api.missNumsInText('12この りんごを 4人で わけると？')), '[12,4]');
c.eq('マイナスも拾う', JSON.stringify(api.missNumsInText('(−3) + 5 は？')), '[-3,5]');

// ---- missClassify（分類器）----
const C = (q, chosen, sec) => api.missClassify(q, chosen, sec);
// 符号ミス
c.eq('符号ミス', C({ q:'(−3) + 5 は？', ans:'2' }, '−2', 10), 'sign');
// けたミス
c.eq('けたミス（10倍）', C({ q:'12 × 10 は？', ans:'120' }, '1200', 10), 'place');
c.eq('けたミス（1/10）', C({ q:'3 ÷ 10 は？', ans:'0.3' }, '3', 10), 'place');
// 演算えらび（12+4=16 が正解のとき 48 を選ぶ＝かけ算してしまった）
c.eq('演算えらび（×）', C({ q:'12 と 4 を たすと？', ans:'16' }, '48', 10), 'op');
c.eq('演算えらび（−）', C({ q:'12 と 4 を たすと？', ans:'16' }, '8', 10), 'op');
c.eq('演算えらび（÷）', C({ q:'12 と 4 を たすと？', ans:'16' }, '3', 10), 'op');
// おしい計算ミス
c.eq('おしい（±2）', C({ q:'27 + 29 は？', ans:'56' }, '54', 10), 'near');
// たんい・書き方（数は合っている）
c.eq('たんいちがい', C({ q:'長さは？', ans:'12cm' }, '12m', 10), 'unit');
// 早すぎる誤答＝読みちがい疑い
c.eq('いそぎすぎ（数値大外し）', C({ q:'854 × 37 は？', ans:'31598' }, '100', 2), 'misread');
c.eq('いそぎすぎ（文字）', C({ q:'「詳」の読みは？', ans:'くわ(しい)' }, 'あや(しい)', 2), 'misread');
// 暗記もの
c.eq('おぼえあいまい（文字答え）', C({ q:'appleの意味は？', ans:'りんご' }, 'みかん', 15), 'recall');
// 型なし（数値の大外れ・時間かけて）→ null＝通常の苦手として扱う
c.eq('大外れは型なし', C({ q:'854 × 37 は？', ans:'31598' }, '100', 30), null);
c.eq('chosen無し→null', C({ q:'a', ans:'1' }, null, 10), null);
// 優先順位：符号ミスは「おしい」より優先（ans=1, chosen=-1 は差2だがsign）
c.eq('sign が near より優先', C({ q:'x', ans:'1' }, '-1', 10), 'sign');

// ---- missWeekSummary ----
const days = { '2026-7-13': { sign: 2, op: 1 }, '2026-7-14': { sign: 1, recall: 3 }, '2026-6-1': { near: 9 } };
const wk = ['2026-7-8','2026-7-9','2026-7-10','2026-7-11','2026-7-12','2026-7-13','2026-7-14'];
const sum = api.missWeekSummary(days, wk);
c.eq('週集計は週内のみ・多い順', JSON.stringify(sum), JSON.stringify([{ t:'sign', n:3 }, { t:'recall', n:3 }, { t:'op', n:1 }].sort((a,b)=>b.n-a.n)));
c.ok('missBump は不明な型を無視', api.missBump('nazo') === null);

// ---- index.html 統合 ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は js/miss-types.js を読み込む', html.indexOf('<script src="js/miss-types.js') >= 0);
c.ok('checkChoice が lastChosen を記録', html.indexOf('lastChosen = selected') >= 0);
c.ok('誤答時に missClassify を呼ぶ', html.indexOf('missClassify(_mq') >= 0);
c.ok('自己申告も missBump に流れる', /classifyMistake[\s\S]{0,200}missBump/.test(html));
c.ok('週次カードにミスのくせ', html.indexOf('今週のミスのくせ') >= 0);
c.done();
