'use strict';
// workers/tts-proxy/（Cloudflare Workers版TTSプロキシ）を検証。
// lib/*.js はES moduleかつWeb標準API（crypto.subtle/fetch）のみに依存＝Node単体でテストできる。
// このテストファイル自体はCommonJS（他のtests/*.jsと同じ実行方法 `node tests/X.js`）なので、
// ES moduleは動的import()で読み込む（トップレベルはasync IIFE）。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-tts-worker');

(async () => {
  const ttsPath = path.join(ROOT, 'workers', 'tts-proxy', 'lib', 'tts.js');
  const jwtPath = path.join(ROOT, 'workers', 'tts-proxy', 'lib', 'jwt.js');
  const fsPath = path.join(ROOT, 'workers', 'tts-proxy', 'lib', 'firestore.js');

  let tts, jwt, fsLib;
  try {
    tts = await import('file://' + ttsPath);
    jwt = await import('file://' + jwtPath);
    fsLib = await import('file://' + fsPath);
    c.ok('lib/tts.js・lib/jwt.js・lib/firestore.js をimportできる', true);
  } catch (e) {
    c.ok('libをimportできる: ' + e.message, false);
    c.done(); return;
  }

  // ================= lib/tts.js（純粋ロジック。旧functions/lib/tts.jsと同内容） =================
  c.ok('通常の4桁コードは有効', tts.isValidFamilyCode('0000'));
  c.ok('空白を含むと無効', !tts.isValidFamilyCode('0000 0000'));
  c.ok('41文字以上は無効', !tts.isValidFamilyCode('a'.repeat(41)));
  c.ok('妥当な長さのキーは有効', tts.isPlausibleApiKey('sk_' + 'a'.repeat(30)));
  c.ok('短すぎるキーは無効', !tts.isPlausibleApiKey('short'));
  { const r = tts.sanitizeText('  こんにちは  '); c.ok('前後空白を除去', r.ok && r.text === 'こんにちは'); }
  { const r = tts.sanitizeText(''); c.ok('空文字は拒否', !r.ok && r.reason === 'text_empty'); }
  { const r = tts.sanitizeText('あ'.repeat(tts.MAX_CHARS_PER_REQUEST + 1)); c.ok('上限超は拒否', !r.ok && r.reason === 'text_too_long'); }
  {
    const r = tts.checkAndConsumeQuota({ usedCharsToday: 950, usedDate: '2026-07-15' }, '2026-07-15', 100, 1000);
    c.ok('同日で上限超は拒否', !r.allowed && r.reason === 'daily_limit_exceeded');
  }
  {
    const r = tts.checkAndConsumeQuota({ usedCharsToday: 999, usedDate: '2026-07-14' }, '2026-07-15', 500, 1000);
    c.ok('日付が変わったら自動リセット', r.allowed && r.usedCharsToday === 500);
  }
  c.eq('401→invalid_key', tts.mapElevenLabsStatus(401, '').error, 'invalid_key');
  c.eq('429→rate_limited', tts.mapElevenLabsStatus(429, '').error, 'rate_limited');
  c.eq('実HTTPステータスを保持（常に200固定にしない）', tts.mapElevenLabsStatus(401, '').status, 401);
  c.eq('todayDateKeyはYYYY-MM-DD形式', tts.todayDateKey(new Date(2026, 6, 5)), '2026-07-05');

  // ================= lib/jwt.js（RS256署名・検証。実RSA鍵ペアで往復させる） =================
  const kp = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify'],
  );
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
  const pem = '-----BEGIN PRIVATE KEY-----\n' + Buffer.from(pkcs8).toString('base64') + '\n-----END PRIVATE KEY-----\n';
  const jwkPub = await crypto.subtle.exportKey('jwk', kp.publicKey);
  jwkPub.kid = 'test-kid-1';
  const jwks = { keys: [jwkPub] };
  const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  async function signRaw(header, payload, privateKey) {
    const signingInput = b64url(header) + '.' + b64url(payload);
    const sig = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, privateKey, new TextEncoder().encode(signingInput));
    return signingInput + '.' + Buffer.from(sig).toString('base64url');
  }
  const PROJECT = 'study-app-48c8f';
  const idHeader = { alg: 'RS256', typ: 'JWT', kid: 'test-kid-1' };
  const validClaims = { iss: 'https://securetoken.google.com/' + PROJECT, aud: PROJECT, sub: 'user123', iat: 1000, exp: 4600 };

  {
    const token = await jwt.createSignedJwt({ iss: 'sa@x.iam.gserviceaccount.com', scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: 1000, exp: 4600 }, pem);
    const parsed = jwt.parseJwtUnverified(token);
    c.ok('自前JWT署名→構造解析が一致', parsed && parsed.payload.iss === 'sa@x.iam.gserviceaccount.com');
  }
  {
    const token = await signRaw(idHeader, validClaims, kp.privateKey);
    const r = await jwt.verifyFirebaseIdToken(token, jwks, { projectId: PROJECT, nowSeconds: 2000 });
    c.ok('正しいIDトークンは検証OK', r.ok && r.uid === 'user123');
  }
  {
    // payloadだけ書き換えて元の署名を使い回す＝signingInputと署名が食い違うので必ず検出される
    const token = await signRaw(idHeader, validClaims, kp.privateKey);
    const sigPart = token.split('.')[2];
    const tamperedPayload = b64url(Object.assign({}, validClaims, { sub: 'hacker' }));
    const tampered = b64url(idHeader) + '.' + tamperedPayload + '.' + sigPart;
    const r = await jwt.verifyFirebaseIdToken(tampered, jwks, { projectId: PROJECT, nowSeconds: 2000 });
    c.ok('署名の改ざんは検出される', !r.ok && r.reason === 'bad_signature');
  }
  {
    const token = await signRaw(idHeader, validClaims, kp.privateKey);
    const r = await jwt.verifyFirebaseIdToken(token, jwks, { projectId: PROJECT, nowSeconds: 9999 });
    c.ok('期限切れは拒否される', !r.ok && r.reason === 'expired');
  }
  {
    // issは正しいプロジェクト・audだけ別プロジェクトを騙る＝aud不一致を単独で検証
    const audOnlyBad = Object.assign({}, validClaims, { aud: 'other-project' });
    const token = await signRaw(idHeader, audOnlyBad, kp.privateKey);
    const r = await jwt.verifyFirebaseIdToken(token, jwks, { projectId: PROJECT, nowSeconds: 2000 });
    c.ok('audienceが違えば拒否される', !r.ok && r.reason === 'bad_audience');
  }
  {
    const token = await signRaw(idHeader, validClaims, kp.privateKey);
    const r = await jwt.verifyFirebaseIdToken(token, jwks, { projectId: 'other-project', nowSeconds: 2000 });
    c.ok('プロジェクトIDが違えば（iss/aud両方不一致）拒否される', !r.ok);
  }
  {
    const badClaims = Object.assign({}, validClaims, { iss: 'https://evil.example.com/' + PROJECT });
    const token = await signRaw(idHeader, badClaims, kp.privateKey);
    const r = await jwt.verifyFirebaseIdToken(token, jwks, { projectId: PROJECT, nowSeconds: 2000 });
    c.ok('issuerが違えば拒否される', !r.ok && r.reason === 'bad_issuer');
  }
  {
    // 別の鍵ペアで署名した「なりすまし」トークン（kidだけ本物を騙る）は、実際の署名検証で弾かれる
    const otherKp = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true, ['sign', 'verify'],
    );
    const token = await signRaw(idHeader, validClaims, otherKp.privateKey);
    const r = await jwt.verifyFirebaseIdToken(token, jwks, { projectId: PROJECT, nowSeconds: 2000 });
    c.ok('別の秘密鍵で署名されたなりすましトークンは拒否される', !r.ok && r.reason === 'bad_signature');
  }
  c.ok('kidが未知なら拒否される', !(await jwt.verifyFirebaseIdToken(await signRaw(Object.assign({}, idHeader, { kid: 'nope' }), validClaims, kp.privateKey), jwks, { projectId: PROJECT, nowSeconds: 2000 })).ok);
  c.ok('不正な形式のトークンは例外を出さずreason=malformed', (await jwt.verifyFirebaseIdToken('not-a-jwt', jwks, { projectId: PROJECT, nowSeconds: 2000 })).reason === 'malformed');

  // ================= lib/firestore.js（値変換は純粋・ネットワークはスタブ） =================
  c.eq('文字列の変換', fsLib.fsValueToJs({ stringValue: 'ねこ' }), 'ねこ');
  c.eq('整数の変換', fsLib.fsValueToJs({ integerValue: '42' }), 42);
  c.eq('真偽値の変換', fsLib.fsValueToJs({ booleanValue: true }), true);
  c.eq('nullの変換', fsLib.fsValueToJs({ nullValue: null }), null);
  {
    const js = fsLib.fsFieldsToJs({ apiKey: { stringValue: 'sk_abc' }, usedCharsToday: { integerValue: '120' } });
    c.ok('fields→JSオブジェクトへの変換', js.apiKey === 'sk_abc' && js.usedCharsToday === 120);
  }
  {
    const fields = fsLib.jsToFsFields({ apiKey: 'sk_abc', usedCharsToday: 120, ok: true });
    c.ok('JSオブジェクト→fieldsへの変換', fields.apiKey.stringValue === 'sk_abc' && fields.usedCharsToday.integerValue === '120' && fields.ok.booleanValue === true);
  }
  {
    const original = { apiKey: 'sk_xyz', usedCharsToday: 300, usedDate: '2026-07-15', ok: false };
    const roundTrip = fsLib.fsFieldsToJs(fsLib.jsToFsFields(original));
    c.ok('往復変換で値が保たれる', JSON.stringify(roundTrip) === JSON.stringify(original));
  }
  c.ok('undefinedのフィールドは書き込み対象から除外される', fsLib.jsToFsFields({ a: 1, b: undefined }).b === undefined);
  {
    const url = fsLib.docUrl('study-app-48c8f', 'families/0000/private/tts');
    c.eq('ドキュメントURLの組み立て', url, 'https://firestore.googleapis.com/v1/projects/study-app-48c8f/databases/(default)/documents/families/0000/private/tts');
  }
  {
    // getDoc: 存在するドキュメント → JS値。fetchはスタブしてリクエスト形状も確認
    let capturedUrl = null, capturedAuth = null;
    const stubFetch = async (url, opts) => {
      capturedUrl = url; capturedAuth = opts && opts.headers && opts.headers.Authorization;
      return { ok: true, status: 200, json: async () => ({ fields: { apiKey: { stringValue: 'sk_test' } } }) };
    };
    const doc = await fsLib.getDoc('study-app-48c8f', 'families/0000/private/tts', 'FAKE_TOKEN', stubFetch);
    c.ok('getDocが正しいURLとAuthorizationヘッダで呼ぶ', capturedUrl.indexOf('families/0000/private/tts') >= 0 && capturedAuth === 'Bearer FAKE_TOKEN');
    c.ok('getDocがfieldsをJSへ変換して返す', doc.apiKey === 'sk_test');
  }
  {
    // getDoc: 404 → null（Admin SDKのsnap.exists相当の分岐をしやすくする）
    const stubFetch = async () => ({ ok: false, status: 404 });
    const doc = await fsLib.getDoc('p', 'families/9999/private/tts', 'T', stubFetch);
    c.eq('存在しないドキュメントはnull', doc, null);
  }
  {
    // patchDoc: updateMask.fieldPaths がクエリに含まれる（部分更新）
    let capturedUrl = null, capturedBody = null;
    const stubFetch = async (url, opts) => { capturedUrl = url; capturedBody = JSON.parse(opts.body); return { ok: true }; };
    await fsLib.patchDoc('p', 'families/0000/private/tts', { usedCharsToday: 500 }, 'T', stubFetch, ['usedCharsToday']);
    c.ok('patchDocがupdateMaskをクエリに付与する', capturedUrl.indexOf('updateMask.fieldPaths=usedCharsToday') >= 0);
    c.ok('patchDocのbodyがFirestore形式', capturedBody.fields.usedCharsToday.integerValue === '500');
  }

  // ================= src/index.js（静的確認：エンドポイント・認証・CORS制限） =================
  const glueCode = fs.readFileSync(path.join(ROOT, 'workers', 'tts-proxy', 'src', 'index.js'), 'utf8');
  c.ok('setTtsKey/verifyTtsKey/synthesizeSpeechの3ルートがある', /'\/setTtsKey'/.test(glueCode) && /'\/verifyTtsKey'/.test(glueCode) && /'\/synthesizeSpeech'/.test(glueCode));
  c.ok('lib/jwt.jsのverifyFirebaseIdTokenを使う（自前実装の重複なし）', glueCode.indexOf("from '../lib/jwt.js'") >= 0);
  c.ok('privateパスは families/{code}/private/tts', glueCode.indexOf("'/private/tts'") >= 0);
  c.ok('CORSはALLOWED_ORIGINSに限定（origin全許可にしていない）', /allowedOrigins\(env\)\.indexOf\(origin\)/.test(glueCode));
  c.ok('firebase-adminやfirebase-functionsをimport/requireしていない（Workersで動くため。説明コメントでの言及は除外）',
    !/(?:from|require\()\s*['"]firebase-(?:admin|functions)/.test(glueCode));

  // ================= firestore.rules：privateサブコレクションのロックダウンは維持されている =================
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
  c.ok('firestore.rules に private ロックダウンがある', /match \/private\/\{document=\*\*\}[\s\S]{0,80}allow read, write: if false/.test(rules));

  c.done();
})();
