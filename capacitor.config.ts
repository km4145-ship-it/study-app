import type { CapacitorConfig } from '@capacitor/cli';

// appId は仮値（Apple Developer Program未登録のため確定不可・Firebaseプロジェクトid由来）。
// ネイティブプロジェクト（ios//android/）を `cap add` する前ならこの値を変えても
// 移行コストはファイル1行の書き換えのみ。
const config: CapacitorConfig = {
  appId: 'app.studyapp48c8f.study',
  appName: '小中学生学習アプリ',
  webDir: 'dist',
};

export default config;
