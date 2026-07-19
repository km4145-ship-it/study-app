# 夜の再訪ナッジ（LINE）を有効にする手順

`scripts/line-nudge.js` を毎晩1回だけ実行して、LINE に前向きな「今日の学習まだ？」を送る設定です。
**このファイルの手順を実行するまで、ナッジは動きません**（自動導入はしていません＝あなたの判断で有効化）。

> ⚠️ 送信は外部（LINE）への発信です。まず必ず **dry-run** で内容を確認してから `--send` を使ってください。

## 0. 前提
- アプリの「設定 → LINE通知」で使っている GAS の URL（`https://script.google.com/macros/s/XXXX/exec`）を用意。
- Node が入っていること（`node -v`）。

## 1. まず手元で確認（送信しない）
```sh
cd ~/Documents/GitHub/study-app
export LINE_ENDPOINT="https://script.google.com/macros/s/XXXX/exec"
node scripts/line-nudge.js          # dry-run：送る内容を表示するだけ
```

## 2. 実際に1通送ってテスト
```sh
node scripts/line-nudge.js --send   # LINE に1通届くはず
```

## 3. 毎晩20時に自動送信（launchd・任意）
`~/Library/LaunchAgents/com.studyapp.linenudge.plist` を作成：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.studyapp.linenudge</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>node</string>
    <string>/Users/USERNAME/Documents/GitHub/study-app/scripts/line-nudge.js</string>
    <string>--send</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>LINE_ENDPOINT</key><string>https://script.google.com/macros/s/XXXX/exec</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>20</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key><string>/tmp/linenudge.out.log</string>
  <key>StandardErrorPath</key><string>/tmp/linenudge.err.log</string>
</dict>
</plist>
```
`USERNAME` と `LINE_ENDPOINT` を自分のものに置き換えて：
```sh
launchctl load ~/Library/LaunchAgents/com.studyapp.linenudge.plist
```
- 止める：`launchctl unload ~/Library/LaunchAgents/com.studyapp.linenudge.plist`
- Mac がスリープだと発火しないので、`~/.local/bin/keepawake` などスリープ対策を併用。

## 注意・限界
- 個々の子が「今日やったか」は端末内(localStorage)にあり、この外部プロセスからは読めません。
  そのため文面は **家族向けの一般的なリマインド**です（個別化は将来の課題）。
- 既に朝のブリーフィングを launchd で回している場合は、そのジョブに1行足す形でもOK。
- 文面は `scripts/line-nudge.js` の `MESSAGES` 配列を編集して変えられます（日付で決定的に日替わり）。
