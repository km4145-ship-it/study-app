# study-app アーキテクチャ（開発の地図）

小中学生向け学習PWA。「100倍スケール」を見据えた土台整備の一環として、
**将来の自分・他の開発者・AIエージェントが安全に手を入れられる**ことを目的にこの文書を置く。

> ひとことで言うと：**素のグローバルスクリプト（ES Modules ではない）**で書かれた単一ページアプリを、
> **挙動を1バイトも変えずに** js/ モジュールへ切り出しつつ、
> **テスト → ビルド → 自動デプロイ** の足場で守っている。

> **この文書の版**：2026-07 実測に更新済み（js/ 約43本・app.min.js 約1.8MB・three.min.js 別チャンク・
> check-globals 188ハンドラ・テスト72スイート）。プロ化の残タスクは `docs/PRO_ROADMAP.md` を参照。
> 直近の大きな変更：タクトSRPG＋3D＋物語、問題プールの大幅増量（generators-pack/elem 系）、
> 実アカウント（メール+パスワード）、初回オンボーディングの学年選択。

---

## 1. 全体像と設計思想

- **単一ページアプリ**。`index.html` に UI・ロジックが入り、データやまとまった部品は `js/*.js` に分離。
- **クラシックスクリプト（グローバルスコープ）で統一**。ES Modules ではない。
  - 理由：`onclick="foo()"` のようなインラインハンドラが多数あり、これらは**グローバル関数**を必要とする。
    ES Modules にすると全部がモジュールスコープに閉じてハンドラが全滅する。
  - したがって **各 js/ ファイルは `export` を使わず、`function foo(){}` や `var DATA=...` で
    グローバルに定義**する。読み込み順で名前解決される。
- **Service Worker は無効**。`index.html` 末尾で毎回 `unregister()` している。
  - 理由：SW のキャッシュが原因で「更新したのに古いコードが動く」事故が多発したため。
  - 代わりに **`?v=` クエリ文字列でキャッシュバスティング**する（例：`cloud-sync.js?v=1102`）。
    SW が無い分、これが唯一のキャッシュ制御なので **更新時は `?v=` を上げる**のが従来の運用だった。
  - **ただし本番（GitHub Actions ビルド）では `?v=` を手で上げる必要はない**（§6参照）。
- **オフラインでも動く**：Firestore のローカル永続化により、ネット断でも学習でき、復帰時に自動送信。

---

## 2. リポジトリ構成

```
index.html            メインアプリ（UI＋メインロジック。<script>で js/ を読み込む）
cloud-sync.js         Firebase Firestore 同期レイヤ（別スクリプト。defer で最後に読む）
sw.js                 Service Worker（※現在は unregister されるだけ。VERSION がビルドの版数元）
manifest.webmanifest  PWA マニフェスト
icons/                アプリアイコン

js/                   index.html から切り出したモジュール群（すべてグローバル定義）
scripts/build.js      本番ビルド（esbuild で結合＋圧縮 → dist/）
scripts/check-globals.js  dist/ 健全性検証（ハンドラ関数が圧縮後も生存するか）
tests/                依存ゼロのテスト群（node のみ。run-all.js で一括実行）
docs/ARCHITECTURE.md  この文書
.github/workflows/    ci.yml（テスト＋ビルド検証） / deploy.yml（本番公開）

```

> メモ：かつてルートにあった `index_backup_*.html` / `cloud-sync_backup_*.js`（手動バックアップ）は
> 2026-07-14 に削除済み。必要なら git 履歴から復元できる。

---

## 3. モジュール地図と読み込み順（重要）

`index.html` は先頭で js/ を**この順**に読み込み、最後にメインの inline `<script>`、
その後 `cloud-sync.js`（defer）を読む。**順序には依存関係がある**ので勝手に入れ替えない。

> **権威ある読み込み順は「`index.html` の `<script src>` の並び」そのもの**（現在 js/ は約43本）。
> 下表は**機能グループ単位**の地図で、個別ファイルの正確な位置は
> `grep -oE '<script src="[^"]*"' index.html` で確認する（本数が増えても腐りにくいように粒度を上げてある）。

| 順 | グループ / 主なファイル | 種別 | 中身 | 依存 |
|----|----------|------|------|------|
| 1 | `rpg-assets` `rpg-world` `aibou` `chars` `areas` | 純データ | RPG_SVG/PET_SVG、ワールドマップ、相棒、CHARS、AREAS | なし |
| 2 | `cos-data` → `gacha-story` | データ＋IIFE | コスチューム/レアリティ/セット/称号、ガチャ世界観 | gacha-story は **cos-data の後**（COS_SETS 参照） |
| 3 | `family-daily` | データ＋関数 | 家族の日課データ | なし |
| 4 | `subjects` `questions-bank` `questions-extra` | 純データ＋登録 | 教科定義、固定問題、BANK 生成・登録 | questions-extra が BANK を作る |
| 5 | `reading-data` | 純データ | 読解の文章＋設問 | なし |
| 6 | **`generators`** → `generators-hard/plus/listen/graph/elem` → `pack/pack2/pack3` → **`elem2/elem3`** | 関数＋登録 | 問題ジェネレータ本体と拡張。**load時に各プール(mathGens…g13*/g4*)へ push** | すべて **generators.js の後**（プール定義とBANK/`muGradeBand`に依存）。pack/elem2/elem3 は `typeof プール名` ガードで安全に追記 |
| 7 | `audio` `gacha-fx` `furigana` `reading-ja` `content-data` | 関数＋データ | 効果音/BGM、ガチャ演出、視覚ふりがな、日本語読み(TTS誤読対策)、学習コンテンツ | 概ね自己完結 |
| 8 | `scoring` `ui-data` `util` `miss-types` `coverage` `rating` `teach` | 関数＋データ | 偏差値/採点、UI定数、汎用ヘルパ、ケアレス分類、単元網羅、実力レート、記述採点ルーブリック | 概ね純（特性テスト済みから順次分離） |
| 9 | `duel` `ranking` | 関数 | きょうだい対戦、家族ランキング | localStorage規約 |
| 10 | `three.min.js` → `char3d` | ベンダー→関数 | Three.js r185（IIFE・グローバル`THREE`）、3Dキャラ（MON3D_SPECS含む） | char3d は **three.min.js の後**（load時は触らない） |
| 11 | **`srpg`** → `srpg-mons` → `story-data` → **`srpg-ui`** | エンジン＋UI | タクトSRPG：純エンジン(srpg)＋モンスターSVG＋物語データ＋UI/描画。自動モード・進行ウォッチドッグ | srpg-ui は srpg/srpg-mons/story-data の後 |
| 12 | `index.html` inline `<script>` | 結合コア | クイズエンジン・RPG戦闘・ガチャ・コス・ステータス・記録・UI・キャラ/音声/ユーザー管理・オンボーディング | 上記すべて |
| 13 | `cloud-sync.js` (defer) | 同期 | Firestore 同期・セッションロック・自己修復 | localStorage キー規約に依存 |

> **純エンジン方針（srpg.js・generators.js）**：DOM/乱数/Date を触らない純ロジックを別ファイルにし、
> UI(srpg-ui.js 等)から呼ぶ。純部分は Node の new Function で挙動テストしやすい（§7）。

### 3Dキャラ（char3d.js・2026-07-14）
- キャラ表示は**3D（Three.js）が既定**。`setCharacter`→`_charArt()`、RPG勇者→`_heroArt()` が
  `char3dTag()` のプレースホルダを差し、`char3dObserve()`（init で起動する MutationObserver）が
  canvas をマウント。**WebGL 不可・THREE 未読込・設定オフ（`char3d_on`='0'）なら従来 SVG に自動フォールバック**。
- モデルはプロシージャル生成（`CHAR3D_SPECS` の色/種別から球・円錐等で組む＝外部モデルファイル無し）。
  着せ替えは装備絵文字をスプライト化して頭/顔/手アンカーに重ねる（オーラは従来 CSS のまま）。
- `js/three.min.js` の再生成：`npx esbuild node_modules/three/build/three.module.js --bundle
  --format=iife --global-name=THREE --minify --outfile=js/three.min.js`（three は devDependencies）。
- テストは `tests/unit-char3d.js`（仕様の網羅・hex 検証・Node で全キャラ組み立て・統合タグ）。
- **バトルアニメーション（2026-07-14）**：RPGバトルの攻撃/被弾/勝利/やられは
  `THREE.AnimationMixer`+`AnimationClip`（キーフレーム）でモデル自体を動かす。骨は導入せず
  root位置/回転・`c3dBody`/`c3dHead`/`c3dArmR`/`c3dWingN`（`_c3dCollectParts` が命名）を
  トラック対象にする。モンスター12プランは体型で4カテゴリ（limbed/winged/amorphous/rooted）に
  分類し（`_C3D_MON_CAT`）、カテゴリ共通のクリップを使い回す。**ヒーローは体型（kind）別**：
  human/animal＝腕振り突進＋ガッツポーズ、owl＝急降下＋羽ばたき上昇、dolphin＝宙返り体当たり＋
  大ジャンプ、penguin＝腹滑り＋よちよちダンス（被弾/やられは全体型共通）。
  `index.html` のバトル処理からは `_c3dTriggerCombat(ラッパー要素, kind)` だけを呼ぶ
  （mixer/クリップの内部構造は非公開）。再生中は `_c3dTick` の手続きアイドル
  （揺れ・呼吸・首かしげ）を `v.animState` で止めてミキサーに姿勢の所有権を渡す
  （まばたきだけは常時継続）。`prefers-reduced-motion` 時は再生しない。
- **右腕グループ（`_c3dArmGroup`・2026-07-14）**：全ヒーロービルダーの右腕/右翼/右ひれは
  肩ピボットの `Group`（`userData.isArmR`・`g.userData.armR`）にまとめてある。
  `char3dEquip` の hand 装備（剣・杖等）はこの腕グループの子として装着されるため、
  攻撃の腕振りに装備が追従する（handアンカーはルート座標のまま、装着時に肩ピボットぶんを
  引いて腕ローカル座標へ変換）。テストは `tests/unit-char3d-anim.js`（カテゴリ網羅・
  体型別ディスパッチ・トラック名解決・mixer.update の補間値・装備の世界座標追従まで
  Node で実証）。

**順序の鉄則**
- `generators.js`（9）は **`questions-extra.js`（8）の後**。load 時に `BANK.xxx.push(...)` するため、先に BANK が要る。
- 純データ（1〜7）は互いに独立。並べ替えても動くが、意味のまとまりでこの順にしている。
- メインの inline `<script>`（12）は**全モジュールの後**。モジュールの定義を使う。

---

## 4. メイン `index.html` に残っているもの（実測マップ 2026-07）

> 注：下表の行範囲は精査時点（分離前）のスナップショット。以後の分離で番号はずれる。
> **「日本語読み島」は js/reading-ja.js、FLASH_DECKS/STUDY_NOTES/WRITE_PROBLEMS は js/content-data.js に
> 既に分離済み**（§3）。位置特定は行番号でなく関数名の grep を使うこと。

メインの inline `<script>` は精査時点で **1702〜5675 行**。その後 `cloud-sync.js`（defer）、
末尾に SW/キャッシュ掃除の小IIFE。主要サブシステムと行範囲：

| 区分 | 範囲(行) | 内容 | 分離しやすさ |
|------|----------|------|--------------|
| ヘッダ状態 | 1711–1769 | `currentLevel…currentChar` 等15個の**可変グローバル**、`safeLS`、`muKey` | **要塞（全体の結合の根源）** |
| ストレージ/多ユーザ/認証 | 1741–2246 | muInit(IIFE)・ユーザCRUD・学年・WebAuthn・PIN・ピッカーUI | 結合（load時IIFE・DOM・reload） |
| キャラ表示 | 1772–1811 | setCharacter 等 | 結合(DOM) |
| ブート | 1812–1875 | init/startApp/muOnCloudStatus | 結合(末尾で `init()` 実行) |
| 設定/LINE/APIキー/音声設定 | 2248–2370 | openSettings・LINE通知・ElevenLabs・声設定 | 結合 |
| 発話/TTS | 2376–2643 | speak・kuromoji・声選択/再生 | 結合 |
| **日本語読み島** | **2428–2495** | hasJapanese/NAME_READINGS/UNIT_MAP/DIGIT_KAN/intToKan/numToJa/toReading/stripEmoji/forTTS | **純：切出し好適** |
| クイズエンジン | 2644–2960 | showQuestion/handleAnswer/nextQuestion/showResult 等 | 結合(DOM+可変状態) |
| ジェネ接着+データ | 2962–3070 | JP/ENG/SCI/SOC の要素配列＋gen、escapeHtml | データは純／glueは半結合 |
| 学習ログ/記録 | 3071–3180 | showRecords 等。computeStreak/card は純 | 混在 |
| エリア/教科ナビ | 3181–3218 | | 結合 |
| キャラギャラリー | 3219–3268 | CHAR_INFO(データ) | 結合 |
| フラッシュカード | 3281–3369 | FLASH_DECKS(データ)＋fcState | 結合 |
| 学習ノート | 3370–3392 | STUDY_NOTES(データ) | 結合 |
| 書き取り | 3393–3417 | WRITE_PROBLEMS(データ) | 結合 |
| 印刷/紙採点 | 3418–3548 | paperMarks | 結合 |
| 練習/学年フロー | 3549–3645 | | 結合 |
| 試験エンジン | 3646–3759 | EXAM_QUOTA(データ)・_seedOf/withSeed(純)・timer | 結合 |
| 偏差値/採点 | 3760–3885 | EXAM_STATS(データ)・calcHensachiRaw/calcHensachi(概ね純) | 混在 |
| 解答記録/topic統計 | 3908–3955 | onAnswered/topicKey(純) | 結合 |
| ロードマップ/計画 | 3956–4064 | | 混在 |
| 問題ソース/特訓 | 4065–4154 | | 結合 |
| SRS/間違いノート | 4155–4258 | SRS_INT(データ)・dateKeyOffset(純) | 混在 |
| 毎日の目標/連続 | 4259–4398 | todayKey/fmtTime/weekDates(純) | 混在 |
| **RPGエンジン** | **4399–5309** | 戦闘・ガチャ・コス・ステータス・必殺技・ストーリー | 最大・重結合 |
| カレンダー/クエスト/バッジ | 5310–5406 | QUESTS/BADGES(データ) | 混在 |
| TTS声カタログUI | 5407–5514 | JA_VOICE_CATALOG/TTS_VOICE_PACKS(データ) | 結合 |
| 記録エクストラ描画 | 5517–5656 | renderTrend 等(DOM/canvas) | 結合 |
| キーボード | 5657–5672 | initKeyboard（内部で addEventListener） | 結合(呼出時のみ) |

### load時に即実行される“危険な”文（抽出時に壊しやすい）
- `muInit()` IIFE（1741–1750）／`init()`（5674）／末尾SW掃除IIFE（5677–5683）
- 多数の `let/var X = parseInt(safeLS.getItem(...))`（1753–1756, 3890–3891, 4310 ほか）＝load時に永続値を読む
- `Object.keys(CHARS).forEach(...)`（1768）で voiceIds を構築
- **`BANK.japanese.practice.push(...)`（3269–3280）＝メインが外部データ(BANK)へload時に追記**
- `window.muOnCloudStatus/muOnCloudUpdate/muLocalWipe = ...`（1861/2145/2159）＝deferの cloud-sync が呼ぶコールバック定義

### 分離しやすい順（load時副作用なし・共有可変状態なし）
1. **純データリテラル**：（済 FLASH_DECKS/STUDY_NOTES/WRITE_PROBLEMS → content-data.js）
   残り：MU_PER_USER, MU_WIPE_KEYS, MU_CHARS, CHAR_INFO, SRS_INT, QUESTS, BADGES,
   JA_VOICE_CATALOG, TTS_VOICE_PACKS, EXAM_QUOTA, EXAM_STATS, AFTER_AUG,
   RPG定数（RPG_SPECIAL_COST/STAT_EQUIP_MAG/STAT_SLOT/RPG_STAMINA_MAX/COS_RANK/GACHA_PITY_MAX）,
   要素配列（JP_ELEM_READ 等）
2. **純関数の島**：（済 日本語読み → reading-ja.js）。残る散在する純ヘルパ（escapeHtml, _seedOf/withSeed,
   calcHensachiRaw, lsGetJSON/lsSetJSON, todayKey/dateKeyOffset/_toDate/fmtTime, topicKey,
   rpgXpForLevel/rpgLevelForXp/rpgNodeKey/rpgDmgTaken/rpgHitsNeeded/_cosRank/_pityTriggered）
   ※ これらは unit-scoring.js 等で特性テスト済みのものから切り出すと安全。
3. **要塞（最後）**：15個の可変グローバル（currentLevel…currentChar）を `js/state.js` 等に集約してから、
   クイズ/RPG のUIを状態越しに切り出す（§9 中期）。

> 抽出は必ず「その塊を new Function で読める＝自己完結」を確認し、**抽出前後で同じ入力→同じ出力**に
> なる特性テスト（characterization test）を先に用意してから行う（§8）。

---

## 5. データモデルと同期（cloud-sync.js）

### localStorage キー規約（これが同期の“真実の源”）
- **共有設定**：`mu_users`（ユーザー一覧 JSON）, `mu_deleted`, `mu_admin_pin`, `theme`, `fontsize`,
  各 `voice_*`, `testdate`, `reward`, `line_endpoint`, `extra_questions`, `tts_*`, `sfx_on`, `vibe_on` …
  → cloud-sync.js の `SHARED` 配列がホワイトリスト。
- **ユーザー別データ**：`u:{uid}:...` 形式（例 `u:u1:c_points`, `u:u1:rpg_state`）。
  `u:{uid}:q_log`（出題ログ）は容量対策で同期対象外。

### Firestore 構造
```
families/{家族コード}                  … 旧v1ドキュメント（初回に自動移行、以後バックアップ扱い）
families/{家族コード}/shared/settings  … 家族共通の設定（mu_users・テスト日・ごほうび等）
families/{家族コード}/members/{uid}    … ユーザーごとの学習データ（1人1ドキュメント。1MB制限回避）
families/{家族コード}/sessions/{uid}   … 端末セッションロック（多重端末検知）
```

### 事故らないための設計（過去に何度もデータ消失があったため）
- **マージは max/union**：数値は大きい方、`owned`/`titles`/`sets` は和集合、というふうに
  **既存を上書きで消さない**（`mergeRpg` / `mergeCos` / `mergeUsers`）。
- **読み取り成功ガード**：クラウドを**読めたときだけ**保存する（`readOk` / `_parentReadOk`）。
  読めていないのに空で上書き＝全消し、を防ぐ。
- **自己修復（self-heal）**：起動時に v1 親ドキュメントや member ドキュメントから
  `mu_users`・ユーザーデータを復元（`checkLegacy` / `cloudPullShared`）。
- **セッションロック**：同一ユーザーが複数端末で操作するとエラー表示し、「この端末で続ける」で奪取。

> **触るときの注意**：cloud-sync.js は**過去の事故対策の層が積み重なっている**。
> マージ規則やガードを外すと再びデータ消失が起きる。変更時は必ず tests/int-*.js（復元/修復/競合）を通す。

---

## 6. ビルドとデプロイ（本番パイプライン）

### なぜビルドが要るか
- 素の index.html は js/ を十数本の `<script>` で読む。本番では **1本に結合＋圧縮**して配信したい。
- ただし **識別子リネームは絶対にしない**。`onclick="foo()"` が呼ぶ**グローバル関数名を壊さない**ため。

### scripts/build.js の動作
1. `index.html` の全 `<script>` を**文書順どおり**に集める（src は中身を読み、`?v=` は除去）。
2. esbuild で **`--minify-whitespace --minify-syntax` のみ**で圧縮（**`--minify-identifiers` は付けない**）。
3. `<style>` も圧縮。
4. 全 `<script>` を除去し、末尾に **`<script src="app.min.js?{版}">`** を挿入。
   - **`three.min.js`(約714KB) だけは別チャンク**として分離し、`app.min.js` の前に読む。
     中身が不変なので**ブラウザキャッシュが永続**し、アプリ更新のたびに再ダウンロードされない。
   - 版数は `sw.js` の `VERSION`（例 `v1.10.9` → `v1109`）から採る＝**手動の `?v=` 管理が不要**。
5. `icons/` `manifest` `sw.js` を dist/ にコピー。
- 出力（2026-07 実測）：`dist/index.html`（約253KB）＋ `dist/app.min.js`（約1.8MB）＋
  別チャンク `dist/three.min.js`（約714KB・キャッシュ永続）。結合スクリプトは約46本。
  > コンテンツ増量と機能追加でバンドルは肥大化傾向。**機能別の遅延ロード（3DやSRPG、問題pack）**が
  > 次の性能課題（PRO_ROADMAP の T1/T2）。まず CI に実ブラウザ e2e を常設して「起動する」を担保してから着手する。

### 命綱：scripts/check-globals.js
- ビルド後の `dist/index.html` からインラインハンドラの関数名を機械抽出し、
  `dist/app.min.js` に**定義として残っているか**を検証（2026-07 時点で188個）。
- これが**「本番だけボタンが無反応」**という、テストが緑のまま起きうる最悪の事故を止める。
  esbuild に誤って `--minify-identifiers` を付けた／関数が結合から漏れた、を即検知。

### CI（.github/workflows/ci.yml、push/PR で実行）
- `test` ジョブ：`node tests/run-all.js`（**依存ゼロ**。esbuild 無しでも動く）。
- `build` ジョブ：`npm ci` → `npm run build` → `node scripts/check-globals.js`（本番同等のビルド検証）。

### 本番デプロイ（.github/workflows/deploy.yml、main への push で実行）
1. テスト（緑でなければ**止まる**＝本番を守る）
2. ビルド（dist/ 生成）
3. check-globals（公開前の健全性検証）
4. dist/ を GitHub Pages へ公開（`actions/deploy-pages`）
- **前提**：リポジトリ Settings → Pages → Source = **「GitHub Actions」**。
- 公開URL：https://km4145-ship-it.github.io/study-app/
- **運用**：今後は **main に push するだけ**で「テスト→ビルド→公開」。`?v=` 手動管理は不要。
- **ロールバック**：Settings → Pages → Source を「Deploy from a branch（main / root）」に戻すと、
  ルートの index.html＋js/ で**元の動くアプリに即復帰**（データには影響なし）。

---

## 7. テスト（tests/、依存ゼロ）

- 実行：`node tests/run-all.js`（または `npm test`）。各テストを子プロセスで起動し集計。
- **依存ゼロ方針**：node 標準のみで動く。Firestore/localStorage 等は `tests/lib/cloud-harness.js` でスタブ。
  - `createHarness({store, mode})`：Firestore（merge:true の deepMerge）・localStorage・sessionStorage・
    document・firebase を偽装。`mode`：`ok`/`deny`/`noread`/`parentfail`。
  - `load(path)`：`(0,eval)(...)`（間接eval＝グローバルスコープ）で cloud-sync.js を実行。
- `tests/lib/assert.js`：`makeChecker(name)` が `{ok, eq, done}` を返す。`ROOT` も提供。
- テストの種類：
  - **unit-***：各 js/ モジュール（データ整合・関数挙動）。generators は 40問×教科の**挙動テスト**。
  - **int-***：cloud-sync の復元/状態/自己修復/pullshared など**結合テスト**。
  - **int-build**：build→check-globals（esbuild 無ければスキップ）。
- **重要な思想**：モジュール切り出しは「純データか、副作用のない関数か」を
  **挙動テストで担保**してからコミットする（過去、関数を巻き込んで抽出しかけた事故を挙動テストが検知した）。

### テストの足し方
1. `tests/unit-xxx.js` を作る（`makeChecker` を使う）。
2. `tests/run-all.js` の `TESTS` 配列に追加。
3. `node tests/run-all.js` が緑を確認。

---

## 8. 安全に手を入れる手順（ゴールデンパス）

### モジュールを1つ切り出すとき
1. **対象を選ぶ**：まず**純データ**か**副作用のない関数の塊**を選ぶ（load時に実行される文が無いもの）。
   共有可変状態（`STATE` 等）や load 時の初期化コードを含む塊は後回し。
2. **verbatim で移す**：`scripts/extract-block.js` 等で、コードを**1バイトも変えず**に js/ へ移し、
   `index.html` の元位置に読み込みタグを（正しい順序で）差す。挙動が変わらないのが大前提。
3. **挙動テストを書く**：切り出した関数を new Function 等でロードして呼び、期待挙動を確認。
4. **全テスト＋ビルド**：`node tests/run-all.js`（int-build 含む）が緑、`node scripts/check-globals.js` OK。
5. **1コミット**：意味のある単位で1コミット。壊れたら個別に戻せる。
6. **ブラウザ確認**：最終的には実機で該当機能を触って確認（自動テストは DOM/onclick 全経路は見きれない）。

### 落とし穴（過去に踏んだもの）
- **抽出のしすぎ**：stop マーカーを緩く取ると隣接する関数群まで巻き込む。→ 精密なマーカーで。
- **load順依存**：`generators.js` のように load 時に他のグローバル（BANK）へ触る塊は、
  依存先より**後**に読む必要がある。挙動テストで `ReferenceError` を検知できる。
- **識別子リネーム厳禁**：ビルドで関数名を変えると onclick が全滅。check-globals が守る。
- **cloud-sync のマージ規則を弱めない**：max/union と readOk ガードを外すとデータ消失が再発。

---

## 9. スケール（100倍）に向けての方針メモ

- **短期**：残る結合コア（クイズ/RPG/UI）を、状態と関数を切り分けながら順次モジュール化。
  各モジュールに挙動テストを付け、`check-globals` で本番の壊れを常に監視。
- **中期**：`STATE` などのグローバル可変状態を、明示的な**状態モジュール**（例 `js/state.js`）へ集約し、
  読み書き経路を関数越しにする（テスト容易性・競合の見通しが上がる）。
- **将来**：本当に大規模化するなら、ハンドラを `addEventListener`＋`data-action` 方式へ寄せると
  「グローバル関数名に依存」制約が外れ、ES Modules 化や本格的なバンドラ導入の道が開ける。
  ただし**大工事なので、テスト網（特に check-globals 相当）を先に厚くしてから**着手する。

---

## 10. 触る前のチェックリスト

- [ ] `node tests/run-all.js` が緑か（作業前の基準を確認）
- [ ] 変更後、`node tests/run-all.js` と `npm run build` と `node scripts/check-globals.js` が緑か
- [ ] cloud-sync を触ったなら int-restore / int-heal / int-pullshared が緑か
- [ ] 読み込み順（§3）を壊していないか
- [ ] コミットは意味のある1単位か（壊れたとき戻せるか）
- [ ] 最後にブラウザ実機で該当機能を確認したか
