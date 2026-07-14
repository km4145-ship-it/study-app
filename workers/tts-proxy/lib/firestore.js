/* firestore.js：Firestore REST APIの薄いラッパー＋値変換。ES module。
   firebase-adminのFirestore SDKが使えない環境（Cloudflare Workers）向けに、
   GCPサービスアカウントのOAuth2アクセストークンを使ってFirestoreへ直接fetchする。
   値変換（fsValueToJs/jsToFsFields等）は純粋関数＝ネットワーク不要でテストできる。
   実際にnetworkを叩く関数（getDoc/patchDoc/getAccessToken）は fetchImpl を引数で
   受け取れるようにしてあり、テストではスタブを渡してリクエスト形状だけ検証する。 */
import { createSignedJwt } from './jwt.js';

// ---- Firestore REST の Value 表現 <-> 普通のJS値（純粋関数） ----
export function fsValueToJs(v) {
  if (v == null) return null;
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('mapValue' in v) return fsFieldsToJs((v.mapValue && v.mapValue.fields) || {});
  if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(fsValueToJs);
  if ('timestampValue' in v) return v.timestampValue;
  return null;
}
export function jsToFsValue(x) {
  if (x == null) return { nullValue: null };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(jsToFsValue) } };
  if (typeof x === 'object') return { mapValue: { fields: jsToFsFields(x) } };
  return { nullValue: null };
}
export function fsFieldsToJs(fields) {
  const out = {};
  Object.keys(fields || {}).forEach((k) => { out[k] = fsValueToJs(fields[k]); });
  return out;
}
export function jsToFsFields(obj) {
  const out = {};
  Object.keys(obj || {}).forEach((k) => { if (obj[k] !== undefined) out[k] = jsToFsValue(obj[k]); });
  return out;
}

// ---- ドキュメントパス ----
export function docUrl(projectId, path) {
  return 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/' + path;
}

// ---- サービスアカウントのJWTをOAuth2アクセストークンに交換（純ロジック部分と分離） ----
// scopeは呼び出し側指定（Firestoreなら 'https://www.googleapis.com/auth/datastore'）。
// iat/expは呼び出し側が渡す（このファイル内でDate.now()を呼ばない＝決定的）。
export function buildServiceAccountClaims(clientEmail, scope, iatSeconds, expSeconds) {
  return { iss: clientEmail, scope: scope, aud: 'https://oauth2.googleapis.com/token', iat: iatSeconds, exp: expSeconds };
}
export async function getAccessToken(serviceAccount, nowSeconds, fetchImpl) {
  const f = fetchImpl || fetch;
  const claims = buildServiceAccountClaims(serviceAccount.client_email, 'https://www.googleapis.com/auth/datastore', nowSeconds, nowSeconds + 3600);
  const assertion = await createSignedJwt(claims, serviceAccount.private_key);
  const res = await f('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(assertion),
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error('token_exchange_failed: ' + res.status + ' ' + t); }
  const data = await res.json();
  return data.access_token;
}

// ---- ドキュメント取得・更新（薄いラッパー） ----
// 存在しなければ null（Admin SDKの snap.exists 相当のチェックをしやすくする）
export async function getDoc(projectId, path, accessToken, fetchImpl) {
  const f = fetchImpl || fetch;
  const res = await f(docUrl(projectId, path), { headers: { Authorization: 'Bearer ' + accessToken } });
  if (res.status === 404) return null;
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error('firestore_get_failed: ' + res.status + ' ' + t); }
  const data = await res.json();
  return fsFieldsToJs(data.fields || {});
}
// merge:true相当（updateMask.fieldPathsで指定したフィールドだけ更新。指定しなければ全置換）
export async function patchDoc(projectId, path, obj, accessToken, fetchImpl, mergeFields) {
  const f = fetchImpl || fetch;
  let url = docUrl(projectId, path);
  if (mergeFields && mergeFields.length) {
    url += '?' + mergeFields.map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  }
  const res = await f(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: jsToFsFields(obj) }),
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error('firestore_patch_failed: ' + res.status + ' ' + t); }
}
// ドキュメント削除（cloudWipeAll相当の掃除で将来使う可能性があるため用意。今回は未使用）
export async function deleteDoc(projectId, path, accessToken, fetchImpl) {
  const f = fetchImpl || fetch;
  const res = await f(docUrl(projectId, path), { method: 'DELETE', headers: { Authorization: 'Bearer ' + accessToken } });
  if (!res.ok && res.status !== 404) { const t = await res.text().catch(() => ''); throw new Error('firestore_delete_failed: ' + res.status + ' ' + t); }
}
