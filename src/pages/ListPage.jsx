import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteLead, GRADES, PRODUCTS } from '../db/db.js'
import { useAllLeads } from '../hooks/useLeads.js'
import LongPressDelete from '../components/LongPressDelete.jsx'

const GRADE_LABEL = Object.fromEntries(GRADES.map((g) => [g.key, g.label]))
const PRODUCT_LABEL = Object.fromEntries(PRODUCTS.map((p) => [p.key, p.label]))

export default function ListPage() {
  const navigate = useNavigate()
  const leads = useAllLeads()

  return (
    <main className="flex-1 flex flex-col px-4 pt-3 pb-4 overflow-hidden">
      <header className="flex items-center gap-3 mb-3 shrink-0">
        <button
          onClick={() => navigate('/', { replace: true })}
          className="px-3 h-10 rounded-xl bg-surface text-zinc-200 text-sm"
        >
          ← 回首頁
        </button>
        <div className="flex-1 text-zinc-300 font-semibold">所有紀錄（{leads.length}）</div>
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
          <LeadRow key={lead.id} lead={lead} onOpen={() => navigate(`/tag/${lead.id}`)} />
        ))}
      </div>
    </main>
  )
}

function LeadRow({ lead, onOpen }) {
  const photoUrl = useMemo(
    () => (lead.photoBlob ? URL.createObjectURL(lead.photoBlob) : null),
    [lead.photoBlob]
  )
  useEffect(() => () => photoUrl && URL.revokeObjectURL(photoUrl), [photoUrl])

  const products = (lead.tags?.products ?? []).map((k) => PRODUCT_LABEL[k] ?? k)
  const grade = lead.tags?.grade

  return (
    <div className="bg-surface rounded-2xl p-3 flex gap-3 items-center">
      <button onClick={onOpen} className="shrink-0">
        <div className="w-16 h-16 rounded-xl bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-600 text-xs">
          {photoUrl ? (
            <img src={photoUrl} alt="名片" className="w-full h-full object-cover" />
          ) : (
            '無圖'
          )}
        </div>
      </button>

      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 text-sm mb-1">
          {grade && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              {GRADE_LABEL[grade]}
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
          {products.length ? products.join('、') : <span className="text-zinc-600">無產品標籤</span>}
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
