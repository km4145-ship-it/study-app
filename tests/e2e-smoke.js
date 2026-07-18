'use strict';
/* E2E スモークテスト：実アプリをヘッドレス Chrome で起動し、実際の画面フローを機械検証する。
   このセッション群で確立した手法の正式化：
   - index.html のコピーに「エラー捕捉＋ユーザー種まき＋自動運転」フックを注入
   - ローカル http サーバで配信（file:// だと挙動が変わるため）
   - --host-resolver-rules で外部ネットワーク遮断（本番 Firestore に触れない）
   - --virtual-time-budget + --dump-dom で document.title に書いた計測結果を回収
   実績：この方式で「保存キーのユーザー別登録漏れ」「タブバー重なり」等を実際に検出した。
   Chrome が無い環境（CI等）ではスキップする（int-build の esbuild スキップと同じ流儀）。 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('e2e-smoke');

// ---- Chrome を探す（無ければスキップ）----
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium',
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
if (!CHROME) { console.log('  - Chrome が見つからないためスキップ（CHROME_PATH で指定可）'); c.done(); return; }

// ---- 自動運転ページを生成 ----
const DRIVER = '_e2e_drive.html';
function buildDriver() {
  let h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const hook = `<script>
window.__errs=[];
window.addEventListener("error",function(e){window.__errs.push((e.message||"?")+"@"+(e.filename||"").split("/").pop()+":"+e.lineno);});
try{
  localStorage.setItem("mu_users", JSON.stringify([{id:"u1",name:"テスト",char:"girl",admin:true,startYear:2020}]));
  localStorage.setItem("mu_current","u1");
  sessionStorage.setItem("mu_enter","1");
}catch(e){}
window.addEventListener("load",function(){
  var R={errs:window.__errs};
  setTimeout(function(){ try{ startApp(); }catch(e){ R.startErr=e.message; } },1000);
  setTimeout(function(){ try{ muPickUser("u1"); }catch(e){ R.pickErr=e.message; } },2200);
  // 起動スモーク：キャラ表示（3D or SVG フォールバック）とスタートミニ
  setTimeout(function(){
    try{
      var cd=document.getElementById("char-display");
      R.boot={ charDisplay: !!(cd && cd.innerHTML.length>40),
               minis: document.querySelectorAll("#start-chars-display .start-mini").length };
    }catch(e){ R.bootErr=e.message; }
  },8500);
  // 実フロー：おまかせではなく決定的に standard 練習 → 全問正解 → 結果画面
  setTimeout(function(){ try{ startDifficulty("math","std"); }catch(e){ R.diffErr=e.message; } },9000);
  var finished=false;
  setTimeout(function(){
    var iv=setInterval(function(){
      try{
        if(finished) return;
        var rs=document.getElementById("result-screen");
        if(rs && rs.classList.contains("active")){
          finished=true; clearInterval(iv);
          var rr=document.getElementById("result-rating");
          var rating=null; try{ rating=JSON.parse(localStorage.getItem("u:u1:practice_rating")); }catch(e){}
          R.session={ result:true,
            ratingShown: !!(rr && rr.textContent.indexOf("じつりょくメーター")>=0),
            ratingSaved: !!(rating && rating.by && rating.by.math && rating.by.math.n>=10) };
          R.errCount=window.__errs.length;
          document.title="E2E:"+JSON.stringify(R);
          return;
        }
        if(typeof answered!=="undefined" && !answered && currentQuestions && currentQuestions[currentIndex]){
          var q=currentQuestions[currentIndex]; qStartTime=Date.now()-6000;
          if(q.type==="choice"){ checkChoice(q.ans, document.createElement("button")); }
          else { var inp=document.getElementById("answer-input"); if(inp){ inp.disabled=false; inp.value=q.ans; checkFreeAnswer(); } }
        } else if(typeof answered!=="undefined" && answered){ nextQuestion(); }
      }catch(e){ if(!finished){ finished=true; document.title="E2E:"+JSON.stringify({loopErr:e.message, errs:window.__errs}); } }
    },350);
  },9600);
  // 保険：どこかで詰まっても状態を出力
  setTimeout(function(){ if(!finished){ document.title="E2E:"+JSON.stringify({timeout:true, R:R, errs:window.__errs}); } },24000);
});
<\/script>`;
  h = h.replace('<head>', '<head>' + hook);
  fs.writeFileSync(path.join(ROOT, DRIVER), h);
}

// ---- ローカルサーバ ----
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/json' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '') || 'index.html');
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(fs.readFileSync(p));
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// Chrome は --dump-dom 後の終了が遅い（数分残る）ことがあるため、
// spawn で stdout を読み、ダンプ完了（</html>）を検知したら自分で kill する
function runChrome(url) {
  return new Promise((resolve) => {
    const child = spawn(CHROME, [
      '--headless=new', '--use-angle=swiftshader', '--disable-extensions', '--no-first-run',
      // 外部遮断＝本番Firestoreに触れない。除外は localhost のみ＝URLも必ず localhost を使う
      // （127.0.0.1 だと遮断されて Chrome のエラーページを検証してしまう罠がある）
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost',
      '--window-size=500,900', '--virtual-time-budget=26000', '--dump-dom', url,
    ]);
    let out = '', done = false;
    const finish = () => { if (done) return; done = true; try { child.kill('SIGKILL'); } catch (e) {} resolve(out); };
    child.stdout.on('data', (d) => { out += d; if (out.includes('</html>')) setTimeout(finish, 200); });
    child.on('exit', finish);
    child.on('error', finish);
    setTimeout(finish, 110000);   // 保険タイムアウト
  });
}

(async () => {
  buildDriver();
  const srv = await serve();
  const port = srv.address().port;
  let title = '';
  try {
    const out = await runChrome('http://localhost:' + port + '/' + DRIVER);
    const tm = out.match(/<title>E2E:([\s\S]*?)<\/title>/);
    title = tm ? tm[1] : '';
    if (!tm) {   // 診断：何が返ったか（タイトル・エラーバナー等）を残す
      const t2 = out.match(/<title>([\s\S]*?)<\/title>/);
      console.log('  - 診断: title=' + JSON.stringify(t2 ? t2[1].slice(0, 200) : '(no title)') + ' domSize=' + out.length);
    }
  } catch (e) {
    c.ok('Chrome 実行に失敗: ' + String(e.message).slice(0, 120), false);
  } finally {
    srv.close();
    if (title) { try { fs.unlinkSync(path.join(ROOT, DRIVER)); } catch (e) {} }   // 失敗時は検分用に残す
  }

  let R = null;
  try { R = JSON.parse(title.replace(/&quot;/g, '"').replace(/&amp;/g, '&')); } catch (e) {}
  c.ok('自動運転の計測結果を回収できた', !!R);
  if (R) {
    c.ok('起動時にJSエラーなし（' + JSON.stringify((R.errs || []).slice(0, 2)) + '）', (R.errs || []).length === 0);
    c.ok('キャラが表示されている（3D or SVG）', !!(R.boot && R.boot.charDisplay));
    c.ok('スタート画面ミニキャラ12体', !!(R.boot && R.boot.minis === 12));
    c.ok('練習10問→結果画面に到達', !!(R.session && R.session.result));
    c.ok('結果画面にじつりょくメーター表示', !!(R.session && R.session.ratingShown));
    c.ok('実力レートがユーザー別に保存', !!(R.session && R.session.ratingSaved));
  }
  c.done();
})();
