'use strict';
/* ビジュアル回帰スクショハーネス（run-all対象外・手動ツール）。
   実アプリをヘッドレスChromeで起動し、主要画面のスクリーンショットを tests/screens/ に保存する。
   e2e-smoke.js のレシピ（フック注入＋ローカルサーバ＋外部遮断）と、preview-chest.html の
   「rAFが仮想時間でほぼ発火しない→ミキサーを手動で進めて強制レンダリング」手法の合成。

   使い方:
     npm run preview             … 全画面を tests/screens/ へ
     node tests/preview-screens.js --only=gacha,dress
     node tests/preview-screens.js --out=tests/screens/before   … 変更前後の比較用に出力先を変える
   出力はgit管理外（.gitignore）。生成後に tests/screens/index.html を開くと一覧できる。 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const ROOT = path.join(__dirname, '..');

const CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium',
].filter(Boolean).find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
if (!CHROME) { console.log('Chrome が見つかりません（CHROME_PATH で指定可）'); process.exit(1); }

const args = process.argv.slice(2);
const OUT = path.join(ROOT, (args.find((a) => a.startsWith('--out=')) || '--out=tests/screens').slice(6));
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

// 画面ごとの操作（アプリ起動＋ユーザー選択のあとに実行するJS）。
// battleは出題フローが絡むため対象外（e2e-smokeが機能面をカバー）。
const SCREENS = [
  { name: 'home',    drive: "muNav('home')" },
  { name: 'adv',     drive: "muNav('adv')" },
  { name: 'gacha',   drive: "muNav('gacha')" },
  { name: 'dress',   drive: "muNav('dress')" },
  { name: 'records', drive: "muNav('rec')" },
  { name: 'aibou',   drive: 'rpgShowAibou()' },
  { name: 'dex',     drive: 'rpgShowDex()' },
  { name: 'ranking', drive: 'showRanking()' },
  { name: 'shop',    drive: 'gachaShowShop()' },
  { name: 'odds',    drive: 'gachaShowOdds()' },
  { name: 'reveal',  drive: 'rpgGachaDraw()', wait: 8200 },      // 単発開封（エピックでも開封後＝開いた宝箱＋3Dアイテムまで到達）
  { name: 'g10',     drive: 'rpgGacha10Reveal(_gachaDrawInto(rpgCosState(rpgState()),10,rpgState()))' },  // タップ開封の選択画面
];

// 見ばえのするテストデータ：コイン・所持品・装備・あいぼう（ぼうし付き）・図鑑
const SEED = `
try{
  localStorage.setItem("mu_users", JSON.stringify([{id:"u1",name:"テスト",char:"girl",admin:true,startYear:2020},{id:"u2",name:"いもうと",char:"rabbit",startYear:2022}]));
  localStorage.setItem("mu_current","u1");
  sessionStorage.setItem("mu_enter","1");
  localStorage.setItem("u:u1:rpg_state", JSON.stringify({ v:1, level:7, xp:800,
    cleared:{}, coll:{}, crystals:{math:1,japanese:1}, story:{prologue:1}, dex:{slime:1,goblin:1,wolf:1,bat:1}, stickers:{"⭐":1},
    pet:{stage:1,wins:9,name:"ぽち",fed:""},
    aibou:{ roster:{ m1:{id:"m1",art:"slime",sp:"slime",rank:"B",lv:6,xp:0,name:"スラりん",hat:"ah_ribbon"},
                     m2:{id:"m2",art:"wolf",sp:"beast",rank:"A",lv:9,xp:0,name:"ウルフ"} }, party:["m1","m2"], food:12, charm:1 },
    daily:{date:"",correct:0,wins:0,maxStreak:0,claimed:{}}, login:{last:"",streak:3}, stamina:{date:"",used:0},
    cos:{ coin:5000, tickets:2, welcome:1, pity:23,
      owned:{h_crown:1,bk_angel:1,rd_cloud:1,ah_ribbon:1,a_star:1,fr_gold:1,d_sword:1},
      equip:{ hero:{hat:"h_crown",hand:"d_sword",back:"bk_angel",ride:"rd_cloud",aura:"a_star",frame:"fr_gold"}, pet:{} },
      titles:{}, sets:{} } }));
  localStorage.setItem("u:u1:c_answered","1234");
  localStorage.setItem("u:u1:c_points","5678");
  localStorage.setItem("u:u1:gacha_pulls","17");
  localStorage.setItem("u:u1:gacha_wish","set_sky");
  localStorage.setItem("u:u1:gacha_log", JSON.stringify([
    {t:Date.now()-86400000,id:"h_crown",em:"👑",nm:"おうかん",r:"SR",d:0,g:0},
    {t:Date.now(),id:"g_food_s",em:"🍖",nm:"エサ ×5",r:"N",d:0,g:1}]));
}catch(e){}`;

function buildDriver(screen) {
  let h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const hook = `<script>
window.__errs=[];
window.addEventListener("error",function(e){window.__errs.push((e.message||"?")+"@"+(e.filename||"").split("/").pop()+":"+e.lineno);});
${SEED}
window.addEventListener("load",function(){
  setTimeout(function(){ try{ startApp(); }catch(e){} },800);
  setTimeout(function(){ try{ muPickUser("u1"); }catch(e){} },1800);
  // muPickUserはクラウド復元待ち等で数秒かかる（e2e-smokeと同じ）＝画面遷移は十分あとに
  setTimeout(function(){ try{ ${screen.drive}; }catch(e){ document.title="DRIVE-ERR:"+e.message; } },9500);
  // ヘッドレスはrAFがほぼ発火しない＝3Dミキサーを終端まで手動で進めて強制レンダリング
  setTimeout(function(){ try{ _c3dViews.forEach(function(v){ if(v.mixer) v.mixer.update(3); _c3dRenderInto(v.char, v.ctx, 260, 325); }); }catch(e){} }, ${9500 + (screen.wait || 1400)});
});
<\/script>`;
  const driver = '_preview_' + screen.name + '.html';
  fs.writeFileSync(path.join(ROOT, driver), h.replace('<head>', '<head>' + hook));
  return driver;
}

function serve() {
  return new Promise((resolve) => {
    const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/json', '.png': 'image/png', '.m4a': 'audio/mp4' };
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '') || 'index.html');
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(fs.readFileSync(p));
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function shoot(url, outPng, budget) {
  return new Promise((resolve) => {
    const child = spawn(CHROME, [
      '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-extensions', '--no-first-run',
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost',
      '--window-size=500,900', '--virtual-time-budget=' + budget, '--screenshot=' + outPng, url,
    ]);
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch (e) {} resolve(); }, 60000);
    child.on('exit', () => { clearTimeout(t); resolve(); });
    child.on('error', () => { clearTimeout(t); resolve(); });
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const targets = SCREENS.filter((s) => !ONLY.length || ONLY.includes(s.name));
  const srv = await serve();
  const port = srv.address().port;
  const done = [];
  for (const s of targets) {
    const driver = buildDriver(s);
    const out = path.join(OUT, s.name + '.png');
    const budget = 9500 + (s.wait || 1400) + 1600;
    await shoot('http://localhost:' + port + '/' + driver, out, budget);
    const ok = fs.existsSync(out) && fs.statSync(out).size > 2000;
    console.log((ok ? '📸 ' : '❌ ') + s.name + (ok ? '' : '（撮影失敗）'));
    if (ok) done.push(s.name);
    try { fs.unlinkSync(path.join(ROOT, driver)); } catch (e) {}
  }
  srv.close();
  // 一覧ページ（コンタクトシート）
  const sheet = '<!doctype html><meta charset="utf-8"><title>screens</title>' +
    '<body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;display:flex;flex-wrap:wrap;gap:14px;padding:14px">' +
    done.map((n) => '<figure style="margin:0"><figcaption>' + n + '</figcaption><img src="' + n + '.png" style="width:250px;border:1px solid #334155"></figure>').join('') + '</body>';
  fs.writeFileSync(path.join(OUT, 'index.html'), sheet);
  console.log('→ ' + path.relative(ROOT, OUT) + '/index.html で一覧できます（' + done.length + '/' + targets.length + '枚）');
})();
