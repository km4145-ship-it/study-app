'use strict';
// cloud-sync.js を Node 上で起動するための共有スタブハーネス
// （Firestore / localStorage / firebase / document をスタブし、実ファイルを eval する）
const fs = require('fs');

function makeLS() {
  const m = {};
  const api = {
    _m: m,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: (k) => { delete m[k]; },
    key: (i) => Object.keys(m)[i],
    clear: () => { Object.keys(m).forEach((k) => delete m[k]); },
  };
  Object.defineProperty(api, 'length', { get: () => Object.keys(m).length });
  return api;
}

// Firestore の set({merge:true}) を模した再帰マージ
function deepMerge(a, b) {
  a = (a && typeof a === 'object') ? a : {};
  const o = Object.assign({}, a);
  Object.keys(b || {}).forEach((k) => {
    const bv = b[k];
    if (bv && typeof bv === 'object' && !Array.isArray(bv) && a[k] && typeof a[k] === 'object') o[k] = deepMerge(a[k], bv);
    else o[k] = bv;
  });
  return o;
}

// mode: 'ok' | 'deny'(read/write全失敗) | 'noread'(read失敗) | 'parentfail'(親docのreadだけ失敗)
function createHarness(opts) {
  opts = opts || {};
  const mode = opts.mode || 'ok';
  const store = opts.store || {};
  const setCalls = [];
  const statuses = [];

  function fail(p, kind) {
    if (mode === 'deny') return true;
    if (mode === 'noread' && kind === 'read') return true;
    if (mode === 'parentfail' && kind === 'read' && p === 'families/0000') return true;
    return false;
  }
  function snap(p) { return { exists: store[p] !== undefined, data: () => store[p], metadata: { hasPendingWrites: false } }; }
  function docRef(p) {
    return {
      get: () => (fail(p, 'read') ? Promise.reject({ code: 'unavailable' }) : Promise.resolve(snap(p))),
      set: (obj, o) => { if (fail(p, 'write')) return Promise.reject({ code: 'unavailable' }); setCalls.push(p); store[p] = (o && o.merge) ? deepMerge(store[p] || {}, obj) : obj; return Promise.resolve(); },
      delete: () => { delete store[p]; return Promise.resolve(); },
      onSnapshot: (cb, err) => { Promise.resolve().then(() => { if (fail(p, 'read')) { if (err) err({ code: 'unavailable' }); } else { try { cb(snap(p)); } catch (e) {} } }); return () => {}; },
      collection: (n) => collRef(p + '/' + n),
    };
  }
  function collRef(p) {
    return {
      doc: (id) => docRef(p + '/' + id),
      get: () => Promise.resolve({ forEach: (f) => { Object.keys(store).filter((k) => k.indexOf(p + '/') === 0 && k.slice(p.length + 1).indexOf('/') < 0).forEach((k) => f({ id: k.slice(p.length + 1), ref: docRef(k), data: () => store[k] })); } }),
    };
  }
  const db = { collection: (n) => collRef(n), enablePersistence: () => Promise.resolve() };
  const LS = makeLS(), SS = makeLS();
  const g = global;
  g.window = g; g.localStorage = LS; g.sessionStorage = SS;
  // Node 20+ の組み込み navigator は読み取り専用なので防御的に（cloud-sync.js は navigator 未使用）
  try { if (!g.navigator) g.navigator = { storage: { persist: () => Promise.resolve(true) } }; } catch (e) { /* 組み込みを使う */ }
  g.addEventListener = () => {};
  g.document = { head: { appendChild: (el) => setTimeout(() => el.onload && el.onload(), 0) }, body: { appendChild: () => {} }, createElement: () => ({}), getElementById: () => null, visibilityState: 'hidden', addEventListener: () => {} };
  g.muOnCloudStatus = (st, r) => statuses.push([st, r || '']);
  g.muOnCloudUpdate = () => {};
  g.firebase = { initializeApp: () => {}, auth: () => ({ signInAnonymously: () => Promise.resolve({}) }), firestore: Object.assign(() => db, { FieldValue: { serverTimestamp: () => '__TS__' } }) };

  return {
    store, LS, SS, setCalls, statuses,
    load: (fullPath) => { (0, eval)(fs.readFileSync(fullPath, 'utf8')); },   // 間接eval＝グローバルスコープで実行
    settle: async (ticks = 8, ms = 40) => { for (let i = 0; i < ticks; i++) await new Promise((r) => setTimeout(r, ms)); },
    get: (k) => LS.getItem(k),
  };
}

module.exports = { createHarness, makeLS };
