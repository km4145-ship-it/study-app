/* ===== クラウド同期 v2（Firebase Firestore・ユーザー別ドキュメント／リアルタイム）=====
   保存構造：
     families/{家族コード}                  … 旧v1ドキュメント（初回に自動移行して以後は使わない）
     families/{家族コード}/shared/settings  … 家族共通の設定（ユーザー一覧・テスト日・ごほうび等）
     families/{家族コード}/members/{uid}    … ユーザーごとの学習データ（1人1ドキュメント）
   ポイント：
   ・ユーザーごとに分けたので、容量制限（1MB/doc）や端末同士の書き込み競合に強い。
   ・ユーザー選択画面で名前をタップすると cloudPullUser() が最新データを取得してから開始。
   ・オフラインでも動作（Firestoreのローカル永続化）。復帰時に自動送信。 */
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
  // 生のget/setを退避（クラウド反映時に保存フックを起こさないため）
  var _rawGetItem = localStorage.getItem.bind(localStorage);
  var _rawSetItem = localStorage.setItem.bind(localStorage);
  function rget(k){ try{ return _rawGetItem(k); }catch(e){ return null; } }
  function rset(k,v){ try{ _rawSetItem(k,v); }catch(e){} }
  function loadScript(src){ return new Promise(function(res,rej){ var s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }

  var SHARED = ['mu_users','mu_deleted','mu_admin_pin','theme','fontsize','voice_hana','voice_loco','voice_kai','voice_owl','voice_shiba','voice_cat','voice_rabbit','voice_fox','voice_bear','voice_tiger','voice_panda','voice_dolphin','voice_penguin','el_api_key','testdate','reward','line_endpoint','extra_questions','tts_voice','tts_rate','tts_pitch','el_voice_owners','sfx_on','vibe_on'];
  function isMemberKey(k){ return !!k && k.indexOf('u:')===0 && !/:q_log$/.test(k); }
  function uidOfKey(k){ var m=/^u:([^:]+):/.exec(k); return m? m[1] : null; }
  function fieldOfKey(k){ var m=/^u:[^:]+:(.+)$/.exec(k); return m? m[1] : null; }
  function isSharedKey(k){ return SHARED.indexOf(k)>=0; }
  function isSyncKey(k){ return isMemberKey(k) || isSharedKey(k); }

  // ---- マージ規則（v1と同じ・キー名のサフィックスで判定）----
  function isArr(k){ return /:(study_log|mistake_notebook|real_exams|paper_sheets)$/.test(k) || k==='extra_questions'; }
  function isCounter(k){ return /:(c_correct|c_streak|c_points|c_beststreak|c_answered|c_seconds)$/.test(k); }
  function isObjMax(k){ return /:(daily_hist|study_seconds|week_srs|careless_log)$/.test(k) || k==='mu_deleted'; }
  function isTopic(k){ return /:topic_stats$/.test(k); }
  function isUnionObj(k){ return /:(quest_done|badges)$/.test(k); }
  function keyOfEntry(e){ if(e&&e.q) return 'q'+e.q; if(e&&e.id) return 'i'+e.id; if(e&&e.ts) return 't'+e.ts; return JSON.stringify(e); }
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
  function mergeUsers(a,b){ try{ var x=JSON.parse(a||'[]'),y=JSON.parse(b||'[]'),byId={},order=[];
    x.concat(y).forEach(function(u){ if(!u||!u.id) return;
      if(!byId[u.id]){ order.push(u.id); byId[u.id]=u; return; }
      var old=byId[u.id], nu=Object.assign({}, old, u);
      // 生体認証の資格情報IDは端末ごとに増えるので合算（上書きで消さない）
      var creds={}; (old.bioCreds||[]).concat(u.bioCreds||[]).forEach(function(c){ if(c) creds[c]=1; });
      nu.bioCreds=Object.keys(creds);
      byId[u.id]=nu; });
    return JSON.stringify(order.map(function(id){return byId[id];}).slice(0,8)); }catch(e){ return b||a; } }
  function mergeRpg(a,b){ try{ var x=JSON.parse(a||'null'), y=JSON.parse(b||'null');
    if(!x) return b; if(!y) return a;
    var stam;
    var xs=x.stamina||{date:'',used:0}, ys=y.stamina||{date:'',used:0};
    if(xs.date===ys.date) stam={date:xs.date, used:Math.max(xs.used||0, ys.used||0)};
    else stam=(xs.date>ys.date)? xs : ys;   // 新しい日付の消費状況を採用
    var o={ v:1,
      xp: Math.max(x.xp||0, y.xp||0),
      level: Math.max(x.level||1, y.level||1),
      cleared: Object.assign({}, x.cleared||{}, y.cleared||{}),   // クリア実績は端末間で合算
      coll: Object.assign({}, x.coll||{}, y.coll||{}),
      crystals: Object.assign({}, x.crystals||{}, y.crystals||{}),// 集めたクリスタルも合算
      story: Object.assign({}, x.story||{}, y.story||{}),         // 見たストーリーも合算（再表示を防ぐ）
      dex: Object.assign({}, x.dex||{}, y.dex||{}),               // 図鑑（倒したモンスター）も合算
      stickers: Object.assign({}, x.stickers||{}, y.stickers||{}),// あつめたシールも合算
      pet: (function(){ var xp=x.pet||{}, yp=y.pet||{}; var w=Math.max(xp.wins||0,yp.wins||0);
        return { wins:w, stage:Math.max(xp.stage||0,yp.stage||0), name:(yp.name||xp.name||''), fed:((xp.fed||'')>(yp.fed||'')?xp.fed:yp.fed)||'' }; })(),
      stamina: stam };
    return JSON.stringify(o); }catch(e){ return b||a; } }
  function mergeKey(k,cur,inc){
    if(k==='mu_users') return mergeUsers(cur,inc);
    if(/:rpg_state$/.test(k)) return mergeRpg(cur,inc);
    if(isArr(k)) return mergeArr(cur,inc);
    if(isCounter(k)) return String(Math.max(parseInt(cur||'0',10)||0,parseInt(inc||'0',10)||0));
    if(isObjMax(k)) return mergeObjMax(cur,inc);
    if(isTopic(k)) return mergeTopic(cur,inc);
    if(isUnionObj(k)) return mergeUnionObj(cur,inc);
    if(/:daily_prog$/.test(k)) return mergeDailyProg(cur,inc);
    return inc;
  }
  // fullKeys: {ローカルのlocalStorageキー: 値} をマージしながら取り込む
  function applyKeys(map){ var changed=false, dirty={shared:false, members:{}};
    Object.keys(map||{}).forEach(function(k){
      if(!isSyncKey(k)) return;
      var cur=rget(k), nv=mergeKey(k,cur,map[k]);
      if(nv!==undefined && nv!==null && nv!==cur){ rset(k,nv); changed=true; }
      // マージ結果がクラウド値と違う（ローカル分が混ざった）なら送り返す
      if(nv!==undefined && nv!==null && nv!==map[k]){
        if(isSharedKey(k)) dirty.shared=true; else { var u=uidOfKey(k); if(u) dirty.members[u]=true; }
      }
    });
    if(dirty.shared) markShared();
    Object.keys(dirty.members).forEach(markMember);
    return changed;
  }

  // ---- スナップショット（送信用）----
  function sharedSnapshot(){ var o={}; SHARED.forEach(function(k){ var v=rget(k); if(v!==null) o[k]=v; }); return o; }
  function memberSnapshot(uid){ var o={}, pre='u:'+uid+':';
    for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i);
      if(k && k.indexOf(pre)===0 && isMemberKey(k)){ o[k.slice(pre.length)]=_rawGetItem(k); } }
    return o; }
  function memberToKeys(uid, fields){ var o={}; Object.keys(fields||{}).forEach(function(f){ o['u:'+uid+':'+f]=fields[f]; }); return o; }
  function localUids(){ var s={}, del={};
    try{ del=JSON.parse(rget('mu_deleted')||'{}'); }catch(e){}
    for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(isMemberKey(k)){ var u=uidOfKey(k); if(u) s[u]=1; } }
    try{ (JSON.parse(rget('mu_users')||'[]')).forEach(function(u){ if(u&&u.id) s[u.id]=1; }); }catch(e){}
    return Object.keys(s).filter(function(u){ return !del[u]; }); }

  // ---- Firestore ----
  var db=null, fam=null, ready=false, unsubShared=null, unsubMember=null, unsubReset=null, memberUid=null;
  var DEFAULT_FAMILY='0000'; // 既定で必ずクラウドDBに保存（端末ごとの設定不要）
  function famCode(){ var c=(rget('mu_family')||'').trim(); return c || DEFAULT_FAMILY; }
  function legacyRef(){ return db.collection('families').doc(fam); }
  function sharedRef(){ return legacyRef().collection('shared').doc('settings'); }
  function memberRef(uid){ return legacyRef().collection('members').doc(String(uid)); }

  var dirtyShared=false, dirtyMembers={}, saveT=null;
  function markShared(){ dirtyShared=true; scheduleSave(); }
  function markMember(uid){ dirtyMembers[uid]=true; scheduleSave(); }
  function scheduleSave(){ if(!ready) return; clearTimeout(saveT); saveT=setTimeout(doSaveDirty,1200); }
  function doSaveDirty(){ if(!db||!fam||!ready) return;
    if(dirtyShared){ dirtyShared=false;
      sharedRef().set({ data: sharedSnapshot(), updated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true}).catch(function(){ dirtyShared=true; }); }
    Object.keys(dirtyMembers).forEach(function(uid){ delete dirtyMembers[uid];
      memberRef(uid).set({ data: memberSnapshot(uid), updated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true}).catch(function(){ dirtyMembers[uid]=true; }); });
  }
  function doSaveAll(){ dirtyShared=true; localUids().forEach(function(u){ dirtyMembers[u]=1; }); doSaveDirty(); }

  // ---- 反映通知（学習中は勝手にリロードせずトーストで知らせる）----
  function showSyncToast(){
    try{
      if(document.getElementById('cs-sync-toast')) return;
      var t=document.createElement('div'); t.id='cs-sync-toast';
      t.textContent='🔄 新しい記録が届きました（タップで更新）';
      t.setAttribute('style','position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;background:#0891b2;color:#fff;padding:10px 16px;border-radius:999px;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.25);cursor:pointer;max-width:90%;text-align:center;');
      t.addEventListener('click',function(){ location.reload(); });
      document.body.appendChild(t);
      setTimeout(function(){ if(t&&t.parentNode){ t.style.transition='opacity .4s'; t.style.opacity='0'; setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); },500); } },8000);
    }catch(e){}
  }
  function reflect(changed){
    if(!changed) return;
    try{ if(window.muOnCloudUpdate) window.muOnCloudUpdate(); }catch(e){}
    var entered=false; try{ entered=!!sessionStorage.getItem('mu_enter'); }catch(e){}
    if(entered && document.visibilityState==='visible'){ showSyncToast(); }
  }

  // ---- リスナー ----
  function listenShared(){
    if(unsubShared){ try{ unsubShared(); }catch(e){} }
    unsubShared = sharedRef().onSnapshot(function(d){
      if(d.metadata && d.metadata.hasPendingWrites) return;
      var changed = d.exists ? applyKeys(((d.data()||{}).data)||{}) : false;
      reflect(changed);
    }, function(){});
  }
  function listenMember(uid){
    if(unsubMember){ try{ unsubMember(); }catch(e){} unsubMember=null; }
    memberUid = uid || null;
    if(!memberUid) return;
    unsubMember = memberRef(memberUid).onSnapshot(function(d){
      if(d.metadata && d.metadata.hasPendingWrites) return;
      var changed = d.exists ? applyKeys(memberToKeys(memberUid, ((d.data()||{}).data)||{})) : false;
      reflect(changed);
    }, function(){});
  }

  // ---- リセット伝播＋v1 → v2 移行（families/{fam} 親ドキュメントの確認）----
  function basicWipe(){ var kill=[];
    for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i);
      if(k && (k.indexOf('u:')===0 || isSharedKey(k) || k==='mu_current')) kill.push(k); }
    kill.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
    return kill.length; }
  function checkLegacy(){
    return legacyRef().get().then(function(d){
      var raw = d.exists ? (d.data()||{}) : {};
      // 他の端末で「完全リセット」が実行されていたら、この端末のデータも初期化する
      var cloudReset = parseInt(raw.resetAt||0,10)||0;
      var localReset = parseInt(rget('mu_reset_at')||'0',10)||0;
      if(cloudReset > localReset){
        var killed = 0;
        try{ killed = (window.muLocalWipe ? window.muLocalWipe() : basicWipe()) || 0; }catch(e){ killed = basicWipe(); }
        rset('mu_reset_at', String(cloudReset));
        if(killed > 0){ try{ sessionStorage.clear(); }catch(e){} try{ location.reload(); }catch(e){} return 'reset'; }
      }
      if(raw.data && !raw.v2done){
        applyKeys(raw.data);         // 旧v1データをローカルへマージ（新構造への保存は起動時のdoSaveAllが行う）
        return legacyRef().set({ v2done:true }, {merge:true}).then(function(){ return 'migrated'; });
      }
      return 'ok';
    }).catch(function(){ return 'ok'; });
  }
  // アプリを開いたままの端末にもリセットを即時伝播する（親ドキュメントの resetAt を監視）
  function stopSync(){
    ready=false; clearTimeout(saveT); dirtyShared=false; dirtyMembers={};
    if(unsubShared){ try{ unsubShared(); }catch(e){} unsubShared=null; }
    if(unsubMember){ try{ unsubMember(); }catch(e){} unsubMember=null; }
  }
  function listenReset(){
    if(unsubReset){ try{ unsubReset(); }catch(e){} }
    unsubReset = legacyRef().onSnapshot(function(d){
      if(d.metadata && d.metadata.hasPendingWrites) return;
      if(!d.exists) return;
      var cloudReset = parseInt(((d.data()||{}).resetAt)||0,10)||0;
      var localReset = parseInt(rget('mu_reset_at')||'0',10)||0;
      if(cloudReset > localReset){
        stopSync();
        try{ (window.muLocalWipe ? window.muLocalWipe() : basicWipe()); }catch(e){ basicWipe(); }
        rset('mu_reset_at', String(cloudReset));
        try{ sessionStorage.clear(); }catch(e){}
        try{ location.reload(); }catch(e){}
      }
    }, function(){});
  }
  // ---- 完全リセット：クラウドの全データを削除し、全端末にリセットを伝播 ----
  window.cloudWipeAll = function(){
    if(!db||!fam) return Promise.reject(new Error('cloud-not-ready'));
    stopSync();
    var epoch = Date.now();
    return legacyRef().collection('members').get().then(function(qs){
      var dels=[]; qs.forEach(function(doc){ dels.push(doc.ref.delete()); });
      return Promise.all(dels);
    }).then(function(){ return sharedRef().delete(); })
      .then(function(){ return legacyRef().set({ v2done:true, resetAt: epoch }); })  // merge無し＝旧v1のdataも消える
      .then(function(){ rset('mu_reset_at', String(epoch)); return true; });
  };

  // ---- 公開API ----
  var readyResolve, readyPromise=new Promise(function(r){ readyResolve=r; });
  window.cloudReady = function(){ return readyPromise; };
  window.cloudEnabled = function(){ return ready; };
  // ユーザー選択画面用：共通設定（ユーザー一覧）を最新化
  window.cloudPullShared = function(){
    if(!db||!fam) return readyPromise.then(function(){ return window.cloudPullShared(); });
    return sharedRef().get().then(function(d){
      var changed = d.exists ? applyKeys(((d.data()||{}).data)||{}) : false;
      if(changed){ try{ if(window.muOnCloudUpdate) window.muOnCloudUpdate(); }catch(e){} }
      return true;
    }).catch(function(){ return false; });
  };
  // ユーザーをタップした時：その人の最新データを取得してから開始する
  window.cloudPullUser = function(uid){
    if(!db||!fam) return readyPromise.then(function(){ return window.cloudPullUser(uid); });
    return memberRef(uid).get().then(function(d){
      if(d.exists){ applyKeys(memberToKeys(uid, ((d.data()||{}).data)||{})); }
      listenMember(uid);
      return true;
    }).catch(function(){ try{ listenMember(uid); }catch(e){} return false; });
  };
  // ユーザー削除時：クラウド側のドキュメントも削除
  window.cloudDeleteMember = function(uid){
    if(!db||!fam) return Promise.resolve(false);
    return memberRef(uid).delete().then(function(){ return true; }).catch(function(){ return false; });
  };
  window.cloudFamilySet = function(){
    var c = prompt('家族の合言葉コードを決めてください（全端末で同じものを使います。英数字4文字以上）。', famCode());
    if(c===null) return; c=(''+c).trim(); if(c.length<4){ alert('短すぎます。4文字以上にしてください。'); return; }
    rset('mu_family', c); try{ sessionStorage.removeItem('mu_synced'); }catch(e){}
    alert('家族コードを設定しました。クラウド同期を開始します。'); location.reload();
  };
  window.cloudFamilyClear = function(){ rset('mu_family',''); stopSync(); if(unsubReset){ try{ unsubReset(); }catch(e){} unsubReset=null; } alert('クラウド同期をオフにしました（この端末は端末内保存のみ）。'); };

  // ---- 保存フック：localStorageに書いたら該当ドキュメントだけを保存 ----
  localStorage.setItem = function(k,v){
    _rawSetItem(k,v);
    if(k==='mu_current' && ready){ listenMember(v); return; }
    if(!ready || !isSyncKey(k)) return;
    if(isSharedKey(k)) markShared(); else { var u=uidOfKey(k); if(u) markMember(u); }
  };
  window.addEventListener('visibilitychange', function(){ if(document.visibilityState==='hidden'){ clearTimeout(saveT); doSaveDirty(); } });
  window.addEventListener('pagehide', function(){ clearTimeout(saveT); doSaveDirty(); });

  function start(){
    fam = famCode();
    if(!fam){ return; }
    firebase.auth().signInAnonymously().then(function(){
      db = firebase.firestore();
      try{ db.enablePersistence({synchronizeTabs:true}).catch(function(){}); }catch(e){}
      checkLegacy().then(function(r){
        if(r==='reset') return 'reset';
        // まずクラウド→ローカルへマージ（先に読まずに書くと古い端末がクラウドを上書きしてしまう）
        var pulls=[ sharedRef().get().then(function(d){ if(d.exists) applyKeys(((d.data()||{}).data)||{}); }).catch(function(){}) ];
        localUids().forEach(function(uid){
          pulls.push( memberRef(uid).get().then(function(d){ if(d.exists) applyKeys(memberToKeys(uid, ((d.data()||{}).data)||{})); }).catch(function(){}) );
        });
        return Promise.all(pulls);
      }).then(function(r){
        if(r==='reset') return;   // リセット直後はリロードするので同期を開始しない
        ready = true;
        listenShared(); listenReset();
        var cur = rget('mu_current'); if(cur) listenMember(cur);
        doSaveAll();  // マージ済みの全データを新構造で保存
        readyResolve(true);
        try{ if(window.muOnCloudUpdate) window.muOnCloudUpdate(); }catch(e){}
      });
    }).catch(function(){});
  }
  Promise.all([
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'),
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js')
  ]).then(function(){ firebase.initializeApp(CFG); start(); }).catch(function(){});
})();
