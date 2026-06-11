import Dexie from 'dexie'

// 資料模型規格見 專案.md §4
export const db = new Dexie('lead_capture')

// v1：初版（grade 索引指向不存在的頂層欄位，從未生效）
db.version(1).stores({
  leads: 'id, createdAt, grade'
})

// v2：tags → answers 泛化（配合問題組系統，專案.md §6）
//   tags.grade = 'A'          → answers.grade = ['A']
//   tags.products = ['x','y'] → answers.products = ['x','y']
db.version(2).stores({
  leads: 'id, createdAt'
}).upgrade((tx) =>
  tx.table('leads').toCollection().modify((lead) => {
    if (!lead.answers) {
      const answers = {}
      if (lead.tags?.grade) answers.grade = [lead.tags.grade]
      if (lead.tags?.products?.length) answers.products = [...lead.tags.products]
      lead.answers = answers
    }
    delete lead.tags
  })
)

// 建立一筆 placeholder lead，photoBlob 之後 patch
export async function createLeadPlaceholder() {
  const id = crypto.randomUUID()
  const lead = {
    id,
    createdAt: Date.now(),
    photoBlob: null,
    photoMime: 'image/jpeg',
    answers: {},
    textNote: '',
    audioBlob: null,
    audioMime: null,
    audioDuration: null,
    transcript: '',
    transcriptEdited: false
  }
  await db.leads.add(lead)
  return id
}

export function patchLead(id, patch) {
  return db.leads.update(id, patch)
}

export function getLead(id) {
  return db.leads.get(id)
}

export function deleteLead(id) {
  return db.leads.delete(id)
}

// 今日筆數（以本地時間 00:00 為界）
export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
