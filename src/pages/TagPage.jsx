import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GRADES, patchLead } from '../db/db.js'
import { useLead } from '../hooks/useLeads.js'
import { useRecorder } from '../hooks/useRecorder.js'
import { useVosk } from '../context/VoskContext.jsx'
import { useFontSize, useProducts } from '../store/products.js'
import { RECORD_MAX_SECONDS } from '../config.js'
import TagButton from '../components/TagButton.jsx'
import RecordButton from '../components/RecordButton.jsx'

export default function TagPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lead = useLead(id)
  const { status: voskStatus } = useVosk()
  const PRODUCTS = useProducts()
  const fontSize = useFontSize()

  // 即時轉寫顯示
  const [liveText, setLiveText] = useState('')

  const recorder = useRecorder({
    onPartial: (text) => setLiveText(text),
    onFinal: ({ transcript, audioBlob, audioMime, audioDuration }) => {
      // 寫回 DB：transcript 取代既有（覆蓋式），原始音檔也存
      patchLead(id, {
        transcript: transcript || lead?.transcript || '',
        audioBlob: audioBlob ?? lead?.audioBlob ?? null,
        audioMime: audioMime ?? lead?.audioMime ?? null,
        audioDuration: audioDuration ?? lead?.audioDuration ?? null,
        transcriptEdited: false
      })
      setLiveText('')
    }
  })

  // 用 Object URL 預覽縮圖；卸載時釋放
  const photoUrl = useMemo(() => {
    if (lead?.photoBlob) return URL.createObjectURL(lead.photoBlob)
    return null
  }, [lead?.photoBlob])

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    }
  }, [photoUrl])

  if (lead === undefined) {
    return (
      <main className="flex-1 flex items-center justify-center text-zinc-500">載入中…</main>
    )
  }
  if (lead === null) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
        <div>找不到此筆紀錄</div>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="px-6 py-3 bg-surface rounded-2xl text-zinc-200"
        >
          回首頁
        </button>
      </main>
    )
  }

  const grade = lead.tags?.grade ?? null
  const products = lead.tags?.products ?? []

  function setGrade(g) {
    const next = grade === g ? null : g
    patchLead(id, { tags: { ...lead.tags, grade: next } })
  }
  function toggleProduct(p) {
    const exists = products.includes(p)
    const next = exists ? products.filter((x) => x !== p) : [...products, p]
    patchLead(id, { tags: { ...lead.tags, products: next } })
  }
  function onNoteChange(text) {
    // 若 user 編輯了 transcript 後的文字，標記 edited
    patchLead(id, { textNote: text })
  }
  function onTranscriptEdit(text) {
    patchLead(id, { transcript: text, transcriptEdited: true })
  }
  function complete() {
    // 若還在錄音，先停
    if (recorder.isRecording) recorder.stop()
    navigate('/', { replace: true })
  }

  const recDisabled = false // 即使模型未就緒，也允許純錄音；錯誤狀態下仍可錄
  const recAvailable = voskStatus === 'ready' || voskStatus === 'downloading'

  return (
    <main className="flex-1 flex flex-col px-4 pt-3 pb-2 gap-3 overflow-y-auto relative">
      {/* 上：縮圖 + 時間，錄音時切換為即時轉寫框 */}
      <section className="flex items-center gap-3 min-h-[88px]">
        {recorder.isRecording ? (
          <div className="flex-1 rounded-2xl bg-red-500/15 border border-red-500/40 p-3">
            <div className="flex items-center justify-between text-xs text-red-300 mb-1">
              <span>🔴 錄音中 {recAvailable ? '+ 即時識別' : '（模型未就緒，純錄音）'}</span>
              <span className="tabular-nums">{recorder.elapsed}s / {RECORD_MAX_SECONDS}s</span>
            </div>
            <div className="text-zinc-100 text-base leading-snug min-h-[40px]">
              <span className="text-zinc-100">{liveText.split(' ').slice(0, -1).join(' ')} </span>
              <span className="text-zinc-400">{liveText.split(' ').slice(-1).join(' ')}</span>
              {!liveText && (
                <span className="text-zinc-500 text-sm">講話即顯示文字…</span>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 rounded-xl bg-surface overflow-hidden flex items-center justify-center text-zinc-600 text-xs shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="名片" className="w-full h-full object-cover" />
              ) : (
                '處理中…'
              )}
            </div>
            <div className="flex-1 text-zinc-400 text-sm">
              <div className="text-zinc-200 font-semibold">捕捉成功</div>
              <div>{new Date(lead.createdAt).toLocaleTimeString('zh-Hant')}</div>
              {lead.transcript && (
                <div className="text-zinc-500 text-xs mt-1 line-clamp-1">🎙️ {lead.transcript}</div>
              )}
            </div>
          </>
        )}
      </section>

      {/* 中：分級 */}
      <section>
        <div className="text-zinc-400 text-sm mb-2">客戶分級</div>
        <div className="grid grid-cols-3 gap-2">
          {GRADES.map((g) => (
            <TagButton
              key={g.key}
              active={grade === g.key}
              onClick={() => setGrade(g.key)}
              sub={g.desc}
              variant="grade"
              tagClass={fontSize.tagClass}
              subClass={fontSize.subClass}
            >
              {g.label}
            </TagButton>
          ))}
        </div>
      </section>

      {/* 產品標籤 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="text-zinc-400 text-sm">產品關注</div>
          <button
            onClick={() => navigate('/settings')}
            className="text-emerald-400 text-xs"
          >
            ✏️ 編輯
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PRODUCTS.map((p) => (
            <TagButton
              key={p.key}
              active={products.includes(p.key)}
              onClick={() => toggleProduct(p.key)}
              variant="product"
              tagClass={fontSize.tagClass}
              subClass={fontSize.subClass}
            >
              {p.label}
            </TagButton>
          ))}
        </div>
      </section>

      {/* 語音轉寫結果（已存的 transcript 可手動編輯） */}
      {lead.transcript && !recorder.isRecording && (
        <section>
          <div className="text-zinc-400 text-sm mb-2 flex items-center gap-2">
            🎙️ 語音轉寫
            {lead.transcriptEdited && <span className="text-xs text-emerald-400">（已修正）</span>}
          </div>
          <textarea
            value={lead.transcript}
            onChange={(e) => onTranscriptEdit(e.target.value)}
            rows={2}
            className="w-full rounded-2xl bg-surface text-zinc-100 p-3 outline-none resize-none"
          />
        </section>
      )}

      {/* 文字補充 */}
      <section className="flex-1 flex flex-col min-h-[80px]">
        <div className="text-zinc-400 text-sm mb-2">文字補充（選填）</div>
        <textarea
          value={lead.textNote}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={recAvailable ? '可手打，或按右下角 🎙️ 說話補充' : '可手打備註'}
          className="flex-1 min-h-[60px] rounded-2xl bg-surface text-zinc-100 p-3 outline-none resize-none placeholder:text-zinc-600"
        />
      </section>

      {/* 底部：完成按鈕 + 右下 FAB */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={complete}
          className="
            flex-1 h-[88px] rounded-2xl bg-emerald-500 active:bg-emerald-600
            text-zinc-950 font-bold text-2xl
            transition-all active:scale-[0.98]
          "
        >
          ✓ 完成
        </button>
        <RecordButton
          isRecording={recorder.isRecording}
          elapsed={recorder.elapsed}
          disabled={recDisabled}
          onPressStart={() => recorder.start()}
          onPressEnd={() => recorder.stop()}
        />
      </div>
    </main>
  )
}
