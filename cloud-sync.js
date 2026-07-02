/* ===== クラウド同期（Firebase Firestore・マルチユーザー対応／リアルタイム）=====
   家族で1つの「家族コード」を共有すると、全端末で各ユーザーの学習データが同期されます。
   設定（⚙️）→「☁️ クラウド同期（家族コード）」から設定してください。
   ※他端末の変更を onSnapshot で自動受信。使用の邪魔をしないよう、
     画面が前面で操作中のときは即リロードせず、戻ってきた／前面から外れた時に反映します。 */
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
  var SHARED = ['mu_users','mu_admin_pin','theme','fontsize','voice_hana','voice_loco','voice_kai','voice_owl','voice_shiba','voice_cat','voice_rabbit','voice_fox','voice_bear','voice_tiger','voice_panda','voice_dolphin','voice_penguin','el_api_key','testdate','reward','line_endpoint','extra_questions'];
  function isSyncKey(k){ if(!k) return false; if(/:q_log$/.test(k)) return false; if(k.indexOf('u:')===0) return true; return SHARED.indexOf(k)>=0; }
  function isArr(k){ return /:(study_log|mistake_notebook|real_exams|paper_sheets)$/.test(k) || k==='extra_questions'; }
  function isCounter(k){ return /:(c_correct|c_streak|c_points|c_beststreak|c_answered|c_seconds)$/.test(k); }
  // 日付やキーごとの数値オブジェクト：キーごとに大きい方を採用（端末間で打ち消し合わないように）
  function isObjMax(k){ return /:(daily_hist|study_seconds|week_srs|careless_log)$/.test(k); }
  function isTopic(k){ return /:topic_stats$/.test(k); }
  function isUnionObj(k){ return /:(quest_done|badges)$/.test(k); }
  function keyOfEntry(e){ if(e&&e.q) return 'q'+e.q; if(e&&e.id) return 'i'+e.id; if(e&&e.ts) return 't'+e.ts; return JSON.stringify(e); }
  function snapshot(){ var o={}; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(isSyncKey(k)){ o[k]=localStorage.getItem(k); } } return o; }
  function mergeArr(a,b){ try{ var x=JSON.parse(a||'[]'),y=JSON.parse(b||'[]'),map={},order=[];
    x.concat(y).forEach(function(e){ var key=keyOfEntry(e); if(map[key]===undefined){ map[key]=e; order.push(key); }
      else if(((e&&e.ts)||0)>((map[key]&&map[key].ts)||0)){ map[key]=e; } });
    var out=order.map(function(key){ return map[key]; });
    out.sort(function(p,q){ return ((p&&(p.ts||p.id))||0)-((q&&(q.ts||q.id))||0); });
    return JSON.stringify(out.slice(-1500)); }catch(e){ return b||a; } }
  function mergeObjMax(a,b){ try{ var x=JSON.parse(a||'{}'),y=JSON.parse(b||'{}'),o={};
    Object.keys(x).concat(Object.keys(y)).forEach(function(key){ o[key]=Math.max(parseInt(x[key]||0,10)||0, parseInt(y[key]||0,10)||0); });
    return JSON.stringify(o); }catch(e){ return b||a; } }
  function mergeTopic(a,b){ try{ var x=JSON.parse(a||'{}'),y=JSON.parse(b||'{}'),o={};
    Object.keys(x).concat(Object.keys(y)).forEach(function(key){ var p=x[key],q=y[key];
      if(!p){ o[key]=q; return; } if(!q){ o[key]=p; return; }
      o[key]={ area:p.area||q.area, sub:p.sub||q.sub, attempts:Math.max(p.attempts||0,q.attempts||0), correct:Math.max(p.correct||0,q.correct||0) }; });
    return JSON.stringify(o); }catch(e){ return b||a; } }
  function mergeUnionObj(a,b){ try{ var x=JSON.parse(a||'{}'),y=JSON.parse(b||'{}'),o={};
    Object.keys(x).concat(Object.keys(y)).forEach(function(key){ var p=x[key],q=y[key];
      if(p&&q&&typeof p==='object'&&typeof q==='object'){ var m={}; Object.keys(p).concat(Object.keys(q)).forEach(function(kk){ m[kk]=p[kk]||q[kk]; }); o[key]=m; }
      else o[key]=(p!==undefined?p:q); });
    return JSON.stringify(o); }catch(e){ return b||a; } }
  function mergeDailyProg(a,b){ try{ var x=JSON.parse(a||'null'),y=JSON.parse(b||'null');
    if(!x) return b; if(!y) return a;
    if(x.date===y.date) return JSON.stringify({ date:x.date, count:Math.max(x.count||0,y.count||0), celebrated:!!(x.celebrated||y.celebrated) });
    return x.date>y.date? a : b; }catch(e){ return b||a; } }
  function mergeUsers(a,b){ try{ var x=JSON.parse(a||'[]'),y=JSON.parse(b||'[]'),byId={},order=[]; x.concat(y).forEach(function(u){ if(u&&u.id){ if(!byId[u.id])order.push(u.id); byId[u.id]=u; } }); return JSON.stringify(order.map(function(id){return byId[id];}).slice(0,5)); }catch(e){ return b||a; } }
  function applyCloud(data){ if(!data) return false; var changed=false;
    Object.keys(data).forEach(function(k){ var cur=rget(k), nv;
      if(k==='mu_users') nv=mergeUsers(cur,data[k]);
      else if(isArr(k)) nv=mergeArr(cur,data[k]);
      else if(isCounter(k)) nv=String(Math.max(parseInt(cur||'0',10),parseInt(data[k]||'0',10)));
      else if(isObjMax(k)) nv=mergeObjMax(cur,data[k]);
      else if(isTopic(k)) nv=mergeTopic(cur,data[k]);
      else if(isUnionObj(k)) nv=mergeUnionObj(cur,data[k]);
      else if(/:daily_prog$/.test(k)) nv=mergeDailyProg(cur,data[k]);
      else nv=data[k];
      if(nv!==cur && nv!==undefined && nv!==null){ rset(k,nv); changed=true; }
    });
    return changed;
  }
  var db=null, fam=null, pullDone=false, saveT=null, firstSync=false, pendingReload=false, unsub=null;
  var DEFAULT_FAMILY='0000'; // システム基本設定：既定で必ずクラウドDBから読み込む（端末ごとの設定不要）
  function famCode(){ var c=(rget('mu_family')||'').trim(); return c || DEFAULT_FAMILY; }
  function docRef(){ return db.collection('families').doc(fam); }
  function doSave(){ if(!db||!fam) return; docRef().set({ data:snapshot(), updated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true}).catch(function(){}); }
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
  function start(){
    if(!famCode()){ return; }
    fam = famCode();
    firebase.auth().signInAnonymously().then(function(){
      db = firebase.firestore();
      try{ db.enablePersistence({synchronizeTabs:true}).catch(function(){}); }catch(e){}
      listen();
    }).catch(function(e){});
  }
  window.cloudFamilySet = function(){
    var c = prompt('家族の合言葉コードを決めてください（全端末で同じものを使います。英数字4文字以上）。', famCode());
    if(c===null) return; c=(''+c).trim(); if(c.length<4){ alert('短すぎます。4文字以上にしてください。'); return; }
    rset('mu_family', c); try{ sessionStorage.removeItem('mu_synced'); }catch(e){}
    alert('家族コードを設定しました。クラウド同期を開始します。'); location.reload();
  };
  window.cloudFamilyClear = function(){ rset('mu_family',''); if(unsub){ try{ unsub(); }catch(e){} } alert('クラウド同期をオフにしました（この端末は端末内保存のみ）。'); };
  Promise.all([
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js')
  ]).then(function(){ firebase.initializeApp(CFG); start(); }).catch(function(e){});
})();
