/* rpg-world.js：冒険モードの世界データ（グローバル）。index.html から分離した classic script。
   RPG_PLAN（教科×10章の計画）から RPG_WORLD（5教科×10章×4ノード＝200ノード）を生成する。
   章のlvが上がるほど単元が難化し、バトルの出題難易度(rpgBuildQuestions)も上がる。
   モンスターアートは js/rpg-assets.js の既存キーのみ使用。メイン <script> より前に読み込む。 */

// 教科メタ
var _RPG_META = {
  math:{ name:'数の大陸', emoji:'🔢', teacher:'shiba', teacherName:'コタロウ', crystal:'数のクリスタル' },
  japanese:{ name:'ことばの大陸', emoji:'📖', teacher:'cat', teacherName:'ミケ', crystal:'ことばのクリスタル' },
  english:{ name:'アルファベット大陸', emoji:'🔤', teacher:'rabbit', teacherName:'ラビィ', crystal:'英語のクリスタル' },
  science:{ name:'じっけんの大陸', emoji:'🧪', teacher:'fox', teacherName:'ナナ博士', crystal:'理科のクリスタル' },
  social:{ name:'れきしの大陸', emoji:'🗺️', teacher:'bear', teacherName:'クマ', crystal:'社会のクリスタル' }
};

// 章プラン（各教科10章・lvが上がるほど難化）
var RPG_PLAN = {
  math: { chapters: [
    { title:'計算の平原', lv:1, topic:'整数と小数の計算', mons:['slime','goblin','bat'], boss:'計算王スラッグ', bossMon:'slugking', nodes:['たしざんスライム','ひきざんゴブリン','くりあがりコウモリ'] },
    { title:'分数の谷', lv:2, topic:'分数のかけ算わり算', mons:['slime','wolf','trent'], boss:'通分キングスラッグ', bossMon:'slugking', nodes:['やくぶんスライム','つうぶんウルフ','ぶんすうトレント'] },
    { title:'正負の草原', lv:3, topic:'正負の数', mons:['goblin','bat','ghost'], boss:'正負王スラッグ', bossMon:'slugking', nodes:['プラスゴブリン','マイナスコウモリ','ぜったいちゴースト'] },
    { title:'文字式の森', lv:4, topic:'文字と式', mons:['trent','slime','goblin'], boss:'式変形スラッグ', bossMon:'slugking', nodes:['文字式トレント','だいにゅうスライム','いこうゴブリン'] },
    { title:'方程式の遺跡', lv:5, topic:'一次方程式', mons:['ghost','wolf','bat'], boss:'方程式キングスラッグ', bossMon:'slugking', nodes:['いこうゴースト','かいのウルフ','てんびんコウモリ'] },
    { title:'比例の丘', lv:6, topic:'比例と反比例', mons:['wolf','trent','slime'], boss:'関数竜プロポル', bossMon:'dragon', nodes:['比例ウルフ','反比例トレント','グラフスライム'] },
    { title:'図形の神殿', lv:7, topic:'平面図形と空間図形', mons:['trent','ghost','goblin'], boss:'図形竜ジオドラ', bossMon:'dragon', nodes:['おうぎ形トレント','立体ゴースト','てんかいずゴブリン'] },
    { title:'連立の魔洞', lv:8, topic:'連立方程式と一次関数', mons:['ghost','wolf','bat'], boss:'関数魔竜リニア', bossMon:'dragon', nodes:['連立ゴースト','だいにゅうウルフ','一次関数コウモリ'] },
    { title:'証明の霊峰', lv:9, topic:'図形の証明と確率', mons:['ghost','trent','goblin'], boss:'証明幻竜プルーフ', bossMon:'dragon', nodes:['合同ゴースト','証明トレント','確率ゴブリン'] },
    { title:'入試の魔宮', lv:10, topic:'規則性・関数と図形の融合', mons:['ghost','wolf','trent'], boss:'入試魔竜ファイナル', bossMon:'dragon', nodes:['規則性ゴースト','融合ウルフ','難問トレント'] }
  ]},
  japanese:{ chapters:[
    { title:'ことばの野原', lv:1, topic:'漢字の読み書き', mons:['inkblob','fudebird','inkblob'], boss:'漢字おに小僧', bossMon:'kanjioni', nodes:['音読みインク','訓読みふでどり','書き取りインク'] },
    { title:'ことわざの林', lv:2, topic:'語句・ことわざ', mons:['fudebird','inkblob','fudebird'], boss:'語句おに', bossMon:'kanjioni', nodes:['ことわざふでどり','慣用句インク','四字熟語ふでどり'] },
    { title:'品詞の谷', lv:3, topic:'言葉の種類・品詞', mons:['inkblob','fudebird','inkblob'], boss:'品詞おに', bossMon:'kanjioni', nodes:['名詞インク','動詞ふでどり','形容詞インク'] },
    { title:'文の森', lv:4, topic:'文の組み立て・文節', mons:['fudebird','inkblob','fudebird'], boss:'文法おに大将', bossMon:'kanjioni', nodes:['文節ふでどり','主語インク','述語ふでどり'] },
    { title:'説明文の遺跡', lv:5, topic:'説明文の読解', mons:['inkblob','fudebird','inkblob'], boss:'読解おに', bossMon:'kanjioni', nodes:['段落インク','要点ふでどり','接続語インク'] },
    { title:'物語の館', lv:6, topic:'小説・物語の読解', mons:['fudebird','inkblob','fudebird'], boss:'物語おに', bossMon:'kanjioni', nodes:['心情ふでどり','情景インク','人物ふでどり'] },
    { title:'詩歌の丘', lv:7, topic:'詩・短歌・俳句', mons:['inkblob','fudebird','inkblob'], boss:'詩歌おに', bossMon:'kanjioni', nodes:['短歌インク','俳句ふでどり','表現インク'] },
    { title:'古文の社', lv:8, topic:'古文入門', mons:['fudebird','inkblob','fudebird'], boss:'古文魔おに', bossMon:'kanjioni', nodes:['歴史仮名ふでどり','古語インク','係り結びふでどり'] },
    { title:'記述の霊堂', lv:9, topic:'記述・要約', mons:['inkblob','fudebird','inkblob'], boss:'記述幻おに', bossMon:'kanjioni', nodes:['要約インク','記述ふでどり','条件作文インク'] },
    { title:'論説の魔殿', lv:10, topic:'論説文・要旨', mons:['fudebird','inkblob','fudebird'], boss:'国語魔王おに', bossMon:'kanjioni', nodes:['論理ふでどり','要旨インク','難読漢字ふでどり'] }
  ]},
  english:{ chapters:[
    { title:'アルファベット草原', lv:1, topic:'アルファベットとローマ字', mons:['abcube','qbird','abcube'], boss:'文法モロー見習い', bossMon:'grammaro', nodes:['大文字キューブ','小文字バード','ローマ字キューブ'] },
    { title:'あいさつの村', lv:2, topic:'あいさつ・基本単語', mons:['qbird','abcube','qbird'], boss:'あいさつモロー', bossMon:'grammaro', nodes:['グリーティングバード','単語キューブ','数字バード'] },
    { title:'be動詞の丘', lv:3, topic:'be動詞', mons:['abcube','qbird','abcube'], boss:'be動詞モロー', bossMon:'grammaro', nodes:['am/isキューブ','areバード','否定文キューブ'] },
    { title:'動詞の森', lv:4, topic:'一般動詞', mons:['qbird','abcube','qbird'], boss:'動詞モロー将軍', bossMon:'grammaro', nodes:['三単現バード','否定doキューブ','疑問文バード'] },
    { title:'複数形の谷', lv:5, topic:'名詞の複数形', mons:['abcube','qbird','abcube'], boss:'複数モロー', bossMon:'grammaro', nodes:['複数sキューブ','esバード','数えられるキューブ'] },
    { title:'進行形の湖', lv:6, topic:'代名詞・現在進行形', mons:['qbird','abcube','qbird'], boss:'進行モロー', bossMon:'grammaro', nodes:['代名詞バード','ingキューブ','進行形バード'] },
    { title:'過去の遺跡', lv:7, topic:'canや過去形', mons:['abcube','qbird','abcube'], boss:'過去モロー', bossMon:'grammaro', nodes:['canキューブ','過去形バード','不規則キューブ'] },
    { title:'比較の魔峠', lv:8, topic:'不定詞・比較', mons:['qbird','abcube','qbird'], boss:'比較魔モロー', bossMon:'grammaro', nodes:['不定詞バード','比較級キューブ','最上級バード'] },
    { title:'完了の霊塔', lv:9, topic:'受け身・現在完了', mons:['abcube','qbird','abcube'], boss:'完了幻モロー', bossMon:'grammaro', nodes:['受け身キューブ','現在完了バード','関係詞キューブ'] },
    { title:'長文の魔城', lv:10, topic:'長文読解・整序英作文', mons:['qbird','abcube','qbird'], boss:'英語魔王モロー', bossMon:'grammaro', nodes:['長文バード','整序キューブ','リスニングバード'] }
  ]},
  science:{ chapters:[
    { title:'観察の草はら', lv:1, topic:'身のまわりの生物', mons:['microbe','flaskun','microbe'], boss:'観察ボルト', bossMon:'voltdrake', nodes:['ルーペびせいぶつ','こんちゅうフラスコ','スケッチびせいぶつ'] },
    { title:'天気の丘', lv:2, topic:'天気と季節', mons:['flaskun','microbe','flaskun'], boss:'天気ボルト', bossMon:'voltdrake', nodes:['雲フラスコ','気温びせいぶつ','季節フラスコ'] },
    { title:'植物の森', lv:3, topic:'植物のつくり', mons:['microbe','flaskun','microbe'], boss:'植物ボルト', bossMon:'voltdrake', nodes:['葉っぱびせいぶつ','花フラスコ','根っこびせいぶつ'] },
    { title:'物質の実験室', lv:4, topic:'身のまわりの物質', mons:['flaskun','microbe','flaskun'], boss:'物質ボルト', bossMon:'voltdrake', nodes:['金属フラスコ','気体びせいぶつ','密度フラスコ'] },
    { title:'光と音の谷', lv:5, topic:'光・音・力', mons:['flaskun','microbe','flaskun'], boss:'力ボルト', bossMon:'voltdrake', nodes:['反射フラスコ','音波びせいぶつ','ばねフラスコ'] },
    { title:'水溶液の湖', lv:6, topic:'水溶液と状態変化', mons:['microbe','flaskun','microbe'], boss:'溶液電竜ボルト', bossMon:'voltdrake', nodes:['溶解びせいぶつ','ろ過フラスコ','じょうはつびせいぶつ'] },
    { title:'大地の洞窟', lv:7, topic:'大地の変化', mons:['flaskun','microbe','flaskun'], boss:'大地電竜ボルト', bossMon:'voltdrake', nodes:['地層フラスコ','火山びせいぶつ','化石フラスコ'] },
    { title:'化学変化の魔炉', lv:8, topic:'化学変化と原子・分子', mons:['flaskun','microbe','flaskun'], boss:'化学魔竜ボルト', bossMon:'voltdrake', nodes:['化学式フラスコ','酸化びせいぶつ','分解フラスコ'] },
    { title:'電流の霊塔', lv:9, topic:'電流と磁界', mons:['microbe','flaskun','microbe'], boss:'電流幻竜ボルト', bossMon:'voltdrake', nodes:['オームびせいぶつ','電流フラスコ','磁界びせいぶつ'] },
    { title:'理科の魔天文台', lv:10, topic:'総合・記述', mons:['flaskun','microbe','flaskun'], boss:'理科魔王ボルト', bossMon:'voltdrake', nodes:['天体フラスコ','遺伝びせいぶつ','考察フラスコ'] }
  ]},
  social:{ chapters:[
    { title:'地図の平野', lv:1, topic:'地図と都道府県', mons:['mapmoth','haniwa','mapmoth'], boss:'地図王トキ', bossMon:'tokiou', nodes:['方位マップモス','県庁はにわ','地図記号マップモス'] },
    { title:'くらしの里', lv:2, topic:'日本のくらしと産業', mons:['haniwa','mapmoth','haniwa'], boss:'産業王トキ', bossMon:'tokiou', nodes:['農業はにわ','工業マップモス','漁業はにわ'] },
    { title:'世界の大地', lv:3, topic:'世界の姿と地理', mons:['mapmoth','haniwa','mapmoth'], boss:'世界王トキ', bossMon:'tokiou', nodes:['六大陸マップモス','三海洋はにわ','緯度経度マップモス'] },
    { title:'日本の山河', lv:4, topic:'日本の地形と気候', mons:['haniwa','mapmoth','haniwa'], boss:'地形王トキ', bossMon:'tokiou', nodes:['山脈はにわ','気候マップモス','川はにわ'] },
    { title:'地方の街道', lv:5, topic:'日本の地域', mons:['mapmoth','haniwa','mapmoth'], boss:'地域王トキ', bossMon:'tokiou', nodes:['地方マップモス','人口はにわ','特産マップモス'] },
    { title:'古代の遺跡', lv:6, topic:'古代の日本', mons:['haniwa','mapmoth','haniwa'], boss:'古代王トキ', bossMon:'tokiou', nodes:['縄文はにわ','古墳はにわ','律令マップモス'] },
    { title:'中世の城下', lv:7, topic:'中世の日本', mons:['haniwa','mapmoth','haniwa'], boss:'中世魔王トキ', bossMon:'tokiou', nodes:['武士はにわ','幕府マップモス','戦乱はにわ'] },
    { title:'近世の城', lv:8, topic:'近世の日本', mons:['mapmoth','haniwa','mapmoth'], boss:'近世魔王トキ', bossMon:'tokiou', nodes:['天下統一マップモス','鎖国はにわ','改革マップモス'] },
    { title:'近代の霊道', lv:9, topic:'近代から現代', mons:['haniwa','mapmoth','haniwa'], boss:'近代幻王トキ', bossMon:'tokiou', nodes:['明治はにわ','大戦マップモス','戦後はにわ'] },
    { title:'公民の魔議堂', lv:10, topic:'公民・資料読み取り', mons:['mapmoth','haniwa','mapmoth'], boss:'社会魔王トキ', bossMon:'tokiou', nodes:['憲法マップモス','経済はにわ','資料マップモス'] }
  ]}
};

// ノード位置（縦長マップ：gi=0 が最初＝下、進むほど上へ・蛇行）
function _rpgPos(gi, total){
  var t = total>1 ? gi/(total-1) : 0;
  return { x:Math.round(50 + 30*Math.sin(gi*0.9)), y:Math.round(96 - t*92) };
}

// プラン → RPG_WORLD（5教科×10章×4ノード）
var RPG_WORLD = (function(){
  var world = {};
  Object.keys(_RPG_META).forEach(function(area){
    var meta = _RPG_META[area], chs = (RPG_PLAN[area] && RPG_PLAN[area].chapters) || [];
    var total = 0; chs.forEach(function(ch){ total += ((ch.nodes||[]).length + 1); });
    var gi = 0;
    var chapters = chs.map(function(ch, ci){
      var lv = ch.lv || (ci+1), names = ch.nodes || [], mons = (ch.mons && ch.mons.length) ? ch.mons : ['slime'];
      var nodes = [];
      for (var i=0;i<names.length;i++){
        nodes.push({ id:'n'+(i+1), type:'zako', name:names[i], mon:mons[i%mons.length], count:4+Math.floor(lv/2), lv:lv, pos:_rpgPos(gi++, total) });
      }
      nodes.push({ id:'boss', type:'boss', name:ch.boss||'ボス', mon:ch.bossMon||'dragon', count:6+Math.floor(lv/2), lv:lv, pos:_rpgPos(gi++, total) });
      return { id:area.charAt(0)+(ci+1), title:ch.title||('第'+(ci+1)+'章'), story:area+'_ch'+(ci+1), lv:lv, topic:ch.topic||'', nodes:nodes };
    });
    world[area] = Object.assign({}, meta, { chapters:chapters });
  });
  return world;
})();

var RPG_CONTINENTS = ['math','japanese','english','science','social'];
var RPG_CASTLE_POS = {x:50,y:5};
var RPG_GOAL_POS = {x:50,y:2};

// ---- ストーリー（あたたかく・ほぼひらがな）----
var RPG_STORY = {
  prologue:[
    { who:'', char:'scroll', text:'むかしむかし、まなびの王国は「ちえの光」で かがやいていました。' },
    { who:'ミミ学園長', char:'owl', text:'でも ある日、魔王シグマが「モヤの霧」で 国をつつみこんでしまったの。' },
    { who:'ミミ学園長', char:'owl', text:'ちえは バラバラの モンスターに かわり、動物の先生たちも 霧の中に とらわれてしまった…。' },
    { who:'ミミ学園長', char:'owl', text:'そこで あなたの出番よ、見習い勇者さん！ 問題をといて モンスターを たおしてほしいの。' },
    { who:'ミミ学園長', char:'owl', text:'たたかうたびに あなたは強くなる。そして「ちえのクリスタル」を あつめれば…' },
    { who:'ミミ学園長', char:'owl', text:'魔王シグマ ＝「偏差値65の壁」に いどむ資格が できるのよ。' },
    { who:'？？？', char:'villain', text:'クックック…ちっぽけな 見習いが なにを できる。この霧は はれぬぞ…。' },
    { who:'ミミ学園長', char:'owl', text:'…いまのが 魔王シグマ。こわがらないで。さあ、地図をひらいて！ 冒険の はじまりよ。' }
  ]
};
// 各章の導入セリフを自動生成（章タイトル＋単元）
(function(){
  Object.keys(RPG_PLAN).forEach(function(area){
    (RPG_PLAN[area].chapters||[]).forEach(function(ch, ci){
      RPG_STORY[area+'_ch'+(ci+1)] = [{ who:'ミミ学園長', char:'owl',
        text:'「'+ch.title+'」だよ。'+(ch.topic?'ここは『'+ch.topic+'』のモンスターがいる。':'')+' らくに 1問ずつ こたえてね！' }];
    });
  });
})();
