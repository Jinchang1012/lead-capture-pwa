import { useEffect, useState } from 'react'
import { getQuotaEstimate } from '../utils/quota.js'

export function useQuota(deps = []) {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    let alive = true
    getQuotaEstimate().then((r) => {
      if (alive) setInfo(r)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return info
}
