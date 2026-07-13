'use strict';
// js/char3d.js（本格3Dキャラ）を検証。
// - load時副作用ゼロ（THREE/document 無しで単体loadできる）
// - 全キャラ（CHARS の全キー）に 3D 仕様があり、色が正しい hex
// - char3dBuild が WebGL 無しの Node でも全キャラを組み立てられる（ジオメトリのみ）
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-char3d');

const code = fs.readFileSync(path.join(ROOT, 'js', 'char3d.js'), 'utf8');

// 1) 単体load（THREE も document も無い）で例外を出さない＝load時副作用ゼロ
try { new Function(code)(); c.ok('char3d.js 単体loadで例外なし（THREE/document不要）', true); }
catch (e) { c.ok('char3d.js 単体loadで例外なし: ' + e.message, false); }

// 2) THREE を与えて API を取り出す
const threeSrc = fs.readFileSync(path.join(ROOT, 'js', 'three.min.js'), 'utf8');
const THREE = (new Function(threeSrc + '\nreturn THREE;'))();
c.ok('three.min.js が グローバル THREE を定義する', !!(THREE && THREE.REVISION));

const api = (new Function('THREE', code +
  '\nreturn { CHAR3D_SPECS, char3dSpecOf, char3dTag, char3dBuild, char3dEnabled,' +
  ' MON3D_SPECS, mon3dSpecOf, mon3dBuild, mon3dTag, C3D_GEAR, _c3dBuildGear, char3dEquip };'))(THREE);

// 3) CHARS の全キーに 3D 仕様がある
const charsCode = fs.readFileSync(path.join(ROOT, 'js', 'chars.js'), 'utf8');
const CHARS = (new Function(charsCode + '\nreturn CHARS;'))();
const keys = Object.keys(CHARS);
c.ok('CHARS は 12 キャラ以上', keys.length >= 12);
keys.forEach((k) => c.ok('CHAR3D_SPECS.' + k + ' が存在', !!api.CHAR3D_SPECS[k]));

// 4) 仕様の中身：kind があり、# で始まる値はすべて正しい hex 色
const HEX = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
let colorsOk = true, kindsOk = true;
for (const k of Object.keys(api.CHAR3D_SPECS)) {
  const s = api.CHAR3D_SPECS[k];
  if (!s.kind) kindsOk = false;
  for (const v of Object.values(s)) {
    if (typeof v === 'string' && v[0] === '#' && !HEX.test(v)) { colorsOk = false; c.ok(k + ' の色 ' + v + ' が不正', false); }
  }
}
c.ok('全キャラの spec に kind がある', kindsOk);
c.ok('全キャラの色は正しい hex', colorsOk);

// 5) フォールバック：未知キーは owl の仕様
c.ok('char3dSpecOf は未知キーで owl にフォールバック', api.char3dSpecOf('nazo') === api.CHAR3D_SPECS.owl);

// 6) プレースホルダの形式
c.ok('char3dTag が data-c3d を含む', api.char3dTag('girl').indexOf('data-c3d="girl"') >= 0);
c.ok('char3dTag が cos オプションを反映', api.char3dTag('boy', { cos: 'hero' }).indexOf('data-c3d-cos="hero"') >= 0);
c.ok('char3dTag は cos なしなら data-c3d-cos を出さない', api.char3dTag('boy').indexOf('data-c3d-cos') < 0);

// 7) 全キャラが Node（WebGL無し）で組み立てられ、常識的な寸法・アンカーを持つ
for (const k of keys) {
  const spec = api.char3dSpecOf(k);
  let g = null, err = '';
  try { g = api.char3dBuild(spec); } catch (e) { err = e.message; }
  if (!g) { c.ok(k + ' の char3dBuild: ' + err, false); continue; }
  let meshes = 0;
  g.traverse((o) => { if (o.isMesh) meshes++; });
  const box = new THREE.Box3().setFromObject(g);
  const h = box.max.y - box.min.y;
  const an = g.userData.anchors;
  c.ok(k + ' が組み立て可能（mesh ' + meshes + '・高さ ' + h.toFixed(2) + '）',
    meshes >= 10 && isFinite(h) && h > 1.0 && h < 2.6);
  c.ok(k + ' に装備アンカー（hat/face/hand）と頭グループがある',
    !!(an && an.hatL && an.faceL && an.hand && g.userData.headGroup));
}

// 7b) モンスター：RPG_SVG の全キーに 3D 仕様があり、組み立てられる
const rpgAssets = fs.readFileSync(path.join(ROOT, 'js', 'rpg-assets.js'), 'utf8');
const RPG_SVG = (new Function(rpgAssets + '\nreturn RPG_SVG;'))();
const monKeys = Object.keys(RPG_SVG);
c.ok('RPG_SVG は 20 種以上', monKeys.length >= 20);
let monOk = true;
for (const k of monKeys) {
  if (!api.MON3D_SPECS[k]) { monOk = false; c.ok('MON3D_SPECS.' + k + ' が存在', false); continue; }
  try {
    const g = api.mon3dBuild(api.mon3dSpecOf(k));
    let meshes = 0; g.traverse((o) => { if (o.isMesh) meshes++; });
    const box = new THREE.Box3().setFromObject(g);
    const h = box.max.y - box.min.y;
    if (!(meshes >= 2 && isFinite(h) && h > .5 && h < 3)) { monOk = false; c.ok(k + ' の mon3dBuild 寸法', false); }
  } catch (e) { monOk = false; c.ok(k + ' の mon3dBuild: ' + e.message, false); }
}
c.ok('モンスター全 ' + monKeys.length + ' 種が組み立て可能', monOk);
c.ok('mon3dSpecOf は未知キーで slime にフォールバック', api.mon3dSpecOf('nazo') === api.MON3D_SPECS.slime);
c.ok('mon3dTag が data-c3d-mon を含む', api.mon3dTag('slime').indexOf('data-c3d-mon="slime"') >= 0);

// 7c) 装備：全アーケタイプが組み立て可能・アンカー装着でメッシュが増える
const archs = [...new Set(Object.values(api.C3D_GEAR).map((a) => a.t))];
let gearOk = true;
for (const t of archs) {
  try {
    const g = api._c3dBuildGear({ t: t, c: '#888888' }, 'hat');
    let meshes = 0; g.traverse((o) => { if (o.isMesh) meshes++; });
    if (meshes < 1) { gearOk = false; c.ok('装備 ' + t + ' がメッシュを持つ', false); }
  } catch (e) { gearOk = false; c.ok('装備 ' + t + ': ' + e.message, false); }
}
c.ok('装備アーケタイプ全 ' + archs.length + ' 型が組み立て可能', gearOk);
{
  const g = api.char3dBuild(api.char3dSpecOf('girl'));
  const head = g.userData.headGroup;
  const beforeHead = head.children.length, beforeRoot = g.children.length;
  api.char3dEquip(g, { hat: { em: '👑' }, hand: { em: '⚔️' } });
  c.ok('char3dEquip で王冠が頭に付く', head.children.length > beforeHead);
  c.ok('char3dEquip で剣が本体に付く', g.children.length > beforeRoot);
}

// 8) Node（localStorage 無し）でも char3dEnabled が例外を出さず true を返す
try { c.ok('char3dEnabled は localStorage 無しで true', api.char3dEnabled() === true); }
catch (e) { c.ok('char3dEnabled が例外: ' + e.message, false); }

// 9) index.html の統合：読み込みタグと 3D 分岐が入っている
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は js/three.min.js を読み込む', html.indexOf('<script src="js/three.min.js') >= 0);
c.ok('index.html は js/char3d.js を読み込む', html.indexOf('<script src="js/char3d.js') >= 0);
c.ok('three.min.js は char3d.js より先', html.indexOf('js/three.min.js') < html.indexOf('js/char3d.js'));
c.ok('setCharacter は _charArt を使う', html.indexOf('wrap.innerHTML = _charArt(charKey)') >= 0);
c.ok('勇者アバターは _heroArt を使う', html.indexOf("+_heroArt()+") >= 0);
c.done();
