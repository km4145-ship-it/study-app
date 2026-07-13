'use strict';
// 分離した js/audio.js（効果音/BGM）を、AudioContext等をスタブして“実際に鳴らして”検証する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-audio');

function stubNode() {
  return {
    frequency: { setValueAtTime() {}, value: 0, exponentialRampToValueAtTime() {} },
    gain: { setValueAtTime() {}, value: 0, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
    type: '', buffer: null, connect() {}, start() {}, stop() {},
  };
}
class AC {
  constructor() { this.destination = {}; this.currentTime = 0; this.state = 'running'; this.sampleRate = 44100; }
  createOscillator() { return stubNode(); }
  createGain() { return stubNode(); }
  createConvolver() { return stubNode(); }
  createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect() {} }; }
  createBufferSource() { return stubNode(); }
  createBuffer(a, b) { return { getChannelData: () => new Float32Array(b) }; }
  resume() {}
}
const win = { AudioContext: AC };
const safeLS = { getItem: () => null, setItem() {} };
const doc = {
  getElementById: () => null,
  createElement: () => ({ style: { setProperty() {} }, classList: { add() {}, remove() {} }, appendChild() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }) }),
  body: { appendChild() {} },
};

const code = fs.readFileSync(path.join(ROOT, 'js', 'audio.js'), 'utf8');
const api = (new Function('window', 'AudioContext', 'safeLS', 'document', 'unlockSpeech', 'speakAndWait',
  code + '\nreturn { sfx, bgmPlay, bgmStop, bgmEnabled, sfxEnabled: (typeof sfxEnabled!=="undefined"?sfxEnabled:null), vibe: (typeof vibe!=="undefined"?vibe:null), sparkleBurst: (typeof sparkleBurst!=="undefined"?sparkleBurst:null) };'))(
  win, AC, safeLS, doc, function () {}, function () {});

['sfx', 'bgmPlay', 'bgmStop', 'bgmEnabled'].forEach((f) => c.ok(f + ' が関数', typeof api[f] === 'function'));

let threw = null;
try { ['correct', 'wrong', 'hurtbig', 'crit', 'coin', 'fanfare', 'attack'].forEach((n) => api.sfx(n)); api.bgmPlay('map'); api.bgmPlay('battle'); api.bgmPlay('boss'); api.bgmStop(); }
catch (e) { threw = e.message; }
c.ok('sfx各種＋bgm再生/停止が例外なく実行できる（Audio無し＝合成フォールバック経路）', threw === null);

// ===== BGMファイル再生（Audio要素あり環境）=====
const audioLog = { plays: 0 };
class AudioStub {
  constructor() { this.loop = false; this.volume = 1; this.paused = true; this.src = ''; this.onerror = null; }
  play() { audioLog.plays++; this.paused = false; return { catch() {} }; }
  pause() { this.paused = true; }
}
const api2 = (new Function('window', 'AudioContext', 'safeLS', 'document', 'unlockSpeech', 'speakAndWait', 'Audio',
  code + '\nreturn { bgmPlay, bgmStop, files: BGM_FILES, el: function(){ return _bgmAudio; }, bad: function(){ return _bgmFileBad; } };'))(
  win, AC, safeLS, doc, function () {}, function () {}, AudioStub);

// BGM_FILES が指す音源ファイルが実在する（配信漏れ防止）
Object.keys(api2.files).forEach((t) => c.ok('音源が実在: ' + api2.files[t], fs.existsSync(path.join(ROOT, api2.files[t]))));

api2.bgmPlay('map');
const el = api2.el();
c.ok('bgmPlay(map) がファイル音源を再生する', el && el.src === 'assets/bgm/map.m4a' && !el.paused);
c.ok('ループ再生になっている', el.loop === true);
c.ok('音量は控えめ（効果音を邪魔しない）', el.volume > 0 && el.volume < 0.6);
api2.bgmPlay('battle');
c.ok('曲の切り替えで src が変わる', el.src === 'assets/bgm/battle.m4a');
const playsBefore = audioLog.plays;
api2.bgmPlay('battle');
c.ok('同じ曲の再指定では再スタートしない', audioLog.plays === playsBefore);
api2.bgmStop();
c.ok('bgmStop で一時停止する', el.paused === true);

// 読み込み失敗（404等）→合成へフォールバックし、以後そのトラックはファイルを再試行しない
let threw2 = null;
try { api2.bgmPlay('boss'); el.onerror(); api2.bgmStop(); api2.bgmPlay('boss'); api2.bgmStop(); }
catch (e) { threw2 = e.message; }
c.ok('読み込み失敗時に合成フォールバックが例外なく動く', threw2 === null);
c.ok('失敗したトラックは記録される', api2.bad().boss === true);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は sfx を再定義しない', html.indexOf('\nfunction sfx(name)') < 0);
c.ok('index.html は js/audio.js を読み込む', html.indexOf('<script src="js/audio.js') >= 0);
c.done();
