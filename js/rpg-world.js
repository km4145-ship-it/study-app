/* rpg-world.js：index.html から分離した classic script（データのみ・挙動不変・グローバル）。
   メイン <script> より前に読み込む（?v でキャッシュ回避）。 */
var RPG_WORLD = {
  math:{ name:'数の大陸', emoji:'🔢', teacher:'shiba', teacherName:'コタロウ', crystal:'数のクリスタル',
    chapters:[
      { id:'m1', title:'計算の平原', story:'m1', nodes:[
        { id:'n1', type:'zako', name:'けいさんスライム', mon:'slime',  count:6, lv:1, pos:{x:22,y:90} },
        { id:'n2', type:'zako', name:'たしざんゴブリン', mon:'goblin', count:6, lv:1, pos:{x:60,y:80} },
        { id:'n3', type:'zako', name:'ひきざんコウモリ', mon:'bat',    count:6, lv:2, pos:{x:32,y:68} },
        { id:'boss',type:'boss',name:'計算王 スラッグ',  mon:'slugking',count:8, lv:2, pos:{x:70,y:58} }
      ]},
      { id:'m2', title:'まよいの森', story:'m2', nodes:[
        { id:'n1', type:'zako', name:'かけざまウルフ',   mon:'wolf',  count:6, lv:2, pos:{x:30,y:47} },
        { id:'n2', type:'zako', name:'わりざまトレント', mon:'trent', count:6, lv:3, pos:{x:66,y:39} },
        { id:'n3', type:'zako', name:'めいろオバケ',     mon:'ghost', count:7, lv:3, pos:{x:34,y:28} },
        { id:'boss',type:'boss',name:'森の主 ウッドラゴン',mon:'dragon',count:10,lv:4, pos:{x:64,y:18} }
      ]}
    ]},
  japanese:{ name:'ことばの大陸', emoji:'📖', teacher:'cat', teacherName:'ミケ', crystal:'ことばのクリスタル',
    chapters:[
      { id:'j1', title:'ことばの森', story:'j1', nodes:[
        { id:'n1', type:'zako', name:'すみスライム',   mon:'inkblob',  count:6, lv:1, pos:{x:26,y:84} },
        { id:'n2', type:'zako', name:'ふでゴースト',   mon:'fudebird', count:6, lv:2, pos:{x:62,y:58} },
        { id:'boss',type:'boss',name:'かんじ大王',     mon:'kanjioni', count:9, lv:3, pos:{x:50,y:26} }
      ]}
    ]},
  english:{ name:'アルファベット大陸', emoji:'🔤', teacher:'rabbit', teacherName:'ラビィ', crystal:'英語のクリスタル',
    chapters:[
      { id:'e1', title:'ABCの砂ばく', story:'e1', nodes:[
        { id:'n1', type:'zako', name:'アルファゴーレム', mon:'abcube',   count:6, lv:1, pos:{x:26,y:84} },
        { id:'n2', type:'zako', name:'はてなバード',     mon:'qbird',    count:6, lv:2, pos:{x:62,y:58} },
        { id:'boss',type:'boss',name:'グラマー大王',     mon:'grammaro', count:9, lv:3, pos:{x:50,y:26} }
      ]}
    ]},
  science:{ name:'じっけんの大陸', emoji:'🧪', teacher:'fox', teacherName:'ナナ博士', crystal:'理科のクリスタル',
    chapters:[
      { id:'s1', title:'じっけんの洞くつ', story:'s1', nodes:[
        { id:'n1', type:'zako', name:'フラスコン',     mon:'flaskun',   count:6, lv:1, pos:{x:26,y:84} },
        { id:'n2', type:'zako', name:'ミクロん',       mon:'microbe',   count:6, lv:2, pos:{x:62,y:58} },
        { id:'boss',type:'boss',name:'ボルトドラゴン', mon:'voltdrake', count:9, lv:3, pos:{x:50,y:26} }
      ]}
    ]},
  social:{ name:'れきしの大陸', emoji:'🗺️', teacher:'bear', teacherName:'クマ', crystal:'社会のクリスタル',
    chapters:[
      { id:'c1', title:'れきしの遺跡', story:'c1', nodes:[
        { id:'n1', type:'zako', name:'ちずモス',   mon:'mapmoth', count:6, lv:1, pos:{x:26,y:84} },
        { id:'n2', type:'zako', name:'はにわ兵',   mon:'haniwa',  count:6, lv:2, pos:{x:62,y:58} },
        { id:'boss',type:'boss',name:'トキ大王',   mon:'tokiou',  count:9, lv:3, pos:{x:50,y:26} }
      ]}
    ]}
};
var RPG_CONTINENTS = ['math','japanese','english','science','social'];
var RPG_CASTLE_POS = {x:50,y:6};
var RPG_GOAL_POS = {x:50,y:8};

// ---- ストーリー（あたたかく・ほぼひらがな・小4も中1も読める）----
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
  ],
  m1:[ { who:'ミミ学園長', char:'owl', text:'ここは「計算の平原」。まずは たしざん・ひきざんの モンスターたち。落ちついて 1問ずつ こたえてね。' } ],
  m2:[ { who:'ミミ学園長', char:'owl', text:'「まよいの森」の おくには つよい主がいる。ここをぬければ、とらわれた先生を 救えるはず！' } ],
  j1:[ { who:'ミミ学園長', char:'owl', text:'「ことばの森」だよ。漢字や ことばの モンスターがいる。ミケ先生が この森に とらわれているの。助けてあげて！' } ],
  e1:[ { who:'ミミ学園長', char:'owl', text:'「ABCの砂ばく」。英語の モンスターたち。ラビィ先生を さがしに行こう！' } ],
  s1:[ { who:'ミミ学園長', char:'owl', text:'「じっけんの洞くつ」。理科の ふしぎな モンスター。ナナ博士が まっているわ。' } ],
  c1:[ { who:'ミミ学園長', char:'owl', text:'「れきしの遺跡」。地図や 歴史の モンスター。クマ先生を たすけよう！' } ]
};
