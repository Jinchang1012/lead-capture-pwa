// 版本浮水印（頂部置中、半透明）
// 由 vite define 在 build time 注入：
//   __APP_SEMVER__：來自 package.json 的 semver（v0.0.0）— 給人類記憶 / 對版本號
//   __APP_BUILD__：build 時間 + git short SHA — 給開發者精準對到原始碼
export default function VersionWatermark() {
  const semver = typeof __APP_SEMVER__ !== 'undefined' ? __APP_SEMVER__ : 'dev'
  const build = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : ''
  return (
    <div
      className="
        fixed top-0 left-1/2 -translate-x-1/2
        text-[10px] text-zinc-500 tabular-nums
        pointer-events-none select-none z-10
        px-2 py-0.5 rounded-b-md bg-zinc-950/50 backdrop-blur-sm
        flex items-center gap-1.5
      "
      style={{ marginTop: 'env(safe-area-inset-top)' }}
    >
      <span className="text-zinc-200 font-semibold">v{semver}</span>
      {build && <span className="text-zinc-600">· {build}</span>}
    </div>
  )
}
