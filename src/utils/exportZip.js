import JSZip from 'jszip'
import { downloadBlob, fmtTimestampFilename, mimeToExt } from './download.js'
import { buildCsv } from './exportCsv.js'
import { buildMarkdown, mdFilenameFor } from './exportMd.js'

// 共用：把 leads 轉成 JSON-safe 物件（去掉 Blob，只留路徑與 metadata）
// data.json 是無損原始格式（answers 用 key 不轉 label），規格 §9.2
function leadToJsonRow(lead, photoPath, audioPath) {
  return {
    id: lead.id,
    createdAt: lead.createdAt,
    answers: lead.answers ?? {},
    textNote: lead.textNote,
    transcript: lead.transcript,
    transcriptEdited: !!lead.transcriptEdited,
    audioDuration: lead.audioDuration,
    photo: photoPath,
    audio: audioPath
  }
}

// 完整 ZIP：photos + audio + data.csv + data.json
export async function exportZip(leads) {
  const zip = new JSZip()
  const photoDir = zip.folder('photos')
  const audioDir = zip.folder('audio')
  const jsonRows = []

  for (const lead of leads) {
    let photoPath = null
    let audioPath = null
    if (lead.photoBlob) {
      const ext = mimeToExt(lead.photoMime || lead.photoBlob.type)
      photoPath = `photos/${lead.id}.${ext}`
      photoDir.file(`${lead.id}.${ext}`, lead.photoBlob)
    }
    if (lead.audioBlob) {
      const ext = mimeToExt(lead.audioMime || lead.audioBlob.type)
      audioPath = `audio/${lead.id}.${ext}`
      audioDir.file(`${lead.id}.${ext}`, lead.audioBlob)
    }
    jsonRows.push(leadToJsonRow(lead, photoPath, audioPath))
  }

  zip.file('data.csv', buildCsv(leads))
  zip.file('data.json', JSON.stringify(jsonRows, null, 2))

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })
  downloadBlob(blob, `leads-bundle-${fmtTimestampFilename(Date.now())}.zip`)
}

// Markdown ZIP：每筆一份 .md + 對應的 photos / audio
export async function exportMarkdownBundle(leads) {
  const zip = new JSZip()
  const mdDir = zip.folder('md')
  const photoDir = zip.folder('photos')
  const audioDir = zip.folder('audio')

  for (const lead of leads) {
    let photoPath = null
    let audioPath = null
    if (lead.photoBlob) {
      const ext = mimeToExt(lead.photoMime || lead.photoBlob.type)
      photoPath = `../photos/${lead.id}.${ext}`
      photoDir.file(`${lead.id}.${ext}`, lead.photoBlob)
    }
    if (lead.audioBlob) {
      const ext = mimeToExt(lead.audioMime || lead.audioBlob.type)
      audioPath = `../audio/${lead.id}.${ext}`
      audioDir.file(`${lead.id}.${ext}`, lead.audioBlob)
    }
    const md = buildMarkdown(lead, { photoPath, audioPath })
    mdDir.file(mdFilenameFor(lead), md)
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })
  downloadBlob(blob, `leads-md-${fmtTimestampFilename(Date.now())}.zip`)
}
