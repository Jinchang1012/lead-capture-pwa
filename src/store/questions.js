import { useEffect, useState } from 'react'

// 問題組 store — 規格見 專案.md §6
// 「客戶分級」「產品關注」與所有自訂資格問題統一為問題組，嚴禁特例
const STORAGE_QUESTIONS = 'questions_v1'
const STORAGE_FONTSIZE = 'tag_font_size_v1'
const LEGACY_PRODUCTS = 'custom_products_v1' // v0.0.1 舊制，讀到就遷移

export const DEFAULT_QUESTIONS = [
  {
    id: 'grade',
    title: '客戶分級',
    type: 'single',
    builtin: true,
    options: [
      { key: 'A', label: 'A 級', desc: '高意願' },
      { key: 'B', label: 'B 級', desc: '潛在需求' },
      { key: 'C', label: 'C 級', desc: '無效/同業' }
    ]
  },
  {
    id: 'products',
    title: '產品關注',
    type: 'multi',
    builtin: true,
    options: [
      { key: 'liquid_cooling', label: '廠務液冷' },
      { key: 'advanced_packaging', label: '先進封裝' },
      { key: 'automation', label: '自動化整合' },
      { key: 'other', label: '其他' }
    ]
  }
]

function isValidQuestion(q) {
  return (
    q && typeof q.id === 'string' && typeof q.title === 'string' &&
    (q.type === 'single' || q.type === 'multi') &&
    Array.isArray(q.options) &&
    q.options.every((o) => o && typeof o.key === 'string' && typeof o.label === 'string')
  )
}

function cloneDefaults() {
  return DEFAULT_QUESTIONS.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o })) }))
}

function loadQuestions() {
  try {
    const raw = localStorage.getItem(STORAGE_QUESTIONS)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list) && list.length > 0 && list.every(isValidQuestion)) return list
    }
  } catch { /* noop */ }

  // 遷移 v0.0.1 舊制：custom_products_v1 只存產品標籤列表
  try {
    const rawLegacy = localStorage.getItem(LEGACY_PRODUCTS)
    if (rawLegacy) {
      const products = JSON.parse(rawLegacy)
      if (Array.isArray(products) && products.every((p) => p && p.key && typeof p.label === 'string')) {
        const migrated = cloneDefaults()
        migrated.find((q) => q.id === 'products').options = products.map((p) => ({ ...p }))
        saveQuestions(migrated)
        localStorage.removeItem(LEGACY_PRODUCTS)
        return migrated
      }
    }
  } catch { /* noop */ }

  return cloneDefaults()
}

function saveQuestions(list) {
  try { localStorage.setItem(STORAGE_QUESTIONS, JSON.stringify(list)) } catch { /* noop */ }
}

let cachedQuestions = loadQuestions()
const questionSubs = new Set()

export function getQuestions() { return cachedQuestions }
export function setQuestions(list) {
  cachedQuestions = list
  saveQuestions(list)
  questionSubs.forEach((fn) => fn(list))
}
export function resetQuestionsToDefaults() {
  setQuestions(cloneDefaults())
}
export function useQuestions() {
  const [list, setList] = useState(cachedQuestions)
  useEffect(() => {
    const fn = (l) => setList(l)
    questionSubs.add(fn)
    return () => questionSubs.delete(fn)
  }, [])
  return list
}

// 匯出 / 清單顯示用：{ [questionId]: { title, type, labelOf: {key: label} } }
export function questionLabelMaps() {
  const maps = {}
  for (const q of cachedQuestions) {
    maps[q.id] = {
      title: q.title,
      type: q.type,
      labelOf: Object.fromEntries(q.options.map((o) => [o.key, o.label]))
    }
  }
  return maps
}

// ── 字體大小（沿用 v0.0.1 的 key，格式未變不 bump）──────────
export const FONT_SIZES = [
  { key: 'sm', label: '小', tagClass: 'text-base', subClass: 'text-[10px]' },
  { key: 'md', label: '中', tagClass: 'text-xl', subClass: 'text-xs' },
  { key: 'lg', label: '大', tagClass: 'text-2xl', subClass: 'text-sm' }
]
const FONT_SIZE_MAP = Object.fromEntries(FONT_SIZES.map((f) => [f.key, f]))

function loadFontSize() {
  try {
    const v = localStorage.getItem(STORAGE_FONTSIZE)
    if (v && FONT_SIZE_MAP[v]) return v
  } catch { /* noop */ }
  return 'md'
}

let cachedFontSize = loadFontSize()
const fontSubs = new Set()

export function getFontSize() { return cachedFontSize }
export function setFontSize(key) {
  if (!FONT_SIZE_MAP[key]) return
  cachedFontSize = key
  try { localStorage.setItem(STORAGE_FONTSIZE, key) } catch { /* noop */ }
  fontSubs.forEach((fn) => fn(key))
}
export function useFontSize() {
  const [size, setSize] = useState(cachedFontSize)
  useEffect(() => {
    const fn = (s) => setSize(s)
    fontSubs.add(fn)
    return () => fontSubs.delete(fn)
  }, [])
  return { key: size, ...FONT_SIZE_MAP[size] }
}
