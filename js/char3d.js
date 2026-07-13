/* char3d.js：本格3Dキャラクター（Three.js）。クラシックスクリプト・グローバル定義。
   読み込み順：js/three.min.js の直後、メイン <script> より前。
   方針：
   - CHAR3D_SPECS は純データ（Node テスト可能・THREE/document に load 時は触らない）
   - char3dBuild(spec) は THREE のジオメトリ/マテリアルのみ使用（WebGL 不要＝Node でも組める）
   - 表示は char3dTag() のプレースホルダを innerHTML に差し、char3dHydrate()/MutationObserver が
     canvas をマウントする。WebGL 不可・THREE 未読込のときは SVG にフォールバック。
   - 着せ替え（hero）は装備絵文字をスプライト化して頭上/顔/手アンカーに重ねる（142種すべて em を持つ）。 */

// =============== 純データ：12キャラの3D仕様 ===============
// 色は js/chars.js の SVG パレットから採取。kind: human / owl / animal / dolphin / penguin
var CHAR3D_SPECS = {
  girl:    { kind:'human',  skin:'#ffe4c9', hair:'#a9764f', eye:'#8b5cf6', outfit:'#eef2f7', outfit2:'#3b4a6b', shoes:'#e23b4e', accent:'#e23b4e', blush:'#fca5a5', mouth:'#e2748a', hairStyle:'ribbons' },
  boy:     { kind:'human',  skin:'#ffe4c9', hair:'#5b4636', eye:'#2563eb', outfit:'#34d399', outfit2:'#1e3a5f', shoes:'#ffffff', blush:'#fca5a5', mouth:'#e2748a', hairStyle:'short' },
  owl:     { kind:'owl',    fur:'#9c7048', belly:'#ecd8b8', wing:'#6f4d31', eye:'#5b3b1c', beak:'#e8a33d', hat:'#26334d', tassel:'#f2c94c' },
  shiba:   { kind:'animal', fur:'#e8ad62', belly:'#fff4e6', ear:'cone', earIn:'#b87333', eye:'#3a2412', nose:'#3a2412', blush:'#ff99aa', muzzle:'#fff4e6', tail:'curl' },
  cat:     { kind:'animal', fur:'#f3ece2', ear:'cone', earIn:'#f3a8c0', eye:'#6cae6a', nose:'#e58a9a', blush:'#f6a8b8', muzzle:'#ffffff', patch:'#e8a23c', patch2:'#39352f', whisker:'#cdbfa9', tail:'curve' },
  rabbit:  { kind:'animal', fur:'#f6f1ec', ear:'long', earIn:'#f7c4d2', eye:'#7a5a8a', nose:'#e87a96', blush:'#ff9fb3', muzzle:'#ffffff' },
  fox:     { kind:'animal', fur:'#e88a48', belly:'#fbeede', ear:'cone', earIn:'#2a2622', eye:'#5a3a1a', nose:'#120a04', blush:'#ff9a7a', muzzle:'#fbeede', tail:'fluffy', tailTip:'#fbeede' },
  bear:    { kind:'animal', fur:'#9b785a', ear:'round', earIn:'#c8a784', eye:'#2c1d10', nose:'#2c1d10', blush:'#e8917a', muzzle:'#e3cdb0' },
  tiger:   { kind:'animal', fur:'#f2a64a', ear:'round', earIn:'#fbe8cf', eye:'#ffd24a', nose:'#1a0a00', blush:'#ff9a7a', muzzle:'#fbe8cf', stripes:'#2a1c10', band:'#c01818' },
  panda:   { kind:'animal', fur:'#f6f6f6', ear:'round', earIn:'#2b2b2b', earOut:'#2b2b2b', eye:'#161616', nose:'#1c1c1c', blush:'#ff9fb3', muzzle:'#fbfbfb', eyepatch:'#2b2b2b', limb:'#2b2b2b' },
  dolphin: { kind:'dolphin', fur:'#5fa9d6', belly:'#d4ecfa', fin:'#4f93c4', eye:'#16384a', blush:'#8fd3f0', mouth:'#34657f' },
  penguin: { kind:'penguin', fur:'#2b3440', belly:'#f6f6f2', beak:'#f2a93d', feet:'#f2a93d', eye:'#1a1f26', blush:'#ff9fb3', wing:'#222a34' }
};

function char3dSpecOf(key){ return CHAR3D_SPECS[key] || CHAR3D_SPECS.owl; }

// =============== 設定・対応判定 ===============
function char3dEnabled(){
  try { return (typeof safeLS!=='undefined' ? safeLS.getItem('char3d_on') : localStorage.getItem('char3d_on')) !== '0'; } catch(e){ return true; }
}
var _c3dSupportCache = null;
function char3dSupported(){
  if (_c3dSupportCache !== null) return _c3dSupportCache;
  try {
    var c = document.createElement('canvas');
    _c3dSupportCache = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch(e){ _c3dSupportCache = false; }
  return _c3dSupportCache;
}
function char3dActive(){ return typeof THREE !== 'undefined' && char3dEnabled() && (typeof document !== 'undefined') && char3dSupported(); }

// =============== プレースホルダ ===============
function char3dTag(key, opts){
  var cos = (opts && opts.cos) ? String(opts.cos) : '';
  return '<div class="c3d-slot" data-c3d="' + key + '"' + (cos ? ' data-c3d-cos="' + cos + '"' : '') + '></div>';
}

// =============== マテリアル・共通部品 ===============
var _c3dGradientMap = null;
function _c3dGrad(){
  if (_c3dGradientMap) return _c3dGradientMap;
  var data = new Uint8Array([120,120,120,255, 200,200,200,255, 255,255,255,255]);
  var t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.needsUpdate = true; t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter;
  _c3dGradientMap = t; return t;
}
function _c3dMat(hex, opt){
  var m = new THREE.MeshToonMaterial({ color: new THREE.Color(hex), gradientMap: _c3dGrad() });
  if (opt && opt.opacity != null){ m.transparent = true; m.opacity = opt.opacity; }
  return m;
}
function _c3dSphere(r, hex, opt){
  var seg = (opt && opt.seg) || 24;
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), _c3dMat(hex, opt));
}
function _c3dAdd(parent, mesh, x, y, z, sx, sy, sz, rx, ry, rz){
  mesh.position.set(x||0, y||0, z||0);
  if (sx != null) mesh.scale.set(sx, sy, sz);
  if (rx) mesh.rotation.x = rx; if (ry) mesh.rotation.y = ry; if (rz) mesh.rotation.z = rz;
  parent.add(mesh); return mesh;
}

// 目（白目＋虹彩＋瞳＋ハイライト）。blink 用に group を返す
function _c3dEye(spec, x, y, z){
  var g = new THREE.Group(); g.position.set(x, y, z);
  var iris = spec.eye || '#333333';
  _c3dAdd(g, _c3dSphere(.105, '#ffffff'), 0, 0, 0, 1, 1.25, .35);
  _c3dAdd(g, _c3dSphere(.07, iris), 0, -.005, .02, 1, 1.3, .4);
  _c3dAdd(g, _c3dSphere(.038, '#1a1a1a'), 0, -.01, .05, 1, 1.3, .5);
  var hi = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  _c3dAdd(g, hi, .028, .035, .07, 1, 1, .6);
  g.userData.isEye = true;
  return g;
}
// 動物用まる目（白目なし・大きな黒目＋ハイライト）
function _c3dAnimalEye(spec, x, y, z){
  var g = new THREE.Group(); g.position.set(x, y, z);
  _c3dAdd(g, _c3dSphere(.085, spec.eye || '#3a2412'), 0, 0, 0, 1, 1.15, .5);
  var hi = new THREE.Mesh(new THREE.SphereGeometry(.026, 10, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  _c3dAdd(g, hi, .026, .03, .05, 1, 1, .6);
  g.userData.isEye = true;
  return g;
}
function _c3dBlushPair(parent, spec, y, z, x){
  if (!spec.blush) return;
  [-1, 1].forEach(function(s){
    var b = _c3dSphere(.062, spec.blush, { opacity: .55 });
    _c3dAdd(parent, b, s * (x || .30), y, z, 1.3, .8, .3);
  });
}
function _c3dSmile(parent, hex, y, z){
  var m = new THREE.Mesh(new THREE.TorusGeometry(.055, .016, 8, 16, Math.PI), _c3dMat(hex || '#7a4a3a'));
  m.rotation.z = Math.PI; // 弧を下向き＝にっこり
  _c3dAdd(parent, m, 0, y, z, 1, .8, .5);
}

// =============== キャラ組み立て（THREE.Group を返す。WebGL 不要） ===============
function char3dBuild(spec){
  var g = new THREE.Group();
  var kind = spec.kind || 'animal';
  if (kind === 'human') _c3dBuildHuman(g, spec);
  else if (kind === 'owl') _c3dBuildOwl(g, spec);
  else if (kind === 'dolphin') _c3dBuildDolphin(g, spec);
  else if (kind === 'penguin') _c3dBuildPenguin(g, spec);
  else _c3dBuildAnimal(g, spec);
  return g;
}

function _c3dBuildHuman(g, spec){
  var skin = spec.skin, hair = spec.hair;
  // 脚・くつ
  var legC = (spec.hairStyle === 'ribbons') ? skin : spec.outfit2;
  [-1,1].forEach(function(s){
    _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.2,12), _c3dMat(legC)), s*.15, .12, 0);
    _c3dAdd(g, _c3dSphere(.105, spec.shoes || '#ffffff'), s*.16, .05, .05, 1, .7, 1.25);
  });
  // 体（服）
  var body = _c3dAdd(g, _c3dSphere(.40, spec.outfit), 0, .52, 0, 1, .95, .88);
  body.userData.isBody = true;
  if (spec.outfit2) _c3dAdd(g, _c3dSphere(.40, spec.outfit2), 0, .74, .06, .45, .3, .85); // えり
  // 腕・手（肌）
  [-1,1].forEach(function(s){
    _c3dAdd(g, _c3dSphere(.1, skin), s*.40, .55, .04, 1, 2.0, 1, 0, 0, s*-.5);
    _c3dAdd(g, _c3dSphere(.1, skin), s*.48, .36, .06);
  });
  // 頭
  var head = new THREE.Group(); head.position.set(0, 1.18, 0); g.add(head);
  head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.5, skin), 0, 0, 0, 1, .92, .95);
  // 髪：後頭部キャップ＋前髪ブロブ
  _c3dAdd(head, _c3dSphere(.53, hair), 0, .06, -.09, 1.0, .95, .98);
  [[-.27,.37,.28],[0,.43,.3],[.27,.37,.28]].forEach(function(p){
    _c3dAdd(head, _c3dSphere(.15, hair), p[0], p[1], p[2], 1.15, .55, .65);
  });
  if (spec.hairStyle === 'ribbons'){
    // サイドの髪＋赤リボン（ひなた）
    [-1,1].forEach(function(s){
      _c3dAdd(head, _c3dSphere(.14, hair), s*.45, -.18, .02, 1, 2.1, .9);
      _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.09,.2,4), _c3dMat(spec.accent)), s*.52, .18, .12, 1, 1, .6, 0, 0, s*1.9);
      _c3dAdd(head, _c3dSphere(.05, spec.accent), s*.47, .14, .16);
    });
  }
  // 顔
  var eyes = [ _c3dEye(spec, -.19, .04, .43), _c3dEye(spec, .19, .04, .43) ];
  eyes.forEach(function(e){ head.add(e); });
  _c3dBlushPair(head, spec, -.1, .40);
  _c3dSmile(head, spec.mouth, -.14, .45);
}

function _c3dBuildAnimal(g, spec){
  var fur = spec.fur, limb = spec.limb || fur;
  // 足
  [-1,1].forEach(function(s){
    _c3dAdd(g, _c3dSphere(.13, limb), s*.17, .1, .08, 1, .8, 1.2);
  });
  // 体
  var body = _c3dAdd(g, _c3dSphere(.40, fur), 0, .5, 0, 1, .95, .9);
  body.userData.isBody = true;
  if (spec.belly) _c3dAdd(g, _c3dSphere(.3, spec.belly), 0, .46, .18, .85, .85, .55);
  // 腕
  [-1,1].forEach(function(s){
    _c3dAdd(g, _c3dSphere(.1, limb), s*.38, .52, .06, 1, 1.6, 1, 0, 0, s*-.45);
  });
  // 頭
  var head = new THREE.Group(); head.position.set(0, 1.16, 0); g.add(head);
  head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.5, fur), 0, 0, 0, 1.02, .92, .95);
  // 模様（ネコ：頭のぶち／トラ：しま／パンダ：目のまわり）
  if (spec.patch)  _c3dAdd(head, _c3dSphere(.2, spec.patch), -.3, .3, .12, 1.2, .8, .9);
  if (spec.patch2) _c3dAdd(head, _c3dSphere(.16, spec.patch2), .33, .27, .1, 1.1, .75, .9);
  if (spec.stripes){
    _c3dAdd(head, _c3dSphere(.09, spec.stripes), 0, .4, .25, .5, 1.6, .35, -.5);
    [-1,1].forEach(function(s){ _c3dAdd(head, _c3dSphere(.09, spec.stripes), s*.3, .34, .2, 1.6, .5, .35, 0, 0, s*.5); });
  }
  if (spec.band){ // トラ教官のはちまき（目にかからない高さで）
    var band = new THREE.Mesh(new THREE.TorusGeometry(.44, .05, 8, 24), _c3dMat(spec.band));
    _c3dAdd(head, band, 0, .33, 0, 1, 1, .95, Math.PI/2);
  }
  // 耳
  var earKind = spec.ear || 'cone';
  [-1,1].forEach(function(s){
    if (earKind === 'cone'){
      _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.16,.32,4), _c3dMat(spec.earOut || fur)), s*.3, .5, 0, 1, 1, .6, 0, 0, s*-.4);
      _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.09,.18,4), _c3dMat(spec.earIn || '#f3a8c0')), s*.29, .47, .07, 1, 1, .5, 0, 0, s*-.4);
    } else if (earKind === 'long'){
      _c3dAdd(head, _c3dSphere(.13, spec.earOut || fur), s*.2, .72, -.02, 1, 3.0, .55, 0, 0, s*-.18);
      _c3dAdd(head, _c3dSphere(.07, spec.earIn || '#f7c4d2'), s*.2, .72, .07, 1, 2.4, .4, 0, 0, s*-.18);
    } else { // round
      _c3dAdd(head, _c3dSphere(.16, spec.earOut || fur), s*.34, .42, 0, 1, 1, .5);
      _c3dAdd(head, _c3dSphere(.09, spec.earIn || '#c8a784'), s*.34, .42, .07, 1, 1, .4);
    }
  });
  // パンダの目のまわり
  if (spec.eyepatch){
    [-1,1].forEach(function(s){ _c3dAdd(head, _c3dSphere(.13, spec.eyepatch), s*.19, .05, .38, 1.1, 1.45, .35, 0, 0, s*.35); });
  }
  // 目・マズル・鼻・口・ほっぺ
  var eyes = [ _c3dAnimalEye(spec, -.19, .06, .44), _c3dAnimalEye(spec, .19, .06, .44) ];
  eyes.forEach(function(e){ head.add(e); });
  if (spec.muzzle) _c3dAdd(head, _c3dSphere(.16, spec.muzzle), 0, -.14, .38, 1.25, .8, .6);
  if (spec.nose)   _c3dAdd(head, _c3dSphere(.05, spec.nose), 0, -.07, .5, 1.2, .8, .7);
  _c3dSmile(head, spec.nose || '#5a3a2a', -.2, .47);
  _c3dBlushPair(head, spec, -.08, .40, .33);
  // ひげ（ネコ）
  if (spec.whisker){
    [-1,1].forEach(function(s){
      for (var i=0;i<2;i++){
        var w = new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.3,4), _c3dMat(spec.whisker));
        _c3dAdd(head, w, s*.42, -.1 - i*.06, .3, 1, 1, 1, 0, 0, s*(1.45 - i*.12));
      }
    });
  }
  // しっぽ
  if (spec.tail === 'curl'){
    var t = new THREE.Mesh(new THREE.TorusGeometry(.12, .06, 8, 16, Math.PI*1.5), _c3dMat(fur));
    _c3dAdd(g, t, 0, .62, -.36, 1, 1, 1, .4);
  } else if (spec.tail === 'fluffy'){
    _c3dAdd(g, _c3dSphere(.14, fur), .3, .42, -.36, 1, 1.8, 1, .5, 0, -.5);
    _c3dAdd(g, _c3dSphere(.09, spec.tailTip || '#ffffff'), .42, .66, -.44);
  } else if (spec.tail === 'curve'){
    _c3dAdd(g, _c3dSphere(.07, spec.patch2 || fur), .26, .5, -.4, 1, 2.2, 1, .35, 0, -.5);
  }
}

function _c3dBuildOwl(g, spec){
  var fur = spec.fur;
  // 体＋おなか
  var body = _c3dAdd(g, _c3dSphere(.42, fur), 0, .48, 0, 1, 1.0, .9);
  body.userData.isBody = true;
  _c3dAdd(g, _c3dSphere(.3, spec.belly), 0, .42, .17, .8, .9, .55);
  // 羽
  [-1,1].forEach(function(s){
    _c3dAdd(g, _c3dSphere(.13, spec.wing), s*.4, .48, -.02, .8, 1.9, .7, 0, 0, s*-.35);
  });
  // 頭（大きめ・体と一体感）
  var head = new THREE.Group(); head.position.set(0, 1.12, 0); g.add(head);
  head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.52, fur), 0, 0, 0, 1.05, .9, .95);
  // 耳の羽（ツノ状のふさ）
  [-1,1].forEach(function(s){
    _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.11,.26,4), _c3dMat(spec.wing)), s*.34, .46, 0, 1, 1, .6, 0, 0, s*-.5);
  });
  // フクロウの目（白ふち大きめ）
  [-1,1].forEach(function(s){
    var eg = new THREE.Group(); eg.position.set(s*.21, .04, .42); head.add(eg);
    _c3dAdd(eg, _c3dSphere(.17, spec.belly), 0, 0, 0, 1, 1, .35);
    _c3dAdd(eg, _c3dSphere(.14, '#ffffff'), 0, 0, .03, 1, 1, .35);
    _c3dAdd(eg, _c3dSphere(.085, spec.eye), 0, 0, .06, 1, 1, .45);
    _c3dAdd(eg, _c3dSphere(.045, '#150d05'), 0, 0, .09, 1, 1, .5);
    var hi = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 10), new THREE.MeshBasicMaterial({ color:'#ffffff' }));
    _c3dAdd(eg, hi, .03, .04, .11);
    eg.userData.isEye = true;
  });
  // くちばし
  var beak = new THREE.Mesh(new THREE.ConeGeometry(.08,.18,4), _c3dMat(spec.beak));
  _c3dAdd(head, beak, 0, -.14, .48, 1, 1, .8, Math.PI/2 * .9);
  _c3dBlushPair(head, { blush:'#e8b48a' }, -.16, .36, .36);
  // 学園長の角帽＋ふさ
  var cap = new THREE.Group(); cap.position.set(0, .52, 0); head.add(cap);
  _c3dAdd(cap, new THREE.Mesh(new THREE.CylinderGeometry(.3,.32,.12,16), _c3dMat(spec.hat)), 0, 0, 0);
  _c3dAdd(cap, new THREE.Mesh(new THREE.BoxGeometry(.85,.05,.85), _c3dMat(spec.hat)), 0, .08, 0);
  var tas = new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.3,6), _c3dMat(spec.tassel));
  _c3dAdd(cap, tas, .4, -.05, .4, 1, 1, 1, 0, 0, .15);
  _c3dAdd(cap, _c3dSphere(.045, spec.tassel), .43, -.2, .42);
}

function _c3dBuildDolphin(g, spec){
  var fur = spec.fur;
  // しっぽ（尾びれ）
  [-1,1].forEach(function(s){
    _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.14,.3,4), _c3dMat(spec.fin)), s*.16, .08, 0, 1, 1, .45, 0, 0, s*1.9);
  });
  // 体（たてに長いしずく型）
  var body = _c3dAdd(g, _c3dSphere(.48, fur), 0, .82, 0, .88, 1.45, .82);
  body.userData.isBody = true;
  _c3dAdd(g, _c3dSphere(.34, spec.belly), 0, .68, .2, .7, 1.1, .5);
  // 背びれ・胸びれ
  _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.13,.32,4), _c3dMat(spec.fin)), 0, 1.32, -.3, 1, 1, .5, -.7);
  [-1,1].forEach(function(s){
    _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.11,.3,4), _c3dMat(spec.fin)), s*.44, .72, .08, 1, 1, .45, 0, 0, s*2.2);
  });
  // 顔（頭は体と一体）：口先
  var head = new THREE.Group(); head.position.set(0, 1.18, 0); g.add(head);
  head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.12, spec.belly), 0, -.18, .38, 1.3, .6, 1.1);
  var eyes = [ _c3dAnimalEye(spec, -.17, .05, .34), _c3dAnimalEye(spec, .17, .05, .34) ];
  eyes.forEach(function(e){ head.add(e); });
  _c3dSmile(head, spec.mouth, -.14, .4);
  _c3dBlushPair(head, spec, -.06, .3, .3);
}

function _c3dBuildPenguin(g, spec){
  var fur = spec.fur;
  // 足
  [-1,1].forEach(function(s){
    _c3dAdd(g, _c3dSphere(.11, spec.feet), s*.16, .06, .12, 1, .5, 1.5);
  });
  // 体（たまご型）＋白おなか（卵の曲面より前に出す＝埋まらない）
  var body = _c3dAdd(g, _c3dSphere(.48, fur), 0, .72, 0, .92, 1.3, .85);
  body.userData.isBody = true;
  _c3dAdd(g, _c3dSphere(.36, spec.belly), 0, .62, .28, .8, 1.05, .42);
  // フリッパー
  [-1,1].forEach(function(s){
    _c3dAdd(g, _c3dSphere(.11, spec.wing || fur), s*.44, .72, .02, .55, 1.8, .7, 0, 0, s*-.25);
  });
  // 顔（頭は体と一体。卵の上部曲面に沿わせる＝目が浮かない）
  var head = new THREE.Group(); head.position.set(0, 1.06, 0); g.add(head);
  head.userData.isHead = true;
  var eyes = [ _c3dEye(spec, -.15, .04, .3), _c3dEye(spec, .15, .04, .3) ];
  eyes.forEach(function(e){ head.add(e); });
  var beak = new THREE.Mesh(new THREE.ConeGeometry(.07,.17,4), _c3dMat(spec.beak));
  _c3dAdd(head, beak, 0, -.1, .37, 1, 1, .7, Math.PI/2 * .92);
  _c3dBlushPair(head, spec, -.16, .26, .28);
}

// =============== ビューア（マウント・アニメ・破棄） ===============
var _c3dViewers = [];
var _c3dRafOn = false;
var _c3dPointer = { x: 0, y: 0 };
var _c3dPointerBound = false;

function _c3dCollectParts(root){
  var parts = { head: null, body: null, eyes: [] };
  root.traverse(function(o){
    if (o.userData){
      if (o.userData.isHead) parts.head = o;
      if (o.userData.isBody) parts.body = o;
      if (o.userData.isEye) parts.eyes.push(o);
    }
  });
  return parts;
}

// 装備絵文字 → スプライト（hero のみ。rpgCosState 等はメイン script 定義＝実行時に参照）
function _c3dEmojiSprite(em, size){
  var c = document.createElement('canvas'); c.width = c.height = 128;
  var ctx = c.getContext('2d');
  ctx.font = '100px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(em, 64, 72);
  var tex = new THREE.CanvasTexture(c);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(size, size, 1);
  return sp;
}
function _c3dAttachCostume(char, cosKind){
  try {
    if (typeof rpgCosState !== 'function' || typeof rpgState !== 'function' || typeof rpgCosById !== 'function') return;
    var c = rpgCosState(rpgState());
    var eq = (c.equip && c.equip[cosKind]) || {};
    var anchors = { hat: [0, 1.78, .05, .52], face: [0, 1.06, .55, .4], hand: [.56, .5, .2, .42] };
    ['hat','face','hand'].forEach(function(sl){
      var id = eq[sl]; if (!id) return;
      var it = rpgCosById(cosKind, id); if (!it || !it.em) return;
      var a = anchors[sl];
      var sp = _c3dEmojiSprite(it.em, a[3]);
      sp.position.set(a[0], a[1], a[2]);
      char.add(sp);
    });
  } catch(e){}
}

function _c3dBindPointer(){
  if (_c3dPointerBound) return; _c3dPointerBound = true;
  window.addEventListener('pointermove', function(ev){
    _c3dPointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    _c3dPointer.y = (ev.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
}

function char3dMount(slot){
  if (!char3dActive()) return false;
  var key = slot.getAttribute('data-c3d');
  var spec = char3dSpecOf(key);
  try {
    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c4d8, 1.4));
    var dir = new THREE.DirectionalLight(0xffffff, 1.7); dir.position.set(1.5, 2.5, 2.5); scene.add(dir);
    var char = char3dBuild(spec);
    scene.add(char);
    var cosKind = slot.getAttribute('data-c3d-cos');
    if (cosKind) _c3dAttachCostume(char, cosKind);
    // キャラの実寸（耳・帽子込み）でカメラを自動フレーミング
    var box = new THREE.Box3().setFromObject(char);
    var hgt = Math.max(.5, box.max.y - box.min.y), cy = (box.max.y + box.min.y) / 2;
    var camera = new THREE.PerspectiveCamera(30, 120/150, .1, 20);
    camera.position.set(0, cy + hgt * .1, hgt * 2.35);
    camera.lookAt(0, cy - hgt * .02, 0);
    slot.innerHTML = '';
    slot.appendChild(renderer.domElement);
    renderer.domElement.className = 'c3d-canvas';
    var v = {
      slot: slot, renderer: renderer, scene: scene, camera: camera, char: char,
      parts: _c3dCollectParts(char),
      t0: performance.now(), blinkAt: performance.now() + 1800 + Math.random() * 2600,
      blinkUntil: 0, spinStart: -1, w: 0, h: 0
    };
    // タップでくるっと回ってジャンプ
    renderer.domElement.addEventListener('pointerdown', function(){
      if (v.spinStart < 0) { v.spinStart = performance.now(); try { if (typeof sfx === 'function') sfx('click'); } catch(e){} }
    });
    slot.setAttribute('data-c3d-live', '1');
    _c3dViewers.push(v);
    _c3dBindPointer();
    _c3dStartLoop();
    return true;
  } catch(e){
    // WebGL 失敗 → SVG フォールバック
    try {
      slot.innerHTML = (typeof _charSVG === 'function') ? _charSVG(key) : ((typeof CHARS !== 'undefined' && CHARS[key]) ? CHARS[key].svg : '');
      slot.setAttribute('data-c3d-live', 'svg');
    } catch(e2){}
    return false;
  }
}

function _c3dDispose(v){
  try { v.renderer.dispose(); } catch(e){}
  try { if (v.renderer.forceContextLoss) v.renderer.forceContextLoss(); } catch(e){}
  v.dead = true;
}

function _c3dTick(){
  if (!_c3dViewers.length){ _c3dRafOn = false; return; }
  _c3dRafOn = true;
  requestAnimationFrame(_c3dTick);
  if (document.hidden) return;
  var now = performance.now();
  for (var i = _c3dViewers.length - 1; i >= 0; i--){
    var v = _c3dViewers[i];
    if (!v.slot.isConnected){ _c3dDispose(v); _c3dViewers.splice(i, 1); continue; }
    // サイズ追従（表示されるまで 0 のことがある）
    var r = v.slot.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width)) , h = Math.max(1, Math.round(r.height));
    if (r.width < 2 || r.height < 2) continue; // 非表示中は描かない
    if (w !== v.w || h !== v.h){
      v.w = w; v.h = h;
      v.renderer.setSize(w, h, false);
      v.renderer.domElement.style.width = '100%';
      v.renderer.domElement.style.height = '100%';
      v.camera.aspect = w / h; v.camera.updateProjectionMatrix();
    }
    var t = (now - v.t0) / 1000;
    // アイドル：ふわふわ＋呼吸＋首かしげ
    v.char.position.y = Math.sin(t * 1.8) * .035;
    if (v.parts.body){ var b = 1 + Math.sin(t * 2.2) * .015; v.parts.body.scale.y = (v.parts.body.userData.sy0 || (v.parts.body.userData.sy0 = v.parts.body.scale.y)) * b; }
    if (v.parts.head){ v.parts.head.rotation.z = Math.sin(t * .7) * .05; }
    // ポインタに体を向ける（±13度）
    var targetY = _c3dPointer.x * .23, targetX = _c3dPointer.y * .1;
    // タップスピン
    if (v.spinStart > 0){
      var p = (now - v.spinStart) / 700;
      if (p >= 1){ v.spinStart = -1; }
      else {
        var e = 1 - Math.pow(1 - p, 3);
        targetY += e * Math.PI * 2;
        v.char.position.y += Math.sin(p * Math.PI) * .22;
      }
    }
    v.char.rotation.y += (targetY - v.char.rotation.y) * .12;
    v.char.rotation.x += (targetX - v.char.rotation.x) * .12;
    // まばたき
    if (now > v.blinkAt){ v.blinkUntil = now + 130; v.blinkAt = now + 1800 + Math.random() * 2800; }
    var blink = now < v.blinkUntil;
    v.parts.eyes.forEach(function(ey){ ey.scale.y += ((blink ? .12 : 1) - ey.scale.y) * .55; });
    v.renderer.render(v.scene, v.camera);
  }
}
function _c3dStartLoop(){ if (!_c3dRafOn){ _c3dRafOn = true; requestAnimationFrame(_c3dTick); } }

// =============== ハイドレート＋自動監視 ===============
function char3dHydrate(root){
  if (!char3dActive()) return;
  var scope = root && root.querySelectorAll ? root : document;
  var slots = scope.querySelectorAll('.c3d-slot:not([data-c3d-live])');
  for (var i = 0; i < slots.length; i++) char3dMount(slots[i]);
}
var _c3dObserver = null;
function char3dObserve(){
  if (_c3dObserver || typeof MutationObserver === 'undefined' || !document.body) return;
  _c3dObserver = new MutationObserver(function(){ char3dHydrate(document); });
  _c3dObserver.observe(document.body, { childList: true, subtree: true });
  char3dHydrate(document);
}
