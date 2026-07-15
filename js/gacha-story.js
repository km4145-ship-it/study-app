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
  ],
  set_ninja:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'しっ…！「しのび」セットじゃな。気配を けして べんきょうする者は つよい。' },
    { who:'', char:'scroll', text:'—— まいにち こっそり つみあげた どりょくは、ある日 とつぜん 目に見える。' }
  ],
  set_ocean:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'「うみ」セット かんせい！ しおの かおりが するのう。' },
    { who:'', char:'scroll', text:'—— 知らないことの うみは ひろい。だから たんけんは おわらない。' }
  ],
  set_dragon:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'り、「りゅう」セットを そろえたじゃと…！？ でんせつ級の コレクターじゃ！' },
    { who:'たぬすけ（行商人）', char:'merchant', text:'りゅうは、あきらめなかった者の かたにしか とまらん。' },
    { who:'', char:'scroll', text:'—— りゅうつかいよ、その せなかの つばさは きみの どりょくの かたちじゃ。' }
  ],
  set_sweet:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'「おかし」セット！ わしも あまいものには 目が ないのじゃ…ひとくち くれんか？' },
    { who:'', char:'scroll', text:'—— がんばった あとの おやつは、せかいで いちばん あまい。' }
  ],
  set_star:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'「よぞら」セット かんせい！ 星を あつめる子には いいことが あるそうじゃ。' },
    { who:'', char:'scroll', text:'—— 見上げれば 星。ふりかえれば きみの 学んだ あしあと。' }
  ],
  set_shine:[
    { who:'たぬすけ（行商人）', char:'merchant', text:'金と銀の わく…「ピカピカ」セットじゃ！ ランキングで まぶしいこと まちがいなしじゃ。' },
    { who:'', char:'scroll', text:'—— いちばん かがやくのは、わくの中の きみ じしん。' }
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

// ===== たぬすけのお店：日替わりラインナップ（決定的＝同じ日は家族全員おなじ品揃え） =====
// pool=[{id,r,price,...}]から6品：低レア(N〜HR)4＋中レア(SR/SSR)1＋高レア(UR/LR)1。
// 高レアは「プレミアム価格」＝定価の3倍（ガチャの価値を壊さないための割増）。
// 選出はdateKeyハッシュをシードにしたLCGで決定的（Math.random不使用＝テスト可能）
var GACHA_SHOP_PREMIUM=3;
function gachaShopLineup(pool, dateKey){
  pool=pool||[];
  var low=pool.filter(function(it){ return ['N','HN','R','HR'].indexOf(it.r||'N')>=0; });
  var mid=pool.filter(function(it){ return it.r==='SR'||it.r==='SSR'; });
  var high=pool.filter(function(it){ return it.r==='UR'||it.r==='LR'; });
  var seed=gsHash('shop:'+dateKey);
  function nxt(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
  function take(arr,n){ var a=arr.slice(), out=[]; while(a.length&&out.length<n){ out.push(a.splice(Math.floor(nxt()*a.length),1)[0]); } return out; }
  return take(low,4).map(function(it){ return { it:it, price:it.price||60 }; })
    .concat(take(mid,1).map(function(it){ return { it:it, price:it.price||150 }; }))
    .concat(take(high,1).map(function(it){ return { it:it, price:(it.price||300)*GACHA_SHOP_PREMIUM }; }));
}

// ===== スタンプカード：ガチャを10回ひくごとに🎟️1まい =====
// pulls（のべ回数）とclaims（受取回数）はどちらも「増えるだけ」＝counterのmaxマージで同期しても壊れない
var GACHA_STAMP_SIZE=10;
function gachaStamps(pulls, claims){
  pulls=parseInt(pulls,10)||0; claims=parseInt(claims,10)||0;
  var claimable=Math.max(0, Math.floor(pulls/GACHA_STAMP_SIZE)-claims);
  var stamps=claimable>0 ? GACHA_STAMP_SIZE : Math.max(0, pulls-claims*GACHA_STAMP_SIZE);
  return { stamps:stamps, claimable:claimable };
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
  ah_rainbow:'あいぼうの あたまに にじが かかる かんむり。',
  h_wiz:     '大まほうつかいの みならい用。かぶると 頭が スッキリ。',
  h_king:    'まなびの王国の おうじさまの おさがり。',
  f_star:    'ひとみに 星が やどる。やる気の しるし。',
  d_wand:    'ふりかたで 音が かわる ふしぎな つえ。',
  d_shield:  '魔王シグマの ほのおを 3回 ふせいだ たて。',
  d_sword:   'けんしの きほんの いっぽん。手入れは かかさずに。',
  a_holy:    'せいなる ひかり。よふかしの ねむけも はらうという。',
  a_phantom: 'まぼろしの オーラ。じっと見ると 目が あう…かも。',
  a_thunder: 'かみなりぐもから わけてもらった ちから。',
  a_sakura:  'まい年 はるに いちばん きれいに ひかる。',
  a_fire:    'もえる やるきが かたちに なった オーラ。',
  hh_dragon: 'りゅうの ちからが やどる かぶと。ちょっと おもい。',
  hh_uni:    'ユニコーンの たてがみで あんだ ぼうし。',
  hh_comet:  'すいせいの しっぽを つかまえて つくった。',
  hh_galaxy: 'かぶると よぞらが ちかくなる…気がする。',
  hh_rain:   'あめあがりにしか 見つからない ぼうし。',
  hf_dragon: 'りゅうの めんを つけると こわいものなし。',
  hf_star2:  '星のかがやきを かおに まとう。',
  hf_rain:   'にじいろの めん。わらうと 色が かわる。',
  hf_angel:  'てんしの かお。うそを つくと くもるらしい。',
  hd_orb:    'のぞきこむと あしたの てんきが 見える…？',
  hd_katana: 'めいじんが きたえた 二本目の かたな。',
  hd_trophy2:'100れんしゅうの あかし。もちぬしは えらばれる。',
  ha_shadow: 'かげの オーラ。しずかに もえる やるき。',
  ph_dragon: 'ペットが ちいさな りゅうに へんしん。',
  ph_uni:    'ペットに つのが はえる ふしぎな かんむり。',
  ph_rain:   'ペットの あたまに ちいさな にじ。',
  ph_galaxy: 'ペットが よぞらを まとう。ねごとが ふえる。',
  bk_bolt:   'いなずまを おりこんだ マント。はしると ゴロゴロ鳴る。',
  bk_fire:   'ほのおの マント。さむい日でも ポカポカ。',
  bk_dragon: 'りゅうの つばさ。たかく とべそうな 気がしてくる。',
  rd_sleigh: '北のはてから きた トナカイの そり。',
  rd_dragonride:'りゅうの せなかは せかいで いちばん 見晴らしがいい。',
  ah_crown:  'あいぼうかいの おうさまの あかし。'
};
