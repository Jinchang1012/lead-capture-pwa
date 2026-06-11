import { getQuestions } from '../store/questions.js'
import { downloadBlob, fmtIso, fmtTimestampFilename } from './download.js'

// CSV 規格見 專案.md §9.1
// 欄位：id, createdAt, <每個問題組一欄>, textNote, transcript, transcriptEdited, audioDuration
// 問題組欄位用「匯出當下」的定義轉 label；複選用 ; 分隔；對不到的 key 保留原 key

function escapeCsv(value) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function buildCsv(leads) {
  const questions = getQuestions()
  const headers = [
    'id',
    'createdAt',
    'followUp',
    ...questions.map((q) => q.title),
    'textNote',
    'transcript',
    'transcriptEdited',
    'audioDuration'
  ]

  // 排序：待跟進在前，再按 createdAt 倒序（規格 §9.1）
  const sorted = [...leads].sort((a, b) => {
    if (!!a.followUp !== !!b.followUp) return a.followUp ? -1 : 1
    return b.createdAt - a.createdAt
  })

  const lines = [headers.join(',')]
  for (const lead of sorted) {
    const answerCols = questions.map((q) => {
      const keys = lead.answers?.[q.id] ?? []
      return keys.map((k) => q.options.find((o) => o.key === k)?.label ?? k).join(';')
    })
    const row = [
      lead.id,
      fmtIso(lead.createdAt),
      lead.followUp ? '1' : '0',
      ...answerCols,
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
