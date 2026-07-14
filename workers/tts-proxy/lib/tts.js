/* tts.js：ElevenLabs TTSプロキシの純粋ロジック（バリデーション・クォータ・エラー整形）。
   ES module。Cloudflare WorkersにもNodeにも依存しない（Web標準の範囲のみ）ので
   どちらでも同じ挙動を保証できる。ネットワーク呼び出しはsrc/index.js側が行う。
   （旧 functions/lib/tts.js からランタイム非依存部分をそのまま移植） */

// 1リクエストあたりの文字数上限（単発の巨大リクエストによる乱用を防ぐ）
export const MAX_CHARS_PER_REQUEST = 2000;
// 1家族あたりの1日の文字数上限（家族コード推測経由の乱用の被害を上限で抑える防御的措置）
export const DAILY_CHAR_LIMIT = 50000;

// 家族コード：既定は4桁だが「変更してよい」運用のため長さのみ緩く検証（1〜40文字・空白なし）
export function isValidFamilyCode(code) {
  return typeof code === 'string' && code.length >= 1 && code.length <= 40 && !/\s/.test(code);
}

// APIキーらしさの簡易検証（本物の検証はElevenLabsへの実問い合わせで行う。ここは形式チェックのみ）
export function isPlausibleApiKey(key) {
  return typeof key === 'string' && key.trim().length >= 10 && key.trim().length <= 200 && !/\s/.test(key.trim());
}

// 読み上げ対象テキストの整形（前後空白除去・上限超は明示的に拒否＝黙って切り詰めない）
export function sanitizeText(text) {
  if (typeof text !== 'string') return { ok: false, reason: 'text_required' };
  const t = text.trim();
  if (!t) return { ok: false, reason: 'text_empty' };
  if (t.length > MAX_CHARS_PER_REQUEST) return { ok: false, reason: 'text_too_long', max: MAX_CHARS_PER_REQUEST };
  return { ok: true, text: t };
}

// 日次クォータの判定＋消費（純関数：現在の保存状態と今日の日付・要求文字数を渡すと、
// 許可するかどうかと「書き戻すべき新しい状態」を返す。日付が変わっていれば自動リセットする）
export function checkAndConsumeQuota(state, todayStr, requestChars, limit) {
  const dailyLimit = limit || DAILY_CHAR_LIMIT;
  const sameDay = state && state.usedDate === todayStr;
  const usedSoFar = sameDay ? (state.usedCharsToday || 0) : 0;
  if (usedSoFar + requestChars > dailyLimit) {
    return { allowed: false, reason: 'daily_limit_exceeded', usedCharsToday: usedSoFar, usedDate: todayStr, limit: dailyLimit };
  }
  return { allowed: true, usedCharsToday: usedSoFar + requestChars, usedDate: todayStr, limit: dailyLimit };
}

// ElevenLabsのHTTPステータスを、クライアント側の既存の分岐（401/422/429等）にそのまま
// 乗せられる形へ整形する（index.htmlのspeakAndWait/fetchVoiceBlobの分岐と対応させる）
export function mapElevenLabsStatus(status, bodyText) {
  if (status === 401) return { status: 401, error: 'invalid_key', message: 'APIキーが無効です' };
  if (status === 429) return { status: 429, error: 'rate_limited', message: '利用上限を超えています' };
  if (status === 400 || status === 422) return { status: status, error: 'bad_request', message: '声IDまたはリクエストが不正です', body: bodyText };
  return { status: status || 500, error: 'upstream_error', message: '接続エラー', body: bodyText };
}

// GET /v1/user はキー検証だけに使う軽量エンドポイント。ElevenLabsは「user_read」権限が
// 無いキーにも401を返すため、意図的に権限を絞ったキー（docs/SECURITY.mdで推奨している運用）が
// 誤って「無効なキー」判定されてしまう。ElevenLabsのエラーレスポンスは
// invalid_api_key（本当に無効）とmissing_permissions（有効だが読み取り権限が無いだけ）を
// 区別して返すので、後者は「有効なキー」として扱う。
export function isKeyValidFromUserCheck(status, bodyText) {
  if (status >= 200 && status < 300) return true;
  if (status !== 401) return false;
  try {
    const parsed = JSON.parse(bodyText);
    return !!(parsed && parsed.detail && parsed.detail.status === 'missing_permissions');
  } catch (e) {
    return false;
  }
}

// 今日の日付キー（JST基準・study-appの todayKey() と同じ 'YYYY-MM-DD' 形式に統一）
export function todayDateKey(d) {
  const dt = d || new Date();
  const p2 = (n) => (n < 10 ? '0' : '') + n;
  return dt.getFullYear() + '-' + p2(dt.getMonth() + 1) + '-' + p2(dt.getDate());
}
