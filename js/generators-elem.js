/* generators-elem.js：小1〜3の学年スケール問題ジェネレータ＋小学(国/英/理/社)の増量。
   generators.js の後に読む（rint/pick/shuffleArr/g4*Gens/G4 を使う・上書きする）。
   ★方針：答えは「計算で確定」か「検証済みの事実テーブルの値」。LLM生成文は使わない。
   ★学年細分化：muCurrentGrade()<=3 のとき g13 プールを使うよう G4 を差し替え（小4〜6は従来 g4）。
   各ジェネレータは「どの学年で選ばれても妥当」になるよう内部で難易度をスケールする。 */

// この端末の学年を 1〜3 にクランプ（未定義環境では 2）
function _egGrade(){ try{ return Math.max(1, Math.min(3, (typeof muCurrentGrade==='function') ? muCurrentGrade() : 2)); }catch(e){ return 2; } }
// 選択肢を作る小ヘルパ（正解＋ダミー3・重複排除・シャッフル）
function _egChoices(ans, wrongs){ var set=[ans]; for(var i=0;i<wrongs.length && set.length<4;i++){ if(set.indexOf(wrongs[i])<0) set.push(wrongs[i]); } return shuffleArr(set); }

/* ===================== 算数（小1〜3・学年スケール） ===================== */
var g13MathGens=[
  // たし算（桁を学年でスケール）
  function(){ var g=_egGrade(); var a,b; if(g===1){ a=rint(1,9); b=rint(1,9); } else if(g===2){ a=rint(10,89); b=rint(2,49); } else { a=rint(100,899); b=rint(10,99); } var s=a+b; return {q:a+' + '+b+' = ?', sub:'たし算', level:g===1?'★☆☆':'★★☆', hint:'位をそろえて たそう', type:'free', ans:''+s, altAns:[''+s], explain:'【手順】'+a+'＋'+b+'＝'+s+'\n【ポイント】くり上がりに気をつけよう。'}; },
  // ひき算（a>b を保証）
  function(){ var g=_egGrade(); var a,b; if(g===1){ a=rint(2,18); b=rint(1,a-1); } else if(g===2){ a=rint(20,99); b=rint(2,a-1); } else { a=rint(100,999); b=rint(10,a-1); } var s=a-b; return {q:a+' − '+b+' = ?', sub:'ひき算', level:g===1?'★☆☆':'★★☆', hint:'位をそろえて ひこう', type:'free', ans:''+s, altAns:[''+s], explain:'【手順】'+a+'−'+b+'＝'+s+'\n【ポイント】くり下がりに気をつけよう。'}; },
  // かけ算：小1は「◯の◯ばい（小さい数）」、小2〜3は九九
  function(){ var g=_egGrade(); if(g===1){ var x=rint(2,5), t=rint(2,3); return {q:x+' の '+t+'ばいは？', sub:'ばい（たし算）', level:'★☆☆', hint:x+'を'+t+'回 たす', type:'free', ans:''+(x*t), altAns:[''+(x*t)], explain:'【手順】'+x+'を'+t+'回：'+x+'×'+t+'＝'+(x*t)+'\n【ポイント】ばい＝同じ数を何回も たす。'}; } var a=rint(2,9), b=rint(2,9); return {q:a+' × '+b+' = ?（九九）', sub:'かけ算（九九）', level:'★☆☆', hint:a+'のだん', type:'free', ans:''+(a*b), altAns:[''+(a*b)], explain:'【手順】'+a+'×'+b+'＝'+(a*b)+'\n【ポイント】九九をおぼえよう。'}; },
  // 数の大小
  function(){ var g=_egGrade(); var mx=g===1?20:g===2?100:1000; var a=rint(1,mx), b=rint(1,mx); if(a===b) b=(b%mx)+1; return {q:'大きいのは どっち？　'+a+' と '+b, sub:'数の大小', level:'★☆☆', hint:'上の位から くらべる', type:'choice', choices:_egChoices(''+Math.max(a,b),[''+Math.min(a,b)]), ans:''+Math.max(a,b), explain:'【手順】'+Math.max(a,b)+'の方が大きい\n【ポイント】けた数→上の位の順にくらべる。'}; },
  // 数のならび（あなうめ）
  function(){ var g=_egGrade(); var step=g===1?1:g===2?2:5; var start=rint(1,9)*step; var seq=[start,start+step,start+step*2,start+step*3]; var hole=rint(1,2); var ans=seq[hole]; var shown=seq.map(function(v,i){ return i===hole?'□':v; }).join('、'); return {q:'□に入る数は？　'+shown, sub:'数のならび', level:'★☆☆', hint:step+'ずつ ふえている', type:'free', ans:''+ans, altAns:[''+ans], explain:'【手順】'+step+'ずつ ふえるので □＝'+ans+'\n【ポイント】となりとの差を見つけよう。'}; },
  // 時こく（◯時の N時間後）
  function(){ var h=rint(1,9), n=rint(1,3); var after=((h+n-1)%12)+1; return {q:h+'時の '+n+'時間後は 何時？', sub:'時こく', level:'★☆☆', hint:h+'に'+n+'を たす', type:'free', ans:''+after+'時', altAns:[''+after, after+'時'], explain:'【手順】'+h+'＋'+n+'＝'+(h+n)+'（12をこえたら もどる）→'+after+'時\n【ポイント】長い針は同じ場所。'}; },
  // おかね（何円）
  function(){ var g=_egGrade(); var coins=g===1?[10,50,100]:[50,100,500]; var a=pick(coins), b=pick(coins); return {q:a+'円と '+b+'円で あわせて いくら？', sub:'おかね', level:'★☆☆', hint:'たし算', type:'free', ans:''+(a+b)+'円', altAns:[''+(a+b), (a+b)+'円'], explain:'【手順】'+a+'＋'+b+'＝'+(a+b)+'円\n【ポイント】同じ位どうしを たす。'}; },
  // 長さ・かさの たんい（小2〜3）＋小1は「長い方」
  function(){ var g=_egGrade(); if(g<=1){ var x=rint(2,9); return {q:x+'cm と '+(x+rint(1,9))+'cm、長いのは？', sub:'ながさ', level:'★☆☆', hint:'数が大きい方', type:'choice', choices:_egChoices((x+ (function(){return 0;})())+'cm',[]) , ans:'', explain:''}; } var t=pick([['1m は 何cm？','100cm','100'],['1km は 何m？','1000m','1000'],['1L は 何dL？','10dL','10'],['1時間は 何分？','60分','60']]); return {q:t[0], sub:'たんい', level:'★★☆', hint:'たんいの きまり', type:'free', ans:t[1], altAns:[t[1],t[2]], explain:'【手順】'+t[0]+' → '+t[1]+'\n【ポイント】たんいの かんけいを おぼえよう。'}; },
];
// 上の「長さ小1」枝は選択肢生成が不完全なので、確実な版に差し替え（小1でも成立）
g13MathGens[7]=function(){ var g=_egGrade(); if(g<=1){ var a=rint(2,9), b=a+rint(1,9); return {q:a+'cm と '+b+'cm、長いのは？', sub:'ながさ', level:'★☆☆', hint:'数が 大きい方', type:'choice', choices:shuffleArr([a+'cm', b+'cm']), ans:b+'cm', explain:'【手順】'+b+'cm の方が長い\n【ポイント】数が大きいほど長い。'}; } var t=pick([['1m は 何cm？','100cm','100'],['1km は 何m？','1000m','1000'],['1L は 何dL？','10dL','10'],['1時間は 何分？','60分','60'],['1日は 何時間？','24時間','24']]); return {q:t[0], sub:'たんい', level:'★★☆', hint:'たんいの きまり', type:'free', ans:t[1], altAns:[t[1],t[2]], explain:'【手順】'+t[0]+' → '+t[1]+'\n【ポイント】たんいの かんけいを おぼえよう。'}; };

/* ===================== 国語（小1〜3・選択式中心＝誤答リスク回避） ===================== */
// 漢字の読み［漢字, 正しい読み, [ダミー読み…]］学年別。
// ★ダミーは必ず「別の漢字の読み」だけ（＝その漢字の別の正しい読みは絶対に入れない＝誤って不正解にしない）。
var G13_KANJI={
 1:[['花','はな',['そら','いぬ','つき']],['空','そら',['はな','むし','いし']],['犬','いぬ',['そら','はな','たけ']],['虫','むし',['いし','もり','かい']],['石','いし',['いと','みみ','たけ']],['森','もり',['かい','むし','いぬ']],['糸','いと',['みみ','いし','はな']],['耳','みみ',['いと','そら','むし']],['貝','かい',['たけ','もり','いぬ']],['竹','たけ',['かい','いし','みみ']]],
 2:[['星','ほし',['ゆき','かぜ','いわ']],['雪','ゆき',['ほし','たに','いけ']],['風','かぜ',['いわ','むぎ','ほし']],['妹','いもうと',['あね','ちち','はは']],['父','ちち',['はは','あね','いもうと']],['母','はは',['ちち','あね','いもうと']],['兄','あに',['いもうと','ちち','はは']],['岩','いわ',['たに','ほし','むぎ']],['池','いけ',['たに','いわ','ほし']],['谷','たに',['いけ','むぎ','かぜ']]],
 3:[['委員','いいん',['いにん','ぎいん','かいいん']],['勉強','べんきょう',['べんごう','べんきゅう','ふくしゅう']],['練習','れんしゅう',['れんじゅう','ねんしゅう','がくしゅう']],['世界','せかい',['よかい','せがい','しゃかい']],['港','みなと',['うみ','ふね','しま']],['湖','みずうみ',['いけ','うみ','みなと']],['鉄','てつ',['きん','ぎん','どう']],['農家','のうか',['しょうか','ぎょか','こうか']],['商店','しょうてん',['しょてん','しょうみせ','ばいてん']],['相談','そうだん',['めんだん','かいだん','しょうだん']]]
};
var G13_KATA=[['ねこ','ネコ'],['いぬ','イヌ'],['ばなな','バナナ'],['ぱん','パン'],['てれび','テレビ'],['ぼーる','ボール'],['のーと','ノート'],['けーき','ケーキ'],['ぷりん','プリン'],['こっぷ','コップ']];
var G13_ANT=[['大きい','小さい'],['高い','ひくい'],['長い','みじかい'],['あつい','さむい'],['はやい','おそい'],['あかるい','くらい'],['おおい','すくない'],['あたらしい','ふるい'],['前','うしろ'],['右','左']];
var G13_COUNT=[['ほん','さつ'],['えんぴつ','本'],['かみ','まい'],['いぬ','ひき'],['くるま','だい'],['はな','りん'],['とり','わ'],['はし','ぜん']];
var G13_KOTO=[['さるも','木からおちる','名人でも しっぱいすることがある'],['ねこに','こばん','ねうちの わからない人には むだ'],['ちりも','つもれば山となる','小さなことも つみかさなれば 大きくなる'],['いしの上にも','三年','がまんすれば むくわれる'],['はやおきは','三文のとく','早おきは よいことがある']];
var g13JpGens=[
  // 漢字の読み（学年別・選択式）
  function(){ var g=_egGrade(); var t=pick(G13_KANJI[g]); return {q:'「'+t[0]+'」の 読みは？', sub:'漢字の読み', level:'★☆☆', hint:'声に 出してみよう', type:'choice', choices:_egChoices(t[1], t[2]), ans:t[1], explain:'【こたえ】'+t[0]+'＝'+t[1]+'\n【ポイント】'+g+'年生の 漢字。'}; },
  // ひらがな→カタカナ
  function(){ var w=pick(G13_KATA); var o=shuffleArr(G13_KATA.filter(function(x){return x[1]!==w[1];})).slice(0,3).map(function(x){return x[1];}); return {q:'「'+w[0]+'」を カタカナで かくと？', sub:'カタカナ', level:'★☆☆', hint:'音は 同じ', type:'choice', choices:_egChoices(w[1], o), ans:w[1], explain:'【こたえ】'+w[0]+'＝'+w[1]+'\n【ポイント】のばす音は「ー」。'}; },
  // 反対のことば
  function(){ var w=pick(G13_ANT); var o=shuffleArr(G13_ANT.filter(function(x){return x[0]!==w[0];})).slice(0,3).map(function(x){return x[1];}); return {q:'「'+w[0]+'」の 反対の ことばは？', sub:'反対のことば', level:'★☆☆', hint:'ぎゃくの いみ', type:'choice', choices:_egChoices(w[1], o), ans:w[1], explain:'【こたえ】'+w[0]+'⇔'+w[1]+'\n【ポイント】ペアで おぼえよう。'}; },
  // 数え方
  function(){ var w=pick(G13_COUNT); var o=shuffleArr(['さつ','本','まい','ひき','だい','りん','わ','ぜん'].filter(function(x){return x!==w[1];})).slice(0,3); return {q:'「'+w[0]+'」の 数え方は？', sub:'数え方', level:'★★☆', hint:'ものによって ちがう', type:'choice', choices:_egChoices(w[1], o), ans:w[1], explain:'【こたえ】'+w[0]+'→「'+w[1]+'」\n【ポイント】数え方を おぼえよう。'}; },
  // ことわざ
  function(){ var k=pick(G13_KOTO); var o=shuffleArr(G13_KOTO.filter(function(x){return x[1]!==k[1];})).slice(0,3).map(function(x){return x[1];}); return {q:'「'+k[0]+'○○」に つづくのは？', sub:'ことわざ', level:'★★☆', hint:k[2], type:'choice', choices:_egChoices(k[1], o), ans:k[1], explain:'【こたえ】'+k[0]+k[1]+'（'+k[2]+'）\n【ポイント】いみごと おぼえよう。'}; },
  // 主語（だれが・何が）小2〜3
  function(){ var s=pick([['犬が わんと ないた。','犬が'],['妹が 絵を かいた。','妹が'],['花が きれいに さいた。','花が'],['ぼくは 本を 読む。','ぼくは'],['鳥が 空を とぶ。','鳥が']]); var o=shuffleArr(s[0].replace('。','').split(/\s+|　/).filter(Boolean)).filter(function(x){return x!==s[1];}).slice(0,3); return {q:'つぎの文の 主語（だれが・何が）は？　「'+s[0]+'」', sub:'主語', level:'★★☆', hint:'「〜が・〜は」を さがす', type:'choice', choices:_egChoices(s[1], o.length?o:['本を','空を','絵を']), ans:s[1], explain:'【こたえ】主語＝'+s[1]+'\n【ポイント】主語は「だれが・何が」。'}; },
];

/* ===================== 英語（小学・基本語彙／あいさつ） ===================== */
var G13_EWORD=[['犬','dog'],['ねこ','cat'],['とり','bird'],['さかな','fish'],['うさぎ','rabbit'],['りんご','apple'],['ばなな','banana'],['本','book'],['水','water'],['学校','school']];
var G13_ECOLOR=[['赤','red'],['青','blue'],['黄','yellow'],['緑','green'],['白','white'],['黒','black']];
var G13_ENUM=[['1','one'],['2','two'],['3','three'],['4','four'],['5','five'],['6','six'],['7','seven'],['8','eight'],['9','nine'],['10','ten']];
var G13_EGREET=[['おはよう','Good morning'],['こんにちは','Hello'],['ありがとう','Thank you'],['さようなら','Goodbye'],['はじめまして','Nice to meet you'],['ごめんなさい','I\'m sorry']];
var g13EngGens=[
  function(){ var w=pick(G13_EWORD); var o=shuffleArr(G13_EWORD.filter(function(x){return x[1]!==w[1];})).slice(0,3).map(function(x){return x[1];}); return {q:'「'+w[0]+'」を 英語で？', sub:'英語（たんご）', level:'★☆☆', hint:'音で おぼえよう', type:'choice', choices:_egChoices(w[1], o), ans:w[1], explain:'【こたえ】'+w[0]+'＝'+w[1]+'\n【ポイント】声に 出して おぼえる。'}; },
  function(){ var c=pick(G13_ECOLOR); var o=shuffleArr(G13_ECOLOR.filter(function(x){return x[1]!==c[1];})).slice(0,3).map(function(x){return x[1];}); return {q:'色「'+c[0]+'」を 英語で？', sub:'英語（色）', level:'★☆☆', hint:'color', type:'choice', choices:_egChoices(c[1], o), ans:c[1], explain:'【こたえ】'+c[0]+'＝'+c[1]+'\n【ポイント】身近な 色から。'}; },
  function(){ var n=pick(G13_ENUM); var o=shuffleArr(G13_ENUM.filter(function(x){return x[1]!==n[1];})).slice(0,3).map(function(x){return x[1];}); return {q:'数字「'+n[0]+'」を 英語で？', sub:'英語（数）', level:'★☆☆', hint:'1〜10', type:'choice', choices:_egChoices(n[1], o), ans:n[1], explain:'【こたえ】'+n[0]+'＝'+n[1]+'\n【ポイント】1〜10を おぼえよう。'}; },
  function(){ var gg=pick(G13_EGREET); var o=shuffleArr(G13_EGREET.filter(function(x){return x[1]!==gg[1];})).slice(0,3).map(function(x){return x[1];}); return {q:'「'+gg[0]+'」を 英語で？', sub:'英語（あいさつ）', level:'★★☆', hint:'あいさつ', type:'choice', choices:_egChoices(gg[1], o), ans:gg[1], explain:'【こたえ】'+gg[0]+'＝'+gg[1]+'\n【ポイント】会話の 基本。'}; },
  function(){ var w=pick(G13_EWORD.concat(G13_ECOLOR)); var o=shuffleArr(G13_EWORD.concat(G13_ECOLOR).filter(function(x){return x[0]!==w[0];})).slice(0,3).map(function(x){return x[0];}); return {q:'"'+w[1]+'" の いみは？', sub:'英語（いみ）', level:'★★☆', hint:'知っている たんご', type:'choice', choices:_egChoices(w[0], o), ans:w[0], explain:'【こたえ】'+w[1]+'＝'+w[0]+'\n【ポイント】英語→日本語も おぼえる。'}; },
];

/* ===================== 理科（小3中心・検証済み事実） ===================== */
var g13SciGens=[
  function(){ var d=pick([['モンシロチョウの よう虫（あおむし）は 大きくなると','さなぎ'],['たまご→よう虫→さなぎ→','せい虫'],['チョウが みつを すう体の ところは','口']]); var o=shuffleArr(['さなぎ','せい虫','たまご','口','あし']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'こん虫の育ち方', level:'★☆☆', hint:'そだつ 順番', type:'choice', choices:_egChoices(d[1], o), ans:d[1], explain:'【こたえ】'+d[1]+'\n【ポイント】たまご→よう虫→さなぎ→せい虫。'}; },
  function(){ var d=pick([['たねを まいて さいしょに 出るのは','子葉（ふたば）'],['植物が そだつのに 必要なのは','水・日光・空気（と 適した温度）'],['ヒマワリの せの 高さは 夏に','高くなる']]); var o=shuffleArr(['子葉（ふたば）','水・日光・空気（と 適した温度）','高くなる','花','根']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'植物のそだち', level:'★☆☆', hint:'かんさつ', type:'choice', choices:_egChoices(d[1], o), ans:d[1], explain:'【こたえ】'+d[1]+'\n【ポイント】子葉→葉→つぼみ→花→実。'}; },
  function(){ var d=pick([['日なたと 日かげ、あたたかいのは','日なた'],['かげは 太陽の','反対がわ','にできる'],['太陽は 東から のぼり','西','にしずむ']]); var q=d.length===3?(d[0]+'○○'+d[2]+'？'):(d[0]+'？'); var o=shuffleArr(['日なた','反対がわ','西','日かげ','東']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:q, sub:'太陽とかげ', level:'★☆☆', hint:'太陽の 位置', type:'choice', choices:_egChoices(d[1], o), ans:d[1], explain:'【こたえ】'+d[1]+'\n【ポイント】かげは太陽の反対がわ。'}; },
  function(){ var d=pick([['じしゃくに つくのは','鉄（てつ）'],['じしゃくの N極と N極は','しりぞけあう'],['じしゃくの N極と S極は','引きあう']]); var o=shuffleArr(['鉄（てつ）','しりぞけあう','引きあう','木','紙']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'じしゃく', level:'★★☆', hint:'N極とS極', type:'choice', choices:_egChoices(d[1], o), ans:d[1], explain:'【こたえ】'+d[1]+'\n【ポイント】同じ極は しりぞけ、ちがう極は 引きあう。'}; },
  function(){ var d=pick([['音が 出ている ものは','ふるえている'],['大きい音の とき ふるえは','大きい'],['光は まっすぐ','進む']]); var o=shuffleArr(['ふるえている','大きい','進む','止まっている','曲がる']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'光と音', level:'★★☆', hint:'ふるえ／まっすぐ', type:'choice', choices:_egChoices(d[1], o), ans:d[1], explain:'【こたえ】'+d[1]+'\n【ポイント】音＝ふるえ、光＝まっすぐ。'}; },
];

/* ===================== 社会（小3中心・検証済み事実） ===================== */
var G13_MAP=[['田','たんぼ（田）'],['畑','はたけ（畑）'],['文','学校'],['〒','ゆうびん局'],['卍','お寺'],['⛩(鳥居)','神社'],['♨','おんせん'],['◎','市役所（町村役場は○）']];
var g13SocGens=[
  function(){ var d=pick([['太陽が のぼる 方角は','東'],['太陽が しずむ 方角は','西'],['地図で ふつう 上は','北'],['北を向いて 右手は','東']]); var o=shuffleArr(['東','西','南','北']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'方位', level:'★☆☆', hint:'東西南北', type:'choice', choices:_egChoices(d[1], o), ans:d[1], explain:'【こたえ】'+d[1]+'\n【ポイント】地図の上は北。'}; },
  function(){ var m=pick(G13_MAP); var o=shuffleArr(G13_MAP.filter(function(x){return x[1]!==m[1];})).slice(0,3).map(function(x){return x[1];}); return {q:'地図記号「'+m[0]+'」は 何を あらわす？', sub:'地図記号', level:'★★☆', hint:'かたちから 考える', type:'choice', choices:_egChoices(m[1], o), ans:m[1], explain:'【こたえ】'+m[0]+'＝'+m[1]+'\n【ポイント】記号は かたちに いみがある。'}; },
  function(){ var d=pick([['火事を けすのは','しょうぼうしょ'],['どろぼうを つかまえるのは','けいさつしょ'],['手紙や 荷物を とどけるのは','ゆうびん局'],['本を かりられるのは','図書館']]); var o=shuffleArr(['しょうぼうしょ','けいさつしょ','ゆうびん局','図書館','病院']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'まちのしせつ', level:'★☆☆', hint:'まちの しごと', type:'choice', choices:_egChoices(d[1], o), ans:d[1], explain:'【こたえ】'+d[1]+'\n【ポイント】くらしを ささえる しごと。'}; },
  function(){ var d=pick([['むかし ごはんを たいた 道具は','かまど'],['むかし せんたくに つかった 道具は','せんたく板'],['むかし あかりに つかったのは','ランプ（あんどん）']]); var o=shuffleArr(['かまど','せんたく板','ランプ（あんどん）','せんたくき','れいぞうこ']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'むかしのくらし', level:'★★☆', hint:'今と くらべる', type:'choice', choices:_egChoices(d[1], o), ans:d[1], explain:'【こたえ】'+d[1]+'\n【ポイント】道具は 進化してきた。'}; },
  function(){ var d=pick([['スーパーで ねだんや 産地が わかるのは','ねふだ（ラベル）'],['やさいの「産地」は','とれた場所'],['買い物で お金の かわりに 使えるカードは','ICカード・電子マネー']]); var o=shuffleArr(['ねふだ（ラベル）','とれた場所','ICカード・電子マネー','レシート','ちらし']).filter(function(x){return x!==d[1];}).slice(0,3); return {q:d[0]+'？', sub:'買い物とくらし', level:'★★☆', hint:'お店の くふう', type:'choice', choices:_egChoices(d[1], o), ans:d[1], explain:'【こたえ】'+d[1]+'\n【ポイント】お店は くふうしている。'}; },
];

/* ===================== 小学(小4〜6)の 国/英/理/社 を増量（従来の g4 プールへ） ===================== */
(function(){
  if(typeof g4JpGens==='undefined') return;
  g4JpGens.push(
   function(){ var t=pick([['同音異義：「かがく」＝科学の反対でよく混同するのは','化学'],['「はかる」体重を__','量る'],['「はかる」長さを__','測る'],['「はかる」時間を__','計る']]); var o=shuffleArr(['化学','量る','測る','計る','図る']).filter(function(x){return x!==t[1];}).slice(0,3); return {q:t[0]+'？', sub:'同訓異字・同音異義（高学年）', level:'★★★', hint:'いみで 使い分け', type:'choice', choices:_egChoices(t[1], o), ans:t[1], explain:'【こたえ】'+t[1]+'\n【ポイント】いみで 漢字を えらぶ。'}; },
   function(){ var t=pick([['主語・述語：「弟が 元気に 走る」の 述語は','走る'],['修飾語：「白い 花が さく」で「白い」がくわしくするのは','花'],['「とても 大きい」の「とても」は','大きい']]); var o=shuffleArr(['走る','花','大きい','弟が','さく']).filter(function(x){return x!==t[1];}).slice(0,3); return {q:t[0]+'？', sub:'文の組み立て（高学年）', level:'★★☆', hint:'つながりを 見る', type:'choice', choices:_egChoices(t[1], o), ans:t[1], explain:'【こたえ】'+t[1]+'\n【ポイント】述語＝どうする／修飾語＝くわしくする。'}; },
   function(){ var t=pick([['敬語：「言う」の尊敬語は','おっしゃる'],['「食べる」の尊敬語は','めしあがる'],['「見る」のけんじょう語は','はいけんする']]); var o=shuffleArr(['おっしゃる','めしあがる','はいけんする','いたす','うかがう']).filter(function(x){return x!==t[1];}).slice(0,3); return {q:t[0]+'？', sub:'敬語（高学年）', level:'★★★', hint:'相手を 立てる', type:'choice', choices:_egChoices(t[1], o), ans:t[1], explain:'【こたえ】'+t[1]+'\n【ポイント】尊敬語は相手、けんじょう語は自分側。'}; }
  );
  if(typeof g4SciGens!=='undefined') g4SciGens.push(
   function(){ var t=pick([['ものが 燃えるのに 必要な 気体は','酸素'],['ろうそくが 燃えたあとに ふえる 気体は','二酸化炭素'],['植物が 日光を うけて 養分を つくるのは','光合成']]); var o=shuffleArr(['酸素','二酸化炭素','光合成','ちっ素','水素']).filter(function(x){return x!==t[1];}).slice(0,3); return {q:t[0]+'？', sub:'ものの燃え方・植物（高学年）', level:'★★☆', hint:'空気の成分', type:'choice', choices:_egChoices(t[1], o), ans:t[1], explain:'【こたえ】'+t[1]+'\n【ポイント】燃焼に酸素、光合成で二酸化炭素→酸素。'}; },
   function(){ var t=pick([['てこで 手ごたえが 軽くなるのは 支点から 作用点が','近い','ほど'],['月が 光って 見えるのは 太陽の光を','反射','しているから'],['心ぞうが 血液を 送り出す はたらきを','はく動','という']]); var o=shuffleArr(['近い','反射','はく動','遠い','吸収']).filter(function(x){return x!==t[1];}).slice(0,3); return {q:t[0]+'○○'+(t[2]||'')+'？', sub:'てこ・月・人体（高学年）', level:'★★★', hint:'しくみ', type:'choice', choices:_egChoices(t[1], o), ans:t[1], explain:'【こたえ】'+t[1]+'\n【ポイント】基本のしくみを おさえる。'}; }
  );
  if(typeof g4SocGens!=='undefined') g4SocGens.push(
   function(){ var t=pick([['日本の 首都は','東京'],['三権のうち 法律を つくるのは','国会'],['税金を 集めて 公共サービスに 使うのは','政府（国・地方）'],['日本国憲法の 三原則の一つは','国民主権']]); var o=shuffleArr(['東京','国会','政府（国・地方）','国民主権','裁判所']).filter(function(x){return x!==t[1];}).slice(0,3); return {q:t[0]+'？', sub:'政治・くらし（高学年）', level:'★★☆', hint:'公民の 基本', type:'choice', choices:_egChoices(t[1], o), ans:t[1], explain:'【こたえ】'+t[1]+'\n【ポイント】国会＝立法、内閣＝行政、裁判所＝司法。'}; },
   function(){ var t=pick([['米づくりが さかんな 地方の 気候は','雪が多い（東北・北陸）'],['工業が さかんな 太平洋側の 帯を','太平洋ベルト','という'],['海に かこまれた 日本は','島国','である']]); var o=shuffleArr(['雪が多い（東北・北陸）','太平洋ベルト','島国','内陸','高地']).filter(function(x){return x!==t[1];}).slice(0,3); return {q:t[0]+(t[2]?('○○'+t[2]):'')+'？', sub:'日本の地理（高学年）', level:'★★☆', hint:'地形と 気候', type:'choice', choices:_egChoices(t[1], o), ans:t[1], explain:'【こたえ】'+t[1]+'\n【ポイント】地形・気候と 産業の むすびつき。'}; }
  );
  if(typeof g4EngGens!=='undefined') g4EngGens.push(
   function(){ var t=pick([['I ___ a student.（私は生徒です）','am'],['You ___ kind.（あなたは親切です）','are'],['She ___ happy.（彼女は幸せです）','is']]); var o=shuffleArr(['am','are','is','be','do']).filter(function(x){return x!==t[1];}).slice(0,3); return {q:t[0], sub:'英語（be動詞）', level:'★★☆', hint:'主語で かわる', type:'choice', choices:_egChoices(t[1], o), ans:t[1], explain:'【こたえ】'+t[1]+'\n【ポイント】I=am, you/複数=are, 3人称単数=is。'}; },
   function(){ var t=pick([['月曜日','Monday'],['金曜日','Friday'],['日曜日','Sunday'],['土曜日','Saturday']]); var o=shuffleArr(['Monday','Friday','Sunday','Saturday','Tuesday']).filter(function(x){return x!==t[1];}).slice(0,3); return {q:'「'+t[0]+'」を 英語で？', sub:'英語（曜日）', level:'★★☆', hint:'week', type:'choice', choices:_egChoices(t[1], o), ans:t[1], explain:'【こたえ】'+t[0]+'＝'+t[1]+'\n【ポイント】曜日は 大文字ではじめる。'}; }
  );
})();

/* ===================== G4 を学年対応に差し替え（小1〜3は g13 プール） ===================== */
function g13Gens(area){ return ({math:g13MathGens,japanese:g13JpGens,science:g13SciGens,social:g13SocGens,english:g13EngGens})[area]||g13MathGens; }
// 学年≤3なら g13、そうでなければ従来 g4。g13が空なら g4 にフォールバック。
function _elemPickPool(area){
  var g=2; try{ if(typeof muCurrentGrade==='function') g=muCurrentGrade(); }catch(e){}
  if(g<=3){ var p=g13Gens(area); if(p && p.length) return p; }
  return (typeof g4Gens==='function') ? g4Gens(area) : g13Gens(area);
}
if(typeof G4!=='undefined'){
  G4 = { math:function(){return pick(_elemPickPool('math'))();}, japanese:function(){return pick(_elemPickPool('japanese'))();}, science:function(){return pick(_elemPickPool('science'))();}, social:function(){return pick(_elemPickPool('social'))();}, english:function(){return pick(_elemPickPool('english'))();} };
}
