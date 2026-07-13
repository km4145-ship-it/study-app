'use strict';
// 「まちがい→その場で類題リベンジ」の類題探し（findSimilarQuestion）を検証する。
// ①スタブで決定的に：ジェネレータ再抽選経路／固定バンク経路／見つからない場合
// ②実データ smoke：全教科の生成問題に対して高確率で類題が見つかる
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-revenge');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const s = html.indexOf('// ===== まちがい→その場で類題リベンジ =====');
const e = html.indexOf('function showQuestion', s);
c.ok('抽出マーカーが存在する', s >= 0 && e > s);
const block = html.slice(s, e);

// ---- ① スタブで決定的に検証 ----
function build(genStub, bank, questions) {
  return (new Function('genQuestion', 'BANK', 'QUESTIONS', 'currentArea',
    block + '\nreturn findSimilarQuestion;'))(genStub, bank, questions, 'math');
}

// ジェネレータ経路：同subの別問題が出たらそれを返す
{
  let calls = 0;
  const gen = () => { calls++; return calls < 3 ? { sub: 'べつの単元', q: 'x', ans: 1 } : { sub: '割合', q: '30%の…', ans: 2 }; };
  const f = build(gen, undefined, undefined);
  const r = f({ sub: '割合', q: '20%の…', ans: 5, area: 'math' });
  c.ok('ジェネレータ再抽選で同subの別問題を返す', r && r.sub === '割合' && r.q === '30%の…');
}
// バンク経路：ジェネレータが空振りでも固定バンクから同subの別問題
{
  const gen = () => ({ sub: 'nomatch', q: 'x', ans: 1 });
  const bankItem = { sub: '密度', q: '鉄の密度は…', ans: 7.9 };
  const f = build(gen, { science: { practice: [bankItem, { sub: '密度', q: '氷の密度は…', ans: 0.92 }], exam: [] } }, undefined);
  const r = f({ sub: '密度', q: '鉄の密度は…', ans: 7.9, area: 'science' });
  c.ok('固定バンクから同subの別問題を返す', r && r.sub === '密度' && r.q === '氷の密度は…');
  c.ok('返り値はコピー（バンク原本を汚さない）', r !== bankItem && !bankItem._revenge);
}
// 見つからない場合は null（安全にリベンジ無し）
{
  const gen = () => ({ sub: 'nomatch', q: 'x', ans: 1 });
  const f = build(gen, { math: { practice: [], exam: [] } }, undefined);
  c.ok('同subが無ければ null', f({ sub: '存在しない単元', q: 'q', ans: 1, area: 'math' }) === null);
  c.ok('sub の無い問題は null', f({ q: 'q', ans: 1 }) === null);
  c.ok('null 問題でも例外を出さない', f(null) === null);
}

// ---- ② 実データ smoke（全教科・20問中17問以上で類題が見つかる。実測は59/60=98%） ----
{
  const mods = ['js/subjects.js', 'js/questions-bank.js', 'js/questions-extra.js', 'js/generators.js', 'js/generators-hard.js']
    .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  const api = (new Function('muGradeBand', 'var currentArea="math";\n' + mods + '\n' + block
    + '\nreturn { genQuestion: genQuestion, findSimilarQuestion: findSimilarQuestion, baseSub: _revBaseSub };'))(() => 'jhs');
  let ok = 0;
  const AREAS = ['math', 'japanese', 'english', 'science', 'social'];
  for (let i = 0; i < 20; i++) {
    const area = AREAS[i % 5];
    const t = api.genQuestion(area); t.area = area;
    const r = api.findSimilarQuestion(t);
    if (r && r.q !== t.q && (r.sub === t.sub || api.baseSub(r.sub) === api.baseSub(t.sub))) ok++;
  }
  c.ok('実データ：20問中17問以上で類題が見つかる（実績 ' + ok + '/20）', ok >= 17);
  c.eq('基本単元の正規化：（図）を除く', api.baseSub('合成抵抗（並列・図）'), '合成抵抗');
}

// ---- 組み込みの静的検証（ガード条件が正しく入っているか） ----
c.ok('handleAnswer に挿入ロジックがある', html.indexOf("currentQuestions.splice(currentIndex+1, 0, _rq)") >= 0);
c.ok('模試・バトル・まちがい直しでは発動しない', /!correct && !isExam && !rpgBattle && !isMistakePractice/.test(html));
c.ok('リベンジ問題自身からは再リベンジしない', html.indexOf("!currentQuestions[currentIndex]._revenge && _revengeCount<3") >= 0);
c.ok('リベンジバナー要素がある', html.indexOf('id="revenge-banner"') >= 0);

c.done();
