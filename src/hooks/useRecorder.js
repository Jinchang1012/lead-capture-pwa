import { useCallback, useEffect, useRef, useState } from 'react'
import { useVosk } from '../context/VoskContext.jsx'
import { RECORD_MAX_SECONDS, VOSK_SAMPLE_RATE } from '../config.js'

// 雙軌錄音 hook：
//   A 軌：MediaRecorder 存原始 audio/webm;codecs=opus（無損保留）
//   B 軌：Vosk Recognizer 即時識別 → partial / final
// 若 Vosk 模型未就緒，仍可純錄音（B 軌停用）

export function useRecorder({ onFinal, onPartial } = {}) {
  const { getModel, status: voskStatus, download } = useVosk()
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0) // 秒
  const [partial, setPartial] = useState('')

  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const audioCtxRef = useRef(null)
  const sourceRef = useRef(null)
  const processorRef = useRef(null)
  const recognizerRef = useRef(null)
  const tickRef = useRef(null)
  const maxTimeoutRef = useRef(null)
  const startTsRef = useRef(0)
  const finalTextRef = useRef('') // 累積 final 段落

  // 對外 callback 用 ref 包裝，避免每次重新綁
  const onFinalRef = useRef(onFinal)
  const onPartialRef = useRef(onPartial)
  useEffect(() => { onFinalRef.current = onFinal }, [onFinal])
  useEffect(() => { onPartialRef.current = onPartial }, [onPartial])

  const cleanup = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    if (maxTimeoutRef.current) { clearTimeout(maxTimeoutRef.current); maxTimeoutRef.current = null }
    try { processorRef.current?.disconnect() } catch { /* noop */ }
    try { sourceRef.current?.disconnect() } catch { /* noop */ }
    try { recognizerRef.current?.remove?.() } catch { /* noop */ }
    try { audioCtxRef.current?.close() } catch { /* noop */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()) } catch { /* noop */ }
    processorRef.current = null
    sourceRef.current = null
    recognizerRef.current = null
    audioCtxRef.current = null
    streamRef.current = null
    recorderRef.current = null
    chunksRef.current = []
  }, [])

  const start = useCallback(async () => {
    if (isRecording) return
    setPartial('')
    finalTextRef.current = ''
    chunksRef.current = []
    setElapsed(0)

    // 拿麥克風
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: VOSK_SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      }
    })
    streamRef.current = stream

    // A 軌：MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.start()

    // B 軌：Vosk（模型若未載入則跳過識別，只錄音）
    let model = getModel?.()
    if (!model && voskStatus !== 'error') {
      // 樂觀嘗試載入；若 download 失敗就跳過識別
      try {
        model = await download()
      } catch {
        model = null
      }
    }
    if (model) {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: VOSK_SAMPLE_RATE
      })
      audioCtxRef.current = audioCtx
      const recognizer = new model.KaldiRecognizer(VOSK_SAMPLE_RATE)
      recognizerRef.current = recognizer
      recognizer.on('result', (msg) => {
        const text = msg?.result?.text ?? ''
        if (text) {
          finalTextRef.current = (finalTextRef.current + ' ' + text).trim()
          setPartial('')
          onPartialRef.current?.(finalTextRef.current)
        }
      })
      recognizer.on('partialresult', (msg) => {
        const p = msg?.result?.partial ?? ''
        setPartial(p)
        onPartialRef.current?.((finalTextRef.current + ' ' + p).trim())
      })

      const source = audioCtx.createMediaStreamSource(stream)
      sourceRef.current = source
      // ScriptProcessorNode 已 deprecated 但 vosk-browser 官方範例仍用此模式，最穩
      const processor = audioCtx.createScriptProcessor(4096, 1, 1)
      processor.onaudioprocess = (event) => {
        try {
          recognizer.acceptWaveform(event.inputBuffer)
        } catch (err) {
          console.warn('[recorder] acceptWaveform 失敗', err)
        }
      }
      processorRef.current = processor
      source.connect(processor)
      processor.connect(audioCtx.destination)
    }

    setIsRecording(true)
    startTsRef.current = Date.now()
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000))
    }, 200)

    // 30 秒硬停
    maxTimeoutRef.current = setTimeout(() => {
      stop()
    }, RECORD_MAX_SECONDS * 1000)
  }, [isRecording, getModel, voskStatus, download])

  // stop 用 ref 自閉包以便 setTimeout 內呼叫
  const stopRef = useRef(null)
  const stop = useCallback(async () => {
    if (!isRecording && !recorderRef.current) return
    const recorder = recorderRef.current

    // 等 MediaRecorder 收尾把 chunks 收齊
    const blobPromise = new Promise((resolve) => {
      if (!recorder || recorder.state === 'inactive') { resolve(null); return }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        resolve(blob)
      }
      try { recorder.stop() } catch { resolve(null) }
    })

    const duration = Math.floor((Date.now() - startTsRef.current) / 1000)
    const audioBlob = await blobPromise
    const finalText = (finalTextRef.current + (partial ? ' ' + partial : '')).trim()

    cleanup()
    setIsRecording(false)
    setPartial('')

    onFinalRef.current?.({
      transcript: finalText,
      audioBlob,
      audioMime: audioBlob?.type ?? null,
      audioDuration: duration
    })
  }, [isRecording, partial, cleanup])

  stopRef.current = stop

  // 卸載時務必釋放麥克風
  useEffect(() => () => cleanup(), [cleanup])

  return {
    isRecording,
    elapsed,
    partial,
    finalSoFar: finalTextRef.current,
    start,
    stop
  }
}
