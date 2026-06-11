import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { patchLead } from '../db/db.js'
import { useLead } from '../hooks/useLeads.js'
import { useRecorder } from '../hooks/useRecorder.js'
import { useVosk } from '../context/VoskContext.jsx'
import { useFontSize, useQuestions } from '../store/questions.js'
import { RECORD_MAX_SECONDS } from '../config.js'
import TagButton from '../components/TagButton.jsx'
import RecordButton from '../components/RecordButton.jsx'

export default function TagPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lead = useLead(id)
  const { status: voskStatus } = useVosk()
  const questions = useQuestions()
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

  // 問題組答案操作（規格 §6.3）：單選再點同選項 = 取消；複選 toggle；點擊即寫 DB
  function toggleAnswer(question, optionKey) {
    const current = lead.answers?.[question.id] ?? []
    let next
    if (question.type === 'single') {
      next = current[0] === optionKey ? [] : [optionKey]
    } else {
      next = current.includes(optionKey)
        ? current.filter((k) => k !== optionKey)
        : [...current, optionKey]
    }
    patchLead(id, { answers: { ...lead.answers, [question.id]: next } })
  }
  function onNoteChange(text) {
    // 若 user 編輯了 transcript 後的文字，標記 edited
    patchLead(id, { textNote: text })
  }
  function onTranscriptEdit(text) {
    patchLead(id, { transcript: text, transcriptEdited: true })
  }
  function toggleFollowUp() {
    patchLead(id, { followUp: !lead.followUp })
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
            {/* ⭐ 待跟進標記（規格 §11 v0.0.3） */}
            <button
              onClick={toggleFollowUp}
              className={`w-14 h-14 rounded-2xl shrink-0 text-2xl transition-all active:scale-95 ${
                lead.followUp
                  ? 'bg-amber-400/20 border border-amber-400/50'
                  : 'bg-surface border border-zinc-700'
              }`}
              aria-label="待跟進"
            >
              {lead.followUp ? '⭐' : '☆'}
            </button>
          </>
        )}
      </section>

      {/* 問題組：依 store 定義動態渲染（規格 §6.3：single→3 欄 emerald，multi→2 欄 sky） */}
      {questions.map((q, qi) => {
        const selected = lead.answers?.[q.id] ?? []
        return (
          <section key={q.id}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-zinc-400 text-sm">
                {q.title}
                {q.type === 'multi' && <span className="text-zinc-600 text-xs">（可複選）</span>}
              </div>
              {qi === 0 && (
                <button
                  onClick={() => navigate('/settings')}
                  className="text-emerald-400 text-xs"
                >
                  ✏️ 編輯
                </button>
              )}
            </div>
            <div className={`grid gap-2 ${q.type === 'single' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {q.options.map((o) => (
                <TagButton
                  key={o.key}
                  active={selected.includes(o.key)}
                  onClick={() => toggleAnswer(q, o.key)}
                  sub={o.desc}
                  variant={q.type === 'single' ? 'grade' : 'product'}
                  tagClass={fontSize.tagClass}
                  subClass={fontSize.subClass}
                >
                  {o.label}
                </TagButton>
              ))}
            </div>
          </section>
        )
      })}

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
