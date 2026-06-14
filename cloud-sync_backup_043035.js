/* ===== クラウド同期（任意・Firebase Firestore）=====
   READMEの手順でFirebaseプロジェクトを作り、下のconfigを自分の値に置き換えると有効になります。
   置き換えない限り、これまで通り「端末内保存」だけで動きます（同期オフ）。 */
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  appId: "PASTE_APP_ID"
};

(function () {
  var CFG = window.FIREBASE_CONFIG || {};
  if (!CFG.apiKey || CFG.apiKey.indexOf('PASTE') >= 0) { console.log('[sync] 未設定：端末内保存のみで動作'); return; }

  var SYNC_KEYS = ['study_log','daily_hist','daily_prog','topic_stats','mistake_notebook','recent_acc',
    'careless_log','areas_played','badges','reward_done','c_answered','c_correct','c_streak','c_beststreak',
    'c_seconds','c_points','study_seconds','daily_goal','reward','testdate'];
  var ARR_KEYS = { study_log:1, mistake_notebook:1, careless_log:1 };
  var MAX_COUNTER = { c_answered:1, c_correct:1, c_streak:1, c_beststreak:1, c_seconds:1, c_points:1, study_seconds:1 };

  var member = null, db = null, pullDone = false, saveTimer = null;
  function loadScript(src){ return new Promise(function(res,rej){ var s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  function snapshot(){ var o={}; SYNC_KEYS.forEach(function(k){ var v=localStorage.getItem(k); if(v!==null) o[k]=v; }); return o; }
  function mergeArr(a,b){ try{ var x=JSON.parse(a||'[]'), y=JSON.parse(b||'[]'), seen={}, out=[];
    x.concat(y).forEach(function(e){ var key=(e&&e.ts)?('t'+e.ts):JSON.stringify(e); if(!seen[key]){ seen[key]=1; out.push(e);} });
    out.sort(function(p,q){ return (p.ts||0)-(q.ts||0); }); return JSON.stringify(out.slice(-500)); }catch(e){ return b||a; } }
  function applyCloud(data){ if(!data) return false; var changed=false;
    SYNC_KEYS.forEach(function(k){ if(data[k]===undefined) return; var cur=localStorage.getItem(k), nv;
      if(ARR_KEYS[k]) nv=mergeArr(cur, data[k]);
      else if(MAX_COUNTER[k]) nv=String(Math.max(parseInt(cur||'0',10), parseInt(data[k]||'0',10)));
      else nv=(cur===null)?data[k]:cur;
      if(nv!==cur){ rawSet(k,nv); changed=true; } });
    return changed; }
  var rawSet = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(k,v){ rawSet(k,v); if(pullDone && SYNC_KEYS.indexOf(k)>=0) scheduleSave(); };
  function scheduleSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(doSave, 1500); }
  function doSave(){ if(!member||!db) return; db.collection('progress').doc(member)
      .set({ data:snapshot(), updated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true}).catch(function(){}); }
  function pull(){ return db.collection('progress').doc(member).get().then(function(d){
      var changed = d.exists ? applyCloud(d.data().data||{}) : false; pullDone=true;
      if(changed && !sessionStorage.getItem('sync_reloaded')){ sessionStorage.setItem('sync_reloaded','1'); location.reload(); }
      else { doSave(); } }); }
  function start(){ firebase.auth().signInAnonymously().then(function(){ db=firebase.firestore();
      try{ db.enablePersistence({synchronizeTabs:true}).catch(function(){}); }catch(e){} pull(); })
      .catch(function(e){ console.warn('[sync] ログイン失敗', e); }); }
  window.cloudSyncSwitch = function(){ var n=prompt('家族メンバーの名前（例：chisaki）'); if(!n) return;
      var p=prompt('あなたのPIN（本人確認用・4桁など）'); if(!p) return;
      member=(n.trim().toLowerCase()+'_'+p.trim()); rawSet('sync_member', member); start(); };
  window.cloudSyncReset = function(){ localStorage.removeItem('sync_member'); sessionStorage.removeItem('sync_reloaded'); location.reload(); };

  Promise.all([
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js')
  ]).then(function(){ firebase.initializeApp(CFG); member=localStorage.getItem('sync_member'); if(member) start(); })
    .catch(function(e){ console.warn('[sync] SDK読み込み失敗', e); });
})();
