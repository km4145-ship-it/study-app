/* audio.js：index.html から分離した classic script（データのみ・挙動不変・グローバル）。
   メイン <script> より前に読み込む（?v でキャッシュ回避）。 */
// ===== 効果音（Web Audioで合成・オフライン自己完結。外部ファイル不要）=====
var _sfxCtx=null;
function _sfxAC(){ if(_sfxCtx) return _sfxCtx; try{ _sfxCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ _sfxCtx=null; } return _sfxCtx; }
function sfxEnabled(){ try{ return safeLS.getItem('sfx_on')!=='0'; }catch(e){ return true; } }
function vibeEnabled(){ try{ return safeLS.getItem('vibe_on')!=='0'; }catch(e){ return true; } }
// 残響バス（合成リバーブ）：全効果音をここに通して「響き」を出し、こもりを解消する
var _sfxBus=null;
function _sfxOut(ac){
  try{
    if(_sfxBus && _sfxBus._ac===ac) return _sfxBus.input;
    var master=ac.createGain(); master.gain.value=0.95; master.connect(ac.destination);
    var conv=ac.createConvolver();
    var len=Math.floor(ac.sampleRate*1.0), ir=ac.createBuffer(2,len,ac.sampleRate);
    for(var ch=0;ch<2;ch++){ var d=ir.getChannelData(ch); for(var i=0;i<len;i++){ d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.8); } }
    conv.buffer=ir;
    var wet=ac.createGain(); wet.gain.value=0.22; conv.connect(wet); wet.connect(master);
    var input=ac.createGain(); input.connect(master); input.connect(conv);
    _sfxBus={_ac:ac, input:input};
    return input;
  }catch(e){ return ac.destination; }   // 残響生成に失敗しても素の音は必ず鳴らす（無音防止）
}
// キラキラ（高音の輝き）：連続正解や豪華演出で重ねる
function _sparkle(ac,t){ [1568,2093,2637].forEach(function(f,i){ _tone(ac,f,t+i*0.05,0.14,'triangle',0.09); }); }
var _sfxCombo=0;  // 連続正解カウント（正解で+1、まちがいで0）
function _tone(ac,f,t0,dur,type,vol){ try{ var o=ac.createOscillator(),g=ac.createGain(); o.type=type||'sine'; o.frequency.setValueAtTime(f,t0); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(vol||0.2,t0+0.012); g.gain.exponentialRampToValueAtTime(0.0008,t0+dur); o.connect(g); g.connect(_sfxOut(ac)); o.start(t0); o.stop(t0+dur+0.03); }catch(e){} }
function _slide(ac,f1,f2,t0,dur,type,vol){ try{ var o=ac.createOscillator(),g=ac.createGain(); o.type=type||'square'; o.frequency.setValueAtTime(f1,t0); o.frequency.exponentialRampToValueAtTime(Math.max(30,f2),t0+dur); g.gain.setValueAtTime(vol||0.15,t0); g.gain.exponentialRampToValueAtTime(0.0008,t0+dur); o.connect(g); g.connect(_sfxOut(ac)); o.start(t0); o.stop(t0+dur+0.03); }catch(e){} }
function _noise(ac,t0,dur,vol){ try{ var len=Math.floor(ac.sampleRate*dur), b=ac.createBuffer(1,len,ac.sampleRate), d=b.getChannelData(0); for(var i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len); var n=ac.createBufferSource(); n.buffer=b; var g=ac.createGain(); g.gain.setValueAtTime(vol||0.15,t0); g.gain.exponentialRampToValueAtTime(0.001,t0+dur); var f=ac.createBiquadFilter(); f.type='highpass'; f.frequency.value=700; n.connect(f); f.connect(g); g.connect(_sfxOut(ac)); n.start(t0); n.stop(t0+dur); }catch(e){} }
function sfx(name){
  if(!sfxEnabled()) return;
  var ac=_sfxAC(); if(!ac) return;
  try{ if(ac.state==='suspended') ac.resume(); }catch(e){}
  var t=ac.currentTime;
  switch(name){
    case 'click':   _tone(ac,660,t,0.07,'triangle',0.12); break;
    case 'correct': {
      _sfxCombo++;
      // わかりやすい「ピンポン♪」＝毎回同じ 明るい上昇チャイム（正解だと一発で分かる・少し大きめ）
      [784,1047,1319,1760].forEach(function(f,i){ _tone(ac,f,t+i*0.07,0.17,'triangle',0.28); });   // G5→C6→E6→A6
      _tone(ac,2093,t+0.27,0.26,'sine',0.18);                                          // きらめく高音ベルで締め
      if(_sfxCombo>=3) _sparkle(ac,t+0.22);                                            // 3連続でキラキラ追加
      if(_sfxCombo>=5){ _tone(ac,2637,t+0.34,0.3,'sine',0.15); }                       // 5連続でさらに豪華
      break;
    }
    case 'wrong': {   // 厳しいブザー「ブブー」＝低い不協和音を2連＋ノイズ、音量大きめ（気持ちを引き締める）
      _sfxCombo=0;
      _tone(ac,196,t,0.17,'sawtooth',0.34); _tone(ac,208,t,0.17,'square',0.24);         // 1発目：低くにごった音
      _tone(ac,165,t+0.19,0.36,'sawtooth',0.38); _tone(ac,175,t+0.19,0.36,'square',0.26); // 2発目：さらに低く長め
      _noise(ac,t,0.12,0.16);                                                            // ザラつきで厳しさ
      break;
    }
    case 'attack':  _noise(ac,t,0.1,0.16); _slide(ac,420,120,t,0.12,'square',0.13); break;
    case 'crit':    [784,988,1319,1568].forEach(function(f,i){ _tone(ac,f,t+i*0.05,0.14,'square',0.15); }); break;
    case 'miss':    _sfxCombo=0; _slide(ac,260,150,t,0.2,'sine',0.11); break;
    case 'swish':   _slide(ac,720,180,t,0.14,'sawtooth',0.14); _noise(ac,t,0.1,0.1); break;   // 敵が斬りかかる風切り音
    case 'hurtbig': {   // 敵にやられた重い一撃（音量大きめ）
      _sfxCombo=0;
      _noise(ac,t,0.18,0.34);                       // ドッ という衝撃
      _slide(ac,300,55,t,0.42,'sawtooth',0.38);     // 低く沈む被弾音
      _tone(ac,110,t,0.36,'square',0.26);           // 重い芯
      _slide(ac,240,80,t+0.15,0.3,'sawtooth',0.3);  // 追い打ち
      break;
    }
    case 'defeat':  _slide(ac,600,80,t,0.4,'sawtooth',0.15); [1047,1319].forEach(function(f,i){ _tone(ac,f,t+0.26+i*0.08,0.2,'sine',0.13); }); break;
    case 'coin':    _tone(ac,988,t,0.07,'square',0.15); _tone(ac,1319,t+0.06,0.14,'square',0.15); break;
    case 'crystal': [1047,1319,1568,2093].forEach(function(f,i){ _tone(ac,f,t+i*0.06,0.22,'sine',0.13); }); break;
    case 'levelup': [523,659,784,1047].forEach(function(f,i){ _tone(ac,f,t+i*0.09,0.24,'triangle',0.2); }); _sparkle(ac,t+0.42); break;
    case 'unlock':  _tone(ac,440,t,0.09,'square',0.13); _tone(ac,880,t+0.09,0.16,'square',0.13); break;
    case 'fanfare': [523,659,784,1047,784,1047,1319].forEach(function(f,i){ _tone(ac,f,t+i*0.12,0.3,'triangle',0.2); }); _sparkle(ac,t+0.5); _sparkle(ac,t+0.78); break;
    case 'start':   [392,523,659].forEach(function(f,i){ _tone(ac,f,t+i*0.08,0.2,'triangle',0.17); }); break;
    case 'charge':  _slide(ac,280,1100,t,0.95,'sawtooth',0.09); _slide(ac,560,2200,t,0.95,'triangle',0.05); break;   // ガチャ溜め音
    case 'powerup': _slide(ac,440,1760,t,0.7,'sawtooth',0.1); _slide(ac,660,2640,t,0.7,'triangle',0.06); _tone(ac,880,t,0.5,'sine',0.06); break;   // フェーズ昇格＝溜めを一段強く
    case 'drumroll': {   // 開封直前のドラムロール（連打＋じわ上げ）
      for(var _d=0;_d<14;_d++){ var _dt=t+_d*0.055; _noise(ac,_dt,0.05,0.10+_d*0.006); }
      _slide(ac,120,300,t,0.8,'sine',0.05);
      break;
    }
    case 'reveal':  _noise(ac,t,0.16,0.3); _tone(ac,90,t,0.4,'sine',0.28); _slide(ac,180,1200,t,0.18,'square',0.12); _sparkle(ac,t+0.08); break;   // 開封のドンッ！
    case 'legendary': {   // LR＝荘厳ファンファーレ（fanfareより長く豪華）
      [523,784,1047,1319,1047,1319,1568,2093].forEach(function(f,i){ _tone(ac,f,t+i*0.13,0.34,'triangle',0.2); });
      _tone(ac,130.81,t,0.9,'sawtooth',0.08); _tone(ac,196,t,0.9,'sawtooth',0.06);   // 重厚な低音の芯
      _sparkle(ac,t+0.5); _sparkle(ac,t+0.82); _sparkle(ac,t+1.1);
      break;
    }
    default: break;
  }
}
function vibe(p){ if(!vibeEnabled()) return; try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
// ===== BGM（音楽ファイル(m4a)をループ再生。読めない環境ではWeb Audio合成にフォールバック）=====
function bgmEnabled(){ try{ return safeLS.getItem('bgm_on')!=='0'; }catch(e){ return true; } }   // 既定オン（設定でオフにできる）
var BGM_FILES={ map:'assets/bgm/map.m4a', battle:'assets/bgm/battle.m4a', boss:'assets/bgm/boss.m4a' };   // トラック名→音源（AAC 96kbps・軽量化済み）
var _bgmGain=null, _bgmTimer=null, _bgmCur=null, _bgmStep=0;
var _bgmAudio=null, _bgmFileBad={};   // 読み込みに失敗したトラックは以後合成で鳴らす
function _bgmFilePlay(track){
  if(typeof Audio==='undefined' || !BGM_FILES[track] || _bgmFileBad[track]) return false;
  try{
    if(!_bgmAudio){ _bgmAudio=new Audio(); _bgmAudio.loop=true; _bgmAudio.volume=0.35; }   // BGMは控えめ（効果音を邪魔しない）
    _bgmAudio.onerror=function(){ _bgmFileBad[track]=true; if(_bgmCur===track) _bgmSynthPlay(track); };   // 404/オフライン→合成へ
    _bgmAudio.src=BGM_FILES[track];
    var p=_bgmAudio.play();
    if(p && p.catch) p.catch(function(){});   // 自動再生ブロックは無視（次のユーザー操作の bgmPlay で鳴る）
    return true;
  }catch(e){ return false; }
}
function _bgmFreqs(track){
  var F3=174.61,G3=196,A3=220,B3=246.94,C=261.63,D=293.66,E=329.63,F=349.23,G=392,A=440,B=493.88,C2=523.25,D2=587.33,E2=659.25,F2=698.46,G2=783.99;
  // ゆったり明るい冒険テーマ／弾む戦闘／重厚なボス（以前より長く反復感を減らした新メロディ）
  if(track==='map')    return [G,C2,E2,D2, C2,E2,G2,E2, A,C2,E2,C2, D2,B,G,B, C2,E2,D2,C2, A,C2,E2,A, F,A,C2,F, G,B,D2,G];
  if(track==='battle') return [A,C2,E2,A, G,B,D2,G, F,A,C2,F, E2,D2,C2,B, A,C2,E2,C2, D2,B,G,B, C2,A,F,A, G,E,C2,G];
  if(track==='boss')   return [A3,E,A3,B3, C,A3,E,C, G3,D,G3,B3, F3,C,A3,F3, A3,C,E,G, F,A,C2,A, E,G,B,E2, A3,E,C,A3];
  return [C,E,G,C2];
}
function bgmPlay(track){
  if(!bgmEnabled()){ bgmStop(); return; }
  if(_bgmCur===track && (_bgmTimer || (_bgmAudio && !_bgmAudio.paused))) return;   // 同じ曲を再生中なら何もしない
  bgmStop(); _bgmCur=track;
  if(_bgmFilePlay(track)) return;   // まず音源ファイル。ダメなら下の合成へ
  _bgmSynthPlay(track);
}
function _bgmSynthPlay(track){
  var ac=_sfxAC(); if(!ac) return; try{ if(ac.state==='suspended') ac.resume(); }catch(e){}
  _bgmStep=0;
  if(!_bgmGain){ _bgmGain=ac.createGain(); _bgmGain.gain.value=0.08; _bgmGain.connect(ac.destination); }   // BGMは控えめ（効果音を邪魔しない）
  var freqs=_bgmFreqs(track), noteDur=(track==='map')?0.32:0.22, wave=(track==='boss')?'sawtooth':(track==='battle'?'square':'triangle');
  function bar(){
    if(_bgmCur!==track) return;
    var ac2=_sfxAC(); if(!ac2){ return; } var t=ac2.currentTime;
    for(var k=0;k<4;k++){ var f=freqs[(_bgmStep+k)%freqs.length];
      try{ var o=ac2.createOscillator(), g=ac2.createGain(); o.type=wave; o.frequency.value=f;
        var st=t+k*noteDur; g.gain.setValueAtTime(0.0001,st); g.gain.linearRampToValueAtTime(0.9,st+0.02); g.gain.exponentialRampToValueAtTime(0.0015,st+noteDur*0.92);
        o.connect(g); g.connect(_bgmGain); o.start(st); o.stop(st+noteDur); }catch(e){}
    }
    _bgmStep=(_bgmStep+4)%freqs.length;
    _bgmTimer=setTimeout(bar, noteDur*4*1000);
  }
  bar();
}
function bgmStop(){ _bgmCur=null; if(_bgmTimer){ clearTimeout(_bgmTimer); _bgmTimer=null; } if(_bgmAudio){ try{ _bgmAudio.pause(); }catch(e){} } }
// 正解のキラッと演出（要素の近くに星が弾ける）
function sparkleBurst(target){
  try{
    var host=document.getElementById('sparkle-layer'); if(!host){ host=document.createElement('div'); host.id='sparkle-layer'; document.body.appendChild(host); }
    var r=(target&&target.getBoundingClientRect)?target.getBoundingClientRect():{left:innerWidth/2-20,top:innerHeight/2-20,width:40,height:40};
    var cx=r.left+r.width/2, cy=r.top+r.height/2;
    var em=['⭐','✨','🌟','💫','🎉'];
    for(var i=0;i<10;i++){ (function(i){ var s=document.createElement('div'); s.className='sparkle'; s.textContent=em[i%em.length];
      var ang=Math.PI*2*i/10+Math.random(), dist=40+Math.random()*46;
      s.style.left=cx+'px'; s.style.top=cy+'px'; s.style.setProperty('--dx',(Math.cos(ang)*dist)+'px'); s.style.setProperty('--dy',(Math.sin(ang)*dist)+'px');
      host.appendChild(s); setTimeout(function(){ if(s.parentNode) s.parentNode.removeChild(s); },750); })(i); }
  }catch(e){}
}

// 声をテスト（ボタンから直接呼ぶ。ユーザー操作なので音声が許可される）
function testVoice() {
  unlockSpeech();
  speakAndWait('こんにちは、千咲！声のテストだよ。聞こえるかな？');
}

// 音声ステータスを画面に出す
function showVoiceError(msg, detail) {
  const el = document.getElementById('voice-status');
  if (el) { el.textContent = '⚠️ ' + msg; el.className = 'voice-status voice-off'; }
  if (detail) console.warn('[voice]', msg, detail);
}
function setVoiceStatus(txt, on) {
  const el = document.getElementById('voice-status');
  if (el) { el.textContent = txt; el.className = 'voice-status ' + (on ? 'voice-on' : 'voice-off'); }
}
