/* =====================================================================
   学習アカデミー → LINE通知（Google Apps Script）
   ---------------------------------------------------------------------
   これは Google Apps Script（GAS）に貼り付けるコードです。
   アプリ（index.html）から学習イベントを受け取り、保護者のLINEに
   「即時通知」「毎晩のまとめ」「未学習リマインド」を送ります。

   ※LINE Notifyは2025年3月に終了したため、LINE公式アカウント（Messaging API）
     のプッシュ送信を使います。設定手順は「LINE通知の設定手順.md」を見てください。

   必要なスクリプトプロパティ（プロジェクトの設定 → スクリプト プロパティ）:
   - CHANNEL_ACCESS_TOKEN : Messaging APIのチャネルアクセストークン（長期）
   - TO_ID                : 送信先のuserId（保護者）またはgroupId
   ===================================================================== */

var TZ = 'Asia/Tokyo';

/* ---- アプリからのイベント受信（Webアプリとしてデプロイ） ---- */
function doPost(e) {
  try {
    var ev = JSON.parse(e.postData.contents);
    saveEvent_(ev);
    // 即時通知するイベント
    if (ev.type === 'test') {
      push_('✅ 学習アカデミーとの接続テストに成功しました！');
    } else if (ev.type === 'exam') {
      var msg = '📝 模擬試験の結果\n' + (ev.area || '') + '：' + ev.score + '/' + ev.total + '問正解';
      if (ev.hensachi) msg += '\n偏差値 ' + ev.hensachi + '（' + (ev.judge || '-') + '判定）';
      msg += '\n🔥 連続学習 ' + (ev.streak || 0) + '日';
      push_(msg);
    } else if (ev.type === 'goal') {
      push_('🎯 今日の目標（' + ev.goal + '問）を達成しました！\n🔥 連続学習 ' + (ev.streak || 0) + '日');
    }
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  }
}

/* ---- 初回に1度だけ実行：トリガー（毎晩のまとめ・リマインド）を作成 ---- */
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyDigest').timeBased().atHour(21).everyDays(1).inTimezone(TZ).create();
  ScriptApp.newTrigger('remindIfIdle').timeBased().atHour(19).everyDays(1).inTimezone(TZ).create();
  push_('✅ 学習アカデミーのLINE通知の準備ができました！\n・毎晩21時：今日のまとめ\n・19時：まだ学習していない日はリマインド');
}

/* ---- 毎晩21時：今日のまとめ ---- */
function dailyDigest() {
  var evs = loadEvents_(todayKey_());
  if (!evs.length) { push_('📚 今日はまだ学習記録がありません。明日は一緒にがんばろう！'); return; }
  var q = 0, c = 0, exams = [], streak = 0, goal = false;
  evs.forEach(function (ev) {
    if (ev.type === 'session' || ev.type === 'exam') { q += (ev.total || 0); c += (ev.score || 0); }
    if (ev.type === 'exam' && ev.hensachi) exams.push((ev.area || '') + ' 偏差値' + ev.hensachi + '（' + (ev.judge || '-') + '）');
    if (ev.streak) streak = Math.max(streak, ev.streak);
    if (ev.type === 'goal') goal = true;
  });
  var rate = q ? Math.round(c / q * 100) : 0;
  var msg = '📚 今日の学習まとめ\n・解いた問題：' + q + '問（正答率 ' + rate + '%）';
  if (goal) msg += '\n・🎯 今日の目標 達成！';
  if (exams.length) msg += '\n・📝 模試：' + exams.join('、');
  msg += '\n・🔥 連続学習 ' + streak + '日';
  push_(msg);
}

/* ---- 19時：今日まだ学習していなければリマインド ---- */
function remindIfIdle() {
  var evs = loadEvents_(todayKey_());
  if (evs.length) return;
  push_('⏰ 今日はまだ学習アカデミーの記録がありません。\n寝る前に10問だけでもやってみよう！');
}

/* ================= 内部関数 ================= */
function todayKey_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

function saveEvent_(ev) {
  var props = PropertiesService.getScriptProperties();
  var key = 'EV_' + todayKey_();
  var arr = [];
  try { arr = JSON.parse(props.getProperty(key) || '[]'); } catch (e) {}
  ev.at = Utilities.formatDate(new Date(), TZ, 'HH:mm');
  arr.push(ev);
  props.setProperty(key, JSON.stringify(arr.slice(-200)));
  // 3日より古いイベントは削除
  var all = props.getProperties();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('EV_') === 0 && k < 'EV_' + Utilities.formatDate(new Date(Date.now() - 3 * 86400000), TZ, 'yyyy-MM-dd')) {
      props.deleteProperty(k);
    }
  });
}

function loadEvents_(dateKey) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('EV_' + dateKey) || '[]'); } catch (e) { return []; }
}

function push_(text) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('CHANNEL_ACCESS_TOKEN');
  var to = props.getProperty('TO_ID');
  if (!token || !to) { Logger.log('CHANNEL_ACCESS_TOKEN / TO_ID が未設定です'); return; }
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ to: to, messages: [{ type: 'text', text: text }] }),
    muteHttpExceptions: true
  });
}

/* ---- 送信先のuserIdを調べたいとき：BotにメッセージするとuserIdをログに出す ----
   （WebhookのURLをこのWebアプリに向けた場合のみ使用。通常は不要） */
