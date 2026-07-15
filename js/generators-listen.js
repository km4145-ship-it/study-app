/* generators-listen.js：英語リスニング問題（classic script・グローバル）。
   「🔊きいて えらぶ」＝q.listen（英文）を音声合成で再生し、意味を4択で選ぶ。
   単語・文はすべて検証済みテーブル＝答えは必ず正しい（LLM生成文は不使用）。
   generators.js の後に読み込み、engGens へ push する（＝英語の練習・冒険に混ざる）。
   模試・紙プリントには出さない（音が使えないため。buildExam/doPrint側で q.listen を除外）。 */

// 単語（en, ja）。意味の4択のダミーは同じ表からとる＝必ず実在する日本語
var LISTEN_WORDS=[
  ['apple','りんご'],['dog','犬'],['cat','ねこ'],['book','本'],['water','水'],
  ['school','学校'],['friend','友だち'],['music','音楽'],['breakfast','朝食'],['window','まど'],
  ['library','図書館'],['kitchen','台所'],['umbrella','かさ'],['vegetable','野菜'],['holiday','休日'],
  ['weather','天気'],['station','駅'],['hospital','病院'],['museum','博物館'],['dictionary','辞書'],
  ['famous','有名な'],['difficult','むずかしい'],['expensive','（値段が）高い'],['quiet','静かな'],['angry','おこった'],
  ['borrow','借りる'],['arrive','とう着する'],['forget','わすれる'],['choose','えらぶ'],['carry','運ぶ']
];
// 文（en, ja）。中1〜中2の文法範囲・短文のみ
var LISTEN_SENTENCES=[
  ['I play tennis on Sunday.','わたしは日曜日にテニスをします。'],
  ['She is reading a book now.','彼女は今、本を読んでいます。'],
  ['He can swim very fast.','彼はとても速く泳げます。'],
  ['We went to the park yesterday.','わたしたちは昨日、公園に行きました。'],
  ['My mother is cooking in the kitchen.','母は台所で料理をしています。'],
  ['Don\'t open the window.','まどを開けてはいけません。'],
  ['There are two cats under the table.','テーブルの下にねこが2ひきいます。'],
  ['I will call you tomorrow.','明日、あなたに電話します。'],
  ['This question is more difficult than that one.','この問題はあの問題よりむずかしい。'],
  ['I have lived in this town for five years.','わたしはこの町に5年間住んでいます。'],
  ['My brother has just finished his homework.','兄はちょうど宿題を終えたところです。'],
  ['English is spoken in many countries.','英語は多くの国で話されています。']
];

(function(){
  if(typeof engGens==='undefined') return;
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  // 正解以外の選択肢を同じ表からとる（重複なし4択）
  function choicesFrom(table, ansJa){
    var out=[ansJa], guard=0;
    while(out.length<4 && guard<100){ guard++; var c=pick(table)[1]; if(out.indexOf(c)<0) out.push(c); }
    return (typeof shuffleArr==='function') ? shuffleArr(out) : out;
  }
  // 単語リスニング（★★☆）
  engGens.push(function(){
    var w=pick(LISTEN_WORDS);
    return { listen:w[0], q:'🔊 えいごを きいて、いみを えらぼう', type:'choice',
      choices:choicesFrom(LISTEN_WORDS, w[1]), ans:w[1],
      sub:'リスニング（単語）', level:'★★☆', hint:'🔊ボタンで なんども きけるよ',
      explain:'"'+w[0]+'" は「'+w[1]+'」。' };
  });
  // 文リスニング（★★★）
  engGens.push(function(){
    var s=pick(LISTEN_SENTENCES);
    return { listen:s[0], q:'🔊 えいごの文を きいて、いみを えらぼう', type:'choice',
      choices:choicesFrom(LISTEN_SENTENCES, s[1]), ans:s[1],
      sub:'リスニング（文）', level:'★★★', hint:'だれが・いつ・なにを に注意',
      explain:'"'+s[0]+'" ＝「'+s[1]+'」' };
  });
})();
