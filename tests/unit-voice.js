'use strict';
// 内蔵音声の強化ロジック（声のランク付け・キャラ別声色・声の分散・長文分割）を検証。
// index.html のインライン関数を抽出してサンドボックスで評価する。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-voice');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function sliceBetween(a, b) { const i = html.indexOf(a); const j = html.indexOf(b, i); return (i < 0 || j < 0) ? '' : html.slice(i, j + b.length); }

const scoreSrc = sliceBetween('function ttsScore(v){', 'return s; }');
const blockStart = html.indexOf('var SPEAK_TUNE = {');
const retIdx = html.indexOf('return out.length?out:[s];', blockStart);
const blockEnd = html.indexOf('}', retIdx) + 1;
const blockSrc = html.slice(blockStart, blockEnd);
c.ok('ttsScore を抽出できた', scoreSrc.indexOf('function ttsScore') >= 0);
c.ok('声ブロック（SPEAK_TUNE〜_ttsChunks）を抽出できた', blockStart >= 0 && blockEnd > blockStart && blockSrc.indexOf('_ttsChunks') >= 0);

// スタブ：CHARS / safeLS / ja音声リスト
const CHARS = { girl:{ voice:'hana' }, boy:{ voice:'loco' }, tiger:{ voice:'kai' }, owl:{ voice:'hana' }, mystery:{ voice:'kai' } };
let LS = {};
const safeLS = { getItem:(k) => (k in LS ? LS[k] : ''), setItem:(k, v) => { LS[k] = v; } };
const FAKE_VOICES = [
  { name:'Kyoko', voiceURI:'Kyoko', lang:'ja-JP', localService:true },
  { name:'Google 日本語', voiceURI:'google-ja', lang:'ja-JP', localService:false },
  { name:'O-ren', voiceURI:'oren', lang:'ja-JP', localService:true }
];
const ttsAllJaVoices = () => FAKE_VOICES.slice();

const api = (new Function('CHARS', 'safeLS', 'ttsAllJaVoices',
  scoreSrc + '\n' + blockSrc + '\nreturn { ttsScore:ttsScore, speakTune:speakTune, _ttsChunks:_ttsChunks, _charVoiceIndex:_charVoiceIndex, pickJaVoiceForChar:pickJaVoiceForChar, SPEAK_TUNE:SPEAK_TUNE };'
))(CHARS, safeLS, ttsAllJaVoices);

// ---- ttsScore：高品質＞低品質 ----
{
  const kyoko = api.ttsScore({ name:'Kyoko', localService:true });
  const enhanced = api.ttsScore({ name:'Siri Voice 2 (Enhanced)', localService:true });
  const compact = api.ttsScore({ name:'Microsoft Haruka Desktop (Compact)', localService:false });
  const espeak = api.ttsScore({ name:'Japanese eSpeak', localService:true });
  c.ok('Enhanced は Compact より高評価', enhanced > compact);
  c.ok('Kyoko は eSpeak より高評価', kyoko > espeak);
  c.ok('低品質(compact/espeak)は減点される', compact < api.ttsScore({ name:'Kyoko', localService:true }));
}

// ---- 長文分割 ----
{
  LS = {};
  c.eq('短文は1チャンク', api._ttsChunks('みじかい').length, 1);
  const three = api._ttsChunks('こんにちは。げんきですか？がんばろう！');
  c.ok('句点で区切って1〜2チャンク', three.length >= 1 && three.join('') === 'こんにちは。げんきですか？がんばろう！');
  const longtxt = ('ながいぶんしょうです。').repeat(12);   // 90字を超える → 複数チャンク
  c.ok('長文は複数チャンクに割れる', api._ttsChunks(longtxt).length >= 2);
  c.eq('空文字は0チャンク', api._ttsChunks('').length, 0);
}

// ---- キャラ別の声色（聞き分けられる） ----
{
  c.ok('ねこは高め・くまは低め', api.speakTune('cat').pitch > api.speakTune('bear').pitch);
  c.ok('鬼コーチ(tiger)は低い', api.speakTune('tiger').pitch < api.speakTune('girl').pitch);
  c.ok('未知キーはプロファイルへフォールバック', api.speakTune('mystery') && typeof api.speakTune('mystery').pitch === 'number');
  // 12キャラすべてに声色定義がある
  ['girl','boy','owl','shiba','cat','rabbit','fox','bear','tiger','panda','dolphin','penguin'].forEach((k) => {
    c.ok('声色定義あり: ' + k, !!api.SPEAK_TUNE[k]);
  });
}

// ---- キャラ別の声分散＆手動選択の尊重 ----
{
  LS = {};
  c.ok('_charVoiceIndex は決定的', api._charVoiceIndex('cat') === api._charVoiceIndex('cat'));
  c.ok('キャラが違えばインデックスも違う', api._charVoiceIndex('cat') !== api._charVoiceIndex('bear'));
  const vCat = api.pickJaVoiceForChar('cat'), vBear = api.pickJaVoiceForChar('bear');
  const topNames = ['Kyoko', 'O-ren'];   // 上位同点圏（score7）＝分散対象
  c.ok('選ばれる声は上位圏から', !!vCat && !!vBear && topNames.indexOf(vCat.name) >= 0 && topNames.indexOf(vBear.name) >= 0);
  // 多数の上位声があれば実際に分散する（4声で複数キャラを引くと2種以上出る）
  const many = [
    { name:'A', voiceURI:'a', lang:'ja-JP', localService:true },
    { name:'B', voiceURI:'b', lang:'ja-JP', localService:true },
    { name:'C', voiceURI:'c', lang:'ja-JP', localService:true },
    { name:'D', voiceURI:'d', lang:'ja-JP', localService:true }
  ];
  const api2 = (new Function('CHARS', 'safeLS', 'ttsAllJaVoices',
    scoreSrc + '\n' + blockSrc + '\nreturn { pickJaVoiceForChar:pickJaVoiceForChar };'
  ))(CHARS, { getItem:() => '', setItem:() => {} }, () => many.slice());
  const picks = ['cat','bear','rabbit','owl','fox','panda'].map((k) => api2.pickJaVoiceForChar(k).name);
  c.ok('上位声が多いと実際に分散する（2種以上）', new Set(picks).size >= 2);
  LS = { tts_voice:'google-ja' };
  c.ok('手動指定した声を尊重する', api.pickJaVoiceForChar('cat').voiceURI === 'google-ja');
}

c.done();
