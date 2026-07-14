/* gacha-story.js：ガチャの世界観レイヤ（classic script・グローバル・純データ＋純関数）。
   「ふしぎな行商人 たぬすけ」🦝 がガチャの主人。①ガチャ画面のあいさつ ②週替わりピックアップ
   （weekIdハッシュで決定的に選出＝レイドと同じ方式・同期不要で全端末一致） ③開封時のひとこと
   ④セット完成のごほうびストーリー ⑤レア装備のフレーバーテキスト（lore）。
   DOM/localStorageに触れない＝テスト容易。UI側は index.html（showGacha/rpgGachaReveal/rpgAnnounceCollect）。 */

// ===== 週ID（月曜はじまり・ゼロ埋め）。js/duel.js と同じ規約だが、単体テストできるよう自己完結で持つ =====
function gsPad2(n){ return (n<10?'0':'')+n; }
function gsWeekId(now){
  var d=new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var dow=(d.getDay()+6)%7;   // 月=0 … 日=6
  var mon=new Date(d.getFullYear(), d.getMonth(), d.getDate()-dow);
  return mon.getFullYear()+'-'+gsPad2(mon.getMonth()+1)+'-'+gsPad2(mon.getDate());
}
function gsHash(s){ var h=0; s=String(s); for(var i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; }

// ===== 週替わりピックアップ：COS_SETSから決定的に1セット選ぶ（対象アイテムの排出率が2倍になる） =====
function gachaPickupSet(sets, weekId){
  if(!sets || !sets.length) return null;
  return sets[gsHash('pickup:'+weekId) % sets.length];
}

// ===== 行商人のあいさつ（ガチャ画面の吹き出し。seedで決定的にローテーション） =====
var GS_GREETS=[
  'いらっしゃい！ きょうも いいものが 入っておるぞ🦝',
  'ふっふっふ…この宝箱、なにが 出るかは わしにも わからんのじゃ',
  'べんきょうで ためた コインは うらぎらんぞ。さあ、ひいてみい！',
  'レジェンドレア（LR）を 出したものは まだ すくない…きみは どうかな？',
  'ダブっても コインに かわるから あんしんじゃよ',
  '天井まで ひけば アルティメットレアが かくてい。コツコツが いちばんじゃ'
];
function gsGreet(pickupSet, seedStr){
  var lines=GS_GREETS.slice();
  if(pickupSet) lines.push('こんしゅうは「'+pickupSet.name+'」セットが でやすいぞ！ わしの おすすめじゃ🎪');
  return lines[gsHash('greet:'+(seedStr||''))%lines.length];
}

// ===== 開封時のひとこと（レア度ティア別） =====
var GS_CHEERS={
  low:['ふむ、わるくない ひきじゃ','これも りっぱな そうびじゃよ'],
  mid:['ほほう！ なかなかの ひきじゃな','おぬし、ツキが あるのう'],
  high:['な、なんと…！ これは おどろいた！','わしの店でも めったに 出ん いっぴんじゃ！'],
  legend:['…！！ でんせつの いっぴん…！ きみは えらばれし ひきてじゃ！']
};
function gsCheer(rank, seedStr){
  var tier=(rank>=7)?'legend':(rank>=6)?'high':(rank>=4)?'mid':'low';
  var lines=GS_CHEERS[tier];
  return lines[gsHash('cheer:'+(seedStr||''))%lines.length];
}

// ===== セット完成の ごほうびストーリー（rpgStoryPlay 形式 {who,char,text} の配列） =====
// char:'merchant' は index.html の _rpgPortrait が 🦝 に解決する。既読は s.story['gs_<setId>']
var GS_SET_STORIES={
  set_wizard:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'ほう…「まほうつかい」セットを そろえたか。' },
    { who:'たぬすけ（行商人）', char:'merchant', text:'そのぼうしは 大まほうつかいメルリンの わすれもの。かぶると 頭が スッキリするそうじゃ。' },
    { who:'', char:'scroll', text:'—— つぎの もしで、そのちからを ためしてみよう。' }
  ],
  set_knight:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'「けんし」セット かんせい！ りっぱな けんしの すがたじゃ。' },
    { who:'たぬすけ（行商人）', char:'merchant', text:'そのたては むかし、魔王シグマの ほのおを ふせいだと いわれておる。' },
    { who:'', char:'scroll', text:'—— まちがいを おそれない者こそ、ほんものの けんし。' }
  ],
  set_king:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'おうかんと トロフィー…「おうさま」セットじゃと！？' },
    { who:'たぬすけ（行商人）', char:'merchant', text:'まなびの王国の 玉座が、あたらしい王を まっておるぞ。' },
    { who:'', char:'scroll', text:'—— 王の しごとは、まいにち すこしずつ つよくなること。' }
  ],
  set_angel:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'「てんし」セット…なんと まぶしい。' },
    { who:'たぬすけ（行商人）', char:'merchant', text:'てんしのわは、がんばる子の 頭上にしか とどまらんのじゃ。' },
    { who:'', char:'scroll', text:'—— きみの どりょくは、ちゃんと 見られている。' }
  ],
  set_rainbow:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'「にじいろ」セット かんせい！ あめあがりの 空みたいじゃな。' },
    { who:'', char:'scroll', text:'—— にじは、あめ（まちがい）のあとにしか かからない。' }
  ],
  set_galaxy:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'ぎ、「ぎんが」セット…！ わしの店の さいこうきゅうひんじゃ…！' },
    { who:'たぬすけ（行商人）', char:'merchant', text:'よぞらを まとう者は、どんな もんだいも 星のかずほど とける…と いわれておる。' },
    { who:'', char:'scroll', text:'—— ぎんがの ゆうしゃよ、つぎは 魔王城で 会おう。' }
  ],
  set_sky:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'つばさと きんとうん…「おおぞら」セットじゃな！' },
    { who:'', char:'scroll', text:'—— そらの上から 見れば、むずかしい もんだいも ちいさく 見える。' }
  ],
  set_speed:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'「スピードスター」セット！ はやい はやい！' },
    { who:'', char:'scroll', text:'—— でも いちばん はやいのは、まいにち つづける子 じゃよ。' }
  ],
  set_aibou:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'あいぼうの おしゃれセットまで そろえるとは…あいぼう思いじゃのう。' },
    { who:'', char:'scroll', text:'—— なかまを たいせつにする子は、なかまに たすけられる。' }
  ]
};
// セット→ストーリー（専用が無いセットは 汎用のお祝い1本を組み立てる）
function gsSetStory(set){
  if(!set || !set.id) return null;
  if(GS_SET_STORIES[set.id]) return GS_SET_STORIES[set.id];
  return [
    { who:'たぬすけ（行商人）', char:'merchant', text:'「'+(set.name||'')+'」セット かんせい！ みごとじゃ！' },
    { who:'', char:'scroll', text:'—— コレクションは きみの がんばりの きろく。' }
  ];
}

// ===== レア装備の いいつたえ（lore）。開封カードときせかえの ながめる楽しみ =====
var GS_LORE={
  h_crown:   'まなびの王国の 初代おうさまの おうかん。',
  h_halo:    'てんかいの もんばんが おとした…と いわれる わ。',
  d_trophy:  'でんせつの 百連勝チャンピオンの トロフィー。',
  a_galaxy:  'よぞらを そのまま とじこめた オーラ。',
  a_rain:    'あめあがりの 空から わけてもらった ひかり。',
  hd_excal:  'えらばれし者にしか ぬけない…はずだった せいけん。',
  hd_wand2:  'ふると 星くずが こぼれる ふしぎな ワンド。',
  bk_angel:  'せなかに つけると 心が かるくなる つばさ。',
  bk_rainbow:'にじの かなたから とんできた つばさ。',
  bk_galaxy: 'ほしぞらを 裁って つくった マント。',
  rd_star:   'ねがいごとを のせて はしる ながれぼし。',
  rd_aurora: '北のはての 空だけを はしる ひかりの そり。',
  rd_rocket: 'つきまで 3びょうの じまんの ロケット。',
  rd_uni:    'ほんものの ユニコーン。にんじんが だいすき。',
  fr_galaxy: 'ぎんがの ふちどり。ランキングで ひときわ かがやく。',
  ah_rainbow:'あいぼうの あたまに にじが かかる かんむり。'
};
