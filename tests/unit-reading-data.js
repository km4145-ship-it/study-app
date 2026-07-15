'use strict';
// js/reading-data.js（書き下ろし読解問題）を検証。
// 文章と設問の構造・答えの選択肢内存在・BANKへの登録数まで機械検証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-reading-data');

const extra = fs.readFileSync(path.join(ROOT, 'js', 'questions-extra.js'), 'utf8');
const reading = fs.readFileSync(path.join(ROOT, 'js', 'reading-data.js'), 'utf8');
const api = (new Function(extra + '\n' + reading + '\nreturn { BANK, READING_SETS };'))();

// ---- セット構造 ----
c.ok('読解セットは15本以上', api.READING_SETS.length >= 15);
c.ok('国語セットが10本以上', api.READING_SETS.filter((s) => s.area === 'japanese').length >= 10);
c.ok('英語セットが4本以上', api.READING_SETS.filter((s) => s.area === 'english').length >= 4);

let total = 0;
api.READING_SETS.forEach((set, si) => {
  const label = set.area + '#' + si;
  c.ok(label + ' 本文が80字以上', typeof set.passage === 'string' && set.passage.length >= 80);
  c.ok(label + ' 消し忘れ・仮テキストなし', !/placeholder|TODO|XXX/i.test(set.passage));
  c.ok(label + ' 設問が2問以上', Array.isArray(set.qs) && set.qs.length >= 2);
  (set.qs || []).forEach((q, qi) => {
    total++;
    const ql = label + '-q' + qi;
    c.ok(ql + ' 4択で答えが選択肢内', Array.isArray(q.choices) && q.choices.length === 4 && q.choices.includes(q.ans));
    c.ok(ql + ' 選択肢に重複なし', new Set(q.choices).size === 4);
    c.ok(ql + ' subが読解系', /読解/.test(q.sub || ''));
    c.ok(ql + ' levelが正規', ['★☆☆', '★★☆', '★★★', '★★★★'].includes(q.level));
    c.ok(ql + ' hint/explainあり', !!q.hint && !!q.explain);
  });
});
c.ok('設問は合計40問以上（現在' + total + '）', total >= 40);

// ---- BANK登録：練習と模試に振り分けられている ----
{
  const base = (new Function(extra + '\nreturn BANK;'))();
  const jpP = api.BANK.japanese.practice.length - base.japanese.practice.length;
  const jpE = api.BANK.japanese.exam.length - base.japanese.exam.length;
  const enP = api.BANK.english.practice.length - base.english.practice.length;
  const enE = api.BANK.english.exam.length - base.english.exam.length;
  c.ok('国語: 練習と模試の両方に登録（練' + jpP + '/模' + jpE + '）', jpP > 0 && jpE > 0);
  c.ok('英語: 練習と模試の両方に登録（練' + enP + '/模' + enE + '）', enP > 0 && enE > 0);
  c.ok('登録合計がセット設問数と一致', jpP + jpE + enP + enE === total);
  // 登録済みエントリはpassageを持つchoice問題
  const last = api.BANK.japanese.practice[api.BANK.japanese.practice.length - 1];
  c.ok('登録エントリはpassage付きchoice', !!last.passage && last.type === 'choice');
}

// ---- index.html 統合 ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html が reading-data.js を読み込む', html.indexOf('<script src="js/reading-data.js') >= 0);
c.ok('questions-extra.js の後に読み込む', html.indexOf('js/questions-extra.js') < html.indexOf('js/reading-data.js'));
c.done();
