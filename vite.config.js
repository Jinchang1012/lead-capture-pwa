import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages 子路徑：https://<帳號>.github.io/lead-capture-pwa/
const BASE = '/lead-capture-pwa/'

// 從 package.json 讀 semver — 更新方式：手動改 package.json 的 "version"
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const SEMVER = pkg.version

// git short SHA（部署追蹤用，可選）
let gitSha = 'dev'
try {
  gitSha = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  /* CI 或無 git 環境 */
}
// 「MM-DD HH:mm」格式（build 時間）
const buildTime = new Date().toISOString().slice(5, 16).replace('T', ' ')

export default defineConfig({
  base: BASE,
  define: {
    __APP_SEMVER__: JSON.stringify(SEMVER),
    __APP_BUILD__: JSON.stringify(`${buildTime} · ${gitSha}`)
  },
  plugins: [
    react(),
    VitePWA({
      // prompt 模式：新版下載完畢後不自動套用，跳提示讓 user 點「立即更新」
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '名片捕捉',
        short_name: 'Leads',
        description: '展場名單捕捉 PWA — 離線優先',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // vosk-browser 引擎（WASM 內嵌）約 5.8MB，必須進 precache 才能離線識別
        // 42MB 的中文模型不在此列：走 VoskContext 自管 Cache Storage
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024
      },
      devOptions: {
        // dev 模式也啟用 SW，方便本機測 PWA 行為
        enabled: false
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
})
