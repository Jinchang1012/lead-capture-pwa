import { useRegisterSW } from 'virtual:pwa-register/react'

// 偵測到新版時跳橫條，user 點「立即更新」才套用
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(swUrl) {
      console.log('[sw] 註冊成功', swUrl)
    },
    onRegisterError(err) {
      console.error('[sw] 註冊失敗', err)
    }
  })

  if (!needRefresh) return null

  return (
    <div
      className="
        fixed left-2 right-2 top-2 z-50
        bg-emerald-500/95 text-zinc-950
        rounded-2xl px-4 py-3 shadow-2xl
        flex items-center gap-3
      "
      style={{ marginTop: 'env(safe-area-inset-top)' }}
    >
      <span className="text-xl shrink-0">🔄</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">有新版可用</div>
        <div className="text-xs opacity-80">點立即更新會重新載入，現有資料不影響</div>
      </div>
      <button
        onClick={() => updateServiceWorker(true)}
        className="px-3 py-2 rounded-xl bg-zinc-950 text-emerald-400 font-bold text-sm shrink-0"
      >
        立即更新
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="text-zinc-900/60 text-2xl leading-none shrink-0"
        aria-label="稍後"
      >
        ×
      </button>
    </div>
  )
}
