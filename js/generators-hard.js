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
