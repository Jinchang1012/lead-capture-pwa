import { RECORD_MAX_SECONDS } from '../config.js'

// 圓形 FAB「按住補充」按鈕
// props:
//   isRecording, elapsed (秒)
//   onPressStart, onPressEnd  — pointer 事件
//   disabled — 模型錯誤 / 麥克風不可用
export default function RecordButton({
  isRecording,
  elapsed = 0,
  onPressStart,
  onPressEnd,
  disabled = false
}) {
  const progress = Math.min(elapsed / RECORD_MAX_SECONDS, 1)

  // 防止 pointer leave 時錯過 stop：onPointerLeave 也呼 end
  const handleDown = (e) => {
    if (disabled) return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    onPressStart?.()
  }
  const handleUp = (e) => {
    if (disabled) return
    e.preventDefault()
    try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch { /* noop */ }
    onPressEnd?.()
  }

  return (
    <button
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      disabled={disabled}
      className={`
        relative w-20 h-20 rounded-full
        flex items-center justify-center
        font-bold text-3xl
        transition-all
        ${disabled ? 'bg-zinc-700 text-zinc-500' : ''}
        ${isRecording ? 'bg-red-500 text-zinc-50 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.5)]' : 'bg-sky-500 text-zinc-950 active:scale-95'}
      `}
      style={{
        touchAction: 'none' // 避免長按觸發瀏覽器選單
      }}
    >
      {/* 倒數環 */}
      {isRecording && (
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="46"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="4"
          />
          <circle
            cx="50" cy="50" r="46"
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 46}
            strokeDashoffset={2 * Math.PI * 46 * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.2s linear' }}
          />
        </svg>
      )}
      <span className="relative z-10">🎙️</span>
    </button>
  )
}
