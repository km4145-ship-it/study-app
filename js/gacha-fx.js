/* gacha-fx.js：ガチャ演出のリッチなCanvasパーティクル（星屑バースト／放射光／光柱／上昇粒／レンズフレア）。
   外部依存なし・オフライン自己完結。加算合成(lighter)で「光が重なる豪華さ」を出す。
   prefers-reduced-motion を尊重して量を抑える。window.gachaFx で公開（rpgGachaRevealから呼ぶ）。 */
(function(){
  'use strict';
  var cv=null, ctx=null, raf=null, W=0, H=0, dpr=1, visible=false;
  var sparks=[];        // 星屑（開封バースト）
  var beams=[];         // 放射光線（開封フラッシュ）
  var motes=[];         // 上昇する光の粒（溜め中の環境）
  var flares=[];        // レンズフレア（中心の光球）
  var charge=null;      // {rank, until} 溜め中の状態
  var lastT=0, spawnAcc=0;

  function reduced(){ try{ return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }catch(e){ return false; } }

  function ensure(){
    if(cv) return;
    cv=document.createElement('canvas'); cv.id='gacha-fx-canvas';
    cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10000;display:none;';
    document.body.appendChild(cv);
    ctx=cv.getContext('2d');
    resize();
    try{ window.addEventListener('resize', resize); }catch(e){}
  }
  function resize(){
    if(!cv||!ctx) return;
    dpr=Math.min(2, window.devicePixelRatio||1);
    W=window.innerWidth; H=window.innerHeight;
    cv.width=Math.floor(W*dpr); cv.height=Math.floor(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function show(){ if(cv){ cv.style.display='block'; visible=true; } }
  function hide(){ if(cv){ cv.style.display='none'; visible=false; if(ctx) ctx.clearRect(0,0,W,H); } }

  // レア度→色。null＝虹（hueで生成）。rank: 4=SR(桃) 5=SSR(金) 6=UR(虹) 7=LR(虹+白)
  function tone(rank, seed){
    if(rank>=6){ var hue=(seed*47)%360; return 'hsl('+hue+',100%,'+(rank>=7?72:62)+'%)'; }
    if(rank>=5) return (seed%3===0)?'#fff7d6':((seed%3===1)?'#fbbf24':'#fde68a');   // 金
    return (seed%3===0)?'#ffe4f1':((seed%3===1)?'#f472b6':'#f9a8d4');               // 桃
  }
  // 溜め中の色（段階昇格）：0=青（正体を隠す）→1=金→2=本来のレア色。開封で一気に本来色バーストへ。
  function toneStage(rank, stage, seed){
    if(stage>=2) return tone(rank, seed);
    if(stage===1) return (seed%3===0)?'#fff7d6':((seed%3===1)?'#fbbf24':'#fde68a');
    return (seed%3===0)?'#dbeafe':((seed%3===1)?'#60a5fa':'#a5b4fc');
  }
  // 中心（宝箱のあたり＝画面中央やや上）
  function cx(){ return W/2; }
  function cy(){ return H*0.42; }

  function rnd(a,b){ return a+(b-a)*_r(); }
  // 決定性は不要だが Math.random は使える環境（ブラウザ実行）。テスト環境では呼ばれない。
  function _r(){ return Math.random(); }

  // ===== 溜め開始：上昇する光の粒＋うっすら回る放射（レア度色）=====
  function startCharge(rank){
    ensure(); show();
    charge={ rank:rank, t:0, stage:0 };
    lastT=0; spawnAcc=0;
    loop();
  }
  // ===== 溜めを一段強める（フェーズ2/3で呼ぶ）＝色を昇格させつつ粒を増やして緊張感 =====
  function pulse(rank){
    if(!charge) return;
    charge.stage=Math.min(2, charge.stage+1);
    var n=reduced()?6:16, i;
    for(i=0;i<n;i++) motes.push(newMote(rank, true));
  }
  function newMote(rank, fast){
    var ang=rnd(0,Math.PI*2), rad=rnd(60, Math.max(W,H)*0.55);
    var x=cx()+Math.cos(ang)*rad, y=cy()+Math.sin(ang)*rad+rnd(0,H*0.3);
    var st=charge?charge.stage:2;
    return { x:x, y:y, tx:cx()+rnd(-40,40), ty:cy()+rnd(-30,30),
             s:rnd(1.6,3.8), life:1, dec:rnd(0.006,0.014)*(fast?1.8:1),
             col:toneStage(rank, st, (Math.floor(x+y))|0), spin:rnd(0,6.28) };
  }

  // ===== 開封バースト：星屑爆発＋放射光線＋レンズフレア（レア度ほど量が多い）=====
  function burst(rank){
    ensure(); show();
    charge=null; motes.length=0;
    var big=rank>=6, huge=rank>=7, low=rank<4;                 // low＝R/HR用の控えめバースト
    var nSpark=reduced()?(low?18:40):(huge?260:big?200:(rank>=5?150:(low?60:110)));
    var nBeam=reduced()?(low?4:8):(huge?28:big?22:(rank>=5?16:(low?8:12)));
    var i;
    for(i=0;i<nSpark;i++){
      var ang=rnd(0,Math.PI*2), sp=rnd(3.5, huge?15:big?12:9);
      sparks.push({ x:cx(), y:cy(), vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp-rnd(0,2),
        g:rnd(0.04,0.11), s:rnd(1.8,4.6), life:1, dec:rnd(0.006,0.016),
        col:tone(rank, i), tw:rnd(0,6.28), tws:rnd(0.15,0.4) });
    }
    for(i=0;i<nBeam;i++){
      beams.push({ a:(Math.PI*2*i/nBeam)+rnd(-0.1,0.1), len:0,
        max:rnd(H*0.4, H*0.72), w:rnd(2,huge?7:5), life:1, dec:rnd(0.02,0.04),
        col:tone(rank, i*7), spin:rnd(-0.01,0.01) });
    }
    flares.push({ r:0, max:huge?H*0.5:big?H*0.4:(low?H*0.22:H*0.32), life:1, dec:0.045, col:tone(rank,0), rank:rank });
    // 高レアは二段バースト（豪華さの段差）
    if(big){ setTimeout(function(){ secondBurst(rank); }, 260); }
    if(huge){ setTimeout(function(){ secondBurst(rank); }, 560); }
    loop();
  }
  function secondBurst(rank){
    ensure(); show();
    var n=reduced()?24:(rank>=7?140:100), i;
    for(i=0;i<n;i++){
      var ang=rnd(0,Math.PI*2), sp=rnd(3, rank>=7?13:10);
      sparks.push({ x:cx(), y:cy(), vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp-rnd(0,2),
        g:rnd(0.04,0.1), s:rnd(1.6,4.2), life:1, dec:rnd(0.007,0.017),
        col:tone(rank, i+99), tw:rnd(0,6.28), tws:rnd(0.15,0.4) });
    }
    flares.push({ r:0, max:H*0.34, life:1, dec:0.05, col:tone(rank,3), rank:rank });
  }

  function step(dt){
    var i, p;
    // 上昇粒（中心へ吸い込まれながら明滅）
    if(charge){
      charge.t+=dt;
      spawnAcc+=dt;
      var rate=reduced()?0.05:0.014;                         // 生成間隔（秒）
      while(spawnAcc>rate){ spawnAcc-=rate; if(motes.length<(reduced()?30:160)) motes.push(newMote(charge.rank,false)); }
    }
    for(i=motes.length-1;i>=0;i--){ p=motes[i];
      p.x+=(p.tx-p.x)*0.045; p.y+=(p.ty-p.y)*0.045+ -0.3; p.spin+=0.2;
      p.life-=p.dec;
      if(p.life<=0 || (Math.abs(p.x-p.tx)<8 && Math.abs(p.y-p.ty)<8)) motes.splice(i,1);
    }
    // 星屑
    for(i=sparks.length-1;i>=0;i--){ p=sparks[i];
      p.x+=p.vx; p.y+=p.vy; p.vy+=p.g; p.vx*=0.985; p.vy*=0.985; p.tw+=p.tws; p.life-=p.dec;
      if(p.life<=0) sparks.splice(i,1);
    }
    // 放射光
    for(i=beams.length-1;i>=0;i--){ p=beams[i];
      p.len+=(p.max-p.len)*0.22; p.a+=p.spin; p.life-=p.dec;
      if(p.life<=0) beams.splice(i,1);
    }
    // フレア
    for(i=flares.length-1;i>=0;i--){ p=flares[i];
      p.r+=(p.max-p.r)*0.16; p.life-=p.dec;
      if(p.life<=0) flares.splice(i,1);
    }
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation='lighter';                  // 加算合成＝光が重なって輝く
    var i, p, X=cx(), Y=cy();
    // フレア（背面の大きな光球）
    for(i=0;i<flares.length;i++){ p=flares[i];
      var g=ctx.createRadialGradient(X,Y,0,X,Y,Math.max(1,p.r));
      g.addColorStop(0,'rgba(255,255,255,'+(0.5*p.life)+')');
      g.addColorStop(0.25, hexA(p.col,0.42*p.life));
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(X,Y,p.r,0,6.2832); ctx.fill();
    }
    // 放射光線
    for(i=0;i<beams.length;i++){ p=beams[i];
      ctx.save(); ctx.translate(X,Y); ctx.rotate(p.a);
      var lg=ctx.createLinearGradient(0,0,0,-p.len);
      lg.addColorStop(0, hexA(p.col,0.0));
      lg.addColorStop(0.15, hexA(p.col,0.55*p.life));
      lg.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=lg;
      ctx.beginPath(); ctx.moveTo(-p.w,0); ctx.lineTo(p.w,0); ctx.lineTo(p.w*0.3,-p.len); ctx.lineTo(-p.w*0.3,-p.len); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // 上昇粒
    for(i=0;i<motes.length;i++){ p=motes[i];
      var a=Math.max(0,Math.min(1,p.life))*(0.6+0.4*Math.sin(p.spin));
      dot(p.x,p.y,p.s,p.col,a);
    }
    // 星屑（白コア＋色オーラ＋きらめき）
    for(i=0;i<sparks.length;i++){ p=sparks[i];
      var tw=0.55+0.45*Math.sin(p.tw), al=Math.max(0,Math.min(1,p.life))*tw;
      dot(p.x,p.y,p.s*(0.9+0.5*tw),p.col,al);
      ctx.fillStyle='rgba(255,255,255,'+(al*0.9)+')';
      ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0.5,p.s*0.4),0,6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';
  }
  function dot(x,y,s,col,a){
    var g=ctx.createRadialGradient(x,y,0,x,y,Math.max(1,s*2.4));
    g.addColorStop(0, hexA(col,a));
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,s*2.4,0,6.2832); ctx.fill();
  }
  // 色（#hex or hsl(...)）を alpha 付きで
  function hexA(col,a){
    a=Math.max(0,Math.min(1,a));
    if(col.charAt(0)==='#'){
      var h=col.slice(1); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      var n=parseInt(h,16); return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
    }
    // hsl(...) → hsla(...)
    if(col.indexOf('hsl(')===0) return 'hsla('+col.slice(4,-1)+','+a+')';
    return col;
  }

  function loop(){
    if(raf) return;
    lastT=0;
    var tick=function(ts){
      raf=null;
      if(!lastT) lastT=ts;
      var dt=Math.min(0.05,(ts-lastT)/1000); lastT=ts;
      step(dt); draw();
      if(charge || sparks.length || beams.length || motes.length || flares.length){
        raf=requestAnimationFrame(tick);
      } else {
        hide();
      }
    };
    raf=requestAnimationFrame(tick);
  }

  function stop(){
    charge=null;
    // 余韻を残しつつ穏やかに消す（バーストは自然フェード）
    setTimeout(function(){ motes.length=0; }, 60);
  }
  function reset(){ charge=null; sparks.length=0; beams.length=0; motes.length=0; flares.length=0; if(raf){ cancelAnimationFrame(raf); raf=null; } hide(); }

  window.gachaFx={ charge:startCharge, pulse:pulse, burst:burst, stop:stop, reset:reset };
})();
