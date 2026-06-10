import Dexie from 'dexie'

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
export async function downloadModelResumable(url, { onProgress, signal } = {}) {
  const cache = await caches.open(CACHE_NAME)

  // 已完成 → 直接從 cache 取
  const cached = await cache.match(url)
  if (cached) return cached.blob()

  // 查 partial 狀態
  let state = await dlDb.partial.get(url).catch(() => null)

  // HEAD 取總大小（順便驗檔案有沒有換版）
  const headResp = await fetch(url, { method: 'HEAD', signal })
  if (!headResp.ok) throw new Error('HEAD HTTP ' + headResp.status)
  const totalSize = parseInt(headResp.headers.get('content-length') || '0', 10)
  if (!totalSize) throw new Error('伺服器未提供 Content-Length')

  // 檔案總大小變了 → partial 失效，重來
  if (!state || state.totalSize !== totalSize) {
    state = { url, chunks: [], totalSize, downloaded: 0 }
    await dlDb.partial.put(state)
  }

  onProgress?.({ downloaded: state.downloaded, total: totalSize })

  while (state.downloaded < totalSize) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const start = state.downloaded
    const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1)
    const resp = await fetch(url, {
      headers: { Range: `bytes=${start}-${end}` },
      signal
    })
    if (!resp.ok && resp.status !== 206) {
      throw new Error('Range HTTP ' + resp.status)
    }
    const chunkBlob = await resp.blob()
    state.chunks.push(chunkBlob)
    state.downloaded = end + 1
    // 每塊立即持久化（這是斷點續傳的關鍵）
    await dlDb.partial.put(state)
    onProgress?.({ downloaded: state.downloaded, total: totalSize })
  }

  // 合併所有塊 → 一個完整 Blob
  const fullBlob = new Blob(state.chunks, { type: 'application/octet-stream' })

  // 寫入 Cache Storage（正式存放，下次啟動 cache-first 就拿這個）
  await cache.put(url, new Response(fullBlob))

  // 清掉 partial（節省空間，~42MB 立即釋放）
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
