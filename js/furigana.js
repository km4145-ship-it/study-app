/* furigana.js：index.html から分離した classic script（データのみ・挙動不変・グローバル）。
   メイン <script> より前に読み込む（?v でキャッシュ回避）。 */
// ===== 視覚的ふりがな（小学生向け・kuromoji 遅延ロード／失敗してもアプリは止めない）=====
var _furiTok=null,_furiLoading=false,_furiFailed=false;
function furiMode(){ try{ return safeLS.getItem('furigana')||'off'; }catch(e){ return 'off'; } }
function furiOn(){ var m=furiMode(); if(m==='off') return false; if(m==='on') return true; try{ return (typeof muGradeBand==='function' && muGradeBand()==='elem'); }catch(e){ return false; } }
function _k2h(x){ return x.replace(/[ァ-ヶ]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0x60);}); }
function _furiK(x){ return /[一-龯々]/.test(x); }
function furiHTML(text){
  if(!_furiTok) return null;
  try{
    return _furiTok.tokenize(String(text)).map(function(t){
      var sf=t.surface_form; var r=(t.reading&&t.reading!=='*')?_k2h(t.reading):null;
      if(!r||!_furiK(sf)) return escapeHtml(sf);
      var i=sf.length,j=r.length;
      while(i>0&&j>0&&sf[i-1]===r[j-1]&&!_furiK(sf[i-1])){i--;j--;}
      var a=0,b=0;
      while(a<i&&b<j&&sf[a]===r[b]&&!_furiK(sf[a])){a++;b++;}
      var pre=sf.slice(0,a),mid=sf.slice(a,i),post=sf.slice(i),rt=r.slice(b,j);
      if(!mid||!rt) return escapeHtml(sf);
      return escapeHtml(pre)+'<ruby>'+escapeHtml(mid)+'<rt>'+escapeHtml(rt)+'</rt></ruby>'+escapeHtml(post);
    }).join('');
  }catch(e){ return null; }
}
function furiApply(id,text){
  var el=document.getElementById(id); if(!el) return;
  if(furiOn() && _furiTok){ var h=furiHTML(text); if(h!=null){ el.innerHTML=h; return; } }
  el.textContent=String(text==null?'':text);
  if(furiOn()) _furiLoad();
}
function _furiLoad(){
  if(_furiTok||_furiLoading||_furiFailed) return;
  _furiLoading=true;
  try{
    if(typeof window.kuromoji!=='undefined'){ _furiBuild(); return; }
    var sc=document.createElement('script');
    sc.src='https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js';
    sc.onload=_furiBuild; sc.onerror=function(){ _furiLoading=false; _furiFailed=true; };
    document.head.appendChild(sc);
  }catch(e){ _furiLoading=false; _furiFailed=true; }
}
function _furiBuild(){
  try{
    kuromoji.builder({dicPath:'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/'}).build(function(err,tok){
      _furiLoading=false;
      if(err||!tok){ _furiFailed=true; return; }
      _furiTok=tok;
      try{ var qs=document.getElementById('quiz-screen'); if(qs && qs.style.display!=='none' && typeof currentQuestions!=='undefined' && currentQuestions && currentQuestions[currentIndex]) showQuestion(true); }catch(e){}
    });
  }catch(e){ _furiLoading=false; _furiFailed=true; }
}
function setFurigana(m){
  try{ safeLS.setItem('furigana',m); }catch(e){}
  var h=document.getElementById('furi-hint'); if(h) h.textContent=(m==='off'?'ふりがなは表示しません。':(m==='on'?'つねにふりがなを表示します。':'小学生のあいだは自動でふりがなを表示します（中学生は自動でなし）。'));
  if(furiOn()) _furiLoad();
  try{ var qs=document.getElementById('quiz-screen'); if(qs && qs.style.display!=='none' && currentQuestions && currentQuestions[currentIndex]) showQuestion(true); }catch(e){}
  showToast('🈁','ふりがな',(m==='off'?'なし':(m==='on'?'いつも表示':'自動（小学生）')));
}
