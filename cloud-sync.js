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

  // el_api_key は同期しない（Phase 2でサーバー側 families/{code}/private/tts へ移動済み。
  // 生の鍵をクライアント間で同期すると平文露出に逆戻りするため）。el_key_set は
  // 「設定済みかどうか」の真偽値のみで、秘密情報を含まない。
  var SHARED = ['mu_users','mu_deleted','mu_admin_pin','theme','fontsize','voice_hana','voice_loco','voice_kai','voice_owl','voice_shiba','voice_cat','voice_rabbit','voice_fox','voice_bear','voice_tiger','voice_panda','voice_dolphin','voice_penguin','el_key_set','testdate','reward','line_endpoint','extra_questions','tts_voice','tts_rate','tts_pitch','el_voice_owners','sfx_on','vibe_on','rank_family_goal','family_duels'];
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
  // 着せ替え（そうび・コイン・チケット・所持アイテム）のマージ。ひとつも失わない方針：
  //   owned … 端末間で合算（所持アイテムは絶対に消さない）
  //   coin/tickets … 大きい方を採用（同期でコインが消える事故を防ぐ）
  //   equip … スロットごとに合算（クラウド優先）
  function mergeCos(x,y){
    if(!x && !y) return undefined;   // どちらにも無ければ作らない（rpgCosStateが後で初期化）
    x=x||{}; y=y||{};
    var owned={};
    [x.owned,y.owned].forEach(function(o){ if(o&&typeof o==='object'){ Object.keys(o).forEach(function(k){ if(o[k]) owned[k]=o[k]; }); } });
    var equip={};
    ['hero','pet'].forEach(function(kind){ var ex=(x.equip&&x.equip[kind])||null, ey=(y.equip&&y.equip[kind])||null;
      if(ex||ey) equip[kind]=Object.assign({}, ex||{}, ey||{}); });
    var o={ coin: Math.max(parseInt(x.coin||0,10)||0, parseInt(y.coin||0,10)||0),
            tickets: Math.max(parseInt(x.tickets||0,10)||0, parseInt(y.tickets||0,10)||0),
            owned: owned };
    if(Object.keys(equip).length) o.equip=equip;
    if(x.welcome||y.welcome) o.welcome=1;   // 初回100コインボーナスの再付与を防ぐ
    if(x.pity!=null||y.pity!=null) o.pity=Math.max(parseInt(x.pity||0,10)||0, parseInt(y.pity||0,10)||0);  // ガチャ天井カウンタを保全
    var titles={}; [x.titles,y.titles].forEach(function(o2){ if(o2&&typeof o2==='object'){ Object.keys(o2).forEach(function(k){ if(o2[k]) titles[k]=o2[k]; }); } });
    if(Object.keys(titles).length) o.titles=titles;                       // 手に入れた称号は端末間で合算
    var sets={}; [x.sets,y.sets].forEach(function(o2){ if(o2&&typeof o2==='object'){ Object.keys(o2).forEach(function(k){ if(o2[k]) sets[k]=o2[k]; }); } });
    if(Object.keys(sets).length) o.sets=sets;                             // セット受領済みも合算（二重ごほうびを防ぐ）
    if(x.title||y.title) o.title = y.title||x.title;                      // 装備中の称号（クラウド優先）
    return o;
  }
  // あいぼう（なかまモンスター）：手持ちは和集合＝同期で絶対に消えない（grow-only）。レベル/経験値/エサ/おまもりはmax。
  // 合成で消えたなかまは gone（墓標・増えるだけ）で表現＝古い端末との同期でも復活しない。ランクは合成で上がるので高い方を採用
  function mergeAibou(x,y){
    if(!x && !y) return undefined;
    x=x||{}; y=y||{};
    var RANKS=['F','E','D','C','B','A','S','SS','SSS'];
    function rankHi(a,b){ return (RANKS.indexOf(a)>=RANKS.indexOf(b))? a : b; }
    var gone={}; [x.gone,y.gone].forEach(function(g){ if(g&&typeof g==='object'){ Object.keys(g).forEach(function(k){ if(g[k]) gone[k]=1; }); } });
    var roster={}, rx=x.roster||{}, ry=y.roster||{}, id;
    for(id in rx){ if(rx[id]) roster[id]=rx[id]; }
    for(id in ry){ if(!ry[id]) continue;
      if(!roster[id]) roster[id]=ry[id];
      else { var a2=roster[id], b2=ry[id];
        roster[id]=Object.assign({}, a2, b2, { lv:Math.max(a2.lv||1,b2.lv||1), xp:Math.max(a2.xp||0,b2.xp||0), name:(b2.name||a2.name||''), rank:rankHi(a2.rank||'F', b2.rank||'F') }); } }
    Object.keys(gone).forEach(function(gid){ delete roster[gid]; });
    var party=((y.party&&y.party.length)?y.party:(x.party||[])).filter(function(pid){ return !!roster[pid]; }).slice(0,3);
    var o={ roster:roster, party:party,
            food:Math.max(parseInt(x.food||0,10)||0, parseInt(y.food||0,10)||0),
            charm:Math.max(parseInt(x.charm||0,10)||0, parseInt(y.charm||0,10)||0) };
    if(Object.keys(gone).length) o.gone=gone;
    if(x.migrated||y.migrated) o.migrated=1;   // 旧ペット→あいぼう移行の二重実行を防ぐ
    return o;
  }
  function mergeRpg(a,b){ try{ var x=JSON.parse(a||'null'), y=JSON.parse(b||'null');
    if(!x) return b; if(!y) return a;
    var stam;
    var xs=x.stamina||{date:'',used:0}, ys=y.stamina||{date:'',used:0};
    if(xs.date===ys.date) stam={date:xs.date, used:Math.max(xs.used||0, ys.used||0)};
    else stam=(xs.date>ys.date)? xs : ys;   // 新しい日付の消費状況を採用
    // まず全フィールドを引き継ぐ（cos/dailyBox 等の未知フィールドを捨てない。既定はクラウドy優先）。
    // 以下でスマートマージすべきフィールドだけを上書きする。
    var o=Object.assign({}, x, y);
    o.v=1;
    o.xp=Math.max(x.xp||0, y.xp||0);
    o.level=Math.max(x.level||1, y.level||1);
    o.cleared=Object.assign({}, x.cleared||{}, y.cleared||{});   // クリア実績は端末間で合算
    o.coll=Object.assign({}, x.coll||{}, y.coll||{});
    o.crystals=Object.assign({}, x.crystals||{}, y.crystals||{});// 集めたクリスタルも合算
    o.story=Object.assign({}, x.story||{}, y.story||{});         // 見たストーリーも合算（再表示を防ぐ）
    o.dex=Object.assign({}, x.dex||{}, y.dex||{});               // 図鑑（倒したモンスター）も合算
    o.stickers=Object.assign({}, x.stickers||{}, y.stickers||{});// あつめたシールも合算
    o.pet=(function(){ var xp=x.pet||{}, yp=y.pet||{}; var w=Math.max(xp.wins||0,yp.wins||0);
      return { wins:w, stage:Math.max(xp.stage||0,yp.stage||0), name:(yp.name||xp.name||''), fed:((xp.fed||'')>(yp.fed||'')?xp.fed:yp.fed)||'' }; })();
    o.daily=(function(){ var xd=x.daily||{}, yd=y.daily||{}; if((xd.date||'')===(yd.date||'')){ return { date:xd.date||yd.date||'', correct:Math.max(xd.correct||0,yd.correct||0), wins:Math.max(xd.wins||0,yd.wins||0), maxStreak:Math.max(xd.maxStreak||0,yd.maxStreak||0), claimed:Object.assign({},xd.claimed||{},yd.claimed||{}) }; } return ((xd.date||'')>(yd.date||'')? xd : yd); })();
    o.login=(function(){ var xl=x.login||{}, yl=y.login||{}; return { last:((xl.last||'')>(yl.last||'')?xl.last:yl.last)||'', streak:Math.max(xl.streak||0,yl.streak||0) }; })();
    o.stamina=stam;
    o.cos=mergeCos(x.cos, y.cos);   // ★そうび・コイン・チケット・所持アイテムを保全（旧コードは丸ごと捨てていた＝データ消失の原因）
    if(o.cos===undefined) delete o.cos;
    o.aibou=mergeAibou(x.aibou, y.aibou);   // ★あいぼう（なかまモンスター）も同様に保全
    if(o.aibou===undefined) delete o.aibou;
    return JSON.stringify(o); }catch(e){ return b||a; } }
  // 家族対戦の対戦状（{id:{...,results:{uid:{...}}}}）：id単位の和集合・resultsはuid単位の和集合（先勝ち）。
  // 端末Aが挑戦状を書き、端末Bが結果を書いても、どちらも消えない（latest-winsだと相互に消し合う）。
  function mergeDuels(a,b){
    try{
      var x=JSON.parse(a||'{}'), y=JSON.parse(b||'{}'), out={};
      [x,y].forEach(function(m){ Object.keys(m||{}).forEach(function(id){
        var d=m[id]; if(!d||!d.id) return;
        if(!out[id]){ out[id]=d; return; }
        var t=out[id]; t.results=t.results||{};
        Object.keys(d.results||{}).forEach(function(u){ if(!t.results[u]) t.results[u]=d.results[u]; });
      }); });
      var ids=Object.keys(out).sort(function(p,q){ return (out[q].at||0)-(out[p].at||0); });
      ids.slice(12).forEach(function(id){ delete out[id]; });   // 古い対戦状は12件で間引く（sharedドキュメント肥大防止）
      return JSON.stringify(out);
    }catch(e){ return b||a; }
  }
  function mergeKey(k,cur,inc){
    if(k==='mu_users') return mergeUsers(cur,inc);
    if(k==='family_duels') return mergeDuels(cur,inc);
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
  var _parentReadOk=false;   // 親doc（ユーザー一覧バックアップ）を読めたか。読めない時は書き戻さない（取りこぼし上書き防止）
  var DEFAULT_FAMILY='0000'; // 既定で必ずクラウドDBに保存（端末ごとの設定不要）
  function famCode(){ var c=(rget('mu_family')||'').trim(); return c || DEFAULT_FAMILY; }
  function legacyRef(){ return db.collection('families').doc(fam); }
  // ---- Phase 4 Slice 1：実アカウントモード（メール＋パスワード。単独オーナーのみ・共有はSlice 2）----
  //   mode='account'の時は families/{fam} ではなく accounts/{acctId} を同期先にする。
  //   families/{code}のデータとは完全に分離（自動移行はしない）。
  var mode='family', acctId=null;
  function curId(){ return mode==='account' ? acctId : fam; }
  function rootRef(){ return mode==='account' ? db.collection('accounts').doc(acctId) : legacyRef(); }
  function sharedRef(){ return rootRef().collection('shared').doc('settings'); }
  function memberRef(uid){ return rootRef().collection('members').doc(String(uid)); }

  var dirtyShared=false, dirtyMembers={}, saveT=null;
  function markShared(){ dirtyShared=true; scheduleSave(); }
  function markMember(uid){ dirtyMembers[uid]=true; scheduleSave(); }
  function scheduleSave(){ if(!ready) return; clearTimeout(saveT); saveT=setTimeout(doSaveDirty,1200); }
  // 共有設定の保存：名簿(mu_users)と墓標(mu_deleted)は「クラウドの現在値との和集合」にしてから書く。
  //   ＝どの端末が縮小した名簿を持っていても、書き込みでクラウドの名簿が縮むことは原理的に起きない(grow-only)。
  //   ユーザーの削除は mu_deleted（墓標・増えるだけ）で表し、muGetUsers が表示から除外する。
  //   これで「あやか/ちさき が消える」系のクロバーを根本から封じる。読めない時は書かない（縮小事故の芽を断つ）。
  function saveSharedGrowOnly(){
    var snap=sharedSnapshot();
    sharedRef().get().then(function(d){
      var cloud = (d && d.exists) ? (((d.data()||{}).data)||{}) : {};
      snap.mu_users = mergeUsers(cloud.mu_users, snap.mu_users);                       // 名簿＝和集合（クラウドより縮まない）
      var md = mergeObjMax(cloud.mu_deleted || '{}', snap.mu_deleted || '{}');          // 墓標＝和集合（削除フラグは消さない）
      if(md && md !== '{}') snap.mu_deleted = md;
      if(snap.family_duels || cloud.family_duels)                                       // 対戦状＝書込時も和集合（相互クロバー防止）
        snap.family_duels = mergeDuels(cloud.family_duels, snap.family_duels);
      return sharedRef().set({ data: snap, updated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
    }).catch(function(){ dirtyShared=true; });
  }
  function doSaveDirty(){ if(!db||!curId()||!ready) return;
    if(dirtyShared){ dirtyShared=false; saveSharedGrowOnly(); }
    Object.keys(dirtyMembers).forEach(function(uid){ delete dirtyMembers[uid];
      var snap=memberSnapshot(uid);
      if(!snap || Object.keys(snap).length===0) return;   // 空データではクラウドを上書きしない（キャッシュ削除直後などの消失を防ぐ）
      memberRef(uid).set({ data: snap, updated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true}).catch(function(){ dirtyMembers[uid]=true; }); });
  }
  function doSaveAll(){ dirtyShared=true; localUids().forEach(function(u){ dirtyMembers[u]=1; }); doSaveDirty(); }

  // ---- 反映通知（学習中は勝手にリロードせずトーストで知らせる）----
  function showSyncToast(){
    try{
      if(document.getElementById('cs-sync-toast')) return;
      // ボトムタブ（bottom:0・約80px）に重ならないよう、その上に浮かせる。×で手動で閉じられる。
      var t=document.createElement('div'); t.id='cs-sync-toast';
      t.setAttribute('style','position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:850;background:#0891b2;color:#fff;padding:9px 8px 9px 15px;border-radius:999px;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.22);max-width:92%;display:flex;align-items:center;gap:6px;');
      var msg=document.createElement('span');
      msg.textContent='🔄 新しい記録があります（タップで更新）';
      msg.setAttribute('style','cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;');
      msg.addEventListener('click',function(){ location.reload(); });
      var x=document.createElement('button');
      x.textContent='✕'; x.setAttribute('aria-label','とじる');
      x.setAttribute('style','flex:0 0 auto;border:none;background:rgba(255,255,255,.22);color:#fff;width:24px;height:24px;line-height:1;border-radius:999px;font-size:12px;cursor:pointer;padding:0;');
      x.addEventListener('click',function(ev){ ev.stopPropagation(); if(t.parentNode) t.parentNode.removeChild(t); });
      t.appendChild(msg); t.appendChild(x);
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
      _parentReadOk = true;   // 親doc（バックアップ）を実際に読めた
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
      // v1親docのユーザー一覧を常にマージ（union）して回復力を持たせる。
      // v2の mu_users が何らかの事故で縮んでいても、ここで消えたユーザーが復活する（mergeUsersは合算のみ＝減らない）。
      if(raw.data && raw.data.mu_users){ try{ applyKeys({ mu_users: raw.data.mu_users }); }catch(e){} }
      // v1親docの各ユーザー学習データ(u:uid:*)も常に max マージ＝クロバーされてもポイント/記録が戻る安全網。
      // mergeKeyはカウンタ=最大値・配列=union・rpg_state=最大合成なので、誰の値も下がらない（設定キーは触らない）。
      if(raw.data){ try{ var _mem={}; Object.keys(raw.data).forEach(function(k){ if(k.indexOf('u:')===0) _mem[k]=raw.data[k]; }); if(Object.keys(_mem).length) applyKeys(_mem); }catch(e){} }
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
    if(!db||!curId()) return Promise.reject(new Error('cloud-not-ready'));
    stopSync();
    var epoch = Date.now();
    return rootRef().collection('members').get().then(function(qs){
      var dels=[]; qs.forEach(function(doc){ dels.push(doc.ref.delete()); });
      return Promise.all(dels);
    // families/{code}/private/tts（Phase 2でElevenLabsキーを保存する場所）も消したいが、
    // 【2026-07-14のルール修正以降】private配下はセキュリティルールで完全拒否になったため、
    // この delete はクライアントからは permission-denied で失敗する（.catch で握りつぶす）。
    // ＝完全リセットしてもサーバー上の鍵docが残る副作用がある。匿名 delete を許可すると
    // 4桁コード総当たりで他人の鍵を消せるgriefingになるためルールでは開けない。正しい対処は
    // Cloudflare Worker に deleteKey エンドポイントを足すこと（follow-up・未実装）。
    // TTSはfamilyモード限定（accountモードには鍵の保存先が無い）。
    }).then(function(){ return (mode==='family') ? legacyRef().collection('private').doc('tts').delete().catch(function(){}) : null; })
      .then(function(){ return sharedRef().delete(); })
      .then(function(){ return rootRef().set({ v2done:true, resetAt: epoch }); })  // merge無し＝旧v1のdataも消える（accountモードでもv2done/resetAtは無害）
      .then(function(){ rset('mu_reset_at', String(epoch)); return true; });
  };

  // ---- 公開API ----
  var readyResolve, readyPromise=new Promise(function(r){ readyResolve=r; });
  window.cloudReady = function(){ return readyPromise; };
  window.cloudEnabled = function(){ return ready; };
  // ---- クラウド接続状態（画面の警告バナー用）: 'connecting' | 'ok' | 'error' ----
  var _cloudStatus='connecting';
  function setCloudStatus(st, reason){ if(_cloudStatus===st) return; _cloudStatus=st; try{ if(window.muOnCloudStatus) window.muOnCloudStatus(st, reason||''); }catch(e){} }
  window.cloudStatus = function(){ return _cloudStatus; };
  // ユーザー選択画面用：共通設定（ユーザー一覧）を最新化
  window.cloudPullShared = function(){
    if(!db||!curId()) return readyPromise.then(function(){ return window.cloudPullShared(); });
    var pulls = [ sharedRef().get().then(function(d){ return d.exists ? applyKeys(((d.data()||{}).data)||{}) : false; }).catch(function(){ return false; }) ];
    // ★v1親doc（通常保存では書き換わらない安定バックアップ）のユーザー一覧も必ず合算する（familyモードのみ。
    //   accountモードには対応するv1親docの概念が無い）。
    //   これで shared が別端末に u1 だけへ縮められても、選択画面には常に家族全員が出る。
    //   合算結果は applyKeys→markShared 経由で shared へ書き戻され、sharedも自己修復する。
    if(mode==='family'){
      pulls.push(legacyRef().get().then(function(d){ var raw=d.exists?(d.data()||{}):{}; return (raw.data && raw.data.mu_users)? applyKeys({ mu_users: raw.data.mu_users }) : false; }).catch(function(){ return false; }));
    }
    return Promise.all(pulls).then(function(res){
      if(res.some(Boolean)){ try{ if(window.muOnCloudUpdate) window.muOnCloudUpdate(); }catch(e){} }
      return true;
    }).catch(function(){ return false; });
  };
  // ユーザーをタップした時：その人の最新データを取得してから開始する
  window.cloudPullUser = function(uid){
    if(!db||!curId()) return readyPromise.then(function(){ return window.cloudPullUser(uid); });
    return memberRef(uid).get().then(function(d){
      if(d.exists){ applyKeys(memberToKeys(uid, ((d.data()||{}).data)||{})); }
      listenMember(uid);
      return true;
    }).catch(function(){ try{ listenMember(uid); }catch(e){} return false; });
  };
  // 家族ランキング用：全メンバーの学習データを取得する（localStorageには反映しない＝集計専用）。
  //   返り値 { uid: {フィールド...}, ... }。クラウド不可時は null。
  window.cloudFetchAllMembers = function(){
    if(!db||!curId()) return readyPromise.then(function(){ return window.cloudFetchAllMembers(); });
    return rootRef().collection('members').get().then(function(qs){
      var out={}; qs.forEach(function(doc){ out[doc.id] = ((doc.data()||{}).data)||{}; }); return out;
    }).catch(function(){ return null; });
  };
  // ユーザー削除時：クラウド側のドキュメントも削除
  window.cloudDeleteMember = function(uid){
    if(!db||!curId()) return Promise.resolve(false);
    return memberRef(uid).delete().then(function(){ return true; }).catch(function(){ return false; });
  };
  window.cloudFamilySet = function(){
    var c = prompt('家族の合言葉コードを決めてください（全端末で同じものを使います。英数字4文字以上）。', famCode());
    if(c===null) return; c=(''+c).trim(); if(c.length<4){ alert('短すぎます。4文字以上にしてください。'); return; }
    rset('mu_family', c); try{ sessionStorage.removeItem('mu_synced'); }catch(e){}
    alert('家族コードを設定しました。クラウド同期を開始します。'); location.reload();
  };
  window.cloudFamilyClear = function(){ rset('mu_family',''); stopSync(); if(unsubReset){ try{ unsubReset(); }catch(e){} unsubReset=null; } alert('クラウド同期をオフにしました（この端末は端末内保存のみ）。'); };

  // ---- Phase 4 Slice 1：メール＋パスワードでの実アカウント（単独オーナーのみ・共有機能はSlice 2）----
  //   familyモードとaccountモードの間でローカルキャッシュを引き継ぐと、片方の家族/アカウントの
  //   データがもう片方（特に本番families/0000）に混入する事故になるため、切替時は明示的に
  //   同期対象キーだけを消してからreloadする（cloudFamilySetの「引き継ぎ」動作とは意図的に違う）。
  function clearSyncCacheForModeSwitch(){
    doSaveDirty();   // 保留中の書き込みを先に吐き出してから消す
    try{ (window.muLocalWipe ? window.muLocalWipe() : basicWipe()); }catch(e){ basicWipe(); }
  }
  window.cloudMode = function(){ return mode; };
  window.cloudAccountSignUp = function(email, password){
    return firebase.auth().createUserWithEmailAndPassword(email, password)
      .then(function(){ rset('mu_account_active','1'); clearSyncCacheForModeSwitch(); alert('アカウントを作成しました。'); location.reload(); })
      .catch(function(e){ alert('作成できませんでした：' + (e && e.message)); });
  };
  window.cloudAccountSignIn = function(email, password){
    return firebase.auth().signInWithEmailAndPassword(email, password)
      .then(function(){ rset('mu_account_active','1'); clearSyncCacheForModeSwitch(); alert('ログインしました。'); location.reload(); })
      .catch(function(e){ alert('ログインできませんでした：' + (e && e.message)); });
  };
  window.cloudAccountSignOut = function(){
    return firebase.auth().signOut().then(function(){ rset('mu_account_active',''); clearSyncCacheForModeSwitch(); location.reload(); });
  };

  // ---- 端末セッションロック（同じユーザーを複数端末で同時に操作させない）----
  //   families/{fam}/sessions/{uid} = { device, name, at(serverTimestamp) }
  //   ・使用開始時にロックを取得。別端末が使用中なら取得失敗を返す（UI側で「この端末で続ける」＝強制取得）。
  //   ・使用中はハートビートで at を更新。90秒更新が無ければ失効（端末が閉じた/落ちた場合の保険）。
  //   ・他端末に奪われたら onTaken を呼んでUIをロックする。
  var SESSION_STALE_MS = 90000, _hbTimer=null, _sessUid=null, _unsubSess=null;
  function deviceId(){ var d=rget('mu_device_id'); if(!d){ d='d'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); rset('mu_device_id', d); } return d; }
  function sessionRef(uid){ return rootRef().collection('sessions').doc(String(uid)); }
  // 使用中かどうかの純粋判定（テストしやすいよう分離）
  function _sessionBlocked(s, me, now, staleMs){
    if(!s || !s.device || s.device===me) return false;           // 空き or 自分 → ブロックしない
    var at = (s.at && s.at.toMillis) ? s.at.toMillis() : (typeof s.at==='number'? s.at : 0);
    if(!at) return false;                                        // タイムスタンプ未確定は空きとみなす（締め出さない）
    return (now - at) < staleMs;                                 // 生存確認が新しければ他端末が使用中
  }
  // ロック取得。取れれば {ok:true}、別端末が使用中なら {ok:false, by}
  window.cloudSessionClaim = function(uid, opts){
    opts=opts||{};
    if(!db||!curId()||!ready || !uid) return Promise.resolve({ok:true, offline:true});   // クラウド無効/未接続は素通し（オフラインで締め出さない）
    var me=deviceId();
    return sessionRef(uid).get().then(function(d){
      var s = d.exists ? (d.data()||{}) : null;
      if(!opts.force && _sessionBlocked(s, me, Date.now(), SESSION_STALE_MS)) return {ok:false, by:(s.name||'べつの たんまつ')};
      return sessionRef(uid).set({ device:me, name:(opts.name||('たんまつ'+me.slice(-3))), at:firebase.firestore.FieldValue.serverTimestamp() }).then(function(){ return {ok:true}; });
    }).catch(function(){ return {ok:true, offline:true}; });   // 確認できないときも素通し
  };
  // 自分が保有しているときだけロックを解放（他端末が奪った後は消さない）
  window.cloudSessionRelease = function(uid){
    if(_hbTimer){ clearInterval(_hbTimer); _hbTimer=null; }
    if(_unsubSess){ try{ _unsubSess(); }catch(e){} _unsubSess=null; }
    var u=uid||_sessUid; _sessUid=null;
    if(!db||!curId()||!u) return Promise.resolve();
    var me=deviceId();
    return sessionRef(u).get().then(function(d){ var s=d.exists?(d.data()||{}):null; if(s && s.device===me) return sessionRef(u).delete(); }).catch(function(){});
  };
  // 使用開始：ハートビート＋他端末が奪ったら onTaken(name) 通知
  window.cloudSessionStart = function(uid, onTaken){
    var me=deviceId();
    if(_sessUid && _sessUid!==uid && db && curId()){ var prev=_sessUid;   // 別ユーザーに切り替えたら前のセッションを解放
      sessionRef(prev).get().then(function(d){ var s=d.exists?(d.data()||{}):null; if(s && s.device===me) sessionRef(prev).delete(); }).catch(function(){}); }
    if(_hbTimer){ clearInterval(_hbTimer); _hbTimer=null; }
    if(_unsubSess){ try{ _unsubSess(); }catch(e){} _unsubSess=null; }
    _sessUid=uid;
    if(!db||!curId()||!ready||!uid) return;
    _hbTimer=setInterval(function(){ sessionRef(uid).set({ device:me, at:firebase.firestore.FieldValue.serverTimestamp() }, {merge:true}).catch(function(){}); }, 40000);
    _unsubSess=sessionRef(uid).onSnapshot(function(d){
      if(d.metadata && d.metadata.hasPendingWrites) return;
      var s=d.exists?(d.data()||{}):null;
      if(s && s.device && s.device!==me){
        // 他端末に引き継がれた：自分のハートビートを止める（40秒ごとの merge:true 書込が
        // 相手からセッションを奪い返す「ピンポン」を防ぐ）。監視も止めてロック画面へ。
        if(_hbTimer){ clearInterval(_hbTimer); _hbTimer=null; }
        if(_unsubSess){ try{ _unsubSess(); }catch(e){} _unsubSess=null; }
        _sessUid=null;
        if(onTaken){ try{ onTaken(s.name||'べつの たんまつ'); }catch(e){} }
      }
    }, function(){});
  };

  // ---- 保存フック：localStorageに書いたら該当ドキュメントだけを保存 ----
  localStorage.setItem = function(k,v){
    _rawSetItem(k,v);
    if(k==='mu_current' && ready){ listenMember(v); return; }
    if(!ready || !isSyncKey(k)) return;
    if(isSharedKey(k)) markShared(); else { var u=uidOfKey(k); if(u) markMember(u); }
  };
  window.addEventListener('visibilitychange', function(){ if(document.visibilityState==='hidden'){ clearTimeout(saveT); doSaveDirty(); } });
  window.addEventListener('pagehide', function(){ clearTimeout(saveT); doSaveDirty(); });

  // familyモードの起動処理（旧start()の中身そのまま。v1移行・リセット伝播はfamily限定の概念）
  function bootSyncFamily(){
    fam = famCode();
    setCloudStatus('connecting');
    setTimeout(function(){ if(_cloudStatus==='connecting') setCloudStatus('error','timeout'); }, 15000);  // 応答が無ければ警告
    db = firebase.firestore();
    try{ db.enablePersistence({synchronizeTabs:true}).catch(function(){}); }catch(e){}
    var readOk=false; _parentReadOk=false;   // クラウド(shared)と親doc(バックアップ)を実際に読めたか（読めない時は書き戻さない＝上書き事故の防止）
    checkLegacy().then(function(r){
      if(r==='reset') return 'reset';
      // ① まず共有設定（ユーザー一覧＝mu_users）を取得して反映する。
      //    これで localStorage が空でも（キャッシュ削除・別端末・初回でも）家族全員が復元される。
      return sharedRef().get().then(function(d){ if(d.exists) applyKeys(((d.data()||{}).data)||{}); readOk=true; setCloudStatus('ok'); })
        .catch(function(e){ setCloudStatus('error', (e&&(e.code||e.message))||'read'); })   // ルール拒否/通信不可を検知
        .then(function(){
          // ② 共有を反映した後の「全ユーザー」ぶんの学習データをクラウドから取得。
          //    localUids() を“共有プルの後”に評価するのが肝（前だと空で1件も読まれずデータが消えたように見える）。
          var mpulls = localUids().map(function(uid){
            return memberRef(uid).get().then(function(d){ if(d.exists) applyKeys(memberToKeys(uid, ((d.data()||{}).data)||{})); }).catch(function(){});
          });
          return Promise.all(mpulls);
        });
    }).then(function(r){
      if(r==='reset') return;   // リセット直後はリロードするので同期を開始しない
      ready = true;
      listenShared(); listenReset();
      var cur = rget('mu_current'); if(cur) listenMember(cur);
      if(readOk && _parentReadOk) doSaveAll();   // ★shared＋親doc(バックアップ)を両方読めた時だけ書き戻す。どちらか読めない時は古い/取りこぼしローカルでクラウドを上書きしない（ユーザー一覧が縮む事故の再発防止）
      readyResolve(true);
      try{ if(window.muOnCloudUpdate) window.muOnCloudUpdate(); }catch(e){}
    });
  }
  // accountモードの起動処理：v1移行・リセット伝播（checkLegacy/listenReset）はfamily専用の
  // 概念なので呼ばない（新規accountにはv1親docが存在しないため）。readOkのみをゲート条件にする
  // （守るべきv1バックアップが無いので、familyモードのreadOk&&_parentReadOkの二重ゲートは不要）。
  function bootSyncAccount(){
    setCloudStatus('connecting');
    setTimeout(function(){ if(_cloudStatus==='connecting') setCloudStatus('error','timeout'); }, 15000);
    db = firebase.firestore();
    try{ db.enablePersistence({synchronizeTabs:true}).catch(function(){}); }catch(e){}
    var readOk=false;
    sharedRef().get().then(function(d){ if(d.exists) applyKeys(((d.data()||{}).data)||{}); readOk=true; setCloudStatus('ok'); })
      .catch(function(e){ setCloudStatus('error', (e&&(e.code||e.message))||'read'); })
      .then(function(){
        var mpulls = localUids().map(function(uid){
          return memberRef(uid).get().then(function(d){ if(d.exists) applyKeys(memberToKeys(uid, ((d.data()||{}).data)||{})); }).catch(function(){});
        });
        return Promise.all(mpulls);
      }).then(function(){
        ready = true;
        listenShared();
        var cur = rget('mu_current'); if(cur) listenMember(cur);
        if(readOk) doSaveAll();
        readyResolve(true);
        try{ if(window.muOnCloudUpdate) window.muOnCloudUpdate(); }catch(e){}
      });
  }
  function bootSync(){ if(mode==='account') bootSyncAccount(); else bootSyncFamily(); }

  // onAuthStateChangedの1回の発火に対して、その場で取るべき行動を判定する（純粋関数・
  // 副作用無し＝テストしやすいよう分離。_sessionBlockedと同じ方針）。
  // Firebase Authのセッション復元は非同期で、実アカウントのセッションが復元し切る前に
  // onAuthStateChangedが一旦nullで発火することがある（既知の挙動）。ここで即座に匿名認証へ
  // フォールバックすると、実アカウントの端末がfamilyモード（既定families/0000）に誤って
  // 落ちてしまう恐れがあるため、`mu_account_active`（アカウントセッション開始時に立てる
  // ローカルマーカー）が立っている場合は少し待ってから判断する（action:'wait'）。
  function _decideAuthAction(user, acctActive, alreadyWaiting){
    if(user && !user.isAnonymous) return { action:'boot', mode:'account' };
    if(user && user.isAnonymous) return { action:'boot', mode:'family' };
    if(acctActive && !alreadyWaiting) return { action:'wait' };
    if(!acctActive) return { action:'anon' };
    return { action:'none' };
  }
  function start(){
    var booted=false, authTimeout=null;
    var acctActive = rget('mu_account_active')==='1';
    firebase.auth().onAuthStateChanged(function(user){
      if(booted) return;
      var d = _decideAuthAction(user, acctActive, !!authTimeout);
      if(d.action==='boot'){
        if(authTimeout){ clearTimeout(authTimeout); authTimeout=null; }
        mode=d.mode; if(mode==='account') acctId=user.uid; booted=true; bootSync();
      } else if(d.action==='wait'){
        authTimeout=setTimeout(function(){
          if(!booted) firebase.auth().signInAnonymously().catch(function(){ setCloudStatus('error','auth'); });
        }, 2000);
      } else if(d.action==='anon'){
        firebase.auth().signInAnonymously().catch(function(){ setCloudStatus('error','auth'); });
      }
    });
  }
  Promise.all([
    loadScript('js/vendor/firebase-app-compat.js'),
    loadScript('js/vendor/firebase-auth-compat.js'),
    loadScript('js/vendor/firebase-firestore-compat.js')
  ]).then(function(){ firebase.initializeApp(CFG); start(); }).catch(function(){ setCloudStatus('error','load'); });
})();
