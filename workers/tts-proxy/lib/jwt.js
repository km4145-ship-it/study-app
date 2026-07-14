/* jwt.js：JWTの署名・検証（RS256のみ）。ES module・Web Crypto API（crypto.subtle）だけを使う。
   Node.js（v18+）とCloudflare Workersの両方でグローバルに使えるAPIのみに限定しているため、
   このファイルは「Workersを一切起動せずNodeだけでテストできる」（study-appの
   依存ゼロテスト方針と一致）。時刻は呼び出し側が渡す（Date.now()をここで呼ばない＝決定的）。

   用途は2つ：
   ①GCPサービスアカウントの秘密鍵で自前のJWTに署名 → OAuth2アクセストークンと交換
     （Firestore REST APIへのAdmin相当アクセスに使う。firestore.js参照）
   ②クライアントが送るFirebase IDトークンの署名をGoogleの公開鍵（JWKS）で検証
     （admin.auth().verifyIdToken() の自前実装。index.jsのリクエスト認証に使う） */

function base64urlFromBytes(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function bytesFromBase64url(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function base64urlFromJson(obj) { return base64urlFromBytes(new TextEncoder().encode(JSON.stringify(obj))); }
function jsonFromBase64url(b64url) { return JSON.parse(new TextDecoder().decode(bytesFromBase64url(b64url))); }

// 標準base64（+ / = を使う。PEM本文はこちら）をバイト列に変換
function bytesFromBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
// PEM形式（-----BEGIN PRIVATE KEY-----...）の秘密鍵を crypto.subtle.importKey で使える形にする
async function importPkcs8PrivateKey(pem) {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
  const der = bytesFromBase64(body);
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}
// JWK形式の公開鍵（GoogleのJWKSエンドポイントが返す形）をそのままimportKeyへ
async function importJwkPublicKey(jwk) {
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
}

// claims（iat/expは呼び出し側が確定させる）をRS256で署名し、コンパクトJWT文字列を返す
export async function createSignedJwt(claims, privateKeyPem) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const signingInput = base64urlFromJson(header) + '.' + base64urlFromJson(claims);
  const key = await importPkcs8PrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(signingInput));
  return signingInput + '.' + base64urlFromBytes(new Uint8Array(sig));
}

// 署名検証なしでJWTの構造だけ取り出す（kid特定・期限の事前チェック等に使う）
export function parseJwtUnverified(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  try {
    return { header: jsonFromBase64url(parts[0]), payload: jsonFromBase64url(parts[1]), signingInput: parts[0] + '.' + parts[1], signatureB64url: parts[2] };
  } catch (e) { return null; }
}

// 1つのJWK公開鍵に対して署名が正しいかだけを見る（下のverifyFirebaseIdTokenが使う）
async function verifySignatureWithJwk(parsed, jwk) {
  try {
    const key = await importJwkPublicKey(jwk);
    const sigBytes = bytesFromBase64url(parsed.signatureB64url);
    return await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, sigBytes, new TextEncoder().encode(parsed.signingInput));
  } catch (e) { return false; }
}

// Firebase IDトークンの検証（admin.auth().verifyIdToken()の自前実装）。
// jwks は { keys: [...] }（GoogleのJWKSエンドポイントのレスポンスそのまま）。
// nowSeconds は呼び出し側が渡す（内部でDate.now()を呼ばない＝テストで時刻を固定できる）。
export async function verifyFirebaseIdToken(token, jwks, opts) {
  const parsed = parseJwtUnverified(token);
  if (!parsed) return { ok: false, reason: 'malformed' };
  const { header, payload } = parsed;
  if (header.alg !== 'RS256') return { ok: false, reason: 'bad_alg' };
  const jwk = (jwks && jwks.keys || []).find((k) => k.kid === header.kid);
  if (!jwk) return { ok: false, reason: 'unknown_kid' };
  const sigOk = await verifySignatureWithJwk(parsed, jwk);
  if (!sigOk) return { ok: false, reason: 'bad_signature' };
  const now = opts && typeof opts.nowSeconds === 'number' ? opts.nowSeconds : Math.floor(Date.now() / 1000);
  const projectId = opts && opts.projectId;
  if (typeof payload.exp !== 'number' || now >= payload.exp) return { ok: false, reason: 'expired' };
  if (typeof payload.iat !== 'number' || now < payload.iat - 60) return { ok: false, reason: 'not_yet_valid' };   // 60秒だけ時計ズレを許容
  if (payload.iss !== 'https://securetoken.google.com/' + projectId) return { ok: false, reason: 'bad_issuer' };
  if (payload.aud !== projectId) return { ok: false, reason: 'bad_audience' };
  if (!payload.sub) return { ok: false, reason: 'no_subject' };
  return { ok: true, uid: payload.sub, payload };
}
