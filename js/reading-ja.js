/* reading-ja.js：日本語の読み変換（TTS誤読対策）。index.html から分離した classic script。
   純粋関数＋データのみ（DOM・共有可変状態なし。kuroTokenizer は本モジュール内で完結）。
   グローバルに hasJapanese/intToKan/numToJa/toReading/stripEmoji/forTTS 等を定義。挙動不変。
   メイン <script> より前に読み込む（?v でキャッシュ回避）。 */
// ===== 日本語の読み変換（ElevenLabsの誤読対策） =====
// kuromoji.js で漢字を正しい読み（発音カナ）に変換してからTTSに渡す
let kuroTokenizer = null;
let _kuroLoading = false;
function initKuromoji() {
  if (kuroTokenizer || _kuroLoading) return;
  // ふりがな機能（furigana.js）が同じ辞書を構築済みなら共用する（二重ロード回避）
  if (typeof _furiTok !== 'undefined' && _furiTok) { kuroTokenizer = _furiTok; return; }
  if (typeof kuromoji === 'undefined') {
    // kuromoji本体を遅延ロード（読み上げを使う人にだけ・初期表示は軽いまま）
    try {
      if (typeof document === 'undefined' || document.getElementById('kuromoji-lib')) return;
      _kuroLoading = true;
      var sc = document.createElement('script');
      sc.id = 'kuromoji-lib';
      sc.src = 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js';
      sc.onload = function(){ _kuroLoading = false; initKuromoji(); };
      sc.onerror = function(){ _kuroLoading = false; };
      document.head.appendChild(sc);
    } catch(e) { _kuroLoading = false; }
    return;
  }
  try {
    _kuroLoading = true;
    kuromoji.builder({ dicPath: 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/' })
      .build((err, tok) => { _kuroLoading = false; if (!err && tok) kuroTokenizer = tok; });
  } catch(e) { _kuroLoading = false; }
}
function hasJapanese(t) { return /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/.test(t); }
// 固有名詞など、解析器が間違えやすい語の読みを上書き
const NAME_READINGS = [['千咲','チサキ'],['賢一','ケンイチ'],['彩花','アヤカ']];
// 単位（英字系）：数値の直後にあるときだけ読む。
// 旧実装は 'm'/'g'/'L'/'N' 等を文中で無差別置換していたため、日本語文中の英単語が
// 壊れていた（例：「Tomは…」→「Toメートルは…」）。数値直後に限定して根治。
const UNIT_READ = {
  'cm³':'立方センチメートル','cm²':'平方センチメートル','cm2':'平方センチメートル',
  'm³':'立方メートル','m²':'平方メートル','m2':'平方メートル','km²':'平方キロメートル',
  'km':'キロメートル','cm':'センチメートル','mm':'ミリメートル',
  'kg':'キログラム','mg':'ミリグラム','kL':'キロリットル','mL':'ミリリットル','dL':'デシリットル',
  'Pa':'パスカル','hPa':'ヘクトパスカル','km/h':'じそくキロメートル','m/s':'びょうそくメートル',
  'L':'リットル','N':'ニュートン','g':'グラム','m':'メートル','A':'アンペア','V':'ボルト','W':'ワット','t':'トン','a':'アール','ha':'ヘクタール','J':'ジュール','Hz':'ヘルツ','°':'ど'
};
// 長い単位から先にマッチ（m より km、cm² より cm³…）
const UNIT_NUM_RE = new RegExp('(\\d(?:[\\d\\.]*\\d)?)\\s*(km\\/h|m\\/s|hPa|cm³|cm²|cm2|km²|m³|m²|m2|km|cm|mm|kg|mg|kL|mL|dL|Pa|ha|Hz|[LNgmAVWtaJ°])(?![A-Za-z0-9²³])', 'g');
// 数値を伴わない単独の単位表記（「（cm²）」「単位はkm」等）。
// 1文字単位(m/g/L…)は英単語を壊すため対象外＝2文字以上の複合単位だけを、英字が前に無い位置で変換。
const UNIT_SOLO_RE = new RegExp('(^|[^A-Za-z0-9])(km\\/h|m\\/s|hPa|cm³|cm²|cm2|km²|m³|m²|m2|km|cm|mm|kg|mg|kL|mL|dL|Pa|ha|Hz)(?![A-Za-z0-9²³])', 'g');
// 単独でも安全な記号（英単語を壊さないもの）だけ従来どおり置換
const UNIT_MAP = [
  ['π','パイ'],['×','かける'],['÷','わる'],['％','パーセント'],['%','パーセント'],
  ['℃','ど'],['＝','イコール'],['=','イコール'],
  ['≒','およそ'],['≠','イコールではない'],['≦','いか'],['≧','いじょう'],
  ['−','ひく'],['±','プラスマイナス'],['√','ルート'],['∠','かく'],['⊥','すいちょく'],['∥','へいこう'],
  ['→','から'],['　',' ']
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
  t = t.replace(/(\d),(?=\d{3})/g, '$1');                       // 桁区切りカンマ（1,000）を除去
  t = t.replace(/(\d+)\s*\/\s*(\d+)/g, '$2ぶんの$1');           // 分数 1/2 →「2ぶんの1」
  t = t.replace(/(\d+)\s*[:：]\s*(\d+)/g, '$1たい$2');          // 比 3:4 →「3たい4」
  t = t.replace(/[½]/g, '2ぶんの1').replace(/[¼]/g, '4ぶんの1').replace(/[¾]/g, '4ぶんの3');
  t = t.replace(UNIT_NUM_RE, (mm, num, unit) => num + (UNIT_READ[unit] || unit));   // 数値+単位
  // 数値を伴わない単位の単独表記（「面積は？（cm²）」等）。2文字以上の複合単位だけ＝英単語を壊さない
  t = t.replace(UNIT_SOLO_RE, (mm, pre, unit) => pre + (UNIT_READ[unit] || unit));
  // 累乗：6² → 6の二乗 ／ r³ → rの三乗（数値+単位の変換後に残ったもの）
  t = t.replace(/([0-9A-Za-zπぁ-んァ-ヶ一-鿿)）])²/g, '$1の二乗').replace(/([0-9A-Za-zπぁ-んァ-ヶ一-鿿)）])³/g, '$1の三乗');
  // 残った「/」は割り算として読む（km/h等は処理済み。読み物の並記スラッシュは問題文に出ない前提）
  t = t.replace(/\s*\/\s*/g, 'わる');
  UNIT_MAP.forEach(([a,b]) => { t = t.split(a).join(b); });
  t = t.replace(/-?\d+(?:\.\d+)?/g, m => numToJa(m));
  // 漢字→読みカナ：自前の辞書 or ふりがな機能（furigana.js）の辞書を共用
  const tok = kuroTokenizer || ((typeof _furiTok !== 'undefined' && _furiTok) ? _furiTok : null);
  if (!tok) return t; // 辞書未ロード時は記号・数字だけ変換
  try {
    const tokens = tok.tokenize(t);
    return tokens.map(tk => {
      const r = (tk.pronunciation && tk.pronunciation !== '*') ? tk.pronunciation
              : (tk.reading && tk.reading !== '*') ? tk.reading : tk.surface_form;
      return r;
    }).join('');
  } catch(e) { return t; }
}

// ===== ブラウザ内蔵音声（保険）: キーが無い/失敗しても必ず声が出る =====
// 絵文字はUnicode範囲でまとめて除去（旧実装は列挙式で、アプリ内の絵文字の大半が素通りしていた）。
// リテラルのuフラグ正規表現は古いブラウザで「ファイル全体が構文エラー」になるため、
// new RegExp + try/catch で構築し、使えない環境では旧列挙式にフォールバックする。
var _EMOJI_RE = null;
try {
  _EMOJI_RE = new RegExp('[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{2190}-\\u{21FF}\\u{25A0}-\\u{25FF}\\u{2460}-\\u{24FF}\\u{FE0F}\\u{200D}\\u{20E3}\\u{1F1E6}-\\u{1F1FF}\\u{3030}\\u{303D}\\u{3297}\\u{3299}\\u{00A9}\\u{00AE}\\u{2122}]', 'gu');
} catch(e) { _EMOJI_RE = null; }
const _EMOJI_FALLBACK = /[🌺🌊🐚🐢➕➖✨🔮★✦👑🌙🏠🔁➡💡📚🏄📐🔢🧪🚀🎲🌟🚂📦💀💢🤙]/g;
function stripEmoji(text) {
  if (_EMOJI_RE) { try { return text.replace(_EMOJI_RE, ''); } catch(e) {} }
  return text.replace(_EMOJI_FALLBACK, '');
}
// TTS用：絵文字を除去し、日本語を正しい読みに変換
function forTTS(text) { return toReading(stripEmoji(text)); }
