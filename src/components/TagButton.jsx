// 通用標籤按鈕（分級用 variant=grade，產品用 variant=product）
// tagClass/subClass 從 useFontSize() 傳入，控制主標籤與副字大小
export default function TagButton({
  active,
  onClick,
  children,
  variant = 'grade',
  sub,
  tagClass = 'text-xl',
  subClass = 'text-xs'
}) {
  const baseColor = active
    ? variant === 'grade'
      ? 'bg-emerald-500 text-zinc-950'
      : 'bg-sky-500 text-zinc-950'
    : 'bg-surface text-zinc-300'

  return (
    <button
      onClick={onClick}
      className={`
        w-full min-h-[80px] rounded-2xl font-bold ${tagClass}
        flex flex-col items-center justify-center gap-1 px-2
        transition-all active:scale-95
        ${baseColor}
      `}
    >
      <span className="text-center break-words leading-tight">{children}</span>
      {sub && <span className={`font-medium opacity-70 ${subClass}`}>{sub}</span>}
    </button>
  )
}
