import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteLead } from '../db/db.js'
import { useAllLeads } from '../hooks/useLeads.js'
import { useQuestions } from '../store/questions.js'
import LongPressDelete from '../components/LongPressDelete.jsx'

export default function ListPage() {
  const navigate = useNavigate()
  const rawLeads = useAllLeads()
  const questions = useQuestions()

  // 待跟進置頂，其餘維持 createdAt 倒序（useAllLeads 已倒序）
  const leads = useMemo(() => {
    const followUps = rawLeads.filter((l) => l.followUp)
    const rest = rawLeads.filter((l) => !l.followUp)
    return [...followUps, ...rest]
  }, [rawLeads])
  const followCount = rawLeads.filter((l) => l.followUp).length

  return (
    <main className="flex-1 flex flex-col px-4 pt-3 pb-4 overflow-hidden">
      <header className="flex items-center gap-3 mb-3 shrink-0">
        <button
          onClick={() => navigate('/', { replace: true })}
          className="px-3 h-10 rounded-xl bg-surface text-zinc-200 text-sm"
        >
          ← 回首頁
        </button>
        <div className="flex-1 text-zinc-300 font-semibold">
          所有紀錄（{leads.length}）
          {followCount > 0 && <span className="text-amber-400 text-sm ml-2">⭐ {followCount}</span>}
        </div>
        <button
          onClick={() => navigate('/export')}
          className="px-3 h-10 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-medium"
        >
          匯出
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {leads.length === 0 && (
          <div className="text-zinc-500 text-center mt-12">尚無紀錄</div>
        )}
        {leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} onOpen={() => navigate(`/tag/${lead.id}`)} questions={questions} />
        ))}
      </div>
    </main>
  )
}

function LeadRow({ lead, onOpen, questions }) {
  const photoUrl = useMemo(
    () => (lead.photoBlob ? URL.createObjectURL(lead.photoBlob) : null),
    [lead.photoBlob]
  )
  useEffect(() => () => photoUrl && URL.revokeObjectURL(photoUrl), [photoUrl])

  // 分級 chip 用 grade 組；其餘問題組答案合併成一行（對不到的 key 顯示原 key，規格 §6.3）
  const gradeQ = questions.find((q) => q.id === 'grade')
  const gradeKey = lead.answers?.grade?.[0]
  const gradeLabel = gradeKey
    ? (gradeQ?.options.find((o) => o.key === gradeKey)?.label ?? gradeKey)
    : null
  const otherLabels = questions
    .filter((q) => q.id !== 'grade')
    .flatMap((q) => {
      const keys = lead.answers?.[q.id] ?? []
      return keys.map((k) => q.options.find((o) => o.key === k)?.label ?? k)
    })

  return (
    <div className={`rounded-2xl p-3 flex gap-3 items-center ${
      lead.followUp ? 'bg-amber-400/10 border border-amber-400/30' : 'bg-surface'
    }`}>
      <button onClick={onOpen} className="shrink-0 relative">
        <div className="w-16 h-16 rounded-xl bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-600 text-xs">
          {photoUrl ? (
            <img src={photoUrl} alt="名片" className="w-full h-full object-cover" />
          ) : (
            '無圖'
          )}
        </div>
        {lead.followUp && (
          <span className="absolute -top-1 -right-1 text-sm">⭐</span>
        )}
      </button>

      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 text-sm mb-1">
          {gradeLabel && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              {gradeLabel}
            </span>
          )}
          <span className="text-zinc-500 text-xs">
            {new Date(lead.createdAt).toLocaleTimeString('zh-Hant')}
          </span>
          {lead.audioDuration ? (
            <span className="text-zinc-500 text-xs">🎙 {lead.audioDuration}s</span>
          ) : null}
        </div>
        <div className="text-zinc-300 text-xs truncate">
          {otherLabels.length ? otherLabels.join('、') : <span className="text-zinc-600">無標籤</span>}
        </div>
        {(lead.transcript || lead.textNote) && (
          <div className="text-zinc-500 text-xs truncate mt-1">
            {lead.transcript || lead.textNote}
          </div>
        )}
      </button>

      <LongPressDelete onConfirm={() => deleteLead(lead.id)} label="🗑" />
    </div>
  )
}
