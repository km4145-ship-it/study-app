/* cos-data.js：index.html から分離した classic script（データのみ・挙動不変・グローバル）。
   メイン <script> より前に読み込む（?v でキャッシュ回避）。 */
var COS_DATA={
  hero:{
    hat:[ {id:'h_cap',em:'🧢',name:'キャップ',price:30,r:'N',hsvg:'<path d="M30 30 Q60 4 90 30 Z" fill="#3b82f6" stroke="#2563eb" stroke-width="2"/><path d="M87 29 Q104 29 107 37 Q90 33 87 33Z" fill="#2563eb"/><circle cx="60" cy="8" r="3" fill="#f59e0b"/>'}, {id:'h_straw',em:'👒',name:'むぎわら',price:30,r:'N',hsvg:'<ellipse cx="60" cy="27" rx="40" ry="8" fill="#f0d391" stroke="#c99a45" stroke-width="1.5"/><path d="M42 27 Q44 9 60 9 Q76 9 78 27Z" fill="#f5dea6" stroke="#c99a45" stroke-width="1.5"/><path d="M43 23 Q60 27 77 23" stroke="#e2748a" stroke-width="3" fill="none"/>'}, {id:'h_party',em:'🥳',name:'パーティ',price:40,r:'N',hsvg:'<path d="M60 3 L47 30 L73 30Z" fill="#f472b6" stroke="#db2777" stroke-width="1.5"/><circle cx="60" cy="3" r="3.5" fill="#fde047"/><circle cx="56" cy="18" r="2" fill="#fff"/><circle cx="64" cy="14" r="2" fill="#a7f3d0"/><circle cx="60" cy="25" r="2" fill="#bae6fd"/>'}, {id:'h_hat',em:'🎩',name:'シルクハット',price:60,r:'R',hsvg:'<ellipse cx="60" cy="29" rx="29" ry="6" fill="#1f2937"/><rect x="45" y="6" width="30" height="23" rx="2" fill="#111827"/><rect x="45" y="23" width="30" height="5" fill="#e11d48"/>'}, {id:'h_wiz',em:'🧙',name:'まほうつかい',price:90,r:'R',hsvg:'<path d="M60 1 Q66 20 79 30 L41 30 Q54 20 60 1Z" fill="#5b21b6" stroke="#4c1d95" stroke-width="1.5"/><path d="M41 30 Q60 34 79 30" stroke="#fbbf24" stroke-width="2" fill="none"/><circle cx="60" cy="8" r="2.6" fill="#fde047"/>'}, {id:'h_king',em:'🤴',name:'おうじさま',price:100,r:'R',hsvg:'<path d="M45 29 L48 15 L54 22 L60 13 L66 22 L72 15 L75 29Z" fill="#fcd34d" stroke="#d97706" stroke-width="1.5"/><rect x="45" y="27" width="30" height="5" rx="1" fill="#f59e0b"/><circle cx="60" cy="13" r="2.4" fill="#ef4444"/>'}, {id:'h_crown',em:'👑',name:'おうかん',price:120,r:'S',hsvg:'<path d="M40 30 L45 12 L53 24 L60 8 L67 24 L75 12 L80 30Z" fill="#fcd34d" stroke="#d97706" stroke-width="2"/><rect x="39" y="27" width="42" height="7" rx="2" fill="#f59e0b"/><circle cx="60" cy="8" r="3.5" fill="#ef4444"/><circle cx="45" cy="12" r="2.5" fill="#38bdf8"/><circle cx="75" cy="12" r="2.5" fill="#38bdf8"/>'}, {id:'h_halo',em:'😇',name:'てんしのわ',price:150,r:'S',hsvg:'<ellipse cx="60" cy="9" rx="19" ry="5.5" fill="none" stroke="#fde047" stroke-width="4"/><ellipse cx="60" cy="9" rx="19" ry="5.5" fill="none" stroke="#fff7cc" stroke-width="1.4"/>'} ],
    face:[ {id:'f_nerd',em:'🤓',name:'めがね',price:30,r:'N',hsvg:'<circle cx="48" cy="60" r="9" fill="rgba(255,255,255,.15)" stroke="#111" stroke-width="2.5"/><circle cx="72" cy="60" r="9" fill="rgba(255,255,255,.15)" stroke="#111" stroke-width="2.5"/><line x1="57" y1="60" x2="63" y2="60" stroke="#111" stroke-width="2.5"/><path d="M39 60 Q34 61 33 65" stroke="#111" stroke-width="2" fill="none"/><path d="M81 60 Q86 61 87 65" stroke="#111" stroke-width="2" fill="none"/>'}, {id:'f_mask',em:'🎭',name:'マスク',price:40,r:'N',hsvg:'<path d="M36 56 Q60 50 84 56 Q84 67 71 69 Q65 64 60 66 Q55 64 49 69 Q36 67 36 56Z" fill="#1f2937"/><circle cx="48" cy="60" r="4.5" fill="#fff"/><circle cx="72" cy="60" r="4.5" fill="#fff"/>'}, {id:'f_glass',em:'😎',name:'サングラス',price:50,r:'R',hsvg:'<circle cx="48" cy="60" r="9" fill="rgba(20,20,20,.8)" stroke="#111" stroke-width="2.5"/><circle cx="72" cy="60" r="9" fill="rgba(20,20,20,.8)" stroke="#111" stroke-width="2.5"/><line x1="57" y1="59" x2="63" y2="59" stroke="#111" stroke-width="2.5"/>'}, {id:'f_star',em:'🤩',name:'キラキラ目',price:70,r:'S',hsvg:'<path d="M48 53 l2.2 5 l5.4 0.3 l-4.2 3.6 l1.5 5.2 l-4.9 -3 l-4.9 3 l1.5 -5.2 l-4.2 -3.6 l5.4 -0.3Z" fill="#fde047" stroke="#f59e0b" stroke-width="0.8"/><path d="M72 53 l2.2 5 l5.4 0.3 l-4.2 3.6 l1.5 5.2 l-4.9 -3 l-4.9 3 l1.5 -5.2 l-4.2 -3.6 l5.4 -0.3Z" fill="#fde047" stroke="#f59e0b" stroke-width="0.8"/>'} ],
    hand:[ {id:'d_star',em:'⭐',name:'スター',price:30,r:'N',hsvg:'<path d="M96 89 l2.4 5.6 l6 0.4 l-4.6 4 l1.6 5.9 l-5.4 -3.3 l-5.4 3.3 l1.6 -5.9 l-4.6 -4 l6 -0.4Z" fill="#fde047" stroke="#f59e0b" stroke-width="1"/>'}, {id:'d_shield',em:'🛡️',name:'たて',price:60,r:'R',hsvg:'<path d="M96 88 L108 92 Q108 108 96 116 Q84 108 84 92Z" fill="#60a5fa" stroke="#2563eb" stroke-width="2"/><path d="M96 94 L96 110 M89 100 L103 100" stroke="#fbbf24" stroke-width="2.5"/>'}, {id:'d_wand',em:'🪄',name:'まほうのつえ',price:70,r:'R',hsvg:'<line x1="89" y1="118" x2="102" y2="93" stroke="#a16207" stroke-width="3" stroke-linecap="round"/><path d="M102 87 l1.6 3.8 l4.1 0.3 l-3.2 2.6 l1 4 l-3.5 -2.2 l-3.5 2.2 l1 -4 l-3.2 -2.6 l4.1 -0.3Z" fill="#fde047"/>'}, {id:'d_bow',em:'🏹',name:'ゆみや',price:70,r:'R',hsvg:'<path d="M99 85 Q113 101 99 117" fill="none" stroke="#a16207" stroke-width="3"/><line x1="99" y1="85" x2="99" y2="117" stroke="#e5e7eb" stroke-width="1.5"/><line x1="99" y1="101" x2="85" y2="101" stroke="#78350f" stroke-width="2"/>'}, {id:'d_sword',em:'⚔️',name:'つるぎ',price:80,r:'R',hsvg:'<line x1="97" y1="86" x2="97" y2="116" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/><line x1="89" y1="110" x2="105" y2="110" stroke="#78350f" stroke-width="4"/><rect x="94" y="114" width="6" height="9" rx="2" fill="#78350f"/>'}, {id:'d_trophy',em:'🏆',name:'トロフィー',price:120,r:'S',hsvg:'<path d="M89 90 h14 v5 q0 8 -7 10 q-7 -2 -7 -10Z" fill="#fcd34d" stroke="#d97706" stroke-width="1.5"/><path d="M89 91 q-6 0 -6 5 q0 4 5 4 M103 91 q6 0 6 5 q0 4 -5 4" fill="none" stroke="#d97706" stroke-width="1.5"/><rect x="94" y="105" width="4" height="6" fill="#d97706"/><rect x="88" y="111" width="16" height="4" rx="1" fill="#b45309"/>'} ],
    aura:[ {id:'a_heart',em:'💗',name:'ハート',price:70,r:'N',aura:'heart'}, {id:'a_star',em:'✨',name:'きらめき',price:90,r:'R',aura:'star'}, {id:'a_fire',em:'🔥',name:'ほのお',price:100,r:'R',aura:'fire'}, {id:'a_aqua',em:'💧',name:'みずのちから',price:100,r:'R',aura:'aqua'}, {id:'a_sakura',em:'🌸',name:'さくら',price:110,r:'R',aura:'sakura'}, {id:'a_thunder',em:'⚡',name:'いなずま',price:110,r:'S',aura:'thunder'}, {id:'a_rain',em:'🌈',name:'にじ',price:140,r:'S',aura:'rainbow'}, {id:'a_holy',em:'🌟',name:'せいなるひかり',price:160,r:'S',aura:'holy'}, {id:'a_phantom',em:'👻',name:'まぼろし',price:170,r:'S',aura:'phantom'}, {id:'a_galaxy',em:'🌌',name:'ぎんが',price:300,r:'UR',aura:'galaxy'} ]
  },
  pet:{
    hat:[ {id:'p_ribbon',em:'🎀',name:'リボン',price:30,r:'N'}, {id:'p_cap',em:'🧢',name:'キャップ',price:40,r:'N'}, {id:'p_party',em:'🥳',name:'パーティ',price:40,r:'N'}, {id:'p_grad',em:'🎓',name:'はかせ',price:60,r:'R'}, {id:'p_top',em:'🎩',name:'シルクハット',price:60,r:'R'}, {id:'p_ninja',em:'🥷',name:'にんじゃ',price:70,r:'R'}, {id:'p_crown',em:'👑',name:'かんむり',price:120,r:'S'}, {id:'p_halo',em:'😇',name:'てんしのわ',price:130,r:'S'} ],
    aura:[ {id:'pa_heart',em:'💗',name:'ハート',price:60,r:'N',aura:'heart'}, {id:'pa_star',em:'✨',name:'きらめき',price:80,r:'R',aura:'star'}, {id:'pa_fire',em:'🔥',name:'ほのお',price:90,r:'R',aura:'fire'}, {id:'pa_thunder',em:'⚡',name:'いなずま',price:130,r:'S',aura:'thunder'}, {id:'pa_rain',em:'🌈',name:'にじ',price:130,r:'S',aura:'rainbow'}, {id:'pa_galaxy',em:'🌌',name:'ぎんが',price:280,r:'UR',aura:'galaxy'} ]
  }
};
// ==== 追加アイテム 約100種（絵文字ベース＝SVG不要で確実に表示・？で隠す前提の収集用）====
(function(){
  var ADD={
    hero:{
      hat:[
        {id:'hh_star',em:'⭐',name:'ほし',price:30,r:'N'},{id:'hh_moon',em:'🌙',name:'つき',price:30,r:'N'},{id:'hh_sun',em:'☀️',name:'たいよう',price:30,r:'N'},
        {id:'hh_snow',em:'❄️',name:'ゆき',price:30,r:'N'},{id:'hh_cherry',em:'🌸',name:'さくら',price:30,r:'N'},{id:'hh_maple',em:'🍁',name:'もみじ',price:30,r:'N'},
        {id:'hh_sunf',em:'🌻',name:'ひまわり',price:40,r:'N'},{id:'hh_mush',em:'🍄',name:'きのこ',price:40,r:'N'},{id:'hh_apple',em:'🍎',name:'りんご',price:40,r:'N'},
        {id:'hh_straw',em:'🍓',name:'いちご',price:40,r:'N'},{id:'hh_balloon',em:'🎈',name:'ふうせん',price:40,r:'N'},{id:'hh_bee',em:'🐝',name:'はち',price:40,r:'N'},
        {id:'hh_clover',em:'🍀',name:'よつば',price:60,r:'R'},{id:'hh_rose',em:'🌹',name:'ばら',price:60,r:'R'},{id:'hh_gift',em:'🎁',name:'プレゼント',price:60,r:'R'},
        {id:'hh_pump',em:'🎃',name:'かぼちゃ',price:60,r:'R'},{id:'hh_ghost',em:'👻',name:'おばけ',price:70,r:'R'},{id:'hh_fly',em:'🦋',name:'ちょう',price:70,r:'R'},
        {id:'hh_bolt',em:'⚡',name:'いなずま',price:70,r:'R'},{id:'hh_fire',em:'🔥',name:'ほのお',price:70,r:'R'},{id:'hh_snowman',em:'⛄',name:'ゆきだるま',price:80,r:'R'},
        {id:'hh_dove',em:'🕊️',name:'はと',price:80,r:'R'},{id:'hh_dragon',em:'🐲',name:'りゅう',price:120,r:'S'},{id:'hh_uni',em:'🦄',name:'ユニコーン',price:130,r:'S'},
        {id:'hh_rain',em:'🌈',name:'にじ',price:140,r:'S'},{id:'hh_comet',em:'☄️',name:'すいせい',price:150,r:'S'},{id:'hh_crown2',em:'👑',name:'おうかんII',price:160,r:'S'},
        {id:'hh_galaxy',em:'🌌',name:'ぎんがぼう',price:300,r:'UR'}
      ],
      face:[
        {id:'hf_wink',em:'😉',name:'ウインク',price:30,r:'N'},{id:'hf_smile',em:'😊',name:'にこにこ',price:30,r:'N'},{id:'hf_cool',em:'😎',name:'クール',price:40,r:'N'},
        {id:'hf_nerd',em:'🤓',name:'めがねII',price:40,r:'N'},{id:'hf_mask',em:'😷',name:'マスク',price:40,r:'N'},{id:'hf_star',em:'🤩',name:'キラキラめ',price:50,r:'R'},
        {id:'hf_love',em:'😍',name:'ハートめ',price:50,r:'R'},{id:'hf_snork',em:'🤿',name:'シュノーケル',price:60,r:'R'},{id:'hf_party',em:'🥳',name:'パーティめがね',price:60,r:'R'},
        {id:'hf_mono',em:'🧐',name:'モノクル',price:70,r:'R'},{id:'hf_cowboy',em:'🤠',name:'カウボーイ',price:70,r:'R'},{id:'hf_robot',em:'🤖',name:'ロボめん',price:80,r:'R'},
        {id:'hf_alien',em:'👽',name:'うちゅうじん',price:80,r:'R'},{id:'hf_clown',em:'🤡',name:'ピエロ',price:80,r:'R'},{id:'hf_ninja',em:'🥷',name:'にんじゃ',price:110,r:'S'},
        {id:'hf_devil',em:'😈',name:'こあくま',price:120,r:'S'},{id:'hf_angel',em:'😇',name:'てんし',price:120,r:'S'},{id:'hf_dragon',em:'🐉',name:'りゅうのめん',price:140,r:'S'},
        {id:'hf_star2',em:'🌟',name:'スターフェイス',price:150,r:'S'},{id:'hf_rain',em:'🌈',name:'にじのめん',price:280,r:'UR'}
      ],
      hand:[
        {id:'hd_star',em:'🌟',name:'きらめきステッキ',price:30,r:'N'},{id:'hd_flower',em:'🌷',name:'チューリップ',price:30,r:'N'},{id:'hd_balloon',em:'🎈',name:'ふうせん',price:30,r:'N'},
        {id:'hd_candy',em:'🍭',name:'ペロペロ',price:30,r:'N'},{id:'hd_ice',em:'🍦',name:'アイス',price:40,r:'N'},{id:'hd_book',em:'📖',name:'まほうの本',price:40,r:'N'},
        {id:'hd_pen',em:'🖊️',name:'まほうのペン',price:40,r:'N'},{id:'hd_umb',em:'☂️',name:'かさ',price:40,r:'N'},{id:'hd_music',em:'🎵',name:'おんぷ',price:40,r:'N'},
        {id:'hd_guitar',em:'🎸',name:'ギター',price:60,r:'R'},{id:'hd_mic',em:'🎤',name:'マイク',price:60,r:'R'},{id:'hd_game',em:'🎮',name:'ゲーム',price:60,r:'R'},
        {id:'hd_ball',em:'⚽',name:'サッカーボール',price:60,r:'R'},{id:'hd_basket',em:'🏀',name:'バスケ',price:60,r:'R'},{id:'hd_kite',em:'🪁',name:'たこ',price:70,r:'R'},
        {id:'hd_teddy',em:'🧸',name:'くまさん',price:70,r:'R'},{id:'hd_gem',em:'💎',name:'ほうせき',price:80,r:'R'},{id:'hd_key',em:'🗝️',name:'ひみつのカギ',price:80,r:'R'},
        {id:'hd_lantern',em:'🏮',name:'ちょうちん',price:80,r:'R'},{id:'hd_rocket',em:'🚀',name:'ロケット',price:110,r:'S'},{id:'hd_orb',em:'🔮',name:'すいしょうだま',price:120,r:'S'},
        {id:'hd_axe',em:'🪓',name:'おの',price:120,r:'S'},{id:'hd_katana',em:'🗡️',name:'かたなII',price:130,r:'S'},{id:'hd_target',em:'🎯',name:'まと',price:130,r:'S'},
        {id:'hd_medal',em:'🏅',name:'メダル',price:140,r:'S'},{id:'hd_trophy2',em:'🏆',name:'ゆうしょうはい',price:150,r:'S'},{id:'hd_wand2',em:'🪄',name:'スターワンド',price:280,r:'UR'},
        {id:'hd_excal',em:'⚔️',name:'せいけんII',price:320,r:'UR'}
      ],
      aura:[
        {id:'ha_frost',em:'🧊',name:'こおり',price:100,r:'R',aura:'frost'},{id:'ha_toxic',em:'☠️',name:'どく',price:110,r:'R',aura:'toxic'},{id:'ha_shadow',em:'🌑',name:'かげ',price:160,r:'S',aura:'shadow'}
      ]
    },
    pet:{
      hat:[
        {id:'ph_star',em:'⭐',name:'ほし',price:30,r:'N'},{id:'ph_flower',em:'🌸',name:'はな',price:30,r:'N'},{id:'ph_bow2',em:'🎀',name:'リボンII',price:30,r:'N'},
        {id:'ph_straw',em:'🍓',name:'いちご',price:30,r:'N'},{id:'ph_leaf',em:'🍀',name:'よつば',price:40,r:'N'},{id:'ph_helm',em:'🪖',name:'ヘルメット',price:40,r:'N'},
        {id:'ph_party',em:'🎉',name:'クラッカー',price:40,r:'N'},{id:'ph_pump',em:'🎃',name:'かぼちゃ',price:60,r:'R'},{id:'ph_gift',em:'🎁',name:'プレゼント',price:60,r:'R'},
        {id:'ph_ghost',em:'👻',name:'おばけ',price:60,r:'R'},{id:'ph_music',em:'🎵',name:'おんぷ',price:60,r:'R'},{id:'ph_bolt',em:'⚡',name:'いなずま',price:70,r:'R'},
        {id:'ph_fire',em:'🔥',name:'ほのお',price:70,r:'R'},{id:'ph_snowman',em:'⛄',name:'ゆきだるま',price:70,r:'R'},{id:'ph_dragon',em:'🐲',name:'りゅう',price:120,r:'S'},
        {id:'ph_uni',em:'🦄',name:'ユニコーン',price:130,r:'S'},{id:'ph_rain',em:'🌈',name:'にじ',price:140,r:'S'},{id:'ph_galaxy',em:'🌌',name:'ぎんが',price:280,r:'UR'}
      ],
      aura:[
        {id:'pa_frost',em:'🧊',name:'こおり',price:90,r:'R',aura:'frost'},{id:'pa_toxic',em:'☠️',name:'どく',price:110,r:'S',aura:'toxic'},{id:'pa_holy',em:'🌟',name:'ひかり',price:130,r:'S',aura:'holy'}
      ]
    }
  };
  Object.keys(ADD).forEach(function(kind){ Object.keys(ADD[kind]).forEach(function(slot){
    if(!COS_DATA[kind][slot]) COS_DATA[kind][slot]=[];
    ADD[kind][slot].forEach(function(it){ COS_DATA[kind][slot].push(it); });
  }); });
})();
// 旧4段階(N/R/S/UR)のアイテムを新8段階(N/HN/R/HR/SR/SSR/UR/LR)へ再割当。
//   id由来のハッシュで安定（毎回同じ）＆上位ほど少なくなるよう分割する。
(function(){
  function h(s){ var n=0; s=String(s); for(var i=0;i<s.length;i++) n=(n*31+s.charCodeAt(i))>>>0; return n; }
  var split={
    N:function(k){ return k%5<3?'N':'HN'; },     // 旧N → N / HN
    R:function(k){ return k%20<11?'R':'HR'; },    // 旧R → R / HR
    S:function(k){ return k%5<3?'SR':'SSR'; },    // 旧S → SR / SSR
    UR:function(k){ return k%3<2?'UR':'LR'; }     // 旧UR → UR / LR
  };
  Object.keys(COS_DATA).forEach(function(kind){ Object.keys(COS_DATA[kind]).forEach(function(slot){
    (COS_DATA[kind][slot]||[]).forEach(function(it){ var o=it.r||'N'; if(split[o]) it.r=split[o](h(it.id||it.name)); });
  }); });
})();
// ===== レア装備を大量追加（各レア度・上位ほど豪華に）。再割当の後なので r は8段階を直接指定 =====
//   絵文字アイテム（hsvg無し）＝rpgCosBadge が em をスロット位置に描画（見た目確認不要）。
//   PILE は各スロットを「ふつう→豪華」の順に並べ、レア度へ自動配分（末尾ほど高レア＝豪華）。
(function(){
  var TIERS=['N','HN','R','HR','SR','SSR','UR','LR'];
  var W=[0.19,0.14,0.18,0.13,0.12,0.10,0.07,0.07];              // レア度別の枚数比（低レア多め・上位少なめ）
  var PRICE={N:30,HN:45,R:65,HR:100,SR:145,SSR:200,UR:290,LR:420};
  var PRE={SSR:'でんせつの',UR:'しんかの',LR:'レジェンド'};       // 上位レアは名前も豪華に
  var PILE={
    hero:{
      hat:[ ['🎽','はちまき'],['🪖','ヘルメット'],['🧶','けいとぼうし'],['⛑️','ぼうさいヘルメット'],['🧣','ふわマフラー'],['🍄','きのこぼうし'],['🎀','おおきなリボン'],['🌻','ひまわりかざり'],['🎓','がくしぼう'],['🥽','ゴーグル'],['🎧','ヘッドホン'],['🪅','ピニャータ'],['🌹','ばらのかざり'],['🦋','ちょうのかざり'],['🎃','パンプキンヘッド'],['🦺','たんけんフード'],['🎗️','リボンしょう'],['🪬','まもりのかぶと'],['🏵️','はなのくんしょう'],['🏅','メダル'],['🥇','きんメダル'],['🎖️','くんしょう'],['💐','はなのかんむり'],['🪩','ミラークラウン'],['💫','スターティアラ'],['🔮','よげんのかんむり'],['🎇','はなびのかんむり'],['🌟','きらめきクラウン'],['🦁','ライオンのおうかん'],['🦅','わしのかぶと'],['🐉','りゅうのかぶと'],['🔱','トライデントかんむり'],['🪐','どせいのかんむり'],['🌠','ながれぼしのおうかん'] ],
      face:[ ['🧐','モノクル'],['🤿','ダイビングマスク'],['😷','マスク'],['🥸','へんそうめがね'],['🤡','ピエロメイク'],['🦹','かいとうのめん'],['🥷','しのびのめん'],['🤖','ロボめん'],['👺','てんぐのめん'],['🃏','ジョーカー'],['👻','おばけのめん'],['💂','えいへいのめん'],['🤠','ガンマンめん'],['🦁','ライオンめん'],['🐯','タイガーめん'],['👹','おにのめん'],['😈','あくまのめん'],['🧟','ゾンビのめん'],['🧝','エルフのめん'],['🔥','ほのおのめん'],['❄️','こおりのめん'],['⚡','いかずちのめん'],['🐲','りゅうのめん'],['👁️','しんがんのめ'],['🧞','ジンのめん'] ],
      hand:[ ['🔨','ハンマー'],['🪃','ブーメラン'],['🎣','つりざお'],['🥄','おおさじ'],['🔦','ランタン'],['🧹','ほうき'],['🏓','ラケット'],['🥍','ラクロス'],['🪚','のこぎり'],['🔧','スパナ'],['🪓','おの'],['🎈','ふうせん'],['🪀','ヨーヨー'],['🎸','ギター'],['🥁','たいこ'],['🎺','トランペット'],['🎻','バイオリン'],['🪕','バンジョー'],['🎷','サックス'],['🗡️','たんけん'],['🔫','みずでっぽう'],['🏏','バット'],['🥊','グローブ'],['🎯','まとあて'],['🪁','たこ'],['🏮','ちょうちん'],['🕯️','せいなるろうそく'],['📿','せいなるじゅず'],['🪈','まほうのふえ'],['🎆','はなびだま'],['🧿','まよけのたま'],['⚓','いかりのつち'],['🗿','まもりのせきぞう'],['⚡','いかずちのつえ'],['💠','ダイヤのつえ'],['🔱','トライデント'],['🌊','うみのほこ'],['🔥','えんまのつえ'],['❄️','ひょうけつのやいば'],['☄️','りゅうせいのつえ'],['🐉','ドラゴンソード'],['⚜️','エクスカリバー'],['🌈','にじのせいけん'],['🌌','ぎんがのつるぎ'] ]
    },
    pet:{
      hat:[ ['🪖','ミニヘルメット'],['🧶','けいとぼう'],['🎽','はちまき'],['🧣','マフラー'],['🍄','きのこ'],['🌻','ひまわり'],['🥽','ゴーグル'],['🎧','ヘッドホン'],['🪅','ピニャータ'],['🌹','ばら'],['🦋','ちょう'],['🎃','パンプキン'],['🦺','フード'],['🪬','まもり'],['🏵️','はなくんしょう'],['🏅','メダル'],['🥇','きんメダル'],['🎖️','くんしょう'],['💐','はなのかんむり'],['🪩','ミラークラウン'],['💫','ティアラ'],['🔮','よげんかんむり'],['🎇','はなびかんむり'],['🌟','きらめきクラウン'],['🦁','ライオンのおうかん'],['🕊️','せいなるつばさ'],['🐉','りゅうのかぶと'],['🔱','トライデント'],['🪐','どせいのかんむり'],['☀️','たいようのかんむり'] ]
    }
  };
  // スロット→id用の1文字コード。hatとhandはどちらも頭文字'h'でidが衝突していたため（gx_hhN0等12個）、
  // handは'd'（既存のhd_接頭辞に合わせる）。旧gx_hh…のhandアイテムは rpgCosState が新idへ移行する。
  var SLOT_CODE={hat:'h',face:'f',hand:'d',aura:'a',back:'b',ride:'r'};
  function add(kind,slot,pile){
    if(!COS_DATA[kind]) COS_DATA[kind]={};
    if(!COS_DATA[kind][slot]) COS_DATA[kind][slot]=[];
    var n=pile.length, idx=0, seq=0, t, j;
    for(t=0;t<TIERS.length;t++){
      var cnt=(t===TIERS.length-1)?(n-idx):Math.max(1,Math.round(n*W[t]));
      if(idx+cnt>n) cnt=n-idx;
      for(j=0;j<cnt;j++){ var p=pile[idx+j]; if(!p) continue; var r=TIERS[t];
        COS_DATA[kind][slot].push({ id:'gx_'+kind.charAt(0)+(SLOT_CODE[slot]||slot.charAt(0))+r+(seq++), em:p[0], name:(PRE[r]||'')+p[1], price:PRICE[r]||60, r:r });
      }
      idx+=cnt; if(idx>=n) break;
    }
  }
  Object.keys(PILE).forEach(function(kind){ Object.keys(PILE[kind]).forEach(function(slot){ add(kind,slot,PILE[kind][slot]); }); });
})();
// ===== 新スロット：せなか（翼/マント）＆ のりもの（足元の台座）。8段階レア度を直接指定 =====
// （↑のレア度再割当IIFEより後に足すこと。id接頭辞 bk_/rd_ は固定＝セット定義から参照できる）
COS_DATA.hero.back=[
  {id:'bk_bag',em:'🎒',name:'ランドセル',price:30,r:'N'},{id:'bk_balloon',em:'🎈',name:'せなかふうせん',price:30,r:'N'},{id:'bk_kite',em:'🪁',name:'カイト',price:35,r:'N'},
  {id:'bk_shell',em:'🐢',name:'かめのこうら',price:45,r:'HN'},{id:'bk_umbrella',em:'🌂',name:'かささし',price:45,r:'HN'},
  {id:'bk_scarf',em:'🧣',name:'ひらひらマント',price:65,r:'R'},{id:'bk_butterfly',em:'🦋',name:'ちょうのはね',price:65,r:'R'},{id:'bk_dove',em:'🕊️',name:'はとのつばさ',price:70,r:'R'},
  {id:'bk_para',em:'🪂',name:'パラシュート',price:100,r:'HR'},{id:'bk_guitar',em:'🎸',name:'せおいギター',price:100,r:'HR'},
  {id:'bk_bolt',em:'⚡',name:'いなずまのマント',price:145,r:'SR'},{id:'bk_angel',em:'😇',name:'てんしのつばさ',price:150,r:'SR'},
  {id:'bk_fire',em:'🔥',name:'でんせつのほのおマント',price:200,r:'SSR'},{id:'bk_dragon',em:'🐉',name:'でんせつのりゅうのつばさ',price:210,r:'SSR'},
  {id:'bk_galaxy',em:'🌌',name:'しんかのぎんがマント',price:290,r:'UR'},
  {id:'bk_rainbow',em:'🌈',name:'レジェンドにじのつばさ',price:420,r:'LR'}
];
COS_DATA.hero.ride=[
  {id:'rd_skate',em:'🛹',name:'スケボー',price:30,r:'N'},{id:'rd_scooter',em:'🛴',name:'キックボード',price:30,r:'N'},{id:'rd_sled',em:'🛷',name:'そり',price:35,r:'N'},
  {id:'rd_horse',em:'🎠',name:'もくば',price:45,r:'HN'},{id:'rd_ring',em:'🛟',name:'うきわ',price:45,r:'HN'},
  {id:'rd_broom',em:'🧹',name:'まほうのほうき',price:65,r:'R'},{id:'rd_cloud',em:'☁️',name:'きんとうん',price:70,r:'R'},{id:'rd_wave',em:'🌊',name:'なみのり',price:70,r:'R'},
  {id:'rd_ufo',em:'🛸',name:'ミニUFO',price:100,r:'HR'},{id:'rd_dolphin',em:'🐬',name:'イルカライド',price:105,r:'HR'},
  {id:'rd_sleigh',em:'🦌',name:'トナカイぞり',price:145,r:'SR'},{id:'rd_uni',em:'🦄',name:'ユニコーン',price:150,r:'SR'},
  {id:'rd_rocket',em:'🚀',name:'でんせつのロケット',price:200,r:'SSR'},{id:'rd_dragonride',em:'🐲',name:'でんせつのりゅうライド',price:210,r:'SSR'},
  {id:'rd_star',em:'🌠',name:'しんかのながれぼし',price:290,r:'UR'},
  {id:'rd_aurora',em:'✨',name:'レジェンドオーロラライド',price:420,r:'LR'}
];
// ===== プロフィール枠（アバターのかざりリング）。キャラ本体には付かず、ランキング/ヘッダー/ユーザー選択のアバターに巻く =====
COS_DATA.hero.frame=[
  {id:'fr_wood',em:'🪵',name:'きのわく',price:30,r:'N',frame:'wood'},
  {id:'fr_leaf',em:'🍃',name:'はっぱのわく',price:35,r:'N',frame:'leaf'},
  {id:'fr_ice',em:'🧊',name:'こおりのわく',price:45,r:'HN',frame:'ice'},
  {id:'fr_candy',em:'🍬',name:'キャンディわく',price:50,r:'HN',frame:'candy'},
  {id:'fr_silver',em:'🥈',name:'ぎんのわく',price:65,r:'R',frame:'silver'},
  {id:'fr_gold',em:'🥇',name:'きんのわく',price:100,r:'HR',frame:'gold'},
  {id:'fr_fire',em:'🔥',name:'ほのおのわく',price:145,r:'SR',frame:'fire'},
  {id:'fr_thunder',em:'⚡',name:'でんせつのいなずまのわく',price:200,r:'SSR',frame:'thunder'},
  {id:'fr_rainbow',em:'🌈',name:'しんかのにじのわく',price:290,r:'UR',frame:'rainbow'},
  {id:'fr_galaxy',em:'🌌',name:'レジェンドぎんがのわく',price:420,r:'LR',frame:'galaxy'}
];
// ===== あいぼう（なかまモンスター）のぼうし。装備は cos.equip でなく roster個体の a.hat（あいぼう詳細画面でそうび） =====
COS_DATA.aibou={ hat:[
  {id:'ah_ribbon',em:'🎀',name:'りぼん',price:30,r:'N'},{id:'ah_leaf',em:'🍀',name:'よつばのかざり',price:30,r:'N'},{id:'ah_flower',em:'🌼',name:'おはな',price:30,r:'N'},
  {id:'ah_helm',em:'🪖',name:'ミニヘルメット',price:45,r:'HN'},{id:'ah_cap',em:'🧢',name:'ミニキャップ',price:45,r:'HN'},
  {id:'ah_grad',em:'🎓',name:'はかせぼう',price:65,r:'R'},{id:'ah_top',em:'🎩',name:'ミニシルクハット',price:65,r:'R'},
  {id:'ah_ninja',em:'🥷',name:'にんじゃずきん',price:100,r:'HR'},{id:'ah_pump',em:'🎃',name:'かぼちゃぼうし',price:100,r:'HR'},
  {id:'ah_crown',em:'👑',name:'ミニおうかん',price:150,r:'SR'},
  {id:'ah_dragon',em:'🐲',name:'でんせつのりゅうかぶと',price:210,r:'SSR'},
  {id:'ah_galaxy',em:'🌌',name:'しんかのぎんがかんむり',price:290,r:'UR'},
  {id:'ah_rainbow',em:'🌈',name:'レジェンドにじのかんむり',price:420,r:'LR'}
] };
var COS_SLOTS={ hero:[['hat','🎩 ぼうし'],['face','😎 かお'],['hand','⚔️ どうぐ'],['back','🦋 せなか'],['ride','🛹 のりもの'],['aura','✨ オーラ'],['frame','🖼️ プロフィールわく']], pet:[['hat','🎀 ぼうし'],['aura','✨ オーラ']], aibou:[['hat','🎀 ぼうし']] };
var COS_RARITY={
  N:{name:'ノーマル',cls:'cos-n'},
  HN:{name:'ハイノーマル',cls:'cos-hn'},
  R:{name:'レア',cls:'cos-r'},
  HR:{name:'ハイパーレア',cls:'cos-hr'},
  SR:{name:'スーパーレア',cls:'cos-sr'},
  SSR:{name:'ダブルスーパーレア',cls:'cos-ssr'},
  UR:{name:'アルティメットレア',cls:'cos-ur'},
  LR:{name:'レジェンドレア',cls:'cos-lr'}
};
// ===== コレクション（セット）＆ 称号 =====
var COS_SETS=[
  { id:'set_wizard', name:'まほうつかい', em:'🧙', items:['h_wiz','d_wand','a_star'],       coin:80,  title:'t_wizard' },
  { id:'set_knight', name:'けんし',       em:'⚔️', items:['h_hat','d_sword','d_shield'],     coin:80,  title:'t_knight' },
  { id:'set_king',   name:'おうさま',     em:'👑', items:['h_crown','d_trophy'],             coin:100, title:'t_king' },
  { id:'set_angel',  name:'てんし',       em:'😇', items:['h_halo','a_holy','f_star'],       coin:120, title:'t_angel' },
  { id:'set_rainbow',name:'にじいろ',     em:'🌈', items:['a_rain','pa_rain'],               coin:80,  title:'t_rainbow' },
  { id:'set_galaxy', name:'ぎんが',       em:'🌌', items:['a_galaxy','pa_galaxy'],           coin:200, title:'t_galaxy' },
  { id:'set_sky',    name:'おおぞら',     em:'🕊️', items:['bk_angel','rd_cloud'],            coin:120, title:'t_sky' },
  { id:'set_speed',  name:'スピードスター', em:'🚀', items:['rd_skate','rd_rocket','bk_bolt'], coin:120, title:'t_speed' },
  { id:'set_aibou',  name:'あいぼうコーデ', em:'🐾', items:['ah_ribbon','ah_grad'],            coin:80,  title:'t_aibou' }
];
var COS_TITLES={
  t_wizard:{ name:'だいまほうつかい', em:'🧙' },
  t_knight:{ name:'せんしの ほこり', em:'⚔️' },
  t_king:{ name:'せかいの おうさま', em:'👑' },
  t_angel:{ name:'てんしの まもり', em:'😇' },
  t_rainbow:{ name:'にじの かなた', em:'🌈' },
  t_galaxy:{ name:'ぎんがの ゆうしゃ', em:'🌌' },
  t_sky:{ name:'おおぞらの つばさ', em:'🕊️' },
  t_speed:{ name:'いなずまライダー', em:'🚀' },
  t_aibou:{ name:'あいぼうマイスター', em:'🐾' },
  t_collector:{ name:'コレクター', em:'📦' },        // 所持アイテムが半分
  t_master:{ name:'きせかえマスター', em:'🌟' },      // 全アイテムコンプ
  t_first_ur:{ name:'にじいろの きせき', em:'✨' }    // URを初ゲット
};
// アイテムidから中身を引く（レア度など）
