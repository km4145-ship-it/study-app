/* miss-types.js：ミスの型分析（index.html から利用するクラシックスクリプト・グローバル定義）
   まちがえた瞬間に「選んだ答え」と「正解」の関係からミスの型を推定する。
   - ジェネレータや問題バンクには一切手を入れない（答え合わせ時の後付け分類）
   - missParseNum / missClassify / missWeekSummary は純関数（Node テスト可能）
   - 保存系（missBump 等）は lsGetJSON/lsSetJSON（メイン script 定義）を実行時に参照 */

// ===== ミスの型（分類キー・表示名・子ども向けアドバイス） =====
var MISS_TYPES = {
  sign:    { em:'➖', name:'ふごうミス',     tip:'マイナスの あつかいに 気をつけよう。とちゅう式に −（マイナス）を 書きのこすと ふせげるよ' },
  place:   { em:'0️⃣', name:'けたミス',       tip:'0の数と 小数点の いちを、さいごに もう一度 たしかめよう' },
  op:      { em:'🔀', name:'演算えらびミス', tip:'たす？ひく？かける？わる？ 問題文の だいじな ことばに 線を 引いてから 式を 立てよう' },
  near:    { em:'✏️', name:'おしい計算ミス', tip:'とちゅう式を 書いて、出した答えで けんざん（ぎゃくの計算）を しよう' },
  unit:    { em:'📏', name:'たんい・書き方', tip:'数は あっているよ！ たんい（cm・m・個）や 書き方を さいごに チェックしよう' },
  misread: { em:'👀', name:'いそぎすぎ？',   tip:'答えるのが はやすぎるかも。問題文を さいごまで 読んでから えらぼう' },
  recall:  { em:'📖', name:'おぼえあいまい', tip:'「📖 学ぶ」や フラッシュカードで、もう一度 おぼえなおそう' },
  careless:{ em:'💦', name:'うっかり',       tip:'ほんとうは できる問題！ 答える前に 3びょうだけ 見直そう' },
  unknown: { em:'❓', name:'わからなかった', tip:'にがてノートに 入ったよ。ふくしゅうダンジョンで たおしに いこう' }
};

// ===== 数値パース（純関数） =====
// "−3" "3/4" "12cm" "2.5" "x=3" "12 こ" などから数値を取り出す。無ければ null
function missParseNum(s){
  if (s == null) return null;
  var t = String(s)
    .replace(/[０-９]/g, function(c){ return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
    .replace(/[−ーｰ―–]/g, '-')
    .replace(/[，,]/g, '')
    .replace(/^[a-zA-Zｘｙ]+\s*=\s*/, '');           // "x=3" → "3"
  var m = t.match(/-?\d+(?:\.\d+)?(?:\s*\/\s*-?\d+(?:\.\d+)?)?/);
  if (!m) return null;
  var frac = m[0].split('/');
  if (frac.length === 2){
    var a = parseFloat(frac[0]), b = parseFloat(frac[1]);
    if (!isFinite(a) || !isFinite(b) || b === 0) return null;
    return a / b;
  }
  var v = parseFloat(m[0]);
  return isFinite(v) ? v : null;
}
// 問題文中の数値（最大6個）
function missNumsInText(text){
  if (!text) return [];
  var t = String(text)
    .replace(/[０-９]/g, function(c){ return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
    .replace(/[−ーｰ―–]/g, '-');
  var out = [], re = /-?\d+(?:\.\d+)?/g, m;
  while ((m = re.exec(t)) && out.length < 6) out.push(parseFloat(m[0]));
  return out;
}
// 表記ゆれ吸収（単位くらべ用）
function _missNorm(s){
  return String(s == null ? '' : s)
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, function(c){ return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
    .replace(/\s/g, '').replace(/[−ーｰ―–]/g, '-').toLowerCase();
}
function _missEq(a, b){ return Math.abs(a - b) < 1e-9; }

// ===== 分類（純関数） =====
// q:{q,ans,...} chosen:選んだ答え(文字列) sec:解答秒数(任意) → MISS_TYPES のキー or null
function missClassify(q, chosen, sec){
  if (!q || chosen == null || chosen === '') return null;
  var ans = q.ans;
  var cn = missParseNum(chosen), an = missParseNum(ans);
  var fast = (typeof sec === 'number' && sec > 0 && sec < 4);
  if (cn != null && an != null){
    // 数は同じなのに不正解 ＝ たんい・書き方ちがい
    if (_missEq(cn, an) && _missNorm(chosen) !== _missNorm(ans)) return 'unit';
    // 符号だけ逆
    if (an !== 0 && _missEq(cn, -an)) return 'sign';
    // けた（10倍・100倍・1/10…）
    if (an !== 0 && cn !== 0){
      var r = Math.abs(cn / an);
      if ([10, 100, 1000, .1, .01, .001].some(function(k){ return Math.abs(r - k) < 1e-9; })) return 'place';
    }
    // 演算えらび：問題文の最初の2数で別の演算をすると選んだ答えになる
    var ns = missNumsInText(q.q);
    if (ns.length >= 2){
      var a = ns[0], b = ns[1];
      var cands = [a + b, a - b, b - a, a * b];
      if (b !== 0) cands.push(a / b);
      if (a !== 0) cands.push(b / a);
      for (var i = 0; i < cands.length; i++){
        if (isFinite(cands[i]) && _missEq(cn, cands[i]) && !_missEq(an, cands[i])) return 'op';
      }
    }
    // おしい（差が小さい）
    if (Math.abs(cn - an) <= Math.max(1, Math.abs(an) * .05)) return 'near';
    // 大きく外れた数値 → いそぎすぎなら読みちがい疑い、それ以外は型なし（通常の苦手として扱う）
    return fast ? 'misread' : null;
  }
  // 文字の答え（漢字・英語・用語など）
  return fast ? 'misread' : 'recall';
}

// ===== リベンジ用：候補問題が「同じ型のミスをもう一度ためせる」問題か（純関数） =====
// 例：ふごうミスをした子には、マイナスを含む類題を優先して出す
function missQMatches(cand, t){
  if (!cand) return false;
  if (!t) return true;
  var qt = String(cand.q || ''), ans = String(cand.ans || '');
  if (t === 'sign')  return /[−ー–-]\s*\d/.test(qt) || /^\s*[−ー–-]/.test(ans);               // マイナスを含む
  if (t === 'place') return /\d[.．]\d/.test(qt + ' ' + ans) || /(^|[^0-9])(10|100|1000)([^0-9]|$)/.test(qt);  // 小数・10の倍数
  if (t === 'op')    return missNumsInText(qt).length >= 2;                                    // 演算を選ぶ必要がある
  if (t === 'unit')  return /(cm|mm|km|kg|mg|mL|dL|㎝|㎞|㎏|個|こ|人|円|分|秒|時間|Ｌ)/.test(qt); // 単位が出てくる
  return true;                                                                                 // その他の型は同サブ単元ならOK
}

// ===== 集計（直近days から週まとめ・純関数） =====
// days:{'2026-7-14':{sign:2,...}} weekKeys:['2026-7-8',...] → [{t,n}] 多い順
function missWeekSummary(days, weekKeys){
  var sum = {};
  (weekKeys || []).forEach(function(d){
    var rec = (days || {})[d]; if (!rec) return;
    Object.keys(rec).forEach(function(t){ sum[t] = (sum[t] || 0) + (rec[t] || 0); });
  });
  return Object.keys(sum).map(function(t){ return { t: t, n: sum[t] }; })
    .sort(function(a, b){ return b.n - a.n; });
}

// ===== 保存（実行時のみ。lsGetJSON/lsSetJSON/todayKey はメイン script 定義） =====
function missLoad(){
  try { if (typeof lsGetJSON === 'function') return lsGetJSON('miss_types', { v:1, total:{}, days:{}, bySub:{} }) || { v:1, total:{}, days:{}, bySub:{} }; } catch(e){}
  return { v:1, total:{}, days:{}, bySub:{} };
}
function missBump(t, sub){
  if (!MISS_TYPES[t]) return null;
  var m = missLoad();
  m.total = m.total || {}; m.days = m.days || {}; m.bySub = m.bySub || {};
  m.total[t] = (m.total[t] || 0) + 1;
  try {
    if (typeof todayKey === 'function'){
      var d = todayKey();
      m.days[d] = m.days[d] || {}; m.days[d][t] = (m.days[d][t] || 0) + 1;
      var ks = Object.keys(m.days);                        // 35日より古い分は捨てる（肥大防止）
      if (ks.length > 35){ ks.sort(); ks.slice(0, ks.length - 35).forEach(function(k){ delete m.days[k]; }); }
    }
  } catch(e){}
  if (sub){ var s = m.bySub[sub] = m.bySub[sub] || {}; s[t] = (s[t] || 0) + 1; }
  try { if (typeof lsSetJSON === 'function') lsSetJSON('miss_types', m); } catch(e){}
  return m;
}
