import { getProducts } from '../store/products.js'
import { fmtIso, fmtTimestampFilename } from './download.js'

function productLabelMap() {
  return Object.fromEntries(getProducts().map((p) => [p.key, p.label]))
}

// 單筆 lead 轉一份 Markdown 字串
// 圖片/音檔走相對路徑（zip 內可解析）
export function buildMarkdown(lead, opts = {}) {
  const { photoPath, audioPath } = opts
  const PRODUCT_LABEL = productLabelMap()
  const products = (lead.tags?.products ?? []).map((k) => PRODUCT_LABEL[k] ?? k)
  const grade = lead.tags?.grade ?? ''

  const front = [
    '---',
    `id: ${lead.id}`,
    `captured_at: ${fmtIso(lead.createdAt)}`,
    `grade: ${grade}`,
    `products: [${products.join(', ')}]`,
    audioPath ? `audio: ${audioPath}` : 'audio:',
    photoPath ? `photo: ${photoPath}` : 'photo:',
    `audio_duration: ${lead.audioDuration ?? ''}`,
    `transcript_edited: ${lead.transcriptEdited ? 'true' : 'false'}`,
    '---',
    ''
  ].join('\n')

  const body = [
    '## 語音轉寫',
    lead.transcript?.trim() ? lead.transcript.trim() : '_（無）_',
    '',
    '## 文字補充',
    lead.textNote?.trim() ? lead.textNote.trim() : '_（無）_',
    ''
  ].join('\n')

  return front + body
}

// 單筆 lead 對應的 md 檔名
// 格式：{YYYYMMDD-HHMMSS}_{grade}_{id8}.md
export function mdFilenameFor(lead) {
  const grade = lead.tags?.grade ?? 'X'
  const id8 = lead.id.slice(0, 8)
  return `${fmtTimestampFilename(lead.createdAt)}_${grade}_${id8}.md`
}
