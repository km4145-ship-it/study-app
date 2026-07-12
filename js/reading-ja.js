/* reading-ja.js：日本語の読み変換（TTS誤読対策）。index.html から分離した classic script。
   純粋関数＋データのみ（DOM・共有可変状態なし。kuroTokenizer は本モジュール内で完結）。
   グローバルに hasJapanese/intToKan/numToJa/toReading/stripEmoji/forTTS 等を定義。挙動不変。
   メイン <script> より前に読み込む（?v でキャッシュ回避）。 */
// ===== 日本語の読み変換（ElevenLabsの誤読対策） =====
// kuromoji.js で漢字を正しい読み（発音カナ）に変換してからTTSに渡す
let kuroTokenizer = null;
function initKuromoji() {
  if (typeof kuromoji === 'undefined') return;
  try {
    kuromoji.builder({ dicPath: 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/' })
      .build((err, tok) => { if (!err && tok) kuroTokenizer = tok; });
  } catch(e) {}
}
function hasJapanese(t) { return /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/.test(t); }
// 固有名詞など、解析器が間違えやすい語の読みを上書き
const NAME_READINGS = [['千咲','チサキ'],['賢一','ケンイチ'],['彩花','アヤカ']];
// 記号・単位 → 読み（長いものから順に置換）
const UNIT_MAP = [
  ['cm³','立方センチメートル'],['cm2','平方センチメートル'],['cm²','平方センチメートル'],
  ['m³','立方メートル'],['m2','平方メートル'],['m²','平方メートル'],
  ['km','キロメートル'],['cm','センチメートル'],['kg','キログラム'],
  ['mL','ミリリットル'],['kL','キロリットル'],['Pa','パスカル'],
  ['π','パイ'],['×','かける'],['÷','わる'],['％','パーセント'],['%','パーセント'],
  ['℃','ど'],['°','ど'],['＝','イコール'],['=','イコール'],
  ['≒','およそ'],['−','ひく'],['　',' '],
  ['Pa','パスカル'],['N','ニュートン'],['g','グラム'],['L','リットル'],['m','メートル']
];
const DIGIT_KAN = ['〇','一','二','三','四','五','六','七','八','九'];
function intToKan(n) {
  if (n === 0) return 'ゼロ';
  if (n < 0) return 'マイナス' + intToKan(-n);
  const units4 = ['','万','億','兆'];
  const small = ['','十','百','千'];
  let out = '', group = 0;
  while (n > 0) {
    let part = n % 10000, seg = '';
    let p = part, idx = 0;
    while (p > 0) {
      const d = p % 10;
      if (d > 0) seg = (d===1 && idx>0 ? '' : DIGIT_KAN[d]) + small[idx] + seg;
      p = Math.floor(p/10); idx++;
    }
    if (seg) out = seg + units4[group] + out;
    n = Math.floor(n/10000); group++;
  }
  return out;
}
function numToJa(m) {
  let s = m, sign = '';
  if (s[0] === '-') { sign = 'マイナス'; s = s.slice(1); }
  const dot = s.indexOf('.');
  if (dot === -1) return sign + intToKan(parseInt(s,10));
  const ip = s.slice(0,dot), fp = s.slice(dot+1);
  let out = sign + intToKan(parseInt(ip||'0',10)) + '点';
  out += fp.split('').map(d=>DIGIT_KAN[+d]||d).join('');
  return out;
}
// TTSへ渡す前に日本語を読みに変換（英語などはそのまま）
function toReading(text) {
  if (!hasJapanese(text)) return text; // 英語の問題などは変換しない
  let t = text;
  NAME_READINGS.forEach(([a,b]) => { t = t.split(a).join(b); });
  UNIT_MAP.forEach(([a,b]) => { t = t.split(a).join(b); });
  t = t.replace(/-?\d+(?:\.\d+)?/g, m => numToJa(m));
  if (!kuroTokenizer) return t; // 辞書未ロード時は記号・数字だけ変換
  try {
    const tokens = kuroTokenizer.tokenize(t);
    return tokens.map(tk => {
      const r = (tk.pronunciation && tk.pronunciation !== '*') ? tk.pronunciation
              : (tk.reading && tk.reading !== '*') ? tk.reading : tk.surface_form;
      return r;
    }).join('');
  } catch(e) { return t; }
}

// ===== ブラウザ内蔵音声（保険）: キーが無い/失敗しても必ず声が出る =====
function stripEmoji(text) {
  return text.replace(/[🌺🌊🐚🐢➕➖✨🔮★✦👑🌙🏠🔁➡💡📚🏄📐🔢🧪🚀🎲🌟🚂📦💀💢🤙]/g, '');
}
// TTS用：絵文字を除去し、日本語を正しい読みに変換
function forTTS(text) { return toReading(stripEmoji(text)); }
