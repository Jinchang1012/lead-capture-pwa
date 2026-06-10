import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages 子路徑：https://<帳號>.github.io/lead-capture-pwa/
const BASE = '/lead-capture-pwa/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
