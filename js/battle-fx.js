/* battle-fx.js — バトル演出ライブラリ（DOM生成のみ・共通CSSクラス前提）。tactics-arena / study-app 共用。
   ここは「演出の DOM 生成」だけ＝ゲームロジックに触れない。盤要素/セルpx/色は呼び出し側が渡す。
   必要CSS（アプリ側 index.html に定義）:
     .a-toast(.show) / .a-cutin(.go/.out)>.a-cutin-bar(.a-cutin-em/.a-cutin-tx) /
     .a-flash(.dai) / .a-pop(.dmg/.weak/.crit/.miss) / .a-boardflash(.crit) / .a-burst>i(--dx/--dy)
   ※CSSは各アプリの意匠に委ねるため同梱しない（クラス名の契約だけ共有）。 */
(function (root) {
  'use strict';
  var D = (typeof document !== 'undefined') ? document : null;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function _mk(cls) { var el = D.createElement('div'); el.className = cls; return el; }

  // 画面下トースト（HTML可・自動消去）
  function bfxToast(html) { if (!D) return; var t = _mk('a-toast'); t.innerHTML = html; D.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 20);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { try { D.body.removeChild(t); } catch (e) {} }, 400); }, 2400); }

  // 登場カットイン（画面横断ネームバー・スライドイン→アウト）
  function bfxCutin(name) { if (!D) return; var ov = _mk('a-cutin');
    ov.innerHTML = '<div class="a-cutin-bar"><span class="a-cutin-em">👑</span><span class="a-cutin-tx"><b>' + esc(name) + '</b><small>あらわれた！</small></span></div>';
    D.body.appendChild(ov);
    setTimeout(function () { ov.classList.add('go'); }, 20);
    setTimeout(function () { ov.classList.add('out'); }, 1150);
    setTimeout(function () { try { D.body.removeChild(ov); } catch (e) {} }, 1650); }

  // 全画面フラッシュ（kind でカラー：''／boss／dai）
  function bfxFlash(kind) { if (!D) return; var f = _mk('a-flash ' + (kind || '')); D.body.appendChild(f);
    setTimeout(function () { try { D.body.removeChild(f); } catch (e) {} }, 720); }

  // 盤上ポップアップ（board=盤要素・cp=セルpx）
  function bfxPopup(board, cp, x, y, text, cls) { if (!D || !board) return; var el = _mk('a-pop ' + (cls || 'dmg')); el.textContent = text;
    el.style.left = (x * (cp + 3) + cp * 0.15) + 'px'; el.style.top = (y * (cp + 3) - 2) + 'px'; board.appendChild(el);
    setTimeout(function () { try { board.removeChild(el); } catch (e) {} }, 1000); }

  // 盤フラッシュ（会心/被弾）
  function bfxBoardFlash(board, kind) { if (!D || !board) return; var el = _mk('a-boardflash ' + (kind || '')); board.appendChild(el);
    setTimeout(function () { try { board.removeChild(el); } catch (e) {} }, 360); }

  // 命中バースト（8粒放射・color=粒の色）
  function bfxHitBurst(board, cp, x, y, color) { if (!D || !board) return; var col = color || '#fca5a5';
    var cx = x * (cp + 3) + cp * 0.5, cy = y * (cp + 3) + cp * 0.5; var wrap = _mk('a-burst'); wrap.style.left = cx + 'px'; wrap.style.top = cy + 'px';
    for (var i = 0; i < 8; i++) { var p = D.createElement('i'); var ang = (Math.PI * 2 / 8) * i, d = cp * 0.5;
      p.style.background = col; p.style.setProperty('--dx', (Math.cos(ang) * d).toFixed(1) + 'px'); p.style.setProperty('--dy', (Math.sin(ang) * d).toFixed(1) + 'px'); wrap.appendChild(p); }
    board.appendChild(wrap); setTimeout(function () { try { board.removeChild(wrap); } catch (e) {} }, 520); }

  var api = { bfxEsc: esc, bfxToast: bfxToast, bfxCutin: bfxCutin, bfxFlash: bfxFlash, bfxPopup: bfxPopup, bfxBoardFlash: bfxBoardFlash, bfxHitBurst: bfxHitBurst };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  for (var k in api) { root[k] = api[k]; }
})(typeof window !== 'undefined' ? window : globalThis);
