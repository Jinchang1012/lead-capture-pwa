// Vosk 中文小模型（~42MB）
// 預設使用 alphacephei 官方 CDN；正式部署建議自管同源檔案避免 CORS 與展場 DNS 不穩
// 自管時：把 vosk-model-small-cn-0.22.tar.gz 放到 public/models/ 下，改成 '/models/vosk-model-small-cn-0.22.tar.gz'
export const VOSK_MODEL_URL =
  'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-cn-0.22.tar.gz'

// 取樣率：Vosk 中文小模型訓練時用 16kHz，AudioContext 也用同值以省一道重採樣
export const VOSK_SAMPLE_RATE = 16000

// 錄音上限（秒）— 展場場景補充資料用，超過自動停
export const RECORD_MAX_SECONDS = 30

// localStorage key：標記模型是否已成功載入過
export const STORAGE_KEY_VOSK_READY = 'vosk_model_ready_v1'
