/* family-daily.js：📅きょうの家族もんだい（classic script・グローバル・純データ＋純関数）。
   家族全員が「同じ日に同じ5問」に挑戦し、家族画面で成績が並ぶ＝毎日ひらく理由をつくる。
   問題は日付キーのハッシュで決定的に選出＝同期不要で全端末一致（レイド/ピックアップと同じ流儀）。
   プールはこのファイル内の固定40問（アプリ版差で問題がズレないよう、生成関数は使わない）。
   答えはすべて検証済み。choice限定・音声/図/本文なし＝どの学年でも紙でも成立する内容だけ。 */

var FD_POOL=[
  // ---- 算数・数学（★☆☆〜★★☆）----
  { area:'math', q:'48 ＋ 27 ＝ ？', choices:['75','65','74','85'], ans:'75', sub:'たし算', level:'★☆☆', explain:'48+27＝75。' },
  { area:'math', q:'91 − 36 ＝ ？', choices:['55','65','54','45'], ans:'55', sub:'ひき算', level:'★☆☆', explain:'91−36＝55。' },
  { area:'math', q:'7 × 8 ＝ ？', choices:['56','54','63','48'], ans:'56', sub:'かけ算', level:'★☆☆', explain:'7×8＝56。' },
  { area:'math', q:'72 ÷ 9 ＝ ？', choices:['8','9','7','6'], ans:'8', sub:'わり算', level:'★☆☆', explain:'72÷9＝8。' },
  { area:'math', q:'0.5 ＋ 0.75 ＝ ？', choices:['1.25','1.2','1.5','0.8'], ans:'1.25', sub:'小数', level:'★★☆', explain:'0.5+0.75＝1.25。' },
  { area:'math', q:'3/4 と 同じ大きさの分数は？', choices:['6/8','4/3','3/8','2/3'], ans:'6/8', sub:'分数', level:'★★☆', explain:'3/4の分子分母を2倍すると6/8。' },
  { area:'math', q:'100円の えんぴつを 3本と 250円のノートを 1さつ。合計は？', choices:['550円','450円','650円','350円'], ans:'550円', sub:'文章題', level:'★★☆', explain:'100×3+250＝550円。' },
  { area:'math', q:'正方形の 1辺が 6cm。まわりの長さは？', choices:['24cm','36cm','12cm','18cm'], ans:'24cm', sub:'図形', level:'★★☆', explain:'6×4＝24cm。' },
  // ---- 国語 ----
  { area:'japanese', q:'「案内」の読みは？', choices:['あんない','あんうち','あない','やすうち'], ans:'あんない', sub:'漢字の読み', level:'★☆☆', explain:'案内（あんない）。' },
  { area:'japanese', q:'「協力」の読みは？', choices:['きょうりょく','きょりょく','こうりょく','ごうりょく'], ans:'きょうりょく', sub:'漢字の読み', level:'★☆☆', explain:'協力（きょうりょく）。' },
  { area:'japanese', q:'「失敗」の反対の意味のことばは？', choices:['成功','失点','敗北','完成'], ans:'成功', sub:'対義語', level:'★☆☆', explain:'失敗⇔成功。' },
  { area:'japanese', q:'「さるも木からおちる」の意味は？', choices:['名人でも失敗することがある','さるは木のぼりが下手だ','あぶないことはさけるべきだ','高いところは気持ちがいい'], ans:'名人でも失敗することがある', sub:'ことわざ', level:'★★☆', explain:'得意な人でも失敗はある、という意味。' },
  { area:'japanese', q:'「ちりもつもれば山となる」の意味は？', choices:['小さなことも積み重なれば大きくなる','そうじをすると山ができる','ちりは山にすてるとよい','山にはちりが多い'], ans:'小さなことも積み重なれば大きくなる', sub:'ことわざ', level:'★★☆', explain:'わずかなものでも積み重なれば大きなものになる。' },
  { area:'japanese', q:'「一石二鳥」の意味は？', choices:['一つのことで二つの得をする','石を二回投げること','鳥が二羽ならぶこと','二つのことを同時に失敗する'], ans:'一つのことで二つの得をする', sub:'四字熟語', level:'★★☆', explain:'一つの行いで二つの利益を得ること。' },
  { area:'japanese', q:'「明るい」の反対の意味のことばは？', choices:['暗い','重い','広い','弱い'], ans:'暗い', sub:'対義語', level:'★☆☆', explain:'明るい⇔暗い。' },
  { area:'japanese', q:'「希望」の読みは？', choices:['きぼう','けぼう','きも','きぼ'], ans:'きぼう', sub:'漢字の読み', level:'★☆☆', explain:'希望（きぼう）。' },
  // ---- 英語 ----
  { area:'english', q:'"dog" の意味は？', choices:['犬','ねこ','鳥','魚'], ans:'犬', sub:'英単語', level:'★☆☆', explain:'dog＝犬。' },
  { area:'english', q:'"library" の意味は？', choices:['図書館','病院','駅','公園'], ans:'図書館', sub:'英単語', level:'★★☆', explain:'library＝図書館。' },
  { area:'english', q:'"water" の意味は？', choices:['水','火','風','土'], ans:'水', sub:'英単語', level:'★☆☆', explain:'water＝水。' },
  { area:'english', q:'「わたしはテニスをします」を英語で言うと？', choices:['I play tennis.','I am tennis.','I do playing tennis.','I tennis play.'], ans:'I play tennis.', sub:'英作文', level:'★★☆', explain:'「〜をする」はplay。主語＋動詞の順。' },
  { area:'english', q:'"Monday" は何曜日？', choices:['月曜日','火曜日','水曜日','日曜日'], ans:'月曜日', sub:'英単語', level:'★☆☆', explain:'Monday＝月曜日。' },
  { area:'english', q:'"breakfast" の意味は？', choices:['朝食','昼食','夕食','おやつ'], ans:'朝食', sub:'英単語', level:'★★☆', explain:'breakfast＝朝食。' },
  { area:'english', q:'"April" は何月？', choices:['4月','8月','2月','6月'], ans:'4月', sub:'英単語', level:'★★☆', explain:'April＝4月。' },
  { area:'english', q:'"big" の反対の意味の単語は？', choices:['small','tall','old','fast'], ans:'small', sub:'英単語', level:'★★☆', explain:'big（大きい）⇔small（小さい）。' },
  // ---- 理科 ----
  { area:'science', q:'水が こおる 温度は？', choices:['0℃','100℃','10℃','−10℃'], ans:'0℃', sub:'水の変化', level:'★☆☆', explain:'水は0℃でこおり、100℃でふっとうする。' },
  { area:'science', q:'植物が 日光を受けて 養分をつくるはたらきは？', choices:['光合成','呼吸','蒸散','発芽'], ans:'光合成', sub:'植物', level:'★★☆', explain:'光合成＝日光・水・二酸化炭素からでんぷん（養分）をつくる。' },
  { area:'science', q:'太陽が のぼる方角は？', choices:['東','西','南','北'], ans:'東', sub:'天体', level:'★☆☆', explain:'太陽は東からのぼり、西にしずむ。' },
  { area:'science', q:'人のからだで 血液を送り出しているのは？', choices:['心臓','肺','胃','かん臓'], ans:'心臓', sub:'人体', level:'★☆☆', explain:'心臓がポンプの役割をして血液を全身へ送る。' },
  { area:'science', q:'こん虫の あしの数は？', choices:['6本','8本','4本','10本'], ans:'6本', sub:'こん虫', level:'★☆☆', explain:'こん虫のあしは6本（クモは8本でこん虫ではない）。' },
  { area:'science', q:'磁石の N極と N極を 近づけると？', choices:['しりぞけ合う','引き合う','なにも起きない','熱くなる'], ans:'しりぞけ合う', sub:'磁石', level:'★★☆', explain:'同じ極どうしはしりぞけ合い、ちがう極どうしは引き合う。' },
  { area:'science', q:'音は 何が ふるえて 伝わる？', choices:['空気','光','熱','電気'], ans:'空気', sub:'音', level:'★★☆', explain:'音は空気などの物質がふるえ（振動し）て伝わる。' },
  { area:'science', q:'水じょう気は 水が 何に変わったもの？', choices:['気体','固体','液体','金属'], ans:'気体', sub:'水の変化', level:'★★☆', explain:'水（液体）が蒸発すると水じょう気（気体）になる。' },
  // ---- 社会 ----
  { area:'social', q:'日本の首都は？', choices:['東京','大阪','京都','名古屋'], ans:'東京', sub:'地理', level:'★☆☆', explain:'日本の首都は東京。' },
  { area:'social', q:'日本で いちばん高い山は？', choices:['富士山','北岳','立山','阿蘇山'], ans:'富士山', sub:'地理', level:'★☆☆', explain:'富士山（3776m）。' },
  { area:'social', q:'日本で いちばん広い都道府県は？', choices:['北海道','岩手県','長野県','新潟県'], ans:'北海道', sub:'地理', level:'★★☆', explain:'面積1位は北海道。' },
  { area:'social', q:'江戸幕府を ひらいた人物は？', choices:['徳川家康','織田信長','豊臣秀吉','源頼朝'], ans:'徳川家康', sub:'歴史', level:'★★☆', explain:'1603年、徳川家康が江戸幕府をひらいた。' },
  { area:'social', q:'地図記号「〒」は 何をあらわす？', choices:['郵便局','病院','学校','神社'], ans:'郵便局', sub:'地図記号', level:'★☆☆', explain:'〒は郵便局の記号。' },
  { area:'social', q:'国会・内閣・裁判所の 三つの権力の分け方を 何という？', choices:['三権分立','三位一体','三者面談','三国同盟'], ans:'三権分立', sub:'公民', level:'★★☆', explain:'権力を立法・行政・司法に分けるしくみ＝三権分立。' },
  { area:'social', q:'日本で いちばん長い川は？', choices:['信濃川','利根川','石狩川','北上川'], ans:'信濃川', sub:'地理', level:'★★☆', explain:'長さ1位は信濃川（367km）。流域面積1位は利根川。' },
  { area:'social', q:'米づくりが さかんな 東北地方の平野は？', choices:['庄内平野','関東平野','濃尾平野','大阪平野'], ans:'庄内平野', sub:'地理', level:'★★☆', explain:'山形県の庄内平野は米どころとして有名。' }
];

// 日付キー（YYYY-MM-DD）から、その日の5問を決定的に選ぶ（全端末で同じ）
function fdQuestions(dateKey){
  var seed=0, s=String(dateKey||''); for(var i=0;i<s.length;i++) seed=(seed*31+s.charCodeAt(i))>>>0;
  function nxt(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
  var idx=[], guard=0;
  while(idx.length<5 && guard<200){ guard++; var k=Math.floor(nxt()*FD_POOL.length); if(idx.indexOf(k)<0) idx.push(k); }
  return idx.map(function(k){ return Object.assign({ type:'choice' }, FD_POOL[k]); });
}
// メンバーdocの daily_family（JSON文字列）から「その日の成績」を取り出す（別の日ならnull）
function fdResultFor(json, dateKey){
  try{ var d=JSON.parse(json||'null'); if(d && d.date===dateKey) return { correct:d.correct||0, total:d.total||5 }; }catch(e){}
  return null;
}
