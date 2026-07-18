'use strict';
// js/util.js（副作用のない純粋ヘルパ）の特性テスト。ゴールデンは分離前の index.html から捕捉。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-util');

const code = fs.readFileSync(path.join(ROOT, 'js', 'util.js'), 'utf8');
const api = (new Function(code +
  '\nreturn { escapeHtml, topicKey, dateKeyOffset, todayKey, fmtTime, _toDate, revTip };'))();

['escapeHtml', 'topicKey', 'dateKeyOffset', 'todayKey', 'fmtTime', '_toDate']
  .forEach((f) => c.ok(f + ' が関数', typeof api[f] === 'function'));

// escapeHtml：& < > " ' をエスケープ（属性値XSS対策・引用符も含む）／非文字列も String 化
c.eq('escapeHtml(<a>&"x)', api.escapeHtml('<a>&"x'), '&lt;a&gt;&amp;&quot;x');
c.eq("escapeHtml(引用符')", api.escapeHtml("a'b"), 'a&#39;b');
c.eq('escapeHtml(数値)', api.escapeHtml(5), '5');
c.eq('escapeHtml(通常文字)', api.escapeHtml('あいう'), 'あいう');

// topicKey：area|sub
c.eq('topicKey(math,割合)', api.topicKey('math', '割合'), 'math|割合');

// fmtTime：秒→「n秒/n分/n時間n分」
c.eq('fmtTime(0)', api.fmtTime(0), '0秒');
c.eq('fmtTime(30)', api.fmtTime(30), '30秒');
c.eq('fmtTime(60)', api.fmtTime(60), '1分');
c.eq('fmtTime(90)', api.fmtTime(90), '1分');
c.eq('fmtTime(3661)', api.fmtTime(3661), '1時間1分');
c.eq('fmtTime(7325)', api.fmtTime(7325), '2時間2分');
c.eq('fmtTime(undefined)', api.fmtTime(undefined), '0秒');

// _toDate：'YYYY-MM-DD' をローカル Date に（月は0始まり補正）
const d = api._toDate('2026-07-13');
c.eq('_toDate 年', d.getFullYear(), 2026);
c.eq('_toDate 月(1始まり)', d.getMonth() + 1, 7);
c.eq('_toDate 日', d.getDate(), 13);

// todayKey / dateKeyOffset：形式と相対関係（「今日」依存のため相対で検証）
c.ok('todayKey() は YYYY-MM-DD 形式', /^\d{4}-\d{2}-\d{2}$/.test(api.todayKey()));
c.eq('dateKeyOffset(0) === todayKey()', api.dateKeyOffset(0), api.todayKey());
c.ok('dateKeyOffset(-1) < dateKeyOffset(1)', api.dateKeyOffset(-1) < api.dateKeyOffset(1));
c.ok('dateKeyOffset(-1) も形式一致', /^\d{4}-\d{2}-\d{2}$/.test(api.dateKeyOffset(-1)));

// revTip：解説から「解き直しの一言ヒント」を1行抜く（まちがい→リベンジで考え方を運ぶ）
c.eq('revTip：考え方を優先して抜く',
  api.revTip('【考え方】分母をそろえる\n【手順】1/2=3/6\n【ポイント】通分'), '分母をそろえる');
c.eq('revTip：考え方が無ければ手順',
  api.revTip('【手順】まず10をつくる\n【ポイント】さくらんぼ計算'), 'まず10をつくる');
c.eq('revTip：ポイントしか無ければポイント', api.revTip('【ポイント】符号に注意'), '符号に注意');
c.eq('revTip：見出しが無ければ先頭行', api.revTip('ふつうの一文です\n2行目'), 'ふつうの一文です');
c.eq('revTip：空はから文字', api.revTip(''), '');
c.eq('revTip：null安全', api.revTip(null), '');
c.ok('revTip：長すぎる考え方は省略(…)', api.revTip('【考え方】' + 'あ'.repeat(80)).length <= 48 && /…$/.test(api.revTip('【考え方】' + 'あ'.repeat(80))));

// index.html 側は再定義せず、モジュールを読み込む
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は escapeHtml を再定義しない', html.indexOf('function escapeHtml(') < 0);
c.ok('index.html は fmtTime を再定義しない', html.indexOf('function fmtTime(') < 0);
c.ok('index.html は js/util.js を読み込む', html.indexOf('<script src="js/util.js') >= 0);
c.ok('index.html は revTip を再定義しない（util.js に集約）', html.indexOf('function revTip(') < 0);
c.ok('リベンジ問題に解説の考え方を運ぶ（_revTip 配線）', html.indexOf('revTip(currentQuestions[currentIndex].explain)') >= 0 && html.indexOf('q._revTip') >= 0);

c.done();
