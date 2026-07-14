/* tts.js：ElevenLabs TTSプロキシの純粋ロジック（バリデーション・クォータ・エラー整形）。
   firebase-functions/firebase-adminをimportしない＝Node標準のみでテスト可能
   （study-appの js/*.js と同じ「純関数はテスト可能、実行時グルーは薄く」という方針を
   functions/ にも踏襲する）。実際のFirestore/HTTP呼び出しは index.js 側の薄いグルーが行う。 */
'use strict';

// 1リクエストあたりの文字数上限（単発の巨大リクエストによる乱用を防ぐ）
const MAX_CHARS_PER_REQUEST = 2000;
// 1家族あたりの1日の文字数上限（家族コード推測経由の乱用の被害を上限で抑える防御的措置）
const DAILY_CHAR_LIMIT = 50000;

// 家族コード：既定は4桁だが「変更してよい」運用のため長さのみ緩く検証（1〜40文字・空白なし）
function isValidFamilyCode(code) {
  return typeof code === 'string' && code.length >= 1 && code.length <= 40 && !/\s/.test(code);
}

// APIキーらしさの簡易検証（本物の検証はElevenLabsへの実問い合わせで行う。ここは形式チェックのみ）
function isPlausibleApiKey(key) {
  return typeof key === 'string' && key.trim().length >= 10 && key.trim().length <= 200 && !/\s/.test(key.trim());
}

// 読み上げ対象テキストの整形（前後空白除去・上限超は明示的に拒否＝黙って切り詰めない）
function sanitizeText(text) {
  if (typeof text !== 'string') return { ok: false, reason: 'text_required' };
  const t = text.trim();
  if (!t) return { ok: false, reason: 'text_empty' };
  if (t.length > MAX_CHARS_PER_REQUEST) return { ok: false, reason: 'text_too_long', max: MAX_CHARS_PER_REQUEST };
  return { ok: true, text: t };
}

// 日次クォータの判定＋消費（純関数：現在の保存状態と今日の日付・要求文字数を渡すと、
// 許可するかどうかと「書き戻すべき新しい状態」を返す。日付が変わっていれば自動リセットする）
function checkAndConsumeQuota(state, todayStr, requestChars, limit) {
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
function mapElevenLabsStatus(status, bodyText) {
  if (status === 401) return { status: 401, error: 'invalid_key', message: 'APIキーが無効です' };
  if (status === 429) return { status: 429, error: 'rate_limited', message: '利用上限を超えています' };
  if (status === 400 || status === 422) return { status: status, error: 'bad_request', message: '声IDまたはリクエストが不正です', body: bodyText };
  return { status: status || 500, error: 'upstream_error', message: '接続エラー', body: bodyText };
}

// 今日の日付キー（JST基準・study-appの todayKey() と同じ 'YYYY-MM-DD' 形式に統一）
function todayDateKey(d) {
  const dt = d || new Date();
  const p2 = (n) => (n < 10 ? '0' : '') + n;
  return dt.getFullYear() + '-' + p2(dt.getMonth() + 1) + '-' + p2(dt.getDate());
}

module.exports = {
  MAX_CHARS_PER_REQUEST,
  DAILY_CHAR_LIMIT,
  isValidFamilyCode,
  isPlausibleApiKey,
  sanitizeText,
  checkAndConsumeQuota,
  mapElevenLabsStatus,
  todayDateKey,
};
