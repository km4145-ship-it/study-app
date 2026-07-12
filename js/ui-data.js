/* ui-data.js：静的UIデータ（キャラ紹介・クエスト・バッジ・日本語音声カタログ/パック）。
   index.html から分離した classic script。データのみ・挙動不変・グローバル。
   メイン <script> より前に読み込む（?v でキャッシュ回避）。 */
var CHAR_INFO = {
  owl:    { role:'学園長・案内役', voice:'やさしい声', desc:'この学園の校長先生。落ち着いていて物知り。あいさつ・教科えらび・学習記録を案内してくれる相談役。', intro:'わたしはミミ学園長。この学園のことは何でも聞いてね。いっしょにがんばろう。' },
  shiba:  { role:'数学の先生', voice:'元気な声', desc:'元気いっぱいの柴犬。数学を担当。テンポよく、いっしょに問題を解いてくれる。', intro:'ぼくはコタロウ！数学はまかせて。テンポよくいこう！' },
  cat:    { role:'国語の先生', voice:'やさしい声', desc:'上品で物知りなネコ。国語を担当。漢字や読解をていねいに教えてくれる。', intro:'わたしはミケ。国語を教えるわ。ことばはていねいにね。' },
  rabbit: { role:'英語の先生', voice:'元気な声', desc:'明るくてすばしっこいウサギ。英語を担当。テンポよく楽しく覚えられる。', intro:'ラビィだよ！英語をいっしょに楽しもう。レッツゴー！' },
  fox:    { role:'理科の先生', voice:'やさしい声', desc:'好奇心おうせいなキツネの博士。理科を担当。「なぜ？」を大切にする。', intro:'わたしはナナ博士。理科の「なぜ？」を見つけよう！' },
  bear:   { role:'社会の先生', voice:'元気な声', desc:'もの知りでおだやかなクマ。社会を担当。世界や歴史をじっくり教えてくれる。', intro:'クマ先生だ。社会の世界はおもしろいぞ。じっくりいこうな。' },
  tiger:  { role:'鬼コーチ', voice:'きびしい声', desc:'きびしいトラの教官。まちがえたとき・むずかしい問題・模擬試験で登場。きびしいけれど、何度でも立ち向かう力をくれる。', intro:'わしはゴウ教官！きびしくいくぞ。だが、何度でも立ち向かえ！' },
  panda:  { role:'応援・なぐさめ役', voice:'やさしい声', desc:'のんびりやさしいパンダ。あせらず学べるように応援してくれる。小学校の復習でも登場。', intro:'パンダ先生だよ。あせらなくて大丈夫。いっしょにゆっくりね。' },
  dolphin:{ role:'お祝い役', voice:'元気な声', desc:'遊び心いっぱいのイルカ。全問正解やA判定など、よくできたときにお祝いに来てくれる。', intro:'マリンだよ！よくできたときはお祝いするね。イェーイ！' },
  penguin:{ role:'復習がかり', voice:'やさしい声', desc:'きちょうめんなペンギン。まちがいノートやまちがい直しの相棒。コツコツ復習を手伝ってくれる。', intro:'ペン太です。まちがい直しは得意。コツコツいきましょう。' },
};

var QUESTS=[
  { id:'q80',  icon:'✏️', title:'今週 80問とく',        get:function(s){return s.q;},     goal:80, pts:150 },
  { id:'d5',   icon:'📅', title:'週5日 学習する',        get:function(s){return s.days;},  goal:5,  pts:150 },
  { id:'ex1',  icon:'📝', title:'模試を1回うける',       get:function(s){return s.exams;}, goal:1,  pts:100 },
  { id:'srs10',icon:'🎓', title:'復習で10問 前進する',   get:function(s){return s.srs;},   goal:10, pts:120 },
];

var BADGES = [
  { id:'first',   emoji:'🌱', title:'はじめの一歩', desc:'最初の1問', check:function(s){ return s.answered>=1; } },
  { id:'q50',     emoji:'📗', title:'50問マスター', desc:'累計50問', check:function(s){ return s.answered>=50; } },
  { id:'q100',    emoji:'📘', title:'100問マスター', desc:'累計100問', check:function(s){ return s.answered>=100; } },
  { id:'q300',    emoji:'📚', title:'300問の達人', desc:'累計300問', check:function(s){ return s.answered>=300; } },
  { id:'streak5', emoji:'🔥', title:'5れんしょう', desc:'5問連続正解', check:function(s){ return s.bestStreak>=5; } },
  { id:'streak10',emoji:'⚡', title:'10れんしょう', desc:'10問連続正解', check:function(s){ return s.bestStreak>=10; } },
  { id:'streak20',emoji:'🌟', title:'20れんしょう', desc:'20問連続正解', check:function(s){ return s.bestStreak>=20; } },
  { id:'perfectP',emoji:'💯', title:'パーフェクト', desc:'練習で全問正解', check:function(s,c){ return c&&c.event==='practiceResult'&&c.pct===1; } },
  { id:'examA',   emoji:'🏆', title:'A判定', desc:'テストでA判定', check:function(s,c){ return c&&c.event==='examResult'&&c.judge==='A'; } },
  { id:'hensa65', emoji:'📈', title:'偏差値65', desc:'テストで偏差値65', check:function(s,c){ return c&&c.event==='examResult'&&c.hensachi>=65; } },
  { id:'hensa70', emoji:'🚀', title:'偏差値70', desc:'テストで偏差値70', check:function(s,c){ return c&&c.event==='examResult'&&c.hensachi>=70; } },
  { id:'allsub',  emoji:'🗺️', title:'5教科チャレンジ', desc:'5教科すべて挑戦', check:function(s){ return s.areas>=5; } },
  { id:'days3',   emoji:'📅', title:'3日れんぞく', desc:'3日連続で学習', check:function(s){ return s.studyDays>=3; } },
  { id:'days7',   emoji:'🗓️', title:'1週間れんぞく', desc:'7日連続で学習', check:function(s){ return s.studyDays>=7; } },
  { id:'goal',    emoji:'🎯', title:'目標たっせい', desc:'今日の目標を達成', check:function(s,c){ return c&&c.event==='goalReached'; } },
  { id:'graduate',emoji:'🎓', title:'にがて克服', desc:'まちがいを卒業', check:function(s,c){ return c&&c.event==='graduate'; } },
];

var JA_VOICE_CATALOG = [
  { name:'コノハ', id:'T7yYq3WpB94yAuOXraRi', cat:'female' },
  { name:'ミオ',   id:'EVmK7c3z026INySFvQLP', cat:'female' },
  { name:'カオリ', id:'G3EZ8O36A0x9lmeOtr0f', cat:'female' },
  { name:'ユウコ', id:'J6YFreR6shJoaDfv7tLf', cat:'female' },
  { name:'サクラ', id:'EGPLqH9Wz2tNLu58EJVR', cat:'female' },
  { name:'シズカ', id:'WQz3clzUdMqvBf0jswZQ', cat:'female' },
  { name:'ヒナ',   id:'lhTvHflPVOqgSWyuWQry', cat:'female' },
  { name:'ユイ',   id:'fUjY9K2nAIwlALOwSiwc', cat:'female' },
  { name:'ハナコ', id:'IIUvcn96WSMnC5WxNypI', cat:'female' },
  { name:'スミレ', id:'KtSs8OSniRPofXnr5PeA', cat:'female' },
  { name:'モリオキ', id:'8EkOjt4xTPGMclNlh1pk', cat:'female' },
  { name:'カグヤ', id:'cOfrdzGy8S6oHQrFrI7b', cat:'male' },
  { name:'コウイチ', id:'aEdqPekRcUrJjvnAh1Eb', cat:'male' },
  { name:'オオタニ', id:'3JDquces8E8bkmvbh6Bc', cat:'male' },
  { name:'トシ',   id:'4E2rGmyoHYBHfdVr32pj', cat:'male' },
  { name:'ヒデキ', id:'nHEVPT3LS1V37bXZNr82', cat:'male' },
  { name:'ケン',   id:'hBWDuZMNs32sP5dKzMuc', cat:'male' },
  { name:'ソラ',   id:'4sirbXwrtRlmPV80MJkQ', cat:'male' },
  { name:'ジュン', id:'JOcmGzB8OFjY8MhjHHEf', cat:'male' },
  { name:'リョウ', id:'pUgmTF2V1ptIKsYb6qON', cat:'male' },
  { name:'タロウ', id:'lHuO7jiPwSHOxWn1h1Fy', cat:'male' },
  { name:'ヤマト', id:'bqpOyYNUu11tjjvRUbKn', cat:'male' },
  { name:'ちいちゃん', id:'GxhGYQesaQaYKePCZDEC', cat:'cute' },
  { name:'レンレン',   id:'RWZ1lnBIIgPBTpyCnKn2', cat:'cute' },
  { name:'そよかぜモチ', id:'l5KWIFmhhsVdaYchBLIn', cat:'cute' },
  { name:'なつ',   id:'B2hIadtwF0bAORTkJkOs', cat:'cute' },
  { name:'あかり', id:'EkK6wL8GaH8IgBZTTDGJ', cat:'cute' },
  { name:'よな',   id:'iRDEKpk9hSfW2qkoxsr7', cat:'cute' },
  { name:'りん',   id:'DIcmWR2oXfmLIlrj43rH', cat:'cute' },
  { name:'いつき', id:'oAlEJuW30knHWhA6cF0e', cat:'cute' },
  { name:'さくや', id:'8kgj5469z1URcH4MB2G4', cat:'cute' },
  { name:'ライム', id:'q3eHxuMah31iifOfMrz0', cat:'cute' }
];

var TTS_VOICE_PACKS = {
  std:   { label:'標準',            ids:{ hana:'T7yYq3WpB94yAuOXraRi', loco:'J6YFreR6shJoaDfv7tLf', kai:'cOfrdzGy8S6oHQrFrI7b' } }, // コノハ/ユウコ/カグヤ
  female:{ label:'女性',            ids:{ hana:'T7yYq3WpB94yAuOXraRi', loco:'J6YFreR6shJoaDfv7tLf', kai:'G3EZ8O36A0x9lmeOtr0f' } }, // コノハ/ユウコ/カオリ
  male:  { label:'男性',            ids:{ hana:'aEdqPekRcUrJjvnAh1Eb', loco:'GKDaBI8TKSBJVhsCLD6n', kai:'3JDquces8E8bkmvbh6Bc' } }, // コウイチ/アサヒ/オオタニ
  anime: { label:'アニメ・かわいい', ids:{ hana:'GxhGYQesaQaYKePCZDEC', loco:'RWZ1lnBIIgPBTpyCnKn2', kai:'l5KWIFmhhsVdaYchBLIn' } }, // ちいちゃん/レンレン/そよかぜモチ
  genki: { label:'元気な子',        ids:{ hana:'8EkOjt4xTPGMclNlh1pk', loco:'EGPLqH9Wz2tNLu58EJVR', kai:'EVmK7c3z026INySFvQLP' } }  // モリオキ/サクラ/ミオ
};
