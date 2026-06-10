import { useEffect, useState } from 'react'
import { PRODUCTS as DEFAULT_PRODUCTS } from '../db/db.js'

const STORAGE_PRODUCTS = 'custom_products_v1'
const STORAGE_FONTSIZE = 'tag_font_size_v1'

// ── 標籤清單 ─────────────────────────────
function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_PRODUCTS)
    if (!raw) return [...DEFAULT_PRODUCTS]
    const list = JSON.parse(raw)
    if (Array.isArray(list) && list.every((p) => p && p.key && typeof p.label === 'string')) {
      return list
    }
  } catch { /* noop */ }
  return [...DEFAULT_PRODUCTS]
}
function saveProducts(list) {
  try { localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(list)) } catch { /* noop */ }
}

let cachedProducts = loadProducts()
const productSubs = new Set()

export function getProducts() { return cachedProducts }
export function setProducts(list) {
  cachedProducts = list
  saveProducts(list)
  productSubs.forEach((fn) => fn(list))
}
export function resetProductsToDefaults() {
  setProducts([...DEFAULT_PRODUCTS])
}
export function useProducts() {
  const [list, setList] = useState(cachedProducts)
  useEffect(() => {
    const fn = (l) => setList(l)
    productSubs.add(fn)
    return () => productSubs.delete(fn)
  }, [])
  return list
}

// ── 字體大小 ─────────────────────────────
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
function saveFontSize(key) {
  try { localStorage.setItem(STORAGE_FONTSIZE, key) } catch { /* noop */ }
}

let cachedFontSize = loadFontSize()
const fontSubs = new Set()

export function getFontSize() { return cachedFontSize }
export function setFontSize(key) {
  if (!FONT_SIZE_MAP[key]) return
  cachedFontSize = key
  saveFontSize(key)
  fontSubs.forEach((fn) => fn(key))
}
export function useFontSize() {
  const [size, setSize] = useState(cachedFontSize)
  useEffect(() => {
    const fn = (s) => setSize(s)
    fontSubs.add(fn)
    return () => fontSubs.delete(fn)
  }, [])
  // 同時回傳對應 class，讓 UI 直接套
  return { key: size, ...FONT_SIZE_MAP[size] }
}
