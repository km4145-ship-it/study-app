'use strict';
// js/gacha-story.js（行商人・週替わりピックアップ・セット完成ストーリー・lore）を検証。
// すべて純データ＋純関数＝単体ロードで決定的にテストできる。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-gacha-story');

const code = fs.readFileSync(path.join(ROOT, 'js', 'gacha-story.js'), 'utf8');
const api = (new Function(code +
  '\nreturn { gsWeekId, gsHash, gachaPickupSet, gsGreet, gsCheer, gsSetStory, GS_SET_STORIES, GS_LORE, GS_GREETS };'))();

// ---- 週ID（月曜はじまり・ゼロ埋め）----
c.eq('水曜→その週の月曜', api.gsWeekId(new Date(2026, 6, 15)), '2026-07-13');
c.eq('月曜→その日', api.gsWeekId(new Date(2026, 6, 13)), '2026-07-13');
c.eq('日曜→前の月曜', api.gsWeekId(new Date(2026, 6, 19)), '2026-07-13');
c.eq('月またぎもゼロ埋め', api.gsWeekId(new Date(2026, 9, 1)), '2026-09-28');

// ---- ピックアップ：決定的（同じ週は必ず同じセット）＋週で変わる ----
const SETS = [{ id: 's1', name: 'A', items: ['a'] }, { id: 's2', name: 'B', items: ['b'] }, { id: 's3', name: 'C', items: ['c'] }];
const p1 = api.gachaPickupSet(SETS, '2026-07-13');
c.ok('同じ週IDは同じセット', p1 === api.gachaPickupSet(SETS, '2026-07-13'));
c.ok('返り値は渡したセットの1つ', SETS.indexOf(p1) >= 0);
{
  const seen = new Set();
  for (let w = 0; w < 12; w++) seen.add(api.gachaPickupSet(SETS, '2026-w' + w).id);
  c.ok('週が変わればセットも変わる（12週で2種以上）', seen.size >= 2);
}
c.ok('空セットはnull', api.gachaPickupSet([], 'x') === null);

// ---- あいさつ・ひとこと ----
c.ok('あいさつは決定的', api.gsGreet(null, 'seed1') === api.gsGreet(null, 'seed1'));
c.ok('ピックアップ付きあいさつにセット名が出うる', (() => {
  for (let i = 0; i < 40; i++) { if (api.gsGreet({ name: 'にじいろ' }, 's' + i).indexOf('にじいろ') >= 0) return true; }
  return false;
})());
[0, 2, 4, 6, 7].forEach((rank) => c.ok('rank' + rank + ' のひとことが非空', api.gsCheer(rank, 'x').length > 0));
c.ok('LRはでんせつのセリフ', api.gsCheer(7, 'x').indexOf('でんせつ') >= 0);

// ---- セット完成ストーリー：実在の全セットに専用or汎用の物語が付く ----
const cosCode = fs.readFileSync(path.join(ROOT, 'js', 'cos-data.js'), 'utf8');
const cos = (new Function(cosCode + '\nreturn { COS_SETS, COS_DATA };'))();
cos.COS_SETS.forEach((set) => {
  const st = api.gsSetStory(set);
  c.ok('セット' + set.id + 'にストーリー（' + st.length + '行）', Array.isArray(st) && st.length >= 2 && st.every((l) => typeof l.text === 'string' && l.text.length > 0 && 'who' in l && 'char' in l));
});
c.ok('専用ストーリーは9セットぶん', Object.keys(api.GS_SET_STORIES).length === 9);
c.ok('未知セットは汎用ストーリー', api.gsSetStory({ id: 'set_unknown', name: 'なぞ' }).length === 2);

// ---- lore：参照アイテムidがすべて実在する（タイポで表示されないのを防ぐ）----
{
  const allIds = {};
  Object.keys(cos.COS_DATA).forEach((k) => Object.keys(cos.COS_DATA[k]).forEach((sl) => cos.COS_DATA[k][sl].forEach((it) => { allIds[it.id] = 1; })));
  Object.keys(api.GS_LORE).forEach((id) => c.ok('lore対象 ' + id + ' が実在', !!allIds[id]));
}

// ---- index.html 統合 ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は js/gacha-story.js を読み込む', html.indexOf('<script src="js/gacha-story.js') >= 0);
c.ok('_rpgPortrait が merchant に対応', html.indexOf("char==='merchant'") >= 0);
c.ok('_gachaPick がピックアップ2倍に対応', html.indexOf('gachaPickupSet(COS_SETS') >= 0);
c.ok('セット完成でストーリー再生（gsSetStory）', html.indexOf('gsSetStory') >= 0);
c.done();
