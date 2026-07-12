/* util.js：副作用のない純粋ヘルパ（HTMLエスケープ・トピックキー・日付整形）。
   index.html から分離した classic script。純粋関数のみ・挙動不変・グローバル。
   tests/unit-util.js で挙動を固定。メイン <script> より前に読み込む。 */
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function topicKey(area, sub){ return area + '|' + sub; }
function dateKeyOffset(off){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+off); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function todayKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function fmtTime(sec){ sec=Math.round(sec||0); if(sec<60) return sec+'秒'; const m=Math.floor(sec/60); if(m<60) return m+'分'; return Math.floor(m/60)+'時間'+(m%60)+'分'; }
function _toDate(s){ const a=s.split('-').map(Number); return new Date(a[0],a[1]-1,a[2]); }
