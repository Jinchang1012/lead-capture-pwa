import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { STORAGE_KEY_VOSK_READY, VOSK_MODEL_URL } from '../config.js'

// status: 'idle' | 'downloading' | 'ready' | 'error'
// model: vosk-browser 的 Model 實例（ready 時才有值）
const VoskContext = createContext({
  status: 'idle',
  model: null,
  error: null,
  download: async () => {},
  reset: () => {}
})

// 模型下載走自管 Cache Storage（cache-first）：
// 下載成功後存進 caches('vosk-model-v1')，之後離線直接從快取取，
// 不依賴 vosk-browser 內部快取行為（該行為無文件保證）
const MODEL_CACHE = 'vosk-model-v1'

async function fetchModelBlobUrl(url) {
  let response = null
  try {
    const cache = await caches.open(MODEL_CACHE)
    response = await cache.match(url)
    if (!response) {
      // 未快取 → 網路抓 + 存快取
      response = await fetch(url)
      if (!response.ok) throw new Error(`模型下載失敗 HTTP ${response.status}`)
      await cache.put(url, response.clone())
    }
  } catch (err) {
    // Cache Storage 不可用（極舊瀏覽器）→ 直接網路抓
    if (!response) {
      response = await fetch(url)
      if (!response.ok) throw err
    }
  }
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export function VoskProvider({ children }) {
  const initialReady = typeof window !== 'undefined' && window.localStorage?.getItem(STORAGE_KEY_VOSK_READY) === '1'
  // 初始狀態：localStorage 有 ready 旗標 → 顯示為 ready（樂觀），實際模型實例 lazy load
  const [status, setStatus] = useState(initialReady ? 'ready' : 'idle')
  const [error, setError] = useState(null)
  const modelRef = useRef(null)
  const inflightRef = useRef(null)

  // 真正載入模型：downloading → ready；若已快取會很快
  const download = useCallback(async () => {
    if (modelRef.current) return modelRef.current
    if (inflightRef.current) return inflightRef.current

    setStatus('downloading')
    setError(null)

    inflightRef.current = (async () => {
      // dynamic import 避免首屏載入巨大 vosk-browser bundle
      const { createModel } = await import('vosk-browser')
      // 模型 tarball 走 cache-first：飯店下載一次，展場離線直接用
      const blobUrl = await fetchModelBlobUrl(VOSK_MODEL_URL)
      let model
      try {
        model = await createModel(blobUrl)
      } finally {
        URL.revokeObjectURL(blobUrl)
      }
      modelRef.current = model
      try {
        window.localStorage?.setItem(STORAGE_KEY_VOSK_READY, '1')
      } catch {
        // 私密瀏覽模式可能存不進去，無傷大雅
      }
      setStatus('ready')
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
    <VoskContext.Provider value={{ status, model: modelRef.current, error, download, reset, getModel: () => modelRef.current }}>
      {children}
    </VoskContext.Provider>
  )
}

export function useVosk() {
  return useContext(VoskContext)
}
