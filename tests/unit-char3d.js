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
  '\nreturn { CHAR3D_SPECS, char3dSpecOf, char3dTag, char3dBuild, char3dEnabled };'))(THREE);

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

// 7) 全キャラが Node（WebGL無し）で組み立てられ、常識的な寸法になる
for (const k of keys) {
  const spec = api.char3dSpecOf(k);
  let g = null, err = '';
  try { g = api.char3dBuild(spec); } catch (e) { err = e.message; }
  if (!g) { c.ok(k + ' の char3dBuild: ' + err, false); continue; }
  let meshes = 0;
  g.traverse((o) => { if (o.isMesh) meshes++; });
  const box = new THREE.Box3().setFromObject(g);
  const h = box.max.y - box.min.y;
  c.ok(k + ' が組み立て可能（mesh ' + meshes + '・高さ ' + h.toFixed(2) + '）',
    meshes >= 10 && isFinite(h) && h > 1.0 && h < 2.6);
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
