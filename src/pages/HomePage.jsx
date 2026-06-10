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
  const { status: voskStatus, progress: voskProgress, error: voskError, download } = useVoskModel()
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
        <ModelChip status={voskStatus} progress={voskProgress} onDownload={downloadModel} />
        <MicChip state={micState} onTest={testMic} />
      </div>
      {persisted === false && (
        <div className="mb-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
          💡 建議「加到主畫面」以鎖定儲存空間，避免系統自動清理你的資料
        </div>
      )}

      {/* 模型下載進度條 + 警告 */}
      {(voskStatus === 'downloading' || (voskProgress && voskStatus !== 'ready')) && (
        <DownloadProgress progress={voskProgress} status={voskStatus} />
      )}

      {/* 錯誤訊息（user 看得到實際失敗原因，方便回報） */}
      {voskStatus === 'error' && voskError && (
        <div className="mb-3 text-xs text-red-200 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          <div className="font-semibold mb-1">❌ 語音模型載入失敗</div>
          <div className="break-words leading-relaxed">{String(voskError.message || voskError)}</div>
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

function ModelChip({ status, progress, onDownload }) {
  const hasPartial = progress && progress.downloaded > 0 && progress.downloaded < progress.total
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
  if (hasPartial) {
    const pct = Math.floor((progress.downloaded / progress.total) * 100)
    return (
      <button onClick={onDownload} className="px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
        ▶ 繼續下載（{pct}%）
      </button>
    )
  }
  return (
    <button onClick={onDownload} className="px-2 py-1 rounded-full bg-zinc-700 text-zinc-200 font-medium">
      📥 下載語音模型 (32MB)
    </button>
  )
}

function DownloadProgress({ progress, status }) {
  const downloaded = progress?.downloaded ?? 0
  const total = progress?.total ?? 0
  const downloadedMB = (downloaded / 1024 / 1024).toFixed(1)
  const totalMB = total ? (total / 1024 / 1024).toFixed(1) : '?'
  const percent = total ? Math.min(100, (downloaded / total) * 100) : 0
  const downloading = status === 'downloading'
  const partial = !downloading && downloaded > 0 && downloaded < total

  return (
    <div className={`
      mb-3 rounded-xl px-3 py-2 border
      ${downloading
        ? 'bg-sky-500/10 border-sky-500/30 text-sky-200'
        : 'bg-amber-500/10 border-amber-500/30 text-amber-200'}
    `}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span>
          {downloading ? '⏬ 下載中…' : partial ? '⏸ 已暫停（可續傳）' : '下載中…'}
        </span>
        <span className="tabular-nums">
          {downloadedMB} / {totalMB} MB ({percent.toFixed(0)}%)
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full ${downloading ? 'bg-sky-400' : 'bg-amber-400'} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {downloading && (
        <div className="text-[10px] mt-1 opacity-80">
          💡 請保持 app 開啟、不要鎖螢幕 — 已下載部分已存檔，中斷可續傳
        </div>
      )}
    </div>
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
