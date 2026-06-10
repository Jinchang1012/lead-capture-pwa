import { PRODUCTS } from '../db/db.js'
import { downloadBlob, fmtIso, fmtTimestampFilename } from './download.js'

const PRODUCT_LABEL = Object.fromEntries(PRODUCTS.map((p) => [p.key, p.label]))

// CSV 欄位：id, createdAt, grade, products, textNote, transcript, transcriptEdited, audioDuration
const HEADERS = [
  'id',
  'createdAt',
  'grade',
  'products',
  'textNote',
  'transcript',
  'transcriptEdited',
  'audioDuration'
]

function escapeCsv(value) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function buildCsv(leads) {
  const lines = [HEADERS.join(',')]
  for (const lead of leads) {
    const products = (lead.tags?.products ?? [])
      .map((k) => PRODUCT_LABEL[k] ?? k)
      .join(';')
    const row = [
      lead.id,
      fmtIso(lead.createdAt),
      lead.tags?.grade ?? '',
      products,
      lead.textNote ?? '',
      lead.transcript ?? '',
      lead.transcriptEdited ? '1' : '0',
      lead.audioDuration ?? ''
    ].map(escapeCsv)
    lines.push(row.join(','))
  }
  // 加 BOM 讓 Excel 直接認 UTF-8
  return '﻿' + lines.join('\r\n')
}

export function exportCsv(leads) {
  const csv = buildCsv(leads)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `leads-${fmtTimestampFilename(Date.now())}.csv`)
}
