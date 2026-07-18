'use strict';
// js/char3d.js のバトルアニメーション（AnimationMixer/AnimationClip）を検証。
// unit-char3d.js と同じ方式：実 three.min.js を Function スコープに読み込み、
// WebGL 無しの Node で「クリップ構築」「トラック名解決」「mixer.update の補間値」まで実証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-char3d-anim');

const code = fs.readFileSync(path.join(ROOT, 'js', 'char3d.js'), 'utf8');
const threeSrc = fs.readFileSync(path.join(ROOT, 'js', 'three.min.js'), 'utf8');
const THREE = (new Function(threeSrc + '\nreturn THREE;'))();

const api = (new Function('THREE', code +
  '\nreturn { CHAR3D_SPECS, char3dSpecOf, char3dBuild, MON3D_SPECS, mon3dSpecOf, mon3dBuild,' +
  ' _C3D_MON_CAT, _c3dCollectParts, _c3dCombatClip, _c3dBodySy0, char3dEquip };'))(THREE);

const EPS = 1e-3;
const near = (a, b) => Math.abs(a - b) < EPS;

// ---- 1) カテゴリテーブルの網羅性：全モンスターの plan が4カテゴリのどれかに解決する ----
const CATS = ['limbed', 'winged', 'amorphous', 'rooted'];
let catOk = true;
for (const k of Object.keys(api.MON3D_SPECS)) {
  const cat = api._C3D_MON_CAT[api.MON3D_SPECS[k].plan];
  if (CATS.indexOf(cat) < 0) { catOk = false; c.ok('モンスター ' + k + '（plan=' + api.MON3D_SPECS[k].plan + '）のカテゴリ', false); }
}
c.ok('全モンスターのplanが4カテゴリのいずれかに解決', catOk);

// テスト用の view もどき（実アプリの _c3dViews エントリの必要部分だけ）
function fakeView(group, monKey) {
  return {
    char: group,
    parts: api._c3dCollectParts(group),
    monCat: monKey ? (api._C3D_MON_CAT[api.mon3dSpecOf(monKey).plan] || 'limbed') : null,
  };
}

// ---- 2) kind→クリップのディスパッチ（カテゴリごとに正しいテンプレートが選ばれる） ----
{
  const reps = { goblin: 'c3dLunge', bat: 'c3dDive', slime: 'c3dPulse', trent: 'c3dWhip' };
  for (const k of Object.keys(reps)) {
    const v = fakeView(api.mon3dBuild(api.mon3dSpecOf(k)), k);
    const clip = api._c3dCombatClip(v, 'monAttack');
    c.ok(k + ' の monAttack は ' + reps[k], clip && clip.name === reps[k]);
  }
  const vTree = fakeView(api.mon3dBuild(api.mon3dSpecOf('trent')), 'trent');
  c.ok('rooted の monHit は c3dShudder', api._c3dCombatClip(vTree, 'monHit').name === 'c3dShudder');
  const vSlime = fakeView(api.mon3dBuild(api.mon3dSpecOf('slime')), 'slime');
  c.ok('rooted 以外の monHit は c3dRecoil', api._c3dCombatClip(vSlime, 'monHit').name === 'c3dRecoil');
  // 撃破（monDefeat）はカテゴリごとに倒れ方が変わる
  const defeatReps = { goblin: 'c3dFallOver', bat: 'c3dCrash', slime: 'c3dSquash', trent: 'c3dTopple' };
  for (const k of Object.keys(defeatReps)) {
    const v = fakeView(api.mon3dBuild(api.mon3dSpecOf(k)), k);
    const clip = api._c3dCombatClip(v, 'monDefeat');
    c.ok(k + ' の monDefeat は ' + defeatReps[k], clip && clip.name === defeatReps[k]);
  }
  // ヒーローは体型（kind）でアニメーションが変わる
  const heroReps = { girl: ['c3dLungeSwing', 'c3dVictory'], shiba: ['c3dLungeSwing', 'c3dVictory'],
    owl: ['c3dSwoop', 'c3dFlyUp'], dolphin: ['c3dFlip', 'c3dFlipJump'], penguin: ['c3dSlide', 'c3dWiggle'] };
  for (const k of Object.keys(heroReps)) {
    const v = fakeView(api.char3dBuild(api.char3dSpecOf(k)), null);
    v.heroKind = api.CHAR3D_SPECS[k].kind;
    c.ok(k + ' の heroAttack は ' + heroReps[k][0], api._c3dCombatClip(v, 'heroAttack').name === heroReps[k][0]);
    c.ok(k + ' の heroVictory は ' + heroReps[k][1], api._c3dCombatClip(v, 'heroVictory').name === heroReps[k][1]);
  }
  const vHero = fakeView(api.char3dBuild(api.char3dSpecOf('girl')), null);
  vHero.heroKind = 'human';
  c.ok('heroDefeat は c3dDefeat', api._c3dCombatClip(vHero, 'heroDefeat').name === 'c3dDefeat');
  c.ok('未知kindは null', api._c3dCombatClip(vHero, 'nazo') === null);
}

// ---- 2b) 右腕グループ：全ヒーローがarmRを持ち、hand装備が腕の子になる（腕振り追従） ----
{
  let armOk = true;
  for (const k of Object.keys(api.CHAR3D_SPECS)) {
    const g = api.char3dBuild(api.char3dSpecOf(k));
    const parts = api._c3dCollectParts(g);
    if (!parts.armR || parts.armR.name !== 'c3dArmR') { armOk = false; c.ok(k + ' が armR を持つ', false); }
  }
  c.ok('全12ヒーローが右腕グループ（c3dArmR）を持つ', armOk);
  const g = api.char3dBuild(api.char3dSpecOf('boy'));
  api.char3dEquip(g, { hand: { em: '⚔️' } });
  const armR = g.userData.armR;
  c.ok('剣メッシュの親が右腕グループ', armR.children.some((ch) => ch.children && ch.children.length > 0));
  // 腕振りクリップに剣が追従する＝armRを回すとその子（剣）の世界座標が変わる
  const sword = armR.children[armR.children.length - 1];
  g.updateMatrixWorld(true);
  const before = new THREE.Vector3(); sword.getWorldPosition(before);
  armR.rotation.z = 2.6;
  g.updateMatrixWorld(true);
  const after = new THREE.Vector3(); sword.getWorldPosition(after);
  c.ok('armRを振ると装備（剣）の世界座標が追従して動く', before.distanceTo(after) > .3);
}

// ---- 3) 全モンスター×attack/hit＋全ヒーロー×4種でクリップが構築でき、トラック名が実在パーツに解決する ----
{
  let all = true;
  const checkClip = (label, v, clip) => {
    if (!(clip instanceof THREE.AnimationClip) || !(clip.duration > 0)) { all = false; c.ok(label + ' がAnimationClip', false); return; }
    for (const tr of clip.tracks) {
      const node = tr.name.split('.')[0];
      if (node === '') continue; // root対象（.position / .rotation[z]）
      if (node === 'c3dHead' && !v.parts.head) { all = false; c.ok(label + ' が存在しないheadを参照', false); }
      if (node === 'c3dBody' && !v.parts.body) { all = false; c.ok(label + ' が存在しないbodyを参照', false); }
      if (node === 'c3dArmR' && !v.parts.armR) { all = false; c.ok(label + ' が存在しないarmRを参照', false); }
      if (node.indexOf('c3dWing') === 0 && !v.parts.wings[parseInt(node.slice(7), 10)]) { all = false; c.ok(label + ' が存在しないwingを参照', false); }
    }
  };
  for (const k of Object.keys(api.MON3D_SPECS)) {
    const v = fakeView(api.mon3dBuild(api.mon3dSpecOf(k)), k);
    checkClip(k + ':monAttack', v, api._c3dCombatClip(v, 'monAttack'));
    checkClip(k + ':monHit', v, api._c3dCombatClip(v, 'monHit'));
    checkClip(k + ':monDefeat', v, api._c3dCombatClip(v, 'monDefeat'));
  }
  for (const k of Object.keys(api.CHAR3D_SPECS)) {
    const v = fakeView(api.char3dBuild(api.char3dSpecOf(k)), null);
    v.heroKind = api.CHAR3D_SPECS[k].kind;   // 実際のマウントと同じ体型別ディスパッチを通す
    ['heroAttack', 'heroHit', 'heroVictory', 'heroDefeat'].forEach((kind) => {
      checkClip(k + ':' + kind, v, api._c3dCombatClip(v, kind));
    });
  }
  c.ok('全モンスター×2種＋全ヒーロー×4種のクリップが構築でき、全トラックが実在パーツに解決', all);
}

// ---- 4) crystal は head 未タグ付け（既知の例外）：headトラックを含まないこと ----
{
  const v = fakeView(api.mon3dBuild(api.mon3dSpecOf('crystal')), 'crystal');
  c.ok('crystal は parts.head が null（既知の未タグ付け）', v.parts.head === null);
  const hit = api._c3dCombatClip(v, 'monHit');
  c.ok('crystal の被弾クリップは head トラックを含まない', hit.tracks.every((t) => t.name.indexOf('c3dHead') < 0));
}

// ---- 5) wing を持つモンスターの DiveSwoop は wing トラックを含み、名前が実ノードと一致する ----
{
  const g = api.mon3dBuild(api.mon3dSpecOf('bat'));
  const v = fakeView(g, 'bat');
  c.ok('bat は wing を2枚持つ', v.parts.wings.length === 2);
  c.ok('wing に c3dWing0/c3dWing1 の名前が付く', v.parts.wings[0].name === 'c3dWing0' && v.parts.wings[1].name === 'c3dWing1');
  const dive = api._c3dCombatClip(v, 'monAttack');
  const wingTracks = dive.tracks.filter((t) => t.name.indexOf('c3dWing') === 0);
  c.ok('DiveSwoop は wing トラックを2本含む', wingTracks.length === 2);
}

// ---- 6) mixer.update の補間値：Lunge（dir=+1）がキーフレーム通りに動き、最後は中立に戻る ----
{
  const g = api.char3dBuild(api.char3dSpecOf('girl'));
  const v = fakeView(g, null);
  const sy0 = api._c3dBodySy0(v);
  const clip = api._c3dCombatClip(v, 'heroAttack');
  const mixer = new THREE.AnimationMixer(g);
  const a = mixer.clipAction(clip);
  a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play();

  mixer.update(.12);   // ちょうど2番目のキーフレーム（振りかぶり）
  c.ok('t=0.12 でx=-0.1（振りかぶり）', near(g.position.x, -.1));
  c.ok('t=0.12 でrotation.z=+0.12（後傾）', near(g.rotation.z, .12));
  c.ok('t=0.12 で腕が振りかぶり（armR.rotation.z≈2.6）', near(v.parts.armR.rotation.z, 2.6));
  mixer.update(.14);   // t=0.26（打撃）
  c.ok('t=0.26 でx=+0.4（突進）', near(g.position.x, .4));
  c.ok('t=0.26 でrotation.z=-0.3（前傾）', near(g.rotation.z, -.3));
  c.ok('t=0.26 でbodyが縮む（sy0×0.9）', near(v.parts.body.scale.y, sy0 * .9));
  mixer.update(1.0);   // 終端を大きく超える（clamp）
  c.ok('終了後はx=0（中立に戻る）', near(g.position.x, 0));
  c.ok('終了後はrotation.z=0', near(g.rotation.z, 0));
  c.ok('終了後はbodyがsy0に戻る', near(v.parts.body.scale.y, sy0));
}

// ---- 7) Defeat は最終姿勢を保持する（clampWhenFinished） ----
{
  const g = api.char3dBuild(api.char3dSpecOf('shiba'));
  const v = fakeView(g, null);
  const clip = api._c3dCombatClip(v, 'heroDefeat');
  const mixer = new THREE.AnimationMixer(g);
  const a = mixer.clipAction(clip);
  a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play();
  mixer.update(2.0);   // 終端超え
  c.ok('やられ姿勢を保持（rotation.z≈1.25）', near(g.rotation.z, 1.25));
  c.ok('やられ位置を保持（y≈-0.18）', near(g.position.y, -.18));
}

// ---- 7b) 敵撃破（monDefeat）も全カテゴリで最終の倒れ姿勢を保持する（clampWhenFinished） ----
{
  const holdChecks = {
    goblin: (g, v, sy0) => near(g.rotation.z, -1.25) && near(g.position.y, -.18),            // limbed: 横倒れ
    bat:    (g, v, sy0) => near(g.rotation.z, -1.35) && near(g.position.y, -.34),            // winged: 墜落
    slime:  (g, v, sy0) => near(v.parts.body.scale.y, sy0 * .22) && near(g.position.y, -.26),// amorphous: ぺしゃんこ
    trent:  (g, v, sy0) => near(g.rotation.z, -1.42),                                        // rooted: 伐倒
  };
  for (const k of Object.keys(holdChecks)) {
    const g = api.mon3dBuild(api.mon3dSpecOf(k));
    const v = fakeView(g, k);
    const sy0 = api._c3dBodySy0(v);   // 再生前に捕捉（userData.sy0が無い体型は再生後だとつぶれた値になる）
    const clip = api._c3dCombatClip(v, 'monDefeat');
    const mixer = new THREE.AnimationMixer(g);
    const a = mixer.clipAction(clip);
    a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play();
    mixer.update(2.0);   // 終端超え
    c.ok(k + ' の撃破姿勢を保持（' + clip.name + '）', holdChecks[k](g, v, sy0));
  }
  // winged は翼がだらりと垂れた姿勢で保持される
  const gBat = api.mon3dBuild(api.mon3dSpecOf('bat'));
  const vBat = fakeView(gBat, 'bat');
  const mixBat = new THREE.AnimationMixer(gBat);
  const aBat = mixBat.clipAction(api._c3dCombatClip(vBat, 'monDefeat'));
  aBat.setLoop(THREE.LoopOnce, 1); aBat.clampWhenFinished = true; aBat.play();
  mixBat.update(2.0);
  c.ok('bat 撃破後は翼が垂れる（|rotation.z|≈0.03）', vBat.parts.wings.every((w) => Math.abs(Math.abs(w.rotation.z) - .03) < EPS));
}

// ---- 8) 旧RPGバトル撤去後：_c3dTriggerCombat のAPIはchar3d.jsに残る（index.htmlからは未使用）----
// 旧RPGの3Dバトル演出（heroAttack等のトリガー呼び出し）はコード撤去済み。タクトは独自の2D演出を使う。
// 戦闘クリップ生成そのものは §1〜7 で網羅済みなので、ここではAPIの存在のみ確認する。
{
  c.ok('_c3dTriggerCombat API が char3d.js に定義されている（撤去後も残置）', code.indexOf('function _c3dTriggerCombat') >= 0);
}

c.done();
