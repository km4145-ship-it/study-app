'use strict';
// 分離した js/generators.js（問題ジェネレーター）が、実際に各教科の有効な問題を
// 生成できることを検証する（構文だけでなく“挙動”を確認）。
// generators.js は読み込み時に BANK へ登録するため、questions-extra.js を先に読む。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-generators');

const bank = fs.readFileSync(path.join(ROOT, 'js', 'questions-extra.js'), 'utf8');
const gen = fs.readFileSync(path.join(ROOT, 'js', 'generators.js'), 'utf8');
function buildGenQuestion(band) {
  return (new Function('muGradeBand', bank + '\n' + gen + '\nreturn genQuestion;'))(() => band);
}

const gqJhs = buildGenQuestion('jhs');
['math', 'japanese', 'english', 'science', 'social'].forEach((s) => {
  let ok = 0;
  for (let i = 0; i < 40; i++) { const q = gqJhs(s); if (q && typeof q.q === 'string' && q.q.length > 0 && q.ans !== undefined) ok++; }
  c.ok('中学モード ' + s + '：genQuestion 40回すべて有効な問題', ok === 40);
});

const gqElem = buildGenQuestion('elem');
['math', 'japanese'].forEach((s) => {
  let ok = 0;
  for (let i = 0; i < 30; i++) { const q = gqElem(s); if (q && q.q && q.ans !== undefined) ok++; }
  c.ok('小学モード ' + s + '：genQuestion 30回すべて有効', ok === 30);
});

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
c.ok('index.html は genQuestion を再定義しない', html.indexOf('function genQuestion(') < 0);
c.ok('index.html は js/generators.js を読み込む', html.indexOf('<script src="js/generators.js') >= 0);
c.ok('読み込み順: questions-extra が generators の前', html.indexOf('js/questions-extra.js') < html.indexOf('js/generators.js'));

// ---- ⑤ コンテンツ穴埋め：小5-6分数四則・中学文章題（存在＋計算の正しさ）----
{
  function gcd(a,b){ a=Math.abs(a);b=Math.abs(b); while(b){var t=b;b=a%b;a=t;} return a||1; }
  function red(n,d){ var g=gcd(n,d); n/=g; d/=g; return d===1?(''+n):(n+'/'+d); }
  var elemSubs={}, elemChk=0, elemBad=0;
  for(var i=0;i<20000;i++){ var q=gqElem('math'); if(!q||!q.sub) continue;
    if(q.sub.indexOf('約分')<0 && q.sub.indexOf('異分母')<0 && q.sub.indexOf('分数×')<0 && q.sub.indexOf('分数÷')<0 && q.sub.indexOf('通分')<0) continue;
    elemSubs[q.sub]=1; var m,exp=null;
    if((m=q.q.match(/^(\d+)\/(\d+) \+ (\d+)\/(\d+) = \?$/))&&q.sub.indexOf('異分母')>=0){ var a=+m[1],b=+m[2],cc=+m[3],d=+m[4]; exp=red(a*d+cc*b,b*d); }
    else if((m=q.q.match(/^(\d+)\/(\d+) − (\d+)\/(\d+) = \?$/))&&q.sub.indexOf('異分母')>=0){ exp=red((+m[1])*(+m[4])-(+m[3])*(+m[2]),(+m[2])*(+m[4])); }
    else if((m=q.q.match(/^(\d+)\/(\d+) × (\d+)\/(\d+) = \?$/))){ exp=red((+m[1])*(+m[3]),(+m[2])*(+m[4])); }
    else if((m=q.q.match(/^(\d+)\/(\d+) ÷ (\d+)\/(\d+) = \?$/))){ exp=red((+m[1])*(+m[4]),(+m[2])*(+m[3])); }
    else if((m=q.q.match(/^(\d+)\/(\d+) × (\d+) = \?$/))){ exp=red((+m[1])*(+m[3]),+m[2]); }
    else if((m=q.q.match(/^(\d+)\/(\d+) ÷ (\d+) = \?$/))){ exp=red(+m[1],(+m[2])*(+m[3])); }
    else if((m=q.q.match(/^(\d+)\/(\d+) を これ以上/))&&q.sub==='約分'){ exp=red(+m[1],+m[2]); }
    if(exp!==null){ elemChk++; if(q.ans!==exp) elemBad++; }
  }
  c.ok('小5-6：異分母加減が出題される', !!elemSubs['分数のたし算（異分母）'] && !!elemSubs['分数のひき算（異分母）']);
  c.ok('小5-6：分数×÷が出題される', !!elemSubs['分数×分数'] && !!elemSubs['分数÷分数'] && !!elemSubs['分数×整数'] && !!elemSubs['分数÷整数']);
  c.ok('小5-6：約分・通分が出題される', !!elemSubs['約分'] && !!elemSubs['通分']);
  c.ok('分数四則の答えが計算と一致（'+elemChk+'件検算・約分済み）', elemChk>200 && elemBad===0);

  var jhsSubs={}, jhsChk=0, jhsBad=0;
  for(var j=0;j<30000;j++){ var w=gqJhs('math'); if(!w||!w.sub||w.sub.indexOf('文章題')<0) continue; jhsSubs[w.sub]=1;
    var mm,ex=null;
    if((mm=w.q.match(/ある数を(\d+)倍して(\d+)をたすと(\d+)/))) ex=String(((+mm[3])-(+mm[2]))/(+mm[1]));
    else if((mm=w.q.match(/連続する2つの整数の 和が(\d+)/))) ex=String(((+mm[1])-1)/2);
    else if((mm=w.q.match(/分速(\d+)mで 歩くと(\d+)分/))) ex=String((+mm[1])*(+mm[2]));
    else if((mm=w.q.match(/ある数の(\d+)%が(\d+)/))) ex=String((+mm[2])/((+mm[1])/100));
    if(ex!==null){ jhsChk++; if(w.ans!==ex) jhsBad++; }
  }
  c.ok('中学：文章題が複数種 出題される', Object.keys(jhsSubs).length>=5);
  c.ok('中学文章題の答えが計算と一致（'+jhsChk+'件検算）', jhsChk>200 && jhsBad===0);
}
c.done();
