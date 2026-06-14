/* ===== クラウド同期（Firebase Firestore・マルチユーザー対応）=====
   家族で1つの「家族コード」を共有すると、全端末で各ユーザーの学習データが同期されます。
   設定（⚙️）→「☁️ クラウド同期（家族コード）」から設定してください。 */
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
  var SHARED = ['mu_users','mu_admin_pin','theme','fontsize','voice_hana','voice_loco','voice_kai','el_api_key','testdate','reward'];
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
  var db=null, fam=null, pullDone=false, saveT=null;
  function famCode(){ return (rget('mu_family')||'').trim(); }
  function docRef(){ return db.collection('families').doc(fam); }
  function doSave(){ if(!db||!fam) return; docRef().set({ data:snapshot(), updated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true}).catch(function(){}); }
  function scheduleSave(){ if(!pullDone) return; clearTimeout(saveT); saveT=setTimeout(doSave,1500); }
  function pull(){ return docRef().get().then(function(d){
      var changed = d.exists ? applyCloud((d.data()||{}).data||{}) : false; pullDone=true;
      if(changed && !sessionStorage.getItem('mu_synced')){ sessionStorage.setItem('mu_synced','1'); location.reload(); }
      else { doSave(); }
    }).catch(function(e){ pullDone=true; });
  }
  var _set = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(k,v){ _set(k,v); if(pullDone && isSyncKey(k)) scheduleSave(); };
  window.addEventListener('visibilitychange', function(){ if(document.visibilityState==='hidden') doSave(); });
  function start(){
    if(!famCode()){ return; }
    fam = famCode();
    firebase.auth().signInAnonymously().then(function(){
      db = firebase.firestore();
      try{ db.enablePersistence({synchronizeTabs:true}).catch(function(){}); }catch(e){}
      pull();
    }).catch(function(e){});
  }
  window.cloudFamilySet = function(){
    var c = prompt('家族の合言葉コードを決めてください（全端末で同じものを使います。英数字4文字以上）。', famCode());
    if(c===null) return; c=(''+c).trim(); if(c.length<4){ alert('短すぎます。4文字以上にしてください。'); return; }
    rset('mu_family', c); try{ sessionStorage.removeItem('mu_synced'); }catch(e){}
    alert('家族コードを設定しました。クラウド同期を開始します。'); location.reload();
  };
  window.cloudFamilyClear = function(){ rset('mu_family',''); alert('クラウド同期をオフにしました（この端末は端末内保存のみ）。'); };
  Promise.all([
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js')
  ]).then(function(){ firebase.initializeApp(CFG); start(); }).catch(function(e){});
})();
