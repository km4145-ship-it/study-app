/* util.js：副作用のない純粋ヘルパ（HTMLエスケープ・トピックキー・日付整形）。
   index.html から分離した classic script。純粋関数のみ・挙動不変・グローバル。
   tests/unit-util.js で挙動を固定。メイン <script> より前に読み込む。 */
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function topicKey(area, sub){ return area + '|' + sub; }
function dateKeyOffset(off){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+off); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function todayKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function fmtTime(sec){ sec=Math.round(sec||0); if(sec<60) return sec+'秒'; const m=Math.floor(sec/60); if(m<60) return m+'分'; return Math.floor(m/60)+'時間'+(m%60)+'分'; }
function _toDate(s){ const a=s.split('-').map(Number); return new Date(a[0],a[1]-1,a[2]); }
// 「きょうやること」チェックリストを状態から組む（純粋）。ハブ・記録に散在していた日課を
// 1画面のチェックリストに集約する（study/復習/タクトdaily/家族もんだい/無料ガチャ）。
// s = { goal, cnt, due, tactDone, famDone, boxReady }。各itemは {key,icon,label,sub,done,action}。
function buildTodayChecklist(s){
  s = s || {};
  var items = [
    { key:'study',  icon:'✏️', label:'きょうの学習',        sub:(s.cnt||0) + '/' + (s.goal||0) + '問', done:(s.cnt||0) >= (s.goal||0) && (s.goal||0) > 0, action:'startRecommended()' },
    { key:'review', icon:'🔁', label:'ふくしゅう',          sub:(s.due > 0 ? (s.due + '問') : 'なし'),    done:!(s.due > 0),      action:'startReviewDue()' },
    { key:'tact',   icon:'🌀', label:'きょうの ちょうせん', sub:(s.tactDone ? 'クリア' : 'ボーナスあり'), done:!!s.tactDone,      action:"srpgOpen('daily')" },
    { key:'family', icon:'👪', label:'家族もんだい',        sub:(s.famDone ? 'すんだ' : '5問'),           done:!!s.famDone,       action:'startFamilyDaily()' },
  ];
  if(s.boxReady) items.push({ key:'box', icon:'🎁', label:'むりょうガチャ', sub:'あけよう', done:false, action:"muNav('gacha')" });
  return items;
}
function todayAllDone(items){ return (items || []).length > 0 && items.every(function(it){ return it.done; }); }
// 同じ単元(sub)が隣り合わないよう貪欲に並べ替える（できる範囲で）。
// ブロック練習(同一単元の連打)→インターリービング(単元を混ぜる)にして転移・長期定着を上げる。
// 読解など本文(passage)つきが混ざる場合は、本文の再読を避けるため並べ替えない（呼び出し側でガード）。
function interleaveBySub(qs){
  var arr = (qs || []).slice();
  var out = [], lastSub = null;
  while(arr.length){
    var idx = -1;
    for(var i = 0; i < arr.length; i++){ if((arr[i].sub || '') !== lastSub){ idx = i; break; } }
    if(idx < 0) idx = 0;                       // 残り全部が同じ単元＝仕方なく先頭
    var pick = arr.splice(idx, 1)[0];
    out.push(pick); lastSub = pick.sub || '';
  }
  return out;
}
// 解説（【考え方】【手順】【ポイント】）から「解き直しの一言ヒント」を1行だけ抜く。
// まちがい→リベンジ問題で「さっき学んだ考え方」を運んで、worked example を即適用させる（retrieval×worked example）。
function revTip(explain){
  var ex = String(explain || '');
  if(!ex) return '';
  var m = ex.match(/【考え方】\s*([^\n【]+)/);           // まず「考え方」の一文
  if(!m) m = ex.match(/【手順】\s*([^\n【]+)/);           // なければ「手順」の1行目
  if(!m) m = ex.match(/【ポイント】\s*([^\n【]+)/);       // それも無ければ「ポイント」
  var s = m ? m[1] : (ex.split('\n')[0] || '');
  s = s.trim().replace(/\s+/g, ' ');
  if(s.length > 48) s = s.slice(0, 47) + '…';            // バナーに収まる長さへ
  return s;
}
