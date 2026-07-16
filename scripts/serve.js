'use strict';
/* ローカル確認用の開発サーバー。キャッシュを一切効かせない（no-store）ので、
   js/*.js や index.html を編集したら「ふつうのリロード」だけで最新が反映される
   （Cmd+Shift+R での強制リロードは不要）。
   ※本番(GitHub Pages)は app.min.js + version.json による自動更新が別途効くので、
     そちらは端末側のキャッシュクリア不要（この開発サーバーは push 前の手元確認用）。
   使い方:  npm run serve            → http://localhost:8766/
            npm run serve 9000       → ポート指定 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = parseInt(process.argv[2] || process.env.PORT || '8766', 10);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

const srv = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '') || 'index.html';
  let p = path.join(ROOT, rel);
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    res.writeHead(404, { 'Cache-Control': 'no-store' }); res.end('404 not found'); return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(p)] || 'application/octet-stream',
    // キャッシュを完全に無効化：手元の編集が必ず反映される
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache', 'Expires': '0',
  });
  res.end(fs.readFileSync(p));
});

srv.listen(PORT, '127.0.0.1', () => {
  console.log('▶ 開発サーバー起動： http://localhost:' + PORT + '/');
  console.log('   （no-store 配信＝ふつうのリロードで常に最新。強制リロード不要）');
});
