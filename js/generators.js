/* generators.js：index.html から分離した classic script（データのみ・挙動不変・グローバル）。
   メイン <script> より前に読み込む（?v でキャッシュ回避）。 */
// ===== 問題ジェネレーター（無限生成） =====
// ================================================================
function rint(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function shuffleArr(a){ return [...a].sort(()=>Math.random()-0.5); }
// 数値の選択肢（正解＋近い誤答3つ）
function numChoices(ans, opts={}){
  const unit = opts.unit||'';
  const set = new Set([ans]);
  let guard=0;
  const spread = opts.spread || Math.max(1, Math.round(Math.abs(ans)*0.2)||1);
  while(set.size<4 && guard<60){
    let d = ans + (Math.random()<0.5?-1:1)*rint(1, Math.max(2,spread));
    if(opts.positive && d<0){ guard++; continue; }
    set.add(d); guard++;
  }
  let k=2;
  while(set.size<4){ set.add(ans+k); set.add(ans-k); k++; }
  const arr = shuffleArr([...set].slice(0,4));
  return { choices: arr.map(x=> `${x}${unit}`), ans: `${ans}${unit}` };
}
// ========== 読解問題（偏差値65対策：国語・英語） ==========
(function(){
  // 国語 説明文（練習）
  const JP1='私たちはふだん、言葉を「考えを伝える道具」だと思っている。しかし、言葉には別の働きもある。たとえば、悲しいときに「悲しい」と口に出すと、その気持ちが少し整理されることがある。つまり言葉は、相手に伝えるためだけでなく、自分の心を見つめ、形にするためにも使われているのだ。だから、うまく話せないときこそ、短くてもいいから言葉にしてみることが大切なのである。';
  BANK.japanese.practice.push(
    { q:'筆者によると、言葉には「伝える」以外にどんな働きがあるか。', passage:JP1, sub:'読解（内容把握）', level:'★★★', hint:'「つまり」の後に注目', type:'choice', choices:['自分の心を見つめ、形にする働き','相手を言い負かす働き','記録を残すだけの働き','命令する働き'], ans:'自分の心を見つめ、形にする働き', explain:'【考え方】「つまり」の後に筆者の主張がある。\n【手順】本文に「自分の心を見つめ、形にするためにも使われている」とある\n【ポイント】「つまり」の直後は要点。線を引いて探す。' },
    { q:'「悲しいときに『悲しい』と口に出すと…」の例は、何のために挙げられているか。', passage:JP1, sub:'読解（段落の役割）', level:'★★★', hint:'直後の「つまり」で一般化', type:'choice', choices:['言葉が心を整理する働きを示す具体例','筆者への反対意見','話題からの脱線','文章全体の結論'], ans:'言葉が心を整理する働きを示す具体例', explain:'【考え方】例→「つまり」で一般化の流れ。\n【手順】言葉が心を整理する働きを示す“具体例”\n【ポイント】具体例は主張を分かりやすくするために置かれる。' },
    { q:'「うまく話せないときこそ」の「こそ」が強めている内容は？', passage:JP1, sub:'読解（語句の働き）', level:'★★☆', hint:'「こそ」は強調', type:'choice', choices:['そういうときほど言葉にすることが大切だ','話さなくてもよい','急いで決めるべきだ','黙っている方がよい'], ans:'そういうときほど言葉にすることが大切だ', explain:'【考え方】「こそ」は直前を強める。\n【手順】うまく話せないときほど言葉にすることが大切\n【ポイント】強調の助詞「こそ」に注目すると主張がわかる。' },
    { q:'この文章の要旨として最も適切なものは？', passage:JP1, sub:'読解（要旨）', level:'★★★', hint:'全体の主張', type:'choice', choices:['言葉は伝達だけでなく自分の心を見つめる働きももつ','言葉は単なる道具にすぎない','話し方の技術が最も重要だ','悲しみは口に出すべきでない'], ans:'言葉は伝達だけでなく自分の心を見つめる働きももつ', explain:'【考え方】全体の主張を一文にまとめる。\n【手順】伝える働き＋自分の心を形にする働き、の二点\n【ポイント】要旨は“くり返される考え”をまとめる。' }
  );
  // 国語 物語（試験）
  const JP2='放課後の図書室は、いつも私だけの場所だった。窓から差す光がページを温め、外の物音は遠い。ある日、となりの席に転校生がそっと座った。私は少しどきりとしたが、彼女も同じ本を手にしていることに気づくと、なぜだか心がほどけた。「その本、私も好き」。小さな声が、静かな部屋に思いがけずよく響いた。';
  BANK.japanese.exam.push(
    { q:'「心がほどけた」ときの「私」の気持ちに最も近いのは？', passage:JP2, sub:'読解（心情）', level:'★★★', hint:'直前の「どきり」との対比', type:'choice', choices:['緊張がやわらぎ、親しみを感じた','いっそう不安になった','退屈してきた','腹を立てた'], ans:'緊張がやわらぎ、親しみを感じた', explain:'【考え方】直前の「どきり」との対比で読む。\n【手順】緊張がやわらぎ、親しみを感じた\n【ポイント】心情は前後の言葉（どきり→ほどけた）から判断。' },
    { q:'「窓から差す光がページを温め」に使われている表現技法に最も近いのは？', passage:JP2, sub:'読解（表現技法）', level:'★★★', hint:'光が「温める」', type:'choice', choices:['擬人法','倒置法','体言止め','反復法'], ans:'擬人法', explain:'【考え方】人でないものを人のように描く。\n【手順】擬人法\n【ポイント】「ような」を使えば直喩、使わず人扱いなら擬人法。' },
    { q:'「私」と転校生が打ち解けるきっかけになったのは？', passage:JP2, sub:'読解（内容把握）', level:'★★☆', hint:'二人の共通点', type:'choice', choices:['同じ本を好きだったこと','席が近かったこと','先生の紹介','外の物音'], ans:'同じ本を好きだったこと', explain:'【考え方】二人の共通点を本文から探す。\n【手順】同じ本を好きだったこと\n【ポイント】「私も好き」という言葉が決め手。' },
    { q:'この場面の主題に最も近いのは？', passage:JP2, sub:'読解（主題）', level:'★★★', hint:'何が二人を近づけたか', type:'choice', choices:['共通の好きなものが人と人を近づける','図書室は静かであるべきだ','転校はつらいものだ','読書は孤独な楽しみだ'], ans:'共通の好きなものが人と人を近づける', explain:'【考え方】何が二人を近づけたかを考える。\n【手順】共通の好きなものが人と人を近づける\n【ポイント】主題は場面全体が伝えたいこと。' }
  );
  // 英語 長文（練習）
  const EN1='Hi, I\'m Mika. I live in Osaka with my family. I have a brother, Ken. He is twelve. We like sports very much. I play tennis every Sunday, and Ken plays soccer. Our mother is a music teacher. She plays the piano well. On Saturdays, we cook dinner together. I want to be a vet because I love animals.';
  BANK.english.practice.push(
    { q:'(読解) How old is Ken?', passage:EN1, sub:'英語読解（事実把握）', level:'★★☆', hint:'He is twelve.', type:'choice', choices:['Twelve','Ten','Thirteen','Eleven'], ans:'Twelve', explain:'【考え方】年齢の文を本文から探す。\n【手順】He is twelve. → Twelve\n【ポイント】質問の語(old)を本文の手がかりに。' },
    { q:'(読解) What sport does Mika play?', passage:EN1, sub:'英語読解（事実把握）', level:'★★☆', hint:'I play ... every Sunday', type:'choice', choices:['Tennis','Soccer','Baseball','Basketball'], ans:'Tennis', explain:'【考え方】playの文を本文から探す。\n【手順】I play tennis every Sunday. → Tennis\n【ポイント】Mika＝I。本文のIが答えの人物。' },
    { q:'(読解) What is Mika\'s mother\'s job?', passage:EN1, sub:'英語読解（事実把握）', level:'★★★', hint:'Our mother is ...', type:'choice', choices:['A music teacher','A vet','A cook','A tennis player'], ans:'A music teacher', explain:'【考え方】motherの文を探す。\n【手順】Our mother is a music teacher. → A music teacher\n【ポイント】job＝仕事。be動詞の後に職業。' },
    { q:'(読解) Why does Mika want to be a vet?', passage:EN1, sub:'英語読解（理由）', level:'★★★', hint:'because ...', type:'choice', choices:['Because she loves animals','Because she likes music','Because she plays tennis','Because she lives in Osaka'], ans:'Because she loves animals', explain:'【考え方】becauseの後が理由。\n【手順】because I love animals → Because she loves animals\n【ポイント】Why? の答えはbecause〜。' }
  );
  // 英語 対話（試験）
  const EN2='A: Hi, Tom. What are you doing?\nB: I\'m looking for my dictionary. I can\'t find it.\nA: Is it on your desk?\nB: No, it isn\'t. Oh, it\'s under the chair! Thank you, Lisa.\nA: You\'re welcome. Let\'s study together.';
  BANK.english.exam.push(
    { q:'(対話) What is Tom looking for?', passage:EN2, sub:'英語読解（対話把握）', level:'★★☆', hint:'I\'m looking for ...', type:'choice', choices:['His dictionary','His chair','His desk','His bag'], ans:'His dictionary', explain:'【考え方】look for＝探す、を手がかりに。\n【手順】I\'m looking for my dictionary. → His dictionary\n【ポイント】TomのI→Hisに直して答える。' },
    { q:'(対話) Where is the dictionary?', passage:EN2, sub:'英語読解（位置）', level:'★★★', hint:'Oh, it\'s ...', type:'choice', choices:['Under the chair','On the desk','In the bag','On the chair'], ans:'Under the chair', explain:'【考え方】場所を表す語を探す。\n【手順】it\'s under the chair! → Under the chair\n【ポイント】Where? は前置詞＋場所で答える。' },
    { q:'(対話) Who helps Tom?', passage:EN2, sub:'英語読解（人物）', level:'★★☆', hint:'Thank you, ...', type:'choice', choices:['Lisa','His mother','His teacher','Ken'], ans:'Lisa', explain:'【考え方】お礼の相手＝助けた人。\n【手順】Thank you, Lisa. → Lisa\n【ポイント】会話の流れから人物を特定。' },
    { q:'(対話) What does Lisa say at the end?', passage:EN2, sub:'英語読解（内容）', level:'★★☆', hint:'last line', type:'choice', choices:['Let\'s study together','Goodbye','I\'m hungry','See you'], ans:'Let\'s study together', explain:'【考え方】最後のせりふを探す。\n【手順】Let\'s study together.\n【ポイント】at the end＝最後に。最終行を見る。' }
  );
})();
// ========== 応用問題（偏差値65対策：理科・社会） ==========
(function(){
  BANK.science.practice.push(
    { q:'質量3kg（重力30N）の直方体を、底面積0.5m²で床に置いた。床にかかる圧力は？', sub:'圧力の計算', level:'★★★', hint:'圧力=力÷面積', type:'choice', choices:['60Pa','15Pa','30Pa','150Pa'], ans:'60Pa', explain:'【考え方】圧力＝力÷面積。\n【手順】30÷0.5＝60Pa\n【ポイント】単位はPa＝N/m²。' },
    { q:'密度0.9g/cm³の物質を水（密度1.0g/cm³）に入れると？', sub:'密度と浮き沈み', level:'★★★', hint:'水より軽いか重いか', type:'choice', choices:['浮く','沈む','とける','変化しない'], ans:'浮く', explain:'【考え方】水との密度を比べる。\n【手順】0.9<1.0 → 浮く\n【ポイント】水より軽い＝浮く。' },
    { q:'ばねは20gで2cm伸びる（フックの法則）。50gの力では何cm伸びる？', sub:'フックの法則（グラフ）', level:'★★★', hint:'伸びは力に比例。1gで0.1cm', type:'free', ans:'5', altAns:['5cm'], explain:'【考え方】のびは力に比例。\n【手順】1gで0.1cm。50×0.1＝5cm\n【ポイント】比例なので1gあたりを出す。' },
    { q:'崖に向かって叫ぶと2秒後にやまびこが返った。音速340m/sのとき崖までの距離は？', sub:'音の反射（計算）', level:'★★★', hint:'往復で2秒', type:'free', ans:'340', altAns:['340m'], explain:'【考え方】やまびこは音が往復する。\n【手順】往復＝340×2＝680m。片道＝340m\n【ポイント】÷2を忘れない。' }
  );
  BANK.science.exam.push(
    { q:'物体を月へ持っていくと、変化するのはどちら？', sub:'質量と重さ', level:'★★★', hint:'重力が約1/6', type:'choice', choices:['重さ（ばねばかりの値）','質量（上皿てんびんの値）','体積','密度'], ans:'重さ（ばねばかりの値）', explain:'【考え方】質量と重さの違い。\n【手順】重さ（重力）が変わる。質量は不変\n【ポイント】月の重力は約1/6。' },
    { q:'水を加熱すると100℃付近で温度が一定のまま上がらない時間がある。このとき起きていることは？', sub:'状態変化（グラフ）', level:'★★★', hint:'熱は状態変化に使われる', type:'choice', choices:['沸騰して液体から気体に変化している','温度計が壊れている','水が増えている','凝固している'], ans:'沸騰して液体から気体に変化している', explain:'【考え方】状態変化中は温度が一定。\n【手順】沸騰して液体→気体に変化している\n【ポイント】熱が状態変化に使われ温度は上がらない。' },
    { q:'凸レンズの焦点より内側に物体を置くと見える像は？', sub:'凸レンズ', level:'★★★', hint:'虫めがねの見え方', type:'choice', choices:['拡大した正立の虚像','縮小した倒立の実像','同じ大きさの倒立実像','像はできない'], ans:'拡大した正立の虚像', explain:'【考え方】焦点の内側の見え方。\n【手順】拡大した正立の虚像（虫めがね）\n【ポイント】スクリーンに映らないのが虚像。' },
    { q:'初期微動継続時間が10秒の地点。1秒あたり約8km震源が遠くなる関係のとき、震源までの距離は？', sub:'地震（計算）', level:'★★★', hint:'継続時間×割合', type:'free', ans:'80', altAns:['80km'], explain:'【考え方】震源距離は継続時間に比例。\n【手順】10×8＝約80km\n【ポイント】継続時間が長いほど震源は遠い。' }
  );
  BANK.social.practice.push(
    { q:'5万分の1の地図で8cmは、実際には何km？', sub:'縮尺の計算', level:'★★★', hint:'8cm×50000', type:'free', ans:'4', altAns:['4km'], explain:'【考え方】地図上×縮尺の分母。\n【手順】8×50000＝400000cm＝4km\n【ポイント】cm→m→kmに直す。' },
    { q:'等高線の間隔がせまい場所の斜面のようすは？', sub:'地形図の読み取り', level:'★★☆', hint:'間隔と傾き', type:'choice', choices:['傾きが急','傾きがゆるやか','平ら','水面'], ans:'傾きが急', explain:'【考え方】間隔と傾斜の関係。\n【手順】短い距離で高さが変わる＝急斜面\n【ポイント】せまい＝急、広い＝ゆるやか。' },
    { q:'四季がはっきりし、夏は高温多雨で冬は比較的乾燥。日本の大部分にあてはまる温帯の気候は？', sub:'日本の気候（雨温図）', level:'★★★', hint:'温帯の一つ', type:'choice', choices:['温暖湿潤気候','地中海性気候','西岸海洋性気候','砂漠気候'], ans:'温暖湿潤気候', explain:'【考え方】日本の大部分の気候。\n【手順】温暖湿潤気候（夏多雨・冬乾燥・四季明瞭）\n【ポイント】温帯の一つ。地中海性気候と区別。' },
    { q:'日本が石油（原油）を最も多く輸入している地域は？', sub:'資源と貿易', level:'★★☆', hint:'産油国が集まる', type:'choice', choices:['西アジア（中東）','東南アジア','南アメリカ','アフリカ南部'], ans:'西アジア（中東）', explain:'【考え方】産油国が多い地域を答える。\n【手順】西アジア（中東）\n【ポイント】サウジアラビアなどに依存。' }
  );
  BANK.social.exam.push(
    { q:'夏は高温で乾燥し、冬に雨が多い。気温は温暖で、地中海沿岸に広がる気候は？', sub:'世界の気候（雨温図）', level:'★★★', hint:'オリーブ栽培', type:'choice', choices:['地中海性気候','温暖湿潤気候','熱帯雨林気候','ステップ気候'], ans:'地中海性気候', explain:'【考え方】夏乾燥・冬湿潤の気候。\n【手順】地中海性気候\n【ポイント】オリーブ・ぶどう栽培。' },
    { q:'日本（東経135度）が1月1日 午前9時のとき、ロサンゼルス（西経120度）の日時は？', sub:'時差の計算（日付）', level:'★★★', hint:'経度差255度÷15＝17時間、西は遅れる', type:'choice', choices:['12月31日 午後4時','1月1日 午後4時','1月2日 午前2時','12月31日 午前2時'], ans:'12月31日 午後4時', explain:'【考え方】経度差→時間、西は遅れる。\n【手順】135+120＝255度→17時間。1/1 9時−17時間＝12/31 16時（午後4時）\n【ポイント】日付をまたぐので前日になる。' },
    { q:'世界で最も面積が大きい国は？', sub:'世界地理（統計）', level:'★★☆', hint:'ユーラシア北部', type:'choice', choices:['ロシア','カナダ','中国','アメリカ'], ans:'ロシア', explain:'【考え方】国土面積の順を思い出す。\n【手順】ロシア\n【ポイント】次いでカナダ・アメリカ・中国。' },
    { q:'川が海に出る河口に、運んできた細かい土砂が積もってできる地形は？', sub:'地形', level:'★★★', hint:'三角形に広がる', type:'choice', choices:['三角州','扇状地','リアス海岸','カルデラ'], ans:'三角州', explain:'【考え方】土砂がたまる場所で区別。\n【手順】三角州（河口）\n【ポイント】山地の出口は扇状地。' }
  );
})();
// ---- 数学ジェネレーター ----
const mathGens = [
  function(){ const a=rint(-12,-1), b=rint(-12,-1); const ans=a+b; const c=numChoices(ans); return {q:`(${a}) + (${b}) を計算しよう`, sub:'正負の数（加法）', level:'★★☆', hint:'同符号は絶対値の和に同じ符号', type:'choice', choices:c.choices, ans:c.ans, explain:`【考え方】同符号の和は絶対値をたして同じ符号。\n【手順】同符号の和：${Math.abs(a)}+${Math.abs(b)}=${Math.abs(ans)}、符号は− → ${ans}\n【ポイント】同符号はたして同符号、異符号は引いて大きい方の符号。`}; },
  function(){ const a=rint(-9,9)||3, b=rint(-9,9)||-4; const ans=a-b; const c=numChoices(ans); return {q:`(${a}) − (${b}) を計算しよう`, sub:'正負の数（減法）', level:'★★★', hint:'引く−は、たす+に直す', type:'choice', choices:c.choices, ans:c.ans, explain:`【考え方】引く−はたす+に直す。\n【手順】−(${b})=${-b} → ${a}+(${-b})=${ans}\n【ポイント】マイナスのマイナスはプラス。`}; },
  function(){ const a=rint(-9,-2), b=rint(2,9); const ans=a*b; const c=numChoices(ans,{spread:6}); return {q:`(${a}) × ${b} を計算しよう`, sub:'正負の数（乗法）', level:'★★☆', hint:'負×正は負', type:'choice', choices:c.choices, ans:c.ans, explain:`【考え方】絶対値の積に符号をつける。\n【手順】${Math.abs(a)}×${b}=${Math.abs(ans)}、符号は− → ${ans}\n【ポイント】負×正は負、負×負は正。`}; },
  function(){ const x=rint(-6,6), a=rint(2,6), b=rint(-9,9); const ans=a*x+b; return {q:`x = ${x} のとき、${a}x ${b>=0?'+ '+b:'− '+(-b)} の値は？`, sub:'式の値', level:'★★★', hint:'xを代入', type:'free', ans:`${ans}`, altAns:[`${ans}`], explain:`【考え方】xを代入してから計算する。\n【手順】${a}×(${x})${b>=0?'+'+b:b}=${a*x}${b>=0?'+'+b:b}=${ans}\n【ポイント】代入する数はかっこで囲むと符号ミスが減る。`}; },
  function(){ const a=rint(2,6), b=rint(1,9), c=rint(2,9); const rhs=a*c+b; return {q:`方程式 ${a}x + ${b} = ${rhs} を解くと x = ?`, sub:'一次方程式', level:'★★☆', hint:`${b}を移項`, type:'free', ans:`${c}`, altAns:[`x=${c}`], explain:`【考え方】数を移項してから係数で割る。\n【手順】${a}x=${rhs-b} → x=${c}\n【ポイント】移項すると符号が変わる。`}; },
  function(){ const a=rint(2,5), b=rint(1,6); const ax=a*b; const ans=`${a}x + ${ax}`; const set=new Set([ans]); [`${a}x + ${b}`,`${a}x + ${a+b}`,`x + ${ax}`,`${a}x + ${ax+a}`,`${a+1}x + ${ax}`].forEach(c=>{ if(set.size<4) set.add(c); }); const arr=[...set].slice(0,4); return {q:`${a}(x + ${b}) を展開すると？`, sub:'文字式（分配法則）', level:'★★★', hint:'分配法則', type:'choice', choices:shuffleArr(arr), ans:ans, explain:`【考え方】分配法則でかっこを外す。\n【手順】${a}×x + ${a}×${b} = ${a}x + ${ax}\n【ポイント】外の数を中の各項にかける。`}; },
  function(){ const r=rint(2,9); const ans=r*r; const set=new Set([ans]); [2*r,r,ans+r,4*r,ans+2,ans-1].forEach(v=>{ if(set.size<4 && v>0) set.add(v); }); const arr=[...set].slice(0,4); return {q:`半径${r}cmの円の面積は？（円周率π）`, sub:'円の面積', level:'★★☆', hint:'π×半径×半径', type:'choice', choices:shuffleArr(arr.map(v=>`${v}π cm²`)), ans:`${ans}π cm²`, explain:`【考え方】円の面積＝π×半径²。\n【手順】π×${r}²=${ans}π cm²\n【ポイント】面積は半径の2乗。直径と混同しない。`}; },
  function(){ const r=rint(2,9); const ans=2*r; const set=new Set([ans]); [r,4*r,r*r,3*r,ans+2,ans-1].forEach(v=>{ if(set.size<4 && v>0) set.add(v); }); const arr=[...set].slice(0,4); return {q:`半径${r}cmの円の周の長さは？`, sub:'円周', level:'★★★', hint:'2×π×半径', type:'choice', choices:shuffleArr(arr.map(v=>`${v}π cm`)), ans:`${ans}π cm`, explain:`【考え方】円周＝2π×半径。\n【手順】2π×${r}=${ans}π cm\n【ポイント】円周は2乗ではなく2×π×半径。`}; },
  function(){ const s=rint(2,9); const ans=s*s*s; return {q:`1辺${s}cmの立方体の体積は？`, sub:'体積', level:'★★☆', hint:'1辺×1辺×1辺', type:'free', ans:`${ans}`, altAns:[`${ans}cm3`,`${ans}cm³`], explain:`【考え方】立方体＝1辺の3乗。\n【手順】${s}×${s}×${s}=${ans}cm³\n【ポイント】縦＝横＝高さを3つかける。`}; },
  function(){ const price=rint(1,9)*100; const p=rint(1,4)*10; const off=Math.round(price*(100-p)/100); return {q:`定価${price}円の品を${p/10}割引きで買うといくら？`, sub:'割合', level:'★★★', hint:`${p/10}割引き=×${(100-p)/100}`, type:'free', ans:`${off}`, altAns:[`${off}円`], explain:`【考え方】○割引き＝(1−0.1×割)倍。\n【手順】${price}×${(100-p)/100}=${off}円\n【ポイント】3割引き＝0.7倍。割合を小数に直す。`}; },
  function(){ const v=rint(3,9)*10; const t=rint(2,6); const ans=v*t; return {q:`時速${v}kmで${t}時間走ると何km進む？`, sub:'速さ', level:'★★☆', hint:'距離=速さ×時間', type:'free', ans:`${ans}`, altAns:[`${ans}km`], explain:`【考え方】距離＝速さ×時間。\n【手順】${v}×${t}=${ans}km\n【ポイント】速さ・時間・距離の関係を覚える。`}; },
  function(){ const n=rint(4,7); const ans=n*(n-1)/2; return {q:`${n}人から委員を2人選ぶ。選び方は何通り？`, sub:'場合の数（組合せ）', level:'★★★', hint:`${n}×${n-1}÷2`, type:'free', ans:`${ans}`, altAns:[`${ans}通り`], explain:`【考え方】順番を考えない選び方は÷2。\n【手順】${n}×${n-1}÷2=${ans}通り\n【ポイント】2人選ぶは重複(ABとBA)を÷2で消す。`}; },
  function(){ const a3=rint(60,90),b3=rint(60,90),c3=rint(60,90); const avg=rint(65,85); const sum=avg*4; const last=sum-(a3+b3+c3); if(last<0||last>100) return mathGens[0](); return {q:`4人の平均点が${avg}点。3人が${a3},${b3},${c3}点のとき、残り1人は？`, sub:'平均', level:'★★★', hint:'4人合計−3人合計', type:'free', ans:`${last}`, altAns:[`${last}点`], explain:`【考え方】平均×人数＝合計。合計の差から残りを出す。\n【手順】合計=${avg}×4=${sum}、残り=${sum}−${a3+b3+c3}=${last}点\n【ポイント】平均は必ず“合計”に直してから計算。`}; },
  function(){ const a=rint(2,6); const x=rint(2,9); const y=a*x; return {q:`比例 y=${a}x で、x=${x} のとき y は？`, sub:'比例', level:'★★☆', hint:'代入', type:'free', ans:`${y}`, altAns:[`y=${y}`], explain:`【考え方】比例の式 y=ax にxを代入。\n【手順】y=${a}×${x}=${y}\n【ポイント】xの値をそのまま式に入れる。`}; },
  function(){ const x=pick([2,3,4,6]); const k=x*rint(2,6); const y=k/x; return {q:`反比例 y=${k}/x で、x=${x} のとき y は？`, sub:'反比例', level:'★★★', hint:'代入', type:'free', ans:`${y}`, altAns:[`y=${y}`], explain:`【考え方】反比例 y=a/x にxを代入。\n【手順】y=${k}÷${x}=${y}\n【ポイント】反比例はa÷xでyが出る。`}; },
  // ----- 偏差値65対策：追加単元のジェネレーター -----
  function(){ let a=[]; for(let i=0;i<5;i++) a.push(rint(1,20)); a.sort((p,q)=>p-q); const med=a[2]; return {q:`5個の値 ${a.join(',')} の中央値は？`, sub:'中央値', level:'★★☆', hint:'小さい順の真ん中（3番目）', type:'free', ans:`${med}`, altAns:[`${med}`], explain:`【考え方】小さい順に並べた真ん中。\n【手順】小さい順の3番目が中央値 → ${med}\n【ポイント】5個（奇数）は中央の1つ。`}; },
  function(){ const lo=rint(1,9), hi=lo+rint(5,20); return {q:`最大値${hi}、最小値${lo}のデータの範囲は？`, sub:'範囲', level:'★★☆', hint:'最大−最小', type:'free', ans:`${hi-lo}`, altAns:[`${hi-lo}`], explain:`【考え方】範囲＝最大−最小。\n【手順】${hi}−${lo}=${hi-lo}\n【ポイント】データの散らばりの大きさ。`}; },
  function(){ const t=pick([[20,5],[20,10],[20,15],[25,5],[25,10],[25,15],[25,20],[50,5],[50,10],[50,20],[40,10],[40,20]]); const tot=t[0], f=t[1]; const r=Math.round(f/tot*100)/100; return {q:`全${tot}人のうち、ある階級の度数が${f}人。相対度数は？`, sub:'相対度数', level:'★★★', hint:'度数÷全体（割り切れる値）', type:'free', ans:`${r}`, altAns:[`${r}`], explain:`【考え方】相対度数＝度数÷全体。\n【手順】${f}÷${tot}=${r}\n【ポイント】全部の相対度数をたすと1。`}; },
  function(){ const a=pick([2,3,4,5,-2,-3,-4]); const x=rint(2,6); const y=a*x; return {q:`y は x に比例し、x=${x} のとき y=${y}。比例定数は？`, sub:'比例定数', level:'★★☆', hint:'a = y ÷ x', type:'free', ans:`${a}`, altAns:[`${a}`], explain:`【考え方】比例定数 a＝y÷x。\n【手順】${y}÷${x}=${a}\n【ポイント】1組の値から求まる。`}; },
  function(){ const a=pick([12,24,36]); const x=pick([2,3,4,6]); const y=a/x; return {q:`y は x に反比例し、x=${x} のとき y=${y}。比例定数（x×y）は？`, sub:'反比例の比例定数', level:'★★★', hint:'x×y は一定', type:'free', ans:`${a}`, altAns:[`${a}`], explain:`【考え方】反比例は積 x×y が一定。\n【手順】${x}×${y}=${a}\n【ポイント】比例はy÷x、反比例はx×y。`}; },
  function(){ const t=pick([[6,120,4],[3,120,2],[9,40,2],[12,30,2],[6,90,3],[9,120,6],[12,60,4],[6,60,2],[12,120,8]]); const r=t[0],ang=t[1],c=t[2]; const set=new Set([c]); [c+1,c-1,2*c,Math.max(1,c-2)].forEach(v=>{if(set.size<4&&v>0)set.add(v);}); const arr=[...set].slice(0,4); return {q:`半径${r}cm、中心角${ang}°のおうぎ形の弧の長さは？`, sub:'おうぎ形の弧', level:'★★★', hint:'2πr×(中心角/360)', type:'choice', choices:shuffleArr(arr.map(v=>`${v}π cm`)), ans:`${c}π cm`, explain:`【考え方】弧＝円周×(中心角/360)。\n【手順】2π×${r}×${ang}/360 = ${c}π cm\n【ポイント】中心角の割合だけ円周をとる。`}; },
  function(){ const t=pick([[6,120,12],[3,120,3],[9,40,9],[12,30,12],[6,90,9],[6,60,6],[12,60,24],[9,120,27]]); const r=t[0],ang=t[1],c=t[2]; const set=new Set([c]); [c+2,c-2,2*c,Math.max(1,Math.round(c/2))].forEach(v=>{if(set.size<4&&v>0)set.add(v);}); const arr=[...set].slice(0,4); return {q:`半径${r}cm、中心角${ang}°のおうぎ形の面積は？`, sub:'おうぎ形の面積', level:'★★★', hint:'πr²×(中心角/360)', type:'choice', choices:shuffleArr(arr.map(v=>`${v}π cm²`)), ans:`${c}π cm²`, explain:`【考え方】面積＝円の面積×(中心角/360)。\n【手順】π×${r}²×${ang}/360 = ${c}π cm²\n【ポイント】弧と同じ割合。半径の2乗を使う。`}; },
  function(){ const r=rint(2,6); const h=pick([3,6,9,12,15]); const c=r*r*h/3; const wrong=r*r*h; const set=new Set([c, wrong]); [c+r, Math.max(1,c-2)].forEach(v=>{if(set.size<4&&v>0)set.add(v);}); const arr=[...set].slice(0,4); return {q:`底面の半径${r}cm、高さ${h}cmの円錐の体積は？`, sub:'円錐の体積', level:'★★★', hint:'πr²h×1/3', type:'choice', choices:shuffleArr(arr.map(v=>`${v}π cm³`)), ans:`${c}π cm³`, explain:`【考え方】円錐＝πr²×高さ×1/3。\n【手順】π×${r}²×${h}×1/3 = ${c}π cm³\n【ポイント】円柱の1/3。×1/3を忘れない。`}; },
  function(){ const r=rint(2,6); const surf=4*r*r; const set=new Set([surf]); [r*r,2*r*r,surf+r].forEach(v=>{if(set.size<4&&v>0)set.add(v);}); const arr=[...set].slice(0,4); return {q:`半径${r}cmの球の表面積は？`, sub:'球の表面積', level:'★★★', hint:'4πr²', type:'choice', choices:shuffleArr(arr.map(v=>`${v}π cm²`)), ans:`${surf}π cm²`, explain:`【考え方】球の表面積＝4πr²。\n【手順】4π×${r}² = ${surf}π cm²\n【ポイント】半径の2乗。体積と区別。`}; },
  function(){ const r=pick([3,6]); const vol=4*r*r*r/3; const set=new Set([vol]); [r*r*r,4*r*r,vol+r].forEach(v=>{if(set.size<4&&v>0)set.add(v);}); const arr=[...set].slice(0,4); return {q:`半径${r}cmの球の体積は？`, sub:'球の体積', level:'★★★', hint:'4/3 πr³', type:'choice', choices:shuffleArr(arr.map(v=>`${v}π cm³`)), ans:`${vol}π cm³`, explain:`【考え方】球の体積＝4/3πr³。\n【手順】4/3×π×${r}³ = ${vol}π cm³\n【ポイント】半径の3乗。表面積と区別。`}; },
  function(){ const base=pick([12,18,24,30,36]); const h=pick([3,6,9]); const c=base*h/3; return {q:`底面積${base}cm²、高さ${h}cmの角錐の体積は？`, sub:'角錐の体積', level:'★★★', hint:'底面積×高さ×1/3', type:'free', ans:`${c}`, altAns:[`${c}cm3`,`${c}cm³`], explain:`【考え方】錐＝底面積×高さ×1/3。\n【手順】${base}×${h}×1/3 = ${c}cm³\n【ポイント】角柱の1/3。`}; },
  function(){ const e2=rint(1,3), e3=rint(0,2), e5=rint(0,1); const n=Math.pow(2,e2)*Math.pow(3,e3)*Math.pow(5,e5); const cnt=(e2+1)*(e3+1)*(e5+1); if(n<6||n>400) return mathGens[0](); return {q:`${n} の約数は全部で何個？`, sub:'約数の個数', level:'★★★', hint:'素因数分解して各指数+1をかける', type:'free', ans:`${cnt}`, altAns:[`${cnt}個`], explain:`【考え方】各指数に1を足してかける。\n【手順】${n}を素因数分解し、各指数+1をかけると約数の個数=${cnt}個\n【ポイント】約数の個数＝(各指数+1)の積。`}; },
  function(){ const p1=pick([60,80,90,100]); const p2=p1+pick([30,40,50]); const total=pick([8,10,12]); const x=rint(2,total-2); const cost=p1*x+p2*(total-x); return {q:`1個${p1}円と1個${p2}円の品を合わせて${total}個買うと代金${cost}円。${p1}円の品は何個？`, sub:'方程式の文章題', level:'★★★', hint:`${p1}x+${p2}(${total}-x)=${cost}`, type:'free', ans:`${x}`, altAns:[`${x}個`], explain:`【考え方】一方を(全体−x)とおいて方程式。\n【手順】${p1}x+${p2}(${total}-x)=${cost} を解くと x=${x}個\n【ポイント】合計個数を使って残りを表す。`}; },
];
// ---- 中学：文章題（立式）を強化＝偏差値55→65で差がつく思考問題を追加 ----
mathGens.push(
 // ある数（一次方程式）
 function(){ var x=rint(3,12), a=rint(2,5), b=rint(3,15), r=a*x+b; return {q:'ある数を'+a+'倍して'+b+'をたすと'+r+'になった。ある数は？', sub:'方程式の文章題（ある数）', level:'★★★', hint:'ある数をxとして '+a+'x+'+b+'='+r, type:'free', ans:''+x, altAns:[''+x], explain:'【考え方】わからない数をxとおいて式にする。\n【手順】'+a+'x+'+b+'='+r+' → '+a+'x='+(r-b)+' → x='+x+'\n【ポイント】文を そのまま 式に する。'}; },
 // 和差算（合計と差）
 function(){ var big=rint(8,20), small=rint(3,big-2), s=big+small, d=big-small; return {q:'えんぴつとペンを 合わせて'+s+'本 買った。えんぴつは ペンより'+d+'本 多い。えんぴつは 何本？', sub:'方程式の文章題（和差）', level:'★★★', hint:'ペンをxとして (x+'+d+')+x='+s, type:'free', ans:''+big, altAns:[big+'本'], explain:'【考え方】少ない方をxとおく。\n【手順】x+(x+'+d+')='+s+' → 2x='+(s-d)+' → x='+small+'、多い方は'+big+'本\n【ポイント】和と差から2つを もとめる。'}; },
 // 連続する2つの整数
 function(){ var n=rint(5,30), s=n+(n+1); return {q:'連続する2つの整数の 和が'+s+'。小さい方の整数は？', sub:'方程式の文章題（連続整数）', level:'★★★', hint:'小さい方をxとして x+(x+1)='+s, type:'free', ans:''+n, altAns:[''+n], explain:'【考え方】連続する整数は x と x+1。\n【手順】x+(x+1)='+s+' → 2x+1='+s+' → x='+n+'\n【ポイント】連続整数は 1ちがい。'}; },
 // 過不足算（配った数＋あまり＝全体）
 function(){ var kids=rint(4,9), each=rint(3,6), sur=rint(2,5); var total=each*kids+sur; return {q:'あめを 1人に'+each+'個ずつ 配ると'+sur+'個 あまる。全部で'+total+'個 あるとき、子どもは 何人？', sub:'方程式の文章題（過不足）', level:'★★★', hint:each+'x+'+sur+'='+total, type:'free', ans:''+kids, altAns:[kids+'人'], explain:'【考え方】人数をxとして 配った数＋あまり＝全体。\n【手順】'+each+'x+'+sur+'='+total+' → '+each+'x='+(total-sur)+' → x='+kids+'\n【ポイント】あまりは たす。'}; },
 // 速さ（道のり＝速さ×時間の文章）
 function(){ var v=pick([60,70,80,90]); var t=rint(3,12); var dist=v*t; return {q:'家から 学校まで 分速'+v+'mで 歩くと'+t+'分 かかった。家から 学校までの 道のりは？（m）', sub:'速さの文章題', level:'★★★', hint:'道のり＝速さ×時間', type:'free', ans:''+dist, altAns:[dist+'m'], explain:'【考え方】道のり＝速さ×時間。\n【手順】'+v+'×'+t+'='+dist+'m\n【ポイント】単位（分速×分）をそろえる。'}; },
 // 割合（もとにする量）＝くらべる量÷割合。baseは100の倍数で amt は必ず整数
 function(){ var base=rint(1,6)*100; var p=pick([20,25,40,50,60,75]); var amt=base*p/100; return {q:'ある数の'+p+'%が'+amt+'。ある数は？', sub:'割合の文章題（もとにする量）', level:'★★★★', hint:'ある数×'+(p/100)+'='+amt, type:'free', ans:''+base, altAns:[''+base], explain:'【考え方】もとにする量＝くらべる量÷割合。\n【手順】'+amt+'÷'+(p/100)+'='+base+'\n【ポイント】％は 小数（'+(p/100)+'）に 直す。'}; }
);
// ---- 理科ジェネレーター ----
const sciGens = [
  function(){ const v=rint(2,9)*10; const d=pick([2,2.5,4,5,8]); const m=Math.round(d*v); return {q:`体積${v}cm³、密度${d}g/cm³の物体の質量は？（g）`, sub:'密度の計算', level:'★★★', hint:'質量=密度×体積', type:'free', ans:`${m}`, altAns:[`${m}g`], explain:`【考え方】質量＝密度×体積。\n【手順】${d}×${v}=${m}g\n【ポイント】密度の式は÷と×を使い分ける。`}; },
  function(){ const m=rint(2,9)*10; const v=rint(2,9)*5; const d=Math.round(m/v*100)/100; return {q:`質量${m}g、体積${v}cm³の密度は？（g/cm³）`, sub:'密度の計算', level:'★★★', hint:'質量÷体積', type:'free', ans:`${d}`, altAns:[`${d}g/cm3`,`${d}g/cm³`], explain:`【考え方】密度＝質量÷体積。\n【手順】${m}÷${v}=${d}g/cm³\n【ポイント】単位はg/cm³。`}; },
  function(){ const solute=rint(1,6)*10; const total=solute+rint(4,12)*10; const c=Math.round(solute/total*1000)/10; return {q:`溶質${solute}gを溶かして全体を${total}gにした水溶液の濃度は？（％）`, sub:'濃度の計算', level:'★★★', hint:'溶質÷溶液×100', type:'free', ans:`${c}`, altAns:[`${c}%`,`${c}％`], explain:`【考え方】濃度＝溶質÷溶液×100。\n【手順】${solute}÷${total}×100=${c}％\n【ポイント】溶液は全体（溶質＋水）。`}; },
  function(){ const f=rint(2,9)*10; const a=pick([0.5,1,2,4,5]); const p=Math.round(f/a); return {q:`面積${a}m²に${f}Nの力がかかるときの圧力は？（Pa）`, sub:'圧力の計算', level:'★★★', hint:'力÷面積', type:'free', ans:`${p}`, altAns:[`${p}Pa`], explain:`【考え方】圧力＝力÷面積。\n【手順】${f}÷${a}=${p}Pa\n【ポイント】単位はPa＝N/m²。`}; },
  function(){ const e1=rint(2,5); const w1=rint(2,5)*10; const mul=rint(2,4); const w2=w1*mul; const e2=e1*mul; return {q:`ばねに${w1}gで${e1}cmのびた。${w2}gでは何cmのびる？`, sub:'フックの法則', level:'★★★', hint:'のびは重さに比例', type:'free', ans:`${e2}`, altAns:[`${e2}cm`], explain:`【考え方】のびは力（重さ）に比例。\n【手順】のびは重さに比例。${w1}g→${e1}cmなので${w2}gは${e2}cm\n【ポイント】1gあたりのびを出すと速い。`}; },
  function(){ const t=rint(2,8); const ans=340*t; return {q:`花火が見えてから${t}秒後に音。音速340m/sとして距離は？（m）`, sub:'音の距離', level:'★★★', hint:'速さ×時間', type:'free', ans:`${ans}`, altAns:[`${ans}m`], explain:`【考え方】距離＝音速×時間。\n【手順】340×${t}=${ans}m\n【ポイント】光はほぼ瞬時。秒数×340。`}; },
  function(){ const g=rint(1,9)*100; const n=g/100; return {q:`質量${g}gの物体にはたらく重力はおよそ何N？`, sub:'力の大きさ', level:'★★☆', hint:'100g≒1N', type:'free', ans:`${n}`, altAns:[`${n}N`], explain:`【考え方】100gで約1N。\n【手順】100gで約1N → ${g}gで約${n}N\n【ポイント】重力は質量に比例。`}; },
  function(){ const speed=pick([6,7,8]); const dist=speed*rint(3,12); const t=dist/speed; return {q:`P波の速さ${speed}km/s、震源距離${dist}kmのとき、P波到達は地震発生の何秒後？`, sub:'地震の計算', level:'★★★', hint:'距離÷速さ', type:'free', ans:`${t}`, altAns:[`${t}秒`], explain:`【考え方】時間＝距離÷速さ。\n【手順】${dist}÷${speed}=${t}秒\n【ポイント】速さの公式を使う。`}; },
];
// ---- 社会ジェネレーター ----
const socGens = [
  function(){ const diff=pick([30,45,60,75,90]); const hours=diff/15; const dir=pick(['東','西']); const base=135; const other= dir==='東'? base+diff : base-diff; if(other>180||other<0) return socGens[3](); const same= dir==='東'?'進んでいる':'遅れている'; const opp= dir==='東'?'遅れている':'進んでいる'; const ans=`${hours}時間${same}`; const set=new Set([ans]); [`${hours}時間${opp}`,`${hours+1}時間${same}`,`${hours+1}時間${opp}`,`${hours+2}時間${same}`,`${Math.max(1,hours-1)}時間${same}`].forEach(c=>{ if(set.size<4) set.add(c); }); const arr=[...set].slice(0,4); return {q:`東経135度の日本に対し、${dir}経${other}度の都市の時差は？（経度差${diff}度）`, sub:'時差の計算', level:'★★★', hint:'経度差÷15', type:'choice', choices:shuffleArr(arr), ans:ans, explain:`【考え方】経度差÷15で時間、東西で進む/遅れる。\n【手順】経度差${diff}÷15=${hours}時間。${dir}にあるほど${dir==='東'?'進む':'遅れる'}\n【ポイント】東は進む、西は遅れる。`}; },
  function(){ const a=pick([135,150,120,105]); const b=pick([75,60,90,45]); const diff=a+b; const h=diff/15; return {q:`東経${a}度と西経${b}度の都市の時差は何時間？`, sub:'時差の計算', level:'★★★', hint:'経度を足して÷15', type:'free', ans:`${h}`, altAns:[`${h}時間`], explain:`【考え方】東経と西経は経度を足す。\n【手順】経度差=${a}+${b}=${diff}度。${diff}÷15=${h}時間\n【ポイント】同じ側どうしは引く。`}; },
  function(){ const scale=pick([25000,50000,10000]); const cm=rint(2,9); const realM=cm*scale/100; const realStr= realM>=1000? `${realM/1000}km` : `${realM}m`; return {q:`${scale.toLocaleString()}分の1の地図で、地図上${cm}cmは実際に何m？`, sub:'縮尺の計算', level:'★★★', hint:`${cm}×${scale}`, type:'free', ans:`${realM}`, altAns:[`${realM}m`, realStr], explain:`【考え方】地図上の長さ×縮尺の分母＝実際。\n【手順】${cm}cm×${scale}=${cm*scale}cm=${realM}m\n【ポイント】cmで計算→m・kmに直す。`}; },
  function(){ const deg=pick([15,30,45,60,75,90]); const h=deg/15; return {q:`地球は15度で1時間ずれる。経度差${deg}度の時差は何時間？`, sub:'時差の基礎', level:'★★☆', hint:'÷15', type:'free', ans:`${h}`, altAns:[`${h}時間`], explain:`【考え方】経度15度で時差1時間。\n【手順】${deg}÷15=${h}時間\n【ポイント】地球は24時間で360度回る。`}; },
];
// ---- 英語ジェネレーター ----
// ---- 中1英語 模試レベル強化（全国模試・英検5級形式：整序・対話文完成・読解。8月まで範囲に適合） ----
BANK.english.exam.push(
  { q:'正しく並べた文は？（私は毎朝6時に起きます）', sub:'語順（整序）', level:'★★★', hint:'主語＋動詞＋時刻＋頻度', type:'choice', choices:['I get up at six every morning.','I get at six up every morning.','Every morning six I get up at.','I at six get up every morning.'], ans:'I get up at six every morning.', explain:'【考え方】英語は主語＋動詞が基本。時刻(at six)→頻度(every morning)の順。\n【手順】I get up / at six / every morning.\n【ポイント】「〜時に」はat＋時刻。修飾語は文の後ろへ。' },
  { q:'正しく並べた文は？（あなたは何のスポーツが好きですか）', sub:'語順（整序・疑問詞）', level:'★★★', hint:'疑問詞＋名詞を文頭に', type:'choice', choices:['What sport do you like?','What do you like sport?','Do you what sport like?','What sport you do like?'], ans:'What sport do you like?', explain:'【考え方】「何の＋名詞」はWhat＋名詞のかたまりで文頭。\n【手順】What sport＋do you like?\n【ポイント】What color/What subjectも同じ形。' },
  { q:'正しく並べた文は？（彼女は私の英語の先生です）', sub:'語順（整序）', level:'★★☆', hint:'my English teacher の語順', type:'choice', choices:['She is my English teacher.','She is English my teacher.','My English is she teacher.','She my English teacher is.'], ans:'She is my English teacher.', explain:'【考え方】所有格(my)＋種類(English)＋名詞(teacher)の順。\n【手順】She is / my English teacher.\n【ポイント】日本語と同じ「私の英語の先生」の順で並ぶ。' },
  { q:'正しく並べた文は？（あなたは日曜日に何をしますか）', sub:'語順（整序・疑問詞）', level:'★★★', hint:'What＋do you＋動詞', type:'choice', choices:['What do you do on Sundays?','What you do do on Sundays?','Do you what do on Sundays?','What do on Sundays you do?'], ans:'What do you do on Sundays?', explain:'【考え方】疑問詞What＋疑問文の語順(do you do)。\n【手順】2つ目のdoは「する」という動詞。\n【ポイント】What do you do?＝「何をしますか」。doが2回出てよい。' },
  { q:'正しく並べた文は？（この箱を運ばないでください）', sub:'語順（否定の命令文）', level:'★★★', hint:'Don\'t＋動詞の原形', type:'choice', choices:['Don\'t carry this box.','Not carry this box.','You don\'t carry this box?','Don\'t this box carry.'], ans:'Don\'t carry this box.', explain:'【考え方】否定の命令文はDon\'t＋原形で始める。\n【手順】Don\'t carry＋this box.\n【ポイント】主語Youは置かない。' },
  { q:'対話：A: Do you play the guitar? B: (   ) I play it every day.', sub:'対話文完成', level:'★★☆', hint:'Doで聞かれたらdoで答える', type:'choice', choices:['Yes, I do.','Yes, I am.','Yes, you do.','Yes, it is.'], ans:'Yes, I do.', explain:'【考え方】Do you〜?にはdo/don\'tで答える。\n【手順】Yes, I do.／No, I don\'t.\n【ポイント】be動詞で聞かれたらbe動詞で、doで聞かれたらdoで答える。' },
  { q:'対話：A: (   ) B: It\'s ten thirty.', sub:'対話文完成（疑問詞）', level:'★★★', hint:'時刻を答えている', type:'choice', choices:['What time is it?','What day is it?','How old are you?','When do you get up?'], ans:'What time is it?', explain:'【考え方】答えが「10時30分」→時刻をたずねる文。\n【手順】What time is it? — It\'s ten thirty.\n【ポイント】What day＝曜日、What time＝時刻。答えから逆算する。' },
  { q:'対話：A: Where is my cap? B: (   )', sub:'対話文完成（場所）', level:'★★★', hint:'場所を答える', type:'choice', choices:['It\'s under the chair.','Yes, it is.','It\'s ten o\'clock.','You are welcome.'], ans:'It\'s under the chair.', explain:'【考え方】Where〜?には場所を答える。\n【手順】It\'s under the chair.（いすの下だよ）\n【ポイント】Yes/Noで答えない。under/on/inなど前置詞で場所を示す。' },
  { q:'対話：A: Is this your notebook? B: No, (   ). It\'s Yuki\'s.', sub:'対話文完成（be動詞）', level:'★★☆', hint:'thisはitで受ける', type:'choice', choices:['it isn\'t','this isn\'t','I\'m not','it doesn\'t'], ans:'it isn\'t', explain:'【考え方】Is this〜?への答えはit。\n【手順】No, it isn\'t.\n【ポイント】this/thatは答えの文ではitに変わる。' },
  { q:'対話：A: How many caps do you have? B: (   )', sub:'対話文完成（数）', level:'★★★', hint:'数を答える', type:'choice', choices:['I have about twenty.','Yes, I do.','It\'s five hundred yen.','They are new.'], ans:'I have about twenty.', explain:'【考え方】How many〜?には数を答える。\n【手順】I have about twenty.（20個くらい）\n【ポイント】How many＝いくつ。about＝約。' },
  { q:'Ken is my friend. I like (   ) very much.', sub:'代名詞（目的格）', level:'★★★', hint:'動詞のあとの「彼を」', type:'choice', choices:['him','he','his','her'], ans:'him', explain:'【考え方】動詞の目的語は目的格。\n【手順】like him（彼を好き）\n【ポイント】he-his-him、she-her-her、they-their-them。' },
  { q:'(   ) bag is yours, this one or that one?', sub:'疑問詞 Which', level:'★★★', hint:'2つから選ぶ', type:'choice', choices:['Which','What','Whose','Who'], ans:'Which', explain:'【考え方】A or B と選択肢がある→「どちらの」。\n【手順】Which bag〜, this one or that one?\n【ポイント】選択はWhich、持ち主はWhose。' },
  { q:'(   ) bike is this? — It\'s my sister\'s.', sub:'疑問詞 Whose', level:'★★★', hint:'持ち主をたずねる', type:'choice', choices:['Whose','Who','Which','What'], ans:'Whose', explain:'【考え方】答えが「姉のもの」→持ち主。\n【手順】Whose bike is this?\n【ポイント】Whose＝だれの。名詞\'s＝「〜のもの」。' },
  { q:'My school is (   ) the library and the park.', sub:'前置詞（場所）', level:'★★★', hint:'AとBの間', type:'choice', choices:['between','under','on','from'], ans:'between', explain:'【考え方】「AとBの間」の前置詞。\n【手順】between A and B\n【ポイント】between＝2つの間、among＝3つ以上の間。' },
  { q:'I want (   ) orange and two apples.', sub:'冠詞 a/an', level:'★★☆', hint:'母音の音で始まる語', type:'choice', choices:['an','a','the','two'], ans:'an', explain:'【考え方】母音の音（a,i,u,e,o）で始まる語にはan。\n【手順】an orange\n【ポイント】an apple, an egg, an hour（発音で判断）。' },
  { q:'(   ) your father busy now?', sub:'be動詞と一般動詞の区別', level:'★★★', hint:'busyは形容詞（動詞がない）', type:'choice', choices:['Is','Does','Do','Are'], ans:'Is', explain:'【考え方】文に一般動詞がない（busy＝形容詞）→be動詞の疑問文。\n【手順】Is your father busy?\n【ポイント】動詞があればDo/Does、なければbe動詞。' },
  { q:'What (   ) on TV? — I watch soccer games.', sub:'疑問文の語順', level:'★★★', hint:'疑問詞のあとは do you＋動詞', type:'choice', choices:['do you watch','you watch','are you watch','watch you'], ans:'do you watch', explain:'【考え方】疑問詞のあとは疑問文の語順。\n【手順】What do you watch on TV?\n【ポイント】be動詞とdoを混ぜない（are you watchは誤り）。' },
  { q:'"the third month of the year" は何月？', sub:'語彙（月・序数）', level:'★★☆', hint:'3番目の月', type:'choice', choices:['March','May','April','September'], ans:'March', explain:'【考え方】third＝3番目。年の3番目の月。\n【手順】1月January→2月February→3月March\n【ポイント】first/second/thirdの序数と月名をセットで。' },
  { q:'時計が 9:15 のとき、What time is it? の答えは？', sub:'時刻の表現', level:'★★☆', hint:'時→分の順で読む', type:'choice', choices:['It\'s nine fifteen.','It\'s fifteen nine.','It\'s nine fifty.','It\'s five nineteen.'], ans:'It\'s nine fifteen.', explain:'【考え方】時刻は「時→分」の順にそのまま読む。\n【手順】9:15＝nine fifteen\n【ポイント】fifteen(15)とfifty(50)の聞き分け・読み分けに注意。' },
  { q:'反対の意味の語は？ "before"', sub:'語彙（反意語）', level:'★★☆', hint:'あとで', type:'choice', choices:['after','ago','late','next'], ans:'after', explain:'【考え方】before（〜の前）の反対。\n【手順】before ⇔ after\n【ポイント】before school／after school のペアで覚える。' },
  { passage:'Hi, I\'m Emi. I\'m from Osaka. I\'m a junior high school student. I like music very much, and I play the piano every day. My favorite subject is English. I have two dogs, Koro and Shiro. They are very cute.', q:'【読解】エミが毎日していることは？', sub:'読解（内容一致）', level:'★★★', hint:'every day のある文をさがす', type:'choice', choices:['ピアノをひく','犬の散歩をする','英語の歌を歌う','大阪に行く'], ans:'ピアノをひく', explain:'【考え方】every dayを含む文を探す。\n【手順】I play the piano every day.＝毎日ピアノをひく\n【ポイント】設問のキーワード（毎日）を本文から探すのが読解のコツ。' },
  { passage:'Hi, I\'m Emi. I\'m from Osaka. I\'m a junior high school student. I like music very much, and I play the piano every day. My favorite subject is English. I have two dogs, Koro and Shiro. They are very cute.', q:'【読解】エミについて本文の内容と合うものは？', sub:'読解（内容一致）', level:'★★★', hint:'1つずつ本文と照らし合わせる', type:'choice', choices:['犬を2ひき飼っている','東京の出身だ','好きな教科は音楽だ','ねこを飼っている'], ans:'犬を2ひき飼っている', explain:'【考え方】選択肢を本文と1つずつ照合。\n【手順】I have two dogs → 犬2ひき◯。出身はOsaka、好きな教科はEnglish。\n【ポイント】「音楽が好き」と「好きな教科」のひっかけに注意。' },
  { passage:'Ken is my classmate. He is on the soccer team. We practice soccer together on Tuesdays and Fridays. Ken and I walk to school every day. His house is near my house.', q:'【読解】ケンと「私」がサッカーを練習する曜日は？', sub:'読解（内容一致）', level:'★★★', hint:'on ＋曜日s', type:'choice', choices:['火曜日と金曜日','月曜日と水曜日','土曜日と日曜日','木曜日だけ'], ans:'火曜日と金曜日', explain:'【考え方】on Tuesdays and Fridaysを読み取る。\n【手順】Tuesday＝火曜、Friday＝金曜\n【ポイント】曜日+s＝「毎週〜曜日に」。' },
  { passage:'Ken is my classmate. He is on the soccer team. We practice soccer together on Tuesdays and Fridays. Ken and I walk to school every day. His house is near my house.', q:'【読解】本文の内容と合うものは？', sub:'読解（内容一致）', level:'★★★', hint:'walk to school に注目', type:'choice', choices:['ケンと「私」は毎日歩いて学校に行く','ケンはバスで学校に行く','ケンの家は学校の中にある','ケンは野球部に入っている'], ans:'ケンと「私」は毎日歩いて学校に行く', explain:'【考え方】walk to school every day＝毎日歩いて通学。\n【手順】soccer team（サッカー部）、house is near my house（家が近い）も確認\n【ポイント】本文にない情報（バス・野球部）を選ばない。' }
);
const ENG_SUBJ3 = ['He','She','My father','My sister','Tom','Ken','My brother'];
const ENG_VERBS = [['play','plays','tennis'],['like','likes','music'],['watch','watches','TV'],['go','goes','to school'],['have','has','a dog'],['study','studies','English'],['wash','washes','the car']];
const ENG_PLURAL = [['box','boxes'],['watch','watches'],['city','cities'],['leaf','leaves'],['child','children'],['knife','knives'],['country','countries'],['dish','dishes']];
const ENG_PREP_TIME = [['noon','at','正午など時刻の一点は at'],['Monday','on','曜日・日付は on'],['March','in','月・季節・年は in'],['night','at','at night（夜に）'],['summer','in','季節は in']];
const engGens = [
  function(){ const s=pick(ENG_SUBJ3); const v=pick(ENG_VERBS); return {q:`${s} (   ) ${v[2]}.`, sub:'三単現', level:'★★★', hint:'主語は3人称単数', type:'choice', choices:shuffleArr([v[1], v[0], v[0]+'ing', v[0]+'ed']), ans:v[1], explain:`【考え方】主語が3人称単数の現在は動詞に-s。\n【手順】主語が3人称単数の現在→動詞に s/es。正解 ${v[1]}\n【ポイント】he/she/it＋現在＝-s。`}; },
  function(){ const p=pick(ENG_PLURAL); const set=new Set([p[1]]); [p[0]+'s', p[0], p[0]+'es', p[0]+'ies'].forEach(c=>{ if(set.size<4) set.add(c); }); const arr=[...set].slice(0,4); return {q:`I have two (   ).（${p[0]} の複数形）`, sub:'複数形', level:'★★☆', hint:'語尾変化・不規則に注意', type:'choice', choices:shuffleArr(arr), ans:p[1], explain:`【考え方】名詞を複数形にする。\n【手順】${p[0]} の複数形は ${p[1]}\n【ポイント】-s/-es、不規則(child→children)に注意。`}; },
  function(){ const subj=pick([['I','am'],['You','are'],['He','is'],['She','is'],['They','are'],['We','are'],['Tom','is']]); return {q:`${subj[0]} (   ) a student.`, sub:'be動詞', level:'★★☆', hint:'主語に合うbe動詞', type:'choice', choices:shuffleArr(['am','is','are','be']), ans:subj[1], explain:`【考え方】主語に合うbe動詞を選ぶ。\n【手順】${subj[0]} のbe動詞は ${subj[1]}\n【ポイント】I→am、you/複数→are、3単数→is。`}; },
  function(){ const p=pick(ENG_PREP_TIME); return {q:`I get up early (   ) ${p[0]}.`, sub:'前置詞（時）', level:'★★★', hint:'in/on/at の使い分け', type:'choice', choices:shuffleArr(['in','on','at','to']), ans:p[1], explain:`【考え方】時を表す前置詞 in/on/at を使い分ける。\n【手順】${p[2]}\n【ポイント】時刻はat、曜日・日付はon、月・季節・年はin。`}; },
  function(){ const pr=pick([['私の','my'],['あなたの','your'],['彼の','his'],['彼女の','her'],['私たちの','our'],['彼らの','their']]); return {q:`This is (   ) bag.（${pr[0]}）`, sub:'代名詞（所有格）', level:'★★★', hint:'名詞の前の形', type:'choice', choices:shuffleArr([pr[1],'the','a','it']), ans:pr[1], explain:`【考え方】名詞の前は所有格。\n【手順】${pr[0]}（名詞の前）は ${pr[1]}\n【ポイント】my/your/his/her/our/their。`}; },
  // ---- 模試レベル追加（目的格・疑問詞・時刻・整序・be/do識別） ----
  function(){ const pr=pick([['彼','him','he','his'],['彼女','her','she','hers'],['彼ら','them','they','their'],['私','me','I','my'],['私たち','us','we','our']]); return {q:`I know (   ) very well.（${pr[0]}を）`, sub:'代名詞（目的格）', level:'★★★', hint:'動詞のあとの形', type:'choice', choices:shuffleArr([pr[1],pr[2],pr[3],'it']), ans:pr[1], explain:`【考え方】動詞の目的語は目的格。\n【手順】「${pr[0]}を」＝${pr[1]}\n【ポイント】I-my-me、he-his-him のように3つの形をセットで覚える。`}; },
  function(){ const w=pick([['Where','do you study','— In my room.','場所'],['When','do you watch TV','— After dinner.','時'],['Who','is that tall boy','— He is my brother.','人'],['What','do you have in your bag','— Two books and a pen.','物'],['How','do you come to school','— By bus.','手段']]); return {q:`(   ) ${w[1]}? ${w[2]}`, sub:'疑問詞の使い分け', level:'★★★', hint:'答えの文から判断（'+w[3]+'）', type:'choice', choices:shuffleArr(['Where','When','Who','What','How'].filter(x=>x!==w[0]).slice(0,3).concat([w[0]])), ans:w[0], explain:`【考え方】答えの内容（${w[3]}）に合う疑問詞を選ぶ。\n【手順】${w[0]} ${w[1]}?\n【ポイント】場所Where・時When・人Who・物What・手段How。`}; },
  function(){ const h=rint(1,12), m=pick([10,15,20,30,40,45,50]); const NUM=['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve']; const MIN={10:'ten',15:'fifteen',20:'twenty',30:'thirty',40:'forty',45:'forty-five',50:'fifty'}; const ok=`It's ${NUM[h]} ${MIN[m]}.`; const cand=[`It's ${MIN[m]} ${NUM[h]}.`, `It's ${NUM[h]} ${MIN[m===15?50:15]}.`, `It's ${NUM[(h%12)+1]} ${MIN[m]}.`, `It's ${NUM[h]} o'clock.`]; const ngs=[]; cand.forEach(function(c){ if(c!==ok && ngs.indexOf(c)<0 && ngs.length<3) ngs.push(c); }); return {q:`時計が「${h}:${String(m).padStart(2,'0')}」のとき、What time is it? の答えは？`, sub:'時刻の表現', level:'★★☆', hint:'時→分の順', type:'choice', choices:shuffleArr([ok].concat(ngs)), ans:ok, explain:`【考え方】時刻は「時→分」の順に読む。\n【手順】${h}:${String(m).padStart(2,'0')}＝${NUM[h]} ${MIN[m]}\n【ポイント】fifteen(15)とfifty(50)の混同に注意。`}; },
  function(){ const s=pick([
    ['私は放課後に図書館で勉強します','I study in the library after school.',['I study after school in the library the.','After school I in the library study.','I in the library study after school.']],
    ['あなたは毎日歩いて学校に行きますか','Do you walk to school every day?',['Are you walk to school every day?','Do you to school walk every day?','You do walk to school every day?']],
    ['私たちは毎週日曜日にテニスをします','We play tennis every Sunday.',['We plays tennis every Sunday.','We tennis play every Sunday.','Every Sunday play we tennis.']],
    ['これはだれのかさですか','Whose umbrella is this?',['Who umbrella is this?','Whose is umbrella this?','Whose this umbrella is?']],
    ['ドアを開けてください','Please open the door.',['Please opens the door.','Please the door open.','You please open the door.']]
  ]); return {q:`正しく並べた文は？（${s[0]}）`, sub:'語順（整序）', level:'★★★', hint:'主語＋動詞を軸に組み立てる', type:'choice', choices:shuffleArr([s[1]].concat(s[2])), ans:s[1], explain:`【考え方】英語は主語＋動詞の順が基本。\n【手順】${s[1]}\n【ポイント】修飾語（場所・時）は文の後ろに置く。`}; },
  function(){ const s=pick([['(   ) you like math?','Do','like（一般動詞）がある'],['(   ) your mother a teacher?','Is','動詞がない（a teacherは名詞）'],['(   ) Ken and Tom brothers?','Are','主語が複数・動詞がない'],['(   ) you a new student?','Are','動詞がない'],['(   ) they play baseball?','Do','play（一般動詞）がある']]); return {q:s[0], sub:'be動詞と一般動詞の区別', level:'★★★', hint:'一般動詞があるか探す', type:'choice', choices:shuffleArr(['Do','Is','Are','Does'].filter(x=>x!==s[1]).slice(0,3).concat([s[1]])), ans:s[1], explain:`【考え方】文中に一般動詞があればDo/Does、なければbe動詞。\n【手順】${s[2]}→${s[1]}\n【ポイント】be動詞とdoは同じ文で併用しない。`}; },
  function(){ const W=[['school','学校'],['friend','友だち'],['breakfast','朝食'],['library','図書館'],['subject','教科'],['weekend','週末'],['buy','買う'],['speak','話す'],['teach','教える'],['visit','訪れる'],['famous','有名な'],['together','いっしょに']]; const w=pick(W); const o=shuffleArr(W.filter(x=>x!==w)).slice(0,3).map(x=>x[1]); return {q:`英単語 "${w[0]}" の意味は？`, sub:'語彙（基本単語）', level:'★☆☆', hint:'英検5級レベルの基本語', type:'choice', choices:shuffleArr([w[1]].concat(o)), ans:w[1], explain:`【考え方】基本単語の意味。\n【手順】${w[0]}＝${w[1]}\n【ポイント】教科書の太字単語は必ず覚える。`}; },
];
// ---- 国語ジェネレーター（語彙プール） ----
const JP_READ = [['日和','ひより'],['風情','ふぜい'],['相殺','そうさい'],['貪欲','どんよく'],['市井','しせい'],['漸次','ぜんじ'],['逐一','ちくいち'],['名残','なごり'],['境内','けいだい'],['流布','るふ'],['会得','えとく'],['出納','すいとう'],['思惑','おもわく'],['遂行','すいこう'],['形相','ぎょうそう'],['由緒','ゆいしょ'],['示唆','しさ'],['言質','げんち']];
const JP_ANTONYM = [['需要','供給'],['主観','客観'],['具体','抽象'],['保守','革新'],['能動','受動'],['原因','結果'],['理想','現実'],['一般','特殊'],['積極','消極'],['楽観','悲観'],['義務','権利'],['全体','部分']];
const JP_YOJI = [['単刀直入','単'],['心機一転','心'],['弱肉強食','弱'],['五里霧中','霧'],['一攫千金','攫'],['異口同音','異'],['我田引水','引'],['四面楚歌','四'],['付和雷同','雷'],['率先垂範','垂']];
const jpGens = [
  function(){ const w=pick(JP_READ); const others=shuffleArr(JP_READ.filter(x=>x!==w)).slice(0,3).map(x=>x[1]); return {q:`「${w[0]}」の読みは？`, sub:'漢字の読み', level:'★★★', hint:'熟語の読み', type:'choice', choices:shuffleArr([w[1],...others]), ans:w[1], explain:`【考え方】熟語の読みを覚える。\n【手順】${w[0]}＝${w[1]}\n【ポイント】音読み・訓読みを意識する。`}; },
  function(){ const w=pick(JP_ANTONYM); const others=shuffleArr(JP_ANTONYM.filter(x=>x!==w)).slice(0,3).map(x=>x[1]); return {q:`「${w[0]}」の対義語は？`, sub:'対義語', level:'★★★', hint:'反対の意味', type:'choice', choices:shuffleArr([w[1],...others]), ans:w[1], explain:`【考え方】反対の意味の語を選ぶ。\n【手順】${w[0]}⇔${w[1]}\n【ポイント】ペアで覚えると語彙が増える。`}; },
  function(){ const w=pick(JP_YOJI); const blanked=w[0].replace(w[1],'□'); const others=shuffleArr(['新','真','信','回','他','背','単','心','水','明'].filter(c=>c!==w[1])).slice(0,3); return {q:`四字熟語「${blanked}」の□に入る漢字は？`, sub:'四字熟語', level:'★★★', hint:'よく使う四字熟語', type:'choice', choices:shuffleArr([w[1],...others]), ans:w[1], explain:`【考え方】□に入る漢字を考える。\n【手順】正しくは ${w[0]}\n【ポイント】意味と一緒に覚える。`}; },
];

// ================= 小学4年生コンテンツ（5教科）=================
// 算数
var g4MathGens=[
 function(){ var b=rint(2,9),q=rint(2,9),a=b*q; return {q:a+' ÷ '+b+' = ?', sub:'わり算', level:'★☆☆', hint:b+'のだんで考える', type:'free', ans:''+q, altAns:[''+q], explain:'【考え方】かけ算の逆。\n【手順】'+b+'×'+q+'='+a+'だから '+a+'÷'+b+'='+q+'\n【ポイント】わり算は九九の逆。'}; },
 function(){ var b=rint(3,9),q=rint(2,9),r=rint(1,b-1),a=b*q+r; return {q:a+' ÷ '+b+' のあまりは？', sub:'あまりのあるわり算', level:'★★☆', hint:b+'×□が'+a+'をこえない最大', type:'free', ans:''+r, altAns:[''+r], explain:'【考え方】わって残りがあまり。\n【手順】'+b+'×'+q+'='+(b*q)+'、'+a+'−'+(b*q)+'='+r+'\n【ポイント】あまりはわる数より小さい。'}; },
 function(){ var x=rint(1000,99999),y=rint(1000,99999); if(x===y)y+=7; return {q:'大きいのはどっち？　'+x+' と '+y, sub:'大きな数', level:'★☆☆', hint:'上の位からくらべる', type:'choice', choices:[''+x,''+y], ans:''+Math.max(x,y), explain:'【考え方】けた数→上の位の順。\n【手順】'+Math.max(x,y)+'の方が大きい\n【ポイント】上の位から1つずつ。'}; },
 function(){ var a=rint(1,40),b=rint(1,40),s2=(a+b)/10; return {q:(a/10).toFixed(1)+' + '+(b/10).toFixed(1)+' = ?', sub:'小数のたし算', level:'★★☆', hint:'0.1のいくつ分', type:'free', ans:s2.toFixed(1), altAns:[s2.toFixed(1),''+s2], explain:'【考え方】0.1がいくつ分で考える。\n【手順】'+a+'+'+b+'='+(a+b)+'（0.1が'+(a+b)+'こ）→'+s2.toFixed(1)+'\n【ポイント】小数点をそろえる。'}; },
 function(){ var a=rint(20,70),b=rint(1,a-1),s2=(a-b)/10; return {q:(a/10).toFixed(1)+' − '+(b/10).toFixed(1)+' = ?', sub:'小数のひき算', level:'★★☆', hint:'位をそろえる', type:'free', ans:s2.toFixed(1), altAns:[s2.toFixed(1),''+s2], explain:'【考え方】0.1のいくつ分。\n【手順】'+a+'−'+b+'='+(a-b)+'→'+s2.toFixed(1)+'\n【ポイント】小数点をそろえる。'}; },
 function(){ var d=rint(4,9),a=rint(1,d-2),b=rint(1,d-a-1); if(b<1)b=1; var n=a+b; return {q:a+'/'+d+' + '+b+'/'+d+' = ?（分子を答えてね。分母は'+d+'）', sub:'分数のたし算', level:'★★☆', hint:'分母そのまま、分子をたす', type:'free', ans:''+n, altAns:[n+'/'+d,''+n], explain:'【考え方】同じ分母は分子をたす。\n【手順】'+a+'+'+b+'='+n+'→'+n+'/'+d+'\n【ポイント】分母は変えない。'}; },
 function(){ var t=pick([['直角',90],['一直線（半回転）',180],['1回転',360]]); return {q:t[0]+'は何度？', sub:'角の大きさ', level:'★☆☆', hint:'直角＝90°', type:'free', ans:''+t[1], altAns:[t[1]+'°',t[1]+'度'], explain:'【考え方】直角90°が基本。\n【手順】'+t[0]+'＝'+t[1]+'°\n【ポイント】直角2つで180°。'}; },
 function(){ var x=rint(20,70); return {q:'直角（90°）から '+x+'° をひくと何度？', sub:'角の計算', level:'★★☆', hint:'90からひく', type:'free', ans:''+(90-x), altAns:[(90-x)+'°'], explain:'【考え方】全体90°からひく。\n【手順】90−'+x+'='+(90-x)+'°\n【ポイント】直角は90°。'}; },
 function(){ var a=rint(3,12),b=rint(3,12); return {q:'たて'+a+'cm・横'+b+'cmの長方形の面積は？（cm²）', sub:'面積（長方形）', level:'★★☆', hint:'たて×横', type:'free', ans:''+(a*b), altAns:[(a*b)+'cm2',(a*b)+'cm²'], explain:'【考え方】長方形＝たて×横。\n【手順】'+a+'×'+b+'='+(a*b)+'cm²\n【ポイント】単位はcm²。'}; },
 function(){ var a=rint(3,12); return {q:'1辺'+a+'cmの正方形の面積は？（cm²）', sub:'面積（正方形）', level:'★★☆', hint:'1辺×1辺', type:'free', ans:''+(a*a), altAns:[(a*a)+'cm2',(a*a)+'cm²'], explain:'【考え方】正方形＝1辺×1辺。\n【手順】'+a+'×'+a+'='+(a*a)+'cm²\n【ポイント】同じ数を2回。'}; },
 function(){ var n=rint(1000,9999),r=Math.round(n/100)*100; return {q:n+' を四捨五入して百の位までのがい数に？', sub:'がい数', level:'★★★', hint:'十の位を四捨五入', type:'free', ans:''+r, altAns:[''+r], explain:'【考え方】十の位を四捨五入。\n【手順】十の位が5以上→切り上げ、4以下→切り捨て→'+r+'\n【ポイント】「百の位まで」は十の位を見る。'}; },
 function(){ var a=rint(2,9),b=rint(2,9),c=rint(2,9); return {q:a+' + '+b+' × '+c+' = ?', sub:'計算のきまり', level:'★★☆', hint:'×を先に', type:'free', ans:''+(a+b*c), altAns:[''+(a+b*c)], explain:'【考え方】×÷が先、＋−が後。\n【手順】'+b+'×'+c+'='+(b*c)+'、'+a+'+'+(b*c)+'='+(a+b*c)+'\n【ポイント】かけ算を先に。'}; },
 function(){ var a=rint(2,9),b=rint(2,9),c=rint(2,9); return {q:'('+a+' + '+b+') × '+c+' = ?', sub:'計算のきまり（かっこ）', level:'★★☆', hint:'かっこの中が先', type:'free', ans:''+((a+b)*c), altAns:[''+((a+b)*c)], explain:'【考え方】かっこを先に。\n【手順】'+a+'+'+b+'='+(a+b)+'、×'+c+'='+((a+b)*c)+'\n【ポイント】( )が最優先。'}; },
 function(){ var b=rint(2,9),k=rint(2,9),a=b*k; return {q:a+'は'+b+'の何倍？', sub:'何倍', level:'★★☆', hint:'わり算でもとめる', type:'free', ans:''+k, altAns:[k+'倍',''+k], explain:'【考え方】何倍＝大きい数÷もとの数。\n【手順】'+a+'÷'+b+'='+k+'→'+k+'倍\n【ポイント】「何倍」はわり算。'}; },
];
// 国語
var G4JP_READ=[['案内','あんない'],['英語','えいご'],['観察','かんさつ'],['協力','きょうりょく'],['健康','けんこう'],['成功','せいこう'],['失敗','しっぱい'],['希望','きぼう'],['結果','けっか'],['季節','きせつ'],['努力','どりょく'],['卒業','そつぎょう'],['辞典','じてん'],['特別','とくべつ']];
var G4JP_ANT=[['成功','失敗'],['勝つ','負ける'],['始め','終わり'],['軽い','重い'],['朝','夜'],['多い','少ない'],['明るい','暗い'],['速い','おそい']];
var G4JP_KOTO=[['ねこに','こばん','とても役に立つものも、ねうちのわからない人には無意味'],['さるも','木からおちる','名人でも失敗することがある'],['いしの','上にも三年','がまん強く続ければ成功する'],['ちりも','つもれば山となる','小さなことも積み重なれば大きくなる']];
var g4JpGens=[
 function(){ var w=pick(G4JP_READ); return {q:'「'+w[0]+'」の読みは？', sub:'漢字の読み（4年）', level:'★☆☆', hint:'声に出してみよう', type:'free', ans:w[1], altAns:[w[1]], explain:'【考え方】4年生の漢字。\n【手順】'+w[0]+'＝'+w[1]+'\n【ポイント】熟語で覚える。'}; },
 function(){ var w=pick(G4JP_ANT); var o=shuffleArr(G4JP_ANT.filter(function(x){return x[0]!==w[0];})).slice(0,3).map(function(x){return x[1];}); return {q:'「'+w[0]+'」の反対の意味は？', sub:'反対のことば', level:'★★☆', hint:'逆の意味', type:'choice', choices:shuffleArr([w[1]].concat(o)), ans:w[1], explain:'【考え方】反対語は対で覚える。\n【手順】'+w[0]+'⇔'+w[1]+'\n【ポイント】セットで暗記。'}; },
 function(){ var k=pick(G4JP_KOTO); var o=shuffleArr(G4JP_KOTO.filter(function(x){return x[1]!==k[1];})).slice(0,3).map(function(x){return x[1];}); return {q:'「'+k[0]+'○○○○」に続くのは？', sub:'ことわざ', level:'★★☆', hint:k[2], type:'choice', choices:shuffleArr([k[1]].concat(o)), ans:k[1], explain:'【考え方】意味から考える。\n【手順】'+k[0]+k[1]+'＝'+k[2]+'\n【ポイント】ことわざは意味ごと覚える。'}; },
 function(){ var d=pick([['本','さつ'],['えんぴつ','本'],['紙','まい'],['rabbit/犬','ひき'],['車','だい'],['花','りん']]); var o=shuffleArr(['さつ','本','まい','ひき','だい','りん'].filter(function(x){return x!==d[1];})).slice(0,3); return {q:'「'+d[0]+'」の数え方は？', sub:'数え方（助数詞）', level:'★★☆', hint:'数えることば', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】ものによって数え方がちがう。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】数え方を覚えよう。'}; },
];
// 理科
var g4SciGens=[
 function(){ var d=pick([['ヘチマの実がなる','夏'],['さくらがさく','春'],['こん虫がたまごで冬をこす','冬'],['木の葉が赤や黄色に色づく','秋']]); var o=shuffleArr(['春','夏','秋','冬'].filter(function(x){return x!==d[1];})).slice(0,3); return {q:d[0]+'のはどの季節？', sub:'季節と生き物', level:'★☆☆', hint:'気温の変化', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】生き物は季節で変わる。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】季節と気温を結びつける。'}; },
 function(){ var d=pick([['1日で気温がいちばん高くなるのは','午後2時ごろ'],['晴れの日の気温の変化は','大きい'],['くもりの日の気温の変化は','小さい']]); var o=shuffleArr(['午後2時ごろ','大きい','小さい','正午','明け方']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'天気と気温', level:'★★☆', hint:'太陽の高さ', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】太陽の高さと気温。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】晴れは変化が大きい。'}; },
 function(){ var d=pick([['水を熱し続けると100℃近くでさかんに','ふっとう'],['水を冷やして0℃で','こおる'],['水が水じょう気に変わることを','じょうはつ']]); var o=shuffleArr(['ふっとう','こおる','じょうはつ','とける']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'する。何という？', sub:'水のすがた', level:'★★☆', hint:'三態の変化', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】水は温度で姿が変わる。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】氷・水・水じょう気。'}; },
 function(){ var d=pick([['かん電池2個を直列につなぐと、モーターは','速くなる'],['かん電池の向きを逆にすると、電流は','逆になる'],['回路に電流を流すのに必要なのは','どう線（つながった輪）']]); var o=shuffleArr(['速くなる','逆になる','どう線（つながった輪）','止まる']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'電気のはたらき', level:'★★☆', hint:'直列／向き', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】電池のつなぎ方で変わる。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】直列は強く、向きで逆。'}; },
 function(){ var d=pick([['月は形を変え、約','1か月','でもとにもどる'],['星の明るさは','明るい星から1等星','とよぶ'],['北の空で動かない星は','北極星','']]); var o=shuffleArr(['1か月','明るい星から1等星','北極星','1週間']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'○○'+d[2]+'。○○は？', sub:'月と星', level:'★★☆', hint:'観察', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】月や星の動き。\n【手順】答え＝'+d[1]+'\n【ポイント】北極星は動かない。'}; },
];
// 社会
var G4_PREF=[['北海道','札幌市'],['青森県','青森市'],['宮城県','仙台市'],['東京都','東京'],['神奈川県','横浜市'],['愛知県','名古屋市'],['大阪府','大阪市'],['兵庫県','神戸市'],['広島県','広島市'],['福岡県','福岡市'],['沖縄県','那覇市'],['香川県','高松市']];
var g4SocGens=[
 function(){ var p=pick(G4_PREF); var o=shuffleArr(G4_PREF.filter(function(x){return x[0]!==p[0];})).slice(0,3).map(function(x){return x[1];}); return {q:'「'+p[0]+'」の県庁所在地は？', sub:'都道府県と県庁所在地', level:'★★☆', hint:'地図で確認', type:'choice', choices:shuffleArr([p[1]].concat(o)), ans:p[1], explain:'【考え方】県名と県庁所在地。\n【手順】'+p[0]+'→'+p[1]+'\n【ポイント】ちがう名前に注意。'}; },
 function(){ var d=pick([['北を向くと右手の方角は','東'],['太陽がのぼる方角は','東'],['太陽がしずむ方角は','西'],['地図で上はふつう','北']]); var o=shuffleArr(['東','西','南','北']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'方位', level:'★☆☆', hint:'東西南北', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】方位の基本。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】地図の上は北。'}; },
 function(){ var d=pick([['使った水をきれいにする所は','下水しょり場'],['飲み水をつくる所は','じょう水場'],['ごみを燃やす所は','せいそう工場（焼きゃく場）']]); var o=shuffleArr(['下水しょり場','じょう水場','せいそう工場（焼きゃく場）','ダム']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'くらしと水・ごみ', level:'★★☆', hint:'公共のしせつ', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】くらしを支えるしせつ。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】水とごみの流れ。'}; },
];
// 英語（小学英語）
var G4ENG=[['犬','dog'],['ねこ','cat'],['赤','red'],['青','blue'],['1','one'],['3','three'],['月曜日','Monday'],['りんご','apple'],['本','book'],['water','水']];
var g4EngGens=[
 function(){ var w=pick([['犬','dog'],['ねこ','cat'],['とり','bird'],['りんご','apple'],['本','book'],['水','water']]); var o=shuffleArr(['dog','cat','bird','apple','book','water']).filter(function(x){return x!==w[1];}).slice(0,3); return {q:'「'+w[0]+'」を英語で？', sub:'英語（単語）', level:'★☆☆', hint:'音で覚えよう', type:'choice', choices:shuffleArr([w[1]].concat(o)), ans:w[1], explain:'【考え方】身近な単語。\n【手順】'+w[0]+'＝'+w[1]+'\n【ポイント】声に出して覚える。'}; },
 function(){ var n=pick([['1','one'],['2','two'],['3','three'],['4','four'],['5','five']]); var o=shuffleArr(['one','two','three','four','five']).filter(function(x){return x!==n[1];}).slice(0,3); return {q:'数字「'+n[0]+'」を英語で？', sub:'英語（数）', level:'★☆☆', hint:'1〜5', type:'choice', choices:shuffleArr([n[1]].concat(o)), ans:n[1], explain:'【考え方】数の英語。\n【手順】'+n[0]+'＝'+n[1]+'\n【ポイント】1〜10を覚えよう。'}; },
 function(){ var c=pick([['赤','red'],['青','blue'],['黄','yellow'],['緑','green'],['白','white']]); var o=shuffleArr(['red','blue','yellow','green','white']).filter(function(x){return x!==c[1];}).slice(0,3); return {q:'色「'+c[0]+'」を英語で？', sub:'英語（色）', level:'★☆☆', hint:'color', type:'choice', choices:shuffleArr([c[1]].concat(o)), ans:c[1], explain:'【考え方】色の英語。\n【手順】'+c[0]+'＝'+c[1]+'\n【ポイント】身近な色から。'}; },
 function(){ var g=pick([['おはよう','Good morning'],['ありがとう','Thank you'],['さようなら','Goodbye'],['はじめまして','Nice to meet you']]); var o=shuffleArr(['Good morning','Thank you','Goodbye','Nice to meet you']).filter(function(x){return x!==g[1];}).slice(0,3); return {q:'「'+g[0]+'」を英語で？', sub:'英語（あいさつ）', level:'★★☆', hint:'あいさつ', type:'choice', choices:shuffleArr([g[1]].concat(o)), ans:g[1], explain:'【考え方】あいさつの英語。\n【手順】'+g[0]+'＝'+g[1]+'\n【ポイント】会話の基本。'}; },
];

// ---- 小4 ブラッシュアップ：単元・問題数を追加 ----
g4MathGens = g4MathGens.concat([
 function(){ var a=rint(2,9),b=rint(1,9),c=rint(1,9); var n=a*10000+b*1000+c*100; return {q:'10000を'+a+'こ、1000を'+b+'こ、100を'+c+'こあわせた数は？', sub:'大きな数のしくみ', level:'★★☆', hint:'位ごとにたす', type:'free', ans:''+n, altAns:[''+n], explain:'【考え方】位ごとに数えてたす。\n【手順】'+(a*10000)+'+'+(b*1000)+'+'+(c*100)+'='+n+'\n【ポイント】位をそろえる。'}; },
 function(){ var b=rint(3,9),q=rint(23,138),a=b*q; return {q:a+' ÷ '+b+' = ?', sub:'わり算の筆算', level:'★★☆', hint:'大きい位から順に', type:'free', ans:''+q, altAns:[''+q], explain:'【考え方】上の位から順にわる。\n【手順】'+a+'÷'+b+'='+q+'\n【ポイント】筆算は位をそろえて。'}; },
 function(){ var c=rint(2,99); return {q:'0.01 を '+c+'こ あつめた数は？', sub:'小数のしくみ', level:'★★☆', hint:'0.01が100こで1', type:'free', ans:(c/100).toFixed(2), altAns:[(c/100).toFixed(2),''+(c/100)], explain:'【考え方】0.01のいくつ分。\n【手順】0.01×'+c+'='+(c/100).toFixed(2)+'\n【ポイント】小数第二位まで。'}; },
 function(){ var a=rint(2,9),b=rint(2,6); var p=(a*b)/10; return {q:(a/10).toFixed(1)+' × '+b+' = ?', sub:'小数×整数', level:'★★☆', hint:'0.1のいくつ分', type:'free', ans:p.toFixed(1), altAns:[p.toFixed(1),''+p], explain:'【考え方】0.1が（'+a+'×'+b+'）こ。\n【手順】'+a+'×'+b+'='+(a*b)+'→'+p.toFixed(1)+'\n【ポイント】小数点の位置に注意。'}; },
 function(){ var d=rint(4,9),a=rint(1,d-1),b=rint(1,d-1); if(a===b){ b=(b%(d-1))+1; } var big=(a>b)?a:b; return {q:a+'/'+d+' と '+b+'/'+d+'、大きいのは？', sub:'分数の大小', level:'★☆☆', hint:'分母が同じなら分子で', type:'choice', choices:[a+'/'+d, b+'/'+d], ans:big+'/'+d, explain:'【考え方】分母が同じなら分子が大きい方。\n【手順】'+big+'/'+d+'が大きい\n【ポイント】分母同じ→分子くらべ。'}; },
 function(){ var w=rint(1,4),d=rint(3,5),f=rint(1,d-1); var n=w*d+f; return {q:w+'と'+f+'/'+d+' を仮分数にすると □/'+d+'。□は？', sub:'帯分数→仮分数', level:'★★★', hint:'整数×分母＋分子', type:'free', ans:''+n, altAns:[''+n,n+'/'+d], explain:'【考え方】整数部×分母＋分子。\n【手順】'+w+'×'+d+'+'+f+'='+n+'\n【ポイント】分母はそのまま。'}; },
 function(){ var a=rint(3,12),b=rint(3,12); return {q:'たて'+a+'cm・横'+b+'cmの長方形の、まわりの長さは？（cm）', sub:'まわりの長さ', level:'★★☆', hint:'(たて＋横)×2', type:'free', ans:''+(2*(a+b)), altAns:[(2*(a+b))+'cm'], explain:'【考え方】まわり＝(たて＋横)×2。\n【手順】('+a+'+'+b+')×2='+(2*(a+b))+'cm\n【ポイント】4つの辺の合計。'}; },
 function(){ var d=pick([['面の数',6],['辺の数',12],['頂点の数',8]]); return {q:'直方体の'+d[0]+'は？', sub:'直方体', level:'★★☆', hint:'箱を思いうかべて', type:'free', ans:''+d[1], altAns:[''+d[1]], explain:'【考え方】直方体は面6・辺12・頂点8。\n【手順】'+d[0]+'＝'+d[1]+'\n【ポイント】数えて確かめる。'}; },
 function(){ var t=pick([['2本の直線が直角に交わっている','垂直'],['2本の直線がどこまでも交わらない','平行']]); return {q:t[0]+'。これを何という？', sub:'垂直と平行', level:'★★☆', hint:'直角／交わらない', type:'choice', choices:['垂直','平行'], ans:t[1], explain:'【考え方】直角＝垂直、交わらない＝平行。\n【手順】'+t[0]+'→'+t[1]+'\n【ポイント】記号でも表す。'}; },
 function(){ var f=pick([['4つの角が直角で4つの辺が等しい','正方形'],['4つの角が直角の','長方形'],['向かい合う2組の辺が平行な','平行四辺形'],['4つの辺が等しい','ひし形']]); var o=shuffleArr(['正方形','長方形','平行四辺形','ひし形']).filter(function(x){return x!==f[1];}).slice(0,3); return {q:f[0]+'四角形は？', sub:'四角形', level:'★★☆', hint:'辺と角に注目', type:'choice', choices:shuffleArr([f[1]].concat(o)), ans:f[1], explain:'【考え方】辺と角の特ちょうで決まる。\n【手順】'+f[0]+'四角形→'+f[1]+'\n【ポイント】定義を覚える。'}; },
 function(){ var x=rint(2,19),y=rint(2,9); return {q:'□ + '+x+' = '+(x+y)+'　□は？', sub:'□を使った式', level:'★★☆', hint:'ひき算でもとめる', type:'free', ans:''+y, altAns:[''+y], explain:'【考え方】□＝合計−わかっている数。\n【手順】'+(x+y)+'−'+x+'='+y+'\n【ポイント】逆算する。'}; },
 function(){ var y=rint(2,9),k=rint(2,9); return {q:'□ × '+k+' = '+(y*k)+'　□は？', sub:'□を使った式', level:'★★☆', hint:'わり算でもとめる', type:'free', ans:''+y, altAns:[''+y], explain:'【考え方】□＝積÷かける数。\n【手順】'+(y*k)+'÷'+k+'='+y+'\n【ポイント】逆算する。'}; },
 function(){ var b=rint(2,8),q=rint(2,9),a=b*q,c=rint(2,9); return {q:a+' ÷ '+b+' + '+c+' = ?', sub:'計算の順序', level:'★★☆', hint:'÷を先に', type:'free', ans:''+(q+c), altAns:[''+(q+c)], explain:'【考え方】×÷が先、＋−が後。\n【手順】'+a+'÷'+b+'='+q+'、+'+c+'='+(q+c)+'\n【ポイント】わり算を先に。'}; },
 function(){ var data=[['9時',rint(8,14)],['12時',rint(16,24)],['15時',rint(15,23)],['18時',rint(10,16)]]; var mx=data.slice().sort(function(p,q){return q[1]-p[1];})[0]; return {q:'気温の記録… '+data.map(function(x){return x[0]+'='+x[1]+'℃';}).join('、')+'。いちばん高いのは？', sub:'折れ線グラフ・表', level:'★★☆', hint:'数をくらべる', type:'choice', choices:data.map(function(x){return x[0];}), ans:mx[0], explain:'【考え方】表やグラフは数を読み取る。\n【手順】いちばん大きいのは'+mx[0]+'（'+mx[1]+'℃）\n【ポイント】変化は折れ線で。'}; },
]);

// ---- 小5-6：分数の四則（異分母加減・約分・通分・分数×÷）＝いちばん手薄だった山を補強 ----
function _gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ var t=b; b=a%b; a=t; } return a||1; }
// 分数 n/d を約分して「n/d」か整数の文字列に（d=1なら整数）
function _fracStr(n,d){ var g=_gcd(n,d); n/=g; d/=g; return d===1 ? (''+n) : (n+'/'+d); }
g4MathGens = g4MathGens.concat([
 // 約分
 function(){ var g=rint(2,6), a=rint(1,5), b=rint(a+1,7); if(_gcd(a,b)!==1){ b=a+1; } var n=a*g, d=b*g; return {q:n+'/'+d+' を これ以上 約分できないところまで 約分すると？', sub:'約分', level:'★★☆', hint:'分母と分子を 同じ数で わる', type:'free', ans:a+'/'+b, altAns:[a+'/'+b], explain:'【考え方】分母と分子の 最大公約数で わる。\n【手順】'+n+'と'+d+'を '+g+'で わって '+a+'/'+b+'\n【ポイント】これ以上われない形が答え。'}; },
 // 異分母のたし算（分母は倍数関係でやさしめ）
 function(){ var b=rint(2,5), k=rint(2,4), d=b*k, a=rint(1,b-1), c=rint(1,d-1); var n1=a*k, sum=n1+c; if(sum>=d){ c=1; sum=n1+1; } var ans=_fracStr(sum,d); return {q:a+'/'+b+' + '+c+'/'+d+' = ?', sub:'分数のたし算（異分母）', level:'★★★', hint:'分母を '+d+' にそろえる（通分）', type:'free', ans:ans, altAns:[ans,sum+'/'+d], explain:'【考え方】分母をそろえて（通分）から たす。\n【手順】'+a+'/'+b+'='+n1+'/'+d+'、'+n1+'/'+d+'+'+c+'/'+d+'='+sum+'/'+d+'→'+ans+'\n【ポイント】通分してから 分子をたす。'}; },
 // 異分母のひき算
 function(){ var b=rint(2,5), k=rint(2,4), d=b*k, a=rint(1,b-1), n1=a*k, c=rint(1,n1-1), dif=n1-c; var ans=_fracStr(dif,d); return {q:a+'/'+b+' − '+c+'/'+d+' = ?', sub:'分数のひき算（異分母）', level:'★★★', hint:'分母を '+d+' にそろえる', type:'free', ans:ans, altAns:[ans,dif+'/'+d], explain:'【考え方】通分してから ひく。\n【手順】'+a+'/'+b+'='+n1+'/'+d+'、'+n1+'/'+d+'−'+c+'/'+d+'='+dif+'/'+d+'→'+ans+'\n【ポイント】分母をそろえて 分子をひく。'}; },
 // 分数×整数
 function(){ var b=rint(3,7), a=rint(1,b-1), m=rint(2,5); var ans=_fracStr(a*m,b); return {q:a+'/'+b+' × '+m+' = ?', sub:'分数×整数', level:'★★★', hint:'分子に かける', type:'free', ans:ans, altAns:[ans,(a*m)+'/'+b], explain:'【考え方】分子に整数をかける。\n【手順】('+a+'×'+m+')/'+b+'='+(a*m)+'/'+b+'→'+ans+'\n【ポイント】分母はそのまま。'}; },
 // 分数÷整数
 function(){ var b=rint(2,5), a=rint(1,b-1), m=rint(2,4); var ans=_fracStr(a,b*m); return {q:a+'/'+b+' ÷ '+m+' = ?', sub:'分数÷整数', level:'★★★', hint:'分母に かける', type:'free', ans:ans, altAns:[ans,a+'/'+(b*m)], explain:'【考え方】÷整数は 分母にかける。\n【手順】'+a+'/('+b+'×'+m+')='+a+'/'+(b*m)+'→'+ans+'\n【ポイント】分子はそのまま、分母に。'}; },
 // 分数×分数
 function(){ var b=rint(2,5), a=rint(1,b-1), d=rint(2,5), c=rint(1,d-1); var ans=_fracStr(a*c,b*d); return {q:a+'/'+b+' × '+c+'/'+d+' = ?', sub:'分数×分数', level:'★★★', hint:'分子×分子／分母×分母', type:'free', ans:ans, altAns:[ans,(a*c)+'/'+(b*d)], explain:'【考え方】分子どうし・分母どうしを かける。\n【手順】('+a+'×'+c+')/('+b+'×'+d+')='+(a*c)+'/'+(b*d)+'→'+ans+'\n【ポイント】さいごに 約分。'}; },
 // 分数÷分数（逆数をかける）
 function(){ var b=rint(2,5), a=rint(1,b-1), d=rint(2,5), c=rint(1,d-1); var ans=_fracStr(a*d,b*c); return {q:a+'/'+b+' ÷ '+c+'/'+d+' = ?', sub:'分数÷分数', level:'★★★', hint:'わる分数を ひっくり返して かける', type:'free', ans:ans, altAns:[ans,(a*d)+'/'+(b*c)], explain:'【考え方】÷分数は 逆数をかける。\n【手順】'+a+'/'+b+' × '+d+'/'+c+' =('+a+'×'+d+')/('+b+'×'+c+')='+(a*d)+'/'+(b*c)+'→'+ans+'\n【ポイント】ひっくり返して かける。'}; },
 // 通分（共通の分母を答える）
 function(){ var b=rint(2,6), d=rint(2,6); while(d===b){ d=rint(2,6); } var lcm=b*d/_gcd(b,d); return {q:'1/'+b+' と 1/'+d+' を 通分すると、共通の分母は？', sub:'通分', level:'★★☆', hint:'分母の 最小公倍数', type:'free', ans:''+lcm, altAns:[''+lcm], explain:'【考え方】通分の分母は 最小公倍数。\n【手順】'+b+'と'+d+'の最小公倍数は '+lcm+'\n【ポイント】そろえた分母で くらべ・計算。'}; },
]);
g4JpGens = g4JpGens.concat([
 function(){ var w=pick([['あんない','案内'],['えいご','英語'],['きぼう','希望'],['けっか','結果'],['せいこう','成功'],['きょうりょく','協力'],['かんさつ','観察'],['けんこう','健康']]); var o=shuffleArr(['案内','英語','希望','結果','成功','協力','観察','健康']).filter(function(x){return x!==w[1];}).slice(0,3); return {q:'「'+w[0]+'」を漢字で書くと？', sub:'漢字の書き（4年）', level:'★★☆', hint:'意味から', type:'choice', choices:shuffleArr([w[1]].concat(o)), ans:w[1], explain:'【考え方】読みと意味から選ぶ。\n【手順】'+w[0]+'＝'+w[1]+'\n【ポイント】書いて覚える。'}; },
 function(){ var k=pick([['顔が広い','顔','知り合いが多い'],['首を長くする','首','今かと待つ'],['手をやく','手','てこずる'],['目が高い','目','よい物を見分ける']]); var o=shuffleArr(['顔','首','手','目','耳','口']).filter(function(x){return x!==k[1];}).slice(0,3); return {q:'「'+k[0].replace(k[1],'□')+'」＝'+k[2]+'。□は体のどこ？', sub:'慣用句', level:'★★★', hint:k[2], type:'choice', choices:shuffleArr([k[1]].concat(o)), ans:k[1], explain:'【考え方】意味から考える。\n【手順】'+k[0]+'＝'+k[2]+'\n【ポイント】意味ごと覚える。'}; },
 function(){ var s2=pick([['弟が','遊ぶ'],['花が','さいた'],['犬が','ほえる'],['空が','青い']]); var which=pick([['主語',0],['述語',1]]); var ans=s2[which[1]]; var pool=['弟が','遊ぶ','花が','さいた','犬が','ほえる','空が','青い']; var o=shuffleArr(pool.filter(function(x){return x!==ans;})).slice(0,3); return {q:'「'+s2[0]+'　'+s2[1]+'。」の'+which[0]+'は？', sub:'主語・述語', level:'★★☆', hint:'何が＝主語、どうする＝述語', type:'choice', choices:shuffleArr([ans].concat(o)), ans:ans, explain:'【考え方】主語＝何が、述語＝どうする。\n【手順】'+which[0]+'は「'+ans+'」\n【ポイント】文の骨組み。'}; },
 function(){ var r=pick([['neko','ねこ'],['sakura','さくら'],['inu','いぬ'],['yama','やま'],['mizu','みず'],['hon','ほん']]); var o=shuffleArr(['ねこ','さくら','いぬ','やま','みず','ほん']).filter(function(x){return x!==r[1];}).slice(0,3); return {q:'ローマ字「'+r[0]+'」の読みは？', sub:'ローマ字', level:'★★☆', hint:'子音＋母音', type:'choice', choices:shuffleArr([r[1]].concat(o)), ans:r[1], explain:'【考え方】子音＋母音で読む。\n【手順】'+r[0]+'＝'+r[1]+'\n【ポイント】a i u e o。'}; },
 function(){ var w=pick([['あたらしい','新しい'],['たのしい','楽しい'],['つよい','強い'],['よわい','弱い'],['ふかい','深い']]); var o=shuffleArr(['新しい','楽しい','強い','弱い','深い']).filter(function(x){return x!==w[1];}).slice(0,3); return {q:'「'+w[0]+'」を漢字と送りがなで正しく書くと？', sub:'送りがな', level:'★★☆', hint:'送りがなに注意', type:'choice', choices:shuffleArr([w[1]].concat(o)), ans:w[1], explain:'【考え方】送りがなまで正しく。\n【手順】'+w[0]+'＝'+w[1]+'\n【ポイント】活用部を送る。'}; },
]);
g4SciGens = g4SciGens.concat([
 function(){ var d=pick([['うでを曲げのばしできる、ほねのつなぎ目を','関節'],['ちぢんだりゆるんだりして体を動かすのは','きん肉'],['体をささえるかたいものを','ほね']]); var o=shuffleArr(['関節','きん肉','ほね']).filter(function(x){return x!==d[1];}); return {q:d[0]+'何という？', sub:'体のつくりと運動', level:'★★☆', hint:'ほね・きん肉・関節', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】体は骨・きん肉・関節で動く。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】関節で曲がる。'}; },
 function(){ var d=pick([['とじこめた空気をおすと、体積は','小さくなる'],['とじこめた水をおすと、体積は','変わらない'],['おした空気はもとにもどろうと','おし返す']]); var o=shuffleArr(['小さくなる','変わらない','おし返す','大きくなる']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'とじこめた空気と水', level:'★★☆', hint:'空気は縮む、水は縮まない', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】空気は縮む、水は縮まない。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】体積の変化のちがい。'}; },
 function(){ var d=pick([['金属は熱した所から順に','伝わってあたたまる'],['水や空気はあたたまった部分が','上へ動く'],['温めると体積がいちばん大きく変わるのは','空気']]); var o=shuffleArr(['伝わってあたたまる','上へ動く','空気','水']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'もののあたたまり方', level:'★★★', hint:'金属＝順に、水空気＝動く', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】金属は順に、水空気は動いて。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】温度で体積も変わる。'}; },
 function(){ var d=pick([['夏の大三角は ベガ・デネブと','アルタイル'],['オリオン座がよく見える季節は','冬'],['いちばん明るい星は','1等星']]); var o=shuffleArr(['アルタイル','冬','1等星','夏']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'星と星座', level:'★★☆', hint:'観察', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】星座と季節。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】夏＝大三角、冬＝オリオン。'}; },
]);
g4SocGens = g4SocGens.concat([
 function(){ var m=pick([['文','学校'],['卍','寺'],['鳥居の形','神社'],['工場（歯車）','工場'],['田','田んぼ']]); var o=shuffleArr(['学校','寺','神社','工場','田んぼ','病院']).filter(function(x){return x!==m[1];}).slice(0,3); return {q:'地図記号「'+m[0]+'」が表すのは？', sub:'地図記号', level:'★★☆', hint:'形の由来から', type:'choice', choices:shuffleArr([m[1]].concat(o)), ans:m[1], explain:'【考え方】記号は形に意味。\n【手順】'+m[0]+'→'+m[1]+'\n【ポイント】由来で覚える。'}; },
 function(){ var d=pick([['東京都は','関東地方'],['大阪府は','近畿地方'],['愛知県は','中部地方'],['福岡県は','九州地方']]); var o=shuffleArr(['関東地方','近畿地方','中部地方','九州地方','東北地方']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'何地方？', sub:'地方区分', level:'★★☆', hint:'日本を地方に分ける', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】地方の位置。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】地方区分を覚える。'}; },
 function(){ var d=pick([['火事のとき電話するのは','119番'],['事件・事故のとき電話するのは','110番'],['日本の都道府県の数は','47']]); var o=shuffleArr(['119番','110番','47','100番']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'くらしの安全・都道府県', level:'★☆☆', hint:'覚えておこう', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】基本の数字。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】119＝消防、110＝警察。'}; },
 function(){ var d=pick([['北と東の間は','北東'],['南と西の間は','南西'],['北と西の間は','北西'],['南と東の間は','南東']]); var o=shuffleArr(['北東','南西','北西','南東']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:'八方位で'+d[0]+'？', sub:'八方位', level:'★★☆', hint:'4方位の間', type:'choice', choices:shuffleArr([d[1]].concat(o)), ans:d[1], explain:'【考え方】4方位の間が八方位。\n【手順】'+d[0]+'→'+d[1]+'\n【ポイント】北東・南東・南西・北西。'}; },
]);
g4EngGens = g4EngGens.concat([
 function(){ var w=pick([['月曜日','Monday'],['火曜日','Tuesday'],['水曜日','Wednesday'],['木曜日','Thursday'],['金曜日','Friday'],['土曜日','Saturday'],['日曜日','Sunday']]); var o=shuffleArr(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']).filter(function(x){return x!==w[1];}).slice(0,3); return {q:'「'+w[0]+'」を英語で？', sub:'英語（曜日）', level:'★★☆', hint:'-day がつく', type:'choice', choices:shuffleArr([w[1]].concat(o)), ans:w[1], explain:'【考え方】曜日の英語。\n【手順】'+w[0]+'＝'+w[1]+'\n【ポイント】語尾は -day。'}; },
 function(){ var w=pick([['ライオン','lion'],['とり','bird'],['さかな','fish'],['うさぎ','rabbit'],['ぞう','elephant']]); var o=shuffleArr(['lion','bird','fish','rabbit','elephant']).filter(function(x){return x!==w[1];}).slice(0,3); return {q:'動物「'+w[0]+'」を英語で？', sub:'英語（動物）', level:'★☆☆', hint:'animal', type:'choice', choices:shuffleArr([w[1]].concat(o)), ans:w[1], explain:'【考え方】身近な動物。\n【手順】'+w[0]+'＝'+w[1]+'\n【ポイント】声に出そう。'}; },
 function(){ var w=pick([['バナナ','banana'],['オレンジ','orange'],['たまご','egg'],['牛乳','milk'],['パン','bread']]); var o=shuffleArr(['banana','orange','egg','milk','bread']).filter(function(x){return x!==w[1];}).slice(0,3); return {q:'食べ物「'+w[0]+'」を英語で？', sub:'英語（食べ物）', level:'★☆☆', hint:'food', type:'choice', choices:shuffleArr([w[1]].concat(o)), ans:w[1], explain:'【考え方】身近な食べ物。\n【手順】'+w[0]+'＝'+w[1]+'\n【ポイント】よく使う単語。'}; },
 function(){ var w=pick([['6','six'],['7','seven'],['8','eight'],['9','nine'],['10','ten']]); var o=shuffleArr(['six','seven','eight','nine','ten']).filter(function(x){return x!==w[1];}).slice(0,3); return {q:'数字「'+w[0]+'」を英語で？', sub:'英語（数6-10）', level:'★☆☆', hint:'6〜10', type:'choice', choices:shuffleArr([w[1]].concat(o)), ans:w[1], explain:'【考え方】数の英語。\n【手順】'+w[0]+'＝'+w[1]+'\n【ポイント】1〜10を完ぺきに。'}; },
 function(){ var w=pick([['晴れ','sunny'],['雨','rainy'],['くもり','cloudy'],['雪','snowy']]); var o=shuffleArr(['sunny','rainy','cloudy','snowy']).filter(function(x){return x!==w[1];}).slice(0,3); return {q:'天気「'+w[0]+'」を英語で？', sub:'英語（天気）', level:'★★☆', hint:'weather', type:'choice', choices:shuffleArr([w[1]].concat(o)), ans:w[1], explain:'【考え方】天気の英語。\n【手順】'+w[0]+'＝'+w[1]+'\n【ポイント】-y がつく形。'}; },
]);

// ---- 小4英語 模試レベル強化（Let's Try!2の全単元＋英検Jr.ゴールド〜英検5級入口レベル）----
// 単語当てだけでなく「文・会話・語順・時刻・小文字」で差がつく出題にする
g4EngGens = g4EngGens.concat([
 // 大文字⇔小文字（Let's Try!2 Unit6：小文字）
 function(){ var A='ABCDEFGHIJKLMNOPQRSTUVWXYZ', i=rint(0,25); var big=A[i], sml=big.toLowerCase(); var o=shuffleArr(A.toLowerCase().split('').filter(function(x){return x!==sml;})).slice(0,3); return {q:'大文字「'+big+'」の小文字は？', sub:'英語（小文字）', level:'★★☆', hint:'形がにているものも', type:'choice', choices:shuffleArr([sml].concat(o)), ans:sml, explain:'【考え方】大文字と小文字の対応。\n【手順】'+big+' → '+sml+'\n【ポイント】b/d、p/qなど形のにた文字に注意。'}; },
 // 辞書順（間の文字）
 function(){ var A='ABCDEFGHIJKLMNOPQRSTUVWXYZ', i=rint(1,24); var mid=A[i]; var o=shuffleArr(A.split('').filter(function(x){return x!==mid;})).slice(0,3); return {q:'アルファベット順で「'+A[i-1]+'」と「'+A[i+1]+'」の間の文字は？', sub:'英語（アルファベット順）', level:'★★★', hint:'A〜Zを声に出して', type:'choice', choices:shuffleArr([mid].concat(o)), ans:mid, explain:'【考え方】アルファベットの並び順。\n【手順】'+A[i-1]+'→'+mid+'→'+A[i+1]+'\n【ポイント】順番をリズムで覚える。'}; },
 // 時刻（Let's Try!2 Unit4：What time is it?）
 function(){ var h=rint(1,12); var NUM=['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve']; var half=Math.random()<0.5; var ok=half?("It's "+NUM[h]+" thirty."):("It's "+NUM[h]+" o'clock."); var disp=half?(h+':30'):(h+':00'); var ng=[half?("It's "+NUM[h]+" o'clock."):("It's "+NUM[h]+" thirty."), "It's "+NUM[(h%12)+1]+(half?" thirty.":" o'clock."), "It's "+NUM[(h+1)%12+1]+" o'clock."]; return {q:'時計が「'+disp+'」のとき What time is it? の答えは？', sub:'英語（時刻）', level:'★★★', hint:'30分はthirty', type:'choice', choices:shuffleArr([ok].concat(ng)), ans:ok, explain:'【考え方】時→分の順で読む。\n【手順】'+disp+'＝'+ok+'\n【ポイント】ちょうど＝o\'clock、30分＝thirty。'}; },
 // 曜日の順序（あした・きのう）
 function(){ var D=[['日曜日','Sunday'],['月曜日','Monday'],['火曜日','Tuesday'],['水曜日','Wednesday'],['木曜日','Thursday'],['金曜日','Friday'],['土曜日','Saturday']]; var i=rint(0,6); var tomorrow=Math.random()<0.5; var base=D[i], ansD=tomorrow?D[(i+1)%7]:D[(i+6)%7]; var o=shuffleArr(D.filter(function(x){return x!==ansD;})).slice(0,3).map(function(x){return x[1];}); return {q:'今日は'+base[0]+'（'+base[1]+'）。'+(tomorrow?'明日':'昨日')+'は英語で？', sub:'英語（曜日の順）', level:'★★★', hint:'曜日の順番を思い出そう', type:'choice', choices:shuffleArr([ansD[1]].concat(o)), ans:ansD[1], explain:'【考え方】曜日の順番。\n【手順】'+base[0]+'の'+(tomorrow?'次':'前')+'は'+ansD[0]+'＝'+ansD[1]+'\n【ポイント】Sun→Mon→Tue→Wed→Thu→Fri→Sat。'}; },
 // 会話の応答（Let's Try! の定番表現）
 function(){ var c=pick([
   ['How are you?','I\'m fine, thank you.',['I\'m ten years old.','It\'s sunny.','My name is Ken.']],
   ['What\'s your name?','My name is Ken.',['I\'m fine.','It\'s Monday.','Yes, I do.']],
   ['How old are you?','I\'m ten years old.',['I\'m fine, thank you.','It\'s ten o\'clock.','I like ten.']],
   ['What do you want?','I want a new cap.',['I\'m from Japan.','You\'re welcome.','See you.']],
   ['How\'s the weather?','It\'s sunny.',['It\'s Tuesday.','I\'m sunny.','Yes, it is.']],
   ['Do you like dogs?','Yes, I do.',['Yes, I am.','No, I am.','It\'s a dog.']]
 ]); return {q:'「'+c[0]+'」と聞かれたときの答えは？', sub:'英語（会話の応答）', level:'★★★', hint:'何を聞かれているかな', type:'choice', choices:shuffleArr([c[1]].concat(c[2])), ans:c[1], explain:'【考え方】質問の意味に合う答えを選ぶ。\n【手順】'+c[0]+' → '+c[1]+'\n【ポイント】How old＝年れい、weather＝天気、Do you〜?はYes, I do.'}; },
 // 語順（3〜4語の文）
 function(){ var s=pick([
   ['ぼくはサッカーが好きです','I like soccer.',['Like I soccer.','Soccer like I.','I soccer like.']],
   ['これは私のえんぴつです','This is my pencil.',['This my is pencil.','Is this my pencil.','My pencil this is.']],
   ['私は新しい自転車がほしいです','I want a new bike.',['I want new a bike.','I a new bike want.','Want I a new bike.']],
   ['私はりんごを3つ持っています','I have three apples.',['I three have apples.','Have I three apples.','I apples have three.']]
 ]); return {q:'正しい英語の文は？（'+s[0]+'）', sub:'英語（語順）', level:'★★★', hint:'「だれが」「どうする」の順', type:'choice', choices:shuffleArr([s[1]].concat(s[2])), ans:s[1], explain:'【考え方】英語は「だれが→どうする→なにを」の順。\n【手順】'+s[1]+'\n【ポイント】日本語と順番がちがうことに注意。'}; },
 // 数 11〜20
 function(){ var N=[['11','eleven'],['12','twelve'],['13','thirteen'],['14','fourteen'],['15','fifteen'],['16','sixteen'],['17','seventeen'],['18','eighteen'],['19','nineteen'],['20','twenty']]; var n=pick(N); var o=shuffleArr(N.filter(function(x){return x!==n;})).slice(0,3).map(function(x){return x[1];}); return {q:'数字「'+n[0]+'」を英語で？', sub:'英語（数11-20）', level:'★★☆', hint:'-teenがつく数', type:'choice', choices:shuffleArr([n[1]].concat(o)), ans:n[1], explain:'【考え方】11〜20の英語。\n【手順】'+n[0]+'＝'+n[1]+'\n【ポイント】13〜19は-teen。'}; },
 // 数 10〜90（十のくらい）
 function(){ var N=[['20','twenty'],['30','thirty'],['40','forty'],['50','fifty'],['60','sixty'],['70','seventy'],['80','eighty'],['90','ninety']]; var n=pick(N); var teen={'20':'twelve','30':'thirteen','40':'fourteen','50':'fifteen','60':'sixteen','70':'seventeen','80':'eighteen','90':'nineteen'}[n[0]]; var o=shuffleArr(N.filter(function(x){return x!==n;})).slice(0,2).map(function(x){return x[1];}).concat([teen]); return {q:'数字「'+n[0]+'」を英語で？', sub:'英語（数10とび）', level:'★★★', hint:'-tyがつく数。-teenとまちがえない', type:'choice', choices:shuffleArr([n[1]].concat(o)), ans:n[1], explain:'【考え方】十のくらいの数は-ty。\n【手順】'+n[0]+'＝'+n[1]+'\n【ポイント】fifteen(15)とfifty(50)のようにまぎらわしい数に注意。'}; },
 // 月
 function(){ var M=[['1月','January'],['2月','February'],['3月','March'],['4月','April'],['5月','May'],['6月','June'],['7月','July'],['8月','August'],['9月','September'],['10月','October'],['11月','November'],['12月','December']]; var m=pick(M); var o=shuffleArr(M.filter(function(x){return x!==m;})).slice(0,3).map(function(x){return x[1];}); return {q:'「'+m[0]+'」を英語で？', sub:'英語（月）', level:'★★★', hint:'たん生日の月から覚えよう', type:'choice', choices:shuffleArr([m[1]].concat(o)), ans:m[1], explain:'【考え方】月の英語。\n【手順】'+m[0]+'＝'+m[1]+'\n【ポイント】最初は大文字で書く。'}; },
 // 教科（Let's Try!2〜小5先取り）
 function(){ var S=[['算数','math'],['国語','Japanese'],['理科','science'],['音楽','music'],['体育','P.E.'],['図工','arts and crafts']]; var s=pick(S); var o=shuffleArr(S.filter(function(x){return x!==s;})).slice(0,3).map(function(x){return x[1];}); return {q:'教科「'+s[0]+'」を英語で？', sub:'英語（教科）', level:'★★☆', hint:'時間割を英語で', type:'choice', choices:shuffleArr([s[1]].concat(o)), ans:s[1], explain:'【考え方】教科の英語。\n【手順】'+s[0]+'＝'+s[1]+'\n【ポイント】P.E.＝体育の略。'}; },
 // なぞなぞ読み取り（What's this?）
 function(){ var r=pick([
   ['It has long ears. It likes carrots.','rabbit',['lion','fish','bird']],
   ['It is big and gray. It has a long nose.','elephant',['rabbit','cat','dog'] ],
   ['We use it on rainy days.','umbrella',['cap','desk','ball']],
   ['It is yellow. Monkeys like it.','banana',['apple','egg','milk']]
 ]); return {q:'What\'s this? 「'+r[0]+'」…答えは？', sub:'英語（なぞなぞ読み取り）', level:'★★★', hint:'ヒントの英語をよく読んで', type:'choice', choices:shuffleArr([r[1]].concat(r[2])), ans:r[1], explain:'【考え方】英語のヒントから物を当てる。\n【手順】'+r[0]+' → '+r[1]+'\n【ポイント】知っている単語（ears/nose/rainy）を手がかりに。'}; },
 // 文の意味の読み取り
 function(){ var s=pick([
   ['I have P.E. on Monday.','月曜日に体育がある',['月曜日に音楽がある','日曜日に体育がある','毎日体育がある']],
   ['I want two eggs and milk.','たまご2つと牛乳がほしい',['たまご1つがほしい','パンと牛乳がほしい','たまごが大好きだ']],
   ['My favorite color is green.','いちばん好きな色は緑だ',['緑の服を持っている','好きな色は青だ','緑がきらいだ']],
   ['Let\'s play cards after school.','放課後にカードで遊ぼう',['朝にカードで遊ぼう','放課後にサッカーをしよう','カードを買いに行こう']]
 ]); return {q:'「'+s[0]+'」の意味は？', sub:'英語（文の意味）', level:'★★★', hint:'単語を1つずつ確かめて', type:'choice', choices:shuffleArr([s[1]].concat(s[2])), ans:s[1], explain:'【考え方】文全体の意味を読み取る。\n【手順】'+s[0]+'＝'+s[1]+'\n【ポイント】on＋曜日＝「〜曜日に」、after school＝放課後。'}; },
]);

var G4 = { math:function(){return pick(g4MathGens)();}, japanese:function(){return pick(g4JpGens)();}, science:function(){return pick(g4SciGens)();}, social:function(){return pick(g4SocGens)();}, english:function(){return pick(g4EngGens)();} };
function g4Gens(area){ return ({math:g4MathGens,japanese:g4JpGens,science:g4SciGens,social:g4SocGens,english:g4EngGens})[area]||g4MathGens; }
const GEN = { math:()=>pick(mathGens)(), science:()=>pick(sciGens)(), social:()=>pick(socGens)(), english:()=>pick(engGens)(), japanese:()=>pick(jpGens)() };
function genQuestion(area){ var f; if(typeof muGradeBand==='function' && muGradeBand()==='elem' && typeof G4!='undefined' && G4[area]) f=G4[area]; else f=GEN[area]||GEN.math; let q; for(let i=0;i<5;i++){ q=f(); if(q && q.q && q.ans!==undefined) break; } return q; }
// 生成6割＋既存バンク4割を混ぜてcount問
function buildMix(area, count, bankPool){
  bankPool = bankPool||[];
  const genN = Math.max(1, Math.round(count*0.6));
  const out=[]; const seen=new Set(); let guard=0;
  while(out.length<genN && guard<count*8){ const q=genQuestion(area); guard++; if(q && !seen.has(q.q)){ seen.add(q.q); out.push(q);} }
  const bankPick = shuffleArr(bankPool).filter(q=>!seen.has(q.q)).slice(0, count-out.length);
  bankPick.forEach(q=>{ seen.add(q.q); out.push(q); });
  while(out.length<count){ const q=genQuestion(area); if(q && !seen.has(q.q)){ seen.add(q.q); out.push(q);} else if(guard++>count*12) break; }
  return shuffleArr(out).slice(0,count);
}

// ================================================================
