/* generators-plus.js：カバレッジの「穴」を埋める増量ジェネレータ（A2の実測穴リスト順）。
   generators.js / generators-hard.js の後に読み込み、各教科の gens 配列へ push する。
   方針は generators-hard.js と同じ：
   - 数学・理科計算 ＝ 手続き生成（答えを計算で算出 ＝ 必ず正しい）
   - 英語・社会・理科知識 ＝ 検証済み事実テーブルから出題（LLM生成文は使わない）
   sub 名は js/coverage.js の単元マスターのキーワードに一致させる（穴が埋まったことを
   カバレッジ画面で確認できる）。対象学年：中3中心（★★★〜★★★★）＋一部★★☆。 */
(function () {
  if (typeof mathGens === 'undefined' || typeof rint !== 'function' || typeof pick !== 'function'
    || typeof numChoices !== 'function' || typeof shuffleArr !== 'function') return;

  // 文字列答えの choices を作る（正解＋まぎらわし。重複は除去して4つ）
  function strChoices(ans, wrongs) {
    var set = [ans]; wrongs.forEach(function (w) { if (set.length < 4 && set.indexOf(w) < 0) set.push(w); });
    return shuffleArr(set.slice(0, 4));
  }

  // ============ 数学（中3の穴：二次関数・相似・円周角・三平方） ============
  var PLUS_MATH = [
    // --- 二次関数 y=ax² ---
    function () { var a = pick([-3, -2, -1, 1, 2, 3]), x = pick([-4, -3, -2, 2, 3, 4]); var y = a * x * x; var ch = numChoices(y, { spread: Math.max(8, Math.abs(y)) });
      return { q: '関数 y = ' + (a === 1 ? '' : a === -1 ? '−' : a) + 'x² で、x = ' + x + ' のときの y の値は？', sub: '二次関数（式の値）', level: '★★★', hint: 'xを2乗してからaをかける', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】x²を先に計算。\n【手順】x²=' + (x * x) + '、y=' + a + '×' + (x * x) + '=' + y + '\n【ポイント】負のxも2乗すれば正になる。' }; },
    function () { var a = pick([-3, -2, -1, 1, 2, 3]), p = rint(1, 4), q2 = p + rint(1, 4); var ans = a * (p + q2); var ch = numChoices(ans, { spread: 10 });
      return { q: '関数 y = ' + (a === 1 ? '' : a === -1 ? '−' : a) + 'x² で、x が ' + p + ' から ' + q2 + ' まで増加するときの変化の割合は？', sub: '二次関数（変化の割合）', level: '★★★★', hint: 'y=ax²の変化の割合は a(p+q)', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】変化の割合＝a×(はじめのx＋おわりのx)。\n【手順】' + a + '×(' + p + '+' + q2 + ')=' + ans + '\n【ポイント】一次関数とちがい、区間によって変わる。' }; },
    function () { var a = pick([1, 2, 3]), p = rint(-4, -1), q2 = rint(1, 4); var mx = a * Math.max(p * p, q2 * q2); var ans = '0≦y≦' + mx;
      var ch = strChoices(ans, [(a * p * p) + '≦y≦' + (a * q2 * q2), '−' + mx + '≦y≦' + mx, '0≦y≦' + (mx + a)]);   // ansと必ず異なる3つ（p²=q²でも重複しない）
      return { q: '関数 y = ' + (a === 1 ? '' : a) + 'x²（x の変域 ' + p + '≦x≦' + q2 + '）の y の変域は？', sub: '二次関数（変域）', level: '★★★★', hint: '変域に0を含むとき最小値は0', type: 'choice', choices: ch, ans: ans, explain: '【考え方】x=0で最小値0。両はしのうち遠い方で最大。\n【手順】最大=' + a + '×' + Math.max(p * p, q2 * q2) + '=' + mx + '\n【ポイント】0を含む変域なら y の最小は必ず 0（a>0のとき）。' }; },
    function () { var a = pick([-2, -1, 1, 2, 3]), p = pick([-3, -2, 2, 3]); var y = a * p * p; var ch = numChoices(a, { spread: 4 });
      return { q: '関数 y = ax² が 点(' + p + ', ' + y + ') を通るとき、a の値は？', sub: '二次関数（比例定数）', level: '★★★', hint: '座標を代入して a を求める', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】x,yを代入。\n【手順】' + y + '=a×' + (p * p) + ' → a=' + a + '\n【ポイント】x²の値で割るだけ。' }; },
    // --- 相似 ---
    function () { var m = pick([2, 3]), n = m + pick([1, 2]), k = rint(2, 5), j = rint(2, 6); var ans = n * j; var ch = numChoices(ans, { spread: 10, positive: true });
      return { q: '△ABC ∽ △DEF（相似比 ' + m + ':' + n + '）。BC = ' + (m * j) + 'cm のとき、対応する辺 EF は何cm？', sub: '相似（辺の長さ）', level: '★★★', hint: '相似比にそろえて比例式', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】対応する辺の比＝相似比。\n【手順】' + m + ':' + n + ' = ' + (m * j) + ':EF → EF=' + ans + 'cm\n【ポイント】どの辺とどの辺が対応するかを先に確認。' }; },
    function () { var m = pick([1, 2, 3]), n = m + pick([1, 2]); var ans = (m * m) + ':' + (n * n);
      var ch = strChoices(ans, [m + ':' + n, (m * 2) + ':' + (n * 2), (m * m * m) + ':' + (n * n * n)]);
      return { q: '相似比が ' + m + ':' + n + ' の2つの図形の面積比は？', sub: '相似（面積比）', level: '★★★★', hint: '面積比は相似比の2乗', type: 'choice', choices: ch, ans: ans, explain: '【考え方】面積比＝相似比の2乗。\n【手順】' + m + '²:' + n + '²=' + ans + '\n【ポイント】体積比なら3乗になる。' }; },
    function () { var a = rint(1, 2), b = pick([2, 4]), mul = rint(3, 6); var tree = a * mul, shadow = b * mul; var ch = numChoices(tree, { spread: 6, positive: true });
      return { q: '高さ ' + a + 'm の棒の影が ' + b + 'm。同じ時刻に影が ' + shadow + 'm の木の高さは何m？', sub: '相似（縮図と影）', level: '★★★', hint: '棒と木で相似な三角形', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】高さ:影 は同じ比。\n【手順】' + a + ':' + b + ' = 高さ:' + shadow + ' → 高さ=' + tree + 'm\n【ポイント】同じ時刻なら太陽の角度が同じ＝相似。' }; },
    // --- 円周角 ---
    function () { var t = rint(20, 80); var ch = numChoices(t, { spread: 30, positive: true });
      return { q: '円Oで、弧ABに対する中心角が ' + (2 * t) + '° のとき、同じ弧に対する円周角は何度？', sub: '円周角（中心角との関係）', level: '★★★', hint: '円周角は中心角の半分', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】円周角の定理：円周角＝中心角÷2。\n【手順】' + (2 * t) + '÷2=' + t + '°\n【ポイント】同じ弧に対する円周角はどこでも等しい。' }; },
    function () { var t = rint(15, 85); var ch = numChoices(2 * t, { spread: 40, positive: true });
      return { q: '円Oで、弧ABに対する円周角が ' + t + '° のとき、中心角∠AOB は何度？', sub: '円周角（中心角との関係）', level: '★★★', hint: '中心角は円周角の2倍', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】中心角＝円周角×2。\n【手順】' + t + '×2=' + (2 * t) + '°\n【ポイント】「中心角は2倍」とセットで覚える。' }; },
    function () { var t = rint(20, 70); var ans = 90 - t; var ch = numChoices(ans, { spread: 25, positive: true });
      return { q: 'ABが円の直径である円周上の点Pで、∠PAB = ' + t + '° のとき、∠PBA は何度？', sub: '円周角（半円の弧）', level: '★★★★', hint: '直径に対する円周角は90°', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】半円の弧に対する円周角∠APB=90°。\n【手順】三角形の内角より 180−90−' + t + '=' + ans + '°\n【ポイント】「直径→90°」は入試頻出。' }; },
    // --- 三平方の定理 ---
    function () { var tr = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29]]); var ch = numChoices(tr[2], { spread: 8, positive: true });
      return { q: '直角をはさむ2辺が ' + tr[0] + 'cm と ' + tr[1] + 'cm の直角三角形。斜辺は何cm？', sub: '三平方の定理（斜辺）', level: '★★★', hint: 'a²+b²=c²', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】三平方の定理 a²+b²=c²。\n【手順】' + tr[0] + '²+' + tr[1] + '²=' + (tr[2] * tr[2]) + ' → c=' + tr[2] + 'cm\n【ポイント】(3,4,5)(5,12,13)などの組は覚えると速い。' }; },
    function () { var tr = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [7, 24, 25]]); var ch = numChoices(tr[0], { spread: 6, positive: true });
      return { q: '斜辺が ' + tr[2] + 'cm、他の1辺が ' + tr[1] + 'cm の直角三角形。残りの辺は何cm？', sub: '三平方の定理（辺の長さ）', level: '★★★★', hint: 'c²−b²=a²', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】斜辺の2乗から引く。\n【手順】' + tr[2] + '²−' + tr[1] + '²=' + (tr[0] * tr[0]) + ' → ' + tr[0] + 'cm\n【ポイント】斜辺（いちばん長い辺）はどれかを最初に確認。' }; },
    function () { var tr = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15]]); var ch = numChoices(tr[2], { spread: 7, positive: true });
      return { q: 'たて ' + tr[0] + 'cm・よこ ' + tr[1] + 'cm の長方形の対角線の長さは何cm？', sub: '三平方の定理（対角線）', level: '★★★★', hint: '対角線＝直角三角形の斜辺', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】対角線で長方形を直角三角形に分ける。\n【手順】√(' + tr[0] + '²+' + tr[1] + '²)=' + tr[2] + 'cm\n【ポイント】立体の対角線も同じ考え方を2回使う。' }; },
    function () { var tr = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17]]); var x1 = rint(-3, 3), y1 = rint(-3, 3); var ch = numChoices(tr[2], { spread: 7, positive: true });
      return { q: '座標平面上の2点 A(' + x1 + ', ' + y1 + ') と B(' + (x1 + tr[0]) + ', ' + (y1 + tr[1]) + ') の間の距離は？', sub: '三平方の定理（2点間の距離）', level: '★★★★', hint: 'x方向とy方向の差で直角三角形', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】距離=√(xの差²+yの差²)。\n【手順】√(' + tr[0] + '²+' + tr[1] + '²)=' + tr[2] + '\n【ポイント】座標の距離問題は三平方の定理そのもの。' }; }
  ];
  PLUS_MATH.forEach(function (g) { mathGens.push(g); });

  // ============ 英語（穴：未来・不定詞/動名詞・受動態・現在完了・関係代名詞） ============
  if (typeof engGens !== 'undefined') {
    var EP_SUBJ = [['I', 'am'], ['She', 'is'], ['He', 'is'], ['They', 'are'], ['We', 'are']];
    var EP_VERBS = [
      { base: 'play',  ing: 'playing',  pp: 'played',  toV: 'to play',  jp: '（スポーツを）する' },
      { base: 'study', ing: 'studying', pp: 'studied', toV: 'to study', jp: '勉強する' },
      { base: 'clean', ing: 'cleaning', pp: 'cleaned', toV: 'to clean', jp: 'そうじする' },
      { base: 'use',   ing: 'using',    pp: 'used',    toV: 'to use',   jp: '使う' },
      { base: 'make',  ing: 'making',   pp: 'made',    toV: 'to make',  jp: '作る' },
      { base: 'write', ing: 'writing',  pp: 'written', toV: 'to write', jp: '書く' },
      { base: 'speak', ing: 'speaking', pp: 'spoken',  toV: 'to speak', jp: '話す' },
      { base: 'eat',   ing: 'eating',   pp: 'eaten',   toV: 'to eat',   jp: '食べる' },
      { base: 'see',   ing: 'seeing',   pp: 'seen',    toV: 'to see',   jp: '見る' },
      { base: 'read',  ing: 'reading',  pp: 'read',    toV: 'to read',  jp: '読む' }
    ];
    var PLUS_ENG = [
      // --- 未来表現 ---
      function () { var s = pick([['I', 'visit Kyoto'], ['She', 'play the piano'], ['They', 'study English'], ['He', 'clean his room']]); var ch = strChoices('will', ['wills', 'is will', 'won']);
        return { q: s[0] + ' ( ) ' + s[1] + ' tomorrow.　（明日〜するつもり）', sub: '未来表現（will）', level: '★★☆', hint: '未来は will＋動詞の原形', type: 'choice', choices: ch, ans: 'will', explain: '【考え方】未来のことは will＋原形。\n【手順】' + s[0] + ' will ' + s[1] + ' tomorrow.\n【ポイント】willの後ろはいつも原形（三単現sは付けない）。' }; },
      function () { var s = pick(EP_SUBJ); var v = pick(EP_VERBS); var ch = strChoices('going', ['go', 'goes', 'will']);
        return { q: s[0] + ' ' + s[1] + ' ( ) to ' + v.base + ' soccer next Sunday.', sub: '未来表現（be going to）', level: '★★★', hint: 'be going to＋原形', type: 'choice', choices: ch, ans: 'going', explain: '【考え方】be動詞+going to+原形で予定を表す。\n【手順】' + s[0] + ' ' + s[1] + ' going to ' + v.base + ' …\n【ポイント】be動詞は主語に合わせて am/is/are。' }; },
      // --- 不定詞・動名詞 ---
      function () { var pat = pick([['enjoy', 'ing'], ['finish', 'ing'], ['stop', 'ing'], ['want', 'toV'], ['hope', 'toV'], ['decide', 'toV']]); var v = pick(EP_VERBS);
        var ans = pat[1] === 'ing' ? v.ing : v.toV;
        var ch = strChoices(ans, [pat[1] === 'ing' ? v.toV : v.ing, v.base, v.pp]);
        return { q: 'I ' + pat[0] + ' ( ) tennis.　（' + (pat[1] === 'ing' ? pat[0] + ' は動名詞（〜ing）をとる' : pat[0] + ' は不定詞（to＋原形）をとる') + '）', sub: '不定詞・動名詞（使い分け）', level: '★★★★', hint: 'enjoy/finish/stop→〜ing、want/hope/decide→to＋原形', type: 'choice', choices: ch, ans: ans, explain: '【考え方】動詞によって後ろの形が決まる。\n【手順】' + pat[0] + ' のあとは ' + (pat[1] === 'ing' ? '動名詞(〜ing)' : '不定詞(to＋原形)') + ' → ' + ans + '\n【ポイント】enjoy・finish・stop は 〜ing だけ。' }; },
      function () { var v = pick(EP_VERBS); var purpose = pick([['to the library', '勉強するために'], ['to the park', 'サッカーをするために']]); var ch = strChoices(v.toV, [v.ing, v.base, v.pp]);
        return { q: 'I went ' + purpose[0] + ' ( ) .　（' + purpose[1] + '＝目的を表す形に）', sub: '不定詞（目的）', level: '★★★', hint: '「〜するために」は to＋原形', type: 'choice', choices: ch, ans: v.toV, explain: '【考え方】目的（〜するために）は不定詞の副詞的用法。\n【手順】to＋動詞の原形 → ' + v.toV + '\n【ポイント】不定詞の3用法（名詞的・形容詞的・副詞的）。' }; },
      // --- 受動態 ---
      function () { var v = pick(EP_VERBS); var s = pick([['This room', 'is'], ['These books', 'are'], ['English', 'is']]); var ans = s[1] + ' ' + v.pp;
        var ch = strChoices(ans, [s[1] + ' ' + v.base, s[1] + ' ' + v.ing, (s[1] === 'is' ? 'are' : 'is') + ' ' + v.pp]);
        return { q: s[0] + ' ( ) by Ken every day.　（〜される：受け身の形に）', sub: '受動態（現在）', level: '★★★★', hint: 'be動詞＋過去分詞', type: 'choice', choices: ch, ans: ans, explain: '【考え方】受動態＝be動詞＋過去分詞。\n【手順】主語が' + s[0] + 'なので ' + ans + '\n【ポイント】「by 〜」は「〜によって」。' }; },
      function () { var v = pick(EP_VERBS); var s = pick([['This temple', 'was'], ['These pictures', 'were']]); var ans = s[1] + ' ' + v.pp;
        var ch = strChoices(ans, [(s[1] === 'was' ? 'were' : 'was') + ' ' + v.pp, s[1] + ' ' + v.base, 'is ' + v.pp]);
        return { q: s[0] + ' ( ) 100 years ago.　（100年前に〜された）', sub: '受動態（過去）', level: '★★★★', hint: '過去の受け身は was/were＋過去分詞', type: 'choice', choices: ch, ans: ans, explain: '【考え方】過去の受動態＝was/were＋過去分詞。\n【手順】' + s[0] + ' ' + ans + ' …\n【ポイント】主語が複数なら were。' }; },
      // --- 現在完了 ---
      function () { var s = pick([['I', 'have'], ['She', 'has'], ['They', 'have'], ['He', 'has']]); var ch = strChoices(s[1], [s[1] === 'have' ? 'has' : 'have', 'had', 'having']);
        return { q: s[0] + ' ( ) just finished lunch.　（ちょうど〜したところ：現在完了）', sub: '現在完了（have/has）', level: '★★★★', hint: '主語で have / has を使い分け', type: 'choice', choices: ch, ans: s[1], explain: '【考え方】現在完了＝have/has＋過去分詞。\n【手順】主語が' + s[0] + 'なので ' + s[1] + '\n【ポイント】三人称単数（He/She）は has。' }; },
      function () { var v = pick(EP_VERBS); var ch = strChoices(v.pp, [v.base, v.ing, v.base + 'ed' === v.pp ? v.base + 's' : v.base + 'ed']);
        return { q: 'Have you ever ( ) this book?　（今までに〜したことがある？）', sub: '現在完了（過去分詞）', level: '★★★★', hint: 'have＋過去分詞。everは「今までに」', type: 'choice', choices: ch, ans: v.pp, explain: '【考え方】現在完了は過去分詞を使う。\n【手順】' + v.base + ' の過去分詞は ' + v.pp + '\n【ポイント】経験は ever / never とセットが多い。' }; },
      // --- 関係代名詞 ---
      function () { var pat = pick([['a friend', 'lives in Tokyo', 'who'], ['a book', 'makes me happy', 'which'], ['a dog', 'runs very fast', 'which'], ['an uncle', 'speaks English well', 'who']]);
        var ch = strChoices(pat[2], [pat[2] === 'who' ? 'which' : 'who', 'what', 'where']);
        return { q: 'I have ' + pat[0] + ' ( ) ' + pat[1] + '.　（先行詞に合う関係代名詞は？）', sub: '関係代名詞（who/which）', level: '★★★★', hint: '人→who、物・動物→which', type: 'choice', choices: ch, ans: pat[2], explain: '【考え方】直前の名詞（先行詞）が人か物かで決まる。\n【手順】' + pat[0] + ' は' + (pat[2] === 'who' ? '人' : '物・動物') + ' → ' + pat[2] + '\n【ポイント】that は人にも物にも使える。' }; }
    ];
    PLUS_ENG.forEach(function (g) { engGens.push(g); });
  }

  // ============ 理科（穴：動物・人体／遺伝・生殖／天気） ============
  if (typeof sciGens !== 'undefined') {
    var SAT_VAPOR = [[10, 9.4], [15, 12.8], [20, 17.3], [25, 23.1], [30, 30.4]];   // 気温℃→飽和水蒸気量g/m³
    var DIGEST = [['だ液', 'アミラーゼ', 'デンプン'], ['胃液', 'ペプシン', 'タンパク質'], ['すい液', 'リパーゼ', '脂肪']];
    var BLOOD = [['赤血球', '酸素を運ぶ'], ['白血球', '細菌などを分解する'], ['血小板', '出血を固める'], ['血しょう', '養分や不要物を運ぶ']];
    var PLUS_SCI = [
      function () { var d = pick(DIGEST); var ch = strChoices(d[1], DIGEST.map(function (x) { return x[1]; }).filter(function (x) { return x !== d[1]; }).concat(['トリプシン']));
        return { q: d[0] + ' にふくまれ、' + d[2] + ' を分解する消化酵素は？', sub: '人体（消化のはたらき）', level: '★★★', hint: 'だ液→デンプン、胃液→タンパク質、すい液→脂肪', type: 'choice', choices: ch, ans: d[1], explain: '【考え方】消化液・酵素・分解する養分の3点セットで覚える。\n【手順】' + d[0] + '→' + d[1] + '→' + d[2] + '\n【ポイント】アミラーゼはだ液とすい液の両方に含まれる。' }; },
      function () { var b = pick(BLOOD); var ch = strChoices(b[0], BLOOD.map(function (x) { return x[0]; }).filter(function (x) { return x !== b[0]; }));
        return { q: '血液の成分のうち「' + b[1] + '」はたらきをもつのは？', sub: '人体（血液の成分）', level: '★★★', hint: '赤血球=酸素、白血球=防御、血小板=止血', type: 'choice', choices: ch, ans: b[0], explain: '【考え方】成分と役割を対で覚える。\n【手順】' + b[1] + '→' + b[0] + '\n【ポイント】赤血球のヘモグロビンが酸素と結びつく。' }; },
      function () { var pair = pick([['ハト', '鳥類'], ['イモリ', '両生類'], ['ヤモリ', 'は虫類'], ['クジラ', 'ほ乳類'], ['メダカ', '魚類'], ['カエル', '両生類'], ['ワニ', 'は虫類']]);
        var ch = strChoices(pair[1], ['魚類', '両生類', 'は虫類', '鳥類', 'ほ乳類'].filter(function (x) { return x !== pair[1]; }));
        return { q: 'セキツイ動物のうち、「' + pair[0] + '」は何類？', sub: '動物の分類（セキツイ動物）', level: '★★☆', hint: 'イモリ=両生類・ヤモリ=は虫類に注意', type: 'choice', choices: ch, ans: pair[1], explain: '【考え方】呼吸・体温・生まれ方で5類に分ける。\n【手順】' + pair[0] + 'は' + pair[1] + '\n【ポイント】クジラは魚ではなく ほ乳類。' }; },
      // --- 遺伝（手続き生成） ---
      function () { var k = rint(40, 200); var total = 4 * k; var ch = numChoices(k, { spread: Math.max(20, Math.round(k / 2)), positive: true });
        return { q: '丸(A)としわ(a)のエンドウで Aa × Aa をかけ合わせ、種子が ' + total + ' 個できた。しわの種子はおよそ何個？', sub: '遺伝の規則性（分離の法則）', level: '★★★★', hint: '丸:しわ = 3:1', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】Aa×Aa → AA:Aa:aa=1:2:1、見た目は丸:しわ=3:1。\n【手順】' + total + '×1/4=' + k + '個\n【ポイント】潜性(劣性)は全体の1/4。' }; },
      function () { var k = rint(30, 150); var total = 2 * k; var ch = numChoices(k, { spread: Math.max(16, Math.round(k / 2)), positive: true });
        return { q: 'Aa × aa をかけ合わせて ' + total + ' 個の種子ができた。しわ(aa)はおよそ何個？', sub: '遺伝の規則性（かけ合わせ）', level: '★★★★', hint: 'Aa:aa = 1:1', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】Aa×aa → Aa:aa=1:1。\n【手順】' + total + '×1/2=' + k + '個\n【ポイント】表をかいて組み合わせを数える。' }; },
      function () { var n = pick([46, 24, 16, 20, 8]); var ch = numChoices(n / 2, { spread: 10, positive: true });
        return { q: '体細胞の染色体数が ' + n + ' 本の生物では、生殖細胞（卵や精子）の染色体数は何本？', sub: '遺伝・生殖（減数分裂）', level: '★★★', hint: '減数分裂で半分になる', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】生殖細胞は減数分裂で染色体が半分。\n【手順】' + n + '÷2=' + (n / 2) + '本\n【ポイント】受精すると元の' + n + '本にもどる。' }; },
      // --- 天気（手続き生成） ---
      function () { var sv = pick(SAT_VAPOR); var h = pick([40, 50, 60, 65, 70, 75, 80, 90]); var v = Math.round(sv[1] * h / 100 * 10) / 10; var ansH = Math.round(v / sv[1] * 100); var ch = numChoices(ansH, { spread: 20, positive: true });
        return { q: '気温 ' + sv[0] + '℃（飽和水蒸気量 ' + sv[1] + 'g/m³）の空気 1m³ に水蒸気が ' + v + 'g ふくまれている。湿度はおよそ何%？', sub: '天気（湿度の計算）', level: '★★★★', hint: '湿度=水蒸気量÷飽和水蒸気量×100', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】湿度(%)＝実際の水蒸気量÷飽和水蒸気量×100。\n【手順】' + v + '÷' + sv[1] + '×100≒' + ansH + '%\n【ポイント】気温が上がると飽和水蒸気量も大きくなる。' }; },
      function () { var i = rint(1, SAT_VAPOR.length - 1); var now = SAT_VAPOR[i], dew = SAT_VAPOR[rint(0, i - 1)]; var ch = numChoices(dew[0], { spread: 10, positive: true });
        return { q: '気温 ' + now[0] + '℃ の空気 1m³ に水蒸気が ' + dew[1] + 'g ふくまれている。この空気の露点はおよそ何℃？（' + dew[0] + '℃の飽和水蒸気量は ' + dew[1] + 'g/m³）', sub: '天気（露点）', level: '★★★★', hint: '飽和水蒸気量＝今の水蒸気量になる温度', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】冷やしていって水蒸気が飽和する温度＝露点。\n【手順】' + dew[1] + 'g/m³が飽和になるのは' + dew[0] + '℃\n【ポイント】露点では湿度100%。' }; },
      function () { var f = pick([['寒冷前線', '積乱雲ができ、短時間に強い雨。通過後は気温が下がる'], ['温暖前線', '乱層雲ができ、長時間おだやかな雨。通過後は気温が上がる']]);
        var other = f[0] === '寒冷前線' ? '温暖前線' : '寒冷前線';
        var ch = strChoices(f[0], [other, '停滞前線', '閉そく前線']);
        return { q: '「' + f[1] + '」——この特徴をもつ前線は？', sub: '天気（前線）', level: '★★★', hint: '寒冷=積乱雲・にわか雨、温暖=乱層雲・長い雨', type: 'choice', choices: ch, ans: f[0], explain: '【考え方】前線の種類と雲・雨・気温変化をセットで覚える。\n【手順】' + f[1] + '→' + f[0] + '\n【ポイント】梅雨は停滞前線（梅雨前線）。' }; }
    ];
    PLUS_SCI.forEach(function (g) { sciGens.push(g); });
  }

  // ============ 社会（穴：歴史・近世／歴史・近現代／公民・経済） ============
  if (typeof socGens !== 'undefined') {
    var EDO = [[1603, '徳川家康が江戸幕府を開く'], [1635, '参勤交代の制度化（徳川家光）'], [1637, '島原・天草一揆'], [1641, '鎖国の完成（出島でオランダと貿易）'], [1716, '享保の改革（徳川吉宗）'], [1787, '寛政の改革（松平定信）'], [1841, '天保の改革（水野忠邦）'], [1853, 'ペリーが浦賀に来航'], [1867, '大政奉還（徳川慶喜）']];
    var MEIJI = [[1868, '明治維新（五箇条の御誓文）'], [1889, '大日本帝国憲法の発布'], [1894, '日清戦争が始まる'], [1904, '日露戦争が始まる'], [1914, '第一次世界大戦が始まる'], [1925, '普通選挙法の成立'], [1931, '満州事変'], [1941, '太平洋戦争が始まる'], [1945, '終戦（ポツダム宣言受諾）'], [1946, '日本国憲法の公布'], [1951, 'サンフランシスコ平和条約'], [1964, '東京オリンピック開催']];
    function eventGen(table, subName) {
      return function () {
        var i = rint(0, table.length - 1); var e = table[i];
        var wrongs = []; table.forEach(function (x, j) { if (j !== i) wrongs.push(String(x[0])); });
        var ch = strChoices(String(e[0]), shuffleArr(wrongs));
        return { q: '「' + e[1] + '」は西暦何年？', sub: subName, level: '★★★', hint: '前後の出来事と流れで覚える', type: 'choice', choices: ch, ans: String(e[0]), explain: '【考え方】年号は出来事の順番とセットで覚える。\n【手順】' + e[1] + '＝' + e[0] + '年\n【ポイント】語呂合わせも活用しよう。' };
      };
    }
    function eventGen2(table, subName) {
      return function () {
        var i = rint(0, table.length - 1); var e = table[i];
        var wrongs = []; table.forEach(function (x, j) { if (j !== i) wrongs.push(x[1]); });
        var ch = strChoices(e[1], shuffleArr(wrongs));
        return { q: e[0] + '年の出来事は？', sub: subName, level: '★★★★', hint: '時代の流れで前後を思い出す', type: 'choice', choices: ch, ans: e[1], explain: '【考え方】年号→出来事の逆引き。\n【手順】' + e[0] + '年＝' + e[1] + '\n【ポイント】世紀（100年区切り）も意識する。' };
      };
    }
    var ECON = [
      ['所得税', '直接税'], ['法人税', '直接税'], ['相続税', '直接税'], ['消費税', '間接税'], ['酒税', '間接税'], ['関税', '間接税']
    ];
    var PLUS_SOC = [
      eventGen(EDO, '歴史・江戸時代（年号）'),
      eventGen2(EDO, '歴史・江戸時代（出来事）'),
      eventGen(MEIJI, '歴史・明治以降（年号）'),
      eventGen2(MEIJI, '歴史・明治以降（出来事）'),
      function () { var d = pick([['ほしい人（需要）が多く、品物（供給）が少ない', '上がる'], ['ほしい人（需要）が少なく、品物（供給）が多い', '下がる']]);
        var ch = strChoices(d[1], [d[1] === '上がる' ? '下がる' : '上がる', '変わらない', '0になる']);
        return { q: '市場で「' + d[0] + '」とき、価格はどうなる？', sub: '公民・経済（需要と供給）', level: '★★★', hint: '少ないものは高くなる', type: 'choice', choices: ch, ans: d[1], explain: '【考え方】需要＞供給なら価格は上がる。\n【手順】' + d[0] + '→' + d[1] + '\n【ポイント】つり合う点が均衡価格。' }; },
      function () { var t = pick(ECON); var ch = strChoices(t[1], [t[1] === '直接税' ? '間接税' : '直接税', '地方税だけ', '関税']);
        return { q: '「' + t[0] + '」は直接税・間接税のどちら？', sub: '公民・経済（税金）', level: '★★★', hint: '払う人と納める人が同じ→直接税', type: 'choice', choices: ch, ans: t[1], explain: '【考え方】負担する人＝納める人なら直接税。\n【手順】' + t[0] + 'は' + t[1] + '\n【ポイント】消費税は買う人が負担し、店が納める＝間接税。' }; },
      function () { var d = pick([['円高', '輸入', '有利'], ['円高', '輸出', '不利'], ['円安', '輸出', '有利'], ['円安', '輸入', '不利']]);
        var ch = strChoices(d[2], [d[2] === '有利' ? '不利' : '有利', '関係ない', '禁止になる']);
        return { q: d[0] + 'になると、日本の' + d[1] + '企業にとって一般に' + '（　）になる。', sub: '公民・経済（円高・円安）', level: '★★★★', hint: '円高=外国製品が安く買える', type: 'choice', choices: ch, ans: d[2], explain: '【考え方】円高は円の価値が上がる＝輸入に有利・輸出に不利。\n【手順】' + d[0] + '×' + d[1] + '→' + d[2] + '\n【ポイント】円安はその逆。' }; },
      function () { var r = pick([['発券銀行', '紙幣（日本銀行券）を発行する'], ['政府の銀行', '政府のお金を管理する'], ['銀行の銀行', '一般の銀行にお金を貸す']]);
        var ch = strChoices(r[0], ['発券銀行', '政府の銀行', '銀行の銀行'].filter(function (x) { return x !== r[0]; }).concat(['ゆうちょ銀行']));
        return { q: '日本銀行の役割のうち「' + r[1] + '」を表すのは？', sub: '公民・経済（日本銀行）', level: '★★★★', hint: '日銀の3つの顔', type: 'choice', choices: ch, ans: r[0], explain: '【考え方】日本銀行の3つの役割を覚える。\n【手順】' + r[1] + '＝' + r[0] + '\n【ポイント】個人は日銀に口座を作れない。' }; }
    ];
    PLUS_SOC.forEach(function (g) { socGens.push(g); });
  }
})();
