/* char3d.js v2：本格3Dキャラクター/モンスター/装備（Three.js）。クラシックスクリプト・グローバル定義。
   読み込み順：js/three.min.js の直後、メイン <script> より前。

   ■ 設計（v2＝共有レンダラ方式）
   - WebGL コンテキストは**アプリ全体で1個だけ**（画面外の共有レンダラ）。各表示枠は
     「ライブ」＝2D canvas に毎フレーム転写、「スチル」＝1回描いて dataURL 画像（キャッシュ）。
     → v1 の「枠ごとに WebGL」で起きるコンテキスト上限・喪失で真っ白、を根本回避。
   - webglcontextlost や生成失敗時は**全表示を SVG に自動フォールバック**。
   - 装備（帽子/かお/どうぐ）は**アンカー式で3Dフィット**：各キャラのビルダーが頭/顔/手の
     アンカー座標を登録し、装備は 3Dメッシュ（代表アイテム）または絵文字プレートを
     頭グループの子として装着（首かしげ・ジャンプに追従）。
   - CHAR3D_SPECS / MON3D_SPECS は純データ、char3dBuild/mon3dBuild は WebGL 不要（Node テスト可）。 */

// =============== 純データ：12キャラの3D仕様 ===============
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

// =============== 純データ：モンスター（RPG_SVG 全キー）の3D仕様 ===============
// plan: blob / imp / flyer / beast / tree / ghost / dragon / bird / cube / golem / robe / crystal
var MON3D_SPECS = {
  slime:     { plan:'blob',    main:'#2dd4bf', hi:'#7fffe6', eye:'#0f172a' },
  slime_king:{ plan:'blob',    main:'#2bb8aa', hi:'#7fffe6', eye:'#0f172a', crown:'#fcd34d', big:1.2 },   // 進化：キングスライム
  slime_lord:{ plan:'blob',    main:'#4c1d95', hi:'#c4b5fd', eye:'#e879f9', crown:'#fbbf24', big:1.32 },  // 進化：スライム魔神
  inkblob:   { plan:'blob',    main:'#312e4d', hi:'#c4b5fd', eye:'#0f172a', drip:true },
  microbe:   { plan:'blob',    main:'#84cc16', hi:'#d9f99d', eye:'#0f172a', spots:'#4d7c0f' },
  // 新規Batch1
  kinoko:    { plan:'blob',    main:'#ef4444', hi:'#fecaca', eye:'#0f172a' },
  kaeru:     { plan:'blob',    main:'#4ade80', hi:'#bbf7d0', eye:'#0f172a' },
  onibi:     { plan:'ghost',   main:'#fb923c', eye:'#7c2d12' },
  tori:      { plan:'bird',    main:'#fde047', belly:'#fef9c3', beak:'#f97316', eye:'#fff', pupil:'#0f172a' },
  iwagon:    { plan:'golem',   main:'#94a3b8', hole:'#334155' },
  kani:      { plan:'beast',   main:'#f87171', belly:'#fecaca', eye:'#0f172a' },
  // 新規Batch2
  hitsuji:   { plan:'blob',    main:'#f1f5f9', hi:'#ffffff', eye:'#0f172a' },
  kumo:      { plan:'blob',    main:'#6d28d9', hi:'#c4b5fd', eye:'#0f172a' },
  tako:      { plan:'blob',    main:'#fb7185', hi:'#fecdd3', eye:'#0f172a' },
  hitode:    { plan:'blob',    main:'#fbbf24', hi:'#fef3c7', eye:'#0f172a' },
  yuki:      { plan:'blob',    main:'#f8fafc', hi:'#ffffff', eye:'#0f172a' },
  ki:        { plan:'blob',    main:'#22c55e', hi:'#86efac', eye:'#0f172a' },
  hebi:      { plan:'beast',   main:'#22c55e', belly:'#bbf7d0', eye:'#0f172a' },
  tokage:    { plan:'beast',   main:'#4ade80', belly:'#dcfce7', eye:'#0f172a' },
  pengin:    { plan:'bird',    main:'#1e293b', belly:'#f8fafc', beak:'#f59e0b', eye:'#fff', pupil:'#0f172a' },
  ryunoko:   { plan:'dragon',  main:'#38bdf8', belly:'#bae6fd', horn:'#0ea5e9', wing:'#0369a1', eye:'#fff', pupil:'#0369a1' },
  // 新規Batch3
  usagi:     { plan:'beast',   main:'#f1f5f9', belly:'#ffffff', eye:'#0f172a' },
  buta:      { plan:'beast',   main:'#f9a8d4', belly:'#fbcfe8', eye:'#0f172a' },
  risu:      { plan:'beast',   main:'#c2724a', belly:'#f5e6d0', eye:'#0f172a' },
  mogura:    { plan:'blob',    main:'#78716c', hi:'#a8a29e', eye:'#0f172a' },
  kurage:    { plan:'blob',    main:'#a5b4fc', hi:'#e0e7ff', eye:'#0f172a' },
  kabuto:    { plan:'beast',   main:'#78350f', belly:'#92400e', eye:'#0f172a' },
  koala:     { plan:'beast',   main:'#94a3b8', belly:'#cbd5e1', eye:'#0f172a' },
  same:      { plan:'beast',   main:'#38bdf8', belly:'#bae6fd', eye:'#0f172a' },
  kitsune:   { plan:'beast',   main:'#fb923c', belly:'#fff7ed', eye:'#0f172a' },
  wani:      { plan:'dragon',  main:'#65a30d', belly:'#d9f99d', horn:'#84cc16', wing:'#3f6212', eye:'#fff', pupil:'#3f6212' },
  woodgo:    { plan:'golem',   main:'#92400e', hole:'#451a03' },
  hinotori:  { plan:'bird',    main:'#f87171', belly:'#fecaca', beak:'#fbbf24', eye:'#fff', pupil:'#0f172a' },
  // 新規Batch4
  tanuki:    { plan:'beast',   main:'#a8895f', belly:'#d6c3a0', eye:'#0f172a' },
  hamu:      { plan:'beast',   main:'#fde68a', belly:'#fef3c7', eye:'#0f172a' },
  kame:      { plan:'beast',   main:'#a16207', belly:'#84cc16', eye:'#0f172a' },
  ushi:      { plan:'beast',   main:'#fafaf9', belly:'#f5f5f4', eye:'#0f172a' },
  zou:       { plan:'beast',   main:'#a1a1aa', belly:'#d4d4d8', eye:'#0f172a' },
  kaba:      { plan:'beast',   main:'#c4b5fd', belly:'#e9d5ff', eye:'#0f172a' },
  kirin:     { plan:'beast',   main:'#fcd34d', belly:'#fde68a', eye:'#0f172a' },
  lion:      { plan:'beast',   main:'#fbbf24', belly:'#fde68a', eye:'#0f172a' },
  unicorn:   { plan:'beast',   main:'#f8fafc', belly:'#f1f5f9', eye:'#0f172a' },
  washi:     { plan:'bird',    main:'#92400e', belly:'#f5f5f4', beak:'#fbbf24', eye:'#fff', pupil:'#0f172a' },
  hyoudra:   { plan:'dragon',  main:'#7dd3fc', belly:'#e0f2fe', horn:'#0ea5e9', wing:'#0369a1', eye:'#fff', pupil:'#0c4a6e' },
  hagane:    { plan:'golem',   main:'#cbd5e1', hole:'#475569' },
  flaskun:   { plan:'blob',    main:'#10b981', hi:'#a7f3d0', eye:'#0f172a', bubbles:true },
  slugking:  { plan:'blob',    main:'#14b8a6', hi:'#5eead4', eye:'#0f172a', crown:'#fcd34d', big:1.18 },
  goblin:    { plan:'imp',     main:'#8b5cf6', belly:'#c4b5fd', eye:'#ede9fe', pupil:'#0f172a', horns:1 },
  kanjioni:  { plan:'imp',     main:'#fcd34d', belly:'#fef3c7', eye:'#fff', pupil:'#7c2d12', horns:2, club:'#92400e' },
  bat:       { plan:'flyer',   main:'#6366f1', wing:'#4338ca', eye:'#c7d2fe', pupil:'#0f172a', fangs:true },
  mapmoth:   { plan:'flyer',   main:'#d6b98c', wing:'#a16207', eye:'#0f172a', antennae:true },
  wolf:      { plan:'beast',   main:'#64748b', belly:'#cbd5e1', eye:'#fef08a', fierce:true },
  trent:     { plan:'tree',    trunk:'#78350f', leaf:'#22c55e', leaf2:'#15803d', eye:'#fff', pupil:'#0f172a' },
  ghost:     { plan:'ghost',   main:'#e0f2fe', eye:'#0369a1' },
  dragon:    { plan:'dragon',  main:'#16a34a', belly:'#bbf7d0', horn:'#fde047', wing:'#166534', eye:'#fde047', pupil:'#7f1d1d', big:1.14 },
  voltdrake: { plan:'dragon',  main:'#7c3aed', belly:'#c4b5fd', horn:'#fde047', wing:'#6d28d9', eye:'#fde047', pupil:'#0f172a', spark:'#fde047' },
  fudebird:  { plan:'bird',    main:'#7c2d12', belly:'#f5f5f4', beak:'#1c1917', eye:'#fff', pupil:'#0f172a', brushTail:'#1c1917' },
  qbird:     { plan:'bird',    main:'#38bdf8', belly:'#ffffff', beak:'#f59e0b', eye:'#fff', pupil:'#075985' },
  abcube:    { plan:'cube',    main:'#f59e0b', face:'#fbbf24', dark:'#7c2d12', eye:'#fff', pupil:'#0f172a' },
  grammaro:  { plan:'cube',    main:'#2563eb', face:'#dbeafe', dark:'#1e3a8a', eye:'#fff', pupil:'#0f172a', book:true },
  haniwa:    { plan:'golem',   main:'#c2724a', hole:'#3f1f12' },
  tokiou:    { plan:'robe',    main:'#1e3a8a', inner:'#eff6ff', trim:'#fcd34d', eye:'#fff', pupil:'#0f172a', crown:'#fcd34d' },
  villain:   { plan:'robe',    main:'#3b0764', inner:'#0b0219', trim:'#a78bfa', eye:'#f43f5e', pupil:'#0b0219', horns:'#a78bfa', demon:true, big:1.24 },
  // シグマ幹部5体＋裏ボス（demonローブをテーマ色で流用＝各教科の魔神）
  zeron:     { plan:'robe',    main:'#312e81', inner:'#141042', trim:'#fbbf24', eye:'#fbbf24', horns:'#a5b4fc', demon:true, big:1.12 },
  jp_lt:     { plan:'robe',    main:'#3b0764', inner:'#12082e', trim:'#a855f7', eye:'#a855f7', horns:'#c4b5fd', demon:true, big:1.12 },
  en_lt:     { plan:'robe',    main:'#065f46', inner:'#04231b', trim:'#34d399', eye:'#34d399', horns:'#6ee7b7', demon:true, big:1.12 },
  sci_lt:    { plan:'robe',    main:'#155e75', inner:'#05242c', trim:'#38bdf8', eye:'#38bdf8', horns:'#67e8f9', demon:true, big:1.12 },
  so_lt:     { plan:'robe',    main:'#44403c', inner:'#292524', trim:'#f59e0b', eye:'#f59e0b', horns:'#d6d3d1', demon:true, big:1.12 },
  kyomu:     { plan:'robe',    main:'#171335', inner:'#0a0720', trim:'#c084fc', eye:'#c084fc', horns:'#c4b5fd', demon:true, big:1.34 },
  // 神話（大魔王級3体）＝これまで3D無し(2D)だった最上位に 大型の3Dを付与（王冠・角・威圧）
  daimaou:   { plan:'robe',    main:'#1a1625', inner:'#4c1d95', trim:'#fbbf24', eye:'#fbbf24', horns:'#a78bfa', crown:'#fbbf24', demon:true, big:1.36 },
  enmaou:    { plan:'robe',    main:'#7f1d1d', inner:'#991b1b', trim:'#fb923c', eye:'#fb923c', horns:'#fca5a5', crown:'#fb923c', demon:true, big:1.3 },
  hyoumaou:  { plan:'robe',    main:'#1e3a8a', inner:'#1e40af', trim:'#a5f3fc', eye:'#a5f3fc', horns:'#bae6fd', crown:'#a5f3fc', demon:true, big:1.3 },
  crystal:   { plan:'crystal', main:'#38f0e0', hi:'#7cf9ec' }
};
// 亜種の3D：基本の体型（plan）を流用して主色だけ変える（rpg-assets.jsのRPG_VARIANTSと対応）
(function(){
  var V={
    slime2:{ main:'#f87171', hi:'#ffd0d0' },
    goblin2:{ main:'#22c55e', belly:'#bbf7d0' },
    bat2:{ main:'#f59e0b', hi:'#fde68a' },
    wolf2:{ main:'#e2e8f0', hi:'#f8fafc' },
    ghost2:{ main:'#86efac', hi:'#dcfce7' },
    dragon2:{ main:'#334155', hi:'#f87171' },
    trent2:{ leaf:'#f59e0b', trunk:'#92400e' },
    flaskun2:{ main:'#a78bfa', hi:'#ddd6fe' },
    haniwa2:{ main:'#94a3b8', hi:'#e2e8f0' },
    voltdrake2:{ main:'#38bdf8', hi:'#bae6fd' }
  };
  Object.keys(V).forEach(function(k){ var b=MON3D_SPECS[k.replace(/2$/,'')]; if(b) MON3D_SPECS[k]=Object.assign({}, b, V[k]); });
})();
// 魔王ヒエラルキーの3D：大陸(教科)ごとの demonローブ配色。big（サイズ）で強さを段階表現。神様=holyで光の姿。
var _C3D_MAOU_PAL = {
  math:     { main:'#7c2d12', inner:'#431407', trim:'#f59e0b', eye:'#fbbf24', horns:'#fcd34d' },
  japanese: { main:'#3b0764', inner:'#12082e', trim:'#a855f7', eye:'#c084fc', horns:'#c4b5fd' },
  english:  { main:'#064e3b', inner:'#022c22', trim:'#10b981', eye:'#34d399', horns:'#6ee7b7' },
  science:  { main:'#0c4a6e', inner:'#082f49', trim:'#38bdf8', eye:'#7dd3fc', horns:'#bae6fd' },
  social:   { main:'#451a03', inner:'#292524', trim:'#a16207', eye:'#f59e0b', horns:'#d6d3d1' }
};
function _c3dMaouSpec(mh){
  var p=_C3D_MAOU_PAL[mh.area]||_C3D_MAOU_PAL.math;
  var s={ plan:'robe', main:p.main, inner:p.inner, trim:p.trim, eye:p.eye, pupil:'#0b0219', horns:p.horns, demon:true, big:mh.big||1.2 };
  if(mh.crown) s.crown='#fbbf24';
  if(mh.holy){   // 神様＝光（魔の角を消し 白金・後光色へ）
    s.main='#ede9fe'; s.inner='#f8fafc'; s.trim='#fde047'; s.eye='#fde047'; s.pupil='#a16207'; s.horns='#fef3c7'; s.demon=false; s.crown='#fde047';
  }
  return s;
}
function mon3dSpecOf(key){
  if(MON3D_SPECS[key]) return MON3D_SPECS[key];
  // 魔王ヒエラルキー（srpg.jsの SRPG_MAOU_3D を 描画時に遅延参照＝ロード順に依存しない）
  var mh=(typeof SRPG_MAOU_3D!=='undefined' && SRPG_MAOU_3D) ? SRPG_MAOU_3D[key] : null;
  if(mh) return _c3dMaouSpec(mh);
  var em=/^(.*)_e([23])$/.exec(key);   // 進化フォーム：基本種の3D＋王冠・大型化・魔化（stage3）
  if(em && MON3D_SPECS[em[1]]){ var b=MON3D_SPECS[em[1]], s3=(em[2]==='3');
    return Object.assign({}, b, { crown: b.crown||(s3?'#fbbf24':'#fcd34d'), big:(b.big||1)*(s3?1.26:1.13), demon: s3?true:b.demon }); }
  return MON3D_SPECS.slime;
}

// =============== 純データ：装備アイテム（絵文字→3Dアーケタイプ）対応表 ===============
// t: メッシュで作る型 / c: 主色。表に無い絵文字は「フィット絵文字プレート」で装着する。
var C3D_GEAR = {
  '🧢': { t:'cap',      c:'#e11d48' },
  '👒': { t:'sunhat',   c:'#fde68a' },
  '🎩': { t:'tophat',   c:'#1f2937' },
  '🧙': { t:'wizard',   c:'#6d28d9' },
  '🤴': { t:'crown',    c:'#f2c94c' },
  '👑': { t:'crown',    c:'#f2c94c' },
  '😇': { t:'halo',     c:'#fde047' },
  '🎀': { t:'ribbon',   c:'#f472b6' },
  '🎓': { t:'grad',     c:'#26334d' },
  '🪖': { t:'helmet',   c:'#4d7c0f' },
  '⛑️': { t:'helmet',   c:'#dc2626' },
  '🤓': { t:'glasses',  c:'#1f2937' },
  '🧐': { t:'monocle',  c:'#b45309' },
  '😎': { t:'sunglass', c:'#111827' },
  '🕶️': { t:'sunglass', c:'#111827' },
  '😷': { t:'mask',     c:'#f8fafc' },
  '🤿': { t:'goggle',   c:'#0ea5e9' },
  '⚔️': { t:'sword',    c:'#cbd5e1' },
  '🗡️': { t:'sword',    c:'#cbd5e1' },
  '🛡️': { t:'shield',   c:'#b45309' },
  '🪄': { t:'wand',     c:'#f8fafc' },
  '🔮': { t:'orbstaff', c:'#a855f7' },
  '📖': { t:'book',     c:'#2563eb' },
  '🔨': { t:'hammer',   c:'#92400e' },
  '🪓': { t:'axe',      c:'#94a3b8' },
  '🏹': { t:'bow',      c:'#92400e' },
  '🔱': { t:'trident',  c:'#f2c94c' },
  // ---- 上位レアのメッシュ化（絵文字キー＝全スロット共通） ----
  '⚡': { t:'bolt',     c:'#fde047' },
  '☄️': { t:'comet',    c:'#f59e0b' },
  '⭐': { t:'star3d',   c:'#fde047' },
  '🌟': { t:'star3d',   c:'#fde047' },
  '🌠': { t:'star3d',   c:'#fde047' },
  '🌈': { t:'arc',      c:'#f472b6' },
  '🌌': { t:'wizard',   c:'#312e81' },
  '🐲': { t:'hornhelm', c:'#16a34a' },
  '🐉': { t:'hornhelm', c:'#16a34a' },
  // ---- スロット限定キー（'slot:絵文字'）：同じ絵文字でも部位で形を変える。lookupは char3dEquip 側 ----
  'back:😇': { t:'wings', c:'#fde68a' },
  'back:🦋': { t:'wings', c:'#38bdf8' },
  'back:🕊️': { t:'wings', c:'#f8fafc' },
  'back:🐉': { t:'wings', c:'#16a34a' },
  'back:🌈': { t:'wings', c:'#f472b6' },
  'back:⚡': { t:'cape',  c:'#eab308' },
  'back:🔥': { t:'cape',  c:'#ef4444' },
  'back:🌌': { t:'cape',  c:'#4c1d95' },
  'back:🧣': { t:'cape',  c:'#dc2626' },
  'hand:🐉': { t:'sword', c:'#16a34a' },
  'hand:🌌': { t:'sword', c:'#6d28d9' },
  'ride:🛹': { t:'board', c:'#f97316' },
  'ride:🧹': { t:'broom', c:'#a16207' },
  'ride:☁️': { t:'cloud', c:'#f8fafc' },
  'ride:🌊': { t:'cloud', c:'#38bdf8' },
  'ride:🚀': { t:'rocket', c:'#e11d48' },
  'ride:🛸': { t:'saucer', c:'#94a3b8' },
  'ride:🌠': { t:'star3d', c:'#fde047' }
};

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
var _c3dDead = false; // コンテキスト喪失などで3Dを停止した印
function char3dActive(){ return !_c3dDead && typeof THREE !== 'undefined' && char3dEnabled() && (typeof document !== 'undefined') && char3dSupported(); }

// =============== プレースホルダ ===============
function char3dTag(key, opts){
  var cos = (opts && opts.cos) ? String(opts.cos) : '';
  return '<div class="c3d-slot" data-c3d="' + key + '"' + (cos ? ' data-c3d-cos="' + cos + '"' : '') + '></div>';
}
function mon3dTag(key){
  return '<div class="c3d-slot" data-c3d-mon="' + key + '"></div>';
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
  m.rotation.z = Math.PI;
  _c3dAdd(parent, m, 0, y, z, 1, .8, .5);
}
// アンカー登録（head グループのローカル座標 hatL/faceL、ルート座標 hand）
function _c3dSetAnchors(g, head, hatL, faceL, hand){
  g.userData.headGroup = head;
  g.userData.anchors = { hatL: hatL, faceL: faceL, hand: hand };
}
// 右腕グループ（肩ピボット）。攻撃の腕振りアニメーションと、hand装備の追従に使う。
// x,y,zは肩（回転の支点）のルート座標。腕メッシュはこのGroupのローカル座標で入れる。
function _c3dArmGroup(g, x, y, z){
  var a = new THREE.Group(); a.position.set(x, y, z);
  a.userData.isArmR = true; g.add(a); g.userData.armR = a;
  return a;
}

// =============== キャラ組み立て ===============
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
  var legC = (spec.hairStyle === 'ribbons') ? skin : spec.outfit2;
  [-1,1].forEach(function(s){
    _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.2,12), _c3dMat(legC)), s*.15, .12, 0);
    _c3dAdd(g, _c3dSphere(.105, spec.shoes || '#ffffff'), s*.16, .05, .05, 1, .7, 1.25);
  });
  var body = _c3dAdd(g, _c3dSphere(.40, spec.outfit), 0, .52, 0, 1, .95, .88);
  body.userData.isBody = true;
  if (spec.outfit2) _c3dAdd(g, _c3dSphere(.40, spec.outfit2), 0, .74, .06, .45, .3, .85);
  _c3dAdd(g, _c3dSphere(.1, skin), -.40, .55, .04, 1, 2.0, 1, 0, 0, .5);
  _c3dAdd(g, _c3dSphere(.1, skin), -.48, .36, .06);
  // 右腕は肩ピボットのGroupにまとめる（攻撃の腕振り＋hand装備の追従。世界座標は従来と同じ）
  var armR = _c3dArmGroup(g, .34, .68, .04);
  _c3dAdd(armR, _c3dSphere(.1, skin), .06, -.13, 0, 1, 2.0, 1, 0, 0, -.5);
  _c3dAdd(armR, _c3dSphere(.1, skin), .14, -.32, .02);
  var head = new THREE.Group(); head.position.set(0, 1.18, 0); g.add(head);
  head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.5, skin), 0, 0, 0, 1, .92, .95);
  _c3dAdd(head, _c3dSphere(.53, hair), 0, .06, -.09, 1.0, .95, .98);
  [[-.27,.37,.28],[0,.43,.3],[.27,.37,.28]].forEach(function(p){
    _c3dAdd(head, _c3dSphere(.15, hair), p[0], p[1], p[2], 1.15, .55, .65);
  });
  if (spec.hairStyle === 'ribbons'){
    [-1,1].forEach(function(s){
      _c3dAdd(head, _c3dSphere(.14, hair), s*.45, -.18, .02, 1, 2.1, .9);
      _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.09,.2,4), _c3dMat(spec.accent)), s*.52, .18, .12, 1, 1, .6, 0, 0, s*1.9);
      _c3dAdd(head, _c3dSphere(.05, spec.accent), s*.47, .14, .16);
    });
  }
  [_c3dEye(spec, -.19, .04, .43), _c3dEye(spec, .19, .04, .43)].forEach(function(e){ head.add(e); });
  _c3dBlushPair(head, spec, -.1, .40);
  _c3dSmile(head, spec.mouth, -.14, .45);
  _c3dSetAnchors(g, head, [0,.58,.02], [0,-.02,.5], [.55,.38,.16]);
}

function _c3dBuildAnimal(g, spec){
  var fur = spec.fur, limb = spec.limb || fur;
  [-1,1].forEach(function(s){
    _c3dAdd(g, _c3dSphere(.13, limb), s*.17, .1, .08, 1, .8, 1.2);
  });
  var body = _c3dAdd(g, _c3dSphere(.40, fur), 0, .5, 0, 1, .95, .9);
  body.userData.isBody = true;
  if (spec.belly) _c3dAdd(g, _c3dSphere(.3, spec.belly), 0, .46, .18, .85, .85, .55);
  _c3dAdd(g, _c3dSphere(.1, limb), -.38, .52, .06, 1, 1.6, 1, 0, 0, .45);
  var armR = _c3dArmGroup(g, .30, .62, .06);
  _c3dAdd(armR, _c3dSphere(.1, limb), .08, -.10, 0, 1, 1.6, 1, 0, 0, -.45);
  var head = new THREE.Group(); head.position.set(0, 1.16, 0); g.add(head);
  head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.5, fur), 0, 0, 0, 1.02, .92, .95);
  if (spec.patch)  _c3dAdd(head, _c3dSphere(.2, spec.patch), -.3, .3, .12, 1.2, .8, .9);
  if (spec.patch2) _c3dAdd(head, _c3dSphere(.16, spec.patch2), .33, .27, .1, 1.1, .75, .9);
  if (spec.stripes){
    _c3dAdd(head, _c3dSphere(.09, spec.stripes), 0, .4, .25, .5, 1.6, .35, -.5);
    [-1,1].forEach(function(s){ _c3dAdd(head, _c3dSphere(.09, spec.stripes), s*.3, .34, .2, 1.6, .5, .35, 0, 0, s*.5); });
  }
  if (spec.band){
    var band = new THREE.Mesh(new THREE.TorusGeometry(.44, .05, 8, 24), _c3dMat(spec.band));
    _c3dAdd(head, band, 0, .33, 0, 1, 1, .95, Math.PI/2);
  }
  var earKind = spec.ear || 'cone';
  [-1,1].forEach(function(s){
    if (earKind === 'cone'){
      _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.16,.32,4), _c3dMat(spec.earOut || fur)), s*.3, .5, 0, 1, 1, .6, 0, 0, s*-.4);
      _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.09,.18,4), _c3dMat(spec.earIn || '#f3a8c0')), s*.29, .47, .07, 1, 1, .5, 0, 0, s*-.4);
    } else if (earKind === 'long'){
      _c3dAdd(head, _c3dSphere(.13, spec.earOut || fur), s*.2, .72, -.02, 1, 3.0, .55, 0, 0, s*-.18);
      _c3dAdd(head, _c3dSphere(.07, spec.earIn || '#f7c4d2'), s*.2, .72, .07, 1, 2.4, .4, 0, 0, s*-.18);
    } else {
      _c3dAdd(head, _c3dSphere(.16, spec.earOut || fur), s*.34, .42, 0, 1, 1, .5);
      _c3dAdd(head, _c3dSphere(.09, spec.earIn || '#c8a784'), s*.34, .42, .07, 1, 1, .4);
    }
  });
  if (spec.eyepatch){
    [-1,1].forEach(function(s){ _c3dAdd(head, _c3dSphere(.13, spec.eyepatch), s*.19, .05, .38, 1.1, 1.45, .35, 0, 0, s*.35); });
  }
  [_c3dAnimalEye(spec, -.19, .06, .44), _c3dAnimalEye(spec, .19, .06, .44)].forEach(function(e){ head.add(e); });
  if (spec.muzzle) _c3dAdd(head, _c3dSphere(.16, spec.muzzle), 0, -.14, .38, 1.25, .8, .6);
  if (spec.nose)   _c3dAdd(head, _c3dSphere(.05, spec.nose), 0, -.07, .5, 1.2, .8, .7);
  _c3dSmile(head, spec.nose || '#5a3a2a', -.2, .47);
  _c3dBlushPair(head, spec, -.08, .40, .33);
  if (spec.whisker){
    [-1,1].forEach(function(s){
      for (var i=0;i<2;i++){
        var w = new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.3,4), _c3dMat(spec.whisker));
        _c3dAdd(head, w, s*.42, -.1 - i*.06, .3, 1, 1, 1, 0, 0, s*(1.45 - i*.12));
      }
    });
  }
  if (spec.tail === 'curl'){
    var t = new THREE.Mesh(new THREE.TorusGeometry(.12, .06, 8, 16, Math.PI*1.5), _c3dMat(fur));
    _c3dAdd(g, t, 0, .62, -.36, 1, 1, 1, .4);
  } else if (spec.tail === 'fluffy'){
    _c3dAdd(g, _c3dSphere(.14, fur), .3, .42, -.36, 1, 1.8, 1, .5, 0, -.5);
    _c3dAdd(g, _c3dSphere(.09, spec.tailTip || '#ffffff'), .42, .66, -.44);
  } else if (spec.tail === 'curve'){
    _c3dAdd(g, _c3dSphere(.07, spec.patch2 || fur), .26, .5, -.4, 1, 2.2, 1, .35, 0, -.5);
  }
  _c3dSetAnchors(g, head, [0,.52,.02], [0,-.05,.5], [.52,.5,.18]);
}

function _c3dBuildOwl(g, spec){
  var fur = spec.fur;
  var body = _c3dAdd(g, _c3dSphere(.42, fur), 0, .48, 0, 1, 1.0, .9);
  body.userData.isBody = true;
  _c3dAdd(g, _c3dSphere(.3, spec.belly), 0, .42, .17, .8, .9, .55);
  _c3dAdd(g, _c3dSphere(.13, spec.wing), -.4, .48, -.02, .8, 1.9, .7, 0, 0, .35);
  var armR = _c3dArmGroup(g, .36, .64, -.02);
  _c3dAdd(armR, _c3dSphere(.13, spec.wing), .04, -.16, 0, .8, 1.9, .7, 0, 0, -.35);
  var head = new THREE.Group(); head.position.set(0, 1.12, 0); g.add(head);
  head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.52, fur), 0, 0, 0, 1.05, .9, .95);
  [-1,1].forEach(function(s){
    _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.11,.26,4), _c3dMat(spec.wing)), s*.34, .46, 0, 1, 1, .6, 0, 0, s*-.5);
  });
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
  var beak = new THREE.Mesh(new THREE.ConeGeometry(.08,.18,4), _c3dMat(spec.beak));
  _c3dAdd(head, beak, 0, -.14, .48, 1, 1, .8, Math.PI/2 * .9);
  _c3dBlushPair(head, { blush:'#e8b48a' }, -.16, .36, .36);
  var cap = new THREE.Group(); cap.position.set(0, .52, 0); head.add(cap);
  _c3dAdd(cap, new THREE.Mesh(new THREE.CylinderGeometry(.3,.32,.12,16), _c3dMat(spec.hat)), 0, 0, 0);
  _c3dAdd(cap, new THREE.Mesh(new THREE.BoxGeometry(.85,.05,.85), _c3dMat(spec.hat)), 0, .08, 0);
  var tas = new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.3,6), _c3dMat(spec.tassel));
  _c3dAdd(cap, tas, .4, -.05, .4, 1, 1, 1, 0, 0, .15);
  _c3dAdd(cap, _c3dSphere(.045, spec.tassel), .43, -.2, .42);
  _c3dSetAnchors(g, head, [0,.8,0], [0,-.1,.5], [.52,.46,.12]);
}

function _c3dBuildDolphin(g, spec){
  [-1,1].forEach(function(s){
    _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.14,.3,4), _c3dMat(spec.fin)), s*.16, .08, 0, 1, 1, .45, 0, 0, s*1.9);
  });
  var body = _c3dAdd(g, _c3dSphere(.48, spec.fur), 0, .82, 0, .88, 1.45, .82);
  body.userData.isBody = true;
  _c3dAdd(g, _c3dSphere(.34, spec.belly), 0, .68, .2, .7, 1.1, .5);
  _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.13,.32,4), _c3dMat(spec.fin)), 0, 1.32, -.3, 1, 1, .5, -.7);
  _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.11,.3,4), _c3dMat(spec.fin)), -.44, .72, .08, 1, 1, .45, 0, 0, -2.2);
  var armR = _c3dArmGroup(g, .38, .80, .08);
  _c3dAdd(armR, new THREE.Mesh(new THREE.ConeGeometry(.11,.3,4), _c3dMat(spec.fin)), .06, -.08, 0, 1, 1, .45, 0, 0, 2.2);
  var head = new THREE.Group(); head.position.set(0, 1.18, 0); g.add(head);
  head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.12, spec.belly), 0, -.18, .38, 1.3, .6, 1.1);
  [_c3dAnimalEye(spec, -.17, .05, .34), _c3dAnimalEye(spec, .17, .05, .34)].forEach(function(e){ head.add(e); });
  _c3dSmile(head, spec.mouth, -.14, .4);
  _c3dBlushPair(head, spec, -.06, .3, .3);
  _c3dSetAnchors(g, head, [0,.42,0], [0,-.03,.42], [.56,.74,.16]);
}

function _c3dBuildPenguin(g, spec){
  var fur = spec.fur;
  [-1,1].forEach(function(s){
    _c3dAdd(g, _c3dSphere(.11, spec.feet), s*.16, .06, .12, 1, .5, 1.5);
  });
  var body = _c3dAdd(g, _c3dSphere(.48, fur), 0, .72, 0, .92, 1.3, .85);
  body.userData.isBody = true;
  _c3dAdd(g, _c3dSphere(.36, spec.belly), 0, .62, .28, .8, 1.05, .42);
  _c3dAdd(g, _c3dSphere(.11, spec.wing || fur), -.44, .72, .02, .55, 1.8, .7, 0, 0, .25);
  var armR = _c3dArmGroup(g, .40, .84, .02);
  _c3dAdd(armR, _c3dSphere(.11, spec.wing || fur), .04, -.12, 0, .55, 1.8, .7, 0, 0, -.25);
  var head = new THREE.Group(); head.position.set(0, 1.06, 0); g.add(head);
  head.userData.isHead = true;
  [_c3dEye(spec, -.15, .04, .3), _c3dEye(spec, .15, .04, .3)].forEach(function(e){ head.add(e); });
  var beak = new THREE.Mesh(new THREE.ConeGeometry(.07,.17,4), _c3dMat(spec.beak));
  _c3dAdd(head, beak, 0, -.1, .37, 1, 1, .7, Math.PI/2 * .92);
  _c3dBlushPair(head, spec, -.16, .26, .28);
  _c3dSetAnchors(g, head, [0,.36,0], [0,-.02,.38], [.52,.72,.14]);
}

// =============== モンスター組み立て（汎用プラン） ===============
function mon3dBuild(spec){
  var g = new THREE.Group();
  var fn = {
    blob:_c3dMonBlob, imp:_c3dMonImp, flyer:_c3dMonFlyer, beast:_c3dMonBeast, tree:_c3dMonTree,
    ghost:_c3dMonGhost, dragon:_c3dMonDragon, bird:_c3dMonBird, cube:_c3dMonCube,
    golem:_c3dMonGolem, robe:_c3dMonRobe, crystal:_c3dMonCrystal
  }[spec.plan] || _c3dMonBlob;
  fn(g, spec);
  if (spec.big) g.scale.setScalar(spec.big);
  return g;
}
function _c3dMonFace(head, spec, y, z, fierce){
  [-1,1].forEach(function(s){
    var eg = new THREE.Group(); eg.position.set(s*.2, y, z); head.add(eg);
    _c3dAdd(eg, _c3dSphere(.1, spec.eye || '#ffffff'), 0, 0, 0, 1, fierce ? .8 : 1.1, .4);
    _c3dAdd(eg, _c3dSphere(.05, spec.pupil || '#0f172a'), 0, -.01, .04, 1, fierce ? .9 : 1.2, .5);
    if (fierce) _c3dAdd(eg, _c3dSphere(.09, spec.main || '#333'), 0, .09, .03, 1.2, .5, .5, 0, 0, s*-.5);
    eg.userData.isEye = true;
  });
}
function _c3dMonBlob(g, spec){
  var body = _c3dAdd(g, _c3dSphere(.55, spec.main), 0, .55, 0, 1.05, .92, .95);
  body.userData.isBody = true;
  _c3dAdd(g, _c3dSphere(.2, spec.hi || '#ffffff', { opacity:.6 }), -.22, .82, .3, 1, .7, .5);
  _c3dAdd(g, _c3dSphere(.4, spec.main), 0, .18, 0, 1.25, .45, 1.1);
  var head = new THREE.Group(); head.position.set(0, .62, 0); g.add(head); head.userData.isHead = true;
  _c3dMonFace(head, spec, .06, .48);
  _c3dSmile(head, spec.eye || '#0f172a', -.14, .5);
  if (spec.spots){ [[-.3,.35,.35],[.32,.5,.28],[.05,.2,.5]].forEach(function(p){ _c3dAdd(head, _c3dSphere(.07, spec.spots), p[0], p[1]-.62+.55, p[2], 1, 1, .4); }); }
  if (spec.bubbles){ [[-.4,1.15,.1],[.42,1.25,.05],[.15,1.4,0]].forEach(function(p,i){ _c3dAdd(g, _c3dSphere(.05+i*.015, spec.hi || '#fff', { opacity:.5 }), p[0], p[1], p[2]); }); }
  if (spec.drip){ [[-.35,.1],[.3,.06]].forEach(function(p){ _c3dAdd(g, _c3dSphere(.09, spec.main), p[0], p[1], .3, 1, 1.4, 1); }); }
  if (spec.crown) _c3dGearCrown(head, spec.crown, .52);
  _c3dSetAnchors(g, head, [0,.5,0], [0,-.02,.5], [.6,.5,.2]);
}
function _c3dMonImp(g, spec){
  [-1,1].forEach(function(s){ _c3dAdd(g, _c3dSphere(.12, spec.main), s*.18, .1, .06, 1, .8, 1.2); });
  var body = _c3dAdd(g, _c3dSphere(.38, spec.main), 0, .48, 0, 1, .95, .9);
  body.userData.isBody = true;
  if (spec.belly) _c3dAdd(g, _c3dSphere(.27, spec.belly), 0, .44, .17, .85, .85, .55);
  [-1,1].forEach(function(s){ _c3dAdd(g, _c3dSphere(.09, spec.main), s*.36, .5, .06, 1, 1.6, 1, 0, 0, s*-.45); });
  var head = new THREE.Group(); head.position.set(0, 1.1, 0); g.add(head); head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.46, spec.main), 0, 0, 0, 1.05, .9, .95);
  var hornN = spec.horns || 1;
  var hornPos = hornN === 1 ? [[0,.42]] : [[-.24,.36],[.24,.36]];
  hornPos.forEach(function(p){
    _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.09,.28,8), _c3dMat('#fef3c7')), p[0], p[1], .05, 1, 1, 1, -.15, 0, p[0]*-.8);
  });
  [-1,1].forEach(function(s){
    _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.13,.3,4), _c3dMat(spec.main)), s*.42, .18, 0, 1, 1, .5, 0, 0, s*-1.2);
  });
  _c3dMonFace(head, spec, .05, .42, true);
  _c3dAdd(head, _c3dSphere(.05, spec.pupil || '#0f172a'), 0, -.12, .46, 1.6, .5, .4); // ニヤリ口
  [-1,1].forEach(function(s){ _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.035,.09,4), _c3dMat('#ffffff')), s*.1, -.16, .44, 1, 1, .6, Math.PI); });
  if (spec.club){
    var club = new THREE.Group(); club.position.set(.5, .5, .18); club.rotation.z = -.5; g.add(club);
    _c3dAdd(club, new THREE.Mesh(new THREE.CylinderGeometry(.05,.09,.55,8), _c3dMat(spec.club)), 0, .2, 0);
    [[0,.42,.08],[-.07,.34,0],[.07,.34,0]].forEach(function(p){ _c3dAdd(club, new THREE.Mesh(new THREE.ConeGeometry(.03,.08,4), _c3dMat('#fef3c7')), p[0], p[1], p[2], 1, 1, 1, 0, 0, p[0]*2); });
  }
  _c3dSetAnchors(g, head, [0,.5,0], [0,-.04,.46], [-.5,.5,.18]);
}
function _c3dMonFlyer(g, spec){
  var body = _c3dAdd(g, _c3dSphere(.4, spec.main), 0, .85, 0, 1, .95, .9);
  body.userData.isBody = true;
  [-1,1].forEach(function(s){
    var wing = new THREE.Group(); wing.position.set(s*.36, .9, -.05); wing.rotation.z = s*.35; g.add(wing);
    wing.userData.isWing = true; wing.userData.side = s;
    if (spec.antennae){
      _c3dAdd(wing, _c3dSphere(.3, spec.wing), s*.28, 0, 0, 1.5, .9, .25);
      _c3dAdd(wing, _c3dSphere(.2, spec.wing), s*.2, -.3, 0, 1.3, .7, .25);
    } else {
      _c3dAdd(wing, new THREE.Mesh(new THREE.ConeGeometry(.3,.7,4), _c3dMat(spec.wing)), s*.32, .05, 0, 1, 1, .3, 0, 0, s*1.9);
    }
  });
  var head = new THREE.Group(); head.position.set(0, .95, 0); g.add(head); head.userData.isHead = true;
  [-1,1].forEach(function(s){
    _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.1,.22,4), _c3dMat(spec.main)), s*.24, .34, 0, 1, 1, .55, 0, 0, s*-.5);
  });
  if (spec.antennae){
    [-1,1].forEach(function(s){
      _c3dAdd(head, new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.3,4), _c3dMat(spec.wing)), s*.12, .42, .05, 1, 1, 1, 0, 0, s*.5);
      _c3dAdd(head, _c3dSphere(.04, spec.wing), s*.2, .56, .05);
    });
  }
  _c3dMonFace(head, spec, .05, .36);
  if (spec.fangs){ [-1,1].forEach(function(s){ _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.04,.1,4), _c3dMat('#ffffff')), s*.1, -.12, .38, 1, 1, .6, Math.PI); }); }
  _c3dSetAnchors(g, head, [0,.42,0], [0,-.02,.4], [.5,.85,.15]);
}
function _c3dMonBeast(g, spec){
  _c3dBuildAnimal(g, { fur:spec.main, belly:spec.belly, ear:'cone', earIn:spec.belly, eye:spec.eye, nose:'#1c1917', muzzle:spec.belly, tail:'fluffy', tailTip:spec.belly });
  if (spec.fierce){
    var head = g.userData.headGroup;
    [-1,1].forEach(function(s){
      _c3dAdd(head, _c3dSphere(.1, spec.main), s*.19, .17, .42, 1.3, .4, .4, 0, 0, s*-.45); // つり眉
      _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.035,.09,4), _c3dMat('#ffffff')), s*.09, -.24, .44, 1, 1, .6, Math.PI); // 牙
    });
  }
}
function _c3dMonTree(g, spec){
  var trunk = _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.22,.3,.8,10), _c3dMat(spec.trunk)), 0, .4, 0);
  trunk.userData.isBody = true;
  [-1,1].forEach(function(s){
    _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,.5,8), _c3dMat(spec.trunk)), s*.4, .55, 0, 1, 1, 1, 0, 0, s*-.9);
  });
  var head = new THREE.Group(); head.position.set(0, 1.1, 0); g.add(head); head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.42, spec.leaf), 0, .1, 0, 1.15, .9, 1);
  _c3dAdd(head, _c3dSphere(.3, spec.leaf2), -.35, .25, .05);
  _c3dAdd(head, _c3dSphere(.3, spec.leaf2), .35, .28, -.02);
  _c3dAdd(head, _c3dSphere(.24, spec.leaf), 0, .45, 0);
  _c3dMonFace(head, spec, -.28, .38);
  _c3dSmile(head, '#3f1f12', -.48, .34);
  _c3dSetAnchors(g, head, [0,.62,0], [0,-.3,.42], [.5,.6,.15]);
}
function _c3dMonGhost(g, spec){
  var body = _c3dAdd(g, _c3dSphere(.45, spec.main), 0, .95, 0, 1, 1.1, .95);
  body.userData.isBody = true;
  for (var i = 0; i < 4; i++){
    _c3dAdd(g, _c3dSphere(.14, spec.main), -.33 + i*.22, .48, .05, 1, 1.2, .9);
  }
  [-1,1].forEach(function(s){
    _c3dAdd(g, _c3dSphere(.11, spec.main), s*.5, .95, .02, 1, 1.7, .7, 0, 0, s*-.9);
  });
  var head = new THREE.Group(); head.position.set(0, 1.05, 0); g.add(head); head.userData.isHead = true;
  [-1,1].forEach(function(s){
    _c3dAdd(head, _c3dSphere(.075, spec.eye), s*.17, .05, .38, 1, 1.4, .5);
  });
  _c3dAdd(head, _c3dSphere(.06, spec.eye), 0, -.14, .4, 1.3, .9, .4); // まる口
  g.userData.float = true; // ふわふわ強め・足なし
  _c3dSetAnchors(g, head, [0,.42,0], [0,0,.42], [.55,.95,.12]);
}
function _c3dMonDragon(g, spec){
  [-1,1].forEach(function(s){ _c3dAdd(g, _c3dSphere(.14, spec.main), s*.2, .1, .06, 1, .8, 1.3); });
  var body = _c3dAdd(g, _c3dSphere(.42, spec.main), 0, .55, 0, 1, 1.05, .9);
  body.userData.isBody = true;
  _c3dAdd(g, _c3dSphere(.3, spec.belly), 0, .48, .2, .8, .95, .5);
  [-1,1].forEach(function(s){
    var wing = new THREE.Group(); wing.position.set(s*.34, .78, -.18); wing.rotation.z = s*.5; g.add(wing);
    wing.userData.isWing = true; wing.userData.side = s;
    _c3dAdd(wing, new THREE.Mesh(new THREE.ConeGeometry(.32,.72,4), _c3dMat(spec.wing)), s*.3, .1, 0, 1, 1, .25, 0, 0, s*1.9);
  });
  var tail = new THREE.Mesh(new THREE.ConeGeometry(.13,.6,8), _c3dMat(spec.main));
  _c3dAdd(g, tail, .3, .3, -.35, 1, 1, 1, 1.2, 0, -.9);
  var head = new THREE.Group(); head.position.set(0, 1.25, .05); g.add(head); head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.4, spec.main), 0, 0, 0, 1.05, .9, .95);
  _c3dAdd(head, _c3dSphere(.16, spec.belly), 0, -.12, .3, 1.2, .7, .7); // マズル
  _c3dAdd(head, _c3dSphere(.05, spec.main), 0, -.04, .52, 1.4, .6, .5);
  [-1,1].forEach(function(s){
    _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.07,.24,8), _c3dMat(spec.horn)), s*.2, .38, -.05, 1, 1, 1, -.2, 0, s*-.5);
    _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.05,.14,4), _c3dMat(spec.horn)), s*.02, .1, -.42, 1, 1, 1, .9, 0, 0); // 背びれ的トゲ
  });
  _c3dMonFace(head, spec, .08, .36, true);
  if (spec.spark){
    [[-.5,1.05,.2],[.55,1.2,.1]].forEach(function(p){
      _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.05,.16,4), new THREE.MeshBasicMaterial({ color: spec.spark })), p[0], p[1], p[2], 1, 1, .5, 0, 0, .6);
    });
  }
  _c3dSetAnchors(g, head, [0,.46,0], [0,-.02,.4], [.55,.6,.2]);
}
function _c3dMonBird(g, spec){
  [-1,1].forEach(function(s){ _c3dAdd(g, _c3dSphere(.07, spec.beak), s*.13, .06, .08, 1, .5, 1.4); });
  var body = _c3dAdd(g, _c3dSphere(.4, spec.main), 0, .6, 0, .95, 1.05, .9);
  body.userData.isBody = true;
  _c3dAdd(g, _c3dSphere(.28, spec.belly), 0, .52, .18, .8, .9, .5);
  [-1,1].forEach(function(s){
    var wing = new THREE.Group(); wing.position.set(s*.36, .68, 0); g.add(wing);
    wing.userData.isWing = true; wing.userData.side = s;
    _c3dAdd(wing, _c3dSphere(.12, spec.main), s*.08, -.05, 0, .6, 1.7, .8, 0, 0, s*-.4);
  });
  if (spec.brushTail){
    _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.05,.08,.4,8), _c3dMat(spec.brushTail)), 0, .45, -.4, 1, 1, 1, 1.1);
    _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.07,.2,8), _c3dMat('#0f172a')), 0, .32, -.58, 1, 1, 1, 1.4);
  } else {
    _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.12,.35,4), _c3dMat(spec.main)), 0, .5, -.42, 1, 1, .4, 1.3);
  }
  var head = new THREE.Group(); head.position.set(0, 1.05, .02); g.add(head); head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.34, spec.main), 0, 0, 0, 1.05, .95, .95);
  var beak = new THREE.Mesh(new THREE.ConeGeometry(.07,.2,4), _c3dMat(spec.beak));
  _c3dAdd(head, beak, 0, -.04, .38, 1, 1, .7, Math.PI/2 * .92);
  _c3dMonFace(head, spec, .07, .3);
  _c3dSetAnchors(g, head, [0,.38,0], [0,0,.34], [.48,.65,.14]);
}
function _c3dMonCube(g, spec){
  var body = _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.85,.85,.7), _c3dMat(spec.main)), 0, .75, 0);
  body.userData.isBody = true;
  _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.06), _c3dMat(spec.face)), 0, .75, .34);
  [-1,1].forEach(function(s){
    _c3dAdd(g, _c3dSphere(.1, spec.dark), s*.5, .6, .05, 1, 1.4, 1, 0, 0, s*-.4);
    _c3dAdd(g, _c3dSphere(.11, spec.dark), s*.22, .18, .1, 1, .7, 1.3);
  });
  if (spec.book){
    _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.5,.36,.08), _c3dMat('#ffffff')), .55, .62, .22, 1, 1, 1, 0, .4, -.3);
  }
  var head = new THREE.Group(); head.position.set(0, .9, .3); g.add(head); head.userData.isHead = true;
  _c3dMonFace(head, spec, 0, .08);
  _c3dSmile(head, spec.dark, -.22, .1);
  _c3dSetAnchors(g, head, [0,.32,-.28], [0,-.05,.12], [-.58,.6,.2]);
}
function _c3dMonGolem(g, spec){
  var body = _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.34,.42,1.0,14), _c3dMat(spec.main)), 0, .62, 0);
  body.userData.isBody = true;
  [-1,1].forEach(function(s){
    _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.5,8), _c3dMat(spec.main)), s*.46, .62, 0, 1, 1, 1, 0, 0, s*-.35);
  });
  var head = new THREE.Group(); head.position.set(0, 1.28, 0); g.add(head); head.userData.isHead = true;
  _c3dAdd(head, new THREE.Mesh(new THREE.CylinderGeometry(.3,.32,.4,14), _c3dMat(spec.main)), 0, 0, 0);
  [-1,1].forEach(function(s){
    var e = _c3dAdd(head, _c3dSphere(.08, spec.hole), s*.14, .02, .27, 1, 1.4, .5);
    e.userData ={ isEye: true };
  });
  _c3dAdd(head, _c3dSphere(.07, spec.hole), 0, -.12, .28, 1.1, 1.3, .5);
  _c3dSetAnchors(g, head, [0,.26,0], [0,0,.3], [.52,.72,.14]);
}
function _c3dMonRobe(g, spec){
  var body = _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.55,1.3,18), _c3dMat(spec.main)), 0, .65, 0);
  body.userData.isBody = true;
  _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.4,1.0,16), _c3dMat(spec.inner)), 0, .55, .09);
  var head = new THREE.Group(); head.position.set(0, 1.42, 0); g.add(head); head.userData.isHead = true;
  _c3dAdd(head, _c3dSphere(.34, spec.main), 0, 0, 0, 1, .95, .95);
  if (spec.demon){
    // フードの闇：顔前に沈む影（前面に少し出して"暗い顔"を作る）
    _c3dAdd(head, _c3dSphere(.29, spec.inner), 0, -.01, .2, .95, .9, .5);
    _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.27,.52,16), _c3dMat(spec.main)), 0, .33, -.03, 1, 1, 1, -.12, 0, 0); // 尖ったフードの先
    [-1,1].forEach(function(s){
      // 太く反り返る魔の角（2段：太い根元＋細い先端＝耳でなく角）
      _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.12,.36,10), _c3dMat(spec.horns)), s*.21, .3, -.02, 1, 1, 1, -.16, 0, s*-.62);
      _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.06,.34,10), _c3dMat('#e6ddf5')), s*.35, .52, -.1, 1, 1, 1, -.5, 0, s*-1.05);
      // 尖った肩スパイク
      _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.1,.36,8), _c3dMat(spec.main)), s*.5, .9, .05, 1, 1, 1, 0, 0, s*-1.05);
      // 光る眼＋発光ハロー（闇のフードより前面に出して確実に見せる）
      _c3dAdd(head, new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 12), new THREE.MeshBasicMaterial({ color: spec.eye, transparent: true, opacity: .3 })), s*.14, .03, .37, 1, 1.05, .5);
      var e = new THREE.Mesh(new THREE.SphereGeometry(.075, 14, 14), new THREE.MeshBasicMaterial({ color: spec.eye }));
      _c3dAdd(head, e, s*.14, .03, .41, 1, 1.35, .7);
      e.userData = { isEye: true };
      // 眼の光点
      _c3dAdd(head, new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 8), new THREE.MeshBasicMaterial({ color: '#fff5f5' })), s*.14, .07, .47);
      // 牙（下向き）
      _c3dAdd(head, new THREE.Mesh(new THREE.ConeGeometry(.03,.11,6), _c3dMat('#ffffff')), s*.08, -.17, .4, 1, 1, 1, Math.PI, 0, 0);
    });
    // 額に光る魔の宝石（σの位置）
    _c3dAdd(head, new THREE.Mesh(new THREE.OctahedronGeometry(.06,0), new THREE.MeshBasicMaterial({ color: spec.trim })), 0, .18, .4);
    // まとう紫のオーラ（半透明の大球）
    _c3dAdd(g, _c3dSphere(.74, spec.trim, { opacity: .06 }), 0, .82, 0, 1, 1.18, 1);
    g.userData.float = true;
  } else {
    _c3dMonFace(head, spec, .04, .3);
    _c3dAdd(head, _c3dSphere(.2, '#f5f5f4'), 0, -.2, .22, 1.2, .8, .5); // 白ひげ
    if (spec.crown) _c3dGearCrown(head, spec.crown, .36);
  }
  [-1,1].forEach(function(s){
    _c3dAdd(g, _c3dSphere(.1, spec.main), s*.5, .8, .1, .7, 1.6, .8, 0, 0, s*-.5);
  });
  if (spec.trim) _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.42, .04, 8, 20), _c3dMat(spec.trim)), 0, 1.12, 0, 1, 1, 1, Math.PI/2);
  _c3dSetAnchors(g, head, [0,.4,0], [0,0,.32], [.55,.85,.18]);
}
function _c3dMonCrystal(g, spec){
  var c = new THREE.Mesh(new THREE.OctahedronGeometry(.55, 0), _c3dMat(spec.main, { opacity: .9 }));
  _c3dAdd(g, c, 0, .8, 0, .7, 1.1, .7);
  c.userData.isBody = true;
  var i = new THREE.Mesh(new THREE.OctahedronGeometry(.3, 0), new THREE.MeshBasicMaterial({ color: spec.hi }));
  _c3dAdd(g, i, 0, .8, 0, .6, 1, .6);
  g.userData.float = true;
  var head = new THREE.Group(); head.position.set(0, .8, 0); g.add(head);
  _c3dSetAnchors(g, head, [0,.7,0], [0,0,.4], [.5,.8,.1]);
}

// =============== 装備（3Dフィット） ===============
function _c3dGearCrown(parent, color, r){
  var cg = new THREE.Group();
  _c3dAdd(cg, new THREE.Mesh(new THREE.CylinderGeometry(r*.62, r*.66, r*.3, 12), _c3dMat(color)), 0, 0, 0);
  for (var i = 0; i < 5; i++){
    var a = (i/5) * Math.PI * 2;
    _c3dAdd(cg, new THREE.Mesh(new THREE.ConeGeometry(r*.12, r*.3, 4), _c3dMat(color)), Math.sin(a)*r*.58, r*.26, Math.cos(a)*r*.58);
  }
  _c3dAdd(parent, cg, 0, r*.9, 0);
  return cg;
}
// 各アーケタイプは「頭の半径 ≒ .5」を前提に作り、hat/face/hand アンカーに置く
function _c3dBuildGear(arch, slot){
  var c = arch.c, g = new THREE.Group(), M = _c3dMat;
  switch (arch.t){
    case 'cap':
      _c3dAdd(g, _c3dSphere(.42, c), 0, 0, 0, 1, .55, 1);
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.3,.34,.05,14), M(c)), 0, -.02, .3, 1, 1, 1.4);
      _c3dAdd(g, _c3dSphere(.06, '#ffffff'), 0, .22, 0); break;
    case 'sunhat':
      _c3dAdd(g, _c3dSphere(.4, c), 0, .05, 0, 1, .6, 1);
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.68,.72,.05,18), M(c)), 0, -.08, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.4,.05,8,18), M('#e11d48')), 0, -.02, 0, 1, 1, 1, Math.PI/2); break;
    case 'tophat':
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.34,.36,.55,16), M(c)), 0, .2, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.56,.58,.05,18), M(c)), 0, -.08, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.36,.04,8,18), M('#b91c1c')), 0, .0, 0, 1, 1, 1, Math.PI/2); break;
    case 'wizard':
      _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.42,.9,14), M(c)), 0, .3, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.6,.62,.05,18), M(c)), 0, -.1, 0);
      _c3dAdd(g, _c3dSphere(.07, '#fde047'), .12, .5, .18); break;
    case 'crown': _c3dGearCrown(g, c, .52); g.position.y -= .54; break;
    case 'halo':
      _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.32,.05,10,22), new THREE.MeshBasicMaterial({ color: c })), 0, .22, 0, 1, 1, 1, Math.PI/2 + .15); break;
    case 'ribbon':
      [-1,1].forEach(function(s){ _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.14,.3,4), M(c)), s*.2, 0, 0, 1, 1, .5, 0, 0, s*1.7); });
      _c3dAdd(g, _c3dSphere(.09, c), 0, 0, 0); g.position.z += .1; break;
    case 'grad':
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.3,.32,.12,14), M(c)), 0, -.05, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.8,.05,.8), M(c)), 0, .04, 0);
      _c3dAdd(g, _c3dSphere(.05, '#f2c94c'), .38, -.12, .38); break;
    case 'helmet':
      _c3dAdd(g, _c3dSphere(.48, c), 0, -.05, 0, 1, .75, 1);
      _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.42,.05,8,18), M('#374151')), 0, -.18, 0, 1, 1, 1, Math.PI/2); break;
    case 'glasses': case 'sunglass':
      var lensC = arch.t === 'sunglass' ? c : '#7dd3fc';
      [-1,1].forEach(function(s){
        _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.13,.025,8,18), M(c)), s*.19, 0, 0);
        if (arch.t === 'sunglass') _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.02,14), M(lensC)), s*.19, 0, 0, 1, 1, 1, Math.PI/2);
      });
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.14,6), M(c)), 0, 0, 0, 1, 1, 1, 0, 0, Math.PI/2); break;
    case 'monocle':
      _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.13,.025,8,18), M(c)), .19, 0, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.3,6), M(c)), .3, -.18, 0, 1, 1, 1, 0, 0, .5); break;
    case 'goggle':
      [-1,1].forEach(function(s){ _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.14,.04,8,18), M(c)), s*.19, 0, 0); });
      _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.1,.06,.04), M(c)), 0, 0, 0); break;
    case 'mask':
      _c3dAdd(g, _c3dSphere(.24, c), 0, -.12, .02, 1.3, .9, .5);
      [-1,1].forEach(function(s){ _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.3,6), M(c)), s*.32, -.06, -.1, 1, 1, 1, 0, s*.9, s*1.2); }); break;
    case 'sword':
      _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.08,.62,.03), M(c)), 0, .38, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.055,.14,4), M(c)), 0, .74, 0, 1, 1, .5);
      _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.26,.06,.06), M('#b45309')), 0, .06, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.18,8), M('#7c2d12')), 0, -.06, 0); break;
    case 'shield':
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.06,16), M(c)), 0, .1, 0, 1, 1, 1, Math.PI/2);
      _c3dAdd(g, _c3dSphere(.09, '#f2c94c'), 0, .1, .05); break;
    case 'wand':
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.5,8), M(c)), 0, .2, 0);
      _c3dAdd(g, _c3dSphere(.09, '#fde047'), 0, .5, 0); break;
    case 'orbstaff':
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.03,.04,.7,8), M('#7c2d12')), 0, .25, 0);
      _c3dAdd(g, _c3dSphere(.13, c, { opacity: .85 }), 0, .68, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.15,.02,8,16), M('#f2c94c')), 0, .68, 0); break;
    case 'book':
      _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.4,.5,.1), M(c)), 0, .2, 0, 1, 1, 1, 0, .3);
      _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.34,.44,.04), M('#f8fafc')), 0, .2, .05, 1, 1, 1, 0, .3); break;
    case 'hammer':
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.6,8), M('#a16207')), 0, .22, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.34,10), M(c)), 0, .56, 0, 1, 1, 1, 0, 0, Math.PI/2); break;
    case 'axe':
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.62,8), M('#a16207')), 0, .22, 0);
      _c3dAdd(g, _c3dSphere(.2, c), .12, .56, 0, .5, 1.1, .18); break;
    case 'bow':
      _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.32,.03,8,20,Math.PI), M(c)), 0, .3, 0, 1, 1, 1, 0, 0, -Math.PI/2);
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.62,6), M('#e5e7eb')), 0, .3, 0); break;
    case 'trident':
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.8,8), M(c)), 0, .3, 0);
      [[-.1,0],[0,0],[.1,0]].forEach(function(p){ _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.035,.16,4), M(c)), p[0], .76, 0); });
      _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.24,.05,.05), M(c)), 0, .66, 0); break;
    case 'wings':
      // 背中の翼：左右ミラーの平たいコーン2枚重ね（羽ばたきはしない装飾。バトルの傾きには追従）
      [-1,1].forEach(function(s){
        _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.3,.85,6), M(c)), s*.42, .1, -.02, 1, 1, .22, 0, 0, s*(Math.PI/2+.5));
        _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.2,.55,6), M(c)), s*.3, -.12, -.02, 1, 1, .22, 0, 0, s*(Math.PI/2+.8));
      }); break;
    case 'cape':
      // マント：肩から下がる円錐台の後ろ半分＋留め金
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.34,.5,.95,10,1,true), M(c)), 0, -.2, 0, 1, 1, .45);
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.4,8), M('#f2c94c')), 0, .3, .1, 1, 1, 1, 0, 0, Math.PI/2); break;
    case 'board':
      _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.95,.06,.34), M(c)), 0, .09, 0);
      [[-.32,-.12],[-.32,.12],[.32,-.12],[.32,.12]].forEach(function(p){ _c3dAdd(g, _c3dSphere(.07,'#1f2937'), p[0], .02, p[1]); }); break;
    case 'broom':
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1.0,8), M(c)), 0, .12, 0, 1, 1, 1, 0, 0, Math.PI/2);   // 横向きの柄（またがる向き）
      _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.16,.4,10), M('#eab308')), .62, .12, 0, 1, 1, 1, 0, 0, Math.PI/2); break;
    case 'cloud':
      _c3dAdd(g, _c3dSphere(.3, c, { opacity:.95 }), 0, .08, 0, 1, .7, .8);
      _c3dAdd(g, _c3dSphere(.22, c, { opacity:.95 }), -.3, .06, 0, 1, .7, .8);
      _c3dAdd(g, _c3dSphere(.22, c, { opacity:.95 }), .3, .06, 0, 1, .7, .8); break;
    case 'rocket':
      _c3dAdd(g, new THREE.Mesh(new THREE.CylinderGeometry(.14,.16,.5,12), M('#e5e7eb')), 0, .3, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.15,.25,12), M(c)), 0, .67, 0);
      [-1,1].forEach(function(s){ _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.08,.2,4), M(c)), s*.17, .12, 0); });
      _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.1,.2,10), M('#f59e0b')), 0, 0, 0, 1, -1, 1); break;
    case 'saucer':
      _c3dAdd(g, _c3dSphere(.42, c), 0, .1, 0, 1, .28, 1);
      _c3dAdd(g, _c3dSphere(.18, '#7dd3fc', { opacity:.85 }), 0, .22, 0);
      [0,1,2,3,4,5].forEach(function(i){ var a=i*Math.PI/3; _c3dAdd(g, _c3dSphere(.04,'#fde047'), Math.cos(a)*.34, .1, Math.sin(a)*.34); }); break;
    case 'star3d':
      _c3dAdd(g, _c3dSphere(.16, c), 0, .16, 0);
      [0,1,2,3].forEach(function(i){ var a=i*Math.PI/2; _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.07,.22,4), M(c)), Math.cos(a)*.2, .16+Math.sin(a)*.2, 0, 1, 1, 1, 0, 0, a-Math.PI/2); }); break;
    case 'hornhelm':
      _c3dAdd(g, _c3dSphere(.46, c), 0, -.05, 0, 1, .72, 1);
      [-1,1].forEach(function(s){ _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.09,.34,8), M('#f8fafc')), s*.3, .22, 0, 1, 1, 1, 0, 0, s*-.5); }); break;
    case 'bolt':
      // いなずま：ジグザグ3節
      _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.1,.3,.05), M(c)), -.05, .42, 0, 1, 1, 1, 0, 0, .4);
      _c3dAdd(g, new THREE.Mesh(new THREE.BoxGeometry(.1,.3,.05), M(c)), .05, .2, 0, 1, 1, 1, 0, 0, -.4);
      _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.08,.22,4), M(c)), -.03, -.02, 0, 1, -1, 1); break;
    case 'comet':
      _c3dAdd(g, _c3dSphere(.14, '#fde047'), 0, .5, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.ConeGeometry(.1,.5,8), M(c)), 0, .22, 0); break;
    case 'arc':
      // にじ：半円トーラス3重
      _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.34,.07,8,20,Math.PI), M('#f87171')), 0, .05, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.26,.05,8,20,Math.PI), M('#fbbf24')), 0, .05, 0);
      _c3dAdd(g, new THREE.Mesh(new THREE.TorusGeometry(.19,.04,8,20,Math.PI), M('#38bdf8')), 0, .05, 0); break;
    default:
      _c3dAdd(g, _c3dSphere(.15, c || '#94a3b8'), 0, .1, 0);
  }
  return g;
}
// 絵文字プレート（表に無いアイテム用）。アンカーに寄り添う板＝v1の浮きスプライトよりフィット
function _c3dEmojiPlate(em, size){
  var mat;
  try {
    var cv = document.createElement('canvas'); cv.width = cv.height = 128;
    var ctx = cv.getContext('2d');
    ctx.font = '100px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(em, 64, 72);
    var tex = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
  } catch(e){
    // canvas不可（テスト等のdocumentなし環境）でも有効なMeshを返す＝クリップ/アニメが機能する
    mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide });
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
}
// 装備をキャラ/モンスターに装着（アンカー式）。equip={hat:item,face:item,hand:item,back:item,ride:item}（itemは{em}を持つ）
function char3dEquip(charGroup, equip){
  var an = charGroup.userData.anchors, head = charGroup.userData.headGroup;
  if (!an || !head || !equip) return;
  ['hat','face','hand','back','ride'].forEach(function(sl){
    var it = equip[sl]; if (!it || !it.em) return;
    var arch = C3D_GEAR[sl + ':' + it.em] || C3D_GEAR[it.em];   // スロット限定キー優先（😇=頭なら輪・背中なら翼）
    var mesh, s;
    if (sl === 'back' && !arch){
      // せなか（翼/マント）：左右2枚のミラー板＝正面カメラでも体の両側からのぞいて見える
      mesh = new THREE.Group();
      [-1, 1].forEach(function(sd){
        var p = _c3dEmojiPlate(it.em, .62);
        p.position.set(sd * .33, 0, 0); p.rotation.y = sd * .55;
        if (sd < 0) p.scale.x = -1;   // 左は鏡像＝左右対称の翼になる
        mesh.add(p);
      });
    }
    else if (arch){ mesh = _c3dBuildGear(arch, sl); }
    else {
      var size = sl === 'hand' ? .5 : (sl === 'ride' ? .85 : .55);
      mesh = _c3dEmojiPlate(it.em, size);
      if (sl === 'hat') mesh.rotation.x = -.35; // 頭にかぶさる角度
      if (sl === 'ride') mesh.rotation.x = -.5; // 地面に寝かせぎみ＝台座らしく
    }
    // アーケタイプ内部のオフセット（王冠の沈み込み等）を保つため、アンカーは「加算」する
    if (sl === 'hat'){ s = an.hatL; head.add(mesh); mesh.position.x += s[0]; mesh.position.y += s[1]; mesh.position.z += s[2]; }
    else if (sl === 'face'){ s = an.faceL; head.add(mesh); mesh.position.x += s[0]; mesh.position.y += s[1]; mesh.position.z += s[2] + .06; }
    else if (sl === 'back'){ s = an.back || [0, .74, -.30]; charGroup.add(mesh); mesh.position.x += s[0]; mesh.position.y += s[1]; mesh.position.z += s[2]; }
    else if (sl === 'ride'){ s = an.ride || [0, .10, .16]; charGroup.add(mesh); mesh.position.x += s[0]; mesh.position.y += s[1]; mesh.position.z += s[2]; }
    else {
      s = an.hand;
      var armR = charGroup.userData.armR;
      if (armR){
        // 右腕グループの子にする＝攻撃の腕振りに剣や杖が追従する。
        // handアンカーはルート座標なので、肩ピボットぶんを引いて腕ローカル座標に変換する
        armR.add(mesh);
        mesh.position.x += s[0] - armR.position.x - .04;
        mesh.position.y += s[1] - armR.position.y - .03;
        mesh.position.z += s[2] - armR.position.z;
      } else {
        charGroup.add(mesh);
        mesh.position.x += s[0] - .04; mesh.position.y += s[1] - .03; mesh.position.z += s[2];
      }
      mesh.rotation.z = -.4;
    }
  });
}

// =============== バトルアニメーション（AnimationMixer/AnimationClip） ===============
// 骨（スケルトン）は導入せず、既存のGroup階層（root位置/回転・c3dBody/c3dHead/c3dWingN）を
// キーフレームで動かす。攻撃/被弾/勝利クリップは最終キーで必ず中立姿勢に戻す
// （_c3dTickのアイドル再開と段差なく繋がる）。defeat（やられ）だけは倒れた姿勢を保持する。
// モンスター12プランは体型で4カテゴリに分類し、カテゴリごとの共通クリップを使い回す。
var _C3D_MON_CAT = {
  imp:'limbed', beast:'limbed', golem:'limbed',
  flyer:'winged', dragon:'winged', bird:'winged',
  blob:'amorphous', ghost:'amorphous', cube:'amorphous', robe:'amorphous', crystal:'amorphous',
  tree:'rooted'
};
function _c3dReduced(){ try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){ return false; } }
function _c3dNT(name, times, vals){ return new THREE.NumberKeyframeTrack(name, times, vals); }
function _c3dVT(name, times, vals){ return new THREE.VectorKeyframeTrack(name, times, vals); }
// bodyの静止時scale.y（アーケタイプごとに違うので絶対値でなく倍率で書く）
function _c3dBodySy0(v){
  var b = v.parts && v.parts.body;
  if (!b) return 1;
  return (b.userData.sy0 != null) ? b.userData.sy0 : b.scale.y;
}
// 突進攻撃（limbedモンスター等の基本形）。dir=+1で右（ヒーロー→敵）、-1で左（敵→ヒーロー）
function _c3dClipLunge(v, dir){
  var sy0 = _c3dBodySy0(v);
  var tr = [
    _c3dVT('.position', [0,.12,.26,.45], [0,0,0, -dir*.1,.04,0, dir*.4,.1,.18, 0,0,0]),
    _c3dNT('.rotation[z]', [0,.12,.26,.45], [0, dir*.12, -dir*.3, 0])
  ];
  if (v.parts.body) tr.push(_c3dNT('c3dBody.scale[y]', [0,.12,.26,.45], [sy0, sy0*1.06, sy0*.9, sy0]));
  return new THREE.AnimationClip('c3dLunge', .45, tr);
}
// 腕振り付き突進（human/animal＋armR持ちのbeast系：振りかぶって振り下ろす。剣や杖が腕に追従する）
function _c3dClipLungeSwing(v, dir){
  var clip = _c3dClipLunge(v, dir);
  if (v.parts.armR){
    clip.tracks.push(_c3dNT('c3dArmR.rotation[z]', [0,.12,.26,.45], [0, dir*2.6, dir*.3, 0]));
    clip.tracks.push(_c3dNT('c3dArmR.rotation[x]', [0,.12,.26,.45], [0, -.25, .15, 0]));
    clip.name = 'c3dLungeSwing';
  }
  return clip;
}
// フクロウ急降下（ヒーローowl用：舞い上がってくちばしから突っ込む＋翼ばたつき）
function _c3dClipSwoop(v, dir){
  var tr = [
    _c3dVT('.position', [0,.16,.32,.5], [0,0,0, -dir*.1,.3,0, dir*.38,-.04,.15, 0,0,0]),
    _c3dNT('.rotation[z]', [0,.16,.32,.5], [0, dir*.12, -dir*.55, 0])
  ];
  if (v.parts.armR) tr.push(_c3dNT('c3dArmR.rotation[z]', [0,.1,.2,.32,.45,.5], [0, dir*1.2, -dir*.2, dir*1.0, -dir*.1, 0]));
  return new THREE.AnimationClip('c3dSwoop', .5, tr);
}
// イルカ宙返り（ヒーローdolphin用：跳ねながら前方1回転して体当たり）
function _c3dClipFlip(v, dir){
  var tr = [
    _c3dVT('.position', [0,.14,.32,.5], [0,0,0, -dir*.06,.34,0, dir*.36,.12,.12, 0,0,0]),
    _c3dNT('.rotation[z]', [0,.5], [0, -dir*Math.PI*2])
  ];
  return new THREE.AnimationClip('c3dFlip', .5, tr);
}
// ペンギン腹滑り（ヒーローpenguin用：腹ばいで敵まで滑る）
function _c3dClipSlide(v, dir){
  var tr = [
    _c3dVT('.position', [0,.12,.3,.42,.55], [0,0,0, -dir*.08,.12,0, dir*.42,-.28,.1, dir*.2,-.05,0, 0,0,0]),
    _c3dNT('.rotation[z]', [0,.12,.3,.42,.55], [0, dir*.15, -dir*1.35, -dir*.4, 0])
  ];
  return new THREE.AnimationClip('c3dSlide', .55, tr);
}
// のけぞり（被弾）。dirは自分の攻撃方向＝相手と反対側へ弾かれる
function _c3dClipRecoil(v, dir){
  var sy0 = _c3dBodySy0(v);
  var tr = [
    _c3dVT('.position', [0,.1,.24,.4], [0,0,0, -dir*.3,.06,0, -dir*.1,.01,0, 0,0,0]),
    _c3dNT('.rotation[z]', [0,.1,.24,.4], [0, dir*.28, dir*.1, 0])
  ];
  if (v.parts.head) tr.push(_c3dNT('c3dHead.rotation[z]', [0,.1,.26,.4], [0, dir*.35, dir*.12, 0]));
  if (v.parts.body) tr.push(_c3dNT('c3dBody.scale[y]', [0,.1,.24,.4], [sy0, sy0*.86, sy0*1.05, sy0]));
  return new THREE.AnimationClip('c3dRecoil', .4, tr);
}
// 急降下攻撃（winged：既存のwing Groupを使って羽ばたきを強調）
function _c3dClipDive(v, dir){
  var tr = [
    _c3dVT('.position', [0,.16,.32,.5], [0,0,0, -dir*.12,.32,0, dir*.38,-.06,.15, 0,0,0]),
    _c3dNT('.rotation[z]', [0,.16,.32,.5], [0, dir*.1, -dir*.5, 0])
  ];
  v.parts.wings.forEach(function(w, i){
    var s = w.userData.side || 1;
    tr.push(_c3dNT('c3dWing' + i + '.rotation[z]', [0,.1,.2,.32,.42,.5], [s*.35, s*1.05, s*.1, s*.95, s*.2, s*.35]));
  });
  return new THREE.AnimationClip('c3dDive', .5, tr);
}
// 拡縮バースト攻撃（amorphous：手足の無い体型向け。深くつぶれて跳ねる）
function _c3dClipPulse(v, dir){
  var sy0 = _c3dBodySy0(v);
  var tr = [
    _c3dVT('.position', [0,.14,.3,.45], [0,0,0, 0,-.08,0, dir*.32,.24,.12, 0,0,0])
  ];
  if (v.parts.body) tr.push(_c3dNT('c3dBody.scale[y]', [0,.14,.3,.45], [sy0, sy0*.68, sy0*1.28, sy0]));
  return new THREE.AnimationClip('c3dPulse', .45, tr);
}
// 枝振り攻撃（rooted：木は移動せず幹と樹冠をしならせる）
function _c3dClipWhip(v, dir){
  var sy0 = _c3dBodySy0(v);
  var tr = [
    _c3dNT('.rotation[z]', [0,.16,.32,.5], [0, dir*.18, -dir*.35, 0])
  ];
  if (v.parts.head) tr.push(_c3dNT('c3dHead.rotation[z]', [0,.18,.34,.5], [0, dir*.3, -dir*.55, 0]));
  if (v.parts.body) tr.push(_c3dNT('c3dBody.scale[y]', [0,.16,.32,.5], [sy0, sy0*1.06, sy0*.94, sy0]));
  return new THREE.AnimationClip('c3dWhip', .5, tr);
}
// 震え（rooted被弾：移動しない体型向け）
function _c3dClipShudder(v){
  var tr = [ _c3dNT('.rotation[z]', [0,.08,.18,.28,.4], [0,.12,-.1,.06,0]) ];
  if (v.parts.head) tr.push(_c3dNT('c3dHead.rotation[z]', [0,.1,.2,.3,.4], [0,-.22,.16,-.08,0]));
  return new THREE.AnimationClip('c3dShudder', .4, tr);
}
// 勝利ポーズ（human/animal：二段ジャンプ＋腕を突き上げてガッツポーズ。終わったらアイドルに戻る）
function _c3dClipVictory(v){
  var tr = [
    _c3dVT('.position', [0,.18,.34,.52,.68,.9], [0,0,0, 0,.34,0, 0,0,0, 0,.4,0, 0,0,0, 0,0,0]),
    _c3dNT('.rotation[z]', [0,.18,.34,.52,.68,.9], [0,.14,-.12,.12,-.08,0])
  ];
  if (v.parts.head) tr.push(_c3dNT('c3dHead.rotation[z]', [0,.25,.5,.75,.9], [0,.22,-.22,.14,0]));
  if (v.parts.armR) tr.push(_c3dNT('c3dArmR.rotation[z]', [0,.18,.34,.52,.68,.9], [0,2.6,2.2,2.7,2.2,0]));
  return new THREE.AnimationClip('c3dVictory', .9, tr);
}
// フクロウ勝利（owl：高く舞い上がって羽ばたく）
function _c3dClipFlyUp(v){
  var tr = [
    _c3dVT('.position', [0,.2,.45,.7,.9], [0,0,0, 0,.5,0, 0,.35,0, 0,.5,0, 0,0,0]),
    _c3dNT('.rotation[z]', [0,.3,.6,.9], [0,.12,-.12,0])
  ];
  if (v.parts.armR) tr.push(_c3dNT('c3dArmR.rotation[z]', [0,.15,.3,.45,.6,.75,.9], [0,1.3,.2,1.3,.2,1.3,0]));
  return new THREE.AnimationClip('c3dFlyUp', .9, tr);
}
// イルカ勝利（dolphin：大ジャンプ宙返り）
function _c3dClipFlipJump(v){
  var tr = [
    _c3dVT('.position', [0,.25,.55,.75,.9], [0,0,0, 0,.55,0, 0,.1,0, 0,.3,0, 0,0,0]),
    _c3dNT('.rotation[z]', [0,.55,.9], [0, -Math.PI*2, -Math.PI*2])
  ];
  return new THREE.AnimationClip('c3dFlipJump', .9, tr);
}
// ペンギン勝利（penguin：うれしいよちよちダンス）
function _c3dClipWiggle(v){
  var tr = [
    _c3dVT('.position', [0,.15,.3,.45,.6,.75,.9], [0,0,0, 0,.18,0, 0,0,0, 0,.18,0, 0,0,0, 0,.12,0, 0,0,0]),
    _c3dNT('.rotation[z]', [0,.12,.26,.4,.54,.68,.82,.9], [0,.22,-.22,.2,-.2,.15,-.1,0])
  ];
  if (v.parts.armR) tr.push(_c3dNT('c3dArmR.rotation[z]', [0,.2,.4,.6,.8,.9], [0,1.0,.1,1.0,.1,0]));
  return new THREE.AnimationClip('c3dWiggle', .9, tr);
}
// やられポーズ（ヒーロー：よろけて横に倒れ、そのまま保持）
function _c3dClipDefeat(v){
  var tr = [
    _c3dVT('.position', [0,.2,.75], [0,0,0, 0,.07,0, -.16,-.18,0]),
    _c3dNT('.rotation[z]', [0,.2,.75], [0, -.06, 1.25])
  ];
  if (v.parts.head) tr.push(_c3dNT('c3dHead.rotation[z]', [0,.3,.75], [0,.1,.55]));
  return new THREE.AnimationClip('c3dDefeat', .75, tr);
}
// 撃破（モンスター）：体型カテゴリごとに倒れ方を変え、最終キーの倒れ姿勢を保持する
// （敵はヒーローの反対側＝画面右へ吹き飛ぶので回転はマイナス方向）。フェードはCSS側（.rpg-defeated-3d）が担当
function _c3dClipMonDefeat(v){
  var cat = v.monCat || 'limbed';
  var sy0 = _c3dBodySy0(v);
  var tr;
  if (cat === 'winged'){
    // 墜落：一度ふわっと浮いてから落ちる。翼はだらりと垂れる
    tr = [
      _c3dVT('.position', [0,.25,.7,.95], [0,0,0, .06,.22,0, .18,-.3,0, .18,-.34,0]),
      _c3dNT('.rotation[z]', [0,.25,.7,.95], [0, .15, -1.15, -1.35])
    ];
    (v.parts.wings || []).forEach(function(w, i){
      var s = w.userData.side || 1;
      tr.push(_c3dNT('c3dWing' + i + '.rotation[z]', [0,.2,.6,.95], [s*.35, s*1.1, s*.08, s*.03]));
    });
    return new THREE.AnimationClip('c3dCrash', .95, tr);
  }
  if (cat === 'amorphous'){
    // つぶれ：ぷるっとふくらんでから ぺしゃんこに沈む
    tr = [ _c3dVT('.position', [0,.2,.5,.85], [0,0,0, 0,.08,0, 0,-.22,0, 0,-.26,0]) ];
    if (v.parts.body) tr.push(_c3dNT('c3dBody.scale[y]', [0,.2,.5,.85], [sy0, sy0*1.15, sy0*.35, sy0*.22]));
    return new THREE.AnimationClip('c3dSquash', .85, tr);
  }
  if (cat === 'rooted'){
    // 伐倒：ゆっくり傾きはじめてから一気に倒れる（木こり式）
    tr = [
      _c3dNT('.rotation[z]', [0,.35,.75,.95], [0, -.18, -1.3, -1.42]),
      _c3dVT('.position', [0,.35,.95], [0,0,0, 0,.02,0, .1,-.12,0])
    ];
    if (v.parts.head) tr.push(_c3dNT('c3dHead.rotation[z]', [0,.4,.95], [0, -.15, -.5]));
    return new THREE.AnimationClip('c3dTopple', .95, tr);
  }
  // limbed：よろけて横倒れ（ヒーローのDefeatと同型・倒れる向きは敵側）
  tr = [
    _c3dVT('.position', [0,.2,.75], [0,0,0, 0,.07,0, .16,-.18,0]),
    _c3dNT('.rotation[z]', [0,.2,.75], [0, .06, -1.25])
  ];
  if (v.parts.head) tr.push(_c3dNT('c3dHead.rotation[z]', [0,.3,.75], [0,-.1,-.55]));
  return new THREE.AnimationClip('c3dFallOver', .75, tr);
}
function _c3dCombatClip(v, kind){
  var hk = v.heroKind || 'animal';
  if (kind === 'heroAttack'){
    if (hk === 'owl') return _c3dClipSwoop(v, 1);
    if (hk === 'dolphin') return _c3dClipFlip(v, 1);
    if (hk === 'penguin') return _c3dClipSlide(v, 1);
    return _c3dClipLungeSwing(v, 1);   // human / animal
  }
  if (kind === 'heroHit') return _c3dClipRecoil(v, 1);
  if (kind === 'heroVictory'){
    if (hk === 'owl') return _c3dClipFlyUp(v);
    if (hk === 'dolphin') return _c3dClipFlipJump(v);
    if (hk === 'penguin') return _c3dClipWiggle(v);
    return _c3dClipVictory(v);
  }
  if (kind === 'heroDefeat') return _c3dClipDefeat(v);
  var cat = v.monCat || 'limbed';
  if (kind === 'monAttack'){
    if (cat === 'winged') return _c3dClipDive(v, -1);
    if (cat === 'amorphous') return _c3dClipPulse(v, -1);
    if (cat === 'rooted') return _c3dClipWhip(v, -1);
    return _c3dClipLungeSwing(v, -1);   // beast系はarmRを持つので腕振りも乗る（imp/golemは基本形にフォールバック）
  }
  if (kind === 'monHit') return (cat === 'rooted') ? _c3dClipShudder(v) : _c3dClipRecoil(v, -1);
  if (kind === 'monDefeat') return _c3dClipMonDefeat(v);
  return null;
}
// 公開エントリポイント：バトル演出からラッパー要素とkindだけで呼ぶ（mixer/クリップの内部構造は外に見せない）。
// kind: heroAttack | heroHit | heroVictory | heroDefeat | monAttack | monHit | monDefeat
function _c3dTriggerCombat(el, kind){
  try {
    if (_c3dDead || !el || _c3dReduced()) return false;   // reduced-motion時は既存CSS抑制と同じくアニメしない
    var slot = (el.classList && el.classList.contains('c3d-slot')) ? el : (el.querySelector ? el.querySelector('.c3d-slot') : null);
    if (!slot) return false;
    var v = null;
    for (var i = 0; i < _c3dViews.length; i++){ if (_c3dViews[i].slot === slot){ v = _c3dViews[i]; break; } }
    if (!v) return false;
    var clip = _c3dCombatClip(v, kind);
    if (!clip) return false;
    // 前のクリップが残っていてもミキサーごと作り直す（クリップキャッシュの蓄積も防ぐ）
    if (v.mixer){ try { v.mixer.stopAllAction(); } catch(e){} }
    v.mixer = new THREE.AnimationMixer(v.char);
    var a = v.mixer.clipAction(clip);
    a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play();
    v.animState = (kind === 'heroDefeat' || kind === 'monDefeat') ? 'defeat' : (kind === 'heroVictory') ? 'victory' : (kind.indexOf('Hit') > 0 ? 'hit' : 'attack');
    v.animUntil = performance.now() + clip.duration * 1000 + 60;
    return true;
  } catch(e){ return false; }
}

// =============== ガチャの3D宝箱（開封演出） ===============
// レア度で材質が豪華になる：0-1木 / 2-3銀 / 4-5金 / 6虹(UR) / 7レジェンド(LR)
// 宝箱のレア度別マテリアル。body＝木/地、dark＝板目/影、metal＝金具、gem＝発光する宝石
var C3D_CHEST_TIERS=[
  { body:'#6a4426', dark:'#40260f', metal:'#c99a44', gem:'#ffd45e' },   // 木＋真鍮（N/HN）
  { body:'#68738a', dark:'#3c4759', metal:'#e4ebf4', gem:'#9be8ff' },   // 銀（R/HR）
  { body:'#7c4a12', dark:'#472a08', metal:'#ffcf47', gem:'#fff0a8' },   // 金（SR/SSR）
  { body:'#3f1d7a', dark:'#25104a', metal:'#eaa6ff', gem:'#67e8f9' },   // 紫（UR）
  { body:'#111a2c', dark:'#070b14', metal:'#fbbf24', gem:'#fde047' }    // 黒金（LR）
];
function _c3dChestTier(rank){ return C3D_CHEST_TIERS[ rank>=7?4 : rank>=6?3 : rank>=4?2 : rank>=2?1 : 0 ]; }
// 開封シーンのカメラ枠。_c3dRenderIntoは初回のバウンディングボックスで枠をキャッシュするため、
// 宝箱のままだと浮かび上がったアイテム（y≈1.1＋アイテムの高さ）が枠外＝見えなくなる。
// フタが開く瞬間にこの広い枠へ差し替える（カメラが引くカット割りとして機能する）
var C3D_CHEST_FRAME={ hgt:2.15, cy:.86 };
// PBRマテリアル（写実的な陰影：roughness/metalness）。トゥーンと違い光が滑らかに回り立体感が出る。
// MeshToonMaterialはscene.environmentを無視するため、この宝箱だけがPBR化され他キャラに影響しない。
function _c3dPbr(hex, rough, metal, emisF){
  var col=new THREE.Color(hex);
  var m=new THREE.MeshStandardMaterial({ color:col, roughness:(rough==null?.7:rough), metalness:(metal==null?0:metal) });
  if(emisF) m.emissive=col.clone().multiplyScalar(emisF);
  return m;
}
// canvasからテクスチャ生成（documentなしのテスト環境ではnull＝mapなしで安全に動く）
function _c3dCanvasTex(draw){
  try{
    var cv=document.createElement('canvas'); cv.width=cv.height=128;
    draw(cv.getContext('2d'),128);
    var tex=new THREE.CanvasTexture(cv);
    if(THREE.SRGBColorSpace) tex.colorSpace=THREE.SRGBColorSpace;
    return tex;
  }catch(e){ return null; }
}
function _c3dBuildChest(rank){
  var t=_c3dChestTier(rank||0), g=new THREE.Group();
  var wood=_c3dPbr(t.body,.78,.05), dark=_c3dPbr(t.dark,.9,.05), metal=_c3dPbr(t.metal,.28,.72,.08);
  var gemMat=new THREE.MeshStandardMaterial({ color:new THREE.Color(t.gem), roughness:.08, metalness:0, emissive:new THREE.Color(t.gem), emissiveIntensity:.9 });
  // 木目テクスチャ（横方向のうっすらした濃淡）＝白地に暗い線→材質色に乗算されて木肌のリアリティを出す
  var woodMap=_c3dCanvasTex(function(x,S){
    x.fillStyle='#ffffff'; x.fillRect(0,0,S,S);
    for(var i=0;i<36;i++){ var y=Math.random()*S, a=.05+Math.random()*.13;
      x.strokeStyle='rgba(46,30,14,'+a+')'; x.lineWidth=.5+Math.random()*1.7;
      x.beginPath(); x.moveTo(0,y); for(var xx=0;xx<=S;xx+=12) x.lineTo(xx,y+(Math.random()-.5)*3.4); x.stroke(); }
  });
  if(woodMap){ wood.map=woodMap; }
  // ── 本体（下箱）＋木の板目（横みぞ）
  var base=new THREE.Mesh(new THREE.BoxGeometry(1.08,.5,.74), wood); base.position.y=.27; g.add(base);
  [.14,.30].forEach(function(y){ var groove=new THREE.Mesh(new THREE.BoxGeometry(1.092,.022,.752), dark); groove.position.set(0,y,0); g.add(groove); });   // 板の継ぎ目
  // 底の金属リム＋4本脚
  var rim=new THREE.Mesh(new THREE.BoxGeometry(1.16,.1,.82), metal); rim.position.y=.05; g.add(rim);
  [[-.46,-.3],[.46,-.3],[-.46,.3],[.46,.3]].forEach(function(f){ var ft=new THREE.Mesh(new THREE.BoxGeometry(.13,.08,.13), metal); ft.position.set(f[0],-.01,f[1]); g.add(ft); });
  // 縦の金属帯×2（本体）＋鋲（リベット）
  [-.34,.34].forEach(function(x){ var b=new THREE.Mesh(new THREE.BoxGeometry(.11,.54,.78), metal); b.position.set(x,.28,0); g.add(b);
    [.09,.26,.43].forEach(function(ry){ var rv=new THREE.Mesh(new THREE.SphereGeometry(.028,10,10), metal); rv.position.set(x,ry,.4); g.add(rv); }); });
  // 四隅の金具
  [[-.51,-.35],[.51,-.35],[-.51,.35],[.51,.35]].forEach(function(c){ var k=new THREE.Mesh(new THREE.BoxGeometry(.1,.15,.1), metal); k.position.set(c[0],.13,c[1]); g.add(k); });
  // 側面の取っ手（半円リング）
  [-.57,.57].forEach(function(x){ var h=new THREE.Mesh(new THREE.TorusGeometry(.11,.022,8,18,Math.PI), metal); h.rotation.set(0,Math.PI/2,Math.PI); h.position.set(x,.3,0); g.add(h); });
  // 背面のちょうつがい×2
  [-.3,.3].forEach(function(x){ var hg=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.18,12), metal); hg.rotation.z=Math.PI/2; hg.position.set(x,.5,-.37); g.add(hg); });
  // ── フタ：かまぼこ型（バレル・木）＋板目リング＋金属ふち。後ろ上辺がピボット
  var lid=new THREE.Group(); lid.position.set(0,.5,-.36); lid.name='c3dChestLid';
  var dome=new THREE.Mesh(new THREE.CylinderGeometry(.37,.37,1.08,28), wood); dome.rotation.z=Math.PI/2; dome.position.set(0,.05,.36); lid.add(dome);
  [-.18,.18].forEach(function(x){ var pl=new THREE.Mesh(new THREE.TorusGeometry(.372,.013,8,26), dark); pl.rotation.y=Math.PI/2; pl.position.set(x,.05,.36); lid.add(pl); });   // 板目
  [-.55,.55].forEach(function(x){ var r=new THREE.Mesh(new THREE.TorusGeometry(.37,.045,10,26), metal); r.rotation.y=Math.PI/2; r.position.set(x,.05,.36); lid.add(r); });        // 端の金属ふち
  [-.3,.3].forEach(function(x){ var band=new THREE.Mesh(new THREE.TorusGeometry(.378,.028,8,26,Math.PI), metal); band.rotation.y=Math.PI/2; band.position.set(x,.05,.36); lid.add(band); });   // 天面の帯
  g.add(lid);
  // ── 錠（プレート＋鍵穴＋発光ジュエル）Groupごと飛ぶ。開封クリップが (0,.5,.37) 起点で参照
  var lock=new THREE.Group(); lock.position.set(0,.5,.37); lock.name='c3dChestLock';
  var plate=new THREE.Mesh(new THREE.BoxGeometry(.28,.34,.09), metal); lock.add(plate);
  var gem=new THREE.Mesh(new THREE.OctahedronGeometry(.12,0), gemMat); gem.position.set(0,.05,.08); gem.scale.set(1,1.25,.7); lock.add(gem);
  var hole=new THREE.Mesh(new THREE.BoxGeometry(.055,.11,.05), dark); hole.position.set(0,-.1,.06); lock.add(hole);
  g.add(lock);
  g.userData.lid=lid; g.userData.lock=lock;
  return g;
}
// ガチャUIが置く宝箱スロット。3D不可・reduced-motion時は null（呼び出し側が🎁にフォールバック）
function gacha3dBoxHtml(rank){
  try{ if(_c3dDead || _c3dReduced() || !char3dActive() || !_c3dCoreGet()) return null; }catch(e){ return null; }
  return '<div class="c3d-slot c3d-chest-slot" data-c3d-chest="'+(parseInt(rank,10)||0)+'"></div>';
}
// 宝箱の演出クリップ。phase: charge(ゆっくりガタガタ)|phase2|phase3(はげしく)|open(フタが開いて錠が飛ぶ)
function _c3dChestClip(v, phase){
  var lock=v.char.userData.lock, tr;
  if(phase==='open'){
    tr=[ _c3dNT('c3dChestLid.rotation[x]', [0,.18,.5], [0, .06, -2.1]),
         _c3dVT('.scale', [0,.16,.34,.5], [1,1,1, 1.12,1.12,1.12, .98,.98,.98, 1,1,1]) ];
    if(lock){
      tr.push(_c3dVT('c3dChestLock.position', [0,.12,.3], [0,.5,.37, 0,.66,.55, 0,1.5,1.2]));
      tr.push(_c3dNT('c3dChestLock.scale[x]', [0,.26,.3], [1,1,.001]));   // 飛んだ錠は最後に消す
    }
    return new THREE.AnimationClip('c3dChestOpen', .5, tr);
  }
  var mag = phase==='phase3' ? .12 : phase==='phase2' ? .08 : .045;   // フェーズが進むほど激しく
  var spd = phase==='phase3' ? .28 : phase==='phase2' ? .4 : .6;
  tr=[ _c3dNT('.rotation[z]', [0, spd*.25, spd*.5, spd*.75, spd], [0, mag, 0, -mag, 0]),
       _c3dNT('c3dChestLid.rotation[x]', [0, spd*.5, spd], [0, mag*.6, 0]) ];
  return new THREE.AnimationClip('c3dChestRattle', spd, tr);
}
// 開いた宝箱から中身が浮かび上がるクリップ（開封のクライマックス）。
// アイテムはC3D_GEARのメッシュ（既知の絵文字）か絵文字プレート。返り値 {item, clip}＝
// 呼び出し側が chestGroup.add(item) してから再生する（テストしやすいようクリップ構築を分離）
function _c3dChestRiseClip(chestGroup, em){
  // 宝箱から出るアイテムは「絵文字プレート」で明確に見せる（抽象的な3Dギアだと何が出たか分からない、という指摘に対応）
  var inner=_c3dEmojiPlate(em,.84);
  // バウンディングボックスで視覚的中心を原点にそろえたラッパーGroupを動かす＝どのアイテムも同じ高さに浮かぶ
  var item=new THREE.Group(); item.add(inner);
  try{
    var bb=new THREE.Box3().setFromObject(inner);
    if(isFinite(bb.max.y)&&isFinite(bb.min.y)) inner.position.y-=(bb.max.y+bb.min.y)/2;
  }catch(e){}
  item.name='c3dChestItem';
  item.position.set(0,.3,0); item.scale.setScalar(.01);
  var tr=[
    _c3dVT('c3dChestItem.position',[0,.5,.9],[0,.4,.15, 0,1.58,.22, 0,1.45,.22]),      // 宝箱の“上”へしっかり浮かせる＝箱とアイテムが重ならず両方くっきり見える
    _c3dVT('c3dChestItem.scale',[0,.4,.68,.9],[.01,.01,.01, 1.18,1.18,1.18, .94,.94,.94, 1,1,1]),
    _c3dNT('c3dChestItem.rotation[y]',[0,.5,.9],[-.6,.18,0]),                         // 軽く回って正面を向いて着地（平面が横向きで消えないように）
    _c3dNT('c3dChestLid.rotation[x]',[0,.9],[-2.1,-2.1])                              // フタは開いたまま固定
  ];
  return { item:item, clip:new THREE.AnimationClip('c3dChestRise', .9, tr) };
}
function _c3dChestReveal(el, em){
  try{
    if(_c3dDead || !el || _c3dReduced() || !em) return false;
    var slot=(el.classList&&el.classList.contains('c3d-slot'))?el:(el.querySelector?el.querySelector('.c3d-slot'):null);
    if(!slot) return false;
    var v=null; for(var i=0;i<_c3dViews.length;i++){ if(_c3dViews[i].slot===slot){ v=_c3dViews[i]; break; } }
    if(!v || !v.char.userData.lid) return false;
    var prev=v.char.getObjectByName('c3dChestItem'); if(prev) v.char.remove(prev);   // 10連の使い回しで前の中身を消す
    v.char.userData.frame=C3D_CHEST_FRAME;   // 事前openを経ていない高速経路（10連quick等）でも枠を広げる
    var rc=_c3dChestRiseClip(v.char, em);
    v.char.add(rc.item);
    if(v.mixer){ try{ v.mixer.stopAllAction(); }catch(e){} }
    v.mixer=new THREE.AnimationMixer(v.char);
    var a=v.mixer.clipAction(rc.clip);
    a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished=true; a.play();
    v.animState='defeat'; v.animUntil=Infinity;   // 浮かんだ姿勢を保持（idleに戻さない）
    return true;
  }catch(e){ return false; }
}
function _c3dTriggerChest(el, phase){
  try{
    if(_c3dDead || !el || _c3dReduced()) return false;
    var slot=(el.classList&&el.classList.contains('c3d-slot'))?el:(el.querySelector?el.querySelector('.c3d-slot'):null);
    if(!slot) return false;
    var v=null; for(var i=0;i<_c3dViews.length;i++){ if(_c3dViews[i].slot===slot){ v=_c3dViews[i]; break; } }
    if(!v || !v.char.userData.lid) return false;
    var clip=_c3dChestClip(v, phase); if(!clip) return false;
    if(v.mixer){ try{ v.mixer.stopAllAction(); }catch(e){} }
    v.mixer=new THREE.AnimationMixer(v.char);
    var a=v.mixer.clipAction(clip);
    // ガタガタは次のフェーズが来るまで無限ループ、openはdefeatと同じ「保持」＝フタは開きっぱなし
    if(phase==='open'){ a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished=true; v.animState='defeat'; v.char.userData.frame=C3D_CHEST_FRAME; }
    else { a.setLoop(THREE.LoopRepeat, Infinity); v.animState='attack'; }
    v.animUntil=Infinity;
    a.play();
    return true;
  }catch(e){ return false; }
}

// =============== 描画コア（共有レンダラ1個＋転写） ===============
var C3D_RW = 260, C3D_RH = 325; // 内部レンダリング解像度
var _c3dCore = null;
function _c3dCoreGet(){
  if (_c3dDead) return null;
  if (_c3dCore) return _c3dCore;
  try {
    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(C3D_RW, C3D_RH, false);
    var scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c4d8, 1.4));
    var dir = new THREE.DirectionalLight(0xffffff, 1.7); dir.position.set(1.5, 2.5, 2.5); scene.add(dir);
    // 環境マップ（PBRの金属反射用）。上が明るく下が暗いグラデ＝金具に自然なツヤが乗る。
    // MeshToonMaterialは environment を無視するので、宝箱のPBRだけに効く（他キャラは不変）。
    try {
      var envCv = document.createElement('canvas'); envCv.width = 16; envCv.height = 64;
      var ectx = envCv.getContext('2d');
      var eg = ectx.createLinearGradient(0, 0, 0, 64);
      eg.addColorStop(0, '#eef4ff'); eg.addColorStop(.42, '#c2cee2'); eg.addColorStop(.58, '#8b96ab'); eg.addColorStop(1, '#333a4b');
      ectx.fillStyle = eg; ectx.fillRect(0, 0, 16, 64);
      var envTex = new THREE.CanvasTexture(envCv); envTex.mapping = THREE.EquirectangularReflectionMapping;
      if (THREE.PMREMGenerator){ var pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromEquirectangular(envTex).texture; envTex.dispose(); pmrem.dispose(); }
      else { scene.environment = envTex; }
    } catch(e){}
    var camera = new THREE.PerspectiveCamera(30, C3D_RW / C3D_RH, .1, 20);
    renderer.domElement.addEventListener('webglcontextlost', function(ev){
      try { ev.preventDefault(); } catch(e){}
      _c3dAllFallback();
    }, false);
    _c3dCore = { renderer: renderer, scene: scene, camera: camera };
    return _c3dCore;
  } catch(e){ _c3dDead = true; return null; }
}
// グループを1枚レンダリングして 2D ctx へ転写
function _c3dRenderInto(group, ctx, w, h){
  var core = _c3dCoreGet(); if (!core) return false;
  try {
    core.scene.add(group);
    var f = group.userData.frame;
    if (!f){
      var box = new THREE.Box3().setFromObject(group);
      var hgt = Math.max(.5, box.max.y - box.min.y), cy = (box.max.y + box.min.y) / 2;
      f = group.userData.frame = { hgt: hgt, cy: cy };
    }
    core.camera.position.set(0, f.cy + f.hgt * .1, f.hgt * 2.35);
    core.camera.lookAt(0, f.cy - f.hgt * .02, 0);
    core.renderer.render(core.scene, core.camera);
    core.scene.remove(group);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(core.renderer.domElement, 0, 0, w, h);
    return true;
  } catch(e){ try { core.scene.remove(group); } catch(e2){} return false; }
}

// ---- スチル（1回描いて dataURL・キャッシュ）----
var _c3dStillCache = {};
function _c3dStillURL(cacheKey, buildFn){
  if (_c3dStillCache[cacheKey] !== undefined) return _c3dStillCache[cacheKey];
  var url = null;
  try {
    if (char3dActive() && _c3dCoreGet()){
      var group = buildFn();
      group.rotation.y = -.28; // 立体感の出る斜め
      var cv = document.createElement('canvas'); cv.width = C3D_RW; cv.height = C3D_RH;
      if (_c3dRenderInto(group, cv.getContext('2d'), C3D_RW, C3D_RH)) url = cv.toDataURL('image/png');
    }
  } catch(e){ url = null; }
  _c3dStillCache[cacheKey] = url;
  return url;
}
// 一覧向け静止画 HTML。3D不可なら null（呼び手が SVG にフォールバック）
function char3dStillHtml(key){
  var url = _c3dStillURL('c:' + key, function(){ return char3dBuild(char3dSpecOf(key)); });
  return url ? '<img class="c3d-still" alt="" src="' + url + '">' : null;
}
function mon3dStillHtml(key){
  if (!MON3D_SPECS[key]) return null;
  var url = _c3dStillURL('m:' + key, function(){ return mon3dBuild(mon3dSpecOf(key)); });
  return url ? '<img class="c3d-still" alt="" src="' + url + '">' : null;
}

// ---- ライブ（毎フレーム転写・タップ/まばたき/追従）----
var _c3dViews = [];
var _c3dRafOn = false;
var _c3dPointer = { x: 0, y: 0 };
var _c3dPointerBound = false;
function _c3dBindPointer(){
  if (_c3dPointerBound) return; _c3dPointerBound = true;
  window.addEventListener('pointermove', function(ev){
    _c3dPointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    _c3dPointer.y = (ev.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
}
function _c3dCollectParts(root){
  var parts = { head: null, body: null, armR: null, eyes: [], wings: [] };
  root.traverse(function(o){
    if (o.userData){
      // AnimationMixerのKeyframeTrackは対象ノードを「名前」で解決するため、ここで安定した名前を付ける
      if (o.userData.isHead){ if (!o.name) o.name = 'c3dHead'; parts.head = o; }
      if (o.userData.isBody){ if (!o.name) o.name = 'c3dBody'; parts.body = o; }
      if (o.userData.isArmR){ if (!o.name) o.name = 'c3dArmR'; parts.armR = o; }
      if (o.userData.isEye) parts.eyes.push(o);
      if (o.userData.isWing){ if (!o.name) o.name = 'c3dWing' + parts.wings.length; parts.wings.push(o); }
    }
  });
  return parts;
}
function _c3dReadEquip(cosKind){
  try {
    if (typeof rpgCosState !== 'function' || typeof rpgState !== 'function' || typeof rpgCosById !== 'function') return null;
    var c = rpgCosState(rpgState());
    var eq = (c.equip && c.equip[cosKind]) || {};
    var out = {};
    ['hat','face','hand','back','ride'].forEach(function(sl){ var id = eq[sl]; if (id){ var it = rpgCosById(cosKind, id); if (it && it.em) out[sl] = it; } });
    return out;
  } catch(e){ return null; }
}
function char3dMount(slot){
  if (!char3dActive() || !_c3dCoreGet()){ _c3dSlotFallback(slot); return false; }
  try {
    var monKey = slot.getAttribute('data-c3d-mon');
    var chestRank = slot.getAttribute('data-c3d-chest');
    var group, isMon = false, isChest = (chestRank != null);
    if (isChest){ group = _c3dBuildChest(parseInt(chestRank, 10) || 0); }
    else if (monKey){ group = mon3dBuild(mon3dSpecOf(monKey)); isMon = true; }
    else {
      var key = slot.getAttribute('data-c3d');
      group = char3dBuild(char3dSpecOf(key));
      var cosKind = slot.getAttribute('data-c3d-cos');
      if (cosKind){ var eq = _c3dReadEquip(cosKind); if (eq) char3dEquip(group, eq); }
    }
    var canvas = document.createElement('canvas');
    canvas.className = 'c3d-canvas';
    canvas.width = C3D_RW; canvas.height = C3D_RH;
    slot.innerHTML = '';
    slot.appendChild(canvas);
    var v = {
      slot: slot, canvas: canvas, ctx: canvas.getContext('2d'), char: group,
      parts: _c3dCollectParts(group), float: !!group.userData.float,
      t0: performance.now(), blinkAt: performance.now() + 1800 + Math.random() * 2600,
      blinkUntil: 0, spinStart: -1,
      // バトルアニメーション（AnimationMixer）用の状態。idle以外の間は_c3dTickの
      // 手続きアイドル（揺れ・呼吸・首かしげ）を止めてミキサーに姿勢の所有権を渡す
      animState: 'idle', mixer: null, animUntil: 0,
      monCat: isMon ? (_C3D_MON_CAT[mon3dSpecOf(monKey).plan] || 'limbed') : null,
      heroKind: (isMon || isChest) ? null : char3dSpecOf(key).kind
    };
    canvas.addEventListener('pointerdown', function(){
      if (v.spinStart < 0 && v.animState === 'idle'){ v.spinStart = performance.now(); try { if (typeof sfx === 'function') sfx('click'); } catch(e){} }
    });
    slot.setAttribute('data-c3d-live', '1');
    _c3dViews.push(v);
    _c3dBindPointer();
    if (!_c3dRafOn){ _c3dRafOn = true; requestAnimationFrame(_c3dTick); }
    return true;
  } catch(e){ _c3dSlotFallback(slot); return false; }
}
function _c3dSlotFallback(slot){
  try {
    var monKey = slot.getAttribute('data-c3d-mon');
    if (monKey){ slot.innerHTML = (typeof RPG_SVG !== 'undefined' && RPG_SVG[monKey]) || '👾'; }
    else {
      var key = slot.getAttribute('data-c3d');
      slot.innerHTML = (typeof _charSVG === 'function') ? _charSVG(key) : ((typeof CHARS !== 'undefined' && CHARS[key]) ? CHARS[key].svg : '');
    }
    slot.setAttribute('data-c3d-live', 'svg');
  } catch(e){}
}
// コンテキスト喪失・致命エラー → 3D全停止して全部SVGへ（真っ白のまま、を防ぐ）
function _c3dAllFallback(){
  _c3dDead = true;
  _c3dStillCache = {};
  try {
    for (var i = _c3dViews.length - 1; i >= 0; i--) _c3dSlotFallback(_c3dViews[i].slot);
  } catch(e){}
  _c3dViews = [];
  try {
    document.querySelectorAll('img.c3d-still').forEach(function(img){
      var p = img.parentElement; if (p && p.getAttribute && p.getAttribute('data-c3d')) _c3dSlotFallback(p);
    });
  } catch(e){}
}
var _c3dLastTick = null;
function _c3dTick(){
  if (!_c3dViews.length){ _c3dRafOn = false; _c3dLastTick = null; return; }
  requestAnimationFrame(_c3dTick);
  if (document.hidden) return;
  var now = performance.now();
  // AnimationMixer用のフレーム間デルタ秒。タブ非表示からの復帰で巨大なdtが出ると
  // 一撃モーションが丸ごとスキップされるため0.1秒でクランプする
  var dt = _c3dLastTick != null ? Math.min((now - _c3dLastTick) / 1000, .1) : 0;
  _c3dLastTick = now;
  for (var i = _c3dViews.length - 1; i >= 0; i--){
    var v = _c3dViews[i];
    if (!v.slot.isConnected){ _c3dViews.splice(i, 1); continue; }
    var r = v.slot.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    var t = (now - v.t0) / 1000;
    if (v.animState === 'idle'){
      v.char.position.y = Math.sin(t * (v.float ? 1.2 : 1.8)) * (v.float ? .09 : .035);
      if (v.parts.body){
        if (v.parts.body.userData.sy0 == null) v.parts.body.userData.sy0 = v.parts.body.scale.y;
        v.parts.body.scale.y = v.parts.body.userData.sy0 * (1 + Math.sin(t * 2.2) * .015);
      }
      if (v.parts.head) v.parts.head.rotation.z = Math.sin(t * .7) * .05;
      v.parts.wings.forEach(function(w){ w.rotation.z = (w.userData.side || 1) * (.35 + Math.sin(t * 6) * .25); });
      var targetY = _c3dPointer.x * .23, targetX = _c3dPointer.y * .1;
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
    } else if (v.mixer){
      // バトルクリップ再生中：手続きアイドルを止めてミキサーが姿勢を所有する。
      // defeat（やられ）は最終姿勢を保持したまま戻さない（clampWhenFinished）
      v.mixer.update(dt);
      if (v.animState !== 'defeat' && now > v.animUntil) v.animState = 'idle';
    } else {
      v.animState = 'idle';
    }
    // まばたきはクリップと競合しないので常に動かす（攻撃中もまばたきする）
    if (now > v.blinkAt){ v.blinkUntil = now + 130; v.blinkAt = now + 1800 + Math.random() * 2800; }
    var blink = now < v.blinkUntil;
    v.parts.eyes.forEach(function(ey){ ey.scale.y += ((blink ? .12 : 1) - ey.scale.y) * .55; });
    _c3dRenderInto(v.char, v.ctx, C3D_RW, C3D_RH);
  }
}

// =============== ハイドレート＋自動監視 ===============
function char3dHydrate(root){
  if (typeof document === 'undefined') return;
  var scope = root && root.querySelectorAll ? root : document;
  var slots = scope.querySelectorAll('.c3d-slot:not([data-c3d-live])');
  for (var i = 0; i < slots.length; i++) char3dMount(slots[i]);
}
var _c3dObserver = null, _c3dHydratePending = false;
// mutation の集中発火（showQuestion 等の innerHTML 総入替）ごとに全文書 querySelectorAll する
// のを避け、1フレームに1回へまとめる（rAFデバウンス）。挙動は不変・ホットパスの隠れコストを削減。
function _c3dHydrateSoon(){
  if (_c3dHydratePending) return;
  _c3dHydratePending = true;
  var run = function(){ _c3dHydratePending = false; try{ char3dHydrate(document); }catch(e){} };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  else setTimeout(run, 16);
}
function char3dObserve(){
  if (_c3dObserver || typeof MutationObserver === 'undefined' || !document.body) return;
  _c3dObserver = new MutationObserver(_c3dHydrateSoon);
  _c3dObserver.observe(document.body, { childList: true, subtree: true });
  char3dHydrate(document);
}
