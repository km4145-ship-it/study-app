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
c.ok('sfx各種＋bgm再生/停止が例外なく実行できる', threw === null);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は sfx を再定義しない', html.indexOf('\nfunction sfx(name)') < 0);
c.ok('index.html は js/audio.js を読み込む', html.indexOf('<script src="js/audio.js') >= 0);
c.done();
