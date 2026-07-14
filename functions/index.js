/* index.js：ElevenLabs TTSプロキシのCloud Functions本体（薄いグルー。ロジックは lib/tts.js）。
   目的：ElevenLabs APIキーを一度もクライアントへ返さない。鍵は Firestore の
   families/{code}/private/tts にのみ保存し、Admin SDK（ルールを迂回できる）からしか触れない。

   3関数：
   - setTtsKey       ：キーを受け取り、ElevenLabsへ検証してから保存する
   - verifyTtsKey     ：保存済みキーが有効かを確認する（設定画面の「接続確認」用）
   - synthesizeSpeech ：保存済みキーで音声合成し、音声バイナリをそのまま返す

   認証：Authorization: Bearer <Firebase IDトークン>（匿名認証のトークンでも可＝
   現状のFirestoreルールと同じ認証レベル。家族コードの所有検証はまだ無い＝Phase 4で対応）。

   デプロイ：`firebase deploy --only functions`（要Blazeプラン。本番未デプロイの間はこのコードは無害）。
   ローカル確認：`firebase emulators:start --only functions,firestore` の後、
   `curl -X POST http://localhost:5001/study-app-48c8f/asia-northeast1/verifyTtsKey \
     -H "Authorization: Bearer <エミュレータ用テストトークン>" -H "Content-Type: application/json" \
     -d '{"familyCode":"0000"}'` のように動作確認する（詳細は docs/APP_STORE_ROADMAP.md）。 */
'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const {
  isValidFamilyCode,
  isPlausibleApiKey,
  sanitizeText,
  checkAndConsumeQuota,
  mapElevenLabsStatus,
  todayDateKey,
  DAILY_CHAR_LIMIT,
} = require('./lib/tts');

admin.initializeApp();
const db = admin.firestore();

const REGION = 'asia-northeast1';
// 本番オリジン＋ローカル開発用サーバー（python3 -m http.server 8080、docs/ARCHITECTURE.md参照）。
// 独自ドメインやCapacitorアプリを追加する際はここに足す。
const ALLOWED_ORIGINS = [
  'https://km4145-ship-it.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

function privateTtsRef(familyCode) {
  return db.collection('families').doc(familyCode).collection('private').doc('tts');
}

// Authorizationヘッダのトークンを検証し、認証済みなら decoded token を返す。失敗時は null。
async function verifyAuth(req) {
  const header = req.get('Authorization') || '';
  const m = /^Bearer (.+)$/.exec(header);
  if (!m) return null;
  try { return await admin.auth().verifyIdToken(m[1]); } catch (e) { return null; }
}

function sendJson(res, status, body) { res.status(status).json(body); }

// 共通の前処理：POSTのみ・認証必須・familyCode必須。通れば {familyCode} を返し、
// ダメなら自前でレスポンスを返して null を返す（呼び出し側は null なら即 return する）。
async function preflight(req, res) {
  if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method_not_allowed' }); return null; }
  const decoded = await verifyAuth(req);
  if (!decoded) { sendJson(res, 401, { ok: false, error: 'auth_required' }); return null; }
  const familyCode = req.body && req.body.familyCode;
  if (!isValidFamilyCode(familyCode)) { sendJson(res, 400, { ok: false, error: 'invalid_family_code' }); return null; }
  return { familyCode };
}

// ---- setTtsKey：キーを検証してから families/{code}/private/tts に保存 ----
exports.setTtsKey = onRequest({ region: REGION, cors: ALLOWED_ORIGINS }, async (req, res) => {
  const pre = await preflight(req, res); if (!pre) return;
  const apiKey = req.body && req.body.apiKey;
  if (!isPlausibleApiKey(apiKey)) { sendJson(res, 400, { ok: false, error: 'invalid_key_format' }); return; }
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': apiKey } });
    if (!r.ok) {
      const mapped = mapElevenLabsStatus(r.status, await r.text().catch(() => ''));
      sendJson(res, 200, { ok: false, error: mapped.error, message: mapped.message });
      return;
    }
    await privateTtsRef(pre.familyCode).set({
      apiKey, setAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: false });   // merge:falseで古いクォータ状態も一緒にリセット（鍵を変えたら使用量もリセットでよい）
    sendJson(res, 200, { ok: true });
  } catch (e) {
    logger.error('setTtsKey failed', e);
    sendJson(res, 200, { ok: false, error: 'network_error' });
  }
});

// ---- verifyTtsKey：保存済みキーの有効性を確認（設定画面の「接続確認」ボタン用） ----
exports.verifyTtsKey = onRequest({ region: REGION, cors: ALLOWED_ORIGINS }, async (req, res) => {
  const pre = await preflight(req, res); if (!pre) return;
  try {
    const snap = await privateTtsRef(pre.familyCode).get();
    if (!snap.exists || !snap.data().apiKey) { sendJson(res, 200, { ok: false, error: 'no_key_set' }); return; }
    const r = await fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': snap.data().apiKey } });
    if (r.ok) { sendJson(res, 200, { ok: true }); return; }
    const mapped = mapElevenLabsStatus(r.status, await r.text().catch(() => ''));
    sendJson(res, 200, { ok: false, error: mapped.error, message: mapped.message });
  } catch (e) {
    logger.error('verifyTtsKey failed', e);
    sendJson(res, 200, { ok: false, error: 'network_error' });
  }
});

// ---- synthesizeSpeech：保存済みキーで音声合成し、音声バイナリをそのまま返す ----
// 「声が見つからない」エラー時は、クライアントから渡された ownerId でボイスライブラリに
// 追加してから1回だけ再試行する（index.htmlの既存fetchVoiceBlob+addSharedVoiceの挙動を踏襲）。
exports.synthesizeSpeech = onRequest({ region: REGION, cors: ALLOWED_ORIGINS, timeoutSeconds: 30 }, async (req, res) => {
  const pre = await preflight(req, res); if (!pre) return;
  const { voiceId, voiceSettings, ownerId } = req.body || {};
  if (typeof voiceId !== 'string' || !voiceId) { sendJson(res, 400, { ok: false, error: 'voice_id_required' }); return; }
  const sanitized = sanitizeText(req.body && req.body.text);
  if (!sanitized.ok) { sendJson(res, 400, { ok: false, error: sanitized.reason }); return; }

  const ref = privateTtsRef(pre.familyCode);
  try {
    const snap = await ref.get();
    if (!snap.exists || !snap.data().apiKey) { sendJson(res, 200, { ok: false, error: 'no_key_set' }); return; }
    const apiKey = snap.data().apiKey;

    const today = todayDateKey();
    const quota = checkAndConsumeQuota(snap.data(), today, sanitized.text.length, DAILY_CHAR_LIMIT);
    if (!quota.allowed) { sendJson(res, 200, { ok: false, error: quota.reason }); return; }

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
      sendJson(res, 200, { ok: false, error: mapped.error, message: mapped.message });
      return;
    }
    // クォータ消費を書き戻す（実際に合成成功した分だけ課金対象になるため、成功後に更新）
    await ref.set({ usedCharsToday: quota.usedCharsToday, usedDate: quota.usedDate }, { merge: true });
    const buf = Buffer.from(await r.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.status(200).send(buf);
  } catch (e) {
    logger.error('synthesizeSpeech failed', e);
    sendJson(res, 200, { ok: false, error: 'network_error' });
  }
});
