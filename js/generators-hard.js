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
