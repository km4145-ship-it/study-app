/* subjects.js：index.html から分離した classic script（データのみ・挙動不変・グローバル）。
   メイン <script> より前に読み込む（?v でキャッシュ回避）。 */
const SUBJECTS = {
  elementary: [
    { id:'decimal',           name:'少数の計算',   icon:'🔢', badge:null },
    { id:'area_elem',         name:'図形・面積',   icon:'📐', badge:null },
    { id:'volume',            name:'容積',         icon:'🧪', badge:null },
    { id:'speed',             name:'速さ',         icon:'🚀', badge:null },
    { id:'combinations_elem', name:'場合の数',     icon:'🎲', badge:null },
    { id:'review_mix',        name:'総合復習',     icon:'🌟', badge:'総合' },
  ],
  middle: [
    { id:'positive_negative', name:'正負の数',         icon:'➕➖', badge:'中1' },
    { id:'area_middle',       name:'図形・面積',       icon:'📐',  badge:'中1' },
    { id:'combinations',      name:'場合の数',         icon:'🎲',  badge:'中1' },
    { id:'speed_middle',      name:'速さ・距離・時間', icon:'🚂',  badge:'中1' },
    { id:'volume_middle',     name:'容積・体積',       icon:'📦',  badge:'中1' },
    { id:'factorize',  name:'素数・素因数分解', icon:'🔢', badge:'中1' },
    { id:'letter_eq',  name:'文字式・方程式',   icon:'🔤', badge:'中1' },
    { id:'proportion', name:'比例・反比例',     icon:'📈', badge:'中1' },
    { id:'plane_fig',  name:'平面図形',         icon:'📐', badge:'中1' },
    { id:'space_fig',  name:'空間図形',         icon:'🧊', badge:'中1' },
    { id:'data_use',   name:'データの活用',     icon:'📊', badge:'中1' },
    { id:'mix_middle',        name:'総合チャレンジ',   icon:'👑',  badge:'総合' },
  ]
};

// Hard subjects that trigger Kai mode
const HARD_SUBJECTS = ['mix_middle', 'positive_negative', 'combinations', 'speed_middle'];
