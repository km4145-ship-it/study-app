/* ===== クラウド同期（Firebase Firestore × Googleログイン）=====
   Googleでログインすると、その人のアカウント専用の保管庫(users/<uid>)に
   学習データが安全に保存され、全端末で自動同期されます（端末ごとに最初の1回だけログイン）。
   他端末の変更は onSnapshot で自動受信。使用中は即リロードせず、前面に戻った時に反映します。
   ※Firebaseコンソールで「Googleサインイン有効化＋承認済みドメイン追加＋
     Firestoreルール(users/<uid>は本人のみ)」の設定が必要です。 */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBJetxpDy9MBqIbKyBshm8UznwoEHKh_Qg",
  authDomain: "study-app-48c8f.firebaseapp.com",
  projectId: "study-app-48c8f",
  storageBucket: "study-app-48c8f.firebasestorage.app",
  messagingSenderId: "90309576990",
  appId: "1:90309576990:web:d73fb98cd7110a5f9d210f"
};
(function () {
  var CFG = window.FIREBASE_CONFIG || {};
  if (!CFG.apiKey || CFG.apiKey.indexOf('PASTE') >= 0) { return; }
  function rget(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function rset(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function loadScript(src){ return new Promise(function(res,rej){ var s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  var SHARED = ['mu_users','mu_admin_pin','theme','fontsize','voice_hana','voice_loco','voice_kai','voice_owl','voice_shiba','voice_cat','voice_rabbit','voice_fox','voice_bear','voice_tiger','voice_panda','voice_dolphin','voice_penguin','el_api_key','testdate','reward'];
  function isSyncKey(k){ if(!k) return false; if(k.indexOf('u:')===0) return true; return SHARED.indexOf(k)>=0; }
  function isArr(k){ return /:(study_log|mistake_notebook|careless_log)$/.test(k); }
  function isCounter(k){ return /:(c_correct|c_streak|c_points|c_beststreak|c_answered|c_seconds|study_seconds)$/.test(k); }
  function snapshot(){ var o={}; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(isSyncKey(k)){ o[k]=localStorage.getItem(k); } } return o; }
  function mergeArr(a,b){ try{ var x=JSON.parse(a||'[]'),y=JSON.parse(b||'[]'),seen={},out=[]; x.concat(y).forEach(function(e){ var key=(e&&e.ts)?('t'+e.ts):JSON.stringify(e); if(!seen[key]){seen[key]=1;out.push(e);} }); out.sort(function(p,q){return (p.ts||0)-(q.ts||0);}); return JSON.stringify(out.slice(-500)); }catch(e){ return b||a; } }
  function mergeUsers(a,b){ try{ var x=JSON.parse(a||'[]'),y=JSON.parse(b||'[]'),byId={},order=[]; x.concat(y).forEach(function(u){ if(u&&u.id){ if(!byId[u.id])order.push(u.id); byId[u.id]=u; } }); return JSON.stringify(order.map(function(id){return byId[id];}).slice(0,5)); }catch(e){ return b||a; } }
  function applyCloud(data){ if(!data) return false; var changed=false;
    Object.keys(data).forEach(function(k){ var cur=rget(k), nv;
      if(k==='mu_users') nv=mergeUsers(cur,data[k]);
      else if(isArr(k)) nv=mergeArr(cur,data[k]);
      else if(isCounter(k)) nv=String(Math.max(parseInt(cur||'0',10),parseInt(data[k]||'0',10)));
      else nv=data[k];
      if(nv!==cur && nv!==undefined && nv!==null){ rset(k,nv); changed=true; }
    });
    return changed;
  }
  var db=null, uid=null, pullDone=false, saveT=null, firstSync=false, pendingReload=false, unsub=null;
  function docRef(){ return db.collection('users').doc(uid); }
  function doSave(){ if(!db||!uid) return; docRef().set({ data:snapshot(), updated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true}).catch(function(){}); }
  function scheduleSave(){ if(!pullDone) return; clearTimeout(saveT); saveT=setTimeout(doSave,1500); }
  function showSyncToast(){
    try{
      if(document.getElementById('cs-sync-toast')) return;
      var t=document.createElement('div'); t.id='cs-sync-toast';
      t.textContent='🔄 新しい記録が届きました（タップで更新）';
      t.setAttribute('style','position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;background:#0891b2;color:#fff;padding:10px 16px;border-radius:999px;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.25);cursor:pointer;max-width:90%;text-align:center;');
      t.addEventListener('click',function(){ pendingReload=false; location.reload(); });
      document.body.appendChild(t);
      setTimeout(function(){ if(t&&t.parentNode){ t.style.transition='opacity .4s'; t.style.opacity='0'; setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); },500); } },8000);
    }catch(e){}
  }
  function reflect(changed){
    if(!changed) return;
    if(document.visibilityState!=='visible'){ pendingReload=true; return; }
    if(!sessionStorage.getItem('mu_synced')){ sessionStorage.setItem('mu_synced','1'); location.reload(); return; }
    pendingReload=true; showSyncToast();
  }
  function listen(){
    try{
      unsub = docRef().onSnapshot({ includeMetadataChanges:false }, function(d){
        if(d.metadata && d.metadata.hasPendingWrites){ return; }
        var changed = d.exists ? applyCloud(((d.data()||{}).data)||{}) : false;
        pullDone = true;
        if(!firstSync){ firstSync=true; doSave(); }
        reflect(changed);
      }, function(e){ pullDone=true; });
    }catch(e){ pullDone=true; }
  }
  var _set = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(k,v){ _set(k,v); if(pullDone && isSyncKey(k)) scheduleSave(); };
  window.addEventListener('visibilitychange', function(){
    if(document.visibilityState==='hidden'){ doSave(); }
    else if(pendingReload){ pendingReload=false; location.reload(); }
  });
  function startForUser(u){
    uid = u.uid; db = firebase.firestore();
    try{ db.enablePersistence({synchronizeTabs:true}).catch(function(){}); }catch(e){}
    pullDone=false; firstSync=false;
    listen();
  }
  function stopSync(){ if(unsub){ try{ unsub(); }catch(e){} unsub=null; } uid=null; pullDone=false; firstSync=false; }
  window.googleLogin = function(){
    try{
      var prov = new firebase.auth.GoogleAuthProvider();
      try{ prov.setCustomParameters({ prompt:'select_account' }); }catch(e){}
      if(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)){ firebase.auth().signInWithRedirect(prov); }
      else { firebase.auth().signInWithPopup(prov).catch(function(e){ try{ alert('ログインに失敗しました：'+(e&&e.message||'')); }catch(_){} }); }
    }catch(e){ try{ alert('ログインを開始できませんでした。'); }catch(_){} }
  };
  window.googleLogout = function(){ try{ stopSync(); }catch(e){} try{ sessionStorage.removeItem('mu_synced'); }catch(e){} try{ firebase.auth().signOut(); }catch(e){} };
  window.cloudAuthUser = function(){ try{ var u=firebase.auth().currentUser; return (u && !u.isAnonymous) ? (u.email||u.displayName||'ログイン中') : null; }catch(e){ return null; } };
  function start(){
    try{ firebase.auth().getRedirectResult().catch(function(){}); }catch(e){}
    firebase.auth().onAuthStateChanged(function(u){
      if(u && !u.isAnonymous){ startForUser(u); }
      else { stopSync(); }
      try{ if(typeof window.cloudOnAuth==='function') window.cloudOnAuth(!!(u && !u.isAnonymous), (u&&(u.email||u.displayName))||''); }catch(e){}
    });
  }
  Promise.all([
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js')
  ]).then(function(){ firebase.initializeApp(CFG); start(); }).catch(function(e){});
})();
