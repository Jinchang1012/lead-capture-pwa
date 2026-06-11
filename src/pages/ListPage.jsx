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

  const [search, setSearch] = useState('')
  const [onlyFollowUp, setOnlyFollowUp] = useState(false)
  // 選項篩選：{ [questionId]: Set<optionKey> }（任一命中即顯示，OR 邏輯）
  const [optionFilter, setOptionFilter] = useState({})
  const [showFilters, setShowFilters] = useState(false)

  function toggleOption(qid, key) {
    setOptionFilter((prev) => {
      const set = new Set(prev[qid] ?? [])
      if (set.has(key)) set.delete(key)
      else set.add(key)
      const next = { ...prev, [qid]: set }
      if (set.size === 0) delete next[qid]
      return next
    })
  }
  function clearFilters() {
    setSearch('')
    setOnlyFollowUp(false)
    setOptionFilter({})
  }

  const activeFilterCount =
    (onlyFollowUp ? 1 : 0) +
    Object.values(optionFilter).reduce((n, s) => n + s.size, 0) +
    (search.trim() ? 1 : 0)

  // 篩選 + 排序（待跟進置頂）
  const leads = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = rawLeads.filter((lead) => {
      if (onlyFollowUp && !lead.followUp) return false
      // 文字搜尋：備註 + 轉寫
      if (q) {
        const hay = `${lead.textNote ?? ''} ${lead.transcript ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      // 選項篩選：每個有篩選的問題組，lead 至少命中一個選項（組間 AND，組內 OR）
      for (const [qid, set] of Object.entries(optionFilter)) {
        const answered = lead.answers?.[qid] ?? []
        if (!answered.some((k) => set.has(k))) return false
      }
      return true
    })
    const followUps = filtered.filter((l) => l.followUp)
    const rest = filtered.filter((l) => !l.followUp)
    return [...followUps, ...rest]
  }, [rawLeads, search, onlyFollowUp, optionFilter])

  const followCount = rawLeads.filter((l) => l.followUp).length

  return (
    <main className="flex-1 flex flex-col px-4 pt-3 pb-4 overflow-hidden">
      <header className="flex items-center gap-3 mb-2 shrink-0">
        <button
          onClick={() => navigate('/', { replace: true })}
          className="px-3 h-10 rounded-xl bg-surface text-zinc-200 text-sm"
        >
          ← 回首頁
        </button>
        <div className="flex-1 text-zinc-300 font-semibold">
          紀錄（{leads.length}{activeFilterCount > 0 ? `/${rawLeads.length}` : ''}）
          {followCount > 0 && <span className="text-amber-400 text-sm ml-2">⭐ {followCount}</span>}
        </div>
        <button
          onClick={() => navigate('/export')}
          className="px-3 h-10 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-medium"
        >
          匯出
        </button>
      </header>

      {/* 搜尋列 */}
      <div className="flex gap-2 mb-2 shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋備註 / 語音轉寫…"
          className="flex-1 h-11 rounded-xl bg-surface text-zinc-100 px-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`px-3 h-11 rounded-xl text-sm shrink-0 ${
            showFilters || activeFilterCount > 0
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-surface text-zinc-300'
          }`}
        >
          篩選{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
      </div>

      {/* 篩選面板 */}
      {showFilters && (
        <div className="mb-2 p-3 bg-surface rounded-xl space-y-3 shrink-0 max-h-[40vh] overflow-y-auto">
          <button
            onClick={() => setOnlyFollowUp((v) => !v)}
            className={`px-3 h-9 rounded-full text-sm ${
              onlyFollowUp
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            ⭐ 只看待跟進
          </button>

          {questions.map((q) => (
            <div key={q.id}>
              <div className="text-zinc-500 text-xs mb-1">{q.title}</div>
              <div className="flex flex-wrap gap-1.5">
                {q.options.map((o) => {
                  const active = optionFilter[q.id]?.has(o.key)
                  return (
                    <button
                      key={o.key}
                      onClick={() => toggleOption(q.id, o.key)}
                      className={`px-2.5 h-8 rounded-full text-xs ${
                        active
                          ? 'bg-emerald-500 text-zinc-950 font-medium'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-zinc-500 text-xs underline">
              清除全部篩選
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {leads.length === 0 && (
          <div className="text-zinc-500 text-center mt-12">
            {rawLeads.length === 0 ? '尚無紀錄' : '無符合篩選的紀錄'}
          </div>
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
