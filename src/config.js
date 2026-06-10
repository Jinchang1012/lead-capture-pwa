// Vosk 中文小模型（~32MB / 33,235,437 bytes）
// 來源：ccoreilly/vosk-browser GitHub Pages CDN
// 已驗證：Access-Control-Allow-Origin: *，支援 HTTP Range 206 Partial Content
// 注意：GitHub Pages 跨網域不暴露 Content-Range header（CORS 預設不在 safelist），
//      所以需要硬編碼總大小做為 fallback。檔案大小由 ccoreilly 那邊管理，若改版需同步更新此常數。
export const VOSK_MODEL_URL =
  'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-cn-0.3.tar.gz'

// 已知檔案大小（bytes）— 跨網域時用，正確值來自 HEAD 與實測（2026-01 驗證 0.3 版）
export const VOSK_MODEL_TOTAL_BYTES = 33_235_437

// UI 顯示用
export const VOSK_MODEL_SIZE_MB = Math.round(VOSK_MODEL_TOTAL_BYTES / 1024 / 1024)

// 取樣率：Vosk 中文小模型訓練時用 16kHz，AudioContext 也用同值以省一道重採樣
export const VOSK_SAMPLE_RATE = 16000

// 錄音上限（秒）— 展場場景補充資料用，超過自動停
export const RECORD_MAX_SECONDS = 30

// localStorage key：標記模型是否已成功載入過
export const STORAGE_KEY_VOSK_READY = 'vosk_model_ready_v1'
