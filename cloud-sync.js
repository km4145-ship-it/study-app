/* ===== クラウド同期（任意・Firebase Firestore）=====
   READMEの手順でFirebaseプロジェクトを作り、下のconfigを自分の値に置き換えると有効になります。
   置き換えない限り、これまで通り「端末内保存」だけで動きます（同期オフ）。

   v2：マージ方式を改善。
   - 以前は配列・カウンタ以外「ローカル優先」だったため、苦手分析（topic_stats）などが
     端末間で永久に同期されなかった。キーの種類ごとに正しい統合方法を持たせた。 */
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  appId: "PASTE_APP_ID"
};

(function () {
  var CFG = window.FIREBASE_CONFIG || {};
  if (!CFG.apiKey || CFG.apiKey.indexOf('PASTE') >= 0) { console.log('[sync] 未設定：端末内保存のみで動作'); return; }

  function J(v, d) { try { return (v === null || v === undefined) ? d : JSON.parse(v); } catch (e) { return d; } }

  // 配列：キーで重複を除いて統合（capで件数制限）
  var ARR_KEYS = {
    study_log:        { cap: 1500, keyOf: function (e) { return e && e.ts ? ('t' + e.ts) : JSON.stringify(e); } },
    mistake_notebook: { cap: 400,  keyOf: function (e) { return e && e.q ? ('q' + e.q) : JSON.stringify(e); },
                        newer: function (a, b) { return ((b && b.ts) || 0) > ((a && a.ts) || 0) ? b : a; } },
    real_exams:       { cap: 200,  keyOf: function (e) { return e ? (e.area + '|' + e.date + '|' + e.hensachi) : ''; } },
    paper_sheets:     { cap: 20,   keyOf: function (e) { return e && e.id ? ('i' + e.id) : JSON.stringify(e); } },
    extra_questions:  { cap: 2000, keyOf: function (e) { return e && e.q ? ('q' + e.q) : JSON.stringify(e); } }
  };
  // 日付やキーごとの数値オブジェクト：キーごとに大きい方を採用
  var OBJMAX_KEYS = { daily_hist: 1, study_seconds: 1, week_srs: 1, careless_log: 1 };
  // 単元別の成績統計：attempts / correct をキーごとに大きい方で統合
  var TOPIC_KEYS = { topic_stats: 1 };
  // 達成フラグ類：和集合
  var UNION_OBJ_KEYS = { quest_done: 1, badges: 1 };
  var UNION_ARR_KEYS = { areas_played: 1 };
  // 累積カウンタ：大きい方
  var MAX_COUNTER = { c_answered: 1, c_correct: 1, c_streak: 1, c_beststreak: 1, c_seconds: 1, c_points: 1 };
  // 単純な設定値：sync_meta のタイムスタンプで新しい方（LWW）
  var LWW_KEYS = { daily_goal: 1, reward: 1, reward_done: 1, testdate: 1, line_endpoint: 1, exam_range: 1 };

  var SYNC_KEYS = Object.keys(ARR_KEYS)
    .concat(Object.keys(OBJMAX_KEYS), Object.keys(TOPIC_KEYS), Object.keys(UNION_OBJ_KEYS),
            Object.keys(UNION_ARR_KEYS), Object.keys(MAX_COUNTER), Object.keys(LWW_KEYS),
            ['recent_acc', 'daily_prog', 'sync_meta']);

  var member = null, db = null, pullDone = false, saveTimer = null;
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function snapshot() { var o = {}; SYNC_KEYS.forEach(function (k) { var v = localStorage.getItem(k); if (v !== null) o[k] = v; }); return o; }

  function mergeValue(k, cur, cloud) {
    if (cur === null || cur === undefined) return cloud;
    if (cloud === null || cloud === undefined) return cur;
    if (ARR_KEYS[k]) {
      var cfg = ARR_KEYS[k];
      var map = {}, order = [];
      J(cur, []).concat(J(cloud, [])).forEach(function (e) {
        var key = cfg.keyOf(e);
        if (map[key] === undefined) { map[key] = e; order.push(key); }
        else if (cfg.newer) { map[key] = cfg.newer(map[key], e); }
      });
      var out = order.map(function (key) { return map[key]; });
      out.sort(function (p, q) { return ((p && (p.ts || p.id)) || 0) - ((q && (q.ts || q.id)) || 0); });
      return JSON.stringify(out.slice(-cfg.cap));
    }
    if (OBJMAX_KEYS[k]) {
      var a = J(cur, {}), b = J(cloud, {}), o = {};
      Object.keys(a).concat(Object.keys(b)).forEach(function (key) { o[key] = Math.max(parseInt(a[key] || 0, 10) || 0, parseInt(b[key] || 0, 10) || 0); });
      return JSON.stringify(o);
    }
    if (TOPIC_KEYS[k]) {
      var a2 = J(cur, {}), b2 = J(cloud, {}), o2 = {};
      Object.keys(a2).concat(Object.keys(b2)).forEach(function (key) {
        var p = a2[key], q = b2[key];
        if (!p) { o2[key] = q; return; }
        if (!q) { o2[key] = p; return; }
        o2[key] = { area: p.area || q.area, sub: p.sub || q.sub,
                    attempts: Math.max(p.attempts || 0, q.attempts || 0),
                    correct:  Math.max(p.correct  || 0, q.correct  || 0) };
      });
      return JSON.stringify(o2);
    }
    if (UNION_OBJ_KEYS[k]) {
      var a3 = J(cur, {}), b3 = J(cloud, {}), o3 = {};
      Object.keys(a3).concat(Object.keys(b3)).forEach(function (key) {
        var p = a3[key], q = b3[key];
        if (p && q && typeof p === 'object' && typeof q === 'object') { var m = {}; Object.keys(p).concat(Object.keys(q)).forEach(function (kk) { m[kk] = p[kk] || q[kk]; }); o3[key] = m; }
        else o3[key] = (p !== undefined ? p : q);
      });
      return JSON.stringify(o3);
    }
    if (UNION_ARR_KEYS[k]) {
      var s = {}, o4 = [];
      J(cur, []).concat(J(cloud, [])).forEach(function (v) { var key = JSON.stringify(v); if (!s[key]) { s[key] = 1; o4.push(v); } });
      return JSON.stringify(o4);
    }
    if (MAX_COUNTER[k]) return String(Math.max(parseInt(cur || '0', 10) || 0, parseInt(cloud || '0', 10) || 0));
    if (k === 'daily_prog') {
      var da = J(cur, null), db_ = J(cloud, null);
      if (!da) return cloud; if (!db_) return cur;
      if (da.date === db_.date) return JSON.stringify({ date: da.date, count: Math.max(da.count || 0, db_.count || 0), celebrated: !!(da.celebrated || db_.celebrated) });
      return da.date > db_.date ? cur : cloud;
    }
    return cur; // 既定（recent_acc など）はローカル優先
  }

  function applyCloud(data) {
    if (!data) return false; var changed = false;
    var localMeta = J(localStorage.getItem('sync_meta'), {});
    var cloudMeta = J(data.sync_meta, {});
    SYNC_KEYS.forEach(function (k) {
      if (k === 'sync_meta' || data[k] === undefined) return;
      var cur = localStorage.getItem(k), nv;
      if (LWW_KEYS[k]) {
        var lt = localMeta[k] || 0, ct = cloudMeta[k] || 0;
        nv = (cur === null || ct > lt) ? data[k] : cur;
      } else {
        nv = mergeValue(k, cur, data[k]);
      }
      if (nv !== undefined && nv !== null && nv !== cur) { rawSet(k, nv); changed = true; }
    });
    var mm = {};
    Object.keys(localMeta).concat(Object.keys(cloudMeta)).forEach(function (key) { mm[key] = Math.max(localMeta[key] || 0, cloudMeta[key] || 0); });
    rawSet('sync_meta', JSON.stringify(mm));
    return changed;
  }

  var rawSet = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    rawSet(k, v);
    if (LWW_KEYS[k]) { try { var m = J(localStorage.getItem('sync_meta'), {}); m[k] = Date.now(); rawSet('sync_meta', JSON.stringify(m)); } catch (e) {} }
    if (pullDone && SYNC_KEYS.indexOf(k) >= 0) scheduleSave();
  };
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(doSave, 1500); }
  function doSave() {
    if (!member || !db) return;
    db.collection('progress').doc(member)
      .set({ data: snapshot(), updated: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () {});
  }
  function pull() {
    return db.collection('progress').doc(member).get().then(function (d) {
      var changed = d.exists ? applyCloud(d.data().data || {}) : false; pullDone = true;
      if (changed && !sessionStorage.getItem('sync_reloaded')) { sessionStorage.setItem('sync_reloaded', '1'); location.reload(); }
      else { doSave(); }
    });
  }
  function start() {
    firebase.auth().signInAnonymously().then(function () {
      db = firebase.firestore();
      try { db.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}
      pull();
    }).catch(function (e) { console.warn('[sync] ログイン失敗', e); });
  }
  window.cloudSyncSwitch = function () {
    var n = prompt('家族メンバーの名前（例：chisaki）'); if (!n) return;
    var p = prompt('あなたのPIN（本人確認用・4桁など）'); if (!p) return;
    member = (n.trim().toLowerCase() + '_' + p.trim()); rawSet('sync_member', member); start();
  };
  window.cloudSyncReset = function () { localStorage.removeItem('sync_member'); sessionStorage.removeItem('sync_reloaded'); location.reload(); };

  Promise.all([
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js')
  ]).then(function () { firebase.initializeApp(CFG); member = localStorage.getItem('sync_member'); if (member) start(); })
    .catch(function (e) { console.warn('[sync] SDK読み込み失敗', e); });
})();
