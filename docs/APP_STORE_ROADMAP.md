# App Store／Google Play 外部販売への移行ロードマップ

> このドキュメントの役割は `docs/ARCHITECTURE.md`（現在のコードの地図）と対になる、
> **将来の姿への地図**。数ヶ月にまたがる作業なので、セッションをまたいでも参照できるよう
> ここに全フェーズを記録する。**「再開」時、外部販売の話であればまずこれを読むこと。**

## 現在地（2026-07-14）

家族利用のPWA（`docs/ARCHITECTURE.md` 参照）。認証は匿名＋4桁の家族コードのみ、
単一のFirebaseプロジェクト（`study-app-48c8f`）に単一家族（`families/0000`）が実運用中。
判明しているセキュリティ課題は `docs/SECURITY.md` に集約。**Phase 1・Phase 2は完了、
Phase 3はコード側の準備のみ完了、Phase 4はSlice 1（単独オーナーの実アカウント）まで完了**
（ルールのコード化・セキュリティドキュメント整備・App Store用アイコン素材／TTSプロキシの
Cloudflare Workersデプロイ＋実キー確認済み／Capacitor関連の依存追加・vendor化・ビルド対応まで
済み、実機確認はXcode/Android Studio導入後の次セッション／メール＋パスワードでの実アカウント
（`accounts/{uid}/...`、家族コードとは完全分離）を追加、共有・招待はSlice 2で未着手）。

配布目標：iOS・Android両方。ネイティブ化はCapacitorを採用（PWAを最小改修でラップでき、
IAPプラグイン（RevenueCat等）が成熟しているため）。カテゴリはApple Kids Categoryではなく
**Education**を推奨（理由は本文末尾）。

## 横断的な不変条件（すべてのフェーズで守る）

- 各フェーズの前後で `node tests/run-all.js` と `npm run build && node scripts/check-globals.js` が緑。
- `--minify-identifiers` は使わない。ES Modules化はしない（Capacitorはdist/の中身を問わないので、
  この制約が移行の障害になることはない）。
- 既存の家族（`families/0000`）は Phase 7 の明示的な移行操作まで、今のGitHub Pages URLで
  今までどおり動き続ける。共有インフラ（Firestoreルール・サーバー処理）を触るフェーズは
  すべて「追加」であって「置き換え」ではない。
- `cloud-sync.js` のgrow-onlyマージ関数群（`mergeRpg`/`mergeCos`/`mergeUsers`/`mergeAibou`/
  `mergeDuels`等）と `MU_PER_USER`/`SHARED` のキー同期の仕組みは、このコードベース最大の資産。
  どのフェーズも「書き込み先のパス」だけを変え、ロジックはそのまま再利用する。

## 今すぐ（コード外・ユーザー対応）

- ElevenLabs APIキーのダッシュボードで利用上限／スコープを制限する（`docs/SECURITY.md` #2）。
  Phase 2完了までの暫定対策。

---

## Phase 1 — インフラのコード化・アイコン素材（✅ 実行済み・2026-07-14）
挙動ゼロ変更。`firestore.rules`/`firebase.json`/`.firebaserc`（現行ルールをそのままコード化）、
`docs/SECURITY.md`、このロードマップ、`icons/icon-1024.png`（App Store提出用マスター）を追加。
**`firebase deploy --only firestore:rules` はまだ実行していない**（本番反映はユーザー判断）。

## Phase 2 — TTSサーバープロキシ（Cloudflare Workers）✅ デプロイ・疎通確認済み（2026-07-14）
**目的**：ElevenLabsキーの平文露出を無くす。他フェーズと独立して着手・出荷できる、最優先の実害対策。

**⚠️ 設計変更の経緯**：当初はFirebase Cloud Functionsで実装したが（コミット`26fe59b`〜
`6bb17db`・未push）、Cloud Functionsのデプロイに**Firebase Blazeプラン（従量課金）への
切替が必須**という制約があり、ユーザーが「バグ・悪用による青天井の請求リスクを避けたい」と
判断。調査の結果：
- **Cloudflare Workers無料枠**は上限到達時に「課金」ではなく**リクエスト拒否（429）**という
  構造で、クレジットカード登録すら不要＝構造的に青天井になりえない
- **Firestoreは Spark（無料）プランのままでも**上限到達時は`RESOURCE_EXHAUSTED`で
  失敗するだけで課金されない（請求先アカウント自体が無いため）

→ **演算（TTSプロキシ）をCloudflare Workersへ、データ保存はFirestoreのまま（Spark維持）**
という構成に変更。これにより Blaze プラン自体が不要になり、課金リスクを構造的にゼロにできる。
`functions/`（Firebase版）は削除し、`workers/tts-proxy/`に置き換えた
（履歴は書き換えず新コミットで置換＝未pushだったため実害なし）。

### 実装内容（コミット済み）
- `workers/tts-proxy/lib/tts.js`：純粋ロジック（バリデーション・日次クォータ・エラー整形）。
  Firebase版から無変更で移植（ランタイム非依存のロジックのため）。
- `workers/tts-proxy/lib/jwt.js`：**新規**。RS256のJWT署名・検証を`crypto.subtle`
  （Web Crypto API）のみで自前実装。用途は2つ：①GCPサービスアカウントの秘密鍵で
  自前のJWTに署名しOAuth2アクセストークンと交換（Firestore REST APIへのAdmin相当
  アクセスに使う）、②クライアントのFirebase IDトークンをGoogleの公開鍵（JWKS）で検証
  （`admin.auth().verifyIdToken()`の自前実装）。**`crypto.subtle`とグローバル`fetch`は
  Node.js（v18+）にも標準搭載されているため、Cloudflare Workersを一切使わずNode単体で
  実際に鍵ペアを生成して署名→検証の往復・改ざん検知・期限切れ検知までテストできる**
  （study-appの「依存ゼロでテストする」方針とより一致する、Firebase版より手厚い検証）。
- `workers/tts-proxy/lib/firestore.js`：**新規**。Firestore REST APIの薄いラッパー
  （ドキュメント取得・部分更新、Firestoreの値表現`{fields:{apiKey:{stringValue:...}}}`との
  相互変換）。ネットワーク呼び出し部分は`fetchImpl`を注入可能にしてあり、テストではスタブで
  リクエスト形状（URL・Authorizationヘッダ・updateMask等）を検証する。
- `workers/tts-proxy/src/index.js`：エントリポイント（`fetch`ハンドラ）。ルーティングと
  CORS処理のみの薄いグルー。エンドポイント仕様はFirebase版と同一：
  - `POST /setTtsKey`：キーをElevenLabsへ検証してから `families/{code}/private/tts` に保存
  - `POST /verifyTtsKey`：保存済みキーの有効性確認
  - `POST /synthesizeSpeech`：保存済みキーで音声合成し、音声バイナリをそのまま返す。
    「声が見つからない」時はクライアントが渡す`ownerId`でボイスライブラリに追加後1回だけ再試行
  - 認証：`Authorization: Bearer <Firebase IDトークン>`（匿名認証のトークンでも可＝
    現状のFirestoreルールと同じ認証レベルを維持。家族コードの所有検証はまだ無い＝
    Phase 4まで残る既知の制約）
  - CORSは`https://km4145-ship-it.github.io`＋ローカル開発サーバーのみに限定
  - 実HTTPステータスを返す設計（前回Firebase版で見つけた「常に200を返す」バグは
    最初から作らない設計にした）
- `firestore.rules`：**無変更**（`families/{fam}/private/{document=**}`の
  `allow read, write: if false`ロックダウンはそのまま活きる。Workersはサービスアカウント
  経由でルールを迂回するため影響なし）。
- **防御的な日次クォータ**：1家族あたり1日50,000文字（Firebase版と同じ）。
- `cloud-sync.js`の`cloudWipeAll`修正（`private`サブコレクション削除）も無変更で活きる。

### デプロイ実績（2026-07-14完了）
- Cloudflareアカウント作成・APIトークン発行（`wrangler login`のOAuthコールバックが
  ローカル環境から届かず失敗したため、`CLOUDFLARE_API_TOKEN`環境変数での認証に切替）。
- workers.devサブドメイン未登録だと`wrangler deploy`が失敗する点が判明（サブドメイン登録は
  Cloudflare API（`PUT /accounts/{id}/workers/subdomain`）から直接可能、ダッシュボード操作不要）。
- GCPサービスアカウント`tts-proxy@study-app-48c8f.iam.gserviceaccount.com`を作成し、
  `GCP_CLIENT_EMAIL`/`GCP_PRIVATE_KEY`をWorkerシークレットに設定。
- **実際に本番でも「IAM反映待ち」以上の問題（ロール未付与）が発生**：初回のロール付与操作が
  反映されず`testIamPermissions`で確認したところ権限ゼロだった。IAM画面から
  `roles/datastore.user`を再付与後、今度は付与自体はできていたが**Firestore側の権限キャッシュ
  （最大5分・上記の既知の注意点どおり）**で数分間`PERMISSION_DENIED`が続いた。5分ほど待って
  解消。→ **この2段階（ロール未付与／付与後のFirestoreキャッシュ）を区別するには
  `cloudresourcemanager.googleapis.com/v1/projects/{id}:testIamPermissions`をSAトークンで
  叩くのが有効**（IAM側の反映は即座に確認でき、それでも403ならFirestore側のキャッシュ待ちと切り分けられる）。
- デプロイ先URL：`https://study-app-tts-proxy.km4145-study-app.workers.dev`
- 匿名Firebase認証で実際にIDトークンを取得し、`/verifyTtsKey`をWorker越しに叩いて
  `{"ok":false,"error":"no_key_set"}`（キー未設定の正常応答）を確認＝
  認証検証・Firestore REST APIアクセスの一連の流れがエンドツーエンドで動作することを確認済み。
  `index.html`の`TTS_FUNCTIONS_BASE`もこのURLに更新済み（クライアント切替コミットにて）。
- **未実施**：実際のElevenLabs APIキーでの動作確認（設定画面からのキー登録→読み上げ）と、
  クライアント切替コミットのpush。

### 必要な準備（ユーザー側の作業）
1. **GCPサービスアカウントの作成**（Google Cloud Console → IAMと管理 → サービスアカウント）
   - プロジェクト：`study-app-48c8f`
   - ロール：「Cloud Datastore User」（IAMロールID `roles/datastore.user`。Firestoreの
     読み書き。セキュリティルールを迂回するAdmin相当の特権。役割名の確認済み）
   - JSON形式の鍵を作成・ダウンロード（`client_email`と`private_key`を後で使う）
   - **権限の反映には最大5分ほどかかることがある**（Firestore側がIAM権限を5分キャッシュする
     ため）。サービスアカウント作成直後にデプロイ→即テストすると`PERMISSION_DENIED`に
     見えることがあるが、数分待って再試行すれば解決する（設定ミスではない）
   - gcloud CLIが使える場合はコンソール操作の代わりに以下でも可：
     ```
     gcloud iam service-accounts create study-app-tts-proxy --project=study-app-48c8f
     gcloud projects add-iam-policy-binding study-app-48c8f \
       --member="serviceAccount:study-app-tts-proxy@study-app-48c8f.iam.gserviceaccount.com" \
       --role=roles/datastore.user
     gcloud iam service-accounts keys create key.json \
       --iam-account=study-app-tts-proxy@study-app-48c8f.iam.gserviceaccount.com
     ```
2. **Cloudflareアカウント作成**（https://dash.cloudflare.com/sign-up 、無料・クレジットカード
   登録不要）
3. **Wrangler CLIのインストール＆ログイン**：
   ```
   cd workers/tts-proxy
   npm install
   npx wrangler login
   ```
4. **シークレットの設定**（1で取得したサービスアカウントJSONから。リポジトリには絶対に
   含めない）：
   ```
   npx wrangler secret put GCP_CLIENT_EMAIL
   # プロンプトでJSON内の "client_email" の値を貼り付け
   npx wrangler secret put GCP_PRIVATE_KEY
   # プロンプトでJSON内の "private_key" の値を貼り付け（改行込みでそのまま）
   ```
5. **（推奨・任意）ローカル動作確認**：
   ```
   npx wrangler dev
   ```
   別ターミナルで：
   ```
   curl -X POST http://localhost:8787/verifyTtsKey -H "Content-Type: application/json" -d '{"familyCode":"0000"}'
   ```
   認証ヘッダ無しなので`{"ok":false,"error":"auth_required"}`（401）が返れば配線は正常。
6. **デプロイ**：
   ```
   npx wrangler deploy
   ```
   完了すると `https://study-app-tts-proxy.<あなたのサブドメイン>.workers.dev` という
   URLが表示される。
7. **`index.html`の`TTS_FUNCTIONS_BASE`定数を6のURLに書き換える**
   （現在はプレースホルダ`https://study-app-tts-proxy.YOUR-SUBDOMAIN.workers.dev`のまま）。
8. デプロイ後、実際にElevenLabsのAPIキーで動作確認（設定画面からキー入力→接続確認→読み上げ）
9. 8が確認できたら、**クライアント切替コミット**（`cloud-sync.js`/`index.html`。同セッションで
   用意済み）をpushする。**この順序が重要**：Workersのデプロイより先にクライアント切替を
   pushすると、家族のTTSがその場で壊れる（存在しないURLを叩くことになるため）。

**要判断（本セッションで決定・確定）**：Firebase Cloud Functions vs Cloudflare Workers。
**Cloudflare Workersを採用**（Blazeプラン不要＝課金リスクの構造的排除を優先）。
Firestoreはデータ保存として引き続き使う（Spark維持）。Phase 4（招待コード）・
Phase 6（課金Webhook）を実装する際は、同じCloudflare Workers＋Firestore REST APIの
パターンを再利用する想定（Firebase Cloud Functionsへの回帰は現時点では予定しない）。

**再利用/作り直し**：「家族が自前のElevenLabsキーを持ち込む」UXはそのまま維持し、鍵の置き場所だけ
サーバー側に移した。TTSを課金機能にするかどうかはPhase 6に委ねる（このフェーズは純粋なセキュリティ修正）。

## Phase 3 — Capacitorネイティブシェル（配布前の動作検証）
**目的**：App Store申請前に、既存PWAがネイティブWebView内で正しく動くか
（WebGL/Three.js・オーディオ自動再生・WebAuthn可否・localStorage永続化）を確認する。
TestFlight内部テストのみ、一般公開はしない。

**✅ コード側の準備のみ実行済み（2026-07-14・Xcode/Android Studio未導入のため意図的にここで停止）**
- `package.json`：`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`,
  `@capacitor/app`, `@capacitor/splash-screen`, `@capacitor/status-bar` を追加。加えて
  `typescript`も追加（`@capacitor/cli`の実ソースを確認したところ、`.ts`形式の設定ファイルを
  読むには`typescript`のインストールが必須と判明。無いと`npx cap`系コマンドが
  `Could not find installation of TypeScript`で即失敗する）。
- 新規 `capacitor.config.ts`（`webDir: "dist"`、`appName: "小中学生学習アプリ"`）。
  `appId`は仮値`app.studyapp48c8f.study`（Apple Developer Program未登録のため暫定・
  Firebaseプロジェクトid由来。ネイティブプロジェクト生成前なら変更コストはファイル1行のみ）。
- **Firebase Compat SDKをローカルにvendor化**：`js/vendor/`に`firebase-{app,auth,firestore}-compat.js`
  （10.12.2固定・gstatic.comと完全一致することをdiffで確認済み）を配置し、`cloud-sync.js`の
  `loadScript()`3箇所をローカル相対パスに変更。外部CDN依存が無くなるのはネイティブ版だけでなく、
  同じ配信ファイルを使う現行のGitHub Pages版にも効く副次効果。ソースマップ（`.js.map`）は
  DevTools専用・約3.3MBの追加になるだけなのでvendorしていない。
- `scripts/build.js`：`js/vendor/`を`dist/js/vendor/`へ静的コピー（`assets/`と同じ扱い、
  バンドルには含めない）。
- 新規npmスクリプト `cap:sync`（`npm run build && npx cap sync`）。**まだ実行していない**。
- 検証：`node tests/run-all.js`（`e2e-smoke`含め全緑）・`npm run build && node
  scripts/check-globals.js`（緑）・`diff -r js/vendor dist/js/vendor`（完全一致）・
  ローカルサーバーでブラウザから実読み込みしクラウド未接続バナーが出ないことを確認済み。

**❌ 明示的に未着手（Xcode / Android Studio 導入後の次セッションへ）**
- `npx cap add ios` / `npx cap add android`（ネイティブプロジェクトフォルダ生成）。生成後に必要になる
  `.gitignore`への`ios/`/`android/`関連エントリ追加も、フォルダが実在してから行う。
- Xcode／CocoaPods／Android Studio・Android SDKのインストール自体（このMacには
  Command Line Toolsのみで、Xcode本体・CocoaPods・Android Studio/SDKはいずれも未導入）。
- 実機/シミュレータでのネイティブビルド・起動確認。
- **このフェーズ本来の目的であるリスク確認**：WebAuthn（顔/指紋認証、`index.html`の
  `bioSupported()`まわり）がCapacitorのWebView内で従来どおり動くか、ダメでもPINへの正常
  フォールバックが効くか。**ネイティブWebViewが無いと原理的に確認不可能**なため今回は対象外
  （PIN経由のフォールバック自体は`muBioGate()`にコード上は既に実装済み）。
- 手動：Apple Developer Program登録、Bundle ID確定（上記仮値からの本決め）、Xcode署名、
  App Store Connectアプリ登録（TestFlightのみ）、Androidキーストア準備。

**推奨**：ショックダウンテストは使い捨ての家族コードで行い、`families/0000`（本番）には触れない
（Xcode導入後、実際に`cap add`する次セッションで有効）。

## Phase 4 — 実アカウントモデルとFirestoreデータ再構成（最難関・最重要フェーズ）
**目的**：4桁の推測可能な家族コードを、実認証に基づくアカウント単位のデータ分離に置き換える。
Web版でまず構築・検証（イテレーションが最速）。**既存の `families/{code}` パスと共存**させ、
新規パスとして追加する（既存家族は無停止）。

フルスコープ（`accounts/{ownerUid}`＋`authorizedUsers`＋`invites`＋`userAccountIndex`＋
Cloudflare Workersの新エンドポイント）は一度に実装するには大きすぎるため、**Slice 1（単独
オーナーのみ・共有機能なし）とSlice 2（複数端末の共有・招待）に分割**して進める。

### Slice 1 — 単独オーナーの実アカウント（メール＋パスワード）✅ 実装済み（2026-07-14）
**認証方式はメール＋パスワード**（Phase 5のSign in with AppleはネイティブiOS向けのため、
Web版での構築・検証にはつなぎとして使えない。ユーザー選定）。

- `accounts/{ownerUid}/shared/settings`, `/members/{childId}`, `/sessions/{childId}`
  （現行の`families/{code}/...`と構造は同じ、ルートだけ実認証UID）。**共有・招待は無し**＝
  `accountId`は常に`= auth.currentUser.uid`（`userAccountIndex`・`authorizedUsers`・
  `invites`はSlice 2で導入。今回は不要）。
- `cloud-sync.js`：`mode`（`'family'|'account'`）を追加し、`legacyRef()`ベースの
  `sharedRef`/`memberRef`/`sessionRef`を`rootRef()`（modeで`families/{fam}`と
  `accounts/{acctId}`を切替）経由に変更。マージ関数群・`SHARED`/メンバーキー規約は無変更で
  再利用。`start()`を`onAuthStateChanged`ベースに書き換え、`_decideAuthAction()`（純粋関数・
  `tests/unit-account-model.js`でテスト）で認証状態から起動モードを判定。
  **v1移行（`checkLegacy`）・リセット伝播（`listenReset`）はfamilyモード専用の概念のため
  accountモードでは呼ばない**（新規アカウントにはv1親docが存在しないため）。
- **重大な安全対策**：モード切替（`cloudAccountSignUp`/`SignIn`/`SignOut`）時は、単に
  `location.reload()`するだけでは旧モードのローカルキャッシュ（`mu_users`・`u:*`等）が新モードの
  クラウドに漏れ、特にサインアウト後は本番`families/0000`を汚染しうることが設計レビューで
  判明。`clearSyncCacheForModeSwitch()`（既存の`basicWipe()`/`window.muLocalWipe`を再利用）で
  reload前に同期対象キーを明示的に消去する。`cloudFamilySet`自体の「引き継ぎ」挙動は無変更。
- `firestore.rules`：`accounts/{accountId}`を追加（`request.auth.uid==accountId &&
  request.auth.token.firebase.sign_in_provider!='anonymous'`＝匿名不可・所有者本人のみ）。
  `families/{fam}`は無変更（Phase 7の移行まで開けたまま）。
- `index.html`：「🔑 アカウント（実験的）」設定セクション（メール・パスワード入力＋
  作成/ログイン/ログアウト・現在のモード表示）。
- テスト：`tests/lib/cloud-harness.js`の`firebase.auth()`スタブを拡張
  （`currentUser`/`onAuthStateChanged`/`createUserWithEmailAndPassword`/
  `signInWithEmailAndPassword`/`signOut`。**`signInAnonymously()`のスタブもcurrentUser更新＋
  コールバック再発火に対応させないと、認証済みユーザーを一切seedしない既存の統合テストが
  軒並みハングする**ことが判明・対応済み）。新規`tests/unit-account-model.js`
  （`_decideAuthAction`のテスト）・`tests/int-accounts.js`（accountモードでの同期・
  セッションロックの動作確認）。**既存7統合テストは無改修のまま全緑を維持**（最重要の回帰確認）。

**ユーザー側の残作業**：①Firebase Console → Authentication → Sign-in method →
「メール/パスワード」を有効化（プロジェクト`study-app-48c8f`）②`firebase deploy --only
firestore:rules`の実行判断③実際にメールアドレスでアカウント作成→動作確認④
本番`families/0000`のデータが本作業前後で変化していないことの確認。

### Slice 2 — 共有・招待（未着手）
- `accounts/{ownerUid}/authorizedUsers/{authedUid}`：オーナー以外の端末（配偶者・祖父母等）の
  アクセス許可リスト。ルールは `request.auth.uid == accountId || exists(.../authorizedUsers/$(uid))`。
- `accounts/{ownerUid}/invites/{code}`：使い切りの招待コード（「コードを教える」という
  既存の使い勝手を、永続的に推測可能ではない形で残す）。
- 新規トップレベル `userAccountIndex/{authedUid}: {accountId}`：どの端末がどのアカウントに
  同期すべきかのルックアップ。
- 新規サーバー処理（Phase 2の `workers/tts-proxy/` と同じCloudflare Workers＋Firestore REST
  パターンを再利用）：`createAccount`, `createInvite`, `redeemInvite`（招待の消費はアトミック性が
  要るためクライアント側ルールでは不可）。
- TTSプロキシ（`workers/tts-proxy/`）のaccountモード対応（Slice 1では`_ttsFamilyCode()`は
  無変更＝TTSは家族コード経由のまま）。
- `families/{code}`から`accounts/{uid}`への既存データ移行はPhase 7、または専用の移行ツールで
  別途検討（Slice 1・2いずれも自動移行はしない）。

**要判断（最重要・後戻り困難）**：Slice 2のデータモデル形（`accounts/{ownerUid}` +
`authorizedUsers` + `userAccountIndex` + 招待コード）は、サブスク・権限管理・最終移行すべての
土台。実装前に必ず内容を再確認すること。子どものプロフィール自体には個別のFirebase認証を
持たせない（実認証を持つのは親のみ。子はこれまでどおりプロフィール選択＋PIN/WebAuthn）。

## Phase 5 — ネイティブ認証：Sign in with Apple＋保護者ゲート
**目的**：Capacitor（Phase 3）とアカウントモデル（Phase 4）をつなぐ実ログインの実装。

- `@capacitor-community/apple-sign-in`（WebView内ではFirebase JS SDKのポップアップ式Appleログインが
  機能しないため、ネイティブトークンを`firebase.auth.OAuthProvider('apple.com')`に渡す）。
- メール/パスワードのサインインUIをAndroid/フォールバック用に配線。
- 保護者ゲート：新規実装せず、既存の`mu_admin_pin`/WebAuthnパターン（`index.html`の
  `muRequireAdmin()`周辺）を再利用。Phase 6の課金操作や外部リンクの手前に配置する。

**要判断**：ログイン手段は**Apple＋メール/パスワードのみを推奨**（Googleログインを追加すると
Appleガイドライン4.8によりSign in with Appleが必須になる制約自体は満たすが、Android側の対称性が
崩れメール/パスワードで十分。Googleは後からでも追加可能で、今は入れない）。

## Phase 6 — アプリ内課金・エンタイトルメント
**目的**：収益化。Phase 4完了を待たずサンドボックスで検証可能。

- `@revenuecat/purchases-capacitor`（StoreKit 2 / Play Billingのラップ＋クロスプラットフォームの
  レシート検証をRevenueCat側で処理。自前レシート検証を実装しなくてよい）。
- 新規Cloud Function `revenueCatWebhook`：RevenueCatからのWebhookを検証し、
  `accounts/{ownerUid}/entitlement: {tier, status, expiresAt}` をAdmin SDKで書き込む
  （これがクライアントより信頼できる、権限の正とする）。
- `entitlement`に応じた機能ゲート（例：子どもプロフィール数上限、Phase 2のTTSプロキシの
  呼び出し可否／クォータ）。
- 新規UI：ペイウォール、Phase 5の保護者ゲートの奥にあるサブスク管理画面。
- 手動：App Store Connect/Google Play Consoleでの商品設定、RevenueCatダッシュボード、
  サンドボックステスターアカウント。

**要判断（ビジネス判断・現時点では未決定）**：
- サブスクリプション vs 買い切り。このプロジェクトは非常に高頻度で機能追加が続いている
  （継続開発の原資としてはサブスクが有利。買い切りはUXがシンプルで失効の考慮が不要）。
  価格設計時にApple Small Business Program（手数料15%）の対象になりうる規模かも考慮。
- ElevenLabsの高品質音声を有料ティア限定にするか、無料のまま原価をアプリ価格に織り込むか。

## Phase 7 — 移行・切替・App Store申請
**目的**：既存の家族（実運用中）を「顧客第1号」として無停止で移行し、その後一般申請する。

- 移行関数 `migrateFamilyToAccount({familyCode, accountId})`：`families/{code}/*` を
  `accounts/{accountId}/*` へ**grow-onlyマージ**（`cloud-sync.js`の既存マージ関数をそのまま使う）。
  破壊的な移動ではなくコピー/マージなので、複数回実行しても安全＝旧パスは移行後もしばらく
  ロールバック用に生かしておける。
- `firestore.rules`：ここで初めて古い `families/{code}/**` の全開放ルールを縮小/読み取り専用化
  （＝`docs/SECURITY.md` #1 が実際に塞がれるのはこのタイミング）。
- ストア掲載素材（Phase 1のアイコンを起点にスクリーンショット・説明文・年齢区分）、
  プライバシーポリシーページ（GitHub Pagesに新規静的ページで可）、
  Appプライバシー"栄養成分表示"（Firebase Auth＋RevenueCatの収集データを正確に申告）。
  `PrivacyInfo.xcprivacy`のバンドル確認（Firebase/RevenueCatの最新SDKが同梱するものを確認）。
- Google Play Consoleの掲載（Data Safetyフォームが同等のチェック項目）。
- TestFlight外部ベータ→App Review提出→段階リリース。
- GitHub Pages版PWAの扱いを決める（`accounts/`バックエンドを指す無料版として残す or 終了）。
  このフェーズ内で急いで決める必要はない。

**要判断**：移行後のデータモデル最終確認（有償顧客に対して行う前の最後の変更機会）。
カテゴリ・年齢区分の最終決定（申請後の変更は追加審査を招くため事前に固定）。

---

## カテゴリ推奨：Kids Category ではなく Education

**結論：Apple「Education」カテゴリ＋標準の年齢区分（4+想定）で申請し、Kids Category
プログラムには入らない。** Google Playの「ファミリー向け」登録も同様に見送る。

**理由**：
1. アカウント作成自体が実ログインになる（Sign in with Apple/メール）。Kids Categoryは
   購入だけでなく**アカウント作成やデータ収集そのもの**にCOPPA由来の継続的な審査対応を要求する
   （アップデートのたびに要件を満たし続ける必要があり、個人開発には重い）。
2. Kids Categoryは購入機会を「保護者ゲートの奥の指定エリア」に限定し、サブスク中心のアプリは
   審査で問題になりやすい。通常のEducationカテゴリにはこの形式的制約が無い
   （保護者ゲート自体はPhase 5でどのみち作るので、良い実践として維持する）。
3. 構造的にこのアプリの購入者は**大人の保護者**（一度ログインし、その下で複数の子プロフィールを
   管理する）＝「子どもが単独でダウンロードして遊ぶ」Kids Category的な形ではなく、
   家庭学習ツールの形。IXL・Prodigy・Epic!等の類似アプリもEducationカテゴリで配信している。
4. **後戻りのしやすさ**でもEducation始動が有利。あとから簡易版のCOPPA準拠・課金無しの
   「キッズモード」を追加するのは現実的だが、逆（Kids Categoryで始めて後からサブスクを
   足す）は審査上の負担が大きい。

「サードパーティ分析・広告を使わない」という現状の性質はカテゴリに関わらず維持する価値がある
（Appプライバシー表示がシンプルになる）。RevenueCat・Firebase自体の収集データは正確に申告する。

## 要判断まとめ（実装前に確定させるべきもの）

1. **Phase 4** — `accounts/{ownerUid}` + `authorizedUsers` + `userAccountIndex` + 招待の
   最終データモデル形（最重要・最後戻り困難）。
2. **Phase 2/6** — サーバー処理の置き場所。**Cloudflare Workers採用済み・確定**
   （Firebase Blazeプランの従量課金リスクを構造的に避けるため。2026-07-15決定）。
3. **Phase 5** — 起動時のログイン手段（推奨：Apple＋メール/パスワードのみ、Googleは後回し）。
4. **Phase 6** — サブスク vs 買い切り、TTS高品質音声を課金ゲートにするか（ビジネス判断・未決）。
5. **Phase 7** — ストアのカテゴリ・年齢区分（推奨：Education、Kids Categoryは見送り）。
