import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FONT_SIZES,
  resetProductsToDefaults,
  setFontSize,
  setProducts,
  useFontSize,
  useProducts
} from '../store/products.js'

export default function SettingsPage() {
  const navigate = useNavigate()
  const products = useProducts()
  const fontSize = useFontSize()
  const [newLabel, setNewLabel] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  function rename(idx, label) {
    const next = products.map((p, i) => (i === idx ? { ...p, label } : p))
    setProducts(next)
  }

  function remove(idx) {
    const target = products[idx]
    if (!window.confirm(`刪除標籤「${target.label}」？\n（已標記此標籤的舊名片不受影響）`)) return
    setProducts(products.filter((_, i) => i !== idx))
  }

  function add() {
    const label = newLabel.trim()
    if (!label) return
    if (products.some((p) => p.label === label)) {
      window.alert('已有同名標籤')
      return
    }
    const key = 'custom_' + crypto.randomUUID().slice(0, 8)
    setProducts([...products, { key, label }])
    setNewLabel('')
  }

  function reset() {
    resetProductsToDefaults()
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
                ${fontSize.key === f.key
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'bg-surface text-zinc-300'}
                ${f.tagClass}
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          影響標籤頁上「客戶分級」與「產品關注」按鈕的字體大小
        </div>
      </section>

      {/* 產品標籤管理 */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-zinc-400 text-sm">產品標籤</div>
          <div className="text-zinc-600 text-xs tabular-nums">{products.length} 個</div>
        </div>

        <div className="space-y-2">
          {products.map((p, i) => (
            <div key={p.key} className="flex gap-2 items-center">
              <input
                value={p.label}
                onChange={(e) => rename(i, e.target.value)}
                className="flex-1 h-12 rounded-xl bg-surface text-zinc-100 px-3 outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
              <button
                onClick={() => remove(i)}
                className="w-12 h-12 rounded-xl bg-red-500/15 text-red-300 border border-red-500/30 text-lg"
                aria-label="刪除"
              >
                🗑
              </button>
            </div>
          ))}
        </div>

        {/* 新增 */}
        <div className="flex gap-2 items-center mt-3">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="新增標籤名稱…"
            className="flex-1 h-12 rounded-xl bg-zinc-900 text-zinc-100 px-3 outline-none border border-zinc-700 focus:border-emerald-500/50"
          />
          <button
            onClick={add}
            disabled={!newLabel.trim()}
            className="w-12 h-12 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xl disabled:opacity-40 active:scale-95"
            aria-label="新增"
          >
            ＋
          </button>
        </div>

        {/* 還原預設 */}
        <div className="mt-4">
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full h-10 rounded-xl bg-surface text-zinc-400 text-sm"
            >
              還原預設標籤
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
                確認還原
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
