import Dexie from 'dexie'
import { VOSK_MODEL_TOTAL_BYTES, VOSK_MODEL_URL } from '../config.js'

// 模型下載專用的 IDB（與 leads DB 隔開）
const dlDb = new Dexie('model_dl')
dlDb.version(1).stores({
  // url 主鍵，chunks: Blob[]（已下載的分塊），totalSize, downloaded
  partial: 'url'
})

const CACHE_NAME = 'vosk-model-v1'
const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB 一塊

// 取得已下載大小（給 UI 顯示「已下載 X MB」）
export async function getPartialProgress(url) {
  // 先看 Cache Storage 是否已完成
  try {
    const cache = await caches.open(CACHE_NAME)
    const done = await cache.match(url)
    if (done) {
      const blob = await done.blob()
      return { downloaded: blob.size, total: blob.size, complete: true }
    }
  } catch { /* noop */ }
  const state = await dlDb.partial.get(url).catch(() => null)
  if (!state) return { downloaded: 0, total: 0, complete: false }
  return { downloaded: state.downloaded, total: state.totalSize, complete: false }
}

// 斷點續傳下載：分 2MB 塊，每塊抓完立即寫進 IDB
// 中途中斷下次開啟可從上次位置繼續
// 不用 HEAD（跨網域 CORS 常擋）— 用第一個 Range GET 的 Content-Range 解析總大小
export async function downloadModelResumable(url, { onProgress, signal } = {}) {
  const cache = await caches.open(CACHE_NAME)

  // 已完成 → 直接從 cache 取
  const cached = await cache.match(url)
  if (cached) return cached.blob()

  // 查 partial 狀態
  let state = await dlDb.partial.get(url).catch(() => null)

  if (state?.totalSize) {
    onProgress?.({ downloaded: state.downloaded, total: state.totalSize })
  } else {
    onProgress?.({ downloaded: 0, total: 0 })
  }

  while (!state?.totalSize || state.downloaded < state.totalSize) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const start = state?.downloaded ?? 0
    const end = start + CHUNK_SIZE - 1

    let resp
    try {
      resp = await fetch(url, {
        headers: { Range: `bytes=${start}-${end}` },
        signal,
        // 跨網域：CORS 模式，伺服器若無 ACAO header 會擋
        mode: 'cors',
        credentials: 'omit'
      })
    } catch (err) {
      // 網路層 / CORS 失敗，包成可讀訊息
      throw new Error(`下載失敗：${err.message || err}（網路或 CORS 問題；起點 byte=${start}）`)
    }

    if (!resp.ok && resp.status !== 206) {
      throw new Error(`下載失敗：HTTP ${resp.status} ${resp.statusText}（起點 byte=${start}）`)
    }

    // 第一個 chunk：嘗試從 Content-Range 拿總大小
    // 跨網域時 CORS 不暴露 Content-Range，會拿 null → 用設定檔的硬編碼大小
    if (!state?.totalSize) {
      const cr = resp.headers.get('content-range')
      let total = 0
      if (cr) {
        const m = cr.match(/\/(\d+)/)
        if (m) total = parseInt(m[1], 10)
      }
      // Fallback 1：已知 URL 用設定檔常數
      if (!total && url === VOSK_MODEL_URL) {
        total = VOSK_MODEL_TOTAL_BYTES
      }
      // Fallback 2：若伺服器一次回完整檔（不支援 Range），把單次 Content-Length 當總大小
      if (!total && resp.status === 200) {
        const cl = resp.headers.get('content-length')
        total = cl ? parseInt(cl, 10) : 0
      }
      if (!total) {
        throw new Error('下載失敗：無法決定檔案總大小')
      }
      state = state ?? { url, chunks: [], downloaded: 0 }
      state.totalSize = total
    }

    const chunkBlob = await resp.blob()
    state.chunks.push(chunkBlob)
    state.downloaded = Math.min(start + chunkBlob.size, state.totalSize)
    // 每塊立即持久化（斷點續傳的關鍵）
    await dlDb.partial.put(state)
    onProgress?.({ downloaded: state.downloaded, total: state.totalSize })

    // 若伺服器忽略 Range 一次回完整檔，可能 chunkBlob.size === totalSize → 迴圈結束
    if (chunkBlob.size === 0) {
      throw new Error(`下載失敗：第 ${start} byte 拿到空 chunk`)
    }
  }

  // 合併所有塊 → 完整 Blob
  const fullBlob = new Blob(state.chunks, { type: 'application/octet-stream' })

  // 寫入 Cache Storage
  await cache.put(url, new Response(fullBlob))

  // 清掉 partial
  await dlDb.partial.delete(url).catch(() => {})

  return fullBlob
}

// Wake Lock：下載時防止螢幕睡眠、防止系統把 PWA 當背景殺掉
let wakeLockRef = null
export async function acquireScreenWakeLock() {
  if (!('wakeLock' in navigator)) return false
  try {
    wakeLockRef = await navigator.wakeLock.request('screen')
    return true
  } catch {
    return false
  }
}
export function releaseScreenWakeLock() {
  try { wakeLockRef?.release() } catch { /* noop */ }
  wakeLockRef = null
}
// visibility 切回前景時若已斷開 Wake Lock，重新請求（spec 要求）
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wakeLockRef === null) {
      // 不主動重抓；下載中的話 VoskContext 會處理
    }
  })
}
