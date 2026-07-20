/* srpg-mons.js：タクトバトル専用の「オリジナルモンスター」アート（SVG）。
   ドラクエ等の既存キャラの造形は使わず、タクト風テイスト（丸みトゥーン・太めの
   ダークアウトライン・つやのある大きな目・ハイライト・足元の影）で新規に描き起こした
   完全オリジナルのクリーチャー群。著作権の心配なく差し替えできる。
   viewBox は既存アートに合わせて 0 0 120 120・class="mon-svg"。
   ※ここは「絵（データ）」だけ。描画の切替は srpg-ui.js の srpgUnitArt/srpgMonArt。 */

// ---- 共通パーツ（統一感を出すためのヘルパー） ----
function _mShadow(rx){ return '<ellipse cx="60" cy="112" rx="'+(rx||30)+'" ry="6.5" fill="rgba(0,0,0,.26)"/>'; }
// つやのある目：白目＋ひとみ＋ハイライト。look=左右の視線ずれ, r=大きさ
function _mEye(cx, cy, r, look){
  r = r || 8; look = look || 0;
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#fff" stroke="#1e2637" stroke-width="1.6"/>'
    + '<circle cx="'+(cx+look)+'" cy="'+(cy+r*0.28).toFixed(1)+'" r="'+(r*0.5).toFixed(1)+'" fill="#151b2e"/>'
    + '<circle cx="'+(cx+look-r*0.3).toFixed(1)+'" cy="'+(cy-r*0.22).toFixed(1)+'" r="'+(r*0.2).toFixed(1)+'" fill="#fff"/>';
}
// 鋭い目（敵の凄み）：とがった白目＋赤〜色つきひとみ
function _mEyeSharp(cx, cy, w, dir, pupil){
  dir = dir || 1;
  return '<path d="M'+(cx-w)+' '+cy+' Q'+cx+' '+(cy-w*0.9)+' '+(cx+w)+' '+(cy-w*0.2*dir)+' Q'+cx+' '+(cy+w*0.5)+' '+(cx-w)+' '+cy+' Z" fill="#fff" stroke="#1e2637" stroke-width="1.4"/>'
    + '<circle cx="'+cx+'" cy="'+(cy-w*0.1).toFixed(1)+'" r="'+(w*0.42).toFixed(1)+'" fill="'+(pupil||'#b91c1c')+'"/>'
    + '<circle cx="'+(cx-w*0.2).toFixed(1)+'" cy="'+(cy-w*0.3).toFixed(1)+'" r="'+(w*0.15).toFixed(1)+'" fill="#fff"/>';
}
function _mCheek(cx, cy){ return '<ellipse cx="'+cx+'" cy="'+cy+'" rx="5" ry="3" fill="#ff8fab" opacity=".45"/>'; }
function _mHead(){ return '<svg viewBox="0 0 120 120" class="mon-svg">'; }
// 幹部（シグマの魔神）共通ベース：裂けたダークローブ＋影に沈んだ顔＋光る鋭い眼。
// c={ body, dark, inner, eye }。呼び出し側で教科モチーフを足して '</svg>' で閉じる。
function _mFiend(c){
  return _mHead()
    + '<ellipse cx="60" cy="113" rx="34" ry="6.5" fill="rgba(0,0,0,.32)"/>'
    + '<circle cx="60" cy="58" r="50" fill="'+c.eye+'" opacity=".08"/>'
    + '<path d="M60 42 Q28 48 26 96 L32 110 L45 101 L54 110 L60 101 L66 110 L75 101 L88 110 L94 96 Q92 48 60 42 Z" fill="'+c.body+'" stroke="'+c.dark+'" stroke-width="4.2"/>'
    + '<path d="M60 52 Q42 56 40 94 L53 104 L60 97 L67 104 Q80 56 60 52 Z" fill="'+c.inner+'"/>'
    + '<path d="M35 62 Q24 52 20 42 Q34 47 44 58 Z" fill="'+c.body+'" stroke="'+c.dark+'" stroke-width="2.6"/>'
    + '<path d="M85 62 Q96 52 100 42 Q86 47 76 58 Z" fill="'+c.body+'" stroke="'+c.dark+'" stroke-width="2.6"/>'
    + '<path d="M60 36 Q40 40 40 56 Q40 68 60 70 Q80 68 80 56 Q80 40 60 36 Z" fill="'+c.dark+'" stroke="'+c.dark+'" stroke-width="2"/>'
    + '<path d="M46 54 Q44 42 60 41 Q76 42 74 54 Q60 47 46 54 Z" fill="#050310"/>'
    + '<ellipse cx="52" cy="55" rx="7.5" ry="4.4" fill="'+c.eye+'" opacity=".45"/><ellipse cx="68" cy="55" rx="7.5" ry="4.4" fill="'+c.eye+'" opacity=".45"/>'
    + _mEyeSharp(52, 57, 6, 1, c.eye) + _mEyeSharp(68, 57, 6, -1, c.eye)
    + '<circle cx="52" cy="56" r="1.3" fill="#fff"/><circle cx="68" cy="56" r="1.3" fill="#fff"/>';
}

// ===== オリジナルモンスター9種 =====
var SRPG_MON_ART = {
  // プラム：まん丸ゼリー（雫形は避けた球体スライム）
  slime:
    _mHead() + _mShadow(30)
    + '<circle cx="60" cy="46" r="5" fill="#3ad6c4" stroke="#0e6b62" stroke-width="2.4"/>'
    + '<path d="M26 92 Q20 54 60 51 Q100 54 94 92 Q94 105 60 105 Q26 105 26 92 Z" fill="#34d0c0" stroke="#0e6b62" stroke-width="3.6"/>'
    + '<path d="M38 66 Q46 56 60 56 Q74 56 82 66 Q70 60 60 60 Q50 60 38 66 Z" fill="#c6fff4" opacity=".55"/>'
    + '<circle cx="42" cy="95" r="3.5" fill="#c6fff4" opacity=".5"/><circle cx="80" cy="90" r="2.6" fill="#c6fff4" opacity=".5"/>'
    + _mEye(50, 80, 8.5, 1) + _mEye(73, 80, 8.5, 1)
    + _mCheek(43, 91) + _mCheek(80, 91)
    + '<path d="M52 92 Q60 99 69 92" stroke="#0e6b62" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '</svg>',
  // マメット：小鬼（丸い体・小さな角・大きな耳・八重歯）
  goblin:
    _mHead() + _mShadow(30)
    + '<path d="M30 74 Q16 66 20 54 Q30 60 34 68 Z" fill="#8fce3a" stroke="#41630f" stroke-width="3"/>'
    + '<path d="M90 74 Q104 66 100 54 Q90 60 86 68 Z" fill="#8fce3a" stroke="#41630f" stroke-width="3"/>'
    + '<path d="M46 46 L50 60 L40 58 Z" fill="#c7f088" stroke="#41630f" stroke-width="2.4"/>'
    + '<path d="M74 46 L70 60 L80 58 Z" fill="#c7f088" stroke="#41630f" stroke-width="2.4"/>'
    + '<path d="M32 92 Q28 58 60 56 Q92 58 88 92 Q88 104 60 104 Q32 104 32 92 Z" fill="#86c232" stroke="#41630f" stroke-width="3.6"/>'
    + '<ellipse cx="60" cy="92" rx="16" ry="12" fill="#d5ef9a" opacity=".6"/>'
    + '<path d="M40 70 L52 74" stroke="#41630f" stroke-width="2.6" stroke-linecap="round"/><path d="M80 70 L68 74" stroke="#41630f" stroke-width="2.6" stroke-linecap="round"/>'
    + _mEye(49, 80, 7, 1) + _mEye(71, 80, 7, 1)
    + '<path d="M52 90 Q60 96 68 90" stroke="#41630f" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    + '<path d="M58 90 L61 97 L64 90 Z" fill="#fff" stroke="#41630f" stroke-width="1"/>'
    + '</svg>',
  // ビットバット：一つ目コウモリ（大きな翼・小さな牙）
  bat:
    _mHead() + _mShadow(30)
    + '<path d="M58 66 Q30 40 12 52 Q22 56 22 66 Q12 70 20 82 Q40 74 58 78 Z" fill="#8b74e8" stroke="#4c1d95" stroke-width="3.2"/>'
    + '<path d="M62 66 Q90 40 108 52 Q98 56 98 66 Q108 70 100 82 Q80 74 62 78 Z" fill="#8b74e8" stroke="#4c1d95" stroke-width="3.2"/>'
    + '<path d="M46 50 L52 62 L40 60 Z" fill="#a78bfa" stroke="#4c1d95" stroke-width="2.2"/>'
    + '<path d="M74 50 L68 62 L80 60 Z" fill="#a78bfa" stroke="#4c1d95" stroke-width="2.2"/>'
    + '<circle cx="60" cy="74" r="26" fill="#a78bfa" stroke="#4c1d95" stroke-width="3.6"/>'
    + '<ellipse cx="52" cy="64" rx="10" ry="6" fill="#c4b5fd" opacity=".6"/>'
    + _mEye(60, 72, 13, 1)
    + '<path d="M50 92 L54 99 L58 92 Z" fill="#fff" stroke="#4c1d95" stroke-width="1"/><path d="M62 92 L66 99 L70 92 Z" fill="#fff" stroke="#4c1d95" stroke-width="1"/>'
    + '</svg>',
  // ファング：牙獣（とがった耳・鋭い目・牙）
  wolf:
    _mHead() + _mShadow(30)
    + '<path d="M40 52 L34 30 L52 46 Z" fill="#93a4bb" stroke="#28374d" stroke-width="3"/>'
    + '<path d="M80 52 L86 30 L68 46 Z" fill="#93a4bb" stroke="#28374d" stroke-width="3"/>'
    + '<path d="M30 88 Q26 54 60 50 Q94 54 90 88 Q90 104 60 104 Q30 104 30 88 Z" fill="#93a4bb" stroke="#28374d" stroke-width="3.6"/>'
    + '<path d="M44 96 Q60 84 76 96 Q76 106 60 106 Q44 106 44 96 Z" fill="#e2e8f0" stroke="#28374d" stroke-width="2.4"/>'
    + '<path d="M60 88 L60 96" stroke="#28374d" stroke-width="2.2"/>'
    + '<ellipse cx="60" cy="90" rx="5" ry="3.6" fill="#1e2637"/>'
    + '<path d="M40 74 L54 78" stroke="#28374d" stroke-width="2.8" stroke-linecap="round"/><path d="M80 74 L66 78" stroke="#28374d" stroke-width="2.8" stroke-linecap="round"/>'
    + _mEyeSharp(49, 80, 8, 1, '#38bdf8') + _mEyeSharp(71, 80, 8, -1, '#38bdf8')
    + '<path d="M50 98 L53 104 L56 98 Z" fill="#fff"/><path d="M64 98 L67 104 L70 98 Z" fill="#fff"/>'
    + '</svg>',
  // ホロー：ゆらめく幽霊（うつろな目・口・ほのかな光）
  ghost:
    _mHead() + '<ellipse cx="60" cy="112" rx="24" ry="5" fill="rgba(0,0,0,.18)"/>'
    + '<path d="M30 66 Q30 34 60 34 Q90 34 90 66 L90 98 Q83 90 76 98 Q69 90 62 98 Q55 90 48 98 Q41 90 34 98 L30 98 Z" fill="#eef3f9" stroke="#94a4bb" stroke-width="3.4"/>'
    + '<ellipse cx="48" cy="60" rx="10" ry="6" fill="#dbe4ee" opacity=".7"/>'
    + '<ellipse cx="50" cy="66" rx="6.5" ry="8.5" fill="#20293a"/><ellipse cx="72" cy="66" rx="6.5" ry="8.5" fill="#20293a"/>'
    + '<circle cx="48" cy="63" r="1.8" fill="#fff"/><circle cx="70" cy="63" r="1.8" fill="#fff"/>'
    + '<ellipse cx="61" cy="84" rx="6" ry="8" fill="#20293a"/>'
    + '<path d="M22 74 Q14 78 18 86" stroke="#94a4bb" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>'
    + '<path d="M98 74 Q106 78 102 86" stroke="#94a4bb" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>'
    + '</svg>',
  // モスガード：樹木の番人（切り株の体・葉の冠・こわい顔）
  trent:
    _mHead() + _mShadow(32)
    + '<path d="M30 52 Q24 30 46 30 Q52 18 68 26 Q90 22 88 46 Q100 52 90 64 Q60 58 34 66 Q22 60 30 52 Z" fill="#3fae4e" stroke="#1e6b34" stroke-width="3.4"/>'
    + '<circle cx="44" cy="42" r="6" fill="#63c46f" opacity=".7"/><circle cx="70" cy="38" r="5" fill="#63c46f" opacity=".7"/>'
    + '<path d="M34 100 Q32 62 60 60 Q88 62 86 100 Q86 106 60 106 Q34 106 34 100 Z" fill="#a2703b" stroke="#5b3c1c" stroke-width="3.6"/>'
    + '<path d="M46 74 Q48 96 46 104 M60 72 Q62 96 60 104 M74 74 Q72 96 74 104" stroke="#5b3c1c" stroke-width="2" fill="none" opacity=".7"/>'
    + '<path d="M28 84 Q16 82 14 92" stroke="#5b3c1c" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '<path d="M92 84 Q104 82 106 92" stroke="#5b3c1c" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '<path d="M40 78 L52 80" stroke="#5b3c1c" stroke-width="3" stroke-linecap="round"/><path d="M80 78 L68 80" stroke="#5b3c1c" stroke-width="3" stroke-linecap="round"/>'
    + _mEye(50, 85, 6.5, 1) + _mEye(70, 85, 6.5, 1)
    + '<path d="M52 96 Q60 92 68 96" stroke="#5b3c1c" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    + '</svg>',
  // ボルトワイバーン：雷の小竜（いなずまの翼・電気のオーラ）
  voltdrake:
    _mHead() + _mShadow(28)
    + '<path d="M40 48 L28 40 L36 36 L26 26 L44 34 L40 22 L52 40 Z" fill="#38bdf8" stroke="#0369a1" stroke-width="2.4" opacity=".9"/>'
    + '<path d="M80 48 L92 40 L84 36 L94 26 L76 34 L80 22 L68 40 Z" fill="#38bdf8" stroke="#0369a1" stroke-width="2.4" opacity=".9"/>'
    + '<path d="M46 44 L50 56 L40 54 Z" fill="#fde047" stroke="#a16207" stroke-width="2"/>'
    + '<path d="M74 44 L70 56 L80 54 Z" fill="#fde047" stroke="#a16207" stroke-width="2"/>'
    + '<path d="M34 90 Q30 56 60 54 Q90 56 86 90 Q86 104 60 104 Q34 104 34 90 Z" fill="#fbca2b" stroke="#a16207" stroke-width="3.6"/>'
    + '<path d="M60 90 Q52 96 56 104 M66 92 Q74 98 70 106" stroke="#a16207" stroke-width="2.2" fill="none"/>'
    + '<ellipse cx="60" cy="94" rx="13" ry="9" fill="#fff0b3" opacity=".6"/>'
    + _mEyeSharp(50, 78, 8, 1, '#0ea5e9') + _mEyeSharp(70, 78, 8, -1, '#0ea5e9')
    + '<path d="M50 96 L54 92 L58 96 L62 92 L66 96 L70 92" stroke="#a16207" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    + '<path d="M18 68 L24 62 L20 74 L26 70" stroke="#e0f2fe" stroke-width="2" fill="none"/>'
    + '</svg>',
  // ドラゴ：赤い竜（角・翼・牙・腹板）
  dragon:
    _mHead() + _mShadow(33)
    + '<path d="M34 60 Q10 44 8 66 Q22 64 30 76 Z" fill="#c1121f" stroke="#7a0b16" stroke-width="3"/>'
    + '<path d="M86 60 Q110 44 112 66 Q98 64 90 76 Z" fill="#c1121f" stroke="#7a0b16" stroke-width="3"/>'
    + '<path d="M44 42 L40 26 L54 40 Z" fill="#f0a0a8" stroke="#7a0b16" stroke-width="2.2"/>'
    + '<path d="M76 42 L80 26 L66 40 Z" fill="#f0a0a8" stroke="#7a0b16" stroke-width="2.2"/>'
    + '<path d="M30 90 Q26 52 60 48 Q94 52 90 90 Q90 105 60 105 Q30 105 30 90 Z" fill="#ef4444" stroke="#7a0b16" stroke-width="3.8"/>'
    + '<path d="M44 96 Q60 82 76 96 Q76 106 60 106 Q44 106 44 96 Z" fill="#fca5a5" stroke="#7a0b16" stroke-width="2.4"/>'
    + '<path d="M48 96 L48 104 M60 94 L60 105 M72 96 L72 104" stroke="#7a0b16" stroke-width="1.8" opacity=".7"/>'
    + '<path d="M38 74 L52 78" stroke="#7a0b16" stroke-width="3" stroke-linecap="round"/><path d="M82 74 L68 78" stroke="#7a0b16" stroke-width="3" stroke-linecap="round"/>'
    + _mEyeSharp(50, 80, 8.5, 1, '#fde047') + _mEyeSharp(70, 80, 8.5, -1, '#fde047')
    + '<path d="M50 98 L53 104 L56 98 Z" fill="#fff"/><path d="M64 98 L67 104 L70 98 Z" fill="#fff"/>'
    + '</svg>',
  // 魔王シグマ：闇の王（冠・マント・赤い瞳・オーラ）＝ボス
  // 魔王シグマ：モヤの霧をまとう魔王（丸トゥーンの雑魚とは別格の、威圧感ある独自シルエット）
  villain:
    _mHead()
    // 足元の濃い影＋背後に立ちこめる紫のモヤ・オーラ（発光を重ねる）
    + '<ellipse cx="60" cy="115" rx="42" ry="7.5" fill="rgba(0,0,0,.45)"/>'
    + '<circle cx="60" cy="58" r="54" fill="#4c1d95" opacity=".10"/>'
    + '<circle cx="60" cy="56" r="42" fill="#6d28d9" opacity=".13"/>'
    + '<path d="M16 98 Q8 72 20 50" stroke="#7c3aed" stroke-width="3.2" fill="none" opacity=".28" stroke-linecap="round"/>'
    + '<path d="M104 98 Q112 72 100 50" stroke="#7c3aed" stroke-width="3.2" fill="none" opacity=".28" stroke-linecap="round"/>'
    + '<path d="M30 106 Q26 84 36 68" stroke="#a855f7" stroke-width="2.2" fill="none" opacity=".22" stroke-linecap="round"/>'
    // 太く湾曲した魔の角（外へ反り返り、根元太く先すぼまり＝耳でなく角に見せる）
    + '<path d="M46 30 Q24 27 13 12 Q7 4 10 1 Q16 9 27 14 Q40 20 49 27 Z" fill="#c7b8ea" stroke="#0d0a22" stroke-width="2.8" stroke-linejoin="round"/>'
    + '<path d="M74 30 Q96 27 107 12 Q113 4 110 1 Q104 9 93 14 Q80 20 71 27 Z" fill="#c7b8ea" stroke="#0d0a22" stroke-width="2.8" stroke-linejoin="round"/>'
    + '<path d="M46 30 Q28 27 18 15 Q12 8 13 5 Q21 13 32 17 Q43 22 49 28 Z" fill="#8571b8" opacity=".65"/>'
    + '<path d="M74 30 Q92 27 102 15 Q108 8 107 5 Q99 13 88 17 Q77 22 71 28 Z" fill="#8571b8" opacity=".65"/>'
    + '<path d="M31 17 L35 21 M22 10 L26 14" stroke="#0d0a22" stroke-width="1.2" opacity=".45" stroke-linecap="round"/>'
    + '<path d="M89 17 L85 21 M98 10 L94 14" stroke="#0d0a22" stroke-width="1.2" opacity=".45" stroke-linecap="round"/>'
    // 裂けたマント（下広がり・裾がギザギザに破れた重厚なローブ）
    + '<path d="M60 40 Q24 46 20 92 L15 113 L28 104 L37 113 L46 103 L55 113 L60 104 L65 113 L74 103 L83 113 L92 104 L105 113 L100 92 Q96 46 60 40 Z" fill="#241b4a" stroke="#0b0820" stroke-width="4.2"/>'
    + '<path d="M60 52 Q40 56 37 92 L45 107 L54 99 L60 105 L66 99 L75 107 Q83 56 60 52 Z" fill="#120e2e"/>'
    // 尖った肩のカラー（左右にとがらせて威圧）
    + '<path d="M35 60 Q23 50 18 40 Q34 45 46 56 Z" fill="#3b0764" stroke="#0b0820" stroke-width="3"/>'
    + '<path d="M85 60 Q97 50 102 40 Q86 45 74 56 Z" fill="#3b0764" stroke="#0b0820" stroke-width="3"/>'
    // 尖ったフード（頭巾）＝中は闇
    + '<path d="M60 12 Q38 16 34 44 Q47 37 60 37 Q73 37 86 44 Q82 16 60 12 Z" fill="#1b1440" stroke="#0b0820" stroke-width="3.6"/>'
    + '<path d="M43 42 Q41 22 60 20 Q79 22 77 42 Q60 35 43 42 Z" fill="#060411"/>'
    // σの紋章（額に浮かぶ）
    + '<text x="60" y="30" font-size="12" text-anchor="middle" fill="#c4b5fd" font-weight="bold" opacity=".92">σ</text>'
    // 光る鋭い眼（赤い発光ハロー＋鋭い眼＋中の光点）
    + '<ellipse cx="51" cy="35" rx="8.5" ry="5" fill="#dc2626" opacity=".45"/>'
    + '<ellipse cx="69" cy="35" rx="8.5" ry="5" fill="#dc2626" opacity=".45"/>'
    + _mEyeSharp(51, 37, 7, 1, '#ef4444') + _mEyeSharp(69, 37, 7, -1, '#ef4444')
    + '<circle cx="51" cy="36" r="1.5" fill="#fff5f5"/><circle cx="69" cy="36" r="1.5" fill="#fff5f5"/>'
    // 牙をむいた口（闇の中に白い牙）
    + '<path d="M50 48 Q60 45 70 48 L67 52 L63 48 L60 52 L57 48 L53 52 Z" fill="#080512"/>'
    + '<path d="M53 48 L55 53 L57 48 Z M63 48 L65 53 L67 48 Z" fill="#fff"/>'
    // マントを走る紫のエネルギー亀裂
    + '<path d="M60 62 L56 74 L62 72 L57 90" stroke="#a855f7" stroke-width="2" fill="none" opacity=".85" stroke-linecap="round"/>'
    // 袖から伸びるかぎ爪の手（左右）
    + '<path d="M31 88 Q23 92 21 100 Q27 96 31 98 Q25 100 23 106 Q31 101 34 103 Q30 105 30 109 Q37 100 39 90 Z" fill="#1b1440" stroke="#0b0820" stroke-width="2.2"/>'
    + '<path d="M89 88 Q97 92 99 100 Q93 96 89 98 Q95 100 97 106 Q89 101 86 103 Q90 105 90 109 Q83 100 81 90 Z" fill="#1b1440" stroke="#0b0820" stroke-width="2.2"/>'
    // 浮遊する紫の火の粉
    + '<circle cx="24" cy="46" r="2.4" fill="#c4b5fd" opacity=".9"/><circle cx="98" cy="52" r="1.9" fill="#c4b5fd" opacity=".85"/><circle cx="92" cy="30" r="1.6" fill="#a78bfa" opacity=".8"/><circle cx="28" cy="30" r="1.4" fill="#a78bfa" opacity=".75"/>'
    + '</svg>',
  // スラッグキング：ゼリーの王（冠つきの大きなスライム＝数の大陸ボス）
  slugking:
    _mHead() + _mShadow(33)
    + '<path d="M40 46 L37 28 L48 39 L60 25 L72 39 L83 28 L80 46 Q60 39 40 46 Z" fill="#fbbf24" stroke="#a16207" stroke-width="2.4"/>'
    + '<circle cx="48" cy="31" r="2.4" fill="#ef4444"/><circle cx="60" cy="27" r="2.8" fill="#f87171"/><circle cx="72" cy="31" r="2.4" fill="#ef4444"/>'
    + '<path d="M22 94 Q14 52 60 48 Q106 52 98 94 Q98 106 60 106 Q22 106 22 94 Z" fill="#2bb6a6" stroke="#0b5952" stroke-width="3.8"/>'
    + '<path d="M36 66 Q48 56 60 56 Q72 56 84 66 Q70 60 60 60 Q50 60 36 66 Z" fill="#bff6ee" opacity=".5"/>'
    + _mEye(50, 82, 9, 1) + _mEye(73, 82, 9, 1) + _mCheek(43, 94) + _mCheek(80, 94)
    + '<path d="M50 94 Q60 101 70 94" stroke="#0b5952" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '</svg>',
  // インクブロブ：墨のかたまり（国語）
  inkblob:
    _mHead() + _mShadow(28)
    + '<path d="M30 92 Q22 54 60 50 Q98 54 90 92 Q90 104 60 104 Q30 104 30 92 Z" fill="#3f3aa8" stroke="#1e1b4b" stroke-width="3.6"/>'
    + '<path d="M40 66 Q48 58 60 58 Q72 58 80 66 Q68 62 60 62 Q52 62 40 66 Z" fill="#a5b4fc" opacity=".5"/>'
    + '<path d="M32 100 Q32 111 28 114 Q24 109 30 100 Z" fill="#3f3aa8" stroke="#1e1b4b" stroke-width="1.4"/>'
    + '<path d="M88 100 Q88 110 92 112 Q96 108 90 100 Z" fill="#3f3aa8" stroke="#1e1b4b" stroke-width="1.4"/>'
    + '<text x="60" y="48" font-size="12" text-anchor="middle" fill="#1e1b4b" font-weight="bold">あ</text>'
    + _mEye(50, 82, 8, 1) + _mEye(72, 82, 8, 1)
    + '<path d="M52 93 Q60 98 68 93" stroke="#c7d2fe" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    + '</svg>',
  // フデバード：筆の鳥（国語）
  fudebird:
    _mHead() + _mShadow(26)
    + '<path d="M84 84 Q106 90 110 108 Q99 103 92 108 Q90 96 80 92 Z" fill="#1f2937" stroke="#0b0f19" stroke-width="1.6"/>'
    + '<path d="M105 106 Q109 113 104 117" stroke="#1f2937" stroke-width="2" fill="none"/>'
    + '<path d="M34 92 Q28 58 60 56 Q88 58 84 88 Q84 100 60 104 Q34 104 34 92 Z" fill="#f8fafc" stroke="#334155" stroke-width="3.4"/>'
    + '<path d="M40 74 L27 78 L40 82 Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.6"/>'
    + '<path d="M52 80 Q64 74 76 82 Q64 86 52 84 Z" fill="#cbd5e1" opacity=".7"/>'
    + '<text x="66" y="70" font-size="12" text-anchor="middle" fill="#334155" font-weight="bold">書</text>'
    + _mEye(48, 72, 7, -1)
    + '</svg>',
  // カンジオニ：漢字の鬼（国語）
  kanjioni:
    _mHead() + _mShadow(30)
    + '<path d="M46 42 L50 25 L56 42 Z" fill="#fde68a" stroke="#92400e" stroke-width="2"/>'
    + '<path d="M74 42 L70 25 L64 42 Z" fill="#fde68a" stroke="#92400e" stroke-width="2"/>'
    + '<path d="M34 54 Q40 42 48 48 Q52 40 60 46 Q68 40 72 48 Q80 42 86 54 Z" fill="#111827"/>'
    + '<path d="M32 92 Q28 52 60 50 Q92 52 88 92 Q88 104 60 104 Q32 104 32 92 Z" fill="#e0483a" stroke="#7f1d1d" stroke-width="3.6"/>'
    + '<text x="60" y="66" font-size="15" text-anchor="middle" fill="#fff" font-weight="bold">字</text>'
    + '<path d="M40 78 L52 82" stroke="#7f1d1d" stroke-width="2.6" stroke-linecap="round"/><path d="M80 78 L68 82" stroke="#7f1d1d" stroke-width="2.6" stroke-linecap="round"/>'
    + _mEyeSharp(49, 86, 7, 1, '#fde047') + _mEyeSharp(71, 86, 7, -1, '#fde047')
    + '<path d="M50 98 L53 103 L56 98 Z" fill="#fff"/><path d="M64 98 L67 103 L70 98 Z" fill="#fff"/>'
    + '</svg>',
  // ABキューブ：文字の箱（英語）
  abcube:
    _mHead() + _mShadow(26)
    + '<path d="M36 58 L84 58 L84 100 L36 100 Z" fill="#38bdf8" stroke="#075985" stroke-width="3.4"/>'
    + '<path d="M36 58 L48 46 L96 46 L84 58 Z" fill="#7dd3fc" stroke="#075985" stroke-width="3"/>'
    + '<path d="M84 58 L96 46 L96 88 L84 100 Z" fill="#0ea5e9" stroke="#075985" stroke-width="3"/>'
    + '<text x="60" y="94" font-size="22" text-anchor="middle" fill="#fff" font-weight="bold">A</text>'
    + '<text x="90" y="78" font-size="12" text-anchor="middle" fill="#e0f2fe" font-weight="bold">B</text>'
    + _mEye(50, 70, 6, 1) + _mEye(70, 70, 6, 1)
    + '<path d="M46 100 L46 106 M74 100 L74 106" stroke="#075985" stroke-width="4" stroke-linecap="round"/>'
    + '</svg>',
  // クエスバード：はてなの鳥（英語）
  qbird:
    _mHead() + _mShadow(26)
    + '<circle cx="60" cy="76" r="28" fill="#34d399" stroke="#065f46" stroke-width="3.6"/>'
    + '<ellipse cx="50" cy="66" rx="10" ry="6" fill="#a7f3d0" opacity=".6"/>'
    + '<text x="60" y="42" font-size="22" text-anchor="middle" fill="#fbbf24" font-weight="bold">?</text>'
    + '<path d="M60 82 L52 90 L68 90 Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.6"/>'
    + '<path d="M34 76 Q26 80 30 88 Z" fill="#10b981" stroke="#065f46" stroke-width="2"/>'
    + '<path d="M86 76 Q94 80 90 88 Z" fill="#10b981" stroke="#065f46" stroke-width="2"/>'
    + _mEye(50, 72, 7, 1) + _mEye(70, 72, 7, -1)
    + '</svg>',
  // グラマロ：文法の本（英語）
  grammaro:
    _mHead() + _mShadow(30)
    + '<path d="M60 56 Q40 50 28 56 L28 100 Q40 94 60 100 Z" fill="#fef3c7" stroke="#92400e" stroke-width="3.2"/>'
    + '<path d="M60 56 Q80 50 92 56 L92 100 Q80 94 60 100 Z" fill="#fffbeb" stroke="#92400e" stroke-width="3.2"/>'
    + '<rect x="57" y="55" width="6" height="45" fill="#b45309"/>'
    + '<path d="M36 74 L50 76 M36 82 L50 84 M70 76 L84 74 M70 84 L84 82" stroke="#d6a760" stroke-width="2" stroke-linecap="round"/>'
    + '<text x="60" y="94" font-size="11" text-anchor="middle" fill="#92400e" font-weight="bold">ABC</text>'
    + _mEye(48, 62, 6, 1) + _mEye(72, 62, 6, 1)
    + '</svg>',
  // フラスクン：フラスコ（理科）
  flaskun:
    _mHead() + _mShadow(24)
    + '<rect x="50" y="38" width="20" height="8" rx="2" fill="#b45309" stroke="#7c3a12" stroke-width="2"/>'
    + '<rect x="53" y="45" width="14" height="16" fill="#e0f2fe" stroke="#0369a1" stroke-width="2.6"/>'
    + '<path d="M53 60 L38 96 Q38 104 60 104 Q82 104 82 96 L67 60 Z" fill="#dff1ff" stroke="#0369a1" stroke-width="3.4"/>'
    + '<path d="M44 84 Q60 80 76 84 L80 96 Q80 104 60 104 Q40 104 40 96 Z" fill="#22c55e" opacity=".85"/>'
    + '<circle cx="52" cy="92" r="2.6" fill="#bbf7d0"/><circle cx="66" cy="88" r="2" fill="#bbf7d0"/><circle cx="60" cy="96" r="1.8" fill="#bbf7d0"/>'
    + _mEye(52, 78, 6, 1) + _mEye(68, 78, 6, 1)
    + '<path d="M55 88 Q60 91 65 88" stroke="#0369a1" stroke-width="2" fill="none" stroke-linecap="round"/>'
    + '</svg>',
  // マイクローブ：微生物（理科）
  microbe:
    _mHead() + _mShadow(27)
    + '<path d="M30 62 L22 58 M90 62 L98 58 M34 90 L28 96 M86 90 L92 96 M60 52 L60 44 M46 54 L42 47 M74 54 L78 47" stroke="#9d174d" stroke-width="3" stroke-linecap="round"/>'
    + '<path d="M32 88 Q24 56 60 54 Q96 56 88 88 Q88 100 60 100 Q32 100 32 88 Z" fill="#f472b6" stroke="#9d174d" stroke-width="3.4"/>'
    + '<circle cx="70" cy="84" r="8" fill="#9d174d" opacity=".45"/><circle cx="44" cy="70" r="4" fill="#fbcfe8" opacity=".7"/>'
    + _mEye(50, 76, 8, 1) + _mEye(72, 74, 7, 1) + _mCheek(44, 88) + _mCheek(78, 88)
    + '<path d="M52 88 Q60 94 68 88" stroke="#9d174d" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    + '</svg>',
  // マップモス：地図の蛾（社会）
  mapmoth:
    _mHead() + _mShadow(30)
    + '<path d="M58 74 Q28 50 14 68 Q24 74 22 86 Q36 94 58 84 Z" fill="#a3b18a" stroke="#4b5320" stroke-width="3.2"/>'
    + '<path d="M62 74 Q92 50 106 68 Q96 74 98 86 Q84 94 62 84 Z" fill="#a3b18a" stroke="#4b5320" stroke-width="3.2"/>'
    + '<path d="M30 66 Q40 70 36 78 M84 66 Q80 70 84 78" stroke="#6b7a3a" stroke-width="1.8" fill="none"/>'
    + '<ellipse cx="60" cy="80" rx="9" ry="19" fill="#6b705c" stroke="#3f4238" stroke-width="2.8"/>'
    + '<path d="M54 52 Q46 40 40 42 M66 52 Q74 40 80 42" stroke="#3f4238" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    + '<circle cx="40" cy="42" r="2.6" fill="#3f4238"/><circle cx="80" cy="42" r="2.6" fill="#3f4238"/>'
    + _mEye(56, 74, 5, 1) + _mEye(64, 74, 5, 1)
    + '</svg>',
  // ハニワ：埴輪（社会）
  haniwa:
    _mHead() + _mShadow(28)
    + '<path d="M42 46 Q60 33 78 46 L74 57 Q60 51 46 57 Z" fill="#e0a256" stroke="#8a5a2b" stroke-width="3"/>'
    + '<path d="M43 58 Q43 54 60 54 Q77 54 77 58 L82 100 Q60 107 38 100 Z" fill="#d99a54" stroke="#8a5a2b" stroke-width="3.4"/>'
    + '<path d="M40 70 Q26 72 24 84" stroke="#8a5a2b" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '<path d="M80 70 Q94 72 96 84" stroke="#8a5a2b" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '<ellipse cx="51" cy="74" rx="4.5" ry="6" fill="#5b3a1a"/><ellipse cx="69" cy="74" rx="4.5" ry="6" fill="#5b3a1a"/>'
    + '<ellipse cx="60" cy="90" rx="6" ry="7" fill="#5b3a1a"/>'
    + '</svg>',
  // トキオウ：時計の王（社会）
  tokiou:
    _mHead() + _mShadow(30)
    + '<path d="M42 46 L39 30 L50 40 L60 28 L70 40 L81 30 L78 46 Q60 40 42 46 Z" fill="#fbbf24" stroke="#a16207" stroke-width="2.4"/>'
    + '<circle cx="60" cy="78" r="30" fill="#fef9c3" stroke="#a16207" stroke-width="3.8"/>'
    + '<circle cx="60" cy="78" r="24" fill="none" stroke="#d6a760" stroke-width="1.5"/>'
    + '<text x="60" y="62" font-size="9" text-anchor="middle" fill="#a16207" font-weight="bold">12</text>'
    + '<text x="84" y="82" font-size="9" text-anchor="middle" fill="#a16207" font-weight="bold">3</text>'
    + '<text x="60" y="100" font-size="9" text-anchor="middle" fill="#a16207" font-weight="bold">6</text>'
    + '<text x="37" y="82" font-size="9" text-anchor="middle" fill="#a16207" font-weight="bold">9</text>'
    + '<path d="M60 78 L60 64 M60 78 L72 82" stroke="#7c3a12" stroke-width="3" stroke-linecap="round"/>'
    + '<circle cx="60" cy="78" r="3" fill="#7c3a12"/>'
    + _mEye(51, 72, 5, 1) + _mEye(69, 72, 5, 1)
    + '</svg>',

  // ===== シグマ幹部（5体・教科テーマ×魔神）＋裏ボス =====
  // 天秤の魔神ゼロン（数）：頭上に天秤（＋と−が釣り合う）
  zeron:
    _mFiend({ body:'#312e81', dark:'#141042', inner:'#1a1650', eye:'#fbbf24' })
    + '<path d="M60 18 L60 34 M33 25 L87 25" stroke="#cbd5e1" stroke-width="2.6" stroke-linecap="round"/>'
    + '<circle cx="60" cy="19" r="3.6" fill="#fbbf24" stroke="#141042" stroke-width="1.2"/>'
    + '<path d="M33 25 L27 35 L39 35 Z" fill="#1e1b4b" stroke="#cbd5e1" stroke-width="1.4"/>'
    + '<path d="M87 25 L81 35 L93 35 Z" fill="#1e1b4b" stroke="#cbd5e1" stroke-width="1.4"/>'
    + '<text x="33" y="34" font-size="8" text-anchor="middle" fill="#fbbf24" font-weight="bold">＋</text>'
    + '<text x="87" y="34" font-size="8" text-anchor="middle" fill="#93c5fd" font-weight="bold">−</text>'
    + '</svg>',
  // 静寂の魔神サイレント（ことば）：×の封印＋縫い留められた口
  jp_lt:
    _mFiend({ body:'#3b0764', dark:'#1e1b4b', inner:'#12082e', eye:'#a855f7' })
    + '<path d="M53 20 L67 32 M67 20 L53 32" stroke="#c4b5fd" stroke-width="3" stroke-linecap="round" opacity=".92"/>'
    + '<path d="M50 64 L70 64" stroke="#7c3aed" stroke-width="3" stroke-linecap="round"/>'
    + '<path d="M55 61 L55 67 M60 61 L60 67 M65 61 L65 67" stroke="#c4b5fd" stroke-width="1.8" stroke-linecap="round"/>'
    + '</svg>',
  // 混沌の魔神バベル（英語）：崩れた文字が乱舞
  en_lt:
    _mFiend({ body:'#065f46', dark:'#032b20', inner:'#04231b', eye:'#34d399' })
    + '<text x="30" y="36" font-size="14" fill="#34d399" font-weight="bold" transform="rotate(-20 30 36)">A</text>'
    + '<text x="92" y="30" font-size="13" fill="#6ee7b7" font-weight="bold" transform="rotate(18 92 30)">Z</text>'
    + '<text x="60" y="22" font-size="11" fill="#a7f3d0" font-weight="bold" transform="rotate(-8 60 22)">B</text>'
    + '<text x="76" y="60" font-size="10" fill="#34d399" font-weight="bold" transform="rotate(24 76 60)">Q</text>'
    + '</svg>',
  // まやかしの魔神ペテル（理科）：プリズムが光を歪める
  sci_lt:
    _mFiend({ body:'#155e75', dark:'#06303b', inner:'#05242c', eye:'#38bdf8' })
    + '<path d="M60 16 L72 36 L48 36 Z" fill="#0e7490" stroke="#67e8f9" stroke-width="2"/>'
    + '<path d="M72 28 L94 22 M73 32 L96 34 M72 35 L92 42" stroke="#67e8f9" stroke-width="1.6" opacity=".8" stroke-linecap="round"/>'
    + '<circle cx="30" cy="30" r="2.2" fill="#a5f3fc"/><circle cx="90" cy="48" r="1.8" fill="#a5f3fc"/><circle cx="34" cy="52" r="1.5" fill="#a5f3fc"/>'
    + '</svg>',
  // 忘却の魔神レーテ（社会）：溶けかけた時計と記憶を消す霧
  so_lt:
    _mFiend({ body:'#44403c', dark:'#1c1917', inner:'#292524', eye:'#f59e0b' })
    + '<circle cx="60" cy="25" r="11" fill="#3f3f46" stroke="#a16207" stroke-width="2.4"/>'
    + '<path d="M60 25 L60 18 M60 25 L66 27" stroke="#e7e5e4" stroke-width="2" stroke-linecap="round"/>'
    + '<circle cx="60" cy="25" r="1.6" fill="#e7e5e4"/>'
    + '<path d="M38 30 Q30 27 25 32 M82 30 Q90 27 95 32 M40 40 Q33 39 29 43" stroke="#a8a29e" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>'
    + '</svg>',
  // 虚無竜ムゲン（裏ボス）：あきらめの根源＝闇の竜。開いた虚無の口・三つ目・角の冠
  kyomu:
    _mHead() + '<ellipse cx="60" cy="114" rx="40" ry="7" fill="rgba(0,0,0,.45)"/>'
    + '<circle cx="60" cy="58" r="56" fill="#1e1b4b" opacity=".2"/><circle cx="60" cy="56" r="40" fill="#4c1d95" opacity=".16"/>'
    + '<path d="M60 46 Q16 42 6 18 Q18 44 30 54 Q12 58 4 76 Q26 66 40 70 L38 100 Q28 110 22 113 Q40 106 60 108 Q80 106 98 113 Q92 110 82 100 L80 70 Q94 66 116 76 Q108 58 90 54 Q102 44 114 18 Q104 42 60 46 Z" fill="#171335" stroke="#0a0720" stroke-width="4"/>'
    + '<path d="M40 40 L34 20 L46 33 L54 18 L60 33 L66 18 L74 33 L86 20 L80 40 Q60 32 40 40 Z" fill="#2a2250" stroke="#0a0720" stroke-width="2.4"/>'
    + '<circle cx="47" cy="22" r="2.2" fill="#a855f7"/><circle cx="60" cy="19" r="2.6" fill="#c084fc"/><circle cx="73" cy="22" r="2.2" fill="#a855f7"/>'
    + '<ellipse cx="49" cy="58" rx="8" ry="5" fill="#a855f7" opacity=".5"/><ellipse cx="71" cy="58" rx="8" ry="5" fill="#a855f7" opacity=".5"/>'
    + _mEyeSharp(49, 60, 7, 1, '#c084fc') + _mEyeSharp(71, 60, 7, -1, '#c084fc')
    + '<circle cx="49" cy="59" r="1.4" fill="#fff"/><circle cx="71" cy="59" r="1.4" fill="#fff"/>'
    + '<path d="M60 46 L56 54 L64 54 Z" fill="#ef4444"/><circle cx="60" cy="50" r="2" fill="#fca5a5"/>'
    + '<path d="M44 80 Q60 94 76 80 Q68 100 60 100 Q52 100 44 80 Z" fill="#000"/>'
    + '<path d="M48 82 L51 89 L54 82 Z M66 82 L69 89 L72 82 Z M57 84 L60 92 L63 84 Z" fill="#c4b5fd"/>'
    + '<path d="M60 100 L56 110 L63 108" stroke="#a855f7" stroke-width="2" fill="none" opacity=".85" stroke-linecap="round"/>'
    + '<circle cx="20" cy="50" r="2.6" fill="#c4b5fd" opacity=".85"/><circle cx="100" cy="54" r="2.1" fill="#c4b5fd" opacity=".8"/><circle cx="94" cy="32" r="1.7" fill="#a78bfa" opacity=".75"/>'
    + '</svg>',
  // ===== 伝説（LG限定スカウト）：大魔王級モンスター =====
  // 大魔王ゾルド：黄金の王冠をいただく最上位の魔王。金の瞳・紫の内衣・漆黒のローブ。
  daimaou:
    _mFiend({ body:'#1a1625', dark:'#000000', inner:'#4c1d95', eye:'#fbbf24' })
    + '<path d="M40 30 L44 15 L52 25 L60 12 L68 25 L76 15 L80 30 Q60 22 40 30 Z" fill="#fbbf24" stroke="#b45309" stroke-width="2.2"/>'
    + '<circle cx="44" cy="17" r="2.4" fill="#fde68a"/><circle cx="60" cy="13" r="3" fill="#fef3c7"/><circle cx="76" cy="17" r="2.4" fill="#fde68a"/>'
    + '<circle cx="60" cy="24" r="2" fill="#ef4444"/>'
    + '<path d="M22 46 Q14 40 12 30 M98 46 Q106 40 108 30" stroke="#fbbf24" stroke-width="1.6" fill="none" opacity=".5" stroke-linecap="round"/>'
    + '</svg>',
  // 炎魔王グレン：紅蓮の魔王。燃え立つ角と火の粉。
  enmaou:
    _mFiend({ body:'#7f1d1d', dark:'#3f0808', inner:'#991b1b', eye:'#fb923c' })
    + '<path d="M35 62 Q30 44 40 32 Q40 46 48 56 Z" fill="#f97316" opacity=".85"/><path d="M85 62 Q90 44 80 32 Q80 46 72 56 Z" fill="#f97316" opacity=".85"/>'
    + '<circle cx="30" cy="40" r="2.2" fill="#fdba74"/><circle cx="90" cy="44" r="1.8" fill="#fdba74"/><circle cx="24" cy="60" r="1.6" fill="#fb923c" opacity=".8"/><circle cx="98" cy="58" r="1.5" fill="#fb923c" opacity=".8"/>'
    + '<path d="M52 70 Q60 78 68 70" stroke="#fdba74" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>'
    + '</svg>',
  // 氷魔王ブリザ：蒼氷の魔王。凍える氷角と冷気の結晶。
  hyoumaou:
    _mFiend({ body:'#1e3a8a', dark:'#0c1e4c', inner:'#1e40af', eye:'#a5f3fc' })
    + '<path d="M34 60 L30 34 L40 52 Z" fill="#bae6fd" stroke="#38bdf8" stroke-width="1.4"/><path d="M86 60 L90 34 L80 52 Z" fill="#bae6fd" stroke="#38bdf8" stroke-width="1.4"/>'
    + '<path d="M60 30 L57 24 L60 27 L63 24 Z" fill="#e0f2fe"/>'
    + '<circle cx="26" cy="52" r="1.8" fill="#e0f2fe"/><circle cx="94" cy="50" r="1.6" fill="#e0f2fe"/><circle cx="22" cy="68" r="1.4" fill="#a5f3fc" opacity=".85"/><circle cx="98" cy="66" r="1.3" fill="#a5f3fc" opacity=".85"/>'
    + '</svg>'
};
// 亜種（色ちがい）：ベースの絵に hue-rotate をかける（RPG_VARIANTS と同じ角度体系）
var SRPG_MON_VARIANT = { slime2:140, goblin2:150, bat2:170, wolf2:120, ghost2:100, dragon2:180, trent2:130, voltdrake2:90, flaskun2:200, haniwa2:60 };

// ===== 属性バリアント（20種×5属性=100体・名前も見た目もプロシージャル生成のオリジナル） =====
var SRPG_MON_BASE_NAMES={slime:'スライム',goblin:'ゴブリン',bat:'いっかくばち',wolf:'ウルフ',ghost:'ゴースト',trent:'トレント',slugking:'スラグキング',dragon:'ドラゴン',inkblob:'インクブロブ',fudebird:'フデバード',kanjioni:'カンジオニ',abcube:'ABキューブ',qbird:'クエスバード',grammaro:'グラマロ',flaskun:'フラスクン',microbe:'マイクローブ',voltdrake:'ボルトドレイク',mapmoth:'マップモス',haniwa:'ハニワン',tokiou:'トキオウ',villain:'魔王シグマ',daimaou:'大魔王ゾルド',enmaou:'炎魔王グレン',hyoumaou:'氷魔王ブリザ',
  // 魔神幹部5体（UR）＋裏ボス虚無竜（神話）＝上位帯のスカウト対象（唯一無二・属性変種なし）
  zeron:'天秤の魔神ゼロン',jp_lt:'静寂の魔神サイレント',en_lt:'混沌の魔神バベル',sci_lt:'まやかしの魔神ペテル',so_lt:'忘却の魔神レーテ',kyomu:'虚無竜ムゲン'};
// 属性変種を作らない“唯一無二”アート（魔王・大魔王級・魔神幹部・裏ボス）
var SRPG_MON_UNIQUE = { villain:1, daimaou:1, enmaou:1, hyoumaou:1, zeron:1, jp_lt:1, en_lt:1, sci_lt:1, so_lt:1, kyomu:1 };
var SRPG_ELEM_VARIANTS={fire:{p:'ほのお',hue:-45,sat:1.35,badge:'🔥'},ice:{p:'こおり',hue:165,sat:1.1,badge:'❄️'},thunder:{p:'かみなり',hue:12,sat:1.6,badge:'⚡'},dark:{p:'やみ',hue:255,sat:.8,badge:'🌑'},holy:{p:'ひかり',hue:60,sat:1.3,badge:'✨'}};
var SRPG_MON_VARIANTS2={};
(function(){
  var _leg = (typeof SRPG_LEGEND_ARTS!=='undefined') ? SRPG_LEGEND_ARTS : ['daimaou','enmaou','hyoumaou'];
  Object.keys(SRPG_MON_BASE_NAMES).forEach(function(b){
    if(SRPG_MON_UNIQUE[b] || b==='villain' || _leg.indexOf(b)>=0) return;   // 魔王・大魔王級・魔神幹部は唯一無二（属性変種を作らない）
    Object.keys(SRPG_ELEM_VARIANTS).forEach(function(e){
      SRPG_MON_VARIANTS2[b+'_'+e]={ base:b, elem:e, name:SRPG_ELEM_VARIANTS[e].p+SRPG_MON_BASE_NAMES[b] };
    });
  });
})();
// 種名の解決（基本種・変種・亜種すべて）
function srpgMonName(art){
  if(SRPG_MON_BASE_NAMES[art]) return SRPG_MON_BASE_NAMES[art];
  var v=SRPG_MON_VARIANTS2[art]; if(v) return v.name;
  var m=/^(.*)2$/.exec(art); if(m&&SRPG_MON_BASE_NAMES[m[1]]) return SRPG_MON_BASE_NAMES[m[1]]+'（亜種）';
  return 'なかま';
}

// アートキー→オリジナルSVG（無ければ null＝呼び出し側が従来アートへフォールバック）
function srpgMonArt(art){
  if(!art) return null;
  if(SRPG_MON_ART[art]) return SRPG_MON_ART[art];
  var v2=SRPG_MON_VARIANTS2[art];
  if(v2 && SRPG_MON_ART[v2.base]){
    var ev=SRPG_ELEM_VARIANTS[v2.elem];
    return '<span class="srpg-evwrap"><span class="srpg-hue" style="filter:hue-rotate('+ev.hue+'deg) saturate('+ev.sat+')">'+SRPG_MON_ART[v2.base]+'</span><i class="srpg-ev-badge">'+ev.badge+'</i></span>';
  }
  var m = /^(.*)2$/.exec(art);
  if(m && SRPG_MON_ART[m[1]] && SRPG_MON_VARIANT[art] != null){
    return '<span class="srpg-hue" style="filter:hue-rotate('+SRPG_MON_VARIANT[art]+'deg)">' + SRPG_MON_ART[m[1]] + '</span>';
  }
  return null;
}

// ===== レア度帯システム（レア度＝見た目の格。ランク→帯→アートを結合する土台）=====
// これまで「ランク(力)」と「アート(見た目)」が分離していたため、LGランクのスライム等が出て
// レア度が見た目に表れなかった。ここで art→tier(帯) を定義し、スカウトのランク→帯→アートを結ぶ。
// 帯 0..6：0 N / 1 R / 2 SR / 3 SSR / 4 UR / 5 伝説 / 6 神話。数字が大きいほど格上。
var SRPG_MON_TIER = {
  // ★0 N（ノーマル）＝素朴な小物
  slime:0, goblin:0, microbe:0, bat:0,
  // ★1 R（レア）＝ひとくせある雑魚
  inkblob:1, flaskun:1, qbird:1, fudebird:1, mapmoth:1, wolf:1,
  // ★2 SR＝目立つ存在
  ghost:2, abcube:2, haniwa:2, trent:2,
  // ★3 SSR＝王・将クラス
  kanjioni:3, grammaro:3, tokiou:3, slugking:3, voltdrake:3,
  // ★4 UR＝竜・魔神幹部
  dragon:4, zeron:4, jp_lt:4, en_lt:4, sci_lt:4, so_lt:4,
  // ★5 伝説＝魔王
  villain:5,
  // ★6 神話＝大魔王級・裏ボス
  daimaou:6, enmaou:6, hyoumaou:6, kyomu:6
};
// ランク→帯（レア度が上がるほど 上位の帯＝より強力そうなモンスターが出る）
var SRPG_RANK_BAND = { F:0, E:0, D:1, C:1, B:2, A:2, S:3, SS:4, SSS:5, LG:6 };
// 帯メタ（表示ラベル・星・色＝レア度オーラ/枠の基調色）。key はガチャ的な短縮表記。
var SRPG_RARITY_BANDS = [
  { key:'N',   name:'ノーマル', stars:1, color:'#94a3b8', glow:'rgba(148,163,184,.0)' },
  { key:'R',   name:'レア',     stars:2, color:'#34d399', glow:'rgba(52,211,153,.45)' },
  { key:'SR',  name:'Sレア',    stars:3, color:'#60a5fa', glow:'rgba(96,165,250,.5)' },
  { key:'SSR', name:'SSレア',   stars:4, color:'#a78bfa', glow:'rgba(167,139,250,.55)' },
  { key:'UR',  name:'URレア',   stars:5, color:'#fbbf24', glow:'rgba(251,191,36,.6)' },
  { key:'LG',  name:'伝説',     stars:6, color:'#f43f5e', glow:'rgba(244,63,94,.62)' },
  { key:'MR',  name:'神話',     stars:7, color:'#e879f9', glow:'rgba(232,121,249,.7)' }
];
// アート→帯（基本種・属性変種・亜種すべて解決）。未知は 0。
function srpgTierOfArt(art){
  if(art==null) return 0;
  if(SRPG_MON_TIER[art]!=null) return SRPG_MON_TIER[art];
  var v=SRPG_MON_VARIANTS2[art]; if(v && SRPG_MON_TIER[v.base]!=null) return SRPG_MON_TIER[v.base];   // 属性変種
  var m=/^(.*)2$/.exec(art); if(m && SRPG_MON_TIER[m[1]]!=null) return SRPG_MON_TIER[m[1]];             // 亜種(色ちがい)
  var uv=/^(.*)_(fire|ice|thunder|dark|holy)$/.exec(art); if(uv && SRPG_MON_TIER[uv[1]]!=null) return SRPG_MON_TIER[uv[1]];
  return 0;
}
function srpgBandOfRank(rank){ var b=SRPG_RANK_BAND[rank]; return b==null?0:b; }
function srpgRarityBand(band){ return SRPG_RARITY_BANDS[Math.max(0,Math.min(SRPG_RARITY_BANDS.length-1, band|0))]; }
// レア度メタ（rank から直接）：{ band, key, name, stars, color, glow }
function srpgRarityOfRank(rank){ var b=srpgBandOfRank(rank); return Object.assign({ band:b }, srpgRarityBand(b)); }
// 候補アート配列から その帯に属するものだけ（スカウトの帯結合に使う）
function srpgArtsForBand(band, arts){ return (arts||[]).filter(function(a){ return srpgTierOfArt(a)===band; }); }
// レア度オーラ枠でモンスターのアートHTMLをくるむ（rank→帯の 色/枠/バッジ）。CSS: .srpg-rar（index.html）。
function srpgRarityWrap(innerHtml, rank){
  var r = srpgRarityOfRank(rank);
  return '<span class="srpg-rar band-'+r.band+' rk-'+(rank||'')+'" style="--rc:'+r.color+';--rg:'+r.glow+'">'
    + '<span class="srpg-rar-in">'+(innerHtml==null?'':innerHtml)+'</span>'
    + '<i class="srpg-rar-badge">'+r.key+'</i></span>';
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { SRPG_MON_ART: SRPG_MON_ART, SRPG_MON_VARIANT: SRPG_MON_VARIANT, srpgMonArt: srpgMonArt, SRPG_MON_VARIANTS2: SRPG_MON_VARIANTS2, SRPG_ELEM_VARIANTS: SRPG_ELEM_VARIANTS, SRPG_MON_BASE_NAMES: SRPG_MON_BASE_NAMES, srpgMonName: srpgMonName,
    SRPG_MON_TIER: SRPG_MON_TIER, SRPG_RANK_BAND: SRPG_RANK_BAND, SRPG_RARITY_BANDS: SRPG_RARITY_BANDS, srpgTierOfArt: srpgTierOfArt, srpgBandOfRank: srpgBandOfRank, srpgRarityBand: srpgRarityBand, srpgRarityOfRank: srpgRarityOfRank, srpgArtsForBand: srpgArtsForBand, srpgRarityWrap: srpgRarityWrap };
}
