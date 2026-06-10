import { useEffect, useRef, useState } from 'react'

// 長按 1.5 秒觸發刪除
// props: onConfirm()
const HOLD_MS = 1500

export default function LongPressDelete({ onConfirm, label = '長按刪除' }) {
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const startRef = useRef(0)
  const rafRef = useRef(null)
  const timeoutRef = useRef(null)

  const tick = () => {
    const p = Math.min((Date.now() - startRef.current) / HOLD_MS, 1)
    setProgress(p)
    if (p < 1) rafRef.current = requestAnimationFrame(tick)
  }

  const start = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    startRef.current = Date.now()
    setHolding(true)
    setProgress(0)
    rafRef.current = requestAnimationFrame(tick)
    timeoutRef.current = setTimeout(() => {
      // 1.5 秒後觸發
      onConfirm?.()
      cancel()
    }, HOLD_MS)
  }
  const cancel = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    timeoutRef.current = null
    rafRef.current = null
    setHolding(false)
    setProgress(0)
  }
  const end = (e) => {
    try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch { /* noop */ }
    cancel()
  }

  useEffect(() => () => cancel(), [])

  return (
    <button
      onPointerDown={start}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      className={`
        relative overflow-hidden px-4 h-12 rounded-xl font-medium text-sm
        ${holding ? 'bg-red-500 text-zinc-50' : 'bg-red-500/15 text-red-300 border border-red-500/30'}
        transition-colors
      `}
      style={{ touchAction: 'none' }}
    >
      {holding && (
        <span
          className="absolute inset-0 bg-red-600/60"
          style={{ width: `${progress * 100}%`, transition: 'width 0.05s linear' }}
        />
      )}
      <span className="relative z-10">{holding ? '繼續按住…' : label}</span>
    </button>
  )
}
