import Dexie from 'dexie'

// 單一 table：leads
// 主鍵 id；createdAt / grade 加索引以利排序與篩選
export const db = new Dexie('lead_capture')

db.version(1).stores({
  leads: 'id, createdAt, grade'
})

// 產品分類常數（標籤頁與匯出共用）
export const PRODUCTS = [
  { key: 'liquid_cooling', label: '廠務液冷' },
  { key: 'advanced_packaging', label: '先進封裝' },
  { key: 'automation', label: '自動化整合' },
  { key: 'other', label: '其他' }
]

export const GRADES = [
  { key: 'A', label: 'A 級', desc: '高意願' },
  { key: 'B', label: 'B 級', desc: '潛在需求' },
  { key: 'C', label: 'C 級', desc: '無效/同業' }
]

// 建立一筆 placeholder lead，photoBlob 之後 patch
export async function createLeadPlaceholder() {
  const id = crypto.randomUUID()
  const lead = {
    id,
    createdAt: Date.now(),
    photoBlob: null,
    photoMime: 'image/jpeg',
    tags: { grade: null, products: [] },
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
