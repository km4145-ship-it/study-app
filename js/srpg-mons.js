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
  // ★進化フォーム：キングスライム（SSR）＝大きな体＋黄金の王冠（スライムの進化1段目）
  slime_king:
    _mHead() + _mShadow(36)
    + '<path d="M20 96 Q14 48 60 45 Q106 48 100 96 Q100 110 60 110 Q20 110 20 96 Z" fill="#2bb8aa" stroke="#0a5a52" stroke-width="4"/>'
    + '<path d="M32 68 Q46 54 60 54 Q74 54 88 68 Q72 60 60 60 Q48 60 32 68 Z" fill="#c6fff4" opacity=".5"/>'
    + '<circle cx="34" cy="98" r="4" fill="#c6fff4" opacity=".45"/><circle cx="86" cy="92" r="3" fill="#c6fff4" opacity=".45"/>'
    + '<path d="M38 42 L34 20 L47 33 L60 17 L73 33 L86 20 L82 42 Q60 34 38 42 Z" fill="#fcd34d" stroke="#a16207" stroke-width="2.6"/>'
    + '<circle cx="34" cy="20" r="3" fill="#fef08a" stroke="#a16207" stroke-width="1"/><circle cx="86" cy="20" r="3" fill="#fef08a" stroke="#a16207" stroke-width="1"/><circle cx="60" cy="17" r="3.6" fill="#fef08a" stroke="#a16207" stroke-width="1"/>'
    + _mEye(49, 82, 9.5, 1) + _mEye(72, 82, 9.5, 1)
    + _mCheek(41, 92) + _mCheek(82, 92)
    + '<path d="M48 98 Q60 107 73 98" stroke="#0a5a52" stroke-width="3.4" fill="none" stroke-linecap="round"/>'
    + '</svg>',
  // ★進化フォーム：スライム魔神（伝説）＝闇色の巨体・角・冠・妖しく光る眼＋オーラ（スライム最終形）
  slime_lord:
    _mHead()
    + '<ellipse cx="60" cy="112" rx="40" ry="7" fill="rgba(0,0,0,.4)"/>'
    + '<circle cx="60" cy="60" r="52" fill="#a855f7" opacity=".12"/>'
    + '<path d="M30 46 Q20 26 14 12 Q30 22 40 40 Z" fill="#2a1352" stroke="#1e0a3c" stroke-width="2.4"/>'
    + '<path d="M90 46 Q100 26 106 12 Q90 22 80 40 Z" fill="#2a1352" stroke="#1e0a3c" stroke-width="2.4"/>'
    + '<path d="M18 96 Q12 44 60 41 Q108 44 102 96 Q102 112 60 112 Q18 112 18 96 Z" fill="#4c1d95" stroke="#1e0a3c" stroke-width="4.2"/>'
    + '<path d="M30 66 Q46 50 60 50 Q74 50 90 66 Q72 56 60 56 Q48 56 30 66 Z" fill="#c4b5fd" opacity=".35"/>'
    + '<path d="M40 40 L36 18 L48 31 L60 14 L72 31 L84 18 L80 40 Q60 32 40 40 Z" fill="#fbbf24" stroke="#7c2d12" stroke-width="2.4"/>'
    + '<circle cx="60" cy="15" r="3.6" fill="#fef08a"/>'
    + '<ellipse cx="49" cy="80" rx="9" ry="5" fill="#c084fc" opacity=".5"/><ellipse cx="72" cy="80" rx="9" ry="5" fill="#c084fc" opacity=".5"/>'
    + _mEyeSharp(49, 82, 8, 1, '#e879f9') + _mEyeSharp(72, 82, 8, -1, '#e879f9')
    + '<path d="M48 99 Q60 94 72 99" stroke="#1e0a3c" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '<path d="M53 98 L55 103 M60 97 L60 102 M67 98 L65 103" stroke="#e2d5f8" stroke-width="1.6" stroke-linecap="round"/>'
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
// ===== 新規モンスター Batch1（質重視・手描き。属性変種は自動生成。※実機で見た目の確認をお願いします）=====
Object.assign(SRPG_MON_BASE_NAMES, { kinoko:'マッシュ', tori:'ピヨすけ', kaeru:'ケロン', iwagon:'イワゴン', onibi:'オニビ', kani:'カニロー' });
// ===== 新規モンスター Batch2（10体・質重視・手描き。※実機で見た目の確認をお願いします）=====
Object.assign(SRPG_MON_BASE_NAMES, { hitsuji:'ヒツジロン', kumo:'クモまる', tako:'タコすけ', hebi:'ニョロン', pengin:'ペンぞう', hitode:'ヒトデちゃん', tokage:'トカゲロン', ki:'ウッディ', yuki:'ユキだるま', ryunoko:'リュウのこ' });
// ===== 新規モンスター Batch3（12体・質重視・手描き）=====
Object.assign(SRPG_MON_BASE_NAMES, { usagi:'ウサマル', buta:'ブーちゃん', risu:'リスすけ', mogura:'モグッチ', kurage:'クラゲーヌ', kabuto:'カブトくん', koala:'コアラン', same:'サメゴン', wani:'ワニゴン', kitsune:'キツネび', woodgo:'モクゴン', hinotori:'ヒノトリ' });
// ===== 新規モンスター Batch4（12体・質重視・手描き）=====
Object.assign(SRPG_MON_BASE_NAMES, { tanuki:'タヌポン', hamu:'ハムりん', kame:'カメきち', ushi:'ウシもー', zou:'ゾウすけ', kaba:'カバお', kirin:'キリンぬ', lion:'レオン', washi:'ワシオ', hyoudra:'ヒョウドラ', hagane:'ハガネル', unicorn:'ユニコン' });
// ===== 新規モンスター Batch5（12体・質重視・手描き）=====
Object.assign(SRPG_MON_BASE_NAMES, { ebi:'エビてん', hachi:'ハチすけ', ari:'アリんこ', ika:'イカール', kuroneko:'クロネ', fukurou:'フクロン', chou:'チョウか', kappa:'カッパん', oni:'アオオニ', tengu:'テングー', umihebi:'ウミヘビ', kurisu:'クリスタン' });
// ===== 新規モンスター Batch6（8体・質重視・手描き。これで図鑑500種到達）=====
Object.assign(SRPG_MON_BASE_NAMES, { shika:'シカもり', saru:'サルどん', kujira:'クジラン', pega:'ペガっち', magma:'マグマル', seiryu:'セイリュウ', kabocha:'カボたん', denki:'ビリでん' });
Object.assign(SRPG_MON_ART, {
  shika:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M44 46 Q40 28 32 24 M44 40 Q34 34 28 36 M76 46 Q80 28 88 24 M76 40 Q86 34 92 36" stroke="#78350f" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="60" cy="76" r="30" fill="#c2724a" stroke="#7c3a12" stroke-width="3.4"/><circle cx="50" cy="66" r="3" fill="#fef3c7" opacity=".8"/><circle cx="70" cy="70" r="3" fill="#fef3c7" opacity=".8"/><circle cx="58" cy="88" r="3" fill="#fef3c7" opacity=".8"/><circle cx="50" cy="72" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="74" r="3.2" fill="#151b2e"/><circle cx="70" cy="72" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="74" r="3.2" fill="#151b2e"/><ellipse cx="60" cy="84" rx="5" ry="3.5" fill="#1e2637"/></svg>',
  saru:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><circle cx="30" cy="70" r="12" fill="#a16207" stroke="#713f12" stroke-width="3"/><circle cx="90" cy="70" r="12" fill="#a16207" stroke="#713f12" stroke-width="3"/><circle cx="30" cy="70" r="6" fill="#fbcfe8"/><circle cx="90" cy="70" r="6" fill="#fbcfe8"/><circle cx="60" cy="74" r="30" fill="#a8895f" stroke="#713f12" stroke-width="3.4"/><path d="M40 78 Q40 60 60 58 Q80 60 80 78 Q80 96 60 96 Q40 96 40 78 Z" fill="#fde8d0"/><circle cx="51" cy="72" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="52" cy="74" r="3" fill="#151b2e"/><circle cx="69" cy="72" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="70" cy="74" r="3" fill="#151b2e"/><ellipse cx="56" cy="82" rx="2" ry="2.6" fill="#7c3a12"/><ellipse cx="64" cy="82" rx="2" ry="2.6" fill="#7c3a12"/><path d="M54 88 Q60 92 66 88" stroke="#7c3a12" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  kujira:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M56 44 Q52 32 60 26 Q68 32 64 44" fill="none" stroke="#7dd3fc" stroke-width="4" stroke-linecap="round"/><path d="M28 80 Q26 56 60 54 Q86 56 90 74 Q102 66 106 76 Q100 86 88 84 Q84 96 60 96 Q28 96 28 80 Z" fill="#3b82f6" stroke="#1e40af" stroke-width="3.4"/><path d="M32 88 Q60 98 82 88" fill="#bfdbfe" opacity=".6"/><path d="M40 76 Q60 80 78 76" stroke="#1e40af" stroke-width="1.6" fill="none"/><circle cx="48" cy="70" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="49" cy="72" r="3.2" fill="#151b2e"/><circle cx="70" cy="70" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="72" r="3.2" fill="#151b2e"/></svg>',
  pega:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M32 58 Q10 46 8 66 Q22 72 38 64 Z" fill="#e0e7ff" stroke="#818cf8" stroke-width="2.8"/><path d="M88 58 Q110 46 112 66 Q98 72 82 64 Z" fill="#e0e7ff" stroke="#818cf8" stroke-width="2.8"/><path d="M40 46 L36 32 L50 44 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2.4"/><path d="M80 46 L84 32 L70 44 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2.4"/><circle cx="60" cy="76" r="29" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3.4"/><circle cx="50" cy="72" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="74" r="3.2" fill="#151b2e"/><circle cx="70" cy="72" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="74" r="3.2" fill="#151b2e"/><ellipse cx="60" cy="84" rx="6" ry="4" fill="#e0e7ff"/><path d="M55 90 Q60 93 65 90" stroke="#94a3b8" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
  magma:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M34 50 L52 40 L74 42 L88 56 L84 96 Q84 104 74 104 L46 104 Q34 104 34 94 Z" fill="#292524" stroke="#0c0a09" stroke-width="3.6" stroke-linejoin="round"/><path d="M44 52 L52 68 L44 82 M78 54 L68 70 L80 86 M58 44 L60 62 L54 78" stroke="#f97316" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="60" cy="90" r="3" fill="#fbbf24"/><circle cx="50" cy="72" r="7" fill="#fbbf24" stroke="#c2410c" stroke-width="1.6"/><circle cx="51" cy="74" r="3.2" fill="#7c2d12"/><circle cx="72" cy="72" r="7" fill="#fbbf24" stroke="#c2410c" stroke-width="1.6"/><circle cx="73" cy="74" r="3.2" fill="#7c2d12"/></svg>',
  seiryu:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M32 100 Q14 92 20 74 Q26 60 46 66 Q68 72 60 56 Q54 44 40 46" fill="none" stroke="#0891b2" stroke-width="13" stroke-linecap="round"/><path d="M32 100 Q14 92 20 74 Q26 60 46 66 Q68 72 60 56 Q54 44 40 46" fill="none" stroke="#22d3ee" stroke-width="7" stroke-linecap="round"/><circle cx="72" cy="46" r="18" fill="#06b6d4" stroke="#0e7490" stroke-width="3.2"/><path d="M64 30 L60 20 L70 28 M84 34 L94 30 L88 40" fill="#67e8f9" stroke="#0e7490" stroke-width="1.8"/><path d="M60 52 Q48 54 42 50 M84 52 Q96 54 102 50" stroke="#0e7490" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="67" cy="42" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="68" cy="44" r="2.8" fill="#164e63"/><circle cx="80" cy="42" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="81" cy="44" r="2.8" fill="#164e63"/></svg>',
  kabocha:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M56 42 L56 32 Q56 28 62 30 L62 42 Z" fill="#65a30d" stroke="#3f6212" stroke-width="2.4"/><ellipse cx="60" cy="76" rx="34" ry="30" fill="#f97316" stroke="#c2410c" stroke-width="3.4"/><path d="M44 50 Q44 100 44 100 M60 46 L60 106 M76 50 Q76 100 76 100" stroke="#c2410c" stroke-width="2" fill="none" opacity=".7"/><path d="M44 70 L54 66 L48 78 Z" fill="#7c2d12"/><path d="M76 70 L66 66 L72 78 Z" fill="#7c2d12"/><path d="M46 88 L52 84 L56 90 L62 84 L66 90 L72 84 L76 88 Q60 98 46 88 Z" fill="#7c2d12"/></svg>',
  denki:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="6" fill="rgba(0,0,0,.26)"/><path d="M40 46 L34 24 L50 42 Z" fill="#fcd34d" stroke="#78350f" stroke-width="2.6"/><path d="M80 46 L86 24 L70 42 Z" fill="#fcd34d" stroke="#78350f" stroke-width="2.6"/><path d="M40 42 L38 30 M80 42 L82 30" stroke="#151b2e" stroke-width="4" stroke-linecap="round"/><path d="M86 84 L98 70 L90 70 L100 56" fill="none" stroke="#fbbf24" stroke-width="5" stroke-linejoin="round"/><circle cx="60" cy="76" r="30" fill="#fde047" stroke="#b45309" stroke-width="3.4"/><circle cx="44" cy="82" r="6" fill="#ef4444"/><circle cx="76" cy="82" r="6" fill="#ef4444"/><circle cx="51" cy="72" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="52" cy="74" r="3" fill="#151b2e"/><circle cx="69" cy="72" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="70" cy="74" r="3" fill="#151b2e"/><path d="M56 84 L60 87 L64 84" stroke="#7c2d12" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
});
Object.assign(SRPG_MON_ART, {
  ebi:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="6" fill="rgba(0,0,0,.26)"/><path d="M40 96 Q22 90 26 70 Q30 52 50 54 Q46 66 50 78 Q56 90 68 88 Q60 96 40 96 Z" fill="#fb923c" stroke="#c2410c" stroke-width="3.4"/><path d="M64 84 L82 96 M68 78 L88 84" stroke="#f97316" stroke-width="4" stroke-linecap="round"/><path d="M46 54 Q40 36 30 34 M50 54 Q48 36 40 32" stroke="#c2410c" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="42" cy="60" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="43" cy="62" r="3" fill="#151b2e"/><circle cx="52" cy="62" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="53" cy="64" r="3" fill="#151b2e"/></svg>',
  hachi:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="6" fill="rgba(0,0,0,.26)"/><ellipse cx="40" cy="58" rx="14" ry="9" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="2" opacity=".8"/><ellipse cx="80" cy="58" rx="14" ry="9" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="2" opacity=".8"/><circle cx="60" cy="76" r="28" fill="#fcd34d" stroke="#78350f" stroke-width="3.4"/><path d="M46 60 Q60 56 74 60 M40 76 Q60 74 80 76 M46 92 Q60 96 74 92" stroke="#78350f" stroke-width="5" fill="none"/><path d="M52 50 Q48 40 44 40 M68 50 Q72 40 76 40" stroke="#78350f" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="44" cy="40" r="3" fill="#78350f"/><circle cx="76" cy="40" r="3" fill="#78350f"/><circle cx="51" cy="72" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="52" cy="74" r="3" fill="#151b2e"/><circle cx="69" cy="72" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="70" cy="74" r="3" fill="#151b2e"/></svg>',
  ari:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M40 78 L28 70 M40 84 L26 84 M40 90 L28 98 M56 80 L58 66 M64 80 L62 66" stroke="#7c2d12" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="84" cy="80" rx="18" ry="15" fill="#9a3412" stroke="#7c2d12" stroke-width="3"/><ellipse cx="58" cy="80" rx="12" ry="11" fill="#c2410c" stroke="#7c2d12" stroke-width="3"/><circle cx="34" cy="76" r="15" fill="#9a3412" stroke="#7c2d12" stroke-width="3.2"/><path d="M28 62 Q22 52 18 54 M38 62 Q40 52 44 52" stroke="#7c2d12" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="30" cy="74" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="31" cy="76" r="2.8" fill="#151b2e"/><circle cx="40" cy="74" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="41" cy="76" r="2.8" fill="#151b2e"/></svg>',
  ika:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="5.5" fill="rgba(0,0,0,.26)"/><path d="M60 22 L44 66 L76 66 Z" fill="#fbcfe8" stroke="#be185d" stroke-width="3.2" stroke-linejoin="round"/><path d="M44 66 Q42 60 34 60 M76 66 Q78 60 86 60" fill="#f9a8d4" stroke="#be185d" stroke-width="2.6"/><path d="M44 68 Q40 94 34 104 M52 68 Q50 98 56 108 M60 70 L60 108 M68 68 Q70 98 64 108 M76 68 Q80 94 86 104" stroke="#f472b6" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="52" cy="58" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="53" cy="60" r="3.2" fill="#151b2e"/><circle cx="68" cy="58" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="69" cy="60" r="3.2" fill="#151b2e"/></svg>',
  kuroneko:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M38 50 L32 28 L54 46 Z" fill="#1e293b" stroke="#0f172a" stroke-width="2.6"/><path d="M82 50 L88 28 L66 46 Z" fill="#1e293b" stroke="#0f172a" stroke-width="2.6"/><circle cx="60" cy="76" r="31" fill="#1e293b" stroke="#0f172a" stroke-width="3.4"/><ellipse cx="49" cy="72" rx="6" ry="8" fill="#4ade80"/><ellipse cx="71" cy="72" rx="6" ry="8" fill="#4ade80"/><ellipse cx="49" cy="72" rx="2.4" ry="7" fill="#052e16"/><ellipse cx="71" cy="72" rx="2.4" ry="7" fill="#052e16"/><path d="M56 84 L60 87 L64 84 Z" fill="#f472b6"/><path d="M34 80 L48 82 M86 80 L72 82" stroke="#475569" stroke-width="1.4" stroke-linecap="round"/></svg>',
  fukurou:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M38 48 L40 34 L52 46 Z" fill="#78350f" stroke="#451a03" stroke-width="2.4"/><path d="M82 48 L80 34 L68 46 Z" fill="#78350f" stroke="#451a03" stroke-width="2.4"/><circle cx="60" cy="76" r="32" fill="#92400e" stroke="#451a03" stroke-width="3.4"/><path d="M40 90 Q60 100 80 90" fill="#c2724a" opacity=".6"/><circle cx="48" cy="70" r="13" fill="#fef3c7" stroke="#451a03" stroke-width="2.4"/><circle cx="72" cy="70" r="13" fill="#fef3c7" stroke="#451a03" stroke-width="2.4"/><circle cx="48" cy="70" r="6" fill="#151b2e"/><circle cx="72" cy="70" r="6" fill="#151b2e"/><circle cx="46" cy="68" r="2" fill="#fff"/><circle cx="70" cy="68" r="2" fill="#fff"/><path d="M60 78 L54 84 L60 88 L66 84 Z" fill="#fbbf24" stroke="#c2410c" stroke-width="1.6"/></svg>',
  chou:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="20" ry="5" fill="rgba(0,0,0,.26)"/><path d="M56 60 Q28 40 22 58 Q26 74 54 72 Z" fill="#a78bfa" stroke="#6d28d9" stroke-width="2.8"/><path d="M56 74 Q30 82 28 98 Q40 104 56 88 Z" fill="#c4b5fd" stroke="#6d28d9" stroke-width="2.8"/><path d="M64 60 Q92 40 98 58 Q94 74 66 72 Z" fill="#a78bfa" stroke="#6d28d9" stroke-width="2.8"/><path d="M64 74 Q90 82 92 98 Q80 104 64 88 Z" fill="#c4b5fd" stroke="#6d28d9" stroke-width="2.8"/><circle cx="34" cy="56" r="4" fill="#f472b6"/><circle cx="86" cy="56" r="4" fill="#f472b6"/><ellipse cx="60" cy="74" rx="6" ry="20" fill="#4c1d95" stroke="#2e1065" stroke-width="2"/><path d="M56 52 Q50 42 46 44 M64 52 Q70 42 74 44" stroke="#2e1065" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="55" cy="62" r="3" fill="#fff"/><circle cx="65" cy="62" r="3" fill="#fff"/><circle cx="55" cy="62" r="1.5" fill="#151b2e"/><circle cx="65" cy="62" r="1.5" fill="#151b2e"/></svg>',
  kappa:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><ellipse cx="60" cy="86" rx="26" ry="18" fill="#65a30d" stroke="#3f6212" stroke-width="3.2"/><circle cx="60" cy="60" r="26" fill="#84cc16" stroke="#3f6212" stroke-width="3.4"/><ellipse cx="60" cy="46" rx="16" ry="7" fill="#bef264" stroke="#3f6212" stroke-width="2.4"/><ellipse cx="60" cy="46" rx="10" ry="4" fill="#a3e635"/><circle cx="51" cy="60" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="52" cy="62" r="3.2" fill="#151b2e"/><circle cx="69" cy="60" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="70" cy="62" r="3.2" fill="#151b2e"/><ellipse cx="60" cy="70" rx="5" ry="3" fill="#f59e0b" stroke="#c2410c" stroke-width="1.4"/></svg>',
  oni:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M44 44 L40 30 L50 40 Z" fill="#fef3c7" stroke="#b45309" stroke-width="2.4"/><path d="M76 44 L80 30 L70 40 Z" fill="#fef3c7" stroke="#b45309" stroke-width="2.4"/><circle cx="60" cy="74" r="32" fill="#3b82f6" stroke="#1e40af" stroke-width="3.4"/><path d="M44 60 L54 64 M76 60 L66 64" stroke="#1e40af" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="68" r="7" fill="#fff" stroke="#1e2637" stroke-width="1.6"/><circle cx="51" cy="70" r="3.4" fill="#dc2626"/><circle cx="70" cy="68" r="7" fill="#fff" stroke="#1e2637" stroke-width="1.6"/><circle cx="71" cy="70" r="3.4" fill="#dc2626"/><path d="M46 86 Q60 96 74 86 L74 88 L68 88 L68 94 L64 88 L56 88 L52 94 L52 88 L46 88 Z" fill="#fff" stroke="#1e40af" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  tengu:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M30 60 Q12 52 10 68 Q22 72 34 66 Z" fill="#7c2d12" stroke="#451a03" stroke-width="2.6"/><path d="M90 60 Q108 52 110 68 Q98 72 86 66 Z" fill="#7c2d12" stroke="#451a03" stroke-width="2.6"/><circle cx="60" cy="72" r="28" fill="#dc2626" stroke="#7f1d1d" stroke-width="3.4"/><path d="M60 72 Q60 88 58 98 Q66 96 64 84 L62 74 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="2.4" stroke-linejoin="round"/><path d="M42 62 L54 66 M78 62 L66 66" stroke="#7f1d1d" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="68" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="70" r="3" fill="#151b2e"/><circle cx="70" cy="68" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="70" r="3" fill="#151b2e"/></svg>',
  umihebi:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M34 102 Q16 96 22 80 Q28 66 46 70 Q68 74 62 60 Q58 48 42 50" fill="none" stroke="#0ea5e9" stroke-width="13" stroke-linecap="round"/><path d="M34 102 Q16 96 22 80 Q28 66 46 70 Q68 74 62 60 Q58 48 42 50" fill="none" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/><circle cx="74" cy="50" r="17" fill="#38bdf8" stroke="#0369a1" stroke-width="3.2"/><path d="M74 34 L70 24 L78 30 M88 44 L98 40 L92 50" fill="#7dd3fc" stroke="#0369a1" stroke-width="1.8"/><circle cx="69" cy="46" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="70" cy="48" r="2.8" fill="#0c4a6e"/><circle cx="81" cy="46" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="82" cy="48" r="2.8" fill="#0c4a6e"/></svg>',
  kurisu:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M60 30 L88 56 L78 100 L42 100 L32 56 Z" fill="#a5f3fc" stroke="#0891b2" stroke-width="3.6" stroke-linejoin="round"/><path d="M60 30 L60 100 M32 56 L88 56 M60 30 L42 100 M60 30 L78 100" stroke="#22d3ee" stroke-width="1.8" opacity=".7"/><path d="M46 44 L54 40 L52 50 Z" fill="#ecfeff" opacity=".8"/><circle cx="50" cy="70" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="72" r="3.2" fill="#0e7490"/><circle cx="70" cy="70" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="72" r="3.2" fill="#0e7490"/><path d="M54 82 Q60 86 66 82" stroke="#0891b2" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
});
Object.assign(SRPG_MON_ART, {
  tanuki:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M40 48 L34 32 L52 44 Z" fill="#a16207" stroke="#713f12" stroke-width="2.4"/><path d="M80 48 L86 32 L68 44 Z" fill="#a16207" stroke="#713f12" stroke-width="2.4"/><circle cx="60" cy="76" r="31" fill="#a8895f" stroke="#713f12" stroke-width="3.4"/><ellipse cx="49" cy="72" rx="10" ry="8" fill="#5b4423"/><ellipse cx="71" cy="72" rx="10" ry="8" fill="#5b4423"/><circle cx="49" cy="72" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="50" cy="74" r="2.8" fill="#151b2e"/><circle cx="71" cy="72" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="72" cy="74" r="2.8" fill="#151b2e"/><ellipse cx="60" cy="84" rx="4" ry="3" fill="#1e2637"/><path d="M56 90 Q60 93 64 90" stroke="#5b4423" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  hamu:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="6" fill="rgba(0,0,0,.26)"/><circle cx="46" cy="50" r="9" fill="#fcd34d" stroke="#b45309" stroke-width="2.6"/><circle cx="74" cy="50" r="9" fill="#fcd34d" stroke="#b45309" stroke-width="2.6"/><circle cx="60" cy="78" r="30" fill="#fde68a" stroke="#b45309" stroke-width="3.4"/><ellipse cx="42" cy="84" rx="10" ry="8" fill="#fef3c7"/><ellipse cx="78" cy="84" rx="10" ry="8" fill="#fef3c7"/><circle cx="51" cy="74" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="52" cy="76" r="3" fill="#151b2e"/><circle cx="69" cy="74" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="70" cy="76" r="3" fill="#151b2e"/><ellipse cx="60" cy="82" rx="3" ry="2.4" fill="#1e2637"/></svg>',
  kame:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><ellipse cx="60" cy="80" rx="34" ry="24" fill="#a16207" stroke="#713f12" stroke-width="3.6"/><path d="M60 58 L60 102 M38 74 L82 74 M40 90 L80 90" stroke="#713f12" stroke-width="2.2"/><circle cx="60" cy="50" r="15" fill="#4ade80" stroke="#15803d" stroke-width="3.2"/><circle cx="54" cy="48" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="55" cy="50" r="2.8" fill="#151b2e"/><circle cx="66" cy="48" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="67" cy="50" r="2.8" fill="#151b2e"/><path d="M56 56 Q60 59 64 56" stroke="#15803d" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
  ushi:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M38 48 Q30 40 34 50 Q40 54 44 50 M82 48 Q90 40 86 50 Q80 54 76 50" fill="#f5f5f4" stroke="#78716c" stroke-width="2.6"/><circle cx="60" cy="76" r="32" fill="#fafaf9" stroke="#57534e" stroke-width="3.4"/><path d="M36 62 Q30 74 40 80 Q48 74 44 62 Z" fill="#292524"/><path d="M82 84 Q92 82 88 92 Q80 92 78 86 Z" fill="#292524"/><ellipse cx="60" cy="88" rx="14" ry="9" fill="#fbcfe8" stroke="#be185d" stroke-width="2"/><circle cx="55" cy="88" r="2.2" fill="#831843"/><circle cx="65" cy="88" r="2.2" fill="#831843"/><circle cx="50" cy="70" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="72" r="3" fill="#151b2e"/><circle cx="70" cy="70" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="72" r="3" fill="#151b2e"/></svg>',
  zou:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><ellipse cx="30" cy="70" rx="16" ry="20" fill="#a1a1aa" stroke="#52525b" stroke-width="3"/><ellipse cx="90" cy="70" rx="16" ry="20" fill="#a1a1aa" stroke="#52525b" stroke-width="3"/><circle cx="60" cy="72" r="30" fill="#a1a1aa" stroke="#52525b" stroke-width="3.4"/><path d="M60 78 Q56 96 62 104 Q70 102 66 92 L64 84 Z" fill="#a1a1aa" stroke="#52525b" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="66" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="68" r="3" fill="#151b2e"/><circle cx="70" cy="66" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="68" r="3" fill="#151b2e"/></svg>',
  kaba:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><circle cx="48" cy="50" r="6" fill="#c4b5fd" stroke="#7c3aed" stroke-width="2"/><circle cx="72" cy="50" r="6" fill="#c4b5fd" stroke="#7c3aed" stroke-width="2"/><path d="M30 82 Q28 56 60 54 Q92 56 90 82 Q90 100 60 100 Q30 100 30 82 Z" fill="#c4b5fd" stroke="#7c3aed" stroke-width="3.4"/><path d="M38 88 Q60 102 82 88" fill="#f472b6" stroke="#be185d" stroke-width="2"/><rect x="44" y="82" width="5" height="8" rx="2" fill="#fff"/><rect x="71" y="82" width="5" height="8" rx="2" fill="#fff"/><circle cx="50" cy="66" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="68" r="3" fill="#151b2e"/><circle cx="70" cy="66" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="68" r="3" fill="#151b2e"/></svg>',
  kirin:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M52 100 L54 60 Q54 44 66 42 Q78 44 76 62 L74 100 Z" fill="#fcd34d" stroke="#b45309" stroke-width="3.4"/><circle cx="70" cy="40" r="16" fill="#fde68a" stroke="#b45309" stroke-width="3.2"/><path d="M62 26 L60 18 M78 26 L80 18" stroke="#b45309" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="30" r="3" fill="#a16207"/><circle cx="80" cy="30" r="3" fill="#a16207"/><circle cx="60" cy="74" r="5" fill="#d97706" opacity=".6"/><circle cx="68" cy="88" r="5" fill="#d97706" opacity=".6"/><circle cx="64" cy="40" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="65" cy="42" r="2.8" fill="#151b2e"/><circle cx="78" cy="40" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="79" cy="42" r="2.8" fill="#151b2e"/></svg>',
  lion:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M60 30 L66 44 L82 38 L80 54 L96 60 L82 68 L88 84 L72 82 L66 96 L60 84 L54 96 L48 82 L32 84 L38 68 L24 60 L40 54 L38 38 L54 44 Z" fill="#d97706" stroke="#92400e" stroke-width="3.2" stroke-linejoin="round"/><circle cx="60" cy="66" r="24" fill="#fbbf24" stroke="#b45309" stroke-width="3"/><circle cx="51" cy="62" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="52" cy="64" r="3" fill="#151b2e"/><circle cx="69" cy="62" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="70" cy="64" r="3" fill="#151b2e"/><path d="M54 72 L60 76 L66 72" fill="#78350f"/><path d="M60 76 Q54 82 48 78 M60 76 Q66 82 72 78" stroke="#92400e" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
  washi:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M32 60 Q10 54 8 74 Q22 76 36 70 Z" fill="#78350f" stroke="#451a03" stroke-width="2.8"/><path d="M88 60 Q110 54 112 74 Q98 76 84 70 Z" fill="#78350f" stroke="#451a03" stroke-width="2.8"/><circle cx="60" cy="72" r="28" fill="#92400e" stroke="#451a03" stroke-width="3.4"/><path d="M40 50 Q60 42 80 50 Q60 54 40 50 Z" fill="#f5f5f4"/><path d="M60 74 L52 80 L60 86 L68 80 Z" fill="#fbbf24" stroke="#c2410c" stroke-width="1.8"/><circle cx="50" cy="66" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="68" r="3.2" fill="#151b2e"/><circle cx="70" cy="66" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="68" r="3.2" fill="#151b2e"/></svg>',
  hyoudra:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M84 96 Q104 94 100 78 Q96 66 84 70" fill="none" stroke="#0ea5e9" stroke-width="8" stroke-linecap="round"/><path d="M30 58 Q16 50 14 62 Q24 66 32 64 M90 58 Q104 50 106 62 Q96 66 88 64" fill="#bae6fd" stroke="#0369a1" stroke-width="2.6"/><path d="M32 82 Q28 56 60 54 Q92 56 88 82 Q88 98 60 98 Q32 98 32 82 Z" fill="#7dd3fc" stroke="#0369a1" stroke-width="3.4"/><path d="M48 54 L52 42 L56 54 M60 54 L64 40 L68 54" fill="#e0f2fe" stroke="#0369a1" stroke-width="1.8"/><circle cx="50" cy="74" r="7" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="76" r="3.4" fill="#0c4a6e"/><circle cx="70" cy="74" r="7" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="76" r="3.4" fill="#0c4a6e"/><path d="M54 86 Q60 90 66 86" stroke="#0369a1" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  hagane:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M36 46 L60 38 L84 46 L84 96 Q84 104 74 104 L46 104 Q36 104 36 96 Z" fill="#cbd5e1" stroke="#475569" stroke-width="3.6" stroke-linejoin="round"/><path d="M36 62 L84 62 M60 38 L60 62" stroke="#475569" stroke-width="2.2"/><circle cx="44" cy="54" r="2.6" fill="#64748b"/><circle cx="76" cy="54" r="2.6" fill="#64748b"/><rect x="46" y="70" width="12" height="10" rx="2" fill="#38bdf8" stroke="#1e2637" stroke-width="1.5"/><rect x="62" y="70" width="12" height="10" rx="2" fill="#38bdf8" stroke="#1e2637" stroke-width="1.5"/><circle cx="52" cy="75" r="2.6" fill="#0c4a6e"/><circle cx="68" cy="75" r="2.6" fill="#0c4a6e"/><path d="M48 92 L54 90 L60 92 L66 90 L72 92" stroke="#475569" stroke-width="2.6" fill="none" stroke-linejoin="round"/></svg>',
  unicorn:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M60 42 L57 20 L66 40 Z" fill="#fbbf24" stroke="#b45309" stroke-width="2.2"/><path d="M44 46 L40 32 L52 44 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2.4"/><path d="M76 46 L80 32 L68 44 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2.4"/><path d="M42 44 Q30 52 34 68 Q40 60 44 58" fill="#a5b4fc" stroke="#6366f1" stroke-width="2.4"/><circle cx="60" cy="74" r="30" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3.4"/><circle cx="50" cy="70" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="72" r="3.2" fill="#151b2e"/><circle cx="70" cy="70" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="72" r="3.2" fill="#151b2e"/><ellipse cx="60" cy="82" rx="6" ry="4" fill="#fbcfe8"/><path d="M55 88 Q60 91 65 88" stroke="#94a3b8" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>'
});
Object.assign(SRPG_MON_ART, {
  usagi:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="6" fill="rgba(0,0,0,.26)"/><path d="M46 40 Q42 12 52 12 Q60 14 56 44 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/><path d="M74 40 Q78 12 68 12 Q60 14 64 44 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/><path d="M48 42 Q46 20 52 18 M72 42 Q74 20 68 18" stroke="#fbcfe8" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="60" cy="76" r="30" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3.4"/><circle cx="50" cy="72" r="7" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="74" r="3.4" fill="#151b2e"/><circle cx="70" cy="72" r="7" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="74" r="3.4" fill="#151b2e"/><path d="M56 82 L60 86 L64 82 Z" fill="#fb7185"/><ellipse cx="46" cy="82" rx="4" ry="2.6" fill="#fbcfe8" opacity=".6"/><ellipse cx="74" cy="82" rx="4" ry="2.6" fill="#fbcfe8" opacity=".6"/></svg>',
  buta:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M40 46 L36 30 L52 42 Z" fill="#f9a8d4" stroke="#be185d" stroke-width="2.6"/><path d="M80 46 L84 30 L68 42 Z" fill="#f9a8d4" stroke="#be185d" stroke-width="2.6"/><circle cx="60" cy="74" r="32" fill="#f9a8d4" stroke="#be185d" stroke-width="3.4"/><ellipse cx="60" cy="82" rx="14" ry="10" fill="#f472b6" stroke="#be185d" stroke-width="2.6"/><circle cx="55" cy="82" r="2.4" fill="#831843"/><circle cx="65" cy="82" r="2.4" fill="#831843"/><circle cx="49" cy="68" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="50" cy="70" r="3.2" fill="#151b2e"/><circle cx="71" cy="68" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="72" cy="70" r="3.2" fill="#151b2e"/></svg>',
  risu:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="6" fill="rgba(0,0,0,.26)"/><path d="M84 96 Q112 88 104 58 Q98 40 82 48 Q96 56 92 76 Q88 92 78 90 Z" fill="#c2724a" stroke="#7c3a12" stroke-width="3.2"/><path d="M42 48 L40 34 L52 44 Z" fill="#c2724a" stroke="#7c3a12" stroke-width="2.4"/><path d="M74 48 L76 34 L64 44 Z" fill="#c2724a" stroke="#7c3a12" stroke-width="2.4"/><circle cx="56" cy="76" r="28" fill="#d18a5f" stroke="#7c3a12" stroke-width="3.4"/><circle cx="48" cy="72" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="49" cy="74" r="3.2" fill="#151b2e"/><circle cx="66" cy="72" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="67" cy="74" r="3.2" fill="#151b2e"/><path d="M53 80 L57 84 L61 80 Z" fill="#7c3a12"/></svg>',
  mogura:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><circle cx="60" cy="76" r="30" fill="#78716c" stroke="#44403c" stroke-width="3.4"/><path d="M30 88 Q22 84 20 92 Q26 96 32 94 M28 80 Q20 78 18 86" stroke="#44403c" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M90 88 Q98 84 100 92 Q94 96 88 94 M92 80 Q100 78 102 86" stroke="#44403c" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="60" cy="80" rx="8" ry="6" fill="#fb7185" stroke="#be123c" stroke-width="2"/><circle cx="52" cy="70" r="4" fill="#151b2e"/><circle cx="68" cy="70" r="4" fill="#151b2e"/></svg>',
  kurage:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="5.5" fill="rgba(0,0,0,.26)"/><path d="M28 66 Q28 34 60 34 Q92 34 92 66 Q92 72 84 72 L36 72 Q28 72 28 66 Z" fill="#a5b4fc" stroke="#4f46e5" stroke-width="3.4" opacity=".92"/><path d="M40 72 Q38 96 44 104 M52 72 Q50 100 56 108 M68 72 Q70 100 64 108 M80 72 Q82 96 76 104" stroke="#818cf8" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="51" cy="58" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="52" cy="60" r="3.2" fill="#151b2e"/><circle cx="69" cy="58" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="70" cy="60" r="3.2" fill="#151b2e"/><path d="M55 66 Q60 69 65 66" stroke="#4f46e5" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  kabuto:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M60 46 Q56 30 60 22 Q64 30 60 46 M60 30 Q52 26 50 32 M60 30 Q68 26 70 32" fill="none" stroke="#78350f" stroke-width="4" stroke-linecap="round"/><ellipse cx="60" cy="78" rx="30" ry="28" fill="#78350f" stroke="#451a03" stroke-width="3.4"/><path d="M60 52 L60 104" stroke="#451a03" stroke-width="2.6"/><path d="M32 74 L18 68 M32 84 L18 90 M88 74 L102 68 M88 84 L102 90" stroke="#451a03" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="66" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="51" cy="68" r="2.6" fill="#151b2e"/><circle cx="70" cy="66" r="5.5" fill="#fff" stroke="#1e2637" stroke-width="1.4"/><circle cx="71" cy="68" r="2.6" fill="#151b2e"/></svg>',
  koala:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><circle cx="34" cy="54" r="16" fill="#94a3b8" stroke="#475569" stroke-width="3"/><circle cx="86" cy="54" r="16" fill="#94a3b8" stroke="#475569" stroke-width="3"/><circle cx="34" cy="54" r="8" fill="#cbd5e1"/><circle cx="86" cy="54" r="8" fill="#cbd5e1"/><circle cx="60" cy="76" r="30" fill="#94a3b8" stroke="#475569" stroke-width="3.4"/><ellipse cx="60" cy="82" rx="10" ry="13" fill="#334155" stroke="#1e293b" stroke-width="2"/><circle cx="50" cy="70" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="72" r="3.2" fill="#151b2e"/><circle cx="70" cy="70" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="72" r="3.2" fill="#151b2e"/></svg>',
  same:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M60 40 L50 58 L70 58 Z" fill="#38bdf8" stroke="#0369a1" stroke-width="2.6"/><path d="M28 82 Q26 58 60 56 Q94 58 92 82 Q92 96 60 96 Q28 96 28 82 Z" fill="#38bdf8" stroke="#0369a1" stroke-width="3.4"/><path d="M40 88 L46 82 L52 88 L58 82 L64 88 L70 82 L76 88" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><circle cx="48" cy="72" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="49" cy="74" r="3.2" fill="#151b2e"/><circle cx="72" cy="72" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="73" cy="74" r="3.2" fill="#151b2e"/></svg>',
  wani:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M30 86 Q26 64 60 62 Q94 64 90 86 Q90 98 60 98 Q30 98 30 86 Z" fill="#65a30d" stroke="#3f6212" stroke-width="3.4"/><path d="M40 62 L44 54 L48 62 M52 61 L56 52 L60 61 M64 61 L68 52 L72 61" fill="#84cc16" stroke="#3f6212" stroke-width="1.8"/><path d="M42 88 L48 84 L54 88 L60 84 L66 88 L72 84 L78 88" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="48" cy="72" r="7" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="49" cy="74" r="3.4" fill="#151b2e"/><circle cx="72" cy="72" r="7" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="73" cy="74" r="3.4" fill="#151b2e"/></svg>',
  kitsune:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M84 98 Q108 92 100 66 Q96 52 82 58 Q94 66 90 82 Q86 94 78 92 Z" fill="#f97316" stroke="#9a3412" stroke-width="3"/><path d="M40 48 L34 26 L52 44 Z" fill="#f97316" stroke="#9a3412" stroke-width="2.6"/><path d="M74 48 L80 26 L62 44 Z" fill="#f97316" stroke="#9a3412" stroke-width="2.6"/><path d="M32 80 Q30 58 57 56 Q84 58 82 80 Q82 94 57 94 Q32 94 32 80 Z" fill="#fb923c" stroke="#9a3412" stroke-width="3.4"/><circle cx="47" cy="72" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="48" cy="74" r="3.2" fill="#151b2e"/><circle cx="67" cy="72" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="68" cy="74" r="3.2" fill="#151b2e"/><path d="M53 82 L57 86 L61 82 Z" fill="#7c2d12"/></svg>',
  woodgo:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M36 52 L48 44 L74 44 L86 54 L82 98 Q82 104 74 104 L46 104 Q36 104 36 96 Z" fill="#92400e" stroke="#451a03" stroke-width="3.6" stroke-linejoin="round"/><path d="M48 44 Q40 28 30 30 Q36 40 46 46 M74 44 Q84 26 96 30 Q88 42 76 46" fill="#22c55e" stroke="#15803d" stroke-width="2.6"/><path d="M48 62 Q60 66 74 62 M46 78 Q60 82 76 78" stroke="#451a03" stroke-width="1.8" fill="none"/><circle cx="52" cy="70" r="6.5" fill="#fef3c7" stroke="#1e2637" stroke-width="1.5"/><circle cx="53" cy="72" r="3.2" fill="#151b2e"/><circle cx="70" cy="70" r="6.5" fill="#fef3c7" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="72" r="3.2" fill="#151b2e"/></svg>',
  hinotori:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="6" fill="rgba(0,0,0,.26)"/><path d="M60 30 Q52 44 56 52 Q60 40 64 52 Q68 44 60 30 Z" fill="#f97316" stroke="#c2410c" stroke-width="2.4"/><path d="M28 78 Q10 72 14 88 Q24 88 34 82 Z" fill="#fb923c" stroke="#c2410c" stroke-width="2.6"/><path d="M92 78 Q110 72 106 88 Q96 88 86 82 Z" fill="#fb923c" stroke="#c2410c" stroke-width="2.6"/><circle cx="60" cy="76" r="28" fill="#f87171" stroke="#b91c1c" stroke-width="3.4"/><path d="M60 78 L52 84 L68 84 Z" fill="#fbbf24" stroke="#c2410c" stroke-width="1.6"/><circle cx="50" cy="70" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="72" r="3.2" fill="#151b2e"/><circle cx="70" cy="70" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="72" r="3.2" fill="#151b2e"/></svg>'
});
Object.assign(SRPG_MON_ART, {
  hitsuji:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M30 78 Q22 74 26 66 Q22 58 32 56 Q34 46 46 50 Q52 42 62 48 Q72 42 78 52 Q90 52 88 62 Q96 68 88 76 Q92 86 82 90 Q80 100 68 96 Q60 104 50 96 Q38 100 34 90 Q24 86 30 78 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="3.2"/><ellipse cx="60" cy="76" rx="20" ry="18" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2.6"/><path d="M42 66 Q34 64 34 74" stroke="#94a3b8" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M78 66 Q86 64 86 74" stroke="#94a3b8" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="52" cy="74" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="53" cy="76" r="3" fill="#151b2e"/><circle cx="68" cy="74" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="69" cy="76" r="3" fill="#151b2e"/><path d="M56 84 Q60 88 64 84" stroke="#64748b" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
  kumo:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="6" fill="rgba(0,0,0,.26)"/><path d="M40 72 Q20 64 12 72 M40 80 Q18 80 10 90 M80 72 Q100 64 108 72 M80 80 Q102 80 110 90" stroke="#4c1d95" stroke-width="3.4" fill="none" stroke-linecap="round"/><circle cx="60" cy="78" r="28" fill="#6d28d9" stroke="#4c1d95" stroke-width="3.4"/><circle cx="50" cy="72" r="7" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="74" r="3.4" fill="#151b2e"/><circle cx="70" cy="72" r="7" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="74" r="3.4" fill="#151b2e"/><circle cx="43" cy="82" r="2.4" fill="#c4b5fd"/><circle cx="77" cy="82" r="2.4" fill="#c4b5fd"/><path d="M54 86 Q60 90 66 86" stroke="#2e1065" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
  tako:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M36 84 Q34 52 60 50 Q86 52 84 84 Q84 88 80 88 Q78 100 72 92 Q68 102 62 94 Q60 104 54 94 Q50 102 46 92 Q42 100 40 88 Q36 88 36 84 Z" fill="#fb7185" stroke="#be123c" stroke-width="3.4"/><ellipse cx="50" cy="62" rx="6" ry="4" fill="#fecdd3" opacity=".6"/><circle cx="50" cy="70" r="7.5" fill="#fff" stroke="#1e2637" stroke-width="1.6"/><circle cx="51" cy="72" r="3.8" fill="#151b2e"/><circle cx="70" cy="70" r="7.5" fill="#fff" stroke="#1e2637" stroke-width="1.6"/><circle cx="71" cy="72" r="3.8" fill="#151b2e"/><path d="M55 80 Q60 84 65 80" stroke="#be123c" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="48" cy="90" r="2.2" fill="#be123c"/><circle cx="60" cy="92" r="2.2" fill="#be123c"/><circle cx="72" cy="90" r="2.2" fill="#be123c"/></svg>',
  hebi:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M40 100 Q20 96 24 82 Q28 70 48 74 Q70 78 66 64 Q62 52 44 54" fill="none" stroke="#22c55e" stroke-width="12" stroke-linecap="round"/><circle cx="72" cy="52" r="18" fill="#4ade80" stroke="#15803d" stroke-width="3.2"/><circle cx="67" cy="48" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="68" cy="50" r="3" fill="#151b2e"/><circle cx="80" cy="48" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="81" cy="50" r="3" fill="#151b2e"/><path d="M72 60 L68 66 M72 60 L76 66" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/></svg>',
  pengin:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="6" fill="rgba(0,0,0,.26)"/><path d="M34 78 Q32 46 60 44 Q88 46 86 78 Q86 102 60 102 Q34 102 34 78 Z" fill="#1e293b" stroke="#0f172a" stroke-width="3.4"/><path d="M44 80 Q42 56 60 54 Q78 56 76 80 Q76 96 60 96 Q44 96 44 80 Z" fill="#f8fafc"/><path d="M28 72 Q18 78 26 86 Z" fill="#1e293b" stroke="#0f172a" stroke-width="2.4"/><path d="M92 72 Q102 78 94 86 Z" fill="#1e293b" stroke="#0f172a" stroke-width="2.4"/><path d="M60 66 L53 71 L60 74 Z" fill="#f59e0b" stroke="#c2410c" stroke-width="1.6"/><circle cx="51" cy="62" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="52" cy="64" r="3" fill="#151b2e"/><circle cx="69" cy="62" r="6" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="70" cy="64" r="3" fill="#151b2e"/><path d="M52 98 L48 104 M68 98 L72 104" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/></svg>',
  hitode:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="6" fill="rgba(0,0,0,.26)"/><path d="M60 40 L71 66 L99 68 L77 86 L85 112 L60 96 L35 112 L43 86 L21 68 L49 66 Z" fill="#fbbf24" stroke="#d97706" stroke-width="3.4" stroke-linejoin="round"/><circle cx="52" cy="76" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="53" cy="78" r="3.2" fill="#151b2e"/><circle cx="68" cy="76" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="69" cy="78" r="3.2" fill="#151b2e"/><path d="M55 86 Q60 90 65 86" stroke="#d97706" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="60" cy="70" r="2" fill="#fef3c7"/><circle cx="46" cy="82" r="2" fill="#fef3c7"/><circle cx="74" cy="82" r="2" fill="#fef3c7"/></svg>',
  tokage:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M84 92 Q104 90 100 74 Q96 62 82 68" fill="none" stroke="#16a34a" stroke-width="9" stroke-linecap="round"/><path d="M34 84 Q30 62 58 60 Q84 62 82 84 Q82 96 58 96 Q34 96 34 84 Z" fill="#4ade80" stroke="#15803d" stroke-width="3.4"/><path d="M44 60 L48 50 L54 60 M58 59 L62 48 L67 59" fill="#22c55e" stroke="#15803d" stroke-width="2"/><circle cx="48" cy="76" r="7" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="49" cy="78" r="3.4" fill="#151b2e"/><circle cx="68" cy="76" r="7" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="69" cy="78" r="3.4" fill="#151b2e"/><path d="M52 88 Q58 92 64 88" stroke="#15803d" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
  ki:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="24" ry="6" fill="rgba(0,0,0,.26)"/><circle cx="60" cy="52" r="30" fill="#22c55e" stroke="#15803d" stroke-width="3.4"/><circle cx="44" cy="42" r="13" fill="#4ade80" stroke="#15803d" stroke-width="2.6"/><circle cx="78" cy="46" r="11" fill="#4ade80" stroke="#15803d" stroke-width="2.6"/><path d="M52 78 L52 100 Q52 104 60 104 Q68 104 68 100 L68 78 Z" fill="#a16207" stroke="#713f12" stroke-width="3"/><circle cx="52" cy="56" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="53" cy="58" r="3.2" fill="#151b2e"/><circle cx="68" cy="56" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="69" cy="58" r="3.2" fill="#151b2e"/><path d="M55 66 Q60 70 65 66" stroke="#15803d" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
  yuki:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><circle cx="60" cy="86" r="26" fill="#f8fafc" stroke="#93c5fd" stroke-width="3.2"/><circle cx="60" cy="52" r="20" fill="#f8fafc" stroke="#93c5fd" stroke-width="3.2"/><path d="M40 52 Q22 46 20 58" stroke="#a16207" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M80 52 Q98 46 100 58" stroke="#a16207" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="53" cy="50" r="4" fill="#151b2e"/><circle cx="67" cy="50" r="4" fill="#151b2e"/><path d="M56 58 L60 62 L64 58 Z" fill="#f59e0b"/><circle cx="54" cy="82" r="2.6" fill="#334155"/><circle cx="60" cy="88" r="2.6" fill="#334155"/><circle cx="66" cy="82" r="2.6" fill="#334155"/></svg>',
  ryunoko:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M84 96 Q102 96 98 82" fill="none" stroke="#0ea5e9" stroke-width="8" stroke-linecap="round"/><path d="M30 60 Q18 54 16 64 Q24 66 30 66 M90 60 Q102 54 104 64 Q96 66 90 66" fill="#7dd3fc" stroke="#0369a1" stroke-width="2.6"/><path d="M32 82 Q28 58 60 56 Q92 58 88 82 Q88 98 60 98 Q32 98 32 82 Z" fill="#38bdf8" stroke="#0369a1" stroke-width="3.4"/><path d="M50 56 L54 46 L58 56 M62 56 L66 46 L70 56" fill="#0ea5e9" stroke="#0369a1" stroke-width="2"/><circle cx="50" cy="74" r="7.5" fill="#fff" stroke="#1e2637" stroke-width="1.6"/><circle cx="51" cy="76" r="3.8" fill="#151b2e"/><circle cx="70" cy="74" r="7.5" fill="#fff" stroke="#1e2637" stroke-width="1.6"/><circle cx="71" cy="76" r="3.8" fill="#151b2e"/><ellipse cx="60" cy="86" rx="6" ry="4" fill="#bae6fd"/><path d="M54 88 Q60 92 66 88" stroke="#0369a1" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
});
Object.assign(SRPG_MON_ART, {
  kinoko:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><path d="M44 76 L44 102 Q44 108 52 108 L68 108 Q76 108 76 102 L76 76 Z" fill="#fdebd0" stroke="#a67c52" stroke-width="3"/><path d="M22 68 Q22 40 60 38 Q98 40 98 68 Q98 74 60 74 Q22 74 22 68 Z" fill="#ef4444" stroke="#991b1b" stroke-width="3.4"/><circle cx="40" cy="56" r="5.5" fill="#fff"/><circle cx="62" cy="50" r="6.5" fill="#fff"/><circle cx="82" cy="58" r="5" fill="#fff"/><circle cx="52" cy="88" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="53" cy="90" r="3.3" fill="#151b2e"/><circle cx="68" cy="88" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="69" cy="90" r="3.3" fill="#151b2e"/><path d="M55 98 Q60 102 65 98" stroke="#a67c52" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>',
  tori:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="26" ry="6" fill="rgba(0,0,0,.26)"/><circle cx="60" cy="74" r="33" fill="#fde047" stroke="#ca8a04" stroke-width="3.4"/><path d="M30 76 Q16 72 20 84 Q30 84 35 81 Z" fill="#facc15" stroke="#ca8a04" stroke-width="2.2"/><path d="M50 40 L54 30 L58 40 Z" fill="#facc15" stroke="#ca8a04" stroke-width="2"/><circle cx="50" cy="68" r="7.5" fill="#fff" stroke="#1e2637" stroke-width="1.6"/><circle cx="51" cy="70" r="3.8" fill="#151b2e"/><circle cx="49" cy="66" r="1.5" fill="#fff"/><circle cx="70" cy="68" r="7.5" fill="#fff" stroke="#1e2637" stroke-width="1.6"/><circle cx="71" cy="70" r="3.8" fill="#151b2e"/><circle cx="69" cy="66" r="1.5" fill="#fff"/><path d="M60 76 L53 82 L67 82 Z" fill="#f97316" stroke="#c2410c" stroke-width="1.8"/><path d="M50 102 L46 108 M62 103 L62 109 M70 102 L74 108" stroke="#ca8a04" stroke-width="2.6" stroke-linecap="round"/></svg>',
  kaeru:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M28 86 Q24 58 60 56 Q96 58 92 86 Q92 104 60 104 Q28 104 28 86 Z" fill="#4ade80" stroke="#15803d" stroke-width="3.6"/><circle cx="42" cy="52" r="14" fill="#4ade80" stroke="#15803d" stroke-width="3.2"/><circle cx="78" cy="52" r="14" fill="#4ade80" stroke="#15803d" stroke-width="3.2"/><circle cx="42" cy="50" r="8" fill="#fff" stroke="#1e2637" stroke-width="1.6"/><circle cx="43" cy="52" r="4" fill="#151b2e"/><circle cx="78" cy="50" r="8" fill="#fff" stroke="#1e2637" stroke-width="1.6"/><circle cx="79" cy="52" r="4" fill="#151b2e"/><path d="M44 86 Q60 96 76 86" stroke="#15803d" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="46" cy="78" rx="5" ry="3" fill="#fca5a5" opacity=".5"/><ellipse cx="74" cy="78" rx="5" ry="3" fill="#fca5a5" opacity=".5"/></svg>',
  iwagon:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M34 50 L50 40 L74 42 L88 56 L84 96 Q84 104 74 104 L44 104 Q34 104 34 94 Z" fill="#94a3b8" stroke="#475569" stroke-width="3.6" stroke-linejoin="round"/><path d="M50 40 L54 62 L34 66" stroke="#475569" stroke-width="2" fill="none"/><path d="M74 42 L70 64 L88 56" stroke="#475569" stroke-width="2" fill="none"/><circle cx="52" cy="74" r="7.5" fill="#fff" stroke="#1e2637" stroke-width="1.6"/><circle cx="53" cy="76" r="3.6" fill="#151b2e"/><circle cx="72" cy="74" r="7.5" fill="#fff" stroke="#1e2637" stroke-width="1.6"/><circle cx="73" cy="76" r="3.6" fill="#151b2e"/><path d="M50 92 L56 90 L62 92 L68 90 L74 92" stroke="#475569" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  onibi:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="22" ry="5.5" fill="rgba(0,0,0,.26)"/><path d="M60 28 Q44 52 44 74 Q44 100 60 100 Q76 100 76 74 Q76 52 60 28 Z" fill="#fb923c" stroke="#c2410c" stroke-width="3.4"/><path d="M60 50 Q52 66 52 78 Q52 92 60 92 Q68 92 68 78 Q68 66 60 50 Z" fill="#fde047" opacity=".85"/><circle cx="53" cy="76" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="54" cy="78" r="3.2" fill="#151b2e"/><circle cx="67" cy="76" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="68" cy="78" r="3.2" fill="#151b2e"/><path d="M55 86 Q60 90 65 86" stroke="#c2410c" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>',
  kani:'<svg viewBox="0 0 120 120" class="mon-svg"><ellipse cx="60" cy="112" rx="28" ry="6.5" fill="rgba(0,0,0,.26)"/><path d="M30 84 Q28 66 60 64 Q92 66 90 84 Q90 96 60 96 Q30 96 30 84 Z" fill="#f87171" stroke="#b91c1c" stroke-width="3.6"/><path d="M28 72 Q14 64 12 76 Q12 86 22 84 Q18 78 28 78 Z" fill="#f87171" stroke="#b91c1c" stroke-width="2.8"/><path d="M92 72 Q106 64 108 76 Q108 86 98 84 Q102 78 92 78 Z" fill="#f87171" stroke="#b91c1c" stroke-width="2.8"/><path d="M46 54 L48 60 M74 54 L72 60" stroke="#b91c1c" stroke-width="2.4" stroke-linecap="round"/><circle cx="50" cy="80" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="51" cy="82" r="3.2" fill="#151b2e"/><circle cx="70" cy="80" r="6.5" fill="#fff" stroke="#1e2637" stroke-width="1.5"/><circle cx="71" cy="82" r="3.2" fill="#151b2e"/><path d="M54 88 Q60 92 66 88" stroke="#b91c1c" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>'
});
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
  if(typeof SRPG_EVO_STAGE_OF!=='undefined' && SRPG_EVO_STAGE_OF[art]){   // 進化フォームの名
    var _ln=SRPG_EVO_LINES[SRPG_EVO_STAGE_OF[art]]; for(var _i=0;_i<_ln.length;_i++){ if(_ln[_i].art===art) return _ln[_i].name; }
  }
  var v=SRPG_MON_VARIANTS2[art]; if(v) return v.name;
  var m=/^(.*)2$/.exec(art); if(m&&SRPG_MON_BASE_NAMES[m[1]]) return SRPG_MON_BASE_NAMES[m[1]]+'（亜種）';
  return 'なかま';
}

// 進化フォームの“格上げ装飾”：種の体はそのまま、王冠/角/オーラ/魔化を重ねる（stage2=王・stage3=魔神）。
// これで 全種の進化を 一貫した見た目で量産できる（手描き不要・姿が段階的に強大化）。
function _monEvoDeco(stage){
  var back='', front='';
  if(stage>=2){ back += '<circle cx="60" cy="60" r="55" fill="'+(stage>=3?'#a855f7':'#fcd34d')+'" opacity="'+(stage>=3?'0.18':'0.10')+'"/>'; }
  if(stage>=3){   // 角（左右）
    front += '<path d="M30 44 Q19 23 14 10 Q31 20 41 39 Z" fill="#2a1352" stroke="#160a2e" stroke-width="2.2"/>'
          +  '<path d="M90 44 Q101 23 106 10 Q89 20 79 39 Z" fill="#2a1352" stroke="#160a2e" stroke-width="2.2"/>';
  }
  if(stage>=2){   // 王冠
    front += '<path d="M40 33 L36 14 L48 26 L60 11 L72 26 L84 14 L80 33 Q60 26 40 33 Z" fill="'+(stage>=3?'#fbbf24':'#fcd34d')+'" stroke="#a16207" stroke-width="2.2"/>'
          +  '<circle cx="60" cy="12" r="3" fill="#fef08a" stroke="#a16207" stroke-width="0.8"/>';
  }
  if(stage>=3){   // 舞う光の粒
    front += '<circle cx="41" cy="60" r="2" fill="#e9d5ff" opacity=".85"/><circle cx="81" cy="52" r="1.6" fill="#e9d5ff" opacity=".7"/><circle cx="70" cy="76" r="1.5" fill="#e9d5ff" opacity=".7"/>';
  }
  return { back:back, front:front };
}
// アートキー→オリジナルSVG（無ければ null＝呼び出し側が従来アートへフォールバック）
// ===== 魔王ヒエラルキーの盤上2Dアート：demon(villain)生SVGを 教科色にフィルタ注入（3Dは char3d 側で強さ差を表現）=====
// 生SVGのまま（<svg…mon-svg…</svg>）＝図鑑/検証を満たしつつ 教科ごとに色を変える。
(function(){
  var R = (typeof SRPG_MAOU_ROSTER !== 'undefined') ? SRPG_MAOU_ROSTER
        : (typeof require !== 'undefined' ? (function(){ try{ return require('./srpg.js').SRPG_MAOU_ROSTER; }catch(e){ return null; } })() : null);
  if(!R || !SRPG_MON_ART.villain) return;
  var HUE = { math:30, japanese:0, english:110, science:160, social:60 };
  function tint(css){ return SRPG_MON_ART.villain.replace('class="mon-svg"', 'class="mon-svg" style="filter:' + css + '"'); }
  R.forEach(function(m){ if(!SRPG_MON_ART[m.key]) SRPG_MON_ART[m.key] = tint('hue-rotate(' + (HUE[m.area] || 0) + 'deg) saturate(1.2)'); });
  if(!SRPG_MON_ART.overlord) SRPG_MON_ART.overlord = tint('saturate(1.5) brightness(.85)');                          // 最強魔王：漆黒
  if(!SRPG_MON_ART.god)      SRPG_MON_ART.god      = tint('saturate(0) brightness(1.7) sepia(1) saturate(4) hue-rotate(-12deg)');  // 神様：黄金の光
})();
function srpgMonArt(art){
  if(!art) return null;
  if(SRPG_MON_ART[art]) return SRPG_MON_ART[art];   // 直接（bespoke: slime_king/slime_lord 等）
  var em=/^(.*)_e([23])$/.exec(art);                // 進化フォーム：基本種の体＋段階装飾
  if(em && SRPG_MON_ART[em[1]]){
    var _bs=SRPG_MON_ART[em[1]], _st=parseInt(em[2],10), _dc=_monEvoDeco(_st);
    var _svg=_bs.replace(/^(<svg[^>]*>)/, '$1'+_dc.back).replace(/<\/svg>\s*$/, _dc.front+'</svg>');
    return '<span class="srpg-evwrap">'+_svg+'</span>';
  }
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
  // 新規Batch1：マッシュ/ピヨすけ=N、ケロン/カニロー=R、イワゴン/オニビ=SR
  kinoko:0, tori:0, kaeru:1, kani:1, iwagon:2, onibi:2,
  // 新規Batch2：ヒツジ/クモ/ヒトデ=N、タコ/ヘビ/ペンギン/ウッディ=R、トカゲ/ユキだるま=SR、リュウのこ=SSR
  hitsuji:0, kumo:0, hitode:0, tako:1, hebi:1, pengin:1, ki:1, tokage:2, yuki:2, ryunoko:3,
  // 新規Batch3：ウサギ/ブタ/リス/モグラ=N、クラゲ/カブト/コアラ=R、サメ/ワニ/キツネ=SR、モクゴン/ヒノトリ=SSR
  usagi:0, buta:0, risu:0, mogura:0, kurage:1, kabuto:1, koala:1, same:2, wani:2, kitsune:2, woodgo:3, hinotori:3,
  // 新規Batch4：タヌキ/ハム=N、カメ/ウシ/カバ=R、ゾウ/キリン/ライオン/ワシ=SR、ヒョウドラ/ハガネ/ユニコン=SSR
  tanuki:0, hamu:0, kame:1, ushi:1, kaba:1, zou:2, kirin:2, lion:2, washi:2, hyoudra:3, hagane:3, unicorn:3,
  // 新規Batch5：エビ/ハチ/アリ=N、イカ/クロネ/フクロウ/チョウ/カッパ=R、アオオニ/テング/ウミヘビ=SR、クリスタン=SSR
  ebi:0, hachi:0, ari:0, ika:1, kuroneko:1, fukurou:1, chou:1, kappa:1, oni:2, tengu:2, umihebi:2, kurisu:3,
  // 新規Batch6：サル=N、シカ/カボチャ=R、クジラ/ビリでん=SR、ペガサス/マグマ/セイリュウ=SSR
  saru:0, shika:1, kabocha:1, kujira:2, denki:2, pega:3, magma:3, seiryu:3,
  // 進化フォーム（スカウト不可・育成でのみ到達）：段階ごとに格が上がる
  slime_king:3, slime_lord:5,
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
// 魔王ヒエラルキーを スカウト対象化：魔王は 帯5(伝説)/6(神話)＝最高レア＝低確率。名前/唯一性も付与。
// （AIBOU_ART_SPECIES への登録は aibou.js 側。神様godは ボス専用＝スカウト不可）
(function(){
  var R = (typeof SRPG_MAOU_ROSTER !== 'undefined') ? SRPG_MAOU_ROSTER
        : (typeof require !== 'undefined' ? (function(){ try{ return require('./srpg.js').SRPG_MAOU_ROSTER; }catch(e){ return null; } })() : null);
  if(!R) return;
  function reg(key, name, band){ SRPG_MON_TIER[key] = band; SRPG_MON_BASE_NAMES[key] = name; SRPG_MON_UNIQUE[key] = 1; }
  R.forEach(function(m){ if(!/^maou_/.test(m.key)) return; reg(m.key, m.name, (m.rankBase >= 17 ? 6 : 5)); });   // 大陸魔王=伝説(5)、回廊魔王=神話(6)
  reg('overlord', '終焉魔王オメガ', 6);   // 最強の魔王もスカウト可（神話・極低確率）
})();
// ランク→帯（レア度が上がるほど 上位の帯＝より強力そうなモンスターが出る）
var SRPG_RANK_BAND = { F:0, E:0, D:1, C:1, B:2, A:2, S:3, SS:4, SSS:5, LG:6 };
// 帯メタ（表示ラベル・星・色＝レア度オーラ/枠の基調色）。key はガチャ的な短縮表記。
// 上から LG(神話) > UR(伝説) > 超激 > 激 > SR > R > N（二枚看板＝最上位2段が LG・UR）
var SRPG_RARITY_BANDS = [
  { key:'N',   name:'ノーマル',    stars:1, color:'#94a3b8', glow:'rgba(148,163,184,.0)' },
  { key:'R',   name:'レア',        stars:2, color:'#34d399', glow:'rgba(52,211,153,.45)' },
  { key:'SR',  name:'スーパーレア', stars:3, color:'#60a5fa', glow:'rgba(96,165,250,.5)' },
  { key:'SSR', name:'激レア',      stars:4, color:'#a78bfa', glow:'rgba(167,139,250,.55)' },
  { key:'超激', name:'超激レア',    stars:5, color:'#fbbf24', glow:'rgba(251,191,36,.6)' },
  { key:'UR',  name:'伝説',        stars:6, color:'#f43f5e', glow:'rgba(244,63,94,.62)' },   // SSS階級＝2番手
  { key:'LG',  name:'神話',        stars:7, color:'#e879f9', glow:'rgba(232,121,249,.7)' }   // LG階級＝最強
];
// 表示ラベル（二枚看板）：SSS階級→「UR」、LG階級→「LG」、その下は階級文字のまま。称号は上位2段のみ。
function srpgRankLabel(rank){ return rank==='SSS' ? 'UR' : (rank||'F'); }
function srpgRankTitle(rank){ return rank==='LG' ? '神話' : (rank==='SSS' ? '伝説' : ''); }
// アート→帯（基本種・属性変種・亜種すべて解決）。未知は 0。
function srpgTierOfArt(art){
  if(art==null) return 0;
  if(SRPG_MON_TIER[art]!=null) return SRPG_MON_TIER[art];
  var em=/^(.*)_e([23])$/.exec(art); if(em) return em[2]==='3'?5:3;   // 進化フォーム：e2=SSR(3)/e3=伝説(5)
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
// ===== 進化ライン（育てると 姿が変身：レア度が上がるほど 強力な姿へ）=====
// species(基本種art) → 段階 [{minBand, art, name}]。到達帯(minBand)以上で その姿に変身。
// 進化フォームは スカウト不可（AIBOU_ART_SPECIESに無い）・変種なし・dex非加算。
var SRPG_EVO_LINES = {
  // スライムは 手描きの専用フォーム（bespoke）
  slime: [
    { minBand:0, art:'slime',      name:'スライム' },
    { minBand:3, art:'slime_king', name:'キングスライム' },   // SSR帯で キング化
    { minBand:5, art:'slime_lord', name:'スライム魔神' }      // 伝説帯で 魔神化
  ]
};
// 他の種は 進化装飾オーバーレイ（_e2/_e3）で 一貫生成。[基本種, 王形(SSR), 魔神形(伝説)] の名前。
var _SRPG_EVO_NAMES = [
  ['goblin',   'ゴブリンロード',       'ゴブリン魔将'],
  ['bat',      'ヴァンパイアバット',   '冥翼の魔コウモリ'],
  ['wolf',     'シルバーファング',     '狼魔王フェンリル'],
  ['ghost',    'レイスゴースト',       '冥王レヴナント'],
  ['trent',    'エルダートレント',     '世界樹の守護神'],
  ['slugking', 'ロイヤルスラグ',       '粘獄の魔王'],
  ['dragon',   'セイントドラゴン',     '神竜バハムート'],
  ['inkblob',  'インクロード',         '墨獄の魔神'],
  ['fudebird', '水墨フェニックス',     '筆聖の霊鳥'],
  ['kanjioni', 'カンジ大将',           '文字獄の鬼神'],
  ['abcube',   'アルファキューブ',     '知識の魔導方陣'],
  ['qbird',    'クエスチョンロード',   '謎王スフィンクス'],
  ['grammaro', 'グランドグラモ',       '言霊の魔導王'],
  ['flaskun',  'アルケミフラスク',     '錬金の魔神'],
  ['microbe',  'メガマイクローブ',     '病魔の王ペスト'],
  ['voltdrake','サンダードレイク',     '雷帝ライドラゴン'],
  ['mapmoth',  'コンパスモス',         '幻界の導き蛾'],
  ['haniwa',   'ガードハニワ',         '埴輪の守護巨神'],
  ['tokiou',   'クロノキング',         '時空の魔王クロノス']
];
_SRPG_EVO_NAMES.forEach(function(e){ var b=e[0]; if(!e[1] || SRPG_EVO_LINES[b]) return;
  SRPG_EVO_LINES[b] = [
    { minBand:0, art:b,        name:SRPG_MON_BASE_NAMES[b] || b },
    { minBand:3, art:b+'_e2',  name:e[1] },
    { minBand:5, art:b+'_e3',  name:e[2] }
  ];
});
// 段階art → ライン基本種（逆引き）。どの姿からでも 自分のラインを辿れる。
var SRPG_EVO_STAGE_OF = {};
Object.keys(SRPG_EVO_LINES).forEach(function(base){ SRPG_EVO_LINES[base].forEach(function(st){ SRPG_EVO_STAGE_OF[st.art] = base; }); });
// いまの art＋rank に対応する 進化フォーム {art,name,base}。ライン無ければ null（＝姿は変わらない）。
function srpgEvoFormFor(art, rank){
  var base = SRPG_EVO_STAGE_OF[art] || art;
  var line = SRPG_EVO_LINES[base]; if(!line) return null;
  var band = srpgBandOfRank(rank), pick = line[0];
  for(var i=0;i<line.length;i++){ if(band >= line[i].minBand) pick = line[i]; }
  return { art: pick.art, name: pick.name, base: base };
}

// ===== なかま図鑑の分類（種別／ランクで グループ表示）＝収集が増えても 探しやすく =====
var SRPG_SPECIES_LABEL = { slime:'スライム系', dragon:'ドラゴン系', beast:'けもの系', nature:'しぜん系', maou:'魔王級' };
var SRPG_RANK_DESC = ['LG','SSS','SS','S','A','B','C','D','E','F'];   // 高い順（分類・並べ替え用）
// list=なかま配列（{sp,rank,lv,...}）。mode='rank'|'species'。返り値：[{key,label,band?,items}]（表示順）。
function srpgClassifyRoster(list, mode){
  var arr = (list||[]).slice();
  function rankIdx(r){ var i=SRPG_RANK_DESC.indexOf(r||'F'); return i<0?SRPG_RANK_DESC.length:i; }
  if(mode==='species'){
    var order=['maou','dragon','slime','beast','nature'], by={};
    arr.forEach(function(a){ var sp=(a&&a.sp)||'beast'; (by[sp]=by[sp]||[]).push(a); });
    var keys=order.filter(function(k){return by[k];}).concat(Object.keys(by).filter(function(k){return order.indexOf(k)<0;}));
    return keys.map(function(k){ return { key:k, label:SRPG_SPECIES_LABEL[k]||k,
      items:by[k].sort(function(x,y){ return rankIdx(x.rank)-rankIdx(y.rank) || ((y.lv||1)-(x.lv||1)); }) }; });
  }
  // rank（既定）：高い順にグループ、群内は Lv降順
  var byR={};
  arr.forEach(function(a){ var r=(a&&a.rank)||'F'; (byR[r]=byR[r]||[]).push(a); });
  return SRPG_RANK_DESC.filter(function(r){return byR[r];}).map(function(r){
    var rb=srpgRarityOfRank(r), t=srpgRankTitle(r);
    return { key:r, label:srpgRankLabel(r)+(t?' '+t:''), band:rb.band, items:byR[r].sort(function(x,y){ return (y.lv||1)-(x.lv||1); }) }; });
}

// レア度オーラ枠でモンスターのアートHTMLをくるむ（rank→帯の 色/枠/バッジ）。CSS: .srpg-rar（index.html）。
function srpgRarityWrap(innerHtml, rank){
  var r = srpgRarityOfRank(rank);
  return '<span class="srpg-rar band-'+r.band+' rk-'+(rank||'')+'" style="--rc:'+r.color+';--rg:'+r.glow+'">'
    + '<span class="srpg-rar-in">'+(innerHtml==null?'':innerHtml)+'</span>'
    + '<i class="srpg-rar-badge">'+r.key+'</i></span>';
}

// ===== 星コレクション：重複で★UP（1→5）、★5で進化して打ち止め、★5済みの重複はコイン =====
// 重複コインの額（レア度が高いほど多い）。N=30 … 神話=150。
function srpgDupeCoins(art){ var b=(typeof srpgTierOfArt==='function')?srpgTierOfArt(art):0; return 30 + (b|0)*20; }
// ★5到達＝進化：ランクを1段上げ、進化フォームがあれば姿を変身（純粋・monを変更）。
function srpgStarEvolve(mon){
  if(!mon) return mon;
  mon.evolved = 1;
  var order=['F','E','D','C','B','A','S','SS','SSS','LG']; var i=order.indexOf(mon.rank||'F');
  if(i>=0 && i<order.length-1) mon.rank = order[i+1];   // つよさUP
  try{ if(typeof srpgEvoFormFor==='function'){ var f=srpgEvoFormFor(mon.baseArt||mon.art, mon.rank); if(f && f.art!==mon.art){ mon.art=f.art; mon.name=f.name; } } }catch(e){}
  return mon;
}
// 既存個体に重複を1つ反映。戻り値: {result:'star'|'evolve'|'coin', stars, coin}
function srpgStarAdd(mon, art){
  var st = mon.stars||1;
  if(st < 5){
    mon.stars = st+1;
    if(mon.stars===5){ srpgStarEvolve(mon); return { result:'evolve', stars:5 }; }
    return { result:'star', stars:mon.stars };
  }
  return { result:'coin', stars:5, coin:srpgDupeCoins(art) };
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { SRPG_MON_ART: SRPG_MON_ART, SRPG_MON_VARIANT: SRPG_MON_VARIANT, srpgMonArt: srpgMonArt, SRPG_MON_VARIANTS2: SRPG_MON_VARIANTS2, SRPG_ELEM_VARIANTS: SRPG_ELEM_VARIANTS, SRPG_MON_BASE_NAMES: SRPG_MON_BASE_NAMES, srpgMonName: srpgMonName,
    srpgDupeCoins: srpgDupeCoins, srpgStarEvolve: srpgStarEvolve, srpgStarAdd: srpgStarAdd,
    SRPG_MON_TIER: SRPG_MON_TIER, SRPG_RANK_BAND: SRPG_RANK_BAND, SRPG_RARITY_BANDS: SRPG_RARITY_BANDS, srpgTierOfArt: srpgTierOfArt, srpgBandOfRank: srpgBandOfRank, srpgRarityBand: srpgRarityBand, srpgRarityOfRank: srpgRarityOfRank, srpgArtsForBand: srpgArtsForBand, srpgRarityWrap: srpgRarityWrap,
    SRPG_EVO_LINES: SRPG_EVO_LINES, SRPG_EVO_STAGE_OF: SRPG_EVO_STAGE_OF, srpgEvoFormFor: srpgEvoFormFor,
    SRPG_SPECIES_LABEL: SRPG_SPECIES_LABEL, SRPG_RANK_DESC: SRPG_RANK_DESC, srpgClassifyRoster: srpgClassifyRoster,
    srpgRankLabel: srpgRankLabel, srpgRankTitle: srpgRankTitle };
}
