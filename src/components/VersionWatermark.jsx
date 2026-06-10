// 版本浮水印（半透明、頂部置中）
// __APP_VERSION__ 由 vite define 在 build time 注入
export default function VersionWatermark() {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'
  return (
    <div
      className="
        fixed top-0 left-1/2 -translate-x-1/2
        text-[10px] text-zinc-600 tabular-nums
        pointer-events-none select-none z-10
        px-2 py-0.5 rounded-b-md bg-zinc-950/50 backdrop-blur-sm
      "
      style={{ marginTop: 'env(safe-area-inset-top)' }}
    >
      v {version}
    </div>
  )
}
