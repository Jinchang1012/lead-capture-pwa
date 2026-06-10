import { useVosk } from '../context/VoskContext.jsx'

// 對外簡化的 API：UI 元件直接拿 status / progress / download
export function useVoskModel() {
  const { status, progress, error, download, reset } = useVosk()
  return { status, progress, error, download, reset }
}
