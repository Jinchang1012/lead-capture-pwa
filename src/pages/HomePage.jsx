import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLeadPlaceholder, patchLead } from '../db/db.js'
import { useTodayCount } from '../hooks/useLeads.js'
import { useVoskModel } from '../hooks/useVoskModel.js'
import { useQuota } from '../hooks/useQuota.js'
import { compressImage } from '../utils/compress.js'
import { isPersisted, requestPersist } from '../utils/quota.js'

export default function HomePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const todayCount = useTodayCount()
  const { status: voskStatus, download } = useVoskModel()
  const quota = useQuota([todayCount])
  const [micState, setMicState] = useState('idle') // idle | testing | ok | denied
  const [persisted, setPersisted] = useState(null) // null=未檢查, true/false

  // 啟動時請求持久化儲存，避免 Android 自動清掉 IndexedDB / Cache Storage
  // Android Chrome 通常 PWA 已安裝時會直接核准、未安裝時會拒絕（這也是引導 user 加到主畫面的訊號）
  useEffect(() => {
    let alive = true
    ;(async () => {
      const already = await isPersisted()
      if (already) {
        if (alive) setPersisted(true)
        return
      }
      const ok = await requestPersist()
      if (alive) setPersisted(ok)
    })()
    return () => { alive = false }
  }, [])

  async function handleCapture(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const id = await createLeadPlaceholder()
    navigate(`/tag/${id}`)
    compressImage(file)
      .then((blob) => patchLead(id, { photoBlob: blob, photoMime: blob.type || 'image/jpeg' }))
      .catch((err) => console.error('[home] 壓縮/儲存失敗', err))
  }

  async function testMic() {
    setMicState('testing')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setMicState('ok')
    } catch (err) {
      console.warn('[home] 麥克風授權失敗', err)
      setMicState('denied')
    }
  }

  async function downloadModel() {
    try {
      await download()
    } catch {
      /* status 已被 context 設為 error，UI 自動更新 */
    }
  }

  return (
    <main className="flex-1 flex flex-col px-6 pt-6 pb-6">
      {/* 頂部狀態列 */}
      <div className="flex items-center justify-between text-xs mb-2 gap-2 flex-wrap">
        <ModelChip status={voskStatus} onDownload={downloadModel} />
        <MicChip state={micState} onTest={testMic} />
      </div>
      {persisted === false && (
        <div className="mb-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
          💡 建議「加到主畫面」以鎖定儲存空間，避免系統自動清理你的資料
        </div>
      )}

      {/* 今日筆數 */}
      <header className="flex flex-col items-center mb-2">
        <div className="text-zinc-500 text-sm mb-1">今日已捕捉</div>
        <div className="text-7xl font-bold text-zinc-100 tabular-nums">{todayCount}</div>
        <div className="text-zinc-500 text-sm mt-1">張名片</div>
      </header>

      {/* 巨大拍照按鈕：用 label 原生觸發 file input（不靠 JS click，避免部分 Android 忽略 display:none input） */}
      <div className="flex-1 flex items-center justify-center">
        <label
          htmlFor="capture-input"
          role="button"
          className="
            w-[70vw] max-w-[320px] aspect-square rounded-full
            bg-emerald-500 active:bg-emerald-600
            shadow-[0_0_60px_rgba(16,185,129,0.35)]
            flex flex-col items-center justify-center
            text-zinc-950 font-bold cursor-pointer
            transition-all active:scale-95
          "
        >
          <span className="text-6xl mb-2">📷</span>
          <span className="text-2xl">拍名片</span>
        </label>
      </div>

      {/* file input：用 sr-only 視覺隱藏但保留可點性（display:none 會被部分瀏覽器忽略 click） */}
      <input
        id="capture-input"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="sr-only"
      />

      {quota?.supported && quota.warn && (
        <div className="mb-3 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          ⚠️ 儲存空間剩 {quota.remainingMB.toFixed(0)} MB，建議盡快匯出後清空
        </div>
      )}

      <footer className="flex gap-3 mt-6">
        <button
          onClick={() => navigate('/list')}
          className="flex-1 py-4 rounded-2xl bg-surface text-zinc-200 font-medium active:scale-95 transition-all"
        >
          清單
        </button>
        <button
          onClick={() => navigate('/export')}
          className="flex-1 py-4 rounded-2xl bg-surface text-zinc-200 font-medium active:scale-95 transition-all"
        >
          匯出
        </button>
      </footer>
    </main>
  )
}

function ModelChip({ status, onDownload }) {
  if (status === 'ready') {
    return (
      <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        🎙️ 語音識別就緒
      </span>
    )
  }
  if (status === 'downloading') {
    return (
      <span className="px-2 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 animate-pulse">
        ⏬ 下載中…
      </span>
    )
  }
  if (status === 'error') {
    return (
      <button onClick={onDownload} className="px-2 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
        ⚠️ 載入失敗，重試
      </button>
    )
  }
  return (
    <button onClick={onDownload} className="px-2 py-1 rounded-full bg-zinc-700 text-zinc-200 font-medium">
      📥 下載語音模型 (42MB)
    </button>
  )
}

function MicChip({ state, onTest }) {
  if (state === 'ok') {
    return <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">🎤 麥克風 OK</span>
  }
  if (state === 'denied') {
    return <button onClick={onTest} className="px-2 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">🎤 被拒，重試</button>
  }
  if (state === 'testing') {
    return <span className="px-2 py-1 rounded-full bg-sky-500/15 text-sky-300 animate-pulse">🎤 授權中…</span>
  }
  return <button onClick={onTest} className="px-2 py-1 rounded-full bg-zinc-700 text-zinc-200">🎤 測試麥克風</button>
}
