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
  villain:
    _mHead() + '<ellipse cx="60" cy="113" rx="34" ry="6.5" fill="rgba(0,0,0,.3)"/>'
    + '<circle cx="60" cy="66" r="46" fill="#5b21b6" opacity=".14"/>'
    + '<path d="M22 104 Q18 58 60 50 Q102 58 98 104 Q80 96 60 100 Q40 96 22 104 Z" fill="#312e81" stroke="#17153b" stroke-width="4"/>'
    + '<path d="M40 100 Q60 92 80 100 L80 104 Q60 98 40 104 Z" fill="#4c1d95"/>'
    + '<path d="M34 60 Q30 30 60 30 Q90 30 86 60 Q60 52 34 60 Z" fill="#1f1b4d" stroke="#17153b" stroke-width="3.6"/>'
    + '<path d="M32 40 L34 22 L44 34 L52 20 L60 34 L68 20 L76 34 L86 22 L88 40 Q60 32 32 40 Z" fill="#fbbf24" stroke="#a16207" stroke-width="2.6"/>'
    + '<circle cx="52" cy="24" r="3" fill="#ef4444"/><circle cx="60" cy="21" r="3.4" fill="#f87171"/><circle cx="68" cy="24" r="3" fill="#ef4444"/>'
    + _mEyeSharp(50, 58, 9, 1, '#ef4444') + _mEyeSharp(70, 58, 9, -1, '#ef4444')
    + '<path d="M50 70 Q60 66 70 70" stroke="#0b0b1e" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    + '<circle cx="20" cy="52" r="3" fill="#a78bfa" opacity=".8"/><circle cx="100" cy="52" r="3" fill="#a78bfa" opacity=".8"/><circle cx="96" cy="80" r="2.4" fill="#a78bfa" opacity=".7"/>'
    + '</svg>'
};
// 亜種（色ちがい）：ベースの絵に hue-rotate をかける（RPG_VARIANTS と同じ角度体系）
var SRPG_MON_VARIANT = { slime2:140, goblin2:150, bat2:170, wolf2:120, ghost2:100, dragon2:180, trent2:130, voltdrake2:90 };

// アートキー→オリジナルSVG（無ければ null＝呼び出し側が従来アートへフォールバック）
function srpgMonArt(art){
  if(!art) return null;
  if(SRPG_MON_ART[art]) return SRPG_MON_ART[art];
  var m = /^(.*)2$/.exec(art);
  if(m && SRPG_MON_ART[m[1]] && SRPG_MON_VARIANT[art] != null){
    return '<span class="srpg-hue" style="filter:hue-rotate('+SRPG_MON_VARIANT[art]+'deg)">' + SRPG_MON_ART[m[1]] + '</span>';
  }
  return null;
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { SRPG_MON_ART: SRPG_MON_ART, SRPG_MON_VARIANT: SRPG_MON_VARIANT, srpgMonArt: srpgMonArt };
}
