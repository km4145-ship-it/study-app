/* generators-graph.js：図表・グラフ読み取り問題（classic script・グローバル）。
   入試頻出の「資料問題」対応＝棒グラフ・折れ線グラフをSVGで動的生成し、
   答えは値から計算で算出（＝必ず正しい）。q.figure（SVG文字列）を使う既存の仕組みに乗る。
   配色は既存の図つき問題と同じ（バー/線=cyan #67e8f9・値ラベル=#f59e0b）。
   generators.js の後に読み込み、mathGens/sciGens/socGens へ push する。 */

// ---- SVGビルダー（値ラベル付き・viewBoxで拡縮） ----
function gxBarSVG(title, labels, vals, unit){
  var max=Math.max.apply(null, vals), w=320, h=185, bw=46, gap=20, x0=36, y0=150, scale=104/max;
  var s='<svg viewBox="0 0 '+w+' '+h+'" width="100%" style="max-width:330px">';
  s+='<text x="'+(w/2)+'" y="16" font-size="13" text-anchor="middle" fill="#64748b" font-weight="bold">'+title+'</text>';
  s+='<line x1="'+(x0-8)+'" y1="'+y0+'" x2="'+(w-8)+'" y2="'+y0+'" stroke="#94a3b8" stroke-width="2"/>';
  for(var i=0;i<vals.length;i++){
    var bh=Math.max(4, Math.round(vals[i]*scale)), x=x0+i*(bw+gap);
    s+='<rect x="'+x+'" y="'+(y0-bh)+'" width="'+bw+'" height="'+bh+'" rx="3" fill="#67e8f9" stroke="#0891b2" stroke-width="1.5"/>';
    s+='<text x="'+(x+bw/2)+'" y="'+(y0-bh-6)+'" font-size="13" text-anchor="middle" fill="#f59e0b" font-weight="bold">'+vals[i]+unit+'</text>';
    s+='<text x="'+(x+bw/2)+'" y="'+(y0+16)+'" font-size="12" text-anchor="middle" fill="#64748b">'+labels[i]+'</text>';
  }
  return s+'</svg>';
}
function gxLineSVG(title, labels, vals, unit){
  var max=Math.max.apply(null, vals), min=Math.min.apply(null, vals);
  var w=320, h=185, x0=34, y0=150, dx=(w-x0-18)/(vals.length-1), span=Math.max(1, max-min), scale=95/span;
  var pts=vals.map(function(v,i){ return [x0+i*dx, y0-14-Math.round((v-min)*scale)]; });
  var s='<svg viewBox="0 0 '+w+' '+h+'" width="100%" style="max-width:330px">';
  s+='<text x="'+(w/2)+'" y="16" font-size="13" text-anchor="middle" fill="#64748b" font-weight="bold">'+title+'</text>';
  s+='<line x1="'+(x0-8)+'" y1="'+y0+'" x2="'+(w-8)+'" y2="'+y0+'" stroke="#94a3b8" stroke-width="2"/>';
  s+='<polyline points="'+pts.map(function(p){ return p[0]+','+p[1]; }).join(' ')+'" fill="none" stroke="#67e8f9" stroke-width="3"/>';
  for(var i=0;i<pts.length;i++){
    s+='<circle cx="'+pts[i][0]+'" cy="'+pts[i][1]+'" r="4" fill="#0891b2"/>';
    s+='<text x="'+pts[i][0]+'" y="'+(pts[i][1]-9)+'" font-size="12" text-anchor="middle" fill="#f59e0b" font-weight="bold">'+vals[i]+'</text>';
    s+='<text x="'+pts[i][0]+'" y="'+(y0+16)+'" font-size="11" text-anchor="middle" fill="#64748b">'+labels[i]+'</text>';
  }
  return s+'</svg>';
}

(function(){
  if(typeof mathGens==='undefined') return;
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function pk(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  // 重複しない値を4つ（差の計算が一意になるよう全ペアの差もユニークにしない緩条件＝値のみ重複禁止）
  function distinctVals(lo,hi,n){
    var out=[], guard=0;
    while(out.length<n && guard<200){ guard++; var v=ri(lo,hi); if(out.indexOf(v)<0) out.push(v); }
    return out;
  }
  function numChoices4(ans){
    var set=[ans], guard=0;
    while(set.length<4 && guard<100){ guard++; var d=ans+pk([-3,-2,-1,1,2,3,4,5])*pk([1,2]); if(d>0 && set.indexOf(d)<0) set.push(d); }
    return (typeof shuffleArr==='function'? shuffleArr(set):set).map(String);
  }

  var BAR_THEMES=[
    { title:'クラスで すきなスポーツの人数', labels:['サッカー','野球','水泳','卓球'], unit:'人', lo:3, hi:14, thing:'人数' },
    { title:'図書館で かりた本の さっ数（1週間）', labels:['月','火','水','木'], unit:'さつ', lo:5, hi:20, thing:'さっ数' },
    { title:'ある店の くだものの売れた数', labels:['りんご','みかん','バナナ','もも'], unit:'こ', lo:8, hi:30, thing:'売れた数' }
  ];
  // 棒グラフ：最大を読む（★★☆・math）
  mathGens.push(function(){
    var t=pk(BAR_THEMES), vals=distinctVals(t.lo,t.hi,4);
    var mi=vals.indexOf(Math.max.apply(null,vals));
    return { q:'【グラフ】'+t.thing+'が いちばん多いのは どれ？', figure:gxBarSVG(t.title,t.labels,vals,t.unit),
      type:'choice', choices:t.labels.slice(), ans:t.labels[mi],
      sub:'グラフの読み取り（棒）', level:'★★☆', hint:'いちばん高い棒をさがそう',
      explain:'【考え方】棒の高さ＝'+t.thing+'。いちばん高いのは'+t.labels[mi]+'（'+vals[mi]+t.unit+'）。' };
  });
  // 棒グラフ：差を計算（★★★・math）
  mathGens.push(function(){
    var t=pk(BAR_THEMES), vals=distinctVals(t.lo,t.hi,4);
    var i=ri(0,3), j=(i+ri(1,3))%4, diff=Math.abs(vals[i]-vals[j]);
    return { q:'【グラフ】「'+t.labels[i]+'」と「'+t.labels[j]+'」の'+t.thing+'の差は いくつ？', figure:gxBarSVG(t.title,t.labels,vals,t.unit),
      type:'choice', choices:numChoices4(diff), ans:String(diff),
      sub:'グラフの読み取り（棒）', level:'★★★', hint:'大きい方から小さい方をひく',
      explain:'【手順】'+Math.max(vals[i],vals[j])+'−'+Math.min(vals[i],vals[j])+'＝'+diff+'。' };
  });
  // 折れ線グラフ：最高の月（★★☆・science）
  if(typeof sciGens!=='undefined') sciGens.push(function(){
    var months=['4月','5月','6月','7月','8月','9月'];
    var vals=distinctVals(8,32,6).sort(function(a,b){ return a-b; });
    // 気温らしい山なり（8月ごろ最高）に並べ替え：小さい順→[0,2,4,5,3,1]の位置へ
    var shaped=[vals[0],vals[2],vals[4],vals[5],vals[3],vals[1]];
    var mi=shaped.indexOf(Math.max.apply(null,shaped));
    var mcs=[months[mi]]; while(mcs.length<4){ var mm=pk(months); if(mcs.indexOf(mm)<0) mcs.push(mm); }
    return { q:'【グラフ】気温が いちばん高いのは 何月？', figure:gxLineSVG('ある町の月別平均気温（℃）',months,shaped,'℃'),
      type:'choice', choices:(typeof shuffleArr==='function'?shuffleArr(mcs):mcs), ans:months[mi],
      sub:'グラフの読み取り（折れ線）', level:'★★☆', hint:'いちばん高い点をさがそう',
      explain:'【考え方】折れ線のいちばん高い点＝最高気温。'+months[mi]+'（'+shaped[mi]+'℃）。' };
  });
  // 折れ線グラフ：2点の差（★★★・science）
  if(typeof sciGens!=='undefined') sciGens.push(function(){
    var months=['4月','5月','6月','7月','8月','9月'];
    var vals=distinctVals(8,32,6).sort(function(a,b){ return a-b; });
    var shaped=[vals[0],vals[2],vals[4],vals[5],vals[3],vals[1]];
    var i=ri(0,5), j=(i+ri(1,5))%6, diff=Math.abs(shaped[i]-shaped[j]);
    return { q:'【グラフ】'+months[i]+'と'+months[j]+'の気温の差は 何℃？', figure:gxLineSVG('ある町の月別平均気温（℃）',months,shaped,'℃'),
      type:'choice', choices:numChoices4(diff), ans:String(diff),
      sub:'グラフの読み取り（折れ線）', level:'★★★', hint:'2つの点の値をよみとって ひき算',
      explain:'【手順】'+Math.max(shaped[i],shaped[j])+'−'+Math.min(shaped[i],shaped[j])+'＝'+diff+'℃。' };
  });
  // 棒グラフ：収穫量の資料読み取り（★★☆〜・social）
  if(typeof socGens!=='undefined') socGens.push(function(){
    var t={ title:'ある県の やさいの収かく量', labels:['キャベツ','はくさい','レタス','ねぎ'], unit:'トン', lo:10, hi:60, thing:'収かく量' };
    var vals=distinctVals(t.lo,t.hi,4);
    var mi=vals.indexOf(Math.max.apply(null,vals)), mn=vals.indexOf(Math.min.apply(null,vals));
    var askMax=Math.random()<0.5;
    return { q:'【資料】収かく量が いちばん'+(askMax?'多い':'少ない')+'のは どれ？', figure:gxBarSVG(t.title,t.labels,vals,t.unit),
      type:'choice', choices:t.labels.slice(), ans:t.labels[askMax?mi:mn],
      sub:'資料の読み取り', level:'★★☆', hint:(askMax?'いちばん高い':'いちばん低い')+'棒をさがそう',
      explain:'【考え方】棒の高さをくらべる。'+t.labels[askMax?mi:mn]+'（'+vals[askMax?mi:mn]+t.unit+'）。' };
  });
})();
