// 包 navigator.storage.estimate 並換算 MB
export async function getQuotaEstimate() {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { supported: false }
  }
  try {
    const est = await navigator.storage.estimate()
    const usage = est.usage ?? 0
    const quota = est.quota ?? 0
    const remaining = Math.max(0, quota - usage)
    return {
      supported: true,
      usageMB: usage / 1024 / 1024,
      quotaMB: quota / 1024 / 1024,
      remainingMB: remaining / 1024 / 1024,
      // 剩餘 < 50MB 警告
      warn: remaining < 50 * 1024 * 1024
    }
  } catch {
    return { supported: false }
  }
}

// 請求持久化儲存（避免瀏覽器自動清掉 IndexedDB）
export async function requestPersist() {
  if (!navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function isPersisted() {
  if (!navigator.storage?.persisted) return false
  try {
    return await navigator.storage.persisted()
  } catch {
    return false
  }
}
