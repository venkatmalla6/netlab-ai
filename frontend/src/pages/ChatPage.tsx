/**
 * ChatPage.tsx – Full ChatGPT-style interface for NETLAB AI.
 *
 * Includes:
 * - Single-page ChatGPT layout with conversation history
 * - Direct image-to-topology upload & EVE-NG auto-deployment
 * - Real-time conversational ChatGPT Voice Mode:
 *   • Iconic fluid animated glowing orb
 *   • Live Web Audio API frequency visualizer
 *   • Hands-free Voice Activity Detection (silence detection)
 *   • Continuous conversational turn-taking
 *   • Tap-to-interrupt & barge-in
 *   • Groq Whisper STT + Natural English TTS
 *   • Live subtitles & bidirectional transcript sync
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/services/api'

/* ────────────────────────── types ────────────────────────── */

interface ChatMsg {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  image?: string
  timestamp: Date
  topology?: any
  deployment?: any
  isVoice?: boolean
}

interface Conversation {
  id: number
  title: string
  updated_at: string
}

type VoiceAgentState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking'

/* ────────────────────── SVG icon helpers ────────────────── */

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const MicIcon = ({ active }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#ef4444' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)
const MicOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)
const HeadphonesIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
)
const ImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
  </svg>
)
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)
const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const SpeakerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
)
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)
const StopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
)

/* ────────────────── WAV encoder for Whisper ──────────────── */

function encodeWav16k(samples: Float32Array, sampleRate: number): Blob {
  const targetRate = 16000
  const ratio = sampleRate / targetRate
  const targetLen = Math.round(samples.length / ratio)
  const resampled = new Int16Array(targetLen)
  for (let i = 0; i < targetLen; i++) {
    const srcIdx = Math.round(i * ratio)
    const s = Math.max(-1, Math.min(1, samples[srcIdx] || 0))
    resampled[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }
  const buffer = new ArrayBuffer(44 + resampled.byteLength)
  const view = new DataView(buffer)
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + resampled.byteLength, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, targetRate, true)
  view.setUint32(28, targetRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, resampled.byteLength, true)
  const output = new Uint8Array(buffer)
  output.set(new Uint8Array(resampled.buffer), 44)
  return new Blob([buffer], { type: 'audio/wav' })
}

/* ────────────────── Audio Chime Helper ────────────────── */

function playChime(frequency: number, duration = 0.12, type: OscillatorType = 'sine') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {}
}

/* ────────────────── Markdown renderer ────────────────── */

function renderMarkdown(text: string): string {
  let html = text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="cb"><code class="lang-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="ic">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 class="mh">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="mh">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="mh">$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n/g, '<br/>')
  return html
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

export const ChatPage: React.FC = () => {
  /* ── standard chat state ── */
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [ttsEnabled, setTtsEnabled] = useState(false)

  /* ── ChatGPT Voice Mode state ── */
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false)
  const [voiceAgentState, setVoiceAgentState] = useState<VoiceAgentState>('idle')
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [lastAgentReply, setLastAgentReply] = useState('')
  const [isMuted, setIsMuted] = useState(false)

  /* ── refs ── */
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Voice Mode Refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Float32Array[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const isRecordingActiveRef = useRef<boolean>(false)
  const recognitionRef = useRef<any>(null)
  const voiceTranscriptRef = useRef<string>('')
  const silenceTimerRef = useRef<any>(null)
  const hasSpokenRef = useRef<boolean>(false)

  /* ── auto-scroll ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── load conversations on mount ── */
  useEffect(() => {
    loadConversations()
  }, [])

  /* ── auto-resize textarea ── */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  /* ── helpers ── */
  const loadConversations = async () => {
    try {
      const res = await apiClient.getConversations()
      setConversations(
        (res.sessions || []).map((s: any) => ({
          id: s.id,
          title: s.title || `Chat ${s.id}`,
          updated_at: s.updated_at,
        }))
      )
    } catch { /* ignore */ }
  }

  const loadConversation = async (id: number) => {
    try {
      const res = await apiClient.getMessages(id)
      const msgs: ChatMsg[] = (res.messages || []).map((m: any) => ({
        id: String(m.id),
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
      }))
      setMessages(msgs)
      setConversationId(id)
    } catch { /* ignore */ }
  }

  const deleteConversation = async (id: number) => {
    try {
      await apiClient.api.delete(`/ai/conversations/${id}`)
      if (conversationId === id) {
        newChat()
      }
      loadConversations()
    } catch { /* ignore */ }
  }

  const newChat = () => {
    setMessages([])
    setConversationId(null)
    setInput('')
    setImagePreview(null)
    setImageFile(null)
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

  /* ── speak text via Web Speech API ── */
  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!('speechSynthesis' in window)) return
    const clean = text
      .replace(/```[\s\S]*?```/g, 'Configuration code provided.')
      .replace(/[*#_`]/g, '')
      .replace(/<[^>]+>/g, '')
      .trim()
    if (!clean) {
      onDone?.()
      return
    }

    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(clean.slice(0, 900))
    utter.lang = 'en-US'
    utter.rate = 1.05

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice =
      voices.find(v => (v.lang === 'en-US' || v.lang === 'en_US') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Jenny'))) ||
      voices.find(v => v.lang.startsWith('en'))
    if (preferredVoice) utter.voice = preferredVoice

    utter.onstart = () => {
      setVoiceAgentState('speaking')
    }
    utter.onend = () => {
      onDone?.()
    }
    utter.onerror = () => {
      onDone?.()
    }

    window.speechSynthesis.speak(utter)
  }, [])

  /* ── copy text ── */
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  /* ═══════════════════════ SEND MESSAGE ═══════════════════════ */

  const sendMessage = async (overrideText?: string, isVoice = false) => {
    const text = (overrideText !== undefined ? overrideText : input).trim()
    if (!text && !imageFile) return
    if (loading) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    const userMsg: ChatMsg = {
      id: uid(),
      role: 'user',
      content: text || '(image uploaded)',
      image: imagePreview || undefined,
      timestamp: new Date(),
      isVoice,
    }
    setMessages(prev => [...prev, userMsg])
    if (overrideText === undefined) setInput('')
    setImagePreview(null)
    setLoading(true)

    const assistantId = uid()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), isVoice }])

    try {
      let result: any

      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        if (text) formData.append('message', text)
        if (conversationId) formData.append('conversation_id', String(conversationId))

        const resp = await apiClient.api.post('/ai/chat-with-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
          signal: abortRef.current.signal,
        })
        result = resp.data
        setImageFile(null)
      } else {
        result = await apiClient.sendChat(text, conversationId ?? undefined)
      }

      const reply = result.message || result.reply || 'No response'
      const newConvId = result.conversation_id || conversationId

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: reply, topology: result.topology, deployment: result.deployment }
            : m
        )
      )
      if (newConvId) setConversationId(newConvId)
      loadConversations()

      if (isVoice) {
        setLastAgentReply(reply)
        setVoiceAgentState('speaking')
        speak(reply, () => {
          // Continuous conversational loop: listen again when AI finishes speaking
          if (isVoiceModeOpen) {
            setVoiceAgentState('idle')
            setTimeout(() => {
              startVoiceRecording()
            }, 400)
          } else {
            setVoiceAgentState('idle')
          }
        })
      } else if (ttsEnabled) {
        speak(reply)
      }
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return
      const errMsg = err?.response?.data?.detail || err?.message || 'Something went wrong'
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `⚠️ Error: ${errMsg}` }
            : m
        )
      )
      if (isVoice) {
        setVoiceAgentState('idle')
      }
    } finally {
      setLoading(false)
    }
  }

  const stopGeneration = () => {
    abortRef.current?.abort()
    setLoading(false)
  }

  /* ═══════════════════════ IMAGE UPLOAD ═══════════════════════ */

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  /* ═══════════════════ CHATGPT VOICE MODE LOGIC ═══════════════════ */

  // Audio setup for live visualizer & PCM capture
  const setupAudioGraph = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioCtx

      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      analyserRef.current = analyser
      source.connect(analyser)

      const processor = audioCtx.createScriptProcessor(4096, 1, 1)
      audioProcessorRef.current = processor
      audioChunksRef.current = []

      processor.onaudioprocess = (e) => {
        if (!isRecordingActiveRef.current) return
        const channelData = e.inputBuffer.getChannelData(0)
        audioChunksRef.current.push(new Float32Array(channelData))
      }

      source.connect(processor)
      processor.connect(audioCtx.destination)

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const updateLevel = () => {
        if (!isRecordingActiveRef.current) return
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i]
        }
        const currentAvg = sum / bufferLength
        setAudioLevel(currentAvg)

        // Hands-Free Silence Detection (VAD)
        if (currentAvg > 16) {
          hasSpokenRef.current = true
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
        } else if (hasSpokenRef.current && currentAvg <= 14) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              if (isRecordingActiveRef.current && hasSpokenRef.current) {
                stopVoiceRecording(true)
              }
            }, 1400) // 1.4s natural conversational pause
          }
        }

        animFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()
    } catch (e) {
      console.warn('Audio graph error:', e)
    }
  }

  const stopAudioGraph = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    hasSpokenRef.current = false
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect()
      audioProcessorRef.current = null
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    setAudioLevel(0)
  }

  const startVoiceRecording = async () => {
    try {
      window.speechSynthesis?.cancel()
      voiceTranscriptRef.current = ''
      setVoiceTranscript('')
      isRecordingActiveRef.current = true
      hasSpokenRef.current = false
      playChime(640, 0.08)

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      audioStreamRef.current = stream
      setupAudioGraph(stream)

      // Optional local Web Speech Recognition for instant captions
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition()
          rec.continuous = true
          rec.interimResults = true
          rec.lang = 'en-US'
          rec.onresult = (event: any) => {
            let tr = ''
            for (let i = 0; i < event.results.length; i++) {
              tr += event.results[i][0].transcript + ' '
            }
            const t = tr.trim()
            if (t) {
              voiceTranscriptRef.current = t
              setVoiceTranscript(t)
            }
          }
          rec.start()
          recognitionRef.current = rec
        } catch {}
      }

      setVoiceAgentState('listening')
    } catch (err: any) {
      console.error('Microphone error:', err)
      alert('Microphone access was denied. Please allow microphone permissions in your browser.')
      isRecordingActiveRef.current = false
      setVoiceAgentState('idle')
    }
  }

  const stopVoiceRecording = async (shouldSubmit = true) => {
    if (!isRecordingActiveRef.current) return
    isRecordingActiveRef.current = false
    playChime(420, 0.08)

    try {
      recognitionRef.current?.stop()
    } catch {}

    const sampleRate = audioContextRef.current?.sampleRate || 44100
    const capturedChunks = [...audioChunksRef.current]
    stopAudioGraph()

    if (!shouldSubmit) {
      setVoiceAgentState('idle')
      return
    }

    setVoiceAgentState('transcribing')

    let recognizedText = ''

    // 1. Groq Whisper 16kHz WAV transcription
    if (capturedChunks.length > 0) {
      try {
        let totalSamples = 0
        capturedChunks.forEach(c => (totalSamples += c.length))
        const merged = new Float32Array(totalSamples)
        let offset = 0
        capturedChunks.forEach(c => {
          merged.set(c, offset)
          offset += c.length
        })

        if (totalSamples / sampleRate > 0.35) {
          const wavBlob = encodeWav16k(merged, sampleRate)
          const res = await apiClient.transcribeAudio(wavBlob, 'voice.wav')
          if (res && res.text) {
            recognizedText = res.text.trim()
          }
        }
      } catch (err) {
        console.warn('Groq Whisper error, fallback to local captions:', err)
      }
    }

    // 2. Fallback to local captions
    if (!recognizedText && voiceTranscriptRef.current.trim()) {
      recognizedText = voiceTranscriptRef.current.trim()
    }

    voiceTranscriptRef.current = ''

    if (recognizedText) {
      setVoiceTranscript(recognizedText)
      setVoiceAgentState('thinking')
      await sendMessage(recognizedText, true)
    } else {
      setVoiceAgentState('idle')
      if (isVoiceModeOpen) {
        setTimeout(() => startVoiceRecording(), 500)
      }
    }
  }

  const openVoiceMode = () => {
    setIsVoiceModeOpen(true)
    setIsMuted(false)
    startVoiceRecording()
  }

  const closeVoiceMode = () => {
    window.speechSynthesis?.cancel()
    stopAudioGraph()
    isRecordingActiveRef.current = false
    setVoiceAgentState('idle')
    setIsVoiceModeOpen(false)
  }

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false)
      startVoiceRecording()
    } else {
      setIsMuted(true)
      stopVoiceRecording(false)
    }
  }

  const interruptSpeech = () => {
    window.speechSynthesis?.cancel()
    setVoiceAgentState('idle')
    setTimeout(() => startVoiceRecording(), 200)
  }

  /* ── keyboard ── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  /* ═══════════════════════ RENDER ═══════════════════════ */

  const quickPrompts = [
    'Configure OSPF Area 0 on R1',
    'How many labs are in my EVE-NG?',
    'Generate BGP config for AS 65001',
    'Explain VLAN trunking',
  ]

  return (
    <div className="dark" style={{ height: '100vh', display: 'flex', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
      {/* ══════ SIDEBAR ══════ */}
      <aside
        style={{
          width: sidebarOpen ? 280 : 0,
          minWidth: sidebarOpen ? 280 : 0,
          background: '#111111',
          borderRight: sidebarOpen ? '1px solid #222' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.25s ease, min-width 0.25s ease',
        }}
      >
        <div style={{ padding: '12px' }}>
          <button
            onClick={newChat}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              color: '#e5e5e5',
              cursor: 'pointer',
              fontSize: 14,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#252525')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}
          >
            <PlusIcon /> New Chat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
          {conversations.map(c => (
            <div
              key={c.id}
              onClick={() => loadConversation(c.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                margin: '2px 0',
                borderRadius: 8,
                cursor: 'pointer',
                background: conversationId === c.id ? '#1e1e1e' : 'transparent',
                color: '#ccc',
                fontSize: 13,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (conversationId !== c.id) e.currentTarget.style.background = '#1a1a1a' }}
              onMouseLeave={e => { if (conversationId !== c.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.title}
              </span>
              <button
                onClick={e => { e.stopPropagation(); deleteConversation(c.id) }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 4,
                  display: 'flex',
                  opacity: 0.6,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = '#666' }}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #222', fontSize: 11, color: '#555' }}>
          NETLAB AI • EVE-NG Copilot
        </div>
      </aside>

      {/* ══════ MAIN AREA ══════ */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          position: 'relative',
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Top bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 16px',
            borderBottom: '1px solid #1a1a1a',
            background: '#0a0a0a',
            gap: 12,
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', padding: 4 }}
          >
            <MenuIcon />
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#e5e5e5' }}>
              NETLAB AI
            </h1>
            <span style={{
              fontSize: 10,
              background: '#065f46',
              color: '#34d399',
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 600,
            }}>
              GPT-120B
            </span>
          </div>

          {/* ChatGPT Voice Mode Launcher Button in Header */}
          <button
            onClick={openVoiceMode}
            title="Launch ChatGPT Voice Mode"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
              border: '1px solid #3b82f6',
              borderRadius: 20,
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <HeadphonesIcon size={16} />
            <span>Voice Mode</span>
          </button>
        </header>

        {/* ══════ MESSAGES ══════ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 24, paddingBottom: 24 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: '15vh' }}>
                <div style={{
                  width: 68, height: 68, borderRadius: 20, background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                  fontSize: 32, boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
                }}>
                  🌐
                </div>
                <h2 style={{ color: '#e5e5e5', fontSize: 24, fontWeight: 600, margin: '0 0 8px' }}>
                  Welcome to NETLAB AI
                </h2>
                <p style={{ color: '#777', fontSize: 14, margin: '0 0 28px' }}>
                  Your AI network engineering copilot. Talk naturally with ChatGPT Voice Mode or type commands below.
                </p>

                {/* Big Voice Call-to-Action Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #111827, #0f172a)',
                  border: '1px solid #1e293b',
                  borderRadius: 16,
                  padding: '18px 24px',
                  maxWidth: 500,
                  margin: '0 auto 32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#38bdf8', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                      🎙️ ChatGPT Voice Experience
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>
                      Hands-free continuous conversation with live speech synthesis.
                    </div>
                  </div>
                  <button
                    onClick={openVoiceMode}
                    style={{
                      background: '#2563eb',
                      border: 'none',
                      borderRadius: 12,
                      color: '#fff',
                      padding: '10px 18px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)',
                    }}
                  >
                    <HeadphonesIcon size={16} /> Start
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 10,
                  maxWidth: 650,
                  margin: '0 auto',
                }}>
                  {quickPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(p)}
                      style={{
                        background: '#141414',
                        border: '1px solid #252525',
                        borderRadius: 10,
                        padding: '14px 16px',
                        color: '#bbb',
                        cursor: 'pointer',
                        fontSize: 13,
                        textAlign: 'left',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.background = '#1a1a1a' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.background = '#141414' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    gap: 14,
                    padding: '20px 0',
                    borderBottom: '1px solid #141414',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                        : 'linear-gradient(135deg, #059669, #10b981)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      flexShrink: 0,
                      color: '#fff',
                    }}
                  >
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, maxWidth: msg.role === 'user' ? '70%' : '100%' }}>
                    {msg.image && (
                      <div style={{ marginBottom: 10 }}>
                        <img
                          src={msg.image}
                          alt="Uploaded"
                          style={{
                            maxWidth: 300,
                            maxHeight: 200,
                            borderRadius: 10,
                            border: '1px solid #333',
                          }}
                        />
                      </div>
                    )}

                    {msg.role === 'user' ? (
                      <div
                        style={{
                          background: '#1d4ed8',
                          color: '#fff',
                          padding: '10px 16px',
                          borderRadius: '18px 18px 4px 18px',
                          fontSize: 14,
                          lineHeight: 1.6,
                          display: 'inline-block',
                          maxWidth: '100%',
                          wordBreak: 'break-word',
                        }}
                      >
                        {msg.isVoice && <span style={{ marginRight: 6, opacity: 0.8 }}>🎙️</span>}
                        {msg.content}
                      </div>
                    ) : (
                      <div>
                        {msg.content ? (
                          <div
                            className="ai-msg"
                            style={{
                              color: '#d4d4d4',
                              fontSize: 14,
                              lineHeight: 1.7,
                              wordBreak: 'break-word',
                            }}
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                          />
                        ) : (
                          <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
                            <span className="dot-bounce" style={{ animationDelay: '0s' }} />
                            <span className="dot-bounce" style={{ animationDelay: '0.15s' }} />
                            <span className="dot-bounce" style={{ animationDelay: '0.3s' }} />
                          </div>
                        )}

                        {msg.content && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button
                              onClick={() => copyText(msg.content)}
                              style={{
                                background: 'none', border: 'none', color: '#555', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 6px',
                                borderRadius: 4,
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                            >
                              <CopyIcon /> Copy
                            </button>
                            <button
                              onClick={() => speak(msg.content)}
                              style={{
                                background: 'none', border: 'none', color: '#555', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 6px',
                                borderRadius: 4,
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                            >
                              <SpeakerIcon /> Listen
                            </button>
                          </div>
                        )}

                        {/* Topology card */}
                        {(msg.topology || msg.deployment) && (
                          <div style={{
                            marginTop: 14,
                            background: '#12161f',
                            border: '1px solid #1e293b',
                            borderRadius: 12,
                            padding: 16,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 18 }}>🗺️</span>
                                <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: 14 }}>
                                  {msg.deployment ? 'EVE-NG Lab Deployed' : 'Topology Extracted'}
                                </span>
                              </div>
                              <span style={{
                                background: msg.deployment?.mode === 'live' ? '#065f46' : '#1e3a8a',
                                color: msg.deployment?.mode === 'live' ? '#34d399' : '#93c5fd',
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: 12,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}>
                                {msg.deployment?.mode === 'live' ? 'Live Hypervisor' : 'Topology Built'}
                              </span>
                            </div>

                            {msg.deployment?.message && (
                              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
                                {msg.deployment.message}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#cbd5e1', marginBottom: 12 }}>
                              <div><strong>Lab:</strong> {msg.deployment?.lab_name || msg.topology?.lab_name || 'Lab Topology'}</div>
                              <div><strong>Devices:</strong> {msg.deployment?.node_count || msg.topology?.nodes?.length || 0}</div>
                              <div><strong>Links:</strong> {msg.deployment?.link_count || msg.topology?.links?.length || 0}</div>
                            </div>

                            {msg.topology?.nodes && msg.topology.nodes.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {msg.topology.nodes.map((n: any, idx: number) => (
                                  <span key={idx} style={{
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    color: '#e2e8f0',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                  }}>
                                    {n.name || n.id} <span style={{ color: '#64748b' }}>({n.type || 'device'})</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ══════ INPUT BAR ══════ */}
        <div style={{
          padding: '12px 16px 20px',
          background: '#0a0a0a',
          borderTop: '1px solid #1a1a1a',
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {imagePreview && (
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: 80,
                      height: 60,
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '1px solid #333',
                    }}
                  />
                  <button
                    onClick={removeImage}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#333', border: 'none', color: '#fff',
                      cursor: 'pointer', fontSize: 12, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                </div>
                <span style={{ color: '#777', fontSize: 12, paddingTop: 4 }}>
                  {imageFile?.name}
                </span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                background: '#141414',
                border: '1px solid #2a2a2a',
                borderRadius: 14,
                padding: '8px 12px',
                transition: 'border-color 0.15s',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload network diagram"
                style={{
                  background: 'none', border: 'none', color: '#666',
                  cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                onMouseLeave={e => (e.currentTarget.style.color = '#666')}
              >
                <ImageIcon />
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message NETLAB AI or tap headphones to talk..."
                rows={1}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#e5e5e5',
                  fontSize: 14,
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                  maxHeight: 200,
                  minHeight: 24,
                }}
              />

              {/* ChatGPT Voice Mode Button */}
              <button
                onClick={openVoiceMode}
                title="Open ChatGPT Voice Mode"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: 4,
                  borderRadius: 6,
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <HeadphonesIcon size={20} />
              </button>

              {loading ? (
                <button
                  onClick={stopGeneration}
                  title="Stop"
                  style={{
                    background: '#333',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    padding: 6,
                    borderRadius: 8,
                  }}
                >
                  <StopIcon />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() && !imageFile}
                  title="Send"
                  style={{
                    background: (input.trim() || imageFile) ? '#2563eb' : '#1a1a1a',
                    border: 'none',
                    color: (input.trim() || imageFile) ? '#fff' : '#555',
                    cursor: (input.trim() || imageFile) ? 'pointer' : 'default',
                    display: 'flex',
                    padding: 6,
                    borderRadius: 8,
                    transition: 'background 0.15s',
                  }}
                >
                  <SendIcon />
                </button>
              )}
            </div>

            <p style={{ textAlign: 'center', color: '#444', fontSize: 11, marginTop: 8 }}>
              NETLAB AI can make mistakes. Verify configurations before applying to production networks.
            </p>
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════
         CHATGPT VOICE MODE OVERLAY (Full Immersive Modal)
         ══════════════════════════════════════════════════════════════ */}
      {isVoiceModeOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'radial-gradient(circle at center, #0f172a 0%, #000000 100%)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 20px',
            color: '#fff',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          {/* Top Voice Header */}
          <div style={{ width: '100%', maxWidth: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: voiceAgentState === 'listening' ? '#10b981' : voiceAgentState === 'speaking' ? '#6366f1' : '#f59e0b',
                boxShadow: voiceAgentState === 'listening' ? '0 0 10px #10b981' : '0 0 10px #6366f1',
                animation: 'pulse 1.5s infinite',
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                NETLAB AI Voice
              </span>
            </div>

            <button
              onClick={closeVoiceMode}
              title="Close Voice Mode"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#cbd5e1' }}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Centerpiece: The Animated ChatGPT Fluid Glowing Orb */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 320,
                height: 320,
              }}
            >
              {/* Outer Glow Ring 1 */}
              <div
                style={{
                  position: 'absolute',
                  width: 290,
                  height: 290,
                  borderRadius: '50%',
                  border: `1px solid ${
                    voiceAgentState === 'listening'
                      ? 'rgba(56, 189, 248, 0.25)'
                      : voiceAgentState === 'speaking'
                      ? 'rgba(129, 140, 248, 0.3)'
                      : 'rgba(148, 163, 184, 0.1)'
                  }`,
                  transform: `scale(${1 + Math.min(0.2, (audioLevel / 100) * 0.4)})`,
                  transition: 'transform 0.1s ease-out, border-color 0.3s',
                  pointerEvents: 'none',
                }}
              />

              {/* Middle Glow Ring 2 */}
              <div
                style={{
                  position: 'absolute',
                  width: 230,
                  height: 230,
                  borderRadius: '50%',
                  border: `2px solid ${
                    voiceAgentState === 'listening'
                      ? 'rgba(56, 189, 248, 0.45)'
                      : voiceAgentState === 'speaking'
                      ? 'rgba(129, 140, 248, 0.5)'
                      : 'rgba(148, 163, 184, 0.2)'
                  }`,
                  transform: `scale(${1 + Math.min(0.15, (audioLevel / 100) * 0.3)})`,
                  transition: 'transform 0.1s ease-out',
                  pointerEvents: 'none',
                }}
              />

              {/* The Central Organic Orb */}
              <div
                onClick={() => {
                  if (voiceAgentState === 'speaking') {
                    interruptSpeech()
                  } else if (voiceAgentState === 'listening') {
                    stopVoiceRecording(true)
                  } else {
                    startVoiceRecording()
                  }
                }}
                style={{
                  width: 170,
                  height: 170,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  transform: `scale(${
                    voiceAgentState === 'listening'
                      ? 1 + Math.min(0.25, (audioLevel / 100) * 0.5)
                      : voiceAgentState === 'speaking'
                      ? 1.06
                      : 1
                  })`,
                  background:
                    voiceAgentState === 'listening'
                      ? 'radial-gradient(circle at 35% 35%, #67e8f9 0%, #06b6d4 50%, #0284c7 100%)'
                      : voiceAgentState === 'speaking'
                      ? 'radial-gradient(circle at 35% 35%, #a5b4fc 0%, #6366f1 50%, #4338ca 100%)'
                      : voiceAgentState === 'thinking' || voiceAgentState === 'transcribing'
                      ? 'radial-gradient(circle at 35% 35%, #fde047 0%, #eab308 50%, #ca8a04 100%)'
                      : 'radial-gradient(circle at 35% 35%, #475569 0%, #334155 50%, #1e293b 100%)',
                  boxShadow:
                    voiceAgentState === 'listening'
                      ? `0 0 ${40 + audioLevel * 0.8}px rgba(6, 182, 212, 0.7), inset 0 0 25px rgba(255, 255, 255, 0.6)`
                      : voiceAgentState === 'speaking'
                      ? '0 0 60px rgba(99, 102, 241, 0.7), inset 0 0 25px rgba(255, 255, 255, 0.5)'
                      : voiceAgentState === 'thinking' || voiceAgentState === 'transcribing'
                      ? '0 0 50px rgba(234, 179, 8, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.4)'
                      : '0 0 20px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.1)',
                  transition: 'transform 0.08s ease-out, box-shadow 0.2s ease, background 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Visualizer bars inside the orb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[12, 24, 38, 26, 14].map((h, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: 4,
                        borderRadius: 2,
                        background: '#ffffff',
                        height:
                          voiceAgentState === 'listening'
                            ? Math.max(6, Math.min(46, (audioLevel / 2) * (h / 18)))
                            : voiceAgentState === 'speaking'
                            ? Math.max(8, (Math.sin(Date.now() / 150 + idx) + 1.2) * 14)
                            : 6,
                        opacity: 0.9,
                        transition: 'height 0.08s ease-out',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Live State Label */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '0.02em', color: '#f8fafc' }}>
                {voiceAgentState === 'listening' && (
                  <span style={{ color: '#38bdf8' }}>Listening... Speak naturally</span>
                )}
                {voiceAgentState === 'transcribing' && (
                  <span style={{ color: '#fbbf24' }}>Transcribing with Whisper...</span>
                )}
                {voiceAgentState === 'thinking' && (
                  <span style={{ color: '#f59e0b' }}>Thinking...</span>
                )}
                {voiceAgentState === 'speaking' && (
                  <span style={{ color: '#a5b4fc' }}>NETLAB AI Speaking (Tap orb to interrupt)</span>
                )}
                {voiceAgentState === 'idle' && (
                  <span style={{ color: '#94a3b8' }}>Tap orb to talk</span>
                )}
              </div>
            </div>

            {/* Live Subtitles Box */}
            <div
              style={{
                width: '100%',
                maxWidth: 520,
                minHeight: 68,
                maxHeight: 110,
                overflowY: 'auto',
                marginTop: 20,
                padding: '12px 18px',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: 13,
                lineHeight: 1.6,
                color: '#cbd5e1',
                textAlign: 'center',
              }}
            >
              {voiceTranscript ? (
                <div>
                  <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, display: 'block', marginBottom: 2 }}>YOU:</span>
                  <span>{voiceTranscript}</span>
                </div>
              ) : lastAgentReply ? (
                <div>
                  <span style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600, display: 'block', marginBottom: 2 }}>NETLAB AI:</span>
                  <span style={{ color: '#e2e8f0' }}>{lastAgentReply.slice(0, 180)}{lastAgentReply.length > 180 ? '…' : ''}</span>
                </div>
              ) : (
                <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                  Ask any question about your EVE-NG labs, routing, or Cisco configs...
                </span>
              )}
            </div>
          </div>

          {/* Bottom Call Controls (Like ChatGPT Voice UI) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              width: '100%',
              maxWidth: 400,
              paddingBottom: 16,
            }}
          >
            {/* Mute button */}
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {isMuted ? <MicOffIcon /> : <MicIcon />}
            </button>

            {/* End Call / Close button */}
            <button
              onClick={closeVoiceMode}
              title="End Voice Conversation"
              style={{
                width: 62,
                height: 62,
                borderRadius: '50%',
                background: '#dc2626',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(220, 38, 38, 0.5)',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <CloseIcon />
            </button>

            {/* Interrupt / Stop Speech button */}
            <button
              onClick={interruptSpeech}
              title="Interrupt / Talk"
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#cbd5e1' }}
            >
              <StopIcon />
            </button>
          </div>
        </div>
      )}

      {/* ── Global styles ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .dot-bounce {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #555;
          display: inline-block;
          animation: bounce-dot 1.2s infinite ease-in-out;
        }
        .ai-msg pre.cb {
          background: #111;
          border: 1px solid #252525;
          border-radius: 8px;
          padding: 14px;
          overflow-x: auto;
          margin: 10px 0;
          font-size: 13px;
          line-height: 1.5;
        }
        .ai-msg pre.cb code {
          font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
          color: #a5f3fc;
        }
        .ai-msg code.ic {
          background: #1e1e1e;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
          color: #f97316;
          font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
        }
        .ai-msg .mh {
          color: #e5e5e5;
          margin: 14px 0 6px;
        }
        .ai-msg li {
          margin-left: 18px;
          list-style: disc;
          color: #bbb;
        }
        .ai-msg strong { color: #e5e5e5; }
        .ai-msg em { color: #94a3b8; }
        textarea::placeholder { color: #555; }

        @media (max-width: 768px) {
          aside { position: fixed !important; z-index: 50; height: 100vh; }
        }
      `}</style>
    </div>
  )
}

export default ChatPage
