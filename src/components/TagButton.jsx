// 通用標籤按鈕（分級用 variant=grade，產品用 variant=product）
export default function TagButton({
  active,
  onClick,
  children,
  variant = 'grade',
  sub
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
        w-full min-h-[80px] rounded-2xl font-bold text-xl
        flex flex-col items-center justify-center gap-1
        transition-all active:scale-95
        ${baseColor}
      `}
    >
      <span>{children}</span>
      {sub && <span className="text-xs font-medium opacity-70">{sub}</span>}
    </button>
  )
}
