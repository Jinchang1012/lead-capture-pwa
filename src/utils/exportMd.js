import { getQuestions } from '../store/questions.js'
import { fmtIso, fmtTimestampFilename } from './download.js'

// Markdown 規格見 專案.md §9.3
// frontmatter：每個問題組一行（title: [labels]），自訂問題同樣處理

export function buildMarkdown(lead, opts = {}) {
  const { photoPath, audioPath } = opts
  const questions = getQuestions()

  const answerLines = questions.map((q) => {
    const keys = lead.answers?.[q.id] ?? []
    const labels = keys.map((k) => q.options.find((o) => o.key === k)?.label ?? k)
    return `${q.title}: [${labels.join(', ')}]`
  })

  const front = [
    '---',
    `id: ${lead.id}`,
    `captured_at: ${fmtIso(lead.createdAt)}`,
    ...answerLines,
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

// 檔名：{YYYYMMDD-HHMMSS}_{gradeKey}_{id8}.md（無分級用 X）
export function mdFilenameFor(lead) {
  const grade = lead.answers?.grade?.[0] ?? 'X'
  const id8 = lead.id.slice(0, 8)
  return `${fmtTimestampFilename(lead.createdAt)}_${grade}_${id8}.md`
}
