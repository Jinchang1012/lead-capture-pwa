import { useLiveQuery } from 'dexie-react-hooks'
import { db, startOfToday } from '../db/db.js'

// 今日所有 leads（依時間倒序）
export function useTodayLeads() {
  return useLiveQuery(
    () => db.leads.where('createdAt').aboveOrEqual(startOfToday()).reverse().sortBy('createdAt'),
    [],
    []
  )
}

// 今日筆數（單獨計，避免拉整批 Blob 進記憶體）
export function useTodayCount() {
  return useLiveQuery(
    () => db.leads.where('createdAt').aboveOrEqual(startOfToday()).count(),
    [],
    0
  )
}

// 單筆 lead 即時訂閱（標籤頁用）
export function useLead(id) {
  return useLiveQuery(() => (id ? db.leads.get(id) : undefined), [id])
}

// 所有 leads（清單/匯出用）
export function useAllLeads() {
  return useLiveQuery(() => db.leads.orderBy('createdAt').reverse().toArray(), [], [])
}
