import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FONT_SIZES,
  resetQuestionsToDefaults,
  setFontSize,
  setQuestions,
  useFontSize,
  useQuestions
} from '../store/questions.js'

// 設定頁 — 問題組管理 + 字體大小（規格 專案.md §6）
export default function SettingsPage() {
  const navigate = useNavigate()
  const questions = useQuestions()
  const fontSize = useFontSize()
  const [confirmReset, setConfirmReset] = useState(false)
  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [newGroupType, setNewGroupType] = useState('single')

  // ── 問題組層級操作 ──────────────────────
  function patchQuestion(qid, patch) {
    setQuestions(questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)))
  }
  function removeQuestion(q) {
    if (q.builtin) return
    if (!window.confirm(`刪除問題「${q.title}」？\n（舊名片上已記錄的答案不受影響）`)) return
    setQuestions(questions.filter((x) => x.id !== q.id))
  }
  function addQuestion() {
    const title = newGroupTitle.trim()
    if (!title) return
    if (questions.some((q) => q.title === title)) {
      window.alert('已有同名問題')
      return
    }
    setQuestions([
      ...questions,
      {
        id: 'q_' + crypto.randomUUID().slice(0, 8),
        title,
        type: newGroupType,
        builtin: false,
        options: []
      }
    ])
    setNewGroupTitle('')
  }

  // ── 選項層級操作 ──────────────────────
  function renameOption(q, idx, label) {
    const options = q.options.map((o, i) => (i === idx ? { ...o, label } : o))
    patchQuestion(q.id, { options })
  }
  function removeOption(q, idx) {
    const target = q.options[idx]
    if (!window.confirm(`刪除選項「${target.label}」？\n（舊名片上已記錄的答案不受影響）`)) return
    patchQuestion(q.id, { options: q.options.filter((_, i) => i !== idx) })
  }
  function addOption(q, label) {
    const trimmed = label.trim()
    if (!trimmed) return
    if (q.options.some((o) => o.label === trimmed)) {
      window.alert('此問題已有同名選項')
      return
    }
    patchQuestion(q.id, {
      options: [...q.options, { key: 'o_' + crypto.randomUUID().slice(0, 8), label: trimmed }]
    })
  }

  function reset() {
    resetQuestionsToDefaults()
    setConfirmReset(false)
  }

  return (
    <main className="flex-1 flex flex-col px-4 pt-3 pb-4 overflow-y-auto">
      <header className="flex items-center gap-3 mb-4 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="px-3 h-10 rounded-xl bg-surface text-zinc-200 text-sm"
        >
          ← 返回
        </button>
        <div className="flex-1 text-zinc-300 font-semibold">設定</div>
      </header>

      {/* 字體大小 */}
      <section className="mb-6">
        <div className="text-zinc-400 text-sm mb-2">標籤字體大小</div>
        <div className="grid grid-cols-3 gap-2">
          {FONT_SIZES.map((f) => (
            <button
              key={f.key}
              onClick={() => setFontSize(f.key)}
              className={`
                h-14 rounded-xl font-bold transition-all active:scale-95
                ${fontSize.key === f.key ? 'bg-emerald-500 text-zinc-950' : 'bg-surface text-zinc-300'}
                ${f.tagClass}
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* 問題組管理 */}
      <section className="mb-6 space-y-4">
        <div className="text-zinc-400 text-sm">資格問題（標籤頁上的按鈕組）</div>

        {questions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            onRenameTitle={(title) => patchQuestion(q.id, { title })}
            onRenameOption={(idx, label) => renameOption(q, idx, label)}
            onRemoveOption={(idx) => removeOption(q, idx)}
            onAddOption={(label) => addOption(q, label)}
            onRemove={() => removeQuestion(q)}
          />
        ))}

        {/* 新增問題組 */}
        <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-3 space-y-2">
          <div className="text-zinc-500 text-xs">新增問題</div>
          <input
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
            placeholder="問題名稱（如：採購時程）"
            className="w-full h-12 rounded-xl bg-surface text-zinc-100 px-3 outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
          <div className="flex gap-2">
            <div className="flex-1 grid grid-cols-2 gap-1 bg-surface rounded-xl p-1">
              {[
                { key: 'single', label: '單選' },
                { key: 'multi', label: '複選' }
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setNewGroupType(t.key)}
                  className={`h-10 rounded-lg text-sm font-medium transition-all ${
                    newGroupType === t.key ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={addQuestion}
              disabled={!newGroupTitle.trim()}
              className="w-12 h-12 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xl disabled:opacity-40 active:scale-95"
              aria-label="新增問題"
            >
              ＋
            </button>
          </div>
        </div>

        {/* 還原預設 */}
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full h-10 rounded-xl bg-surface text-zinc-400 text-sm"
          >
            還原預設問題（分級 + 產品關注）
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmReset(false)}
              className="flex-1 h-10 rounded-xl bg-surface text-zinc-200 text-sm"
            >
              取消
            </button>
            <button
              onClick={reset}
              className="flex-1 h-10 rounded-xl bg-red-500/80 text-zinc-50 font-bold text-sm"
            >
              確認還原（自訂問題會消失）
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

function QuestionCard({ question: q, onRenameTitle, onRenameOption, onRemoveOption, onAddOption, onRemove }) {
  const [newOption, setNewOption] = useState('')

  function add() {
    onAddOption(newOption)
    setNewOption('')
  }

  return (
    <div className="bg-surface rounded-2xl p-3 space-y-2">
      {/* 標題列 */}
      <div className="flex items-center gap-2">
        <input
          value={q.title}
          onChange={(e) => onRenameTitle(e.target.value)}
          className="flex-1 h-11 rounded-xl bg-zinc-900 text-zinc-100 px-3 outline-none font-semibold focus:ring-1 focus:ring-emerald-500/50"
        />
        <span className={`px-2 py-1 rounded-full text-[10px] shrink-0 ${
          q.type === 'single'
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
        }`}>
          {q.type === 'single' ? '單選' : '複選'}
        </span>
        {!q.builtin && (
          <button
            onClick={onRemove}
            className="w-9 h-9 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 text-sm shrink-0"
            aria-label="刪除問題"
          >
            🗑
          </button>
        )}
      </div>

      {/* 選項列表 */}
      <div className="space-y-1.5">
        {q.options.map((o, i) => (
          <div key={o.key} className="flex gap-2 items-center">
            <input
              value={o.label}
              onChange={(e) => onRenameOption(i, e.target.value)}
              className="flex-1 h-10 rounded-lg bg-zinc-900 text-zinc-200 px-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            <button
              onClick={() => onRemoveOption(i)}
              className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-500 text-sm shrink-0"
              aria-label="刪除選項"
            >
              ✕
            </button>
          </div>
        ))}
        {q.options.length === 0 && (
          <div className="text-zinc-600 text-xs px-1">尚無選項，請在下方新增</div>
        )}
      </div>

      {/* 新增選項 */}
      <div className="flex gap-2 items-center">
        <input
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="新增選項…"
          className="flex-1 h-10 rounded-lg bg-zinc-900 text-zinc-100 px-3 text-sm outline-none border border-zinc-700 focus:border-emerald-500/50"
        />
        <button
          onClick={add}
          disabled={!newOption.trim()}
          className="w-9 h-9 rounded-lg bg-emerald-500 text-zinc-950 font-bold disabled:opacity-40 shrink-0"
          aria-label="新增選項"
        >
          ＋
        </button>
      </div>
    </div>
  )
}
