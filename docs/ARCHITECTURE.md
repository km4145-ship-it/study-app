# study-app アーキテクチャ（開発の地図）

小中学生向け学習PWA。「100倍スケール」を見据えた土台整備の一環として、
**将来の自分・他の開発者・AIエージェントが安全に手を入れられる**ことを目的にこの文書を置く。

> ひとことで言うと：**素のグローバルスクリプト（ES Modules ではない）**で書かれた単一ページアプリを、
> **挙動を1バイトも変えずに** js/ モジュールへ切り出しつつ、
> **テスト → ビルド → 自動デプロイ** の足場で守っている。

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

index_backup_*.html / cloud-sync_backup_*.js  過去の手動バックアップ（ビルド対象外・参考のみ）
```

> メモ：ルートの `index_backup_*.html` 等はビルドに含まれない（`build.js` は `index.html` だけを読む）。
> 履歴は git にあるので、いずれ整理してよい。

---

## 3. モジュール地図と読み込み順（重要）

`index.html` は先頭で js/ を**この順**に読み込み、最後にメインの inline `<script>`、
その後 `cloud-sync.js`（defer）を読む。**順序には依存関係がある**ので勝手に入れ替えない。

| 順 | ファイル | 種別 | 中身 | 依存 |
|----|----------|------|------|------|
| 1 | `js/rpg-assets.js` | 純データ | RPG_SVG, PET_SVG, PET_STAGE_NAME, PET_WINS_FOR, STICKERS | なし |
| 2 | `js/rpg-world.js` | 純データ | RPG_WORLD, RPG_CONTINENTS, RPG_CASTLE_POS, RPG_GOAL_POS, RPG_STORY | なし |
| 3 | `js/chars.js` | 純データ | CHARS（キャラ定義） | なし |
| 4 | `js/areas.js` | 純データ | AREAS | なし |
| 5 | `js/cos-data.js` | 純データ＋IIFE | COS_DATA/COS_SLOTS/RARITY/SETS/TITLES（コスチューム142種） | なし |
| 6 | `js/subjects.js` | 純データ | SUBJECTS（教科定義） | なし |
| 7 | `js/questions-bank.js` | 純データ | QUESTIONS（固定問題） | なし |
| 8 | `js/questions-extra.js` | 純データ＋登録 | BANK＋各教科の練習/入試問題を登録 | なし（BANK を生成） |
| 9 | `js/generators.js` | 関数＋登録 | 問題ジェネレータ、genQuestion 等。**load時に BANK へ push する** | **8 の後でないと壊れる**（`muGradeBand` も参照） |
| 10 | `js/audio.js` | 関数 | 効果音/BGM/バイブ（sfx, bgmPlay, vibe 等） | なし |
| 11 | `js/furigana.js` | 関数 | 視覚的ふりがな（トークナイザ未ロードでも例外を出さない設計） | `muGradeBand`（メイン側） |
| 12 | `index.html` inline `<script>` | 結合コア | クイズエンジン・RPG戦闘・ガチャ・コスチューム・ステータス・記録・UI・キャラ/音声/ユーザー管理 | 上記すべて |
| 13 | `cloud-sync.js` (defer) | 同期 | Firestore 同期・セッションロック・自己修復 | localStorage キー規約に依存 |

**順序の鉄則**
- `generators.js`（9）は **`questions-extra.js`（8）の後**。load 時に `BANK.xxx.push(...)` するため、先に BANK が要る。
- 純データ（1〜7）は互いに独立。並べ替えても動くが、意味のまとまりでこの順にしている。
- メインの inline `<script>`（12）は**全モジュールの後**。モジュールの定義を使う。

---

## 4. メイン `index.html` に残っているもの

まだ切り出せていない**結合したコア**が inline `<script>` に残る。おおまかに：

- **クイズエンジン**：`showQuestion` / `handleAnswer` / `onAnswered` / `nextQuestion` など
- **RPG**：戦闘・ガチャ・コスチューム・ステータス・必殺技
- **記録/統計 UI**：`showRecords` / `showMistakes` / 週次レポート等
- **キャラ/ユーザー/音声管理**：`setCharacter` / ユーザー切替 / `muShowPicker` 等
- **状態**：`STATE`（現在の出題・進行）など**load 時に初期化される可変状態**

> これらは「load 時に実行されるコード」や「共有可変状態」を含むため、
> 純データ/純関数モジュール（切り出し済み）より**分離が難しい**。§8 の手順で慎重に進める。
> （分割候補の詳細ロードマップは Explore 精査の結果を随時追記する。）

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
4. 全 `<script>` を除去し、末尾に **`<script src="app.min.js?{版}">` を1本だけ**挿入。
   - 版数は `sw.js` の `VERSION`（例 `v1.10.9` → `v1109`）から採る＝**手動の `?v=` 管理が不要**。
5. `icons/` `manifest` `sw.js` を dist/ にコピー。
- 出力：`dist/index.html`（約116KB）＋ `dist/app.min.js`（約643KB）。

### 命綱：scripts/check-globals.js
- ビルド後の `dist/index.html` からインラインハンドラの関数名を機械抽出し、
  `dist/app.min.js` に**定義として残っているか**を検証（現在69個）。
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
