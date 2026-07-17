'use strict';
/* audit-tts.js：読み上げテキストの自動監査。
   アプリが speak() に渡しうるテキスト（生成問題・データ問題・セリフ）を機械的に集め、
   forTTS（読み変換）に通した結果から「誤読の火種」を自動検出する。
     A) 絵文字の残留（stripEmoji漏れ）
     B) 英単語の破壊（単位置換の暴発：英字に読みカナが直結）
     C) 数字の残留（numToJa漏れ＝桁区切り・小数などの取りこぼし）
     D) 危険記号の残留（½ ² ³ など読み対応の無い記号）
   使い方: node scripts/audit-tts.js          … 全ソース監査・上位の問題を表示
   ※漢字の読みは実行時に kuromoji が解決するため、ここでは検査対象外（残留数だけ参考表示）。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---- 読み変換（本番と同じ js/reading-ja.js を kuromoji 無し環境で評価） ----
const api = (new Function(read('js/reading-ja.js') + '\nreturn { forTTS, toReading, hasJapanese };'))();

// ---- テキスト収集 ----
const texts = [];   // {src, text}
function add(src, t){ if (t && typeof t === 'string' && t.trim()) texts.push({ src, text: t }); }

// 1) 基本ジェネレーター（実行してサンプリング）
try {
  const bank = read('js/questions-extra.js');
  const gen = read('js/generators.js');
  const gq = (new Function('muGradeBand', bank + '\n' + gen + '\nreturn genQuestion;'))(() => 'jhs');
  const gqE = (new Function('muGradeBand', bank + '\n' + gen + '\nreturn genQuestion;'))(() => 'elem');
  ['math', 'japanese', 'english', 'science', 'social'].forEach((s) => {
    for (let i = 0; i < 120; i++) {
      const q = gq(s); if (!q) continue;
      add('gen:' + s, q.q); add('gen:' + s, q.hint); add('gen:' + s, q.explain);
      (q.choices || []).forEach((ch) => add('gen:' + s, String(ch)));
      const qe = gqE(s); if (qe) { add('genE:' + s, qe.q); add('genE:' + s, qe.explain); }
    }
  });
} catch (e) { console.log('⚠️ ジェネレーター実行スキップ:', e.message); }

// 2) ワークフロー生成パック（純データ＝JSONで直接抽出）
[['js/generators-pack.js', 'GEN_PACK'], ['js/generators-pack2.js', 'GEN_PACK2'], ['js/generators-pack3.js', 'GEN_PACK3']].forEach(([f, v]) => {
  try {
    const src = read(f);
    const m = src.match(new RegExp('var ' + v + '=(\\{[\\s\\S]*?\\});\\n\\(function'));
    if (!m) return;
    const P = (new Function('return ' + m[1]))();
    Object.keys(P).forEach((pool) => (P[pool] || []).forEach((it) => {
      add(f, it.q); add(f, it.hint); add(f, it.explain);
      (it.choices || []).forEach((ch) => add(f, String(ch)));
    }));
  } catch (e) {}
});

// 3) 静的な問題バンク・読解・セリフ
try {
  const qb = read('js/questions-bank.js') + read('js/questions-extra.js');
  // q:'...' / explain:'...' / hint:'...' の文字列リテラルを抽出（テンプレは対象外＝生成で拾う）
  const re = /(?:q|explain|hint)\s*:\s*'((?:[^'\\]|\\.)*)'/g; let m;
  while ((m = re.exec(qb))) add('bank', m[1].replace(/\\n/g, '。').replace(/\\'/g, "'"));
} catch (e) {}
try {
  const html = read('index.html');
  const re = /speak\(\s*'((?:[^'\\]|\\.)*)'/g; let m;
  while ((m = re.exec(html))) add('speak', m[1]);
  const re2 = /speak\(\s*`([^`$]{2,200})`/g;
  while ((m = re2.exec(html))) add('speak', m[1]);
} catch (e) {}
try {
  const world = read('js/rpg-world.js');
  const re = /text\s*:\s*'((?:[^'\\]|\\.)*)'/g; let m;
  while ((m = re.exec(world))) add('story', m[1]);
} catch (e) {}

// ---- 検出器 ----
let EMOJI_RE = null;
try { EMOJI_RE = new RegExp('[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{2460}-\\u{24FF}\\u{FE0F}\\u{1F1E6}-\\u{1F1FF}]', 'u'); } catch (e) {}
const KANA_UNITS = '(メートル|グラム|リットル|ニュートン|パスカル|アンペア|ボルト|ワット|ヘクタール|ジュール|ヘルツ)';
const CHECKS = [
  ['A:絵文字が残る', (t) => EMOJI_RE && EMOJI_RE.test(t)],
  ['B:英単語が壊れる', (t) => new RegExp('[A-Za-z]' + KANA_UNITS).test(t)],
  ['C:数字が残る', (t) => api.hasJapanese(t) && /\d/.test(t)],
  ['D:危険記号が残る', (t) => api.hasJapanese(t) && /[½¼¾²³√]|cm2|m2/.test(t)],
];

// ---- 実行 ----
const found = {}; CHECKS.forEach(([k]) => { found[k] = []; });
let kanjiCount = 0;
texts.forEach(({ src, text }) => {
  const out = api.forTTS(text);
  CHECKS.forEach(([k, fn]) => { if (fn(out)) found[k].push({ src, text, out }); });
  if (/[一-鿿]/.test(out)) kanjiCount++;
});

console.log('監査対象テキスト: ' + texts.length + ' 件\n');
let totalIssues = 0;
CHECKS.forEach(([k]) => {
  const list = found[k];
  totalIssues += list.length;
  console.log((list.length ? '❌ ' : '✅ ') + k + ': ' + list.length + ' 件');
  // 重複を除いた上位を表示
  const seen = new Set();
  list.slice(0, 500).forEach(({ src, text, out }) => {
    const key = out.slice(0, 60);
    if (seen.has(key) || seen.size >= 8) return; seen.add(key);
    console.log('   [' + src + '] ' + text.slice(0, 56).replace(/\n/g, ' '));
    console.log('     → ' + out.slice(0, 64).replace(/\n/g, ' '));
  });
});
console.log('\nℹ️ 漢字を含むまま（実行時にkuromojiが読みに解決する分）: ' + kanjiCount + ' / ' + texts.length);
process.exit(totalIssues ? 1 : 0);
