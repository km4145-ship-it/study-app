/* index.js：Cloudflare Workers エントリポイント（薄いグルー。ロジックは ../lib/*.js）。
   目的：ElevenLabs APIキーを一度もクライアントへ返さない。鍵は Firestore の
   families/{code}/private/tts にのみ保存し、GCPサービスアカウント経由（Firestoreルールを
   迂回できる・Admin SDKと同じ特権）でしか触れない。

   3エンドポイント（すべてPOST・JSON）：
   - /setTtsKey       ：キーを受け取り、ElevenLabsへ検証してから保存する
   - /verifyTtsKey    ：保存済みキーが有効かを確認する（設定画面の「接続確認」用）
   - /synthesizeSpeech：保存済みキーで音声合成し、音声バイナリをそのまま返す

   認証：Authorization: Bearer <Firebase IDトークン>（匿名認証のトークンでも可＝
   現状のFirestoreルールと同じ認証レベル。家族コードの所有検証はまだ無い＝Phase 4で対応）。
   検証は ../lib/jwt.js の自前実装（GoogleのJWKSを使用。firebase-admin不使用）。

   必要なシークレット（wrangler secret put で設定。リポジトリには含めない）：
   - GCP_CLIENT_EMAIL：Firestoreアクセス用サービスアカウントのメールアドレス
   - GCP_PRIVATE_KEY ：同サービスアカウントの秘密鍵（PEM形式）
   wrangler.toml の [vars] で FIREBASE_PROJECT_ID・ALLOWED_ORIGINS を設定する
   （これらは秘密ではないので通常の変数でよい）。

   デプロイ：`wrangler deploy`（Cloudflareアカウント作成・wrangler loginが必要）。
   ローカル確認：`wrangler dev` の後、詳細は docs/APP_STORE_ROADMAP.md 参照。 */
import { verifyFirebaseIdToken, parseJwtUnverified } from '../lib/jwt.js';
import { getAccessToken, getDoc, patchDoc } from '../lib/firestore.js';
import {
  isValidFamilyCode, isPlausibleApiKey, sanitizeText, isKeyValidFromUserCheck,
  checkAndConsumeQuota, mapElevenLabsStatus, todayDateKey, DAILY_CHAR_LIMIT,
} from '../lib/tts.js';

const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// ---- モジュールスコープのキャッシュ（同一Workerインスタンス内で使い回す。ベストエフォート） ----
let _jwksCache = null, _jwksCacheAt = 0;
let _tokenCache = null, _tokenCacheAt = 0;

async function getJwks() {
  const now = Date.now();
  if (_jwksCache && now - _jwksCacheAt < 3600 * 1000) return _jwksCache;
  const res = await fetch(FIREBASE_JWKS_URL);
  if (!res.ok) throw new Error('jwks_fetch_failed');
  _jwksCache = await res.json();
  _jwksCacheAt = now;
  return _jwksCache;
}
async function getFirestoreAccessToken(env) {
  const now = Date.now();
  if (_tokenCache && now - _tokenCacheAt < 50 * 60 * 1000) return _tokenCache;   // 50分でリフレッシュ（実際は1時間有効）
  const token = await getAccessToken(
    { client_email: env.GCP_CLIENT_EMAIL, private_key: env.GCP_PRIVATE_KEY },
    Math.floor(now / 1000),
  );
  _tokenCache = token; _tokenCacheAt = now;
  return token;
}

// ---- CORS ----
function allowedOrigins(env) { return (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean); }
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env).indexOf(origin) >= 0;
  const h = { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' };
  if (allowed) h['Access-Control-Allow-Origin'] = origin;
  return h;
}
function json(request, env, status, body) {
  return new Response(JSON.stringify(body), { status, headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(request, env)) });
}

function privateTtsPath(familyCode) { return 'families/' + encodeURIComponent(familyCode) + '/private/tts'; }
function privateTtsPathAccount(uid) { return 'accounts/' + encodeURIComponent(uid) + '/private/tts'; }

// ---- キー検証：GET /v1/user への問い合わせ結果を isKeyValidFromUserCheck で解釈する
// （判定ロジック自体は ../lib/tts.js の純粋関数＝ネットワーク無しでテスト済み）。
async function verifyElevenLabsKey(apiKey) {
  const r = await fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': apiKey } });
  const bodyText = r.ok ? '' : await r.text().catch(() => '');
  if (isKeyValidFromUserCheck(r.status, bodyText)) return { ok: true };
  return { ok: false, mapped: mapElevenLabsStatus(r.status, bodyText) };
}

// ---- 共通の前処理：POSTのみ・認証必須・familyCode必須 ----
async function preflight(request, env) {
  if (request.method !== 'POST') return { error: json(request, env, 405, { ok: false, error: 'method_not_allowed' }) };
  const authHeader = request.headers.get('Authorization') || '';
  const m = /^Bearer (.+)$/.exec(authHeader);
  if (!m) return { error: json(request, env, 401, { ok: false, error: 'auth_required' }) };
  // トークンの形（3パートのJWTか）を先に見る。形になっていない/ゴミ値なら、
  // GoogleのJWKSへ無駄な外部通信をせずに即401で返す（実害は無いが素の無駄弾きを減らす）。
  if (!parseJwtUnverified(m[1])) return { error: json(request, env, 401, { ok: false, error: 'auth_required' }) };
  let jwks;
  try { jwks = await getJwks(); } catch (e) { return { error: json(request, env, 502, { ok: false, error: 'auth_check_failed' }) }; }
  const verified = await verifyFirebaseIdToken(m[1], jwks, { projectId: env.FIREBASE_PROJECT_ID, nowSeconds: Math.floor(Date.now() / 1000) });
  if (!verified.ok) return { error: json(request, env, 401, { ok: false, error: 'auth_required' }) };
  let body;
  try { body = await request.json(); } catch (e) { return { error: json(request, env, 400, { ok: false, error: 'invalid_json' }) }; }
  // スコープを判定：account（推奨・uid本人の accounts/{uid}/private/tts）か family（レガシー）。
  const provider = (verified.payload && verified.payload.firebase && verified.payload.firebase.sign_in_provider) || '';
  const scope = (body && body.scope === 'account') ? 'account' : 'family';
  let ttsPath;
  if (scope === 'account') {
    // 匿名では account スコープを使わせない（メール＋パスワードの本人のみ）
    if (provider === 'anonymous') return { error: json(request, env, 403, { ok: false, error: 'account_required' }) };
    ttsPath = privateTtsPathAccount(verified.uid);
  } else {
    const familyCode = body && body.familyCode;
    if (!isValidFamilyCode(familyCode)) return { error: json(request, env, 400, { ok: false, error: 'invalid_family_code' }) };
    ttsPath = privateTtsPath(familyCode);
  }
  return { ttsPath, uid: verified.uid, scope, body };
}

// ---- /setTtsKey：キーを検証してから private/tts（account または family）に保存 ----
async function handleSetTtsKey(request, env, ttsPath, body) {
  const apiKey = body.apiKey;
  if (!isPlausibleApiKey(apiKey)) return json(request, env, 400, { ok: false, error: 'invalid_key_format' });
  const verified = await verifyElevenLabsKey(apiKey);
  if (!verified.ok) {
    return json(request, env, verified.mapped.status, { ok: false, error: verified.mapped.error, message: verified.mapped.message });
  }
  const token = await getFirestoreAccessToken(env);
  // 鍵を変えたら日次クォータもリセットする（updateMaskを指定せず全置換）
  await patchDoc(env.FIREBASE_PROJECT_ID, ttsPath, { apiKey: apiKey, setAt: new Date().toISOString() }, token);
  return json(request, env, 200, { ok: true });
}

// ---- /verifyTtsKey：保存済みキーの有効性を確認 ----
async function handleVerifyTtsKey(request, env, ttsPath) {
  const token = await getFirestoreAccessToken(env);
  const doc = await getDoc(env.FIREBASE_PROJECT_ID, ttsPath, token);
  if (!doc || !doc.apiKey) return json(request, env, 400, { ok: false, error: 'no_key_set' });
  const verified = await verifyElevenLabsKey(doc.apiKey);
  if (verified.ok) return json(request, env, 200, { ok: true });
  return json(request, env, verified.mapped.status, { ok: false, error: verified.mapped.error, message: verified.mapped.message });
}

// ---- /synthesizeSpeech：保存済みキーで音声合成し、音声バイナリをそのまま返す ----
// 「声が見つからない」エラー時は、クライアントから渡された ownerId でボイスライブラリに
// 追加してから1回だけ再試行する（index.htmlの既存fetchVoiceBlobの挙動を踏襲）。
async function handleSynthesizeSpeech(request, env, ttsPath, body) {
  const { voiceId, voiceSettings, ownerId } = body;
  if (typeof voiceId !== 'string' || !voiceId) return json(request, env, 400, { ok: false, error: 'voice_id_required' });
  const sanitized = sanitizeText(body.text);
  if (!sanitized.ok) return json(request, env, 400, { ok: false, error: sanitized.reason });

  const token = await getFirestoreAccessToken(env);
  const path = ttsPath;
  const doc = await getDoc(env.FIREBASE_PROJECT_ID, path, token);
  if (!doc || !doc.apiKey) return json(request, env, 400, { ok: false, error: 'no_key_set' });
  const apiKey = doc.apiKey;

  const today = todayDateKey();
  const quota = checkAndConsumeQuota(doc, today, sanitized.text.length, DAILY_CHAR_LIMIT);
  if (!quota.allowed) return json(request, env, 429, { ok: false, error: quota.reason });

  const doSynthesize = () => fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sanitized.text, model_id: 'eleven_multilingual_v2', voice_settings: voiceSettings || {} }),
  });

  let r = await doSynthesize();
  if (!r.ok && r.status === 400 && ownerId) {
    const bodyText = await r.text().catch(() => '');
    if (/voice.*not.*found|voice_not_found|does not exist/i.test(bodyText)) {
      await fetch('https://api.elevenlabs.io/v1/voices/add/' + ownerId + '/' + encodeURIComponent(voiceId), {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: '学習アプリ ' + String(voiceId).slice(0, 6) }),
      }).catch(() => {});
      r = await doSynthesize();
    }
  }
  if (!r.ok) {
    const mapped = mapElevenLabsStatus(r.status, await r.text().catch(() => ''));
    return json(request, env, mapped.status, { ok: false, error: mapped.error, message: mapped.message });
  }
  // クォータ消費を書き戻す（実際に合成成功した分だけ課金対象になるため、成功後に更新）
  await patchDoc(env.FIREBASE_PROJECT_ID, path, { usedCharsToday: quota.usedCharsToday, usedDate: quota.usedDate }, token, undefined, ['usedCharsToday', 'usedDate']);
  const buf = await r.arrayBuffer();
  return new Response(buf, { status: 200, headers: Object.assign({ 'Content-Type': 'audio/mpeg' }, corsHeaders(request, env)) });
}

const ROUTES = { '/setTtsKey': handleSetTtsKey, '/verifyTtsKey': handleVerifyTtsKey, '/synthesizeSpeech': handleSynthesizeSpeech };

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    const pathname = new URL(request.url).pathname;
    const handler = ROUTES[pathname];
    if (!handler) return json(request, env, 404, { ok: false, error: 'not_found' });
    const pre = await preflight(request, env);
    if (pre.error) return pre.error;
    try {
      return await handler(request, env, pre.ttsPath, pre.body);
    } catch (e) {
      return json(request, env, 502, { ok: false, error: 'network_error', message: String((e && e.message) || e) });
    }
  },
};
