# 名片捕捉 PWA — Phase 1 + Phase 2 + Phase 3

展場單人顧展用的離線優先名單捕捉系統。本版本（Phase 1）完成「拍照 → 標籤 → 完成」主流程，語音識別與匯出於 Phase 2 / Phase 3 接續。

## 啟動

```bash
npm install
npm run dev
```

預設 host 為 `0.0.0.0:5173`，可用手機在同網段連 `http://<電腦IP>:5173` 實機測試。

## Phase 1 已實作

- React + Vite + Tailwind + vite-plugin-pwa 鷹架
- Dexie schema（含 transcript 欄位預留）
- 首頁巨大拍照按鈕、今日筆數
- 標籤頁：A/B/C 分級三選一、產品 2×2 toggle、文字補充
- 影像壓縮（1600px / JPEG 85%，Web Worker 內執行）
- 拍照「先建 placeholder → 立刻導向標籤頁 → 背景 patch blob」流程
- Dark mode、單手拇指區佈局

## Phase 2 已實作

- `VoskProvider` + `useVoskModel`：跨頁共用模型實例，狀態 idle / downloading / ready / error
- 首頁狀態列：「📥 下載語音模型」按鈕、「🎤 測試麥克風」按鈕、就緒綠燈
- `useRecorder` 雙軌錄音 hook：
  - A 軌 MediaRecorder 存原始 `audio/webm;codecs=opus`
  - B 軌 Vosk Recognizer 即時 partial / final 識別
  - 模型未就緒時仍可純錄音降級
- 標籤頁右下 RecordButton FAB：按住開始 / 鬆開停止 / 30 秒自動停 / 倒數環
- 錄音時上方縮圖切換為即時轉寫框（灰字 partial、白字 final）
- 錄完寫回 `transcript` + `audioBlob` + `audioDuration`
- 已存 transcript 可在標籤頁手動修正，編輯後標記 `transcriptEdited: true`

### 展前 SOP（重要）

語音模型 ~42MB 走 user 主動下載（不進 PWA precache），務必展前在飯店 WiFi 下完成：

1. Chrome 開 app → 看到首頁狀態列
2. 點「📥 下載語音模型 (42MB)」→ 等顯示「🎙️ 語音識別就緒」綠燈
3. 點「🎤 測試麥克風」→ 授權 → 顯示「🎤 麥克風 OK」
4. 隨機拍一張測試錄音 → 確認標籤頁能即時看到識別文字
5. 完成 → 上飛機 / 進展場

模型快取在 IndexedDB（vosk-browser 自管），瀏覽器資料未被清除前永久有效。

## Phase 3 已實作

- `utils/exportCsv.js`：CSV 含 BOM、Excel 直接認 UTF-8、欄位齊全（id/createdAt/grade/products/textNote/transcript/transcriptEdited/audioDuration）
- `utils/exportZip.js`：
  - **ZIP 完整包**：`/photos/{id}.jpg` + `/audio/{id}.webm` + `data.csv` + `data.json`
  - **Markdown 包**：`/md/{yyyymmdd-hhmmss}_{grade}_{id8}.md` + 同層 photos/audio，相對路徑可直接丟 Obsidian
- `utils/exportMd.js`：frontmatter（id/captured_at/grade/products/audio/photo/transcript_edited）+ 兩區（語音轉寫 / 文字補充）
- `pages/ExportPage.jsx`：
  - 統計卡（總筆數、有語音、有轉寫、A/B/C 分布）
  - 三個匯出按鈕（CSV / ZIP / Markdown）
  - 配額顯示（usage / quota MB，剩餘 < 50MB 警告）
  - 「清空全部」兩步確認（需輸入 `DELETE`）
- `pages/ListPage.jsx`：所有 leads 列表，縮圖 + 分級 + 產品 + 時間，可點擊回到該筆標籤頁
- `components/LongPressDelete.jsx`：長按 1.5 秒紅色填滿後觸發刪除（拇指誤觸防呆）
- 首頁配額警告色帶（剩餘 < 50MB 提示）
- 首頁清單 / 匯出按鈕已啟用

## Phase 4 已實作

- PWA icon：`public/icon-192.png` / `icon-512.png` / `icon-512-maskable.png`
- `npm run build` 驗證通過：Workbox precache 14 entries（~6.1MB，含 vosk 引擎）
- Vosk 模型改走**自管 Cache Storage**（`vosk-model-v1`，cache-first）：下載一次永久離線可用，不依賴函式庫內部快取行為
- Workbox `maximumFileSizeToCacheInBytes` 調至 8MB：vosk-browser 引擎（5.8MB，WASM 內嵌）必須進 precache 才能離線識別

## 部署（免費、不需買 IP / 網域）

PWA 只要求 HTTPS。建議 **Cloudflare Pages**（中國可達性較佳）或 GitHub Pages：

1. `npm run build` 產出 `dist/`
2. Cloudflare Pages：連 GitHub repo，build command `npm run build`、output `dist`，得到 `xxx.pages.dev` 網址
3. **出發前**用手機 Chrome 開網址 → 加到主畫面 → 下載語音模型 → 測麥克風
4. 之後展期完全離線運行，網址連不上也不影響

注意：OneDrive 同步資料夾下偶發 `dist/` 鎖檔導致 build 中斷（exit code 9），刪掉 `dist/` 重跑即可。

## 待辦（實機驗證）

- 實機 Android Chrome：拍照（後鏡直開）、語音識別中文準確度、加到主畫面
- 飛機模式整輪流程：拍照 → 標籤 → 語音 → 匯出 ZIP

## 驗證 Phase 1（DevTools）

1. `npm run dev` → 桌面 Chrome 開啟
2. DevTools → Application → IndexedDB → `lead_capture` → `leads`：拍一張後該 table 應有一筆 row
3. row 內 `photoBlob` 應為 Blob，size 約 300-500KB（壓縮後）
4. DevTools → Network → Offline → 重整：app 應仍可開啟（Workbox precache）
5. 行動裝置實測：`capture="environment"` 應直接喚後置鏡頭

## 已知限制

- 尚未提供 PWA icon（`icon-192.png` / `icon-512.png` 需後續產生）
- 清單頁 / 匯出頁按鈕為 disabled 佔位
- Vosk 模型 URL 預設指向 alphacephei GitHub Pages CDN — 正式部署建議自管 `public/models/` 同源檔案，避免展場 DNS 不穩
- `ScriptProcessorNode` 已 deprecated 但 vosk-browser 官方範例仍用，效能足夠展場使用情境

## 計畫文件

完整架構與決策紀錄：`C:\Users\jin\.claude\plans\role-context-mutable-mountain.md`
