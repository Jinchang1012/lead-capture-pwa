import imageCompression from 'browser-image-compression'

// 壓縮設定：1600px 寬上限 + JPEG 85%，單張約 300-500KB
const OPTIONS = {
  maxWidthOrHeight: 1600,
  initialQuality: 0.85,
  useWebWorker: true,
  fileType: 'image/jpeg'
}

export async function compressImage(file) {
  try {
    return await imageCompression(file, OPTIONS)
  } catch (err) {
    // 壓縮失敗就退回原檔，不阻斷主流程
    console.warn('[compress] 壓縮失敗，存原檔', err)
    return file
  }
}
