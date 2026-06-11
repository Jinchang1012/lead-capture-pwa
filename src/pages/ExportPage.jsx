import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/db.js'
import { useAllLeads } from '../hooks/useLeads.js'
import { useQuota } from '../hooks/useQuota.js'
import { exportCsv } from '../utils/exportCsv.js'
import { exportZip, exportMarkdownBundle } from '../utils/exportZip.js'

export default function ExportPage() {
  const navigate = useNavigate()
  const leads = useAllLeads()
  const quota = useQuota([leads.length])

  const [busy, setBusy] = useState(null) // 'csv' | 'zip' | 'md'
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearText, setClearText] = useState('')

  async function runExport(kind) {
    if (busy || leads.length === 0) return
    setBusy(kind)
    try {
      if (kind === 'csv') exportCsv(leads)
      else if (kind === 'zip') await exportZip(leads)
      else if (kind === 'md') await exportMarkdownBundle(leads)
      // 記錄上次匯出時間
      try {
        localStorage.setItem('last_export_at', String(Date.now()))
      } catch { /* noop */ }
    } catch (err) {
      console.error('[export] 匯出失敗', err)
      alert('匯出失敗：' + (err?.message ?? err))
    } finally {
      setBusy(null)
    }
  }

  async function clearAll() {
    if (clearText !== 'DELETE') return
    await db.leads.clear()
    setConfirmClear(false)
    setClearText('')
  }

  // 統計（answers 制，規格 §4.1）
  const stats = leads.reduce(
    (acc, l) => {
      const g = l.answers?.grade?.[0]
      if (g) acc.byGrade[g] = (acc.byGrade[g] ?? 0) + 1
      if (l.audioBlob) acc.withAudio += 1
      if (l.transcript) acc.withTranscript += 1
      return acc
    },
    { byGrade: {}, withAudio: 0, withTranscript: 0 }
  )

  return (
    <main className="flex-1 flex flex-col px-4 pt-3 pb-4 overflow-y-auto">
      <header className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/', { replace: true })}
          className="px-3 h-10 rounded-xl bg-surface text-zinc-200 text-sm"
        >
          ← 回首頁
        </button>
        <div className="flex-1 text-zinc-300 font-semibold">匯出</div>
      </header>

      {/* 統計卡 */}
      <section className="bg-surface rounded-2xl p-4 mb-4">
        <div className="text-zinc-400 text-xs mb-2">總覽</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="總筆數" value={leads.length} />
          <Stat label="有語音" value={stats.withAudio} />
          <Stat label="有轉寫" value={stats.withTranscript} />
          <Stat
            label="A / B / C"
            value={`${stats.byGrade.A ?? 0} / ${stats.byGrade.B ?? 0} / ${stats.byGrade.C ?? 0}`}
          />
        </div>
        {quota?.supported && (
          <div className={`mt-3 text-xs ${quota.warn ? 'text-red-300' : 'text-zinc-500'}`}>
            儲存空間：{quota.usageMB.toFixed(1)} MB / {quota.quotaMB.toFixed(0)} MB
            {quota.warn && '（剩餘不足 50MB，建議匯出後清空）'}
          </div>
        )}
      </section>

      {/* 三個匯出按鈕 */}
      <section className="space-y-2 mb-6">
        <ExportRow
          label="CSV"
          desc="單一 .csv，Excel / Google Sheets 可直接開"
          disabled={!leads.length}
          busy={busy === 'csv'}
          onClick={() => runExport('csv')}
        />
        <ExportRow
          label="ZIP 完整包"
          desc="photos + audio + data.csv + data.json"
          disabled={!leads.length}
          busy={busy === 'zip'}
          onClick={() => runExport('zip')}
        />
        <ExportRow
          label="Markdown 包"
          desc="每筆一個 .md（含 frontmatter），方便丟給 LLM 處理"
          disabled={!leads.length}
          busy={busy === 'md'}
          onClick={() => runExport('md')}
        />
      </section>

      {/* 清空全部（兩步確認） */}
      <section className="mt-auto bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
        <div className="text-red-300 text-sm font-semibold mb-2">⚠️ 清空全部</div>
        {!confirmClear ? (
          <button
            disabled={!leads.length}
            onClick={() => setConfirmClear(true)}
            className="w-full h-12 rounded-xl bg-red-500/15 text-red-300 border border-red-500/30 disabled:opacity-40 font-medium"
          >
            清空所有紀錄
          </button>
        ) : (
          <div className="space-y-2">
            <div className="text-zinc-300 text-xs">
              不可復原。輸入 <span className="font-mono text-red-300">DELETE</span> 後按確認：
            </div>
            <input
              autoFocus
              value={clearText}
              onChange={(e) => setClearText(e.target.value)}
              placeholder="DELETE"
              className="w-full h-12 rounded-xl bg-zinc-900 text-zinc-100 px-3 outline-none border border-red-500/30"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmClear(false); setClearText('') }}
                className="flex-1 h-12 rounded-xl bg-surface text-zinc-200 font-medium"
              >
                取消
              </button>
              <button
                disabled={clearText !== 'DELETE'}
                onClick={clearAll}
                className="flex-1 h-12 rounded-xl bg-red-500 text-zinc-50 font-bold disabled:opacity-40"
              >
                確認清空
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-zinc-500 text-xs">{label}</div>
      <div className="text-zinc-100 text-xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

function ExportRow({ label, desc, disabled, busy, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="
        w-full bg-surface rounded-2xl p-4 flex items-center gap-3 text-left
        disabled:opacity-40 active:scale-[0.99] transition-all
      "
    >
      <div className="flex-1">
        <div className="text-zinc-100 font-semibold">{label}</div>
        <div className="text-zinc-500 text-xs mt-0.5">{desc}</div>
      </div>
      <div className="text-2xl text-emerald-400">{busy ? '⏳' : '⬇'}</div>
    </button>
  )
}
