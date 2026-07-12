/* areas.js：index.html から分離した classic script（データのみ・挙動不変・グローバル）。
   メイン <script> より前に読み込む（?v でキャッシュ回避）。 */
const AREAS = [
  { key:'math',     name:'数学', icon:'🔢', sub:'計算・図形・場合の数', char:'shiba' },
  { key:'japanese', name:'国語', icon:'📖', sub:'漢字・文法・読解',     char:'cat' },
  { key:'english',  name:'英語', icon:'🔤', sub:'文法・語彙・対話',     char:'rabbit' },
  { key:'science',  name:'理科', icon:'🔬', sub:'物理・化学・生物・地学', char:'fox'  },
  { key:'social',   name:'社会', icon:'🌏', sub:'地理・歴史・公民',     char:'bear' },
];

// 各教科の練習問題(practice)・模擬試験(exam)
// math は practice = 既存の単元(QUESTIONS)、exam = MATH_EXAM
