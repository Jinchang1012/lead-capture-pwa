import { useVosk } from '../context/VoskContext.jsx'

// 對外簡化的 API：UI 元件直接拿 status / download
export function useVoskModel() {
  const { status, error, download, reset } = useVosk()
  return { status, error, download, reset }
}
