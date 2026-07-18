/* util.js：副作用のない純粋ヘルパ（HTMLエスケープ・トピックキー・日付整形）。
   index.html から分離した classic script。純粋関数のみ・挙動不変・グローバル。
   tests/unit-util.js で挙動を固定。メイン <script> より前に読み込む。 */
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function topicKey(area, sub){ return area + '|' + sub; }
function dateKeyOffset(off){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+off); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function todayKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function fmtTime(sec){ sec=Math.round(sec||0); if(sec<60) return sec+'秒'; const m=Math.floor(sec/60); if(m<60) return m+'分'; return Math.floor(m/60)+'時間'+(m%60)+'分'; }
function _toDate(s){ const a=s.split('-').map(Number); return new Date(a[0],a[1]-1,a[2]); }
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
