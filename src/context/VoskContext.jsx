import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { STORAGE_KEY_VOSK_READY, VOSK_MODEL_URL } from '../config.js'
import {
  acquireScreenWakeLock,
  downloadModelResumable,
  getPartialProgress,
  releaseScreenWakeLock
} from '../utils/modelDownload.js'

// status: 'idle' | 'downloading' | 'ready' | 'error'
// model: vosk-browser 的 Model 實例（ready 時才有值）
const VoskContext = createContext({
  status: 'idle',
  model: null,
  error: null,
  download: async () => {},
  reset: () => {}
})

export function VoskProvider({ children }) {
  const initialReady = typeof window !== 'undefined' && window.localStorage?.getItem(STORAGE_KEY_VOSK_READY) === '1'
  // 初始狀態：localStorage 有 ready 旗標 → 顯示為 ready（樂觀），實際模型實例 lazy load
  const [status, setStatus] = useState(initialReady ? 'ready' : 'idle')
  const [error, setError] = useState(null)
  // 下載進度 {downloaded, total}（bytes）；null 代表非下載中
  const [progress, setProgress] = useState(null)
  const modelRef = useRef(null)
  const inflightRef = useRef(null)

  // 啟動時查 partial 進度（如果之前下載到一半被中斷，UI 可顯示「已下載 X / 42 MB，繼續下載」）
  useEffect(() => {
    if (status === 'ready') return
    getPartialProgress(VOSK_MODEL_URL).then((p) => {
      if (p.complete) {
        // Cache 內已有完整模型，但 localStorage 旗標掉了 → 補回 ready
        try { window.localStorage?.setItem(STORAGE_KEY_VOSK_READY, '1') } catch { /* noop */ }
        setStatus('ready')
      } else if (p.downloaded > 0 && p.total > 0) {
        setProgress({ downloaded: p.downloaded, total: p.total })
      }
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 真正載入模型：downloading → ready；若已快取會很快
  const download = useCallback(async () => {
    if (modelRef.current) return modelRef.current
    if (inflightRef.current) return inflightRef.current

    setStatus('downloading')
    setError(null)

    inflightRef.current = (async () => {
      // dynamic import 避免首屏載入巨大 vosk-browser bundle
      const importPromise = import('vosk-browser')

      // 抓 Wake Lock 防螢幕睡眠 + 防系統殺背景 PWA
      await acquireScreenWakeLock()

      // 斷點續傳下載（每 2MB 一塊，每塊立即存進 IDB，中斷下次可續）
      const blob = await downloadModelResumable(VOSK_MODEL_URL, {
        onProgress: ({ downloaded, total }) => setProgress({ downloaded, total })
      })

      const blobUrl = URL.createObjectURL(blob)
      const { createModel } = await importPromise
      let model
      try {
        model = await createModel(blobUrl)
      } finally {
        URL.revokeObjectURL(blobUrl)
      }
      modelRef.current = model
      try {
        window.localStorage?.setItem(STORAGE_KEY_VOSK_READY, '1')
      } catch { /* 私密瀏覽模式可能存不進去，無傷大雅 */ }
      setStatus('ready')
      setProgress(null)
      return model
    })()

    try {
      return await inflightRef.current
    } catch (err) {
      console.error('[vosk] 模型載入失敗', err)
      setError(err)
      setStatus('error')
      modelRef.current = null
      throw err
    } finally {
      inflightRef.current = null
      releaseScreenWakeLock()
    }
  }, [])

  const reset = useCallback(() => {
    modelRef.current = null
    inflightRef.current = null
    setStatus('idle')
    setError(null)
    try {
      window.localStorage?.removeItem(STORAGE_KEY_VOSK_READY)
    } catch {
      /* noop */
    }
  }, [])

  // 進標籤頁時若 status=ready 但 modelRef 尚未實例化，背景預載
  // 由 useRecorder/useVoskModel 觸發 download() 即可，這裡不主動跑

  useEffect(() => {
    return () => {
      // App unmount 時釋放（實務上不會發生）
      modelRef.current?.terminate?.()
    }
  }, [])

  return (
    <VoskContext.Provider value={{ status, progress, model: modelRef.current, error, download, reset, getModel: () => modelRef.current }}>
      {children}
    </VoskContext.Provider>
  )
}

export function useVosk() {
  return useContext(VoskContext)
}
