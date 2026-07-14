'use strict';
// js/teach.js（🗣️おしえてモード＝ファインマン学習法）を検証。
// ルーブリック評価は端末内で決定的：正規化（カタカナ→ひらがな等）とキーワード照合をテストする。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-teach');

const code = fs.readFileSync(path.join(ROOT, 'js', 'teach.js'), 'utf8');
try { new Function(code)(); c.ok('teach.js 単体loadで例外なし', true); }
catch (e) { c.ok('teach.js 単体loadで例外なし: ' + e.message, false); }
const api = (new Function(code + '\nreturn { TEACH_TOPICS, teachNormalize, teachScore, teachPickTopic };'))();

// ---- トピックの整合 ----
const AREAS = ['math', 'japanese', 'english', 'science', 'social'];
c.ok('トピックが15個以上', api.TEACH_TOPICS.length >= 15);
AREAS.forEach((a) => c.ok(a + ' に2トピック以上', api.TEACH_TOPICS.filter((t) => t.area === a).length >= 2));
c.ok('idがユニーク', new Set(api.TEACH_TOPICS.map((t) => t.id)).size === api.TEACH_TOPICS.length);
let structOk = true;
api.TEACH_TOPICS.forEach((t) => {
  if (!t.id || !t.area || !t.title || !t.q || !t.model) structOk = false;
  if (!Array.isArray(t.keys) || t.keys.length < 2) structOk = false;
  (t.keys || []).forEach((k) => { if (!k.w || !k.ask) structOk = false; });
});
c.ok('全トピックに q/model/keys(w,ask)×2以上', structOk);

// ---- teachNormalize ----
const N = api.teachNormalize;
c.eq('カタカナ→ひらがな', N('スウチョクセン'), 'すうちょくせん');
c.eq('全角英数→半角・小文字', N('ＡＭ　ＩＳ'), 'amis');
c.eq('空白・句読点を除去', N('底辺 × 高さ、÷2！'), N('底辺×高さ÷2'));
c.eq('null→空', N(null), '');

// ---- teachScore ----
const topic = api.TEACH_TOPICS.find((t) => t.id === 'm_menseki');   // 三角形の面積（底辺・高さ・2でわる）
{
  const r = api.teachScore('三角形の面積は、底辺かける高さを2でわると求められます。', topic);
  c.eq('3キーワード全部ヒット', r.hits.length, 3);
  c.ok('スコアは80点以上', r.score >= 80);
  c.eq('missingは空', r.missing.length, 0);
}
{
  const r = api.teachScore('テイヘンとタカサをかける', topic);   // カタカナ＋2キーワード
  c.eq('カタカナでもヒット（2つ）', r.hits.length, 2);
  c.eq('足りないのは「2でわる」', r.missing[0].w, '2でわる');
  c.ok('followの追い質問がある', typeof r.missing[0].ask === 'string' && r.missing[0].ask.length > 3);
}
{
  const r = api.teachScore('はんぶんにする', topic);   // altの言いかえ（半分）
  c.ok('言いかえ（半分）でヒット', r.hits.indexOf('2でわる') >= 0);
}
{
  const r = api.teachScore('', topic);
  c.eq('空文はヒット0', r.hits.length, 0);
  c.eq('空文はスコア0', r.score, 0);
}
{
  const long = 'これはキーワードを含まないながいながい説明文です。がんばって書いたけれど大事な言葉が入っていません。';
  const r = api.teachScore(long, topic);
  c.ok('キーワード無しは長くても20点以下', r.score <= 20);
}
c.ok('スコアは0〜100に収まる', api.TEACH_TOPICS.every((t) => {
  const r = api.teachScore(t.model, t);   // 模範解答は必ず高得点
  return r.score >= 60 && r.score <= 100;
}));

// ---- 模範解答（model）は自分のルーブリックで全キーワードの過半数を満たす（お手本の質の保証）----
api.TEACH_TOPICS.forEach((t) => {
  const r = api.teachScore(t.model, t);
  c.ok(t.id + ' の模範解答がルーブリック過半数ヒット（' + r.hits.length + '/' + t.keys.length + '）',
    r.hits.length >= Math.ceil(t.keys.length / 2));
});

// ---- teachPickTopic ----
c.eq('rnd=0で先頭', api.teachPickTopic('math', 0).area, 'math');
c.ok('rnd=0.99で末尾側もmath', api.teachPickTopic('math', 0.99).area, 'math');
c.ok('未知教科は全体から', !!api.teachPickTopic('nazo', 0.5));

// ---- index.html 統合 ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は js/teach.js を読み込む', html.indexOf('<script src="js/teach.js') >= 0);
c.ok('ハブに おしえてカード', html.indexOf("'teachStart()'") >= 0);
c.ok('追い質問フェーズがある', html.indexOf('_teach.phase=2') >= 0);
c.ok('マイクは対応端末のみ表示', html.indexOf('_teachMicAvail()') >= 0);
c.done();
