# テスト（自動チェック）

`index.html` / `cloud-sync.js` の重要ロジックを、**依存パッケージ無し・Nodeだけ**で検証します。
push すると GitHub Actions（`.github/workflows/ci.yml`）が自動実行し、壊れていれば失敗を知らせます。

## 実行

```bash
npm test          # = node tests/run-all.js
node tests/int-heal.js heal   # 個別に実行も可
```

## 構成

- `lib/cloud-harness.js` … Firestore / localStorage / firebase をスタブして、実際の `cloud-sync.js` を Node 上で起動する共有ハーネス。
- `lib/assert.js` … 依存ゼロの軽量アサート（失敗で非ゼロ終了＝CIが検知）。
- `unit-*.js` … 実ファイルから対象関数を抽出して検証（同期マージ・ガチャ・コレクション・ステータス・構文）。
- `int-*.js` … 実 `cloud-sync.js` を起動する統合テスト（起動時復元・接続状態・選択画面の自己回復・上書き防止）。

## なぜこれが大事か

過去、名簿やポイントの消失が「人が気づくまで放置」されました。これらのテストは、その事故を **push の時点で自動的に止める** ための安全網です。**同期まわりを変更したら、必ずここにテストを足す**運用にします。
