/* generators-hard.js：難問（★★★★＝難関/入試級 中心）の手続き生成。
   答えはすべて計算で求めるので必ず正しい（LLM生成ではない）。
   generators.js の後に読み込み、mathGens に push する（genQuestion / 冒険の高lvバトル / 難易度「難関」で出る）。 */
(function () {
  if (typeof mathGens === 'undefined' || typeof rint !== 'function' || typeof numChoices !== 'function') return;
  function sgn(n) { return n < 0 ? '−' + (-n) : '+' + n; }              // 符号つき（式表示用）
  function par(n) { return n < 0 ? '(' + n + ')' : '' + n; }

  var HARD_MATH = [
    // ① 連立方程式（加減法で解く。解 x,y は整数を先に決めるので必ず一意）
    function () {
      var x = rint(-6, 6), y = rint(-6, 6), a = rint(1, 5), b = rint(1, 5), c = rint(1, 5), d = -rint(1, 5);
      var e1 = a * x + b * y, e2 = c * x + d * y, ch = numChoices(x, { spread: 5 });
      return { q: '連立方程式  ' + a + 'x' + sgn(b) + 'y=' + e1 + ' , ' + c + 'x' + sgn(d) + 'y=' + e2 + '  のとき x は？',
        sub: '連立方程式', level: '★★★★', hint: '加減法で1文字を消す', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】係数をそろえて1文字を消去。\n【手順】解くと x=' + x + '（y=' + y + '）\n【ポイント】加減法：足すか引くかで消す文字を選ぶ。' };
    },
    // ② 一次関数：2点を通る直線の傾き a（=Δy/Δx。割り切れるように作る）
    function () {
      var a = rint(-4, 4) || 2, x1 = rint(-5, 2), dx = rint(1, 4), x2 = x1 + dx, b = rint(-6, 6);
      var y1 = a * x1 + b, y2 = a * x2 + b, ch = numChoices(a, { spread: 4 });
      return { q: '2点 (' + x1 + ', ' + y1 + ') と (' + x2 + ', ' + y2 + ') を通る直線の傾きは？',
        sub: '一次関数（傾き）', level: '★★★', hint: '傾き＝yの増加量 ÷ xの増加量', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】傾き＝(y2−y1)/(x2−x1)。\n【手順】(' + y2 + '−' + y1 + ')/(' + x2 + '−' + x1 + ')=' + (y2 - y1) + '/' + dx + '=' + a + '\n【ポイント】変化の割合＝一定の傾き。' };
    },
    // ③ 一次関数：y=ax+b に x を代入した y の値
    function () {
      var a = rint(-5, 5) || 3, b = rint(-8, 8), k = rint(-6, 6), y = a * k + b, ch = numChoices(y, { spread: 6 });
      return { q: 'y=' + a + 'x' + sgn(b) + ' で、x=' + k + ' のときの y は？',
        sub: '一次関数（代入）', level: '★★★', hint: 'x に数を代入して計算', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】x に代入。\n【手順】' + a + '×' + par(k) + sgn(b) + '=' + (a * k) + sgn(b) + '=' + y + '\n【ポイント】かけ算を先に、符号に注意。' };
    },
    // ④ 式の展開：(x+a)(x+b) の x の係数（=a+b）
    function () {
      var a = rint(-7, 7), b = rint(-7, 7), coef = a + b, konst = a * b, ch = numChoices(coef, { spread: 5 });
      return { q: '(x' + sgn(a) + ')(x' + sgn(b) + ') を展開したとき、x の係数は？',
        sub: '式の展開', level: '★★★', hint: '(x+a)(x+b)=x²+(a+b)x+ab', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】展開公式。\n【手順】x²' + sgn(coef) + 'x' + sgn(konst) + ' → xの係数は ' + coef + '\n【ポイント】x の係数は a+b、定数項は a×b。' };
    },
    // ⑤ 平方根の計算：√a × √b = √(ab)（ab が平方数になるよう作る）
    function () {
      var r = rint(2, 9), a = r * rint(1, 4), b = r; // √(a)·√(b): a=r*k, b=r → ab=r²k … 調整
      // ab を平方数にするため a=r*m², b=r として √a·√b=r√(m²)…簡単化のため別方式：√a·√a=a
      var n = rint(3, 12), ans = n; var ch = numChoices(ans, { spread: 4, positive: true });
      return { q: '√' + n + ' × √' + n + ' を計算すると？',
        sub: '平方根', level: '★★★', hint: '√a × √a = a', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】√a×√a=√(a²)=a。\n【手順】√' + n + '×√' + n + '=' + n + '\n【ポイント】同じ数の平方根どうしの積は元の数。' };
    },
    // ⑥ 平方根の積：√a × √b = √(ab)（ab が平方数）
    function () {
      var m = rint(2, 6); var a = 2, b = 2 * m * m; // √2·√(2m²)=√(4m²)=2m
      var ans = 2 * m, ch = numChoices(ans, { spread: 4, positive: true });
      return { q: '√' + a + ' × √' + b + ' を計算すると？（整数になる）',
        sub: '平方根の積', level: '★★★★', hint: '√a×√b=√(ab)、平方数を見つける', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】√a×√b=√(ab)。\n【手順】√(' + a + '×' + b + ')=√' + (a * b) + '=' + ans + '（' + ans + '²=' + (ans * ans) + '）\n【ポイント】中身をかけて平方数にする。' };
    },
    // ⑦ 多角形の内角の和 180(n−2)
    function () {
      var n = rint(5, 12), ans = 180 * (n - 2), ch = numChoices(ans, { spread: 120, positive: true });
      return { q: n + '角形の内角の和は何度？',
        sub: '多角形の内角', level: '★★★', hint: '180×(n−2)', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】n角形の内角の和＝180×(n−2)。\n【手順】180×(' + n + '−2)=180×' + (n - 2) + '=' + ans + '度\n【ポイント】三角形に分ける個数が n−2。' };
    },
    // ⑧ 正多角形の1つの外角（=360/n）
    function () {
      var ns = [3, 4, 5, 6, 8, 9, 10, 12], n = pick(ns), ans = 360 / n, ch = numChoices(ans, { spread: 20, positive: true });
      return { q: '正' + n + '角形の1つの外角は何度？',
        sub: '正多角形の外角', level: '★★★', hint: '外角の和は360°', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】外角の和は360°。\n【手順】360÷' + n + '=' + ans + '度\n【ポイント】1つの外角＝360÷n。' };
    },
    // ⑨ さいころ2個の和の確率（分子。分母36）
    function () {
      var s = rint(2, 12), cnt = 0;
      for (var i = 1; i <= 6; i++) for (var j = 1; j <= 6; j++) if (i + j === s) cnt++;
      var ch = numChoices(cnt, { spread: 3, positive: true });
      return { q: '大小2つのさいころを投げる。出た目の和が ' + s + ' になる確率を 分子/36 で表すと、分子は？',
        sub: '確率（さいころ）', level: '★★★★', hint: '和が' + s + 'になる組み合わせを数える', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】全36通りのうち和が' + s + 'の組を数える。\n【手順】数えると ' + cnt + '通り → 確率 ' + cnt + '/36\n【ポイント】表を書いて数えると確実。' };
    },
    // ⑩ 等差数列の第n項 a+(n−1)d
    function () {
      var a = rint(-5, 9), d = rint(2, 6), n = rint(6, 15), ans = a + (n - 1) * d, ch = numChoices(ans, { spread: 8 });
      return { q: a + ', ' + (a + d) + ', ' + (a + 2 * d) + ', … と ' + d + 'ずつ増える数列の 第' + n + '項は？',
        sub: '規則性（等差）', level: '★★★★', hint: '第n項＝初項＋(n−1)×公差', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】等差数列の一般項。\n【手順】' + a + '+(' + n + '−1)×' + d + '=' + a + '+' + ((n - 1) * d) + '=' + ans + '\n【ポイント】(n−1)個ぶん公差を足す。' };
    },
    // ⑪ 食塩水の濃度（%）：食塩/全体×100（割り切れるよう作る）
    function () {
      var salt = rint(1, 9) * 3, total = salt * pick([2, 4, 5, 10]); // 濃度=100*salt/total が整数になりやすい
      // 濃度を整数にするため total を調整
      var pct = Math.round(100 * salt / total);
      // 割り切れる組を作り直し
      var p = pick([5, 10, 15, 20, 25]); total = 100 * salt / p; if (!Number.isInteger(total)) { salt = 20; total = 100; p = 20; }
      var ch = numChoices(p, { spread: 8, positive: true });
      return { q: '食塩 ' + salt + 'g を水にとかして 食塩水 ' + total + 'g をつくった。濃度は何％？',
        sub: '割合（濃度）', level: '★★★', hint: '濃度％＝食塩÷食塩水×100', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】濃度＝食塩の重さ÷食塩水の重さ×100。\n【手順】' + salt + '÷' + total + '×100=' + p + '％\n【ポイント】食塩水＝水＋食塩。' };
    },
    // ⑫ 速さ：道のり＝速さ×時間
    function () {
      var v = rint(3, 12), t = rint(2, 6), dist = v * t, ch = numChoices(dist, { spread: 12, positive: true });
      return { q: '時速 ' + v + 'km で ' + t + '時間 進むと 何km？',
        sub: '速さ', level: '★★★', hint: '道のり＝速さ×時間', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】み・は・じ。道のり＝速さ×時間。\n【手順】' + v + '×' + t + '=' + dist + 'km\n【ポイント】単位をそろえる。' };
    },
    // ⑬ 場合の数：異なるn個から2個を選ぶ組み合わせ nC2 = n(n−1)/2
    function () {
      var n = rint(4, 9), ans = n * (n - 1) / 2, ch = numChoices(ans, { spread: 6, positive: true });
      return { q: '' + n + '人から 委員を 2人 えらぶ 選び方は 何通り？（順番は関係なし）',
        sub: '場合の数（組合せ）', level: '★★★★', hint: 'nC2 = n(n−1)/2', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】組合せ nC2。\n【手順】' + n + '×' + (n - 1) + '÷2=' + ans + '通り\n【ポイント】順番ありは順列(×そのまま)、なしは÷2。' };
    },
    // ⑭ 直方体の体積 = たて×よこ×高さ
    function () {
      var a = rint(2, 9), b = rint(2, 9), c = rint(2, 9), ans = a * b * c, ch = numChoices(ans, { spread: 40, positive: true });
      return { q: 'たて' + a + 'cm、よこ' + b + 'cm、高さ' + c + 'cm の 直方体の 体積は 何cm³？',
        sub: '体積（直方体）', level: '★★★', hint: '体積＝たて×よこ×高さ', type: 'choice', choices: ch.choices, ans: ch.ans,
        explain: '【考え方】直方体の体積。\n【手順】' + a + '×' + b + '×' + c + '=' + ans + 'cm³\n【ポイント】3つの辺をかける。' };
    }
  ];
  HARD_MATH.forEach(function (g) { mathGens.push(g); });
})();

/* 他教科の難問（★★★/★★★★）。答えは
   ・計算で求める（理科の一部）＝必ず正しい
   ・検証済みの事実テーブルから引く（知識系）＝テーブルが正しければ必ず正しい
   のどちらか。LLM生成の文章は使わない。 */
(function () {
  if (typeof rint !== 'function' || typeof pick !== 'function' || typeof shuffleArr !== 'function') return;
  // 事実テーブルから4択を作る（正解＋他項目3つ）
  function tchoice(correct, all, key) {
    var others = shuffleArr(all.filter(function (x) { return x[key] !== correct; })).slice(0, 3).map(function (x) { return x[key]; });
    return shuffleArr([correct].concat(others));
  }

  // ===== 理科 =====
  if (typeof sciGens !== 'undefined') {
    var SCI_FORM = [['水', 'H₂O'], ['二酸化炭素', 'CO₂'], ['酸素', 'O₂'], ['水素', 'H₂'], ['塩化ナトリウム', 'NaCl'], ['アンモニア', 'NH₃'], ['窒素', 'N₂']];
    var HARD_SCI = [
      // オームの法則 V=IR（計算）
      function () { var R = rint(2, 20), I = rint(1, 6), V = R * I, ch = numChoices(V, { spread: 12, positive: true, unit: '' });
        return { q: '抵抗 ' + R + 'Ω に ' + I + 'A の電流を流した。電圧は何V？', sub: '電流（オームの法則）', level: '★★★★', hint: '電圧＝電流×抵抗（V=IR）', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】オームの法則 V=I×R。\n【手順】' + I + '×' + R + '=' + V + 'V\n【ポイント】V=IR、I=V/R、R=V/I。' }; },
      // 密度（計算・割り切れる）
      function () { var d = rint(2, 9), v = pick([2, 4, 5, 10]), m = d * v, ch = numChoices(d, { spread: 4, positive: true });
        return { q: '体積 ' + v + 'cm³、質量 ' + m + 'g の金属の密度は 何g/cm³？', sub: '密度', level: '★★★', hint: '密度＝質量÷体積', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】密度＝質量÷体積。\n【手順】' + m + '÷' + v + '=' + d + 'g/cm³\n【ポイント】水の密度は約1.0g/cm³。' }; },
      // 圧力 P=F/A（計算・割り切れる）
      function () { var A = pick([2, 4, 5, 10]), P = rint(2, 40), F = P * A, ch = numChoices(P, { spread: 15, positive: true });
        return { q: '面積 ' + A + 'm² に ' + F + 'N の力がはたらく。圧力は何Pa？', sub: '圧力', level: '★★★★', hint: '圧力＝力÷面積（Pa）', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】圧力＝力÷面積。\n【手順】' + F + '÷' + A + '=' + P + 'Pa\n【ポイント】1Pa＝1N/m²。' }; },
      // 化学式（事実テーブル）
      function () { var w = pick(SCI_FORM);
        return { q: '「' + w[0] + '」の化学式は？', sub: '化学式', level: '★★★★', hint: '原子の記号と数', type: 'choice', choices: tchoice(w[1], SCI_FORM, 1), ans: w[1], explain: '【考え方】物質を原子の記号で表す。\n【手順】' + w[0] + '＝' + w[1] + '\n【ポイント】数字は右下に小さく書く。' }; }
    ];
    HARD_SCI.forEach(function (g) { sciGens.push(g); });
  }

  // ===== 社会 =====
  if (typeof socGens !== 'undefined') {
    var SOC_YEAR = [['大化の改新', '645'], ['関ヶ原の戦い', '1600'], ['江戸幕府が開かれた', '1603'], ['ペリーが来航した', '1853'], ['明治維新（明治に改元）', '1868'], ['大日本帝国憲法の発布', '1889'], ['日清戦争が始まった', '1894'], ['日露戦争が始まった', '1904'], ['第一次世界大戦が始まった', '1914'], ['第二次世界大戦が終わった', '1945']];
    var SOC_CAPITAL = [['フランス', 'パリ'], ['ドイツ', 'ベルリン'], ['イタリア', 'ローマ'], ['イギリス', 'ロンドン'], ['アメリカ', 'ワシントンD.C.'], ['中国', 'ペキン'], ['カナダ', 'オタワ'], ['オーストラリア', 'キャンベラ'], ['ブラジル', 'ブラジリア'], ['エジプト', 'カイロ'], ['韓国', 'ソウル'], ['ロシア', 'モスクワ']];
    var SOC_CURR = [['アメリカ', 'ドル'], ['イギリス', 'ポンド'], ['中国', '元'], ['韓国', 'ウォン'], ['インド', 'ルピー'], ['ロシア', 'ルーブル'], ['フランス', 'ユーロ'], ['タイ', 'バーツ']];
    var HARD_SOC = [
      // 歴史年号（事実テーブル・記述）
      function () { var e = pick(SOC_YEAR);
        return { q: '「' + e[0] + '」は 何年？（西暦・数字で）', sub: '歴史の年号', level: '★★★★', hint: 'できごとと年をセットで覚える', type: 'free', ans: e[1], altAns: [e[1] + '年'], explain: '【考え方】重要なできごとの年号。\n【手順】' + e[0] + '＝' + e[1] + '年\n【ポイント】前後のできごとと順番でも覚える。' }; },
      // 世界の首都（事実テーブル）
      function () { var w = pick(SOC_CAPITAL);
        return { q: '「' + w[0] + '」の首都は？', sub: '世界の首都', level: '★★★', hint: '地図で位置も確認', type: 'choice', choices: tchoice(w[1], SOC_CAPITAL, 1), ans: w[1], explain: '【考え方】国と首都をセットで。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】最大都市と首都がちがう国に注意（例：アメリカ・オーストラリア）。' }; },
      // 世界の通貨（事実テーブル）
      function () { var w = pick(SOC_CURR);
        return { q: '「' + w[0] + '」で使われている通貨は？', sub: '世界の通貨', level: '★★★', hint: '国と通貨をセットで', type: 'choice', choices: tchoice(w[1], SOC_CURR, 1), ans: w[1], explain: '【考え方】主要国の通貨。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】ユーロは多くのヨーロッパの国で共通。' }; }
    ];
    HARD_SOC.forEach(function (g) { socGens.push(g); });
  }

  // ===== 英語 =====
  if (typeof engGens !== 'undefined') {
    var ENG_PAST = [['go', 'went'], ['come', 'came'], ['see', 'saw'], ['eat', 'ate'], ['get', 'got'], ['take', 'took'], ['make', 'made'], ['run', 'ran'], ['write', 'wrote'], ['buy', 'bought'], ['have', 'had'], ['give', 'gave'], ['find', 'found'], ['know', 'knew']];
    var ENG_COMP = [['big', 'bigger'], ['good', 'better'], ['many', 'more'], ['hot', 'hotter'], ['easy', 'easier'], ['happy', 'happier'], ['large', 'larger'], ['busy', 'busier'], ['fast', 'faster'], ['bad', 'worse']];
    var ENG_PLURAL = [['child', 'children'], ['man', 'men'], ['woman', 'women'], ['foot', 'feet'], ['tooth', 'teeth'], ['mouse', 'mice'], ['leaf', 'leaves'], ['knife', 'knives'], ['city', 'cities'], ['box', 'boxes']];
    var HARD_ENG = [
      // 不規則動詞の過去形（記述）
      function () { var w = pick(ENG_PAST);
        return { q: '「' + w[0] + '」の過去形は？（英語で）', sub: '不規則動詞の過去形', level: '★★★★', hint: '不規則変化はそのまま覚える', type: 'free', ans: w[1], altAns: [w[1], w[1].charAt(0).toUpperCase() + w[1].slice(1)], explain: '【考え方】不規則動詞は形が変わる。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】規則動詞は+ed。不規則は暗記。' }; },
      // 比較級（記述）
      function () { var w = pick(ENG_COMP);
        return { q: '「' + w[0] + '」の比較級は？（英語で）', sub: '比較級', level: '★★★★', hint: '-er／不規則／yはier', type: 'free', ans: w[1], altAns: [w[1]], explain: '【考え方】比較級の作り方。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】good→better, many→more は不規則。' }; },
      // 複数形（記述）
      function () { var w = pick(ENG_PLURAL);
        return { q: '「' + w[0 ] + '」の複数形は？（英語で）', sub: '名詞の複数形', level: '★★★', hint: '不規則な複数形に注意', type: 'free', ans: w[1], altAns: [w[1]], explain: '【考え方】複数形の作り方。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】child→children など不規則は暗記。' }; }
    ];
    HARD_ENG.forEach(function (g) { engGens.push(g); });
  }

  // ===== 国語 =====
  if (typeof jpGens !== 'undefined') {
    var JP_YOJI = [['一石二鳥', '一つのことで二つの利益を得る'], ['十人十色', '人それぞれ好みや考えがちがう'], ['温故知新', '昔のことを学んで新しい知識を得る'], ['臨機応変', 'その場に応じてうまく対応する'], ['一期一会', '一生に一度の出会いを大切にする'], ['自業自得', '自分の行いの結果を自分が受ける'], ['弱肉強食', '強い者が弱い者を支配する'], ['以心伝心', '言葉にしなくても心が通じ合う']];
    var JP_YOMI = [['紅葉', 'もみじ'], ['海苔', 'のり'], ['七夕', 'たなばた'], ['小豆', 'あずき'], ['田舎', 'いなか'], ['果物', 'くだもの'], ['眼鏡', 'めがね'], ['大人', 'おとな'], ['迷子', 'まいご'], ['土産', 'みやげ']];
    var JP_ANT = [['需要', '供給'], ['原因', '結果'], ['理想', '現実'], ['積極', '消極'], ['客観', '主観'], ['義務', '権利'], ['具体', '抽象'], ['創造', '模倣']];
    var HARD_JP = [
      // 四字熟語の意味（事実テーブル）
      function () { var w = pick(JP_YOJI);
        return { q: '「' + w[0] + '」の意味は？', sub: '四字熟語', level: '★★★★', hint: '漢字の意味から考える', type: 'choice', choices: tchoice(w[1], JP_YOJI, 1), ans: w[1], explain: '【考え方】四字熟語は意味ごと覚える。\n【手順】' + w[0] + '＝' + w[1] + '\n【ポイント】使う場面もセットで覚える。' }; },
      // 難読漢字の読み（記述）
      function () { var w = pick(JP_YOMI);
        return { q: '「' + w[0] + '」の読みは？（ひらがなで）', sub: '難読漢字', level: '★★★', hint: '特別な読み方', type: 'free', ans: w[1], altAns: [w[1]], explain: '【考え方】熟字訓など特別な読み。\n【手順】' + w[0] + '＝' + w[1] + '\n【ポイント】一字ずつでは読めない語もある。' }; },
      // 対義語（事実テーブル）
      function () { var w = pick(JP_ANT);
        return { q: '「' + w[0] + '」の対義語は？', sub: '対義語', level: '★★★★', hint: '反対の意味の熟語', type: 'choice', choices: tchoice(w[1], JP_ANT, 1), ans: w[1], explain: '【考え方】対になる語を覚える。\n【手順】' + w[0] + '⇔' + w[1] + '\n【ポイント】需要⇔供給などはセットで頻出。' }; }
    ];
    HARD_JP.forEach(function (g) { jpGens.push(g); });
  }
})();

/* 難問 第2弾（さらに増量）。方針は同じ：計算算出 or 検証済み事実テーブル＝必ず正しい。 */
(function () {
  if (typeof rint !== 'function' || typeof pick !== 'function' || typeof shuffleArr !== 'function' || typeof numChoices !== 'function') return;
  function tchoice(correct, all, key) {
    var others = shuffleArr(all.filter(function (x) { return x[key] !== correct; })).slice(0, 3).map(function (x) { return x[key]; });
    return shuffleArr([correct].concat(others));
  }

  // ===== 数学（計算＝必ず正しい）=====
  if (typeof mathGens !== 'undefined') {
    mathGens.push(
      // 三角形の内角
      function () { var a = rint(30, 90), b = rint(30, 120 - Math.min(89, a)); if (a + b >= 179) b = 179 - a; var ans = 180 - a - b, ch = numChoices(ans, { spread: 20, positive: true });
        return { q: '三角形の2つの内角が ' + a + '°と' + b + '°のとき、残りの角は何度？', sub: '三角形の内角', level: '★★★', hint: '内角の和は180°', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】三角形の内角の和は180°。\n【手順】180−' + a + '−' + b + '=' + ans + '°\n【ポイント】外角＝離れた2つの内角の和。' }; },
      // 反比例
      function () { var x = rint(2, 6), y = rint(2, 9), a = x * y, x2 = pick([1, 2, 3, 6].filter(function (n) { return a % n === 0 && n !== x; })) || 1, ans = a / x2, ch = numChoices(ans, { spread: 6, positive: true });
        return { q: 'y は x に反比例し、x=' + x + ' のとき y=' + y + '。x=' + x2 + ' のときの y は？', sub: '反比例', level: '★★★★', hint: 'xy＝一定（比例定数）', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】反比例は xy=一定。\n【手順】a=' + x + '×' + y + '=' + a + '、y=' + a + '÷' + x2 + '=' + ans + '\n【ポイント】比例は y/x 一定、反比例は xy 一定。' }; },
      // 平方根の加減（同じ√をまとめる）
      function () { var n = pick([2, 3, 5, 6, 7]), k1 = rint(2, 6), k2 = rint(1, 5), ans = k1 + k2, ch = numChoices(ans, { spread: 4, positive: true });
        return { q: '' + k1 + '√' + n + ' ＋ ' + k2 + '√' + n + ' ＝ □√' + n + '　□に入る数は？', sub: '平方根の加減', level: '★★★★', hint: '同じ√どうしは係数をたす', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】√の中が同じなら係数をたす。\n【手順】' + k1 + '＋' + k2 + '＝' + ans + ' → ' + ans + '√' + n + '\n【ポイント】√の中がちがうとまとめられない。' }; },
      // 円の面積（π の係数）
      function () { var r = rint(2, 12), ans = r * r, ch = numChoices(ans, { spread: 20, positive: true });
        return { q: '半径 ' + r + 'cm の円の面積は □π cm²。□に入る数は？', sub: '円の面積', level: '★★★', hint: '円の面積＝π×半径×半径', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】円の面積＝πr²。\n【手順】' + r + '×' + r + '＝' + ans + ' → ' + ans + 'π cm²\n【ポイント】直径ではなく半径を2回かける。' }; },
      // 中央値（奇数個）
      function () { var arr = []; for (var i = 0; i < 5; i++) arr.push(rint(1, 20)); var sorted = arr.slice().sort(function (p, q) { return p - q; }); var ans = sorted[2], ch = numChoices(ans, { spread: 6, positive: true });
        return { q: 'データ ' + arr.join(', ') + ' の中央値は？', sub: '資料の活用（中央値）', level: '★★★★', hint: '小さい順に並べて真ん中', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】中央値＝並べたときの真ん中の値。\n【手順】並べると ' + sorted.join(',') + ' → 真ん中は ' + ans + '\n【ポイント】偶数個なら中央2つの平均。' }; },
      // 比例式 a:b=c:x
      function () { var a = rint(2, 6), c = a * rint(2, 4), b = rint(2, 9), x = b * c / a, ch = numChoices(x, { spread: 8, positive: true });
        return { q: '比例式  ' + a + ' : ' + b + ' ＝ ' + c + ' : x  の x は？', sub: '比例式', level: '★★★', hint: '外項の積＝内項の積', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】a:b=c:x のとき a×x＝b×c（外項の積＝内項の積）。\n【手順】' + a + '×x=' + b + '×' + c + '=' + (b * c) + ' → x=' + (b * c) + '÷' + a + '=' + x + '\n【ポイント】たすきにかけて等しい。' }; },
      // 割引（定価の○割引）
      function () { var base = rint(3, 20) * 100, d = rint(1, 4), ans = base * (10 - d) / 10, ch = numChoices(ans, { spread: 200, positive: true });
        return { q: '定価 ' + base + '円の品物を ' + d + '割引きで買うと 何円？', sub: '割合（割引）', level: '★★★', hint: '○割引き＝(10−○)/10をかける', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】' + d + '割引き＝定価の' + (10 - d) + '割。\n【手順】' + base + '×' + (10 - d) + '/10＝' + ans + '円\n【ポイント】○割引き後は(10−○)割。' }; },
      // 一次方程式 ax+b=c
      function () { var a = rint(2, 6), x = rint(-6, 8), b = rint(-9, 9), cc = a * x + b, ch = numChoices(x, { spread: 6 });
        return { q: '方程式  ' + a + 'x' + (b < 0 ? '−' + (-b) : '+' + b) + ' = ' + cc + '  を解くと x は？', sub: '一次方程式', level: '★★★', hint: '移項してxだけにする', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】移項して ax=… にし、両辺をaで割る。\n【手順】' + a + 'x=' + cc + (b < 0 ? '+' + (-b) : '−' + b) + '=' + (cc - b) + ' → x=' + x + '\n【ポイント】移項すると符号が変わる。' }; }
    );
  }

  // ===== 理科（計算＋事実表）=====
  if (typeof sciGens !== 'undefined') {
    var SCI_GAS = [['ものを燃やすはたらきがある気体', '酸素'], ['石灰水を白くにごらせる気体', '二酸化炭素'], ['最も軽い気体', '水素'], ['空気中に最も多くふくまれる気体', '窒素'], ['鼻をさすにおいがあり水にとけるとアルカリ性', 'アンモニア']];
    sciGens.push(
      // 電力 P=VI
      function () { var V = rint(2, 20), I = rint(1, 5), P = V * I, ch = numChoices(P, { spread: 15, positive: true });
        return { q: ' ' + V + 'V の電圧で ' + I + 'A の電流が流れた。電力は何W？', sub: '電力', level: '★★★★', hint: '電力＝電圧×電流（P=VI）', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】電力P＝電圧V×電流I。\n【手順】' + V + '×' + I + '=' + P + 'W\n【ポイント】1W＝1V×1A。' }; },
      // 仕事 W=Fd
      function () { var F = rint(2, 20), d = rint(2, 8), W = F * d, ch = numChoices(W, { spread: 20, positive: true });
        return { q: ' ' + F + 'N の力で 物体を ' + d + 'm 動かした。仕事は何J？', sub: '仕事', level: '★★★★', hint: '仕事＝力×動いた距離', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】仕事J＝力N×距離m。\n【手順】' + F + '×' + d + '=' + W + 'J\n【ポイント】力の向きに動いた距離をかける。' }; },
      // フックの法則（ばね）
      function () { var k = rint(2, 6), x = rint(2, 8), F = k * x, ch = numChoices(F, { spread: 12, positive: true });
        return { q: '1cmのばすのに ' + k + 'N 必要なばねを ' + x + 'cm のばすには 何N？', sub: 'フックの法則', level: '★★★', hint: 'のび に比例する', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】ばねののびは力に比例（フックの法則）。\n【手順】' + k + '×' + x + '=' + F + 'N\n【ポイント】比例定数（ばね定数）×のび。' }; },
      // 気体の性質（事実表）
      function () { var w = pick(SCI_GAS);
        return { q: '「' + w[0] + '」は？', sub: '気体の性質', level: '★★★', hint: '性質から気体を特定', type: 'choice', choices: tchoice(w[1], SCI_GAS, 1), ans: w[1], explain: '【考え方】気体の性質と名前を結びつける。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】酸素・二酸化炭素・水素・窒素・アンモニアの性質を整理。' }; }
    );
  }

  // ===== 社会（事実表）=====
  if (typeof socGens !== 'undefined') {
    var SOC_SANKEN = [['国会', '立法'], ['内閣', '行政'], ['裁判所', '司法']];
    var SOC_YEAR2 = [['聖徳太子が十七条の憲法を定めた', '604'], ['奈良に平城京がつくられた', '710'], ['京都に平安京がつくられた', '794'], ['鎌倉幕府が滅びた', '1333'], ['応仁の乱が始まった', '1467'], ['鉄砲が種子島に伝わった', '1543'], ['日本国憲法が施行された', '1947']];
    socGens.push(
      // 三権分立（事実表・固定4択）
      function () { var w = pick(SOC_SANKEN);
        return { q: '三権分立で「' + w[0] + '」が受けもつのは？', sub: '三権分立', level: '★★★★', hint: '立法・行政・司法', type: 'choice', choices: shuffleArr(['立法', '行政', '司法', '地方自治']), ans: w[1], explain: '【考え方】国会＝立法、内閣＝行政、裁判所＝司法。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】たがいに抑制し合う（三権分立）。' }; },
      // 歴史年号（第2弾・事実表）
      function () { var e = pick(SOC_YEAR2);
        return { q: '「' + e[0] + '」は 何年？（西暦・数字で）', sub: '歴史の年号', level: '★★★★', hint: '時代の流れで覚える', type: 'free', ans: e[1], altAns: [e[1] + '年'], explain: '【考え方】重要なできごとの年号。\n【手順】' + e[0] + '＝' + e[1] + '年\n【ポイント】前後のできごととセットで。' }; }
    );
  }

  // ===== 英語（事実表）=====
  if (typeof engGens !== 'undefined') {
    var ENG_PP = [['go', 'gone'], ['see', 'seen'], ['eat', 'eaten'], ['write', 'written'], ['take', 'taken'], ['give', 'given'], ['do', 'done'], ['break', 'broken'], ['speak', 'spoken'], ['know', 'known']];
    var ENG_ORD = [['1', 'first'], ['2', 'second'], ['3', 'third'], ['5', 'fifth'], ['8', 'eighth'], ['9', 'ninth'], ['12', 'twelfth'], ['20', 'twentieth']];
    var ENG_OPP = [['big', 'small'], ['long', 'short'], ['old', 'new'], ['fast', 'slow'], ['happy', 'sad'], ['hot', 'cold'], ['high', 'low'], ['open', 'close']];
    engGens.push(
      // 過去分詞（記述）
      function () { var w = pick(ENG_PP);
        return { q: '「' + w[0] + '」の過去分詞は？（英語で）', sub: '過去分詞', level: '★★★★', hint: '現在完了で使う形', type: 'free', ans: w[1], altAns: [w[1]], explain: '【考え方】不規則動詞の過去分詞。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】have＋過去分詞で現在完了。' }; },
      // 序数（記述）
      function () { var w = pick(ENG_ORD);
        return { q: '数字の「' + w[0] + '」を 序数（○番目）で 英語にすると？', sub: '序数', level: '★★★', hint: 'first, second, third…', type: 'free', ans: w[1], altAns: [w[1]], explain: '【考え方】順番を表す序数。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】日付や順位で使う。' }; },
      // 反対語（事実表）
      function () { var w = pick(ENG_OPP);
        return { q: '「' + w[0] + '」の反対の意味の語は？（英語で）', sub: '英単語（反対語）', level: '★★★', hint: '意味の逆', type: 'choice', choices: tchoice(w[1], ENG_OPP, 1), ans: w[1], explain: '【考え方】反対の意味の単語をペアで覚える。\n【手順】' + w[0] + '⇔' + w[1] + '\n【ポイント】セットで暗記すると効率的。' }; }
    );
  }

  // ===== 国語（事実表）=====
  if (typeof jpGens !== 'undefined') {
    var JP_KANYO = [['さばを読む', '数をごまかす'], ['油を売る', 'むだ話をして仕事をなまける'], ['ねこの手も借りたい', 'とてもいそがしい'], ['手を焼く', 'あつかいに困る'], ['心を打つ', '強く感動させる'], ['首を長くする', '今か今かと待ち望む'], ['水に流す', '過去のことをなかったことにする']];
    var JP_KEIGO = [['言う（尊敬語）', 'おっしゃる'], ['行く・来る（謙譲語）', 'うかがう'], ['食べる（尊敬語）', 'めしあがる'], ['見る（謙譲語）', '拝見する'], ['する（尊敬語）', 'なさる'], ['もらう（謙譲語）', 'いただく']];
    var JP_YOMI2 = [['師走', 'しわす'], ['五月雨', 'さみだれ'], ['吹雪', 'ふぶき'], ['名残', 'なごり'], ['行方', 'ゆくえ'], ['雪崩', 'なだれ'], ['意気地', 'いくじ'], ['波止場', 'はとば']];
    jpGens.push(
      // 慣用句の意味（事実表）
      function () { var w = pick(JP_KANYO);
        return { q: '慣用句「' + w[0] + '」の意味は？', sub: '慣用句', level: '★★★★', hint: '体の一部を使う慣用句が多い', type: 'choice', choices: tchoice(w[1], JP_KANYO, 1), ans: w[1], explain: '【考え方】慣用句は決まった意味をもつ。\n【手順】' + w[0] + '＝' + w[1] + '\n【ポイント】言葉どおりではない意味に注意。' }; },
      // 敬語（事実表）
      function () { var w = pick(JP_KEIGO);
        return { q: '「' + w[0] + '」の言い方は？', sub: '敬語', level: '★★★★', hint: '尊敬語・謙譲語', type: 'choice', choices: tchoice(w[1], JP_KEIGO, 1), ans: w[1], explain: '【考え方】尊敬語は相手を高める、謙譲語は自分を低める。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】主語がだれかで使い分ける。' }; },
      // 難読漢字（第2弾・記述）
      function () { var w = pick(JP_YOMI2);
        return { q: '「' + w[0] + '」の読みは？（ひらがなで）', sub: '難読漢字', level: '★★★★', hint: '特別な読み方', type: 'free', ans: w[1], altAns: [w[1]], explain: '【考え方】特別な読み（熟字訓）。\n【手順】' + w[0] + '＝' + w[1] + '\n【ポイント】声に出して覚える。' }; }
    );
  }
})();

/* 難問 第3弾（別の題材）。方針は同じ：計算算出 or 検証済み事実テーブル＝必ず正しい。 */
(function () {
  if (typeof rint !== 'function' || typeof pick !== 'function' || typeof shuffleArr !== 'function' || typeof numChoices !== 'function') return;
  function tchoice(correct, all, key) {
    var others = shuffleArr(all.filter(function (x) { return x[key] !== correct; })).slice(0, 3).map(function (x) { return x[key]; });
    return shuffleArr([correct].concat(others));
  }

  // ===== 数学（計算）=====
  if (typeof mathGens !== 'undefined') {
    mathGens.push(
      // 二次方程式 x²=a（正の解）
      function () { var r = rint(2, 12), a = r * r, ch = numChoices(r, { spread: 4, positive: true });
        return { q: 'x² = ' + a + ' の正の解 x は？', sub: '二次方程式（平方根）', level: '★★★★', hint: 'x=±√a、正の方', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】x²=aなら x=±√a。\n【手順】√' + a + '=' + r + '（' + r + '²=' + a + '）\n【ポイント】解は正負2つ、ここでは正の方。' }; },
      // 三角形の外角
      function () { var a = rint(30, 80), b = rint(30, 80), ans = a + b, ch = numChoices(ans, { spread: 20, positive: true });
        return { q: '三角形の2つの内角が ' + a + '°と' + b + '°。この2角から最も遠い頂点の外角は何度？', sub: '三角形の外角', level: '★★★', hint: '外角＝離れた2つの内角の和', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】三角形の外角は、離れた2つの内角の和。\n【手順】' + a + '+' + b + '=' + ans + '°\n【ポイント】内角の和180°からも確かめられる。' }; },
      // 最頻値
      function () { var m = rint(1, 9), r1 = rint(10, 19), r2 = rint(20, 29), r3 = rint(30, 39); var arr = shuffleArr([m, m, m, r1, r2, r3]); var ch = numChoices(m, { spread: 6, positive: true });
        return { q: 'データ ' + arr.join(', ') + ' の最頻値（いちばん多く出る値）は？', sub: '資料の活用（最頻値）', level: '★★★', hint: '同じ値がいくつあるか数える', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】最頻値＝最も多く現れる値。\n【手順】' + m + ' が3回で最多 → ' + m + '\n【ポイント】平均・中央値・最頻値のちがいを整理。' }; },
      // 素因数分解（最小の素因数）
      function () { var primes = [2, 3, 5, 7]; var p = pick(primes), q2 = pick(primes.filter(function (x) { return x >= p; })), n = p * q2 * pick([1, p, q2]); if (n < 6) n = p * q2; var sm = 2; while (n % sm !== 0) sm++; var ch = numChoices(sm, { spread: 4, positive: true });
        return { q: '' + n + ' を素因数分解したとき、最も小さい素因数は？', sub: '素因数分解', level: '★★★', hint: '2から順に割れるか調べる', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】小さい素数から割っていく。\n【手順】' + n + ' は ' + sm + ' で割り切れる → 最小の素因数は ' + sm + '\n【ポイント】素数は 2,3,5,7,11…。' }; },
      // 和差算（連立の文章題）
      function () { var big = rint(10, 40), small = rint(1, big - 1), s = big + small, d = big - small, ch = numChoices(big, { spread: 10, positive: true });
        return { q: '2つの数の 和が ' + s + '、差が ' + d + ' です。大きい方の数は？', sub: '和差算', level: '★★★★', hint: '(和＋差)÷2', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】大＝(和＋差)÷2。\n【手順】(' + s + '＋' + d + ')÷2=' + (s + d) + '÷2=' + big + '\n【ポイント】小さい方は (和−差)÷2。' }; },
      // 立方体の表面積
      function () { var a = rint(2, 12), ans = 6 * a * a, ch = numChoices(ans, { spread: 60, positive: true });
        return { q: '1辺 ' + a + 'cm の立方体の表面積は 何cm²？', sub: '表面積（立方体）', level: '★★★', hint: '正方形の面が6つ', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】立方体は合同な正方形6面。\n【手順】6×(' + a + '×' + a + ')=6×' + (a * a) + '=' + ans + 'cm²\n【ポイント】表面積＝1面の面積×6。' }; }
    );
  }

  // ===== 理科（計算＋事実表）=====
  if (typeof sciGens !== 'undefined') {
    var SCI_EKISEI = [['BTB液が 酸性 で示す色', '黄色'], ['BTB液が アルカリ性 で示す色', '青色'], ['BTB液が 中性 で示す色', '緑色'], ['赤色リトマス紙を 青色 に変えるのは', 'アルカリ性'], ['青色リトマス紙を 赤色 に変えるのは', '酸性']];
    var SCI_TENTAI = [['地球のまわりを回っている天体', '月'], ['太陽系でいちばん大きい惑星', '木星'], ['自ら光を出している天体', '恒星'], ['月が地球のかげに入る現象', '月食'], ['太陽が月にかくされる現象', '日食']];
    sciGens.push(
      // 直列の合成抵抗（計算）
      function () { var r1 = rint(2, 15), r2 = rint(2, 15), ans = r1 + r2, ch = numChoices(ans, { spread: 10, positive: true });
        return { q: ' ' + r1 + 'Ω と ' + r2 + 'Ω の抵抗を 直列 につないだ。合成抵抗は何Ω？', sub: '合成抵抗（直列）', level: '★★★★', hint: '直列は そのまま たす', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】直列の合成抵抗＝各抵抗の和。\n【手順】' + r1 + '+' + r2 + '=' + ans + 'Ω\n【ポイント】並列は 1/R=1/R₁+1/R₂。' }; },
      // 液性・指示薬（事実表）
      function () { var w = pick(SCI_EKISEI);
        return { q: '「' + w[0] + '」は？', sub: '酸・アルカリ（指示薬）', level: '★★★', hint: 'BTB・リトマス', type: 'choice', choices: tchoice(w[1], SCI_EKISEI, 1), ans: w[1], explain: '【考え方】指示薬の色の変化を覚える。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】BTB：酸性=黄・中性=緑・アルカリ性=青。' }; },
      // 天体（事実表）
      function () { var w = pick(SCI_TENTAI);
        return { q: '「' + w[0] + '」は？', sub: '天体', level: '★★★★', hint: '太陽・月・惑星・恒星', type: 'choice', choices: tchoice(w[1], SCI_TENTAI, 1), ans: w[1], explain: '【考え方】天体の名前と現象。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】恒星（自ら光る）と惑星（反射）のちがい。' }; }
    );
  }

  // ===== 社会（計算＋事実表）=====
  if (typeof socGens !== 'undefined') {
    var SOC_RELIGION = [['イスラム教の聖地', 'メッカ'], ['キリスト教の聖典（教典）', '聖書'], ['イスラム教の聖典（教典）', 'コーラン'], ['仏教を開いた人物', 'シャカ（釈迦）']];
    socGens.push(
      // 人口密度（計算）
      function () { var dens = rint(50, 500), area = pick([2, 4, 5, 10, 20]), pop = dens * area, ch = numChoices(dens, { spread: 120, positive: true });
        return { q: '面積 ' + area + 'km²、人口 ' + pop + '人の地域の 人口密度は 何人/km²？', sub: '人口密度', level: '★★★★', hint: '人口密度＝人口÷面積', type: 'choice', choices: ch.choices, ans: ch.ans, explain: '【考え方】人口密度＝人口÷面積。\n【手順】' + pop + '÷' + area + '=' + dens + '人/km²\n【ポイント】1km²あたりの人数。' }; },
      // 世界の宗教（事実表）
      function () { var w = pick(SOC_RELIGION);
        return { q: '「' + w[0] + '」は？', sub: '世界の宗教', level: '★★★', hint: '三大宗教と関わり', type: 'choice', choices: tchoice(w[1], SOC_RELIGION, 1), ans: w[1], explain: '【考え方】宗教と聖地・聖典を結ぶ。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】三大宗教：キリスト教・イスラム教・仏教。' }; }
    );
  }

  // ===== 英語（事実表）=====
  if (typeof engGens !== 'undefined') {
    var ENG_BE = [['I', 'am'], ['You', 'are'], ['He', 'is'], ['She', 'is'], ['It', 'is'], ['We', 'are'], ['They', 'are']];
    var ENG_WH = [['「何」をたずねる', 'what'], ['「だれ」をたずねる', 'who'], ['「どこ」をたずねる', 'where'], ['「いつ」をたずねる', 'when'], ['「なぜ」をたずねる', 'why'], ['「どうやって」をたずねる', 'how']];
    var ENG_MONTH = [['1月', 'January'], ['2月', 'February'], ['4月', 'April'], ['7月', 'July'], ['8月', 'August'], ['9月', 'September'], ['10月', 'October'], ['12月', 'December']];
    engGens.push(
      // be動詞の使い分け（事実表）
      function () { var w = pick(ENG_BE);
        return { q: '「' + w[0] + '」に合う be動詞は？（am / is / are）', sub: 'be動詞', level: '★★★', hint: '主語で変わる', type: 'choice', choices: shuffleArr(['am', 'is', 'are', "aren't"]), ans: w[1], explain: '【考え方】I→am、he/she/it→is、you/we/they→are。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】主語が3人称単数なら is。' }; },
      // 疑問詞（事実表・記述）
      function () { var w = pick(ENG_WH);
        return { q: w[0] + ' 疑問詞は？（英語で）', sub: '疑問詞', level: '★★★', hint: 'what, who, where…', type: 'free', ans: w[1], altAns: [w[1]], explain: '【考え方】たずねる内容で疑問詞を選ぶ。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】文の最初に置く。' }; },
      // 月（事実表・記述）
      function () { var w = pick(ENG_MONTH);
        return { q: '「' + w[0] + '」を英語で書くと？', sub: '月の名前', level: '★★★★', hint: '大文字ではじめる', type: 'free', ans: w[1], altAns: [w[1], w[1].toLowerCase()], explain: '【考え方】月の名前はつづりに注意。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】月・曜日は必ず大文字ではじめる。' }; }
    );
  }

  // ===== 国語（事実表）=====
  if (typeof jpGens !== 'undefined') {
    var JP_BUSHU = [['花', 'くさかんむり'], ['池', 'さんずい'], ['休', 'にんべん'], ['道', 'しんにょう'], ['国', 'くにがまえ'], ['開', 'もんがまえ'], ['病', 'やまいだれ']];
    var JP_RUIGI = [['進歩', '向上'], ['方法', '手段'], ['永遠', '永久'], ['我慢', '忍耐'], ['長所', '美点'], ['賛成', '同意'], ['有名', '著名']];
    var JP_BUNGAKU = [['枕草子の作者', '清少納言'], ['源氏物語の作者', '紫式部'], ['奥の細道の作者', '松尾芭蕉'], ['徒然草の作者', '兼好法師'], ['土佐日記の作者', '紀貫之']];
    jpGens.push(
      // 部首（事実表）
      function () { var w = pick(JP_BUSHU);
        return { q: '漢字「' + w[0] + '」の部首は？', sub: '部首', level: '★★★', hint: '漢字の意味を表す部分', type: 'choice', choices: tchoice(w[1], JP_BUSHU, 1), ans: w[1], explain: '【考え方】部首は漢字を分類する部分。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】さんずいは水、にんべんは人に関係。' }; },
      // 類義語（事実表）
      function () { var w = pick(JP_RUIGI);
        return { q: '「' + w[0] + '」に意味が近い語（類義語）は？', sub: '類義語', level: '★★★★', hint: '似た意味の熟語', type: 'choice', choices: tchoice(w[1], JP_RUIGI, 1), ans: w[1], explain: '【考え方】似た意味の語をペアで覚える。\n【手順】' + w[0] + '≒' + w[1] + '\n【ポイント】対義語とセットで整理。' }; },
      // 文学史（事実表）
      function () { var w = pick(JP_BUNGAKU);
        return { q: '「' + w[0] + '」は？', sub: '文学史', level: '★★★★', hint: '古典の代表作', type: 'choice', choices: tchoice(w[1], JP_BUNGAKU, 1), ans: w[1], explain: '【考え方】有名な古典作品と作者。\n【手順】' + w[0] + '→' + w[1] + '\n【ポイント】枕草子＝随筆、源氏物語＝物語。' }; }
    );
  }
})();

/* 難問 第4弾：図形・グラフに「図(SVG)」をつける。図は問題の数値に合わせて生成し、答えは計算＝必ず正しい。
   配色は既存 figure に合わせる（cyan系・ラベルはamber）。 */
(function () {
  if (typeof mathGens === 'undefined' || typeof rint !== 'function' || typeof numChoices !== 'function') return;
  var CY = '#67e8f9', FILL = 'rgba(8,145,178,0.18)', LB = '#f59e0b', TX = '#e0f2fe', RD = '#ef4444';
  // 三角形（2角ラベル）
  function svgTri(a, b) {
    return '<svg width="185" height="120" viewBox="0 0 185 120"><polygon points="18,102 167,102 96,20" fill="' + FILL + '" stroke="' + CY + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<text x="40" y="96" fill="' + LB + '" font-size="13" font-weight="bold">' + a + '°</text>' +
      '<text x="132" y="96" fill="' + LB + '" font-size="13" font-weight="bold">' + b + '°</text>' +
      '<text x="90" y="42" fill="' + TX + '" font-size="15" font-weight="bold">?</text></svg>';
  }
  // 長方形（たて・よこラベル）
  function svgRect(w, h) {
    return '<svg width="180" height="120" viewBox="0 0 180 120"><rect x="24" y="14" width="120" height="82" fill="' + FILL + '" stroke="' + CY + '" stroke-width="2" rx="1"/>' +
      '<text x="84" y="112" fill="' + LB + '" font-size="12" text-anchor="middle">' + w + 'cm</text>' +
      '<text x="12" y="56" fill="' + LB + '" font-size="12" text-anchor="middle" transform="rotate(-90,12,56)">' + h + 'cm</text></svg>';
  }
  // 底辺・高さ付き三角形
  function svgTriBH(b, h) {
    return '<svg width="180" height="120" viewBox="0 0 180 120"><polygon points="20,100 150,100 70,22" fill="' + FILL + '" stroke="' + CY + '" stroke-width="2"/>' +
      '<line x1="70" y1="22" x2="70" y2="100" stroke="' + RD + '" stroke-width="1.5" stroke-dasharray="4"/>' +
      '<text x="85" y="114" fill="' + LB + '" font-size="12" text-anchor="middle">底辺 ' + b + 'cm</text>' +
      '<text x="76" y="64" fill="' + RD + '" font-size="11">高さ' + h + 'cm</text></svg>';
  }
  // 平行線と角
  function svgParallel(ang) {
    return '<svg width="185" height="120" viewBox="0 0 185 120"><line x1="10" y1="38" x2="175" y2="38" stroke="' + CY + '" stroke-width="2"/><line x1="10" y1="86" x2="175" y2="86" stroke="' + CY + '" stroke-width="2"/>' +
      '<line x1="55" y1="18" x2="130" y2="108" stroke="' + LB + '" stroke-width="2"/>' +
      '<text x="72" y="33" fill="' + LB + '" font-size="12" font-weight="bold">' + ang + '°</text>' +
      '<text x="108" y="102" fill="' + TX + '" font-size="14" font-weight="bold">?</text></svg>';
  }
  // 座標グラフ（直線 y=ax+b）
  function svgGraph(a, b) {
    var ox = 95, oy = 95, u = 15, s = '<svg width="190" height="190" viewBox="0 0 190 190">';
    for (var i = -6; i <= 6; i++) { var gx = ox + i * u, gy = oy + i * u;
      s += '<line x1="' + gx + '" y1="5" x2="' + gx + '" y2="185" stroke="rgba(103,232,249,0.12)" stroke-width="1"/>';
      s += '<line x1="5" y1="' + gy + '" x2="185" y2="' + gy + '" stroke="rgba(103,232,249,0.12)" stroke-width="1"/>'; }
    s += '<line x1="5" y1="' + oy + '" x2="185" y2="' + oy + '" stroke="' + CY + '" stroke-width="1.5"/>';
    s += '<line x1="' + ox + '" y1="5" x2="' + ox + '" y2="185" stroke="' + CY + '" stroke-width="1.5"/>';
    var x1 = -6, x2 = 6, sx1 = ox + x1 * u, sy1 = oy - (a * x1 + b) * u, sx2 = ox + x2 * u, sy2 = oy - (a * x2 + b) * u;
    s += '<line x1="' + sx1 + '" y1="' + sy1 + '" x2="' + sx2 + '" y2="' + sy2 + '" stroke="' + LB + '" stroke-width="2.5"/>';
    s += '<circle cx="' + ox + '" cy="' + (oy - b * u) + '" r="3.5" fill="' + RD + '"/>';   // y切片
    s += '<text x="176" y="' + (oy + 12) + '" fill="' + TX + '" font-size="10">x</text><text x="' + (ox + 4) + '" y="14" fill="' + TX + '" font-size="10">y</text></svg>';
    return s;
  }

  mathGens.push(
    // 三角形の残りの角（図つき）
    function () { var a = rint(35, 80), b = rint(35, 80), ans = 180 - a - b; if (ans < 15) { a = 60; b = 60; ans = 60; } var ch = numChoices(ans, { spread: 18, positive: true });
      return { q: '図の三角形で、? の角は何度？', sub: '三角形の内角（図）', level: '★★★', hint: '内角の和は180°', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgTri(a, b), explain: '【考え方】三角形の内角の和は180°。\n【手順】180−' + a + '−' + b + '=' + ans + '°\n【ポイント】図の2角を180からひく。' }; },
    // 長方形の面積（図つき）
    function () { var w = rint(3, 12), h = rint(3, 9), ans = w * h, ch = numChoices(ans, { spread: 20, positive: true });
      return { q: '図の長方形の面積は 何cm²？', sub: '長方形の面積（図）', level: '★★★', hint: 'たて×よこ', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgRect(w, h), explain: '【考え方】長方形の面積＝たて×よこ。\n【手順】' + h + '×' + w + '=' + ans + 'cm²\n【ポイント】単位はcm²。' }; },
    // 三角形の面積（図つき）
    function () { var b = rint(4, 12) * 2, h = rint(3, 9), ans = b * h / 2, ch = numChoices(ans, { spread: 18, positive: true });
      return { q: '図の三角形の面積は 何cm²？', sub: '三角形の面積（図）', level: '★★★', hint: '底辺×高さ÷2', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgTriBH(b, h), explain: '【考え方】三角形の面積＝底辺×高さ÷2。\n【手順】' + b + '×' + h + '÷2=' + ans + 'cm²\n【ポイント】高さは底辺に垂直な長さ。' }; },
    // 平行線と錯角（図つき）
    function () { var ang = rint(40, 130), ans = ang, ch = numChoices(ans, { spread: 20, positive: true });
      return { q: '図で2本の直線は平行。? の角（錯角）は何度？', sub: '平行線と角（図）', level: '★★★★', hint: '平行線の錯角は等しい', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgParallel(ang), explain: '【考え方】平行線の錯角は等しい。\n【手順】錯角なので ' + ang + '°と同じ → ' + ans + '°\n【ポイント】同位角・錯角は等しい、同側内角は和が180°。' }; },
    // グラフの傾き（図つき）
    function () { var a = rint(-3, 3) || 2, b = rint(-3, 3), ans = a, ch = numChoices(ans, { spread: 3 });
      return { q: '図の直線（オレンジ）の傾きは？', sub: '一次関数のグラフ（図）', level: '★★★★', hint: '右に1進むと y はいくつ変わる？', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgGraph(a, b), explain: '【考え方】傾き＝xが1増えたときのyの変化。\n【手順】この直線は y=' + a + 'x' + (b < 0 ? b : '+' + b) + ' → 傾きは ' + a + '\n【ポイント】右上がりは正、右下がりは負。' }; },
    // グラフのy切片（図つき）
    function () { var a = rint(-3, 3) || 1, b = rint(-4, 4), ans = b, ch = numChoices(ans, { spread: 4 });
      return { q: '図の直線が y軸と交わる値（切片）は？（赤い点）', sub: '一次関数のグラフ（図）', level: '★★★', hint: 'x=0 のときの y', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgGraph(a, b), explain: '【考え方】切片＝x=0のときのy＝y軸との交点。\n【手順】赤い点の高さ → ' + b + '\n【ポイント】y=ax+b の b が切片。' }; }
  );
})();

/* 難問 第5弾：図の種類を追加（円・おうぎ形・空間図形・理科の回路/光）。図は数値連動、答えは計算＝必ず正しい。 */
(function () {
  if (typeof mathGens === 'undefined' || typeof rint !== 'function' || typeof numChoices !== 'function') return;
  var CY = '#67e8f9', FILL = 'rgba(8,145,178,0.18)', LB = '#f59e0b', TX = '#e0f2fe', RD = '#ef4444';

  // 円（半径ラベル）
  function svgCircle(r) {
    return '<svg width="150" height="140" viewBox="0 0 150 140"><circle cx="70" cy="70" r="55" fill="' + FILL + '" stroke="' + CY + '" stroke-width="2"/>' +
      '<line x1="70" y1="70" x2="125" y2="70" stroke="' + RD + '" stroke-width="1.5"/><circle cx="70" cy="70" r="3" fill="' + RD + '"/>' +
      '<text x="80" y="63" fill="' + LB + '" font-size="12">r=' + r + 'cm</text></svg>';
  }
  // おうぎ形（半径・中心角）
  function svgSector(r, deg) {
    var cx = 68, cy = 95, R = 62, rad = deg * Math.PI / 180;
    var x1 = (cx + R * Math.cos(rad)).toFixed(1), y1 = (cy - R * Math.sin(rad)).toFixed(1), large = deg > 180 ? 1 : 0;
    return '<svg width="160" height="130" viewBox="0 0 160 130"><path d="M ' + cx + ' ' + cy + ' L ' + (cx + R) + ' ' + cy + ' A ' + R + ' ' + R + ' 0 ' + large + ' 0 ' + x1 + ' ' + y1 + ' Z" fill="' + FILL + '" stroke="' + CY + '" stroke-width="2"/>' +
      '<text x="' + (cx + 14) + '" y="' + (cy - 8) + '" fill="' + LB + '" font-size="12" font-weight="bold">' + deg + '°</text>' +
      '<text x="' + (cx + 20) + '" y="' + (cy + 15) + '" fill="' + LB + '" font-size="10">r=' + r + '</text></svg>';
  }
  // 直方体（見取り図）
  function svgBox(w, d, h) {
    return '<svg width="180" height="150" viewBox="0 0 180 150"><polygon points="30,50 100,50 130,25 60,25" fill="rgba(8,145,178,0.28)" stroke="' + CY + '" stroke-width="1.8"/>' +
      '<polygon points="100,50 130,25 130,95 100,120" fill="rgba(8,145,178,0.12)" stroke="' + CY + '" stroke-width="1.8"/>' +
      '<rect x="30" y="50" width="70" height="70" fill="' + FILL + '" stroke="' + CY + '" stroke-width="1.8"/>' +
      '<text x="65" y="138" fill="' + LB + '" font-size="11" text-anchor="middle">よこ' + w + 'cm</text>' +
      '<text x="20" y="88" fill="' + LB + '" font-size="11" text-anchor="middle" transform="rotate(-90,20,88)">高さ' + h + 'cm</text>' +
      '<text x="122" y="20" fill="' + LB + '" font-size="11">おく' + d + 'cm</text></svg>';
  }
  // 円柱
  function svgCyl(r, h) {
    return '<svg width="150" height="150" viewBox="0 0 150 150"><ellipse cx="70" cy="30" rx="45" ry="13" fill="rgba(8,145,178,0.28)" stroke="' + CY + '" stroke-width="1.8"/>' +
      '<path d="M25 30 V110 A45 13 0 0 0 115 110 V30" fill="' + FILL + '" stroke="' + CY + '" stroke-width="1.8"/>' +
      '<ellipse cx="70" cy="30" rx="45" ry="13" fill="none" stroke="' + CY + '" stroke-width="1.8"/>' +
      '<line x1="70" y1="30" x2="115" y2="30" stroke="' + RD + '" stroke-width="1.3"/><text x="82" y="26" fill="' + LB + '" font-size="10">r=' + r + '</text>' +
      '<text x="124" y="75" fill="' + LB + '" font-size="11">高さ' + h + '</text></svg>';
  }
  // 直列回路（抵抗2つ）
  function svgCircuit(r1, r2) {
    return '<svg width="190" height="120" viewBox="0 0 190 120"><rect x="20" y="20" width="150" height="80" fill="none" stroke="' + CY + '" stroke-width="2"/>' +
      '<rect x="55" y="12" width="34" height="16" fill="rgba(8,145,178,0.3)" stroke="' + CY + '" stroke-width="1.5"/><text x="72" y="9" fill="' + LB + '" font-size="10" text-anchor="middle">' + r1 + 'Ω</text>' +
      '<rect x="105" y="12" width="34" height="16" fill="rgba(8,145,178,0.3)" stroke="' + CY + '" stroke-width="1.5"/><text x="122" y="9" fill="' + LB + '" font-size="10" text-anchor="middle">' + r2 + 'Ω</text>' +
      '<line x1="20" y1="55" x2="14" y2="55" stroke="' + RD + '" stroke-width="3"/><line x1="20" y1="65" x2="26" y2="65" stroke="' + RD + '" stroke-width="6"/>' +
      '<text x="30" y="112" fill="' + TX + '" font-size="10">電池（直列つなぎ）</text></svg>';
  }
  // 光の反射（鏡・法線・入射角）
  function svgMirror(ang) {
    var cx = 95, cy = 92, L = 70, rad = ang * Math.PI / 180;
    var ix = (cx - L * Math.sin(rad)).toFixed(1), iy = (cy - L * Math.cos(rad)).toFixed(1);
    var rx = (cx + L * Math.sin(rad)).toFixed(1), ry = (cy - L * Math.cos(rad)).toFixed(1);
    return '<svg width="190" height="115" viewBox="0 0 190 115"><line x1="15" y1="92" x2="175" y2="92" stroke="' + CY + '" stroke-width="3"/>' +
      '<line x1="' + cx + '" y1="92" x2="' + cx + '" y2="14" stroke="' + TX + '" stroke-width="1" stroke-dasharray="4"/>' +
      '<line x1="' + ix + '" y1="' + iy + '" x2="' + cx + '" y2="' + cy + '" stroke="' + LB + '" stroke-width="2"/>' +
      '<line x1="' + cx + '" y1="' + cy + '" x2="' + rx + '" y2="' + ry + '" stroke="' + RD + '" stroke-width="2" stroke-dasharray="3"/>' +
      '<text x="' + (cx - 34) + '" y="60" fill="' + LB + '" font-size="11">' + ang + '°</text>' +
      '<text x="' + (cx + 16) + '" y="60" fill="' + RD + '" font-size="13" font-weight="bold">?</text>' +
      '<text x="120" y="108" fill="' + TX + '" font-size="9">鏡</text></svg>';
  }

  mathGens.push(
    // 円の面積（図・□π）
    function () { var r = rint(2, 12), ans = r * r, ch = numChoices(ans, { spread: 20, positive: true });
      return { q: '図の円の面積は □π cm²。□に入る数は？', sub: '円の面積（図）', level: '★★★', hint: '面積＝π×半径×半径', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgCircle(r), explain: '【考え方】円の面積＝πr²。\n【手順】' + r + '×' + r + '=' + ans + ' → ' + ans + 'π cm²\n【ポイント】半径を2回かける。' }; },
    // 円周（図・□π）
    function () { var r = rint(2, 15), ans = 2 * r, ch = numChoices(ans, { spread: 12, positive: true });
      return { q: '図の円の円周は □π cm。□に入る数は？', sub: '円周（図）', level: '★★★', hint: '円周＝2×π×半径', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgCircle(r), explain: '【考え方】円周＝2πr。\n【手順】2×' + r + '=' + ans + ' → ' + ans + 'π cm\n【ポイント】直径×πでも同じ。' }; },
    // おうぎ形の弧の長さ（図・□π）
    function () { var combo = pick([[6, 180, 6], [4, 90, 2], [6, 120, 4], [8, 90, 4], [9, 120, 6], [6, 90, 3], [10, 180, 10]]); var ch = numChoices(combo[2], { spread: 6, positive: true });
      return { q: '図のおうぎ形の弧の長さは □π cm。□に入る数は？', sub: 'おうぎ形の弧（図）', level: '★★★★', hint: '2πr × 中心角/360', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgSector(combo[0], combo[1]), explain: '【考え方】弧＝2πr×(中心角/360)。\n【手順】2×' + combo[0] + '×' + combo[1] + '/360=' + combo[2] + ' → ' + combo[2] + 'π cm\n【ポイント】円周の(中心角/360)倍。' }; },
    // おうぎ形の面積（図・□π）
    function () { var combo = pick([[6, 90, 9], [6, 180, 18], [4, 90, 4], [12, 90, 36], [6, 120, 12], [10, 90, 25], [8, 90, 16]]); var ch = numChoices(combo[2], { spread: 12, positive: true });
      return { q: '図のおうぎ形の面積は □π cm²。□に入る数は？', sub: 'おうぎ形の面積（図）', level: '★★★★', hint: 'πr² × 中心角/360', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgSector(combo[0], combo[1]), explain: '【考え方】面積＝πr²×(中心角/360)。\n【手順】' + combo[0] + '²×' + combo[1] + '/360=' + combo[2] + ' → ' + combo[2] + 'π cm²\n【ポイント】円の面積の(中心角/360)倍。' }; },
    // 直方体の体積（図）
    function () { var w = rint(2, 9), d = rint(2, 7), h = rint(2, 9), ans = w * d * h, ch = numChoices(ans, { spread: 50, positive: true });
      return { q: '図の直方体の体積は 何cm³？', sub: '直方体の体積（図）', level: '★★★', hint: 'たて×よこ×高さ', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgBox(w, d, h), explain: '【考え方】直方体の体積＝よこ×おく×高さ。\n【手順】' + w + '×' + d + '×' + h + '=' + ans + 'cm³\n【ポイント】3辺をかける。' }; },
    // 円柱の体積（図・□π）
    function () { var r = rint(2, 8), h = rint(2, 10), ans = r * r * h, ch = numChoices(ans, { spread: 40, positive: true });
      return { q: '図の円柱の体積は □π cm³。□に入る数は？', sub: '円柱の体積（図）', level: '★★★★', hint: '底面積(πr²)×高さ', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgCyl(r, h), explain: '【考え方】円柱の体積＝πr²×高さ。\n【手順】' + r + '²×' + h + '=' + ans + ' → ' + ans + 'π cm³\n【ポイント】底面の円の面積×高さ。' }; }
  );

  if (typeof sciGens !== 'undefined') {
    sciGens.push(
      // 直列回路の合成抵抗（図）
      function () { var r1 = rint(2, 15), r2 = rint(2, 15), ans = r1 + r2, ch = numChoices(ans, { spread: 10, positive: true });
        return { q: '図の回路（直列）の合成抵抗は何Ω？', sub: '合成抵抗（図）', level: '★★★★', hint: '直列はそのままたす', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgCircuit(r1, r2), explain: '【考え方】直列の合成抵抗＝各抵抗の和。\n【手順】' + r1 + '+' + r2 + '=' + ans + 'Ω\n【ポイント】並列は 1/R=1/R₁+1/R₂。' }; },
      // 光の反射（図）
      function () { var ang = rint(20, 60), ans = ang, ch = numChoices(ans, { spread: 15, positive: true });
        return { q: '図で光が鏡に当たった。反射角（? ）は何度？', sub: '光の反射（図）', level: '★★★', hint: '入射角＝反射角', type: 'choice', choices: ch.choices, ans: ch.ans, figure: svgMirror(ang), explain: '【考え方】反射の法則：入射角＝反射角。\n【手順】入射角が' + ang + '°なので反射角も' + ans + '°\n【ポイント】角は鏡の面ではなく“法線”からはかる。' }; }
    );
  }
})();
