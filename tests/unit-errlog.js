'use strict';
// エラーモニタリングの検証：
// ① cloud-sync.js の mergeErrLog（和集合・重複排除・20件キャップ・壊れた入力）
// ② index.html の _errRecord（同一エラーは回数nを増やす・20件キャップ）
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-errlog');

// ---- ① mergeErrLog（cloud-sync.jsから抽出）----
{
  const src = fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8');
  const s = src.indexOf('function mergeErrLog(');
  const endMarker = "}catch(e){ return b||a; }\n  }";
  const end = src.indexOf(endMarker, s) + endMarker.length;
  const mergeErrLog = (new Function(src.slice(s, end) + '\nreturn mergeErrLog;'))();

  const A = JSON.stringify([{ t: 100, m: 'errA', s: 'a.js', l: 1 }]);
  const B = JSON.stringify([{ t: 200, m: 'errB', s: 'b.js', l: 2 }]);
  const m1 = JSON.parse(mergeErrLog(A, B));
  c.ok('和集合（両端末のエラーが残る）', m1.length === 2 && m1[0].m === 'errA' && m1[1].m === 'errB');
  c.ok('同一エントリ（t+m）は重複しない', JSON.parse(mergeErrLog(A, A)).length === 1);
  const many = JSON.stringify(Array.from({ length: 18 }, (_, i) => ({ t: i, m: 'e' + i })));
  const m2 = JSON.parse(mergeErrLog(many, JSON.stringify([{ t: 900, m: 'new1' }, { t: 901, m: 'new2' }, { t: 902, m: 'new3' }])));
  c.ok('20件キャップ・古い方から消える', m2.length === 20 && m2[0].m === 'e1' && m2[19].m === 'new3');
  c.ok('壊れた入力はもう片方を返す', mergeErrLog('{bad', B) === B);
  c.ok('null入力でも安全', mergeErrLog(null, B) === JSON.stringify(JSON.parse(B)));
}

// ---- ② _errRecord（index.htmlから抽出）----
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const a = html.indexOf('function _errRecord(');
  const b = html.indexOf('function errMonitorInit');
  const LS = {};
  const _errRecord = (new Function('lsGetJSON', 'lsSetJSON', html.slice(a, b) + '\nreturn _errRecord;'))(
    (k, d) => (k in LS ? JSON.parse(LS[k]) : d), (k, v) => { LS[k] = JSON.stringify(v); });

  _errRecord({ t: 1, m: 'boom', s: 'x.js', l: 10 });
  _errRecord({ t: 2, m: 'boom', s: 'x.js', l: 10 });
  _errRecord({ t: 3, m: 'other', s: 'y.js', l: 5 });
  let log = JSON.parse(LS['err_log']);
  c.ok('同一エラーは1件にまとまり回数n=2', log.length === 2 && log[0].n === 2 && log[0].t === 2);
  c.ok('別エラーは別エントリ', log[1].m === 'other');
  for (let i = 0; i < 25; i++) _errRecord({ t: 100 + i, m: 'e' + i, s: '', l: 0 });
  log = JSON.parse(LS['err_log']);
  c.ok('20件キャップ', log.length === 20);
  c.ok('空エントリは無視して落ちない', (_errRecord(null), _errRecord({}), true));
}

// ---- 統合：捕捉フックと同期登録 ----
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  c.ok('headの先頭に捕捉フック（unhandledrejection含む）', html.indexOf("addEventListener('unhandledrejection'") >= 0 && html.indexOf('err_boot_log') >= 0);
  c.ok('MU_PER_USERにerr_log登録', /var MU_PER_USER = \{[^}]*err_log:1/.test(html));
  c.ok('設定にエラーレポート入口', html.indexOf('errShowReport()') >= 0);
  const cs = fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8');
  c.ok('cloud-syncがerr_logをmergeErrLogに振り分け', cs.indexOf("/:err_log$/.test(k)") >= 0);
}
c.done();
