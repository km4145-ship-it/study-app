'use strict';
// 家族対戦（family_duels）の同期を検証：
// ①クラウドとローカルの対戦状が「id単位の和集合・resultsもuid単位の和集合」でマージされる
// ②保存（書込）側でも和集合＝端末Aの挑戦状と端末Bの結果が相互に消し合わない
const path = require('path');
const { createHarness } = require('./lib/cloud-harness');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('int-duels');

const Q = [{ q: 'q1', ans: 'A', type: 'choice', choices: ['A', 'B', 'C', 'D'], sub: 's', level: '★★☆' }];
const duel = (id, at, results) => ({ id, from: 'u1', fromName: 'ちさき', area: 'math', at, qs: Q, results: results || {} });
const duelsIn = (store) => { try { return JSON.parse((store['families/0000/shared/settings'].data || {}).family_duels || '{}'); } catch (e) { return {}; } };

(async () => {
  // --- ① 読み取りマージ：クラウド=挑戦状+u1結果 / ローカル=u2の結果 → 両方残る ---
  {
    const store = {};
    store['families/0000'] = { v2done: true, data: {} };
    store['families/0000/shared/settings'] = { data: {
      mu_users: JSON.stringify([{ id: 'u1', name: 'ちさき', char: 'shiba' }]),
      family_duels: JSON.stringify({ d1: duel('d1', 100, { u1: { score: 5, name: 'ちさき', timeMs: 60000 } }) }),
    } };
    const h = createHarness({ store, mode: 'ok' });
    // ローカルには u2 の結果だけがある（先に書き込まれていた想定）
    h.LS._m['family_duels'] = JSON.stringify({ d1: duel('d1', 100, { u2: { score: 4, name: 'あやか', timeMs: 50000 } }) });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(40, 40);
    const local = JSON.parse(h.LS._m['family_duels'] || '{}');
    c.ok('①ローカルにu1とu2の両方の結果がそろう', !!(local.d1 && local.d1.results.u1 && local.d1.results.u2));
    c.eq('①u1のスコアが保持される', local.d1.results.u1.score, 5);
    c.eq('①u2のスコアが保持される', local.d1.results.u2.score, 4);
  }

  // --- ② 書込マージ：クラウドに別の挑戦状（d2）→ ローカル保存でも d2 が消えない ---
  {
    const store = {};
    store['families/0000'] = { v2done: true, data: {} };
    store['families/0000/shared/settings'] = { data: {
      mu_users: JSON.stringify([{ id: 'u1', name: 'ちさき', char: 'shiba' }]),
      family_duels: JSON.stringify({ d2: duel('d2', 200) }),   // 端末Bが出した挑戦状
    } };
    const h = createHarness({ store, mode: 'ok' });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(40, 40);
    // この端末で新しい挑戦状 d3 を作成（共有キーへの書込→保存誘発）
    const mine = JSON.parse(h.LS._m['family_duels'] || '{}');
    mine.d3 = duel('d3', 300);
    global.localStorage.setItem('family_duels', JSON.stringify(mine));
    await h.settle(40, 40);
    const after = duelsIn(store);
    c.ok('②クラウドに d2 と d3 の両方が残る', !!(after.d2 && after.d3));
  }

  // --- ③ 相互クロバー：両端末が同じ対戦状に別々の結果 → 保存し合っても両結果が残る ---
  {
    const store = {};
    store['families/0000'] = { v2done: true, data: {} };
    store['families/0000/shared/settings'] = { data: {
      mu_users: JSON.stringify([{ id: 'u1', name: 'ちさき', char: 'shiba' }]),
      family_duels: JSON.stringify({ d1: duel('d1', 100, { u2: { score: 3, name: 'あやか', timeMs: 40000 } }) }),
    } };
    const h = createHarness({ store, mode: 'ok' });
    h.load(path.join(ROOT, 'cloud-sync.js'));
    await h.settle(40, 40);
    const cur = JSON.parse(h.LS._m['family_duels'] || '{}');   // すでに u2 の結果がマージ済み
    cur.d1.results.u1 = { score: 5, name: 'ちさき', timeMs: 55000 };
    global.localStorage.setItem('family_duels', JSON.stringify(cur));
    await h.settle(40, 40);
    const after = duelsIn(store);
    c.ok('③クラウドに両者の結果がそろう', !!(after.d1 && after.d1.results.u1 && after.d1.results.u2));
  }
  c.done();
})();
