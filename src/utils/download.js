// 觸發瀏覽器下載一個 Blob
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 延後釋放，避免 Safari 來不及拉檔
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 把 unix ms 轉成檔名安全的時間字串：20260610-142301
export function fmtTimestampFilename(ms) {
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  )
}

// ISO 字串（含時區）方便進匯出資料
export function fmtIso(ms) {
  const d = new Date(ms)
  const tzOffset = -d.getTimezoneOffset()
  const sign = tzOffset >= 0 ? '+' : '-'
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0')
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes()) +
    ':' +
    pad(d.getSeconds()) +
    sign +
    pad(tzOffset / 60) +
    ':' +
    pad(tzOffset % 60)
  )
}

// 副檔名推斷
export function mimeToExt(mime) {
  if (!mime) return 'bin'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mp4')) return 'm4a'
  if (mime.includes('opus')) return 'opus'
  if (mime.includes('ogg')) return 'ogg'
  return 'bin'
}
